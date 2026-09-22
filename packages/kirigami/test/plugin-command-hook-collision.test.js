import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('a duplicate command name from the commands:register hook throws, same as registerCommand() itself', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-plugin-command-dup-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		const target = path.join(dir, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	};

	write('src/_index.php', '<p>hello</p>');
	write('node_modules/kirigami-plugin-command-dup/package.json', JSON.stringify({
		name: 'kirigami-plugin-command-dup',
		version: '1.0.0',
		type: 'module',
		main: 'index.js',
		kirigami: { type: 'command' },
	}));
	write('node_modules/kirigami-plugin-command-dup/index.js', `
import { on, HOOKS } from ${JSON.stringify(import.meta.resolve('@kirigami/sdk'))};
export default function register() {
  on(HOOKS.COMMANDS_REGISTER, () => [
    { name: 'greet', run: async () => ({ success: true }) },
    { name: 'greet', run: async () => ({ success: true }) },
  ]);
}`);
	write('kirigami.yaml', JSON.stringify({
		kirigami: { project: 'Plugin command dup', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-command-dup', active: true }],
	}));
	process.chdir(dir);

	const { load } = await import('../index.js');
	t.after(() => {
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	await assert.rejects(load(), /already registered/);
});
