import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
// Imported dynamically, after chdir: @kirigami/php-prepros resolves
// kirigami.yaml from the working directory when it is first imported.

test('watch re-renders only the modified page unless prepros.deep is set', { timeout: 300000 }, async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-watch-target-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		fs.writeFileSync(path.join(dir, file), content);
	};
	write('kirigami.yaml', 'kirigami:\n  project: Watch\n  baseurl: https://example.com\n  root: src\nprepros:\n  before: _layouts/header.php\n');
	write('src/_layouts/header.php', '<header>v1</header>');
	write('src/_index.php', '<h1>Home</h1>');
	write('src/about/_index.php', '<h1>About</h1>');
	write('src/about/team/_index.php', '<h1>Team</h1>');
	write('src/blog/_index.md', '@title Blog\n\nBlog v1');
	process.chdir(dir);

	const { load } = await import('../index.js');
	const { getWatcher } = await import('../bin/tasks/prepros.js');
	const { resetRuntime } = await import('@kirigami/php-prepros');
	t.after(async () => {
		await resetRuntime();
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const project = await load();
	assert.equal((await project.build()).success, true);
	const root = project.config.root;
	const change = async (config, file) => {
		const rule = getWatcher(root, { name: 'prepros', type: 'prepros', config });
		const result = await rule.callback([{ type: 'change', file }]);
		assert.equal(result.success, true, result.error);
		return result.files.map(f => f.replace(/\\/g, '/')).sort();
	};

	// A page: that page alone, from its new source (remounted into the VFS).
	write('src/about/_index.php', '<h1>About v2</h1>');
	assert.deepEqual(await change({}, 'src/about/_index.php'), ['src/about/index.html']);
	assert.match(fs.readFileSync(path.join(dir, 'src/about/index.html'), 'utf8'), /About v2/);
	write('src/about/team/_index.php', '<h1>Team v2</h1>');
	assert.deepEqual(await change({}, 'src/about/team/_index.php'), ['src/about/team/index.html']);
	assert.match(fs.readFileSync(path.join(dir, 'src/about/team/index.html'), 'utf8'), /Team v2/);
	// A Markdown page, the same way.
	write('src/blog/_index.md', '@title Blog\n\nBlog v2');
	assert.deepEqual(await change({}, 'src/blog/_index.md'), ['src/blog/index.html']);
	assert.match(fs.readFileSync(path.join(dir, 'src/blog/index.html'), 'utf8'), /Blog v2/);
	// Header removed: no longer a page, its old output goes away. One watcher
	// throughout, as in `kiri watch`: it remembers which files were pages.
	const rule = getWatcher(root, { name: 'prepros', type: 'prepros', config: {} });
	const blogChange = () => rule.callback([{ type: 'change', file: 'src/blog/_index.md' }]);
	write('src/blog/_index.md', 'Blog v3, no header');
	const removed = await blogChange();
	assert.equal(removed.success, true, removed.error);
	assert.ok(removed.files.map(f => f.replace(/\\/g, '/')).includes('src/blog/index.html'));
	assert.equal(fs.existsSync(path.join(dir, 'src/blog/index.html')), false);
	// Header back: a page again.
	write('src/blog/_index.md', '@title Blog\n\nBlog v4');
	assert.equal((await blogChange()).success, true);
	assert.match(fs.readFileSync(path.join(dir, 'src/blog/index.html'), 'utf8'), /Blog v4/);
	// deep: its directory, subpages included.
	assert.deepEqual(await change({ deep: true }, 'src/about/_index.php'),
		['src/about/index.html', 'src/about/team/index.html']);
	// The layout is watched too, and re-renders every page (and the sitemap).
	write('src/_layouts/header.php', '<header>v2</header>');
	const all = await change({}, 'src/_layouts/header.php');
	for (const page of ['src/index.html', 'src/about/index.html', 'src/about/team/index.html']) {
		assert.ok(all.includes(page), `${page} in ${all}`);
		assert.match(fs.readFileSync(path.join(dir, page), 'utf8'), /v2/);
	}
	assert.ok(all.includes('src/sitemap.xml'));
});

test('a modified file maps to the page, its directory (deep), or the whole site', async () => {
	const { changeTarget } = await import('../bin/tasks/prepros.js');
	assert.equal(changeTarget('_index.php'), '_index.php');
	assert.equal(changeTarget('about/_index.php'), 'about/_index.php');
	assert.equal(changeTarget('about/_index.php', { deep: true }), 'about');
	assert.equal(changeTarget('_index.php', { deep: true }), '.');
	// Layouts, includes and partials are used by every page.
	assert.equal(changeTarget('_layouts/header.php'), null);
	assert.equal(changeTarget('_lib/functions.php'), null);
	assert.equal(changeTarget('_partials/_card.php'), null);
	assert.equal(changeTarget('about/sidebar.php'), null);
	// Data files keep rendering their directory.
	assert.equal(changeTarget('about/data.yaml'), 'about');
	assert.equal(changeTarget('_data/site.json'), '_data');
});

test('an _index.md is a page unless its folder has an _index.php', async (t) => {
	const { changeTarget } = await import('../bin/tasks/prepros.js');
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-md-target-'));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	for (const file of ['blog/_index.md', 'about/_index.md', 'about/_index.php', '_data/_index.md', 'notes/_index.md']) {
		fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
		fs.writeFileSync(path.join(root, file), file === 'notes/_index.md' ? 'No header' : '@title T\n');
	}
	assert.equal(changeTarget('blog/_index.md', { root }), 'blog/_index.md');
	assert.equal(changeTarget('blog/_index.md', { root, deep: true }), 'blog');
	// Next to an _index.php, or in a `_` folder, it's data.
	assert.equal(changeTarget('about/_index.md', { root }), 'about');
	assert.equal(changeTarget('_data/_index.md', { root }), '_data');
	assert.equal(changeTarget('blog/_other.md', { root }), 'blog');
	// Without an @tag header it's data too.
	assert.equal(changeTarget('notes/_index.md', { root }), 'notes');
	// A page passing values down (@@) re-renders its directory.
	const passing = new Set(['blog/_index.md', 'about/_index.php']);
	assert.equal(changeTarget('blog/_index.md', { root, passing }), 'blog');
	assert.equal(changeTarget('about/_index.php', { root, passing }), 'about');
	// A data file passed down maps to the declaring directory ("dir/").
	const dependents = new Map([['_menu.yaml', ['./', 'about/_index.php']]]);
	assert.deepEqual(changeTarget('_menu.yaml', { root, dependents }), ['.', 'about/_index.php']);
});

test('targets under a directory target are dropped', async () => {
	const { withoutCovered } = await import('../bin/tasks/prepros.js');
	assert.deepEqual(withoutCovered(['blog', 'blog/a/_index.md', 'about/_index.php', 'blogger/_index.php']),
		['blog', 'about/_index.php', 'blogger/_index.php']);
	assert.deepEqual(withoutCovered(['.', 'about/_index.php', 'x']), ['.']);
});
