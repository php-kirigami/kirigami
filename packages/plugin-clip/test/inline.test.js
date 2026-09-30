import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { renderClips } from '../src/build.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const opts = { posterWidth: 320, samples: 6 };

// One project per process, like a real build (the PHP image runtime is bound to
// the first project it serves). Two loops: a landscape and a vertical one.
function makeProject() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-clip-'));
	fs.writeFileSync(path.join(dir, 'kirigami.yaml'), 'kirigami:\n  project: t\n  baseurl: http://localhost\n  root: src\nimage:\n  format: webp\n  source: assets/images\n  dest: images\n');
	fs.mkdirSync(path.join(dir, 'src', 'about'), { recursive: true });
	fs.mkdirSync(path.join(dir, 'src', 'video'));
	for (const [name, size] of [['loop.mp4', '320x180'], ['tall.mp4', '180x320']]) {
		const made = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=15`, '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(dir, 'src', 'video', name)]);
		assert.equal(made.status, 0, String(made.stderr));
	}
	return dir;
}

test('<inline-clip> becomes one silent, looping, autoplaying <video> with its real size', { skip: !hasFfmpeg && 'ffmpeg not found', timeout: 180000 }, async () => {
	const dir = makeProject();
	const ctx = {
		abs: path.join(dir, 'src', 'about', 'index.html'),
		config: { root: 'src', image: { format: 'webp', source: 'assets/images', dest: 'images' } },
	};
	const cwd = process.cwd();
	process.chdir(dir);
	try {
		const out = await renderClips('<p>a</p><inline-clip src="../video/loop.mp4" class="hero"><p>b</p>', ctx, opts);
		assert.match(out, /^<p>a<\/p><video class="inline-clip hero" src="\.\.\/video\/loop\.mp4" poster="\.\.\/images\/clip\/[0-9a-f]{16}-320w\.webp" width="320" height="180" autoplay muted loop playsinline preload="metadata" aria-hidden="true"><\/video><p>b<\/p>$/);

		// A vertical loop keeps its own shape: no forced landscape box, unlike <clip>.
		const tall = await renderClips('<inline-clip src="../video/tall.mp4">', ctx, opts);
		// (bestframe scales the poster to posterWidth: 180x320 -> 320x568)
		assert.match(tall, /-320w\.webp" width="320" height="568" autoplay/);
		assert.doesNotMatch(tall, /clip--portrait/);

		// A missing file becomes a comment naming the tag.
		assert.equal(await renderClips('<inline-clip src="../video/none.mp4">', ctx, opts), '<!-- inline-clip: file not found -->');
	} finally {
		process.chdir(cwd);
	}
});
