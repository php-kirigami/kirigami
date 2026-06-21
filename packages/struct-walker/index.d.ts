/**
 * MIME types that are encoded as percent-encoded text URIs rather than base64.
 *
 * Includes: `image/svg+xml`, `text/css`, `text/html`, `text/plain`,
 * `text/javascript`, `application/json`, `application/xml`, `text/xml`.
 */
export declare const TEXT_URI_MIME_TYPES: Set<string>;

/**
 * File extensions that trigger data URI conversion when `resolveAssets` is `true`.
 *
 * Covers raster images, SVG, audio (mp3, ogg, wav, flac, aac, opus, m4a, mid,
 * midi, kar), video, fonts (woff, woff2, ttf, otf, eot), documents, code,
 * 3-D models (glb, gltf), and archives.
 */
export declare const ASSET_EXTS: Set<string>;

/**
 * Converts a file on disk to a data URI string.
 *
 * MIME type detection strategy:
 * 1. `file-type` (magic bytes) — works even on renamed or extensionless files.
 * 2. `mime-types` (extension lookup) as fallback.
 * 3. `application/octet-stream` as last resort.
 *
 * SVG files are always forced to `image/svg+xml` regardless of magic-byte
 * detection, then encoded as a minimal percent-encoded text URI.
 * All other text-based MIME types listed in {@link TEXT_URI_MIME_TYPES} are
 * also percent-encoded. Every other format is encoded as base64.
 *
 * @param absolutePath  Absolute path to the file on disk.
 * @returns             A `data:<mime>;charset=utf-8,<encoded>` or
 *                      `data:<mime>;base64,<encoded>` string.
 */
export declare function fileToDataUri(absolutePath: string): Promise<string>;

/**
 * Recursively loads a YAML or JSON file, resolving string values that
 * reference other files relative to the current file's directory.
 *
 * **Resolution rules for each string value encountered:**
 * - No extension → kept as-is.
 * - Extension is `.yml`, `.yaml`, or `.json` and the file exists
 *   → replaced by the fully resolved, deserialized content of that file
 *   (recursive; each file is resolved relative to its own directory).
 * - Extension is in {@link ASSET_EXTS}, `resolveAssets` is `true`,
 *   and the file exists → replaced by a data URI via {@link fileToDataUri}.
 * - File does not exist, or extension is not recognised → kept as-is.
 *
 * Circular YAML/JSON references (A → B → A) throw an `Error` with the
 * offending path in the message. Sibling references (two keys pointing to
 * the same file) are allowed.
 *
 * @param filePath       Path to the root YAML or JSON file (absolute or
 *                       relative to `process.cwd()`).
 * @param resolveAssets  When `true`, asset strings are converted to data URIs.
 *                       Defaults to `false`.
 * @param _visited       Internal cycle-detection set — **do not pass this**.
 * @returns              The fully resolved JavaScript value (plain object,
 *                       array, string, number, boolean, or `null`).
 *
 * @example
 * // Resolve YAML references only
 * const config = await walkFile('./config/main.yaml');
 *
 * @example
 * // Resolve YAML references AND embed assets as data URIs
 * const theme = await walkFile('./theme/index.yaml', true);
 */
export declare function walkFile(
  filePath: string,
  resolveAssets?: boolean,
  _visited?: Set<string>
): Promise<unknown>;