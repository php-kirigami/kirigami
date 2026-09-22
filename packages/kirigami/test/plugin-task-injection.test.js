import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('plugins inject build tasks via the tasks:register hook, without a kirigami.yaml tasks: entry', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-plugin-task-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		const target = path.join(dir, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	};

	write('src/_index.php', '<p>hello</p>');
	write('node_modules/kirigami-plugin-auto-task/package.json', JSON.stringify({
		name: 'kirigami-plugin-auto-task',
		version: '1.0.0',
		type: 'module',
		main: 'index.js',
	}));
	write('node_modules/kirigami-plugin-auto-task/index.js', `
import { on, registerTaskType, HOOKS } from ${JSON.stringify(import.meta.resolve('@kirigami/sdk'))};
export default function register() {
  registerTaskType('fixture', {
    taskname: 'Fixture task',
    canbuild: true,
    async run(_root, task) {
      return { success: true, message: task.message };
    },
  });
  on(HOOKS.TASKS_REGISTER, () => ({ name: 'auto-fixture', type: 'fixture', message: 'injected' }));
}`);
	write('kirigami.yaml', JSON.stringify({
		kirigami: { project: 'Plugin task', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-auto-task', active: true }],
	}));
	process.chdir(dir);

	const { load } = await import('../index.js');
	t.after(() => {
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const project = await load();

	// No `tasks:` entry in kirigami.yaml — the task comes entirely from the plugin.
	assert.deepEqual(project.config.tasks.map(({ name, type }) => ({ name, type })), [
		{ name: 'auto-fixture', type: 'fixture' },
	]);
	assert.deepEqual(project.tasks.map(({ name, type }) => ({ name, type })), [
		{ name: 'auto-fixture', type: 'fixture' },
	]);

	const build = await project.build();
	assert.equal(build.success, true, JSON.stringify(build));
	assert.deepEqual(build.results.map(({ task, type, message }) => ({ task, type, message })), [
		{ task: 'auto-fixture', type: 'fixture', message: 'injected' },
	]);

	const single = await project.runTask('auto-fixture');
	assert.equal(single.success, true);
	assert.equal(single.message, 'injected');

	// Reloading must not duplicate the injected task.
	await project.reload();
	assert.equal(project.config.tasks.length, 1);
});
