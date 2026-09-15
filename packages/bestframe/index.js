import { readFile } from 'node:fs/promises';

let modulePromise;

async function getModule() {
	if (!modulePromise) {
		const { default: createModule } = await import('./dist/libbestframe.js');
		modulePromise = createModule();
	}
	return modulePromise;
}

const FORMAT_JPEG = 0;
const FORMAT_PNG = 1;

async function resolveBytes(input) {
	if (input instanceof Uint8Array) {
		return input;
	}
	if (typeof input === 'string') {
		return readFile(input);
	}
	throw new TypeError('bestFrame(): `input` must be a file path (string) or a Buffer/Uint8Array.');
}

/** Parses api.c's own "key\tvalue\n"-per-entry metadata blob into a plain object. */
function parseMetadata(raw) {
	const metadata = {};
	for (const line of raw.split('\n')) {
		if (!line) continue;
		const tabIndex = line.indexOf('\t');
		if (tabIndex === -1) continue;
		metadata[line.slice(0, tabIndex)] = line.slice(tabIndex + 1);
	}
	return metadata;
}

/**
 * Picks the best still frame from a video to use as a thumbnail.
 *
 * @param {string | Uint8Array} input - A file path, or the video already
 *   loaded into memory (a `Buffer`/`Uint8Array`).
 * @param {object} [options]
 * @param {number} [options.samples=24] - How many timestamps to sample
 *   across the video.
 * @param {number} [options.width=640] - Target output width in pixels
 *   (aspect-preserving).
 * @param {'jpeg' | 'png'} [options.format='jpeg'] - Output image format.
 *   PNG is lossless; `quality` is ignored for it.
 * @param {number} [options.quality=85] - JPEG quality, 0-100
 *   (libjpeg-style, higher = better). Ignored for PNG.
 * @returns {Promise<BestFrameResult | null>} The winning frame, or `null`
 *   if the input couldn't be decoded at all (unsupported codec/container,
 *   corrupt data). A frame is still returned even if every sampled frame
 *   fails libbestframe's own quality filters — see the library's own
 *   README for why.
 */
export async function bestFrame(input, options = {}) {
	const { samples = 24, width = 640, format = 'jpeg', quality = 85 } = options;
	const formatCode = format === 'png' ? FORMAT_PNG : FORMAT_JPEG;

	const bytes = await resolveBytes(input);
	const module = await getModule();

	const inputPtr = module._malloc(bytes.length);
	module.HEAPU8.set(bytes, inputPtr);

	const process = module.cwrap('bestframe_process', 'number', [
		'number', 'number', 'number', 'number', 'number', 'number',
	]);
	let resultPtr;
	try {
		resultPtr = process(inputPtr, bytes.length, samples, width, formatCode, quality);
	} finally {
		module._free(inputPtr);
	}

	if (!resultPtr) {
		return null;
	}

	const get = (name) => module.cwrap(name, 'number', ['number'])(resultPtr);
	const imageDataPtr = get('bestframe_result_image_data');
	const imageSize = get('bestframe_result_image_size');
	const data = Buffer.from(module.HEAPU8.slice(imageDataPtr, imageDataPtr + imageSize));

	const metadataPtr = get('bestframe_result_metadata');
	const metadata = metadataPtr ? parseMetadata(module.UTF8ToString(metadataPtr)) : null;

	const result = {
		timestamp: get('bestframe_result_timestamp'),
		score: get('bestframe_result_score'),
		width: get('bestframe_result_image_width'),
		height: get('bestframe_result_image_height'),
		data,
		duration: get('bestframe_result_duration'),
		sourceWidth: get('bestframe_result_source_width'),
		sourceHeight: get('bestframe_result_source_height'),
		metadata,
	};

	module.cwrap('bestframe_free_result', null, ['number'])(resultPtr);
	return result;
}
