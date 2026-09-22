import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('scripts from a linked plugin outside the project run, but only from inside that plugin', async (t) => {
	const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-plugin-linked-'));
	const dir = path.join(base, 'site');
	const pluginDir = path.join(base, 'linked-plugin');
	const cwd = process.cwd();
	const write = (root, file, content) => {
		const target = path.join(root, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	};

	write(dir, 'src/_index.php', '<p>hello</p>');
	write(base, 'stray/evil.php', '<?php echo "outside";');
	write(pluginDir, 'package.json', JSON.stringify({
		name: 'kirigami-plugin-linked',
		version: '1.0.0',
		type: 'module',
		main: 'index.js',
	}));
	write(pluginDir, 'scripts/hello.php', '<?php echo "from linked plugin";');
	write(pluginDir, 'index.js', `
import { on, HOOKS } from ${JSON.stringify(import.meta.resolve('@kirigami/sdk'))};
import { fileURLToPath } from 'node:url';
export default function register() {
  on(HOOKS.SCRIPTS_REGISTER, () => [
    { name: 'linked', file: fileURLToPath(new URL('./scripts/hello.php', import.meta.url)) },
    { name: 'stray', file: fileURLToPath(new URL('../stray/evil.php', import.meta.url)) },
  ]);
}`);
	// Same layout npm link or a workspace produces: node_modules entry -> outside directory.
	fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
	fs.symlinkSync(pluginDir, path.join(dir, 'node_modules', 'kirigami-plugin-linked'), process.platform === 'win32' ? 'junction' : 'dir');
	write(dir, 'kirigami.yaml', JSON.stringify({
		kirigami: { project: 'Linked plugin', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-linked', active: true }],
	}));
	process.chdir(dir);

	const { load } = await import('../index.js');
	t.after(() => {
		process.chdir(cwd);
		fs.rmSync(base, { recursive: true, force: true });
	});

	const project = await load();

	const linked = await project.run('linked');
	assert.equal(linked.success, true, JSON.stringify(linked));
	assert.equal(linked.debug, 'from linked plugin');

	await assert.rejects(project.run('stray'), /outside the project and every active plugin package/);
});
