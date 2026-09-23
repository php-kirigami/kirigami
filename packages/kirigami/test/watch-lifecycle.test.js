import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

test('watch additions, deletions, and renames rebuild PHP, JavaScript, and Sass', { timeout: 90000 }, async t => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-watch-'));
	const cwd = process.cwd();
	// Sass's NodePackageImporter uses argv[1] as an absolute resolution base.
	const entry = process.argv[1];
	process.argv[1] = path.resolve(entry);
	const write = (file, content) => {
		fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		fs.writeFileSync(path.join(dir, file), content);
	};
	write('kirigami.yaml', JSON.stringify({ kirigami: { project: 'Watch', root: 'src', baseurl: 'https://example.com' }, prepros: {} }));
	write('src/_index.php', '<p>Home</p>');
	write('src/keep.html', 'Hand authored');
	write('src/js/main.js', 'import { value } from "./dep.js"; console.log(value);');
	write('src/js/dep.js', 'export const value = 1;');
	write('src/css/main.scss', '@use "dep"; body { color: dep.$color; }');
	write('src/css/_dep.scss', '$color: red;');
	process.chdir(dir);
	const prepros = await import('../bin/tasks/prepros.js');
	const js = await import('../bin/tasks/esbuild.js');
	const sass = await import('../bin/tasks/sass.js');
	const { createWatchers } = await import('../bin/libs/watchengine.js');
	const { resetRuntime } = await import('@kirigami/php-prepros');
	const root = path.join(dir, 'src');
	let watchers;
	const active = new Set();
	t.after(async () => {
		await watchers?.close();
		await Promise.allSettled(active);
		await resetRuntime();
		(await import('esbuild')).stop();
		process.chdir(cwd);
		process.argv[1] = entry;
		// The fixture is the only subtree owned by this test. Windows can keep
		// a just-closed watch handle on it for a moment; a leftover temp
		// directory isn't a test failure.
		try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
		catch (error) { if (error.code !== 'EPERM' && error.code !== 'EBUSY') throw error; }
	});
	assert.equal((await prepros.default(root, {})).success, true);
	const results = [];
	const rules = [prepros.getWatcher(root, { name: 'pages' }), js.getWatcher(root, { name: 'js', entry: 'js/main.js' }), sass.getWatcher(root, { name: 'css', entry: 'css/main.scss' })];
	watchers = createWatchers(rules.map(rule => ({ ...rule, debounceMs: 30, callback: async events => {
		const operation = rule.callback(events);
		active.add(operation);
		try { results.push({ name: rule.name, events, result: await operation }); }
		finally { active.delete(operation); }
	} })), { cwd: dir, awaitWriteFinish: false });
	await watchers.ready;
	async function mutate(name, action, success = true, expectedFile) {
		const start = results.length;
		action();
		const deadline = Date.now() + 15000;
		while (Date.now() < deadline) {
			const result = results.slice(start).find(r => r.name === name && (!expectedFile || r.events.some(e => e.file === expectedFile)));
			if (result) {
				assert.equal(result.result?.success, success, JSON.stringify(result));
				return result;
			}
			await delay(30);
		}
		assert.fail(`No ${name} rebuild after filesystem event`);
	}
	const read = file => fs.readFileSync(path.join(dir, file), 'utf8');
	await mutate('pages', () => write('src/news/_index.php', '<p>New page</p>'));
	assert.match(read('src/news/index.html'), /New page/);
	assert.match(read('src/sitemap.xml'), /https:\/\/example.com\/news\//);
	await mutate('pages', () => fs.unlinkSync(path.join(root, 'news/_index.php')));
	assert.equal(fs.existsSync(path.join(root, 'news/index.html')), false);
	assert.doesNotMatch(read('src/sitemap.xml'), /\/news\//);
	await mutate('pages', () => write('src/_old.php', '<p>Rename</p>'));
	await mutate('pages', () => fs.renameSync(path.join(root, '_old.php'), path.join(root, '_new.php')));
	assert.equal(fs.existsSync(path.join(root, 'old.html')), false);
	assert.match(read('src/new.html'), /Rename/);
	await mutate('pages', () => write('src/_probe.php', '<?php echo is_file(__DIR__ . "/extra.json") ? "present" : "absent";'), true, 'src/_probe.php');
	await mutate('pages', () => write('src/extra.json', '{}'), true, 'src/extra.json');
	assert.equal(read('src/probe.html'), 'present');
	await mutate('pages', () => fs.unlinkSync(path.join(root, 'extra.json')), true, 'src/extra.json');
	assert.equal(read('src/probe.html'), 'absent');
	await mutate('pages', () => write('src/gone/_index.php', '<p>Gone</p>'));
	await mutate('pages', () => fs.rmSync(path.join(root, 'gone'), { recursive: true }));
	assert.doesNotMatch(read('src/sitemap.xml'), /\/gone\//);
	assert.equal(read('src/keep.html'), 'Hand authored');
	// Even an empty removed directory must deliver unlinkDir to glob rules.
	fs.mkdirSync(path.join(root, 'empty'));
	await delay(200);
	const removedDir = await mutate('pages', () => fs.rmdirSync(path.join(root, 'empty')), true, 'src/empty');
	assert.ok(removedDir.events.some(e => e.type === 'unlinkDir'));
	for (const [name, dependency, content, output] of [
		['js', 'js/dep.js', 'export const value = 2;', 'js/main.min.js'],
		['css', 'css/_dep.scss', '$color: blue;', 'css/main.min.css'],
	]) {
		await mutate(name, () => fs.unlinkSync(path.join(root, dependency)), false);
		const added = await mutate(name, () => write(`src/${dependency}`, content));
		assert.ok(added.events.every(e => e.type === 'add'));
		assert.ok(fs.existsSync(path.join(root, output)));
	}
});
