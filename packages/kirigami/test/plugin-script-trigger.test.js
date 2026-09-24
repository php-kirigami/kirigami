import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('plugins register PHP scripts, runnable and auto-triggered like a kirigami.yaml scripts: entry', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-plugin-script-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		const target = path.join(dir, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	};

	write('src/_index.php', '<p>hello</p>');
	write('node_modules/kirigami-plugin-script/package.json', JSON.stringify({
		name: 'kirigami-plugin-script',
		version: '1.0.0',
		type: 'module',
		main: 'index.js',
	}));
	write('node_modules/kirigami-plugin-script/scripts/hello.php', '<?php echo "from plugin";');
	write('node_modules/kirigami-plugin-script/index.js', `
import { on, HOOKS } from ${JSON.stringify(import.meta.resolve('@kirigami/sdk'))};
import { fileURLToPath } from 'node:url';
export default function register() {
  on(HOOKS.SCRIPTS_REGISTER, () => ({
    name: 'plugin-script',
    file: fileURLToPath(new URL('./scripts/hello.php', import.meta.url)),
    trigger: 'before-build',
  }));
}`);
	write('kirigami.yaml', JSON.stringify({
		kirigami: { project: 'Plugin script', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-script', active: true }],
	}));
	process.chdir(dir);

	const { load } = await import('../index.js');
	t.after(() => {
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const project = await load();

	assert.deepEqual(project.scripts, [{ name: 'plugin-script', mount: [], trigger: 'before-build' }]);

	const single = await project.run('plugin-script');
	assert.equal(single.success, true, JSON.stringify(single));
	assert.equal(single.debug, 'from plugin');

	const build = await project.build();
	assert.equal(build.success, true, JSON.stringify(build));
	assert.equal(build.trigger.success, true);
	assert.deepEqual(build.trigger.results.map(({ name, debug }) => ({ name, debug })), [
		{ name: 'plugin-script', debug: 'from plugin' },
	]);

	// A project's own scripts/<name>.php shadows a plugin registering the
	// same name — it runs instead, and no longer shows up as a plugin entry.
	write('scripts/plugin-script.php', '<?php echo "from project";');
	await project.reload();
	assert.deepEqual(project.scripts, [{ name: 'plugin-script', mount: [], trigger: null }]);
	const local = await project.run('plugin-script');
	assert.equal(local.debug, 'from project');
});
