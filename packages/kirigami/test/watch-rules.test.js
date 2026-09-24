import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildWatchRules } from '../bin/libs/watchengine.js';

test('repeated rule construction preserves frozen configured tasks and rule order', async t => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-rules-'));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	const tasks = Object.freeze([
		Object.freeze({ name: 'scripts', type: 'esbuild', entry: 'js/main.js' }),
		Object.freeze({ name: 'explicit-pages', type: 'prepros' }),
		Object.freeze({ name: 'export', type: 'dist' }),
	]);
	const config = Object.freeze({ root, prepros: Object.freeze({}), tasks });
	const before = JSON.stringify(config);
	for (let i = 0; i < 3; i++) {
		const rules = await buildWatchRules(config);
		assert.deepEqual(rules.map(rule => [rule.name, rule.type]), [
			['prepros', 'prepros'], ['scripts', 'esbuild'], ['explicit-pages', 'prepros'],
		]);
		assert.equal(config.tasks, tasks);
		assert.equal(JSON.stringify(config), before);
	}
});

test('implicit prepros is conditional and never persists into later rule construction', async t => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-rules-'));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	const tasks = [];
	const config = { root, prepros: {}, tasks };
	assert.equal((await buildWatchRules(config)).length, 1);
	assert.equal((await buildWatchRules(config)).length, 1);
	config.prepros = null;
	assert.deepEqual(await buildWatchRules(config), []);
	assert.equal(config.tasks, tasks);
	assert.deepEqual(tasks, []);
});
