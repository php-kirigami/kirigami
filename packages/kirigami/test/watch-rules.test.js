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

test('a script with watch globs gets its own rule, first; scripts without watch get none', async t => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-rules-'));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	const config = {
		root,
		prepros: {},
		tasks: [],
		scripts: [
			{ name: 'prepare', trigger: 'before-build', watch: ['src/_data/items.yaml'] },
			{ name: 'manual' },
			{ name: 'empty', watch: [] },
		],
	};
	const rules = await buildWatchRules(config);
	assert.deepEqual(rules.map(rule => [rule.name, rule.type]), [['script:prepare', 'script'], ['prepros', 'prepros']]);
	assert.deepEqual(rules[0].patterns, ['src/_data/items.yaml']);
	assert.equal(typeof rules[0].callback, 'function');
});

test('the prepros rule also follows image.source, default assets/images', async t => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-rules-'));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	const [byDefault] = await buildWatchRules({ root, prepros: {}, tasks: [] });
	assert.ok(byDefault.patterns.includes('assets/images/**/*'));
	const [custom] = await buildWatchRules({ root, prepros: {}, tasks: [], image: { source: './media/photos/' } });
	assert.ok(custom.patterns.includes('media/photos/**/*'));
	assert.ok(!custom.patterns.includes('assets/images/**/*'));
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
