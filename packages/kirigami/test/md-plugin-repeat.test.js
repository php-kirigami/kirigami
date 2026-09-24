import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

// php-mdhtml 0.1.3 kept Markdown plugins and custom emoji in tables that
// outlived the PHP request while holding request memory (Closures, strings).
// A project registering either from its `includes` file aborted the PHP-WASM
// runtime ("RuntimeError: unreachable", zend_mm_panic) after a few renders in
// one process, as soon as the JS heap was busy between renders (a Sass
// compile, here plain allocation). Fixed by php-mdhtml 0.1.4 in the binary.
test('Markdown plugins and custom emoji survive repeated renders in one process', { timeout: 300000 }, async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-md-plugin-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		fs.writeFileSync(path.join(dir, file), content);
	};
	write('kirigami.yaml', 'kirigami:\n  project: MD\n  baseurl: https://example.com\n  root: src\nprepros:\n  includes: [_lib/functions.php]\n');
	write('src/_lib/functions.php', "<?php\nmd_register_plugin('lead', function (array $args, string $body): string { return '<p class=\"lead\">' . implode(' ', $args) . '</p>'; });\nMD::registerEmoji('kiri', 'KIRI');\n");
	write('src/_index.php', '<markdown>\n{% lead Hello %}\n\nMade with :kiri:\n</markdown>\n');
	process.chdir(dir);

	const { load } = await import('../index.js');
	const { resetRuntime } = await import('@kirigami/php-prepros');
	t.after(async () => {
		await resetRuntime();
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const project = await load();
	for (let i = 1; i <= 6; i++) {
		const result = await project.runTask('render-all');
		assert.equal(result.success, true, `render ${i}: ${result.error}`);
		const html = fs.readFileSync(path.join(dir, 'src/index.html'), 'utf8');
		assert.match(html, /<p class="lead">Hello<\/p>/);
		assert.match(html, /Made with KIRI/);
		let garbage = [];
		for (let j = 0; j < 3e6; j++) garbage.push({ j, s: `x${j}` });
		garbage = null;
	}
});
