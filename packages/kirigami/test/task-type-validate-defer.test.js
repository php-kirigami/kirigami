import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('Project.validate() defers a plugin-registered task type instead of rejecting it as unknown', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-validate-defer-'));
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
  registerTaskType('fixture', { taskname: 'Fixture task', run: async () => ({ success: true }) });
}`);
	write('kirigami.yaml', JSON.stringify({
		kirigami: { project: 'Custom task', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-task-fixture', active: true }],
		tasks: [{ name: 'custom', type: 'fixture' }],
	}));
	process.chdir(dir);

	const { Project } = await import('../index.js');
	t.after(() => {
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	// No reload() — plugins were never loaded, so the SDK task-type registry
	// is empty. validate() must not treat "fixture" as unknown just because
	// it can't resolve it yet.
	const project = new Project();
	assert.equal(await project.validate(), true);
});
