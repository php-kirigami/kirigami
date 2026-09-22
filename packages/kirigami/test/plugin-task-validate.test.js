import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('validate() keeps plugin-injected tasks, and duplicate task names are rejected', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-plugin-validate-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		const target = path.join(dir, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	};
	const yaml = (tasks) => JSON.stringify({
		kirigami: { project: 'Plugin validate', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-auto-task', active: true }],
		...(tasks ? { tasks } : {}),
	});

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
    canbuild: true,
    async run(_root, task) {
      return { success: true, who: task.who };
    },
  });
  on(HOOKS.TASKS_REGISTER, () => ({ name: 'auto', type: 'fixture', who: 'plugin' }));
}`);
	write('kirigami.yaml', yaml());
	process.chdir(dir);

	const { load } = await import('../index.js');
	t.after(() => {
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const project = await load();
	assert.deepEqual(project.tasks.map((task) => task.name), ['auto']);

	// validate() checks the file on disk without replacing the loaded config.
	assert.equal(await project.validate(), true);
	assert.deepEqual(project.tasks.map((task) => task.name), ['auto']);
	const build = await project.build();
	assert.equal(build.success, true, JSON.stringify(build));
	assert.deepEqual(build.results.map((result) => result.who), ['plugin']);

	// A kirigami.yaml task with the same name as an injected one must not be
	// silently shadowed.
	write('kirigami.yaml', yaml([{ name: 'auto', type: 'fixture', who: 'project' }]));
	await assert.rejects(project.reload(), /Duplicate task name "auto"/);

	write('kirigami.yaml', yaml([
		{ name: 'twice', type: 'fixture' },
		{ name: 'twice', type: 'fixture' },
	]));
	await assert.rejects(project.validate(), /Duplicate task name "twice"/);
});
