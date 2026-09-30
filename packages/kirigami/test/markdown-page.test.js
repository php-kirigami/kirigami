import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
// Imported dynamically, after chdir: @kirigami/php-prepros resolves
// kirigami.yaml from the working directory when it is first imported.

test('an _index.md page renders its Markdown body with its @tag header', { timeout: 300000 }, async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-md-page-'));
	const cwd = process.cwd();
	const write = (file, text) => {
		fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		fs.writeFileSync(path.join(dir, file), text);
	};
	write('kirigami.yaml', [
		'kirigami:',
		'  project: Md',
		'  baseurl: https://example.com',
		'  root: src',
		'prepros:',
		'  types:',
		'    post:',
		'      before: _layouts/post.before.php',
		'      after:  _layouts/post.after.php',
		'',
	].join('\n'));
	write('src/_layouts/post.before.php', '<article data-date="<?php echo $date; ?>"><h1><?php echo $title; ?></h1>');
	write('src/_layouts/post.after.php', '</article>');
	// Lists its children, Markdown and PHP pages alike, with a helper that
	// adds a key to each entry (must not leak into the child's own render).
	write('src/_index.php', [
		'<?php /** @title Home */ ?>',
		'<?php foreach (fs_get_children() as $c) { $c->seen = [1]; echo "<li>{$c->title}</li>"; } ?>',
	].join('\n'));
	write('src/hello/_index.md', [
		'@title Hello',
		'@type  post',
		'@date  2026-09-01',
		'@@inherited reserved',
		'',
		'Some **bold** text.',
		'',
		'<?php echo "never executed"; ?>',
	].join('\n'));
	// No @tag header: not a page, left alone.
	write('src/plain/_index.md', 'No header, just *text*.\n@title too late');
	// Next to an _index.php, an _index.md is data, not a page.
	write('src/about/_index.php', '<?php /** @title About @body _index.md */ ?><p>About</p>');
	write('src/about/_index.md', 'About data');
	process.chdir(dir);

	const { load } = await import('../index.js');
	const { resetRuntime } = await import('@kirigami/php-prepros');
	t.after(async () => {
		await resetRuntime();
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const project = await load();
	const built = await project.build();
	assert.equal(built.success, true, JSON.stringify(built));
	const read = (file) => fs.readFileSync(path.join(dir, file), 'utf8');

	const hello = read('src/hello/index.html');
	assert.match(hello, /<article data-date="2026-09-01"><h1>Hello<\/h1>/);
	assert.match(hello, /<strong>bold<\/strong>/);
	assert.doesNotMatch(hello, /@title|@type|@@inherited/);
	// PHP in a Markdown page is text, never run (the source stays around it).
	assert.doesNotMatch(hello, /(^|>)\s*never executed/m);
	assert.equal(fs.existsSync(path.join(dir, 'src/plain/index.html')), false);

	assert.match(read('src/index.html'), /<li>Hello<\/li>/);
	assert.match(read('src/about/index.html'), /<p>About<\/p>/);
	assert.equal(fs.existsSync(path.join(dir, 'src/about/index.md.html')), false);

	const sitemap = read('src/sitemap.xml');
	for (const url of ['https://example.com/hello/', 'https://example.com/about/']) {
		assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${url} in sitemap`);
	}
	assert.equal(sitemap.includes('/plain/'), false);
	assert.equal((sitemap.match(/<loc>https:\/\/example\.com\/about\/<\/loc>/g) || []).length, 1);
});
