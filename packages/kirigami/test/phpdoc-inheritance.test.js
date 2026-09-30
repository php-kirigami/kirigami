import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
// Imported dynamically, after chdir: @kirigami/php-prepros resolves
// kirigami.yaml from the working directory when it is first imported.

test('@@tags pass down to child pages; @tag overrides locally, @@tag overrides and passes down', { timeout: 300000 }, async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-inherit-'));
	const cwd = process.cwd();
	const write = (file, text) => {
		fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		fs.writeFileSync(path.join(dir, file), text);
	};
	write('kirigami.yaml', 'kirigami:\n  project: Inherit\n  baseurl: https://example.com\n  root: src\nprepros:\n  before: _layouts/head.php\n');
	// Every page prints what it received.
	write('src/_layouts/head.php', '<p class="v"><?php echo "$title|$lang|" . ($kind ?? "-") . "|" . (is_array($menu ?? null) ? count($menu) : "?"); ?></p>');
	write('src/_menu.yaml', '- one\n- two\n');
	write('src/_index.php', '<?php\n/**\n * @title Home\n * @@lang fr\n * @@menu _menu.yaml\n */\n');
	write('src/blog/_index.md', '@title Blog\n@lang en\n@@kind section\n\nBlog body');
	write('src/blog/post/_index.md', '@title Post\n\nPost body');
	write('src/blog/_note.php', '<?php\n/**\n * @title Note\n */\n');
	write('src/blog/other/_index.php', '<?php\n/**\n * @title Other\n * @@lang de\n */\n');
	write('src/blog/other/deep/_index.md', '@title Deep\n\nDeep body');
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
	const built = await project.build();
	assert.equal(built.success, true, JSON.stringify(built));
	const value = (file) => /<p class="v">([^<]*)<\/p>/.exec(fs.readFileSync(path.join(dir, file), 'utf8'))?.[1];

	assert.equal(value('src/index.html'), 'Home|fr|-|2');
	assert.equal(value('src/blog/index.html'), 'Blog|en|section|2');       // @lang: local only
	assert.equal(value('src/blog/post/index.html'), 'Post|fr|section|2');  // still the root's @@lang
	assert.equal(value('src/blog/note.html'), 'Note|fr|section|2');        // non-index page: its folder's _index
	assert.equal(value('src/blog/other/index.html'), 'Other|de|section|2');
	assert.equal(value('src/blog/other/deep/index.html'), 'Deep|de|section|2'); // @@lang de passed down

	// Watch: editing a page that passes values down re-renders the pages below.
	const rule = getWatcher(project.config.root, { name: 'prepros', type: 'prepros', config: {} });
	write('src/blog/_index.md', '@title Blog\n@lang en\n@@kind archive\n\nBlog body');
	const result = await rule.callback([{ type: 'change', file: 'src/blog/_index.md' }]);
	assert.equal(result.success, true, result.error);
	assert.equal(value('src/blog/post/index.html'), 'Post|fr|archive|2');
	assert.equal(value('src/blog/other/deep/index.html'), 'Deep|de|archive|2');
	// …and a data file passed down re-renders every page that inherits it.
	write('src/_menu.yaml', '- one\n- two\n- three\n');
	const menu = await rule.callback([{ type: 'change', file: 'src/_menu.yaml' }]);
	assert.equal(menu.success, true, menu.error);
	assert.equal(value('src/blog/other/deep/index.html'), 'Deep|de|archive|3');
});
