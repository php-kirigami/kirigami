import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import chokidar from 'chokidar';
import { createWatchers } from '../bin/libs/watchengine.js';

function fakeWatchers(t, failAt = -1, asyncFailure = false) {
	const watchers = [];
	t.mock.method(chokidar, 'watch', () => {
		if (watchers.length === failAt) throw new Error('Startup failed');
		const watcher = new EventEmitter();
		watcher.closed = false;
		watcher.close = async () => { watcher.closed = true; };
		watchers.push(watcher);
		queueMicrotask(() => watcher.emit(asyncFailure ? 'error' : 'ready', new Error('Async startup failed')));
		return watcher;
	});
	return watchers;
}

async function until(predicate) {
	for (let i = 0; i < 200; i++) {
		if (predicate()) return;
		await delay(10);
	}
	assert.fail('Timed out waiting for watcher operation');
}

test('callback rejection is logged and later batches still run', async t => {
	const watchers = fakeWatchers(t);
	const errors = [];
	t.mock.method(console, 'error', (...args) => errors.push(args));
	let calls = 0;
	const handle = createWatchers([{ patterns: '*.txt', debounceMs: 0, callback: async () => {
		if (++calls === 1) throw new Error('Build failed');
	} }]);
	t.after(() => handle.close());
	await handle.ready;
	watchers[0].emit('change', path.resolve('one.txt'));
	await until(() => errors.length === 1);
	watchers[0].emit('change', path.resolve('two.txt'));
	await until(() => calls === 2);
	assert.match(String(errors[0]), /Build failed/);
});

test('close waits for an active batch and discards pending and late events', async t => {
	const watchers = fakeWatchers(t);
	let release;
	const gate = new Promise(resolve => release = resolve);
	let calls = 0;
	const handle = createWatchers([{ patterns: '*.txt', debounceMs: 0, callback: async () => { calls++; await gate; } }]);
	await handle.ready;
	watchers[0].emit('change', path.resolve('one.txt'));
	await until(() => calls === 1);
	watchers[0].emit('change', path.resolve('two.txt'));
	let closed = false;
	const closing = handle.close().then(() => closed = true);
	await delay(20);
	assert.equal(closed, false);
	release();
	await closing;
	watchers[0].emit('change', path.resolve('three.txt'));
	await delay(20);
	assert.equal(calls, 1);
	assert.equal(watchers[0].closed, true);
});

test('partial synchronous watcher startup is cleaned up', async t => {
	const watchers = fakeWatchers(t, 1);
	const rule = { patterns: '*.txt', callback() {} };
	await assert.rejects(createWatchers([rule, rule]).ready, /Startup failed/);
	assert.equal(watchers[0].closed, true);
});

test('asynchronous startup errors reject readiness and close all watchers', async t => {
	const watchers = fakeWatchers(t, -1, true);
	t.mock.method(console, 'error', () => {});
	const rule = { patterns: '*.txt', callback() {} };
	const handle = createWatchers([rule, rule]);
	await assert.rejects(handle.ready, /Async startup failed/);
	assert.ok(watchers.every(w => w.closed));
});

test('serve reports terminal failures and releases the HTTP port after startup failure', async t => {
	const cwd = process.cwd();
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-watch-errors-'));
	fs.mkdirSync(path.join(dir, 'src'));
	fs.writeFileSync(path.join(dir, 'src/_index.php'), 'Page');
	fs.writeFileSync(path.join(dir, 'kirigami.yaml'), JSON.stringify({ kirigami: { root: 'src', project: 'Errors', baseurl: 'https://example.com' }, prepros: {} }));
	process.chdir(dir);
	const { load } = await import('../index.js');
	const { on, HOOKS } = await import('@kirigami/sdk');
	const { resetRuntime } = await import('@kirigami/php-prepros');
	let server;
	t.after(async () => {
		await server?.close();
		await resetRuntime();
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});
	const watchers = fakeWatchers(t);
	t.mock.method(console, 'error', () => {});
	const project = await load();
	let hookFailure = true;
	on(HOOKS.PREPROS_PHP, () => { if (hookFailure) throw new Error('Hook failed'); });
	const events = [];
	let startFailure = false;
	let doneFailure = false;
	server = await project.serve({ port: 0, onBuildResult: async event => {
		events.push(event);
		if (startFailure && event.status === 'start') throw new Error('Start observer failed');
		if (doneFailure && event.status === 'done') throw new Error('Done observer failed');
	} });
	for (const mode of ['hook', 'start', 'done', 'recovery']) {
		startFailure = mode === 'start'; doneFailure = mode === 'done';
		hookFailure = mode !== 'recovery';
		const before = events.length;
		watchers[0].emit('change', path.join(dir, 'src/_index.php'));
		await until(() => events.length === before + 2);
		assert.equal(events.at(-1).status, 'done');
		assert.equal(events.at(-1).success, mode === 'recovery');
		if (mode !== 'recovery') assert.match(events.at(-1).error, mode === 'start' ? /Start observer failed/ : /Hook failed/);
	}
	await server.close(); server = null;
	// Reserve a known free port, release it, then verify failed serve startup releases it too.
	const probe = http.createServer();
	await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
	const port = probe.address().port;
	await new Promise(resolve => probe.close(resolve));
	t.mock.method(chokidar, 'watch', () => { throw new Error('Startup failed'); });
	await assert.rejects(project.serve({ port }), /Startup failed/);
	await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port, '127.0.0.1', resolve); });
	await new Promise(resolve => probe.close(resolve));
});
