import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('reload refreshes PHP data, mounts, roots and plugin includes across repeated builds', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-reload-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		fs.writeFileSync(path.join(dir, file), content);
	};
	const pluginDir = 'node_modules/kirigami-plugin-fixture';
	write(`${pluginDir}/package.json`, JSON.stringify({ name: 'kirigami-plugin-fixture', version: '1.0.0', type: 'module', main: 'index.js' }));
	write(`${pluginDir}/index.js`, `
import { on, HOOKS } from ${JSON.stringify(import.meta.resolve('@kirigami/sdk'))};
import { fileURLToPath } from 'node:url';
export default function(options) {
  on(HOOKS.PREPROS_PHP, () => fileURLToPath(new URL(options.file, import.meta.url)));
}`);
	for (const marker of ['one', 'two']) {
		write(`${pluginDir}/${marker}.php`, `<?php PREPROS::registerTag('probe', fn() => '${marker}');`);
	}
	const page = `<?php echo $project . '|' . $data->value . '|' . (is_file(__DIR__ . '/removed.txt') ? 'present' : 'absent') . '|' . (is_file(__DIR__ . '/extra.fixture') ? 'mounted' : 'unmounted') . '|'; ?><probe></probe>`;
	for (const root of ['src', 'other']) {
		write(`${root}/_index.php`, page);
		write(`${root}/header.php`, '');
		write(`${root}/footer.php`, '');
		write(`${root}/extra.fixture`, 'extra');
	}
	write('src/removed.txt', 'remove me');
	let config = {
		kirigami: { project: 'Before', baseurl: 'https://example.com', root: 'src', data: { value: 'first' } },
		prepros: { before: 'header.php', after: 'footer.php', head: false, mountext: ['.fixture'] },
		plugins: [{ name: 'kirigami-plugin-fixture', active: true, options: { file: 'one.php' } }],
	};
	const save = () => write('kirigami.yaml', JSON.stringify(config));
	save();
	process.chdir(dir);
	const { load } = await import('../index.js');
	const { resetRuntime, render } = await import('@kirigami/php-prepros');
	t.after(async () => {
		await resetRuntime();
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});
	const project = await load();
	const build = async (expected) => {
		const result = await project.build();
		assert.equal(result.success, true, JSON.stringify(result));
		assert.equal(fs.readFileSync(path.join(dir, config.kirigami.root, 'index.html'), 'utf8'), expected);
	};
	await build('Before|first|present|mounted|one');
	await build('Before|first|present|mounted|one');
	config.kirigami.project = 'After';
	config.kirigami.data.value = 'second';
	config.prepros.mountext = [];
	config.plugins[0].active = false;
	fs.unlinkSync(path.join(dir, 'src/removed.txt'));
	save();
	await project.reload();
	await build('After|second|absent|unmounted|<probe></probe>');
	assert.deepEqual(project.plugins, []);
	config.plugins[0].active = true;
	config.plugins[0].options.file = 'two.php';
	config.kirigami.root = 'other';
	save();
	await project.reload();
	await build('After|second|absent|unmounted|two');
	for (const network of [true, false]) {
		config.prepros.network = network;
		save();
		await project.reload();
		await build('After|second|absent|unmounted|two');
	}
	// A reset queued behind rendering must wait for that operation and allow
	// the following render to initialize a fresh runtime successfully.
	const queued = await Promise.all([render('.'), resetRuntime(), render('.')]);
	assert.equal(queued[0].success, true);
	assert.equal(queued[2].success, true);
	await project.reload();
	await build('After|second|absent|unmounted|two');
	// Even without a reload, an empty include list must replace the previous one.
	assert.equal((await render('.')).success, true);
	assert.match(fs.readFileSync(path.join(dir, 'other/index.html'), 'utf8'), /<probe><\/probe>/);
	// A failed operation must not poison the queue or leave a half-loaded project.
	await assert.rejects(render('missing'));
	assert.equal((await render('.')).success, true);
	write('kirigami.yaml', '{}');
	await assert.rejects(project.reload());
	save();
	await build('After|second|absent|unmounted|two');
});
