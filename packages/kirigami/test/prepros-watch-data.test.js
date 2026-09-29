import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
// Imported dynamically, after chdir: @kirigami/php-prepros resolves
// kirigami.yaml from the working directory when it is first imported.

test('a data file re-renders the pages whose header loads it', { timeout: 300000 }, async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-watch-data-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		fs.writeFileSync(path.join(dir, file), content);
	};
	write('kirigami.yaml', 'kirigami:\n  project: Data\n  baseurl: https://example.com\n  root: src\n');
	write('src/_index.php', '<?php\n/**\n * @intro _data/home/intro.md\n */\n?><main><?= $intro ?></main>');
	write('src/publications/_index.php', '<?php\n/**\n * @title Publications\n * @list ../_data/publications/list.yaml\n */\n?><ul><?php foreach ($list as $p) echo "<li>{$p->name}</li>"; ?></ul>');
	write('src/about/_index.php', '<h1>About</h1>');
	write('src/_data/home/intro.md', '# Hello');
	write('src/_data/publications/list.yaml', '- name: First\n');
	write('src/_data/unused.yaml', 'a: 1\n');
	process.chdir(dir);

	const { load } = await import('../index.js');
	const { getWatcher, dataDependents, changeTarget } = await import('../bin/tasks/prepros.js');
	const { resetRuntime } = await import('@kirigami/php-prepros');
	t.after(async () => {
		await resetRuntime();
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const project = await load();
	assert.equal((await project.build()).success, true);
	const root = project.config.root;

	// The map: data file → pages, relative to the root.
	const dependents = dataDependents(root);
	assert.deepEqual(dependents.get('_data/publications/list.yaml'), ['publications/_index.php']);
	assert.deepEqual(dependents.get('_data/home/intro.md'), ['_index.php']);
	assert.deepEqual(changeTarget('_data/unused.yaml', { dependents }), '_data', 'unreferenced: its directory');
	assert.deepEqual(changeTarget('_data/publications/list.yaml', { dependents, deep: true }), ['publications']);

	const rule = getWatcher(root, { name: 'prepros', type: 'prepros', config: {} });
	const change = async (file) => {
		const result = await rule.callback([{ type: 'change', file }]);
		assert.equal(result.success, true, result.error);
		return result.files.map(f => f.replace(/\\/g, '/')).sort();
	};

	// The page that loads it, not the data file's own (page-less) directory.
	write('src/_data/publications/list.yaml', '- name: First\n- name: Second\n');
	assert.deepEqual(await change('src/_data/publications/list.yaml'), ['src/publications/index.html']);
	assert.match(fs.readFileSync(path.join(dir, 'src/publications/index.html'), 'utf8'), /Second/);

	// Markdown loaded by the home page re-renders the home page.
	write('src/_data/home/intro.md', '# Hello again');
	assert.deepEqual(await change('src/_data/home/intro.md'), ['src/index.html']);
	assert.match(fs.readFileSync(path.join(dir, 'src/index.html'), 'utf8'), /Hello again/);
});
