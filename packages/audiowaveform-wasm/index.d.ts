/**
 * @kirigami/audiowaveform-wasm
 *
 * Waveform peak extraction and ID3 tag/cover-art reading, compiled from
 * BBC's audiowaveform (https://github.com/bbc/audiowaveform) to
 * WebAssembly for Node.js.
 *
 * @see https://github.com/php-kirigami/audiowaveform-wasm-compiler
 */

/** Peaks data matching audiowaveform's own documented JSON peaks format. */
export interface WaveformPeaks {
  version: 2;
  channels: number;
  sample_rate: number;
  samples_per_pixel: number;
  bits: number;
  length: number;
  /** Flat array of alternating min/max sample pairs. */
  data: number[];
}

/** ID3 tag metadata. Each field is a string, or `null` if not present. */
export interface Id3Tags {
  title: string | null;
  artist: string | null;
  album: string | null;
  albumArtist: string | null;
  year: string | null;
  track: string | null;
  genre: string | null;
}

/** Embedded ID3v2 cover art (the `APIC` frame). */
export interface Id3CoverArt {
  mimeType: string | null;
  /**
   * The ID3v2-defined picture type (3 = front cover, 4 = back cover,
   * 0 = other, etc. — see the ID3v2 spec's `APIC` frame description for
   * the full list).
   */
  pictureType: number;
  /** Raw image bytes, as a plain array of byte values (0-255). */
  data: number[];
}

/**
 * Extracts waveform peak data from an in-memory audio buffer.
 *
 * The format is auto-detected from the buffer's own container magic
 * bytes — MP3, WAV (16/24-bit PCM, 32-bit float), and AIFF are supported
 * today. FLAC, Ogg Vorbis, Opus, and M4A/AAC are not yet supported and
 * resolve to `null` rather than throwing.
 *
 * @example
 * ```ts
 * import { extractAudioPeaks } from '@kirigami/audiowaveform-wasm';
 * import fs from 'node:fs';
 *
 * const peaks = await extractAudioPeaks(fs.readFileSync('song.mp3'), 512);
 * ```
 *
 * @param bytes - The raw audio file bytes.
 * @param samplesPerPixel - Waveform resolution (samples per data point).
 * Default: `512`.
 * @returns A promise that resolves to the peaks data, or `null` if the
 * format isn't supported or the file failed to decode.
 */
export declare function extractAudioPeaks(
  bytes: Uint8Array,
  samplesPerPixel?: number
): Promise<WaveformPeaks | null>;

/**
 * Reads ID3 tag metadata (title/artist/album/...) from an in-memory MP3
 * buffer.
 *
 * Handles both ID3v1 and ID3v2 (2.3 and 2.4) tags automatically,
 * including Unicode text in whatever encoding the tag itself declares.
 *
 * @example
 * ```ts
 * import { getId3Tags } from '@kirigami/audiowaveform-wasm';
 *
 * const tags = await getId3Tags(fs.readFileSync('song.mp3'));
 * console.log(tags?.title, tags?.artist);
 * ```
 *
 * @param mp3Bytes - The raw MP3 file bytes.
 * @returns A promise that resolves to the tag data, or `null` if there's
 * no tag at all.
 */
export declare function getId3Tags(mp3Bytes: Uint8Array): Promise<Id3Tags | null>;

/**
 * Reads the embedded cover art (ID3v2 `APIC` frame) from an in-memory MP3
 * buffer, if present.
 *
 * @example
 * ```ts
 * import { getId3CoverArt } from '@kirigami/audiowaveform-wasm';
 *
 * const cover = await getId3CoverArt(fs.readFileSync('song.mp3'));
 * if (cover) {
 *   fs.writeFileSync('cover.jpg', Buffer.from(cover.data));
 * }
 * ```
 *
 * @param mp3Bytes - The raw MP3 file bytes.
 * @returns A promise that resolves to the cover art data, or `null` if
 * there's no embedded cover art.
 */
export declare function getId3CoverArt(mp3Bytes: Uint8Array): Promise<Id3CoverArt | null>;
