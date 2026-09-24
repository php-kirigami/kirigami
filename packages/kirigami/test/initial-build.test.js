import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import chokidar from 'chokidar';

test('serve and watch build before startup, support opt-out and reject failed builds', async t => {
	const cwd = process.cwd();
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-initial-'));
	fs.mkdirSync(path.join(dir, 'src'));
	fs.writeFileSync(path.join(dir, 'src/_index.php'), '<p>Fresh</p>');
	fs.writeFileSync(path.join(dir, 'kirigami.yaml'), JSON.stringify({
		kirigami: { root: 'src', project: 'Initial', baseurl: 'https://example.com' }, prepros: {},
	}));
	process.chdir(dir);
	const { load } = await import('../index.js');
	const { resetRuntime } = await import('@kirigami/php-prepros');
	let handle;
	t.after(async () => {
		await handle?.close();
		await resetRuntime();
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});
	const project = await load();
	const events = [];
	handle = await project.serve({ port: 0, onBuildResult: event => events.push(event) });
	assert.match(await (await fetch(handle.url)).text(), /<p>Fresh<\/p>/);
	assert.deepEqual(events.map(e => [e.status, e.initial]), [['start', true], ['done', true]]);
	assert.equal(events[1].success, true);
	assert.ok(events[1].results.length);
	await handle.close(); handle = null;
	fs.unlinkSync(path.join(dir, 'src/index.html'));
	handle = await project.watch();
	assert.match(fs.readFileSync(path.join(dir, 'src/index.html'), 'utf8'), /Fresh/);
	await handle.close(); handle = null;
	const failed = { success: false, trigger: { success: false, results: [{ name: 'prepare', error: 'trigger failure' }] }, results: [] };
	const build = t.mock.method(project, 'build', async () => failed);
	const watch = t.mock.method(chokidar, 'watch');
	for (const method of ['serve', 'watch']) {
		await assert.rejects(project[method]({ port: 0 }), error => {
			assert.equal(error.result, failed);
			assert.match(error.message, /trigger failure/);
			return true;
		});
	}
	assert.equal(watch.mock.callCount(), 0);
	for (const method of ['serve', 'watch']) {
		const calls = build.mock.callCount();
		handle = await project[method]({ initialBuild: false, port: 0 });
		assert.equal(build.mock.callCount(), calls);
		await handle.close(); handle = null;
	}
	build.mock.mockImplementation(async () => { throw new Error('Thrown build'); });
	const failures = [];
	await assert.rejects(project.serve({ port: 0, onBuildResult: e => failures.push(e) }), /Thrown build/);
	assert.deepEqual(failures.map(e => e.status), ['start', 'done']);
	assert.equal(failures[1].success, false);
	build.mock.mockImplementation(async () => ({ success: true, results: [] }));
	await assert.rejects(project.serve({ port: 0, onBuildResult: () => { throw new Error('Observer failed'); } }), /Observer failed/);
});
