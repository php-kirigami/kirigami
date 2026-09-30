import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractAudioPeaks, getAudioPackage, peaksToSvg, resamplePeaks } from '../index.js';

// 2s of 8kHz mono 16-bit PCM: silence then a loud second.
function makeWav() {
	const rate = 8000;
	const n = rate * 2;
	const buf = Buffer.alloc(44 + n * 2);
	buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
	buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
	buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32);
	buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
	for (let i = rate; i < n; i++) buf.writeInt16LE(Math.round(Math.sin(i / 5) * 20000), 44 + i * 2);
	return new Uint8Array(buf);
}

test('resamplePeaks yields exactly N pairs and keeps extremes', () => {
	const peaks = { version: 2, channels: 1, sample_rate: 8000, samples_per_pixel: 10, bits: 16,
		length: 4, data: [-1, 1, -5, 2, -2, 9, -3, 3] };
	const down = resamplePeaks(peaks, 2);
	assert.deepEqual(down.data, [-5, 2, -3, 9]);
	assert.equal(down.length, 2);
	assert.equal(down.samples_per_pixel, 20);
	assert.equal(resamplePeaks(peaks, 8).data.length, 16);
	assert.throws(() => resamplePeaks(peaks, 0), RangeError);
});

test('peaksToSvg emits a stretchable single-path svg', () => {
	const peaks = { version: 2, channels: 1, sample_rate: 8000, samples_per_pixel: 10, bits: 16,
		length: 2, data: [-100, 100, 0, 0] };
	const svg = peaksToSvg(peaks, { width: 2 });
	assert.match(svg, /^<svg class="audiowaveform" viewBox="0 0 2 0.4" preserveAspectRatio="none"><path d="M 0,0.4 L 0,0 L 1,0.4 L 2,0.4"/);
	assert.match(peaksToSvg(peaks, { width: 2, mirror: true }), / Z"/);
});

test('getAudioPackage returns meta and svg for a WAV', async () => {
	const wav = makeWav();
	assert.ok(await extractAudioPeaks(wav, 64));
	const pkg = await getAudioPackage(wav, { width: 200, includePeaks: true });
	assert.equal(pkg.meta.format, 'wav');
	assert.equal(pkg.meta.size, wav.length);
	assert.equal(pkg.meta.sampleRate, 8000);
	assert.ok(Math.abs(pkg.meta.duration - 2) < 0.1);
	assert.equal(pkg.meta.id3, null);
	assert.match(pkg.svg, /viewBox="0 0 200 40"/);
	assert.equal(pkg.peaks.length, 200);
});

test('getAudioPackage resolves null on undecodable input', async () => {
	assert.equal(await getAudioPackage(new Uint8Array(64)), null);
});
