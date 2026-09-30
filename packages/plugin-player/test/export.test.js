import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { renderPlayers } from '../src/build.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const opts = { samples: 100, cover: true, coverSize: 64 };

test('during an export, the cover goes to the source tree only: the export folder is left for the dist task', { skip: !hasFfmpeg && 'ffmpeg not found', timeout: 180000 }, async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'player-export-'));
	fs.writeFileSync(path.join(dir, 'kirigami.yaml'), 'kirigami:\n  project: t\n  baseurl: http://localhost\n  root: src\nimage:\n  format: webp\n  source: assets/images\n  dest: images\n');
	fs.mkdirSync(path.join(dir, 'src', 'about'), { recursive: true });
	fs.mkdirSync(path.join(dir, 'src', 'audio'));
	const mp3 = path.join(dir, 'src', 'audio', 'song.mp3');
	const made = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-f', 'lavfi', '-i', 'color=c=green:s=200x200:d=1',
		'-map', '0:a', '-map', '1:v', '-frames:v', '1', '-c:a', 'libmp3lame', '-c:v', 'mjpeg', '-id3v2_version', '3', '-disposition:v', 'attached_pic', mp3]);
	assert.equal(made.status, 0, String(made.stderr));

	const dist = path.join(dir, 'dist');
	const ctx = {
		abs: path.join(dir, 'src', 'about', 'index.html'),
		exportPath: dist,
		config: { root: 'src', image: { format: 'webp', source: 'assets/images', dest: 'images' } },
	};
	const cwd = process.cwd();
	process.chdir(dir);
	try {
		const out = await renderPlayers('<player src="../audio/song.mp3">', ctx, opts);
		assert.match(out, /<img class="player__cover" src="\.\.\/images\/player\/[0-9a-f]{16}-64x64-cover\.webp"/);
		assert.equal(fs.existsSync(dist), false, 'nothing may be written into the export folder before dist runs');
		assert.ok(fs.readdirSync(path.join(dir, 'src', 'images', 'player')).some((f) => f.endsWith('.webp')));
	} finally {
		process.chdir(cwd);
	}
});
