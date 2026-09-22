import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { builtInTaskTypes } from '../bin/libs/tasktypes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('built-in task types stay in sync with the schema\'s reserved-name list', () => {
	const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../kirigami.schema.json'), 'utf8'));
	const pluginTaskSchema = schema.properties.tasks.items.oneOf.find((branch) => branch.properties?.type?.not);
	const reserved = new Set(pluginTaskSchema.properties.type.not.enum);
	assert.deepEqual(reserved, builtInTaskTypes);
});

test('plugins register task types used by validation, build, export, runTask and watch', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-custom-task-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		const target = path.join(dir, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	};

	write('src/input.txt', 'fixture');
	write('node_modules/kirigami-plugin-task-fixture/package.json', JSON.stringify({
		name: 'kirigami-plugin-task-fixture',
		version: '1.0.0',
		type: 'module',
		main: 'index.js',
	}));
	write('node_modules/kirigami-plugin-task-fixture/index.js', `
import { registerTaskType } from ${JSON.stringify(import.meta.resolve('@kirigami/sdk'))};
export default function register() {
  registerTaskType('fixture', {
    taskname: 'Fixture task',
    canbuild: true,
    canwatch: true,
    validate(_root, task) {
      if (!task.message) throw new Error('fixture message is required');
    },
    async run(_root, task, exportPath) {
      return { success: true, message: task.message, exportPath: exportPath || null };
    },
    getWatcher(_root, task) {
      return { name: task.name, patterns: 'src/input.txt', callback: async () => ({ success: true }) };
    },
  });
}`);

	const config = {
		kirigami: { project: 'Custom task', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-task-fixture', active: true }],
		tasks: [{ name: 'custom', type: 'fixture', message: 'hello' }],
		export: { path: 'dist' },
	};
	const save = () => write('kirigami.yaml', JSON.stringify(config));
	save();
	process.chdir(dir);

	const { load } = await import('../index.js');
	const { buildWatchRules } = await import('../bin/libs/watchengine.js');
	t.after(() => {
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const project = await load();
	assert.deepEqual(project.plugins, [{ name: 'kirigami-plugin-task-fixture', version: '1.0.0' }]);

	const build = await project.build();
	assert.equal(build.success, true);
	assert.deepEqual(build.results.map(({ task, type, taskname, message }) => ({ task, type, taskname, message })), [
		{ task: 'custom', type: 'fixture', taskname: 'Fixture task', message: 'hello' },
	]);

	const single = await project.runTask('custom');
	assert.equal(single.success, true);
	assert.equal(single.message, 'hello');

	const exported = await project.export({ path: 'dist' });
	assert.equal(exported.success, true, JSON.stringify(exported));
	const customExport = exported.results.find((result) => result.type === 'fixture');
	assert.equal(customExport.exportPath, path.join(dir, 'dist'));

	const rules = await buildWatchRules(project.config);
	assert.deepEqual(rules.map(({ name, type, patterns }) => ({ name, type, patterns })), [
		{ name: 'custom', type: 'fixture', patterns: 'src/input.txt' },
	]);

	await project.reload();
	assert.equal((await project.build()).success, true);

	config.plugins[0].active = false;
	save();
	await assert.rejects(project.reload(), /Unknown task type/);
});
