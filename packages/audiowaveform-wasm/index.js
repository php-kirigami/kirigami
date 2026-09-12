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
