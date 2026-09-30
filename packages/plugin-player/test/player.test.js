import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { renderPlayers, formatTime } from '../src/build.js';
import { parseM3u } from '../src/m3u.js';

// 2s of 8kHz mono 16-bit PCM: silence, then a loud second.
function makeWav() {
	const rate = 8000;
	const n = rate * 2;
	const buf = Buffer.alloc(44 + n * 2);
	buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
	buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
	buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32);
	buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
	for (let i = rate; i < n; i++) buf.writeInt16LE(Math.round(Math.sin(i / 5) * 20000), 44 + i * 2);
	return buf;
}

function makeProject() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'player-'));
	fs.mkdirSync(path.join(dir, 'src', 'about'), { recursive: true });
	fs.mkdirSync(path.join(dir, 'src', 'audio'));
	fs.writeFileSync(path.join(dir, 'src', 'audio', 'one.wav'), makeWav());
	fs.writeFileSync(path.join(dir, 'src', 'audio', 'two.wav'), makeWav().subarray(0, 44 + 8000));
	fs.writeFileSync(path.join(dir, 'src', 'audio', 'set.m3u'), '#EXTM3U\n#EXTINF:2,The Band - First\n..\\audio\\one.wav\nhttp://x.test/remote.mp3\n');
	return dir;
}

const opts = { samples: 100, cover: true, coverSize: 240 };
const ctxFor = (dir) => ({ abs: path.join(dir, 'src', 'about', 'index.html'), config: { root: 'src' } });

test('parseM3u reads EXTINF, paths and backslashes', () => {
	assert.deepEqual(parseM3u('\uFEFF#EXTM3U\r\n#EXTINF:12,A - B\r\nsub\\x.mp3\r\n\r\ny.mp3\r\n'), [
		{ path: 'sub/x.mp3', artist: 'A', title: 'B' },
		{ path: 'y.mp3' },
	]);
});

test('a file with no tags gets a readable title from its name', async () => {
	const dir = makeProject();
	fs.copyFileSync(path.join(dir, 'src', 'audio', 'one.wav'), path.join(dir, 'src', 'audio', '04_mata-zyklek  live.wav'));
	const cwd = process.cwd();
	process.chdir(dir);
	try {
		const out = await renderPlayers('<player src="../audio/04_mata-zyklek  live.wav">', ctxFor(dir), opts);
		assert.match(out, /<span class="player__title">mata-zyklek live<\/span>/);
	} finally {
		process.chdir(cwd);
	}
});

test('formatTime', () => {
	assert.equal(formatTime(5), '0:05');
	assert.equal(formatTime(125), '2:05');
	assert.equal(formatTime(3725), '1:02:05');
});

test('renders a <player>, caches under _data/player, reuses the cache', async () => {
	const dir = makeProject();
	const cwd = process.cwd();
	process.chdir(dir);
	try {
		const html = '<p>hi</p><player src="../audio/one.wav" title="My &amp; Song">';
		const out = await renderPlayers(html, ctxFor(dir), opts);
		assert.match(out, /^<p>hi<\/p><div class="player" data-src="\.\.\/audio\/one\.wav" data-duration="2">/);
		assert.match(out, /<span class="player__title">My &amp; Song<\/span>/);
		// No tags, no cover: format instead of an artist, placeholder instead of a cover.
		assert.match(out, /<span class="player__format">WAV<\/span>/);
		assert.match(out, /<div class="player__cover player__cover--empty" aria-hidden="true"><\/div>/);
		assert.match(out, /<path id="player-wave-1" /);
		assert.match(out, /<use href="#player-wave-1"\/>/);
		assert.match(out, /<span class="player__duration">0:02<\/span>/);

		const cacheDir = path.join(dir, 'src', '_data', 'player');
		const [file] = fs.readdirSync(cacheDir);
		const before = fs.statSync(path.join(cacheDir, file)).mtimeMs;
		await new Promise((r) => setTimeout(r, 20));
		assert.equal(await renderPlayers(html, ctxFor(dir), opts), out);
		assert.equal(fs.statSync(path.join(cacheDir, file)).mtimeMs, before);
	} finally {
		process.chdir(cwd);
	}
});

test('renders a <playlist>, skipping remote entries; a missing file becomes a comment', async () => {
	const dir = makeProject();
	const cwd = process.cwd();
	process.chdir(dir);
	try {
		const out = await renderPlayers('<playlist src="../audio/set.m3u"> <player src="../nope.mp3">', ctxFor(dir), opts);
		assert.match(out, /^<div class="playlist"><ol class="playlist__tracks"><li class="playlist__track"><div class="player"/);
		assert.equal(out.match(/class="player"/g).length, 1);
		assert.match(out, /<span class="player__artist">The Band<\/span><span class="player__title">First<\/span>/);
		assert.match(out, /<!-- player: file not found -->$/);
	} finally {
		process.chdir(cwd);
	}
});

test('pages without players are returned untouched', async () => {
	assert.equal(await renderPlayers('<p>x</p>', { abs: '/x/y.html' }, opts), '<p>x</p>');
});
