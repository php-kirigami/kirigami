/**
 * @kirigami/bestframe
 *
 * Automatic thumbnail/still-frame selection for video, compiled from
 * `libbestframe`'s own hand-rolled C pipeline (FFmpeg decode + a tiny
 * embedded NIMA aesthetic model) to WebAssembly for Node.js.
 *
 * @see https://github.com/php-kirigami/libbestframe
 */

/** Output image format for the winning frame. PNG is lossless; `quality` has no effect on it. */
export type BestFrameFormat = 'jpeg' | 'png';

export interface BestFrameOptions {
	/** How many timestamps to sample across the video. Default: `24`. */
	samples?: number;
	/** Target output width in pixels — height is computed to preserve the source's aspect ratio. Default: `640`. */
	width?: number;
	/** Output image format. Default: `'jpeg'`. */
	format?: BestFrameFormat;
	/** JPEG quality, 0-100 (libjpeg-style, higher = better). Ignored for `format: 'png'`. Default: `85`. */
	quality?: number;
}

export interface BestFrameResult {
	/** The winning frame's real timestamp, in seconds. */
	timestamp: number;
	/**
	 * The winning frame's composite aesthetic score (0..1-ish — an
	 * NIMA-model-derived quantity, not a normalized percentage). Higher is
	 * better; there is no fixed "good" threshold.
	 */
	score: number;
	/** The encoded output image's width, in pixels. */
	width: number;
	/** The encoded output image's height, in pixels. */
	height: number;
	/** The encoded image bytes (JPEG or PNG, per `options.format`). */
	data: Buffer;
	/** The source video's total duration, in seconds. */
	duration: number;
	/** The source video's own (pre-scaling) width, in pixels. */
	sourceWidth: number;
	/** The source video's own (pre-scaling) height, in pixels. */
	sourceHeight: number;
	/**
	 * The source container's own metadata tags (title/artist/encoder/...),
	 * whatever the file actually carries — or `null` if it has none. Tag
	 * names are exactly as the container stores them (case varies by
	 * encoder/muxer, e.g. `title` vs. `TITLE`).
	 */
	metadata: Record<string, string> | null;
}

/**
 * Picks the best still frame from a video to use as a thumbnail.
 *
 * Samples frames across the video, filters out the obviously bad ones
 * (black frames, low-contrast/uniform frames, blurry frames,
 * near-duplicates of an already-seen frame), scores the survivors with a
 * small embedded aesthetic model, and returns the highest-scoring one —
 * decoded and encoded fresh at the requested output size, not just a
 * downscaled analysis frame.
 *
 * Decoding is multithreaded, matching the real number of CPU cores on
 * the machine this runs on (up to a fixed build-time ceiling). If every
 * sampled frame fails every technical filter (rare — e.g. a clip that
 * stays dark or blurry throughout), the least-bad rejected frame is
 * returned instead of nothing, so this only ever resolves to `null` on
 * an outright decode failure (unsupported codec/container, corrupt
 * input) — never merely "the video wasn't great."
 *
 * Supports the four mainstream web video codecs — H.264, VP9, HEVC, and
 * AV1 — in MP4, Matroska (`.mkv`), and WebM containers. No file I/O
 * happens internally: pass a path and it's read once into memory, or
 * pass an already-loaded buffer directly.
 *
 * @example
 * ```ts
 * import { bestFrame } from '@kirigami/bestframe';
 *
 * const result = await bestFrame('movie.mp4');
 * console.log(result.timestamp, result.score, result.width, result.height);
 * fs.writeFileSync('thumbnail.jpg', result.data);
 * ```
 *
 * @example
 * ```ts
 * // From an already-loaded Buffer, PNG output, more samples
 * const result = await bestFrame(fs.readFileSync('clip.webm'), {
 *   samples: 48,
 *   width: 1280,
 *   format: 'png',
 * });
 * ```
 *
 * @param input - A file path, or the video already loaded into memory.
 * @param options - See {@link BestFrameOptions}.
 * @returns A promise that resolves to the winning frame and its
 * metadata, or `null` if the input couldn't be decoded at all.
 */
export declare function bestFrame(
	input: string | Uint8Array,
	options?: BestFrameOptions
): Promise<BestFrameResult | null>;
