import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('sass:after and esbuild:after inject into the first task of their type only', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-hook-first-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		const target = path.join(dir, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	};

	write('node_modules/kirigami-plugin-inject/package.json', JSON.stringify({
		name: 'kirigami-plugin-inject',
		version: '1.0.0',
		type: 'module',
		main: 'index.js',
	}));
	write('node_modules/kirigami-plugin-inject/injected.scss', '.injected-marker { color: red; }');
	write('node_modules/kirigami-plugin-inject/injected.js', 'globalThis.injectedMarker = 1;');
	write('node_modules/kirigami-plugin-inject/index.js', `
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { on, HOOKS } from ${JSON.stringify(import.meta.resolve('@kirigami/sdk'))};
const dir = path.dirname(fileURLToPath(import.meta.url));
export default function register() {
  on(HOOKS.SASS_AFTER, () => path.join(dir, 'injected.scss'));
  on(HOOKS.ESBUILD_AFTER, () => path.join(dir, 'injected.js'));
}`);
	write('src/first.scss', '.first { color: blue; }');
	write('src/second.scss', '.second { color: green; }');
	write('src/first.js', 'globalThis.first = 1;');
	write('src/second.js', 'globalThis.second = 1;');
	write('kirigami.yaml', JSON.stringify({
		kirigami: { project: 'Hook injection', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-inject', active: true }],
		tasks: [
			{ name: 'css-first', type: 'sass', entry: 'first.scss' },
			{ name: 'css-second', type: 'sass', entry: 'second.scss' },
			{ name: 'js-first', type: 'esbuild', entry: 'first.js' },
			{ name: 'js-second', type: 'esbuild', entry: 'second.js' },
		],
	}));
	process.chdir(dir);

	const { load } = await import('../index.js');
	t.after(async () => {
		(await import('esbuild')).stop();
		process.chdir(cwd);
		// Windows can hold the cache database or esbuild's service for a
		// moment; a leftover temp directory isn't a test failure.
		try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
		catch (error) { if (error.code !== 'EPERM' && error.code !== 'EBUSY') throw error; }
	});

	const project = await load();
	const build = await project.build();
	assert.equal(build.success, true, JSON.stringify(build));

	const read = (file) => fs.readFileSync(path.join(dir, 'src', file), 'utf8');
	assert.match(read('first.min.css'), /injected-marker/);
	assert.doesNotMatch(read('second.min.css'), /injected-marker/);
	assert.match(read('first.min.js'), /injectedMarker/);
	assert.doesNotMatch(read('second.min.js'), /injectedMarker/);

	// Running the second task alone (as a watcher would) stays clean too.
	const single = await project.runTask('css-second');
	assert.equal(single.success, true, JSON.stringify(single));
	assert.doesNotMatch(read('second.min.css'), /injected-marker/);
});
