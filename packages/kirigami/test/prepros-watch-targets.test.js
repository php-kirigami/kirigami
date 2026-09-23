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
