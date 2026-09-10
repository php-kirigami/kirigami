import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { replaceRoot } from '../utils.js';

/**
 * Converts an sRGB color (0-255) to Lab (D65), a perceptually uniform space:
 * a Euclidean distance in Lab corresponds (roughly) to a color difference as
 * perceived by the eye, unlike RGB where two colors at the same numeric
 * "distance" can look very different or identical depending on the hue.
 */
function rgbToLab(r, g, b) {
	const toLinear = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b);

	// Linear RGB → XYZ (D65), then normalize by the white point.
	const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
	const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
	const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;

	const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
	const fx = f(x), fy = f(y), fz = f(z);

	return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]; // [L, a, b]
}

/**
 * Median-cut quantization: recursively splits the bounding box of the colors
 * along the channel with the largest spread, prioritizing the most "populated"
 * boxes (spread x population), until the requested number of buckets is
 * reached. Each bucket is then reduced to its average color, weighted by the
 * occurrence count.
 *
 * This is the same family of technique as Imagick::quantizeImage() or
 * imagetruecolortopalette() on the PHP side.
 */
function medianCutQuantize(pixels, targetBuckets) {
	let boxes = [pixels];

	while (boxes.length < targetBuckets) {
		let boxIndex = -1;
		let bestScore = -1;
		let bestChannel = 'r';

		for (let i = 0; i < boxes.length; i++) {
			const box = boxes[i];
			if (box.length < 2) continue;

			for (const ch of ['r', 'g', 'b']) {
				let min = Infinity, max = -Infinity;
				for (const p of box) {
					if (p[ch] < min) min = p[ch];
					if (p[ch] > max) max = p[ch];
				}
				const population = box.reduce((s, p) => s + p.count, 0);
				const score = (max - min) * population;
				if (score > bestScore) {
					bestScore = score;
					boxIndex = i;
					bestChannel = ch;
				}
			}
		}

		if (boxIndex === -1) break; // no box is divisible anymore

		const box = boxes[boxIndex];
		box.sort((a, b) => a[bestChannel] - b[bestChannel]);

		// Split at the occurrence-weighted median, not just the middle of the
		// array, to balance the population of the two halves.
		const total = box.reduce((s, p) => s + p.count, 0);
		let acc = 0, splitAt = 0;
		for (let i = 0; i < box.length; i++) {
			acc += box[i].count;
			if (acc >= total / 2) { splitAt = i + 1; break; }
		}
		if (splitAt === 0 || splitAt === box.length) splitAt = Math.floor(box.length / 2) || 1;

		boxes.splice(boxIndex, 1, box.slice(0, splitAt), box.slice(splitAt));
	}

	return boxes.map((box) => {
		let sr = 0, sg = 0, sb = 0, count = 0;
		for (const p of box) {
			sr += p.r * p.count;
			sg += p.g * p.count;
			sb += p.b * p.count;
			count += p.count;
		}
		return { r: Math.round(sr / count), g: Math.round(sg / count), b: Math.round(sb / count), count };
	});
}

/**
 * Extracts the most representative colors of an image.
 *
 * @param {string|Buffer} input                     File path or Buffer, anything sharp() accepts.
 * @param {object}  [options]
 * @param {number}  [options.numColors=5]                    Number of colors to return.
 * @param {number}  [options.mergeTolerance=8]               Lab distance below which two colors are merged (~6-10 = "nearly identical").
 * @param {boolean} [options.excludeNearWhiteAndBlack=true]  Excludes near-white/near-black colors.
 * @param {number}  [options.lightnessThreshold=8]           Lab lightness threshold (0-100) below/above which a color is considered near-white/near-black.
 * @param {number}  [options.maxDim=150]                     Max dimension of the analyzed sample (perf).
 * @returns {Promise<string[]>} Colors as "#rrggbb", sorted by decreasing frequency.
 */
async function getRepresentativeColors(input, options = {}) {
	const {
		numColors = 5,
		mergeTolerance = 8.0,
		excludeNearWhiteAndBlack = true,
		lightnessThreshold = 8.0,
		maxDim = 150,
	} = options;

	// Analyzing the full resolution adds nothing for this kind of extraction
	// and costs a lot of compute time. flatten() composites transparency onto
	// a white background (otherwise the transparent areas of PNG/WEBP would be
	// counted as black).
	const { data, info } = await sharp(input)
		.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
		.flatten({ background: '#ffffff' })
		.raw()
		.toBuffer({ resolveWithObject: true });

	const { width, height, channels } = info;

	// Group identical pixels up front: this limits the number of entries the
	// median-cut has to process and speeds up the sort noticeably.
	const colorMap = new Map();
	for (let i = 0; i < width * height; i++) {
		const o = i * channels;
		const key = (data[o] << 16) | (data[o + 1] << 8) | data[o + 2];
		colorMap.set(key, (colorMap.get(key) || 0) + 1);
	}

	const pixels = [];
	for (const [key, count] of colorMap) {
		pixels.push({ r: (key >> 16) & 255, g: (key >> 8) & 255, b: key & 255, count });
	}

	// We heavily oversample the requested number of colors: this leaves room
	// for the perceptual merge and the white/black exclusion below without
	// running short of colors.
	const buckets = Math.min(Math.max(numColors * 6, 24), pixels.length);
	let entries = medianCutQuantize(pixels, buckets).map((c) => ({ ...c, lab: rgbToLab(c.r, c.g, c.b) }));

	if (excludeNearWhiteAndBlack) {
		entries = entries.filter((e) => e.lab[0] <= 100 - lightnessThreshold && e.lab[0] >= lightnessThreshold);
	}

	entries.sort((a, b) => b.count - a.count);

	// Merge perceptually close colors (CIE76 distance in Lab) by combining
	// their occurrences, always starting from the most frequent one. The
	// median-cut often outputs several hues that look nearly identical to the
	// eye, which we don't want as separate entries.
	const merged = [];
	for (const entry of entries) {
		const cluster = merged.find((c) => {
			const dl = c.lab[0] - entry.lab[0];
			const da = c.lab[1] - entry.lab[1];
			const db = c.lab[2] - entry.lab[2];
			return Math.sqrt(dl * dl + da * da + db * db) <= mergeTolerance;
		});
		if (cluster) cluster.count += entry.count;
		else merged.push({ ...entry });
	}

	merged.sort((a, b) => b.count - a.count);

	return merged
		.slice(0, numColors)
		.map((c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join(''));
}

export { getRepresentativeColors };

// Usage:
// import { getRepresentativeColors } from './image.js';
// const colors = await getRepresentativeColors('./photo.jpg', { numColors: 5 });
// console.log(colors); // => ['#3a6b8f', '#e0c14c', '#7a2d2d', '#1e1e1e', '#c9c9c9']


// ---------------------------------------------------------------------------
// Per-format encoding options for img-asset(). The avif quality scale is not
// the same as webp's.
// ---------------------------------------------------------------------------
const IMG_FORMAT_OPTIONS = {
	webp: { quality: 82 },
	avif: { quality: 50 },
};


// ---------------------------------------------------------------------------
// img-asset(): collect, then process, the images referenced from Sass, in two
// phases. A Sass function must return synchronously (the output path), while
// the sharp resize / re-encode is async: `ref()` computes the output name
// (with a dimension suffix) and records the source during compilation;
// `process()` does the sharp work once compilation is done and returns the
// files it wrote.
//
//   const images = imgasset({ format, sourceRoot, destRoot, destRootSource, outDir });
//   // during compilation:  const url = images.ref('hero.jpg', { width: 1200 });
//   // after compilation:    const written = await images.process();
//
// - `format`         : 'webp' | 'avif' — output format.
// - `sourceRoot`     : source images directory (paths passed to ref() are relative to it).
// - `destRoot`       : output directory for processed images.
// - `destRootSource` : optional second destination (on export, the source tree,
//                      so it stays current too); null to write only once.
// - `outDir`         : directory of the compiled CSS file — the path returned by
//                      ref() is relative to it (usable as-is in the CSS).
// ---------------------------------------------------------------------------
function imgasset({ format = 'webp', sourceRoot, destRoot, destRootSource = null, outDir }) {
	// destAbsPath -> source info for post-compile processing.
	const assets = new Map();

	function ref(srcRelPath, { width = null, height = null, cover = false } = {}) {
		let suffix = '';
		if (width && height) suffix = cover ? `-${width}x${height}-cover` : `-${width}x${height}`;
		else if (width) suffix = `-${width}w`;
		else if (height) suffix = `-${height}h`;

		const { dir: subDir, name } = path.parse(srcRelPath);
		const outRelPath = (subDir ? `${subDir}/` : '') + `${name}${suffix}.${format}`;
		const destAbsPath = path.join(destRoot, outRelPath);
		const destAbsPathSource = destRootSource ? path.join(destRootSource, outRelPath) : null;

		if (!assets.has(destAbsPath)) {
			assets.set(destAbsPath, {
				src: path.resolve(sourceRoot, srcRelPath),
				width,
				height,
				cover,
				extraDest: destAbsPathSource,
			});
		}

		return path.relative(outDir, destAbsPath).split(path.sep).join('/');
	}

	// Process the collected image map: resize and convert each source to the
	// configured format. Each entry can have up to two destinations (the
	// exported tree and, on export, the source tree): the work happens only
	// once, and the result is written to whichever destinations are not
	// already up to date.
	async function process() {
		const written = [];
		await Promise.all([...assets.entries()].map(async ([dest, { src, width, height, cover, extraDest }]) => {
			if (!fs.existsSync(src)) {
				throw new Error(`img-asset: source file not found: ${src}`);
			}

			const srcMtime = fs.statSync(src).mtimeMs;
			const dests = [dest, extraDest].filter(Boolean);
			const staleDests = dests.filter((d) => !fs.existsSync(d) || fs.statSync(d).mtimeMs < srcMtime);

			if (!staleDests.length) return; // everything is already up to date

			let pipeline = sharp(src);
			if (width && height) {
				pipeline = pipeline.resize(width, height, { fit: cover ? 'cover' : 'inside', withoutEnlargement: !cover });
			} else if (width) {
				pipeline = pipeline.resize({ width });
			} else if (height) {
				pipeline = pipeline.resize({ height });
			} // neither width nor height: no resize, just re-encode to the target format

			const buffer = await pipeline[format](IMG_FORMAT_OPTIONS[format]).toBuffer();

			await Promise.all(staleDests.map(async (d) => {
				const destDir = path.dirname(d);
				if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
				await fs.promises.writeFile(d, buffer);
				written.push(replaceRoot(d));
			}));
		}));
		return written;
	}

	return { ref, process };
}

export { imgasset };