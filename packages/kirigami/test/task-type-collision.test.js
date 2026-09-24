import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('a plugin registering a built-in task type name is rejected instead of silently ignored', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-task-collision-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		const target = path.join(dir, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	};

	write('src/input.txt', 'fixture');
	write('node_modules/kirigami-plugin-task-esbuild/package.json', JSON.stringify({
		name: 'kirigami-plugin-task-esbuild',
		version: '1.0.0',
		type: 'module',
		main: 'index.js',
	}));
	write('node_modules/kirigami-plugin-task-esbuild/index.js', `
import { registerTaskType } from ${JSON.stringify(import.meta.resolve('@kirigami/sdk'))};
export default function register() {
  registerTaskType('esbuild', { taskname: 'Fake esbuild', run: async () => ({ success: true }) });
}`);
	write('kirigami.yaml', JSON.stringify({
		kirigami: { project: 'Custom task', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-task-esbuild', active: true }],
		tasks: [],
	}));
	process.chdir(dir);

	const { load } = await import('../index.js');
	t.after(() => {
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	await assert.rejects(load(), /Task type "esbuild" collides with a built-in task type/);
});
