// Pure-JS helpers built on top of the peaks the wasm module returns: no wasm
// needed here, so they are synchronous and unit-testable on their own.

function assertPositiveInteger(value, name) {
	if (!Number.isInteger(value) || value < 1) {
		throw new RangeError(`${name} must be a positive integer`);
	}
}

function assertPeaks(peaks) {
	if (!peaks || !Array.isArray(peaks.data) || peaks.channels !== 1) {
		throw new TypeError('peaks must be a single-channel WaveformPeaks object');
	}
}

/**
 * Resamples peaks to exactly `samples` min/max pairs (whatever the source
 * `samples_per_pixel`), keeping the true min and max of each bucket.
 */
export function resamplePeaks(peaks, samples = 1000) {
	assertPeaks(peaks);
	assertPositiveInteger(samples, 'samples');
	const sourceLength = peaks.data.length >> 1;
	const data = new Array(samples * 2);
	const ratio = sourceLength / samples;
	for (let i = 0; i < samples; i++) {
		if (sourceLength === 0) {
			data[i * 2] = 0;
			data[i * 2 + 1] = 0;
			continue;
		}
		const from = Math.min(sourceLength - 1, Math.floor(i * ratio));
		const to = Math.min(sourceLength, Math.max(from + 1, Math.ceil((i + 1) * ratio)));
		let min = Infinity;
		let max = -Infinity;
		for (let j = from; j < to; j++) {
			if (peaks.data[j * 2] < min) min = peaks.data[j * 2];
			if (peaks.data[j * 2 + 1] > max) max = peaks.data[j * 2 + 1];
		}
		data[i * 2] = min;
		data[i * 2 + 1] = max;
	}
	return {
		...peaks,
		samples_per_pixel: peaks.samples_per_pixel * (sourceLength / samples),
		length: samples,
		data,
	};
}

const round = (n) => +n.toFixed(2);

/**
 * Renders peaks as an SVG string, in the style of midi-audio-player: a single
 * unfilled `<path>` in a stretchable viewBox (`preserveAspectRatio="none"`),
 * styled from CSS. Bottom-anchored amplitude envelope by default, or a
 * symmetric min/max outline with `mirror: true`.
 */
export function peaksToSvg(peaks, options = {}) {
	assertPeaks(peaks);
	const {
		width = 1000,
		height = width / 5,
		samples = width,
		className = 'audiowaveform',
		mirror = false,
		normalize = true,
	} = options;
	assertPositiveInteger(width, 'width');
	assertPositiveInteger(samples, 'samples');
	if (!(height > 0)) throw new RangeError('height must be a positive number');

	const { data } = resamplePeaks(peaks, samples);
	const scale = normalize
		? data.reduce((max, v) => Math.max(max, Math.abs(v)), 0)
		: 2 ** ((peaks.bits || 16) - 1);
	const step = width / samples;
	const clamp = (v) => Math.max(-1, Math.min(1, scale > 0 ? v / scale : 0));

	let d;
	if (mirror) {
		const mid = height / 2;
		const upper = [];
		const lower = [];
		for (let i = 0; i < samples; i++) {
			const x = round(i * step);
			upper.push(`${x},${round(mid - Math.max(0, clamp(data[i * 2 + 1])) * mid)}`);
			lower.push(`${x},${round(mid - Math.min(0, clamp(data[i * 2])) * mid)}`);
		}
		d = `M 0,${round(mid)} L ${upper.join(' L ')} L ${width},${round(mid)} L ${lower.reverse().join(' L ')} Z`;
	} else {
		const points = [];
		for (let i = 0; i < samples; i++) {
			const amplitude = Math.max(Math.abs(clamp(data[i * 2])), Math.abs(clamp(data[i * 2 + 1])));
			points.push(`${round(i * step)},${round(height - amplitude * height)}`);
		}
		d = `M 0,${height} L ${points.join(' L ')} L ${width},${height}`;
	}
	return `<svg class="${className}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
}

const ascii = (bytes, start, length) =>
	String.fromCharCode(...bytes.subarray(start, start + length));

/** Container/codec name sniffed from magic bytes, mirroring the wasm reader dispatch. */
export function detectFormat(bytes) {
	const head4 = ascii(bytes, 0, 4);
	if (head4 === 'RIFF') return 'wav';
	if (head4 === 'FORM') return 'aiff';
	if (head4 === 'fLaC') return 'flac';
	if (head4 === 'OggS') {
		return ascii(bytes, 0, Math.min(bytes.length, 256)).includes('OpusHead') ? 'opus' : 'ogg';
	}
	if (ascii(bytes, 4, 4) === 'ftyp') return 'm4a';
	if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'webm';
	return 'mp3';
}
