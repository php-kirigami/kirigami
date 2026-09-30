import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { bestFrame } from '../index.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bestframe-'));

// One short synthetic clip per codec/container pair added in 0.2.0, plus the
// original H.264/MP4 as a control. Encoders that this machine's ffmpeg lacks
// skip their case instead of failing.
const CASES = [
	['h264 in mp4', 'a.mp4', ['-c:v', 'libx264', '-pix_fmt', 'yuv420p']],
	['mpeg4 part 2 in avi', 'b.avi', ['-c:v', 'mpeg4', '-q:v', '5']],
	['mpeg1 in a program stream', 'c.mpg', ['-c:v', 'mpeg1video', '-q:v', '5']],
	['mpeg2 in a transport stream', 'd.ts', ['-c:v', 'mpeg2video', '-q:v', '5']],
	['vp8 in webm', 'e.webm', ['-c:v', 'libvpx', '-b:v', '1M', '-deadline', 'realtime', '-cpu-used', '8']],
	['theora in ogg', 'f.ogv', ['-c:v', 'libtheora', '-q:v', '6']],
];

for (const [name, file, args] of CASES) {
	test(`decodes ${name}`, { timeout: 120000 }, async (t) => {
		if (!hasFfmpeg) return t.skip('ffmpeg not found');
		const out = path.join(dir, file);
		const made = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25', '-t', '3', ...args, '-an', out]);
		if (made.status !== 0) return t.skip(`this ffmpeg can't encode it: ${String(made.stderr).split('\n')[0]}`);

		const result = await bestFrame(out, { samples: 4, width: 160 });
		assert.ok(result, 'expected a frame, got null');
		assert.equal(result.width, 160);
		assert.equal(result.height, 90);
		assert.equal(result.sourceWidth, 320);
		assert.ok(result.duration > 2 && result.duration < 4, `duration ${result.duration}`);
		assert.ok(result.data.length > 100);
	});
}

test('an undecodable file resolves to null, silently', () => {
	// A stderr line here would be FFmpeg writing to the embedding process's console.
	const script = `import { bestFrame } from ${JSON.stringify(new URL('../index.js', import.meta.url).href)};`
		+ `console.log(await bestFrame(${JSON.stringify(path.join(dir, 'garbage.bin'))}));`;
	fs.writeFileSync(path.join(dir, 'garbage.bin'), Buffer.alloc(4096, 7));
	fs.writeFileSync(path.join(dir, 'run.mjs'), script);
	const run = spawnSync(process.execPath, [path.join(dir, 'run.mjs')], { encoding: 'utf8' });
	assert.equal(run.status, 0, run.stderr);
	assert.equal(run.stdout.trim(), 'null');
	assert.equal(run.stderr, '');
});
