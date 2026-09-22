import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('plugins register kiri commands via the commands:register hook', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-plugin-command-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		const target = path.join(dir, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	};

	write('src/_index.php', '<p>hello</p>');
	write('node_modules/kirigami-plugin-command/package.json', JSON.stringify({
		name: 'kirigami-plugin-command',
		version: '1.0.0',
		type: 'module',
		main: 'index.js',
		kirigami: { type: 'command' },
	}));
	write('node_modules/kirigami-plugin-command/index.js', `
import { on, HOOKS } from ${JSON.stringify(import.meta.resolve('@kirigami/sdk'))};
export default function register() {
  on(HOOKS.COMMANDS_REGISTER, () => ({
    name: 'greet',
    description: 'Say hi',
    run: async (args) => ({ success: true, args }),
  }));
}`);
	write('kirigami.yaml', JSON.stringify({
		kirigami: { project: 'Plugin command', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-command', active: true }],
	}));
	process.chdir(dir);

	const { load } = await import('../index.js');
	const { getCommand, listCommands } = await import('@kirigami/sdk');
	t.after(() => {
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const project = await load();

	const cmd = getCommand('greet');
	assert.equal(cmd.description, 'Say hi');
	assert.deepEqual(listCommands().map((c) => c.name), ['greet']);
	assert.deepEqual(await cmd.run(['world'], project), { success: true, args: ['world'] });

	// Reloading must not duplicate the registration (would otherwise throw
	// "already registered", since resetCommands() only clears at the top of
	// the reload branch, before plugins register again).
	await project.reload();
	assert.deepEqual(listCommands().map((c) => c.name), ['greet']);
});
