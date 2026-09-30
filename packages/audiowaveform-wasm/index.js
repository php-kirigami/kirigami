import { resamplePeaks, peaksToSvg, detectFormat } from './waveform.js';

let modulePromise;

async function getModule() {
	if (!modulePromise) {
		const { default: createModule } = await import('./dist/audiowaveform.js');
		modulePromise = createModule();
	}
	return modulePromise;
}

export async function extractAudioPeaks(bytes, samplesPerPixel = 512) {
	const module = await getModule();
	return module.extractAudioPeaks(bytes, samplesPerPixel);
}

export async function getId3Tags(mp3Bytes) {
	const module = await getModule();
	return module.getId3Tags(mp3Bytes);
}

export async function getId3CoverArt(mp3Bytes) {
	const module = await getModule();
	return module.getId3CoverArt(mp3Bytes);
}

export { resamplePeaks, peaksToSvg };

export async function getAudioPackage(bytes, options = {}) {
	const { width = 1000, samplesPerPixel = 512, includePeaks = false, ...svgOptions } = options;
	const peaks = await extractAudioPeaks(bytes, samplesPerPixel);
	if (!peaks) return null;

	const format = detectFormat(bytes);
	const duration = (peaks.length * peaks.samples_per_pixel) / peaks.sample_rate;
	let id3 = null;
	let cover = null;
	if (format === 'mp3') {
		id3 = await getId3Tags(bytes);
		const art = await getId3CoverArt(bytes);
		if (art) cover = { mimeType: art.mimeType, pictureType: art.pictureType, data: Uint8Array.from(art.data) };
	}

	const resampled = resamplePeaks(peaks, svgOptions.samples ?? width);
	const result = {
		meta: {
			format,
			size: bytes.length,
			duration,
			sampleRate: peaks.sample_rate,
			bitrate: duration > 0 ? Math.round((bytes.length * 8) / duration / 1000) : 0,
			id3,
			cover,
		},
		svg: peaksToSvg(resampled, { ...svgOptions, width }),
	};
	if (includePeaks) result.peaks = resampled;
	return result;
}
