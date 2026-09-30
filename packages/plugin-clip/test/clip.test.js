import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { renderClips, formatTime } from '../src/build.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const opts = { posterWidth: 320, samples: 6 };

// A tiny project: kirigami.yaml (php-prepros reads it for the image config),
// a page directory and a 3s H.264 clip made with ffmpeg.
// One project per process, like a real build: the PHP image runtime is bound to
// the first project it serves.
let shared;
function makeProject() {
	if (shared) return shared;
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clip-'));
	fs.writeFileSync(path.join(dir, 'kirigami.yaml'), 'kirigami:\n  project: t\n  baseurl: http://localhost\n  root: src\nimage:\n  format: webp\n  source: assets/images\n  dest: images\n');
	fs.mkdirSync(path.join(dir, 'src', 'about'), { recursive: true });
	fs.mkdirSync(path.join(dir, 'src', 'video'));
	const out = path.join(dir, 'src', 'video', '04_my-clip.mp4');
	const made = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=15', '-t', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out]);
	assert.equal(made.status, 0, String(made.stderr));
	shared = dir;
	return dir;
}

const ctxFor = (dir) => ({
	abs: path.join(dir, 'src', 'about', 'index.html'),
	config: { root: 'src', image: { format: 'webp', source: 'assets/images', dest: 'images' } },
});

test('formatTime', () => {
	assert.equal(formatTime(5), '0:05');
	assert.equal(formatTime(125.4), '2:05');
	assert.equal(formatTime(3725), '1:02:05');
});

test('pages without a <clip> are returned untouched', async () => {
	assert.equal(await renderClips('<p>x</p>', { abs: '/x/y.html' }, opts), '<p>x</p>');
});

test('a missing file becomes a comment and leaves the rest of the page alone', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clip-'));
	fs.mkdirSync(path.join(dir, 'src'));
	const out = await renderClips('<p>a</p><clip src="nope.mp4"><p>b</p>', { abs: path.join(dir, 'src', 'index.html'), config: { root: 'src' } }, opts);
	assert.equal(out, '<p>a</p><!-- clip: file not found --><p>b</p>');
});

test('renders a <clip>: poster in the image source, published as an img-asset, cached', { skip: !hasFfmpeg && 'ffmpeg not found', timeout: 180000 }, async () => {
	const dir = makeProject();
	const cwd = process.cwd();
	process.chdir(dir);
	try {
		const html = '<p>hi</p><clip src="../video/04_my-clip.mp4">';
		const out = await renderClips(html, ctxFor(dir), opts);
		assert.match(out, /^<p>hi<\/p><div class="clip" data-src="\.\.\/video\/04_my-clip\.mp4">/);
		assert.match(out, /<img class="clip__poster" src="\.\.\/images\/clip\/[0-9a-f]{16}-320w\.webp" width="320" height="180" alt="" loading="lazy">/);
		assert.match(out, /<a class="clip__play" href="\.\.\/video\/04_my-clip\.mp4" aria-label="Play my-clip">/);
		assert.match(out, /<span class="clip__title">my-clip<\/span><span class="clip__duration">0:03<\/span>/);

		const [json] = fs.readdirSync(path.join(dir, 'src', '_data', 'clip'));
		const hash = json.replace('.json', '');
		assert.ok(fs.existsSync(path.join(dir, 'assets', 'images', 'clip', `${hash}.jpg`)), 'poster source in image.source');
		assert.ok(fs.existsSync(path.join(dir, 'src', 'images', 'clip', `${hash}-320w.webp`)), 'published poster');

		// Second run: served from the cache (no bestframe), same markup.
		const cacheFile = path.join(dir, 'src', '_data', 'clip', json);
		const before = fs.statSync(cacheFile).mtimeMs;
		await new Promise((r) => setTimeout(r, 20));
		assert.equal(await renderClips(html, ctxFor(dir), opts), out);
		assert.equal(fs.statSync(cacheFile).mtimeMs, before);
	} finally {
		process.chdir(cwd);
	}
});

test('a vertical video gets the default landscape box and a poster sized to it', { skip: !hasFfmpeg && 'ffmpeg not found', timeout: 180000 }, async () => {
	const dir = makeProject();
	const out = path.join(dir, 'src', 'video', 'tall.mp4');
	const made = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=180x320:rate=15', '-t', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out]);
	assert.equal(made.status, 0, String(made.stderr));
	const cwd = process.cwd();
	process.chdir(dir);
	try {
		const html = await renderClips('<clip src="../video/tall.mp4">', ctxFor(dir), opts);
		// posterWidth 320 -> box 320x180; the 180x320 frame scales to 101x180
		assert.match(html, /^<div class="clip clip--portrait" data-src="\.\.\/video\/tall\.mp4">/);
		assert.match(html, /-101w\.webp" width="101" height="180"/);
	} finally {
		process.chdir(cwd);
	}
});
