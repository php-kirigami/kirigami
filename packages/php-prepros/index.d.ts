/**
 * @kirigami/php-prepros
 *
 * PHP preprocessor for the Kirigami static site generator.
 * Runs PHP files through a WebAssembly PHP runtime to produce
 * ready-to-deploy HTML pages.
 *
 * Requires a `kirigami.yaml` configuration file at the project root.
 *
 * @example
 * ```js
 * import { render, sitemap, runenv, mountPath } from '@kirigami/php-prepros';
 *
 * // Compile a single page
 * const result = await render('src/index.php');
 *
 * // Compile every page in the source directory
 * const result = await render('src/');
 *
 * // Generate sitemap.xml
 * const sitemap = await sitemap();
 *
 * // Run an arbitrary PHP script in the same sandboxed environment
 * const result = await runenv('scripts/purge-cache.php');
 *
 * // Mount a local file/directory into the sandbox before rendering
 * await mountPath('assets/data/team.yaml');
 *
 * // Resize images / extract palettes through the IMG class (GD + Imagick)
 * const { files, colors } = await processImages([
 *   { op: 'resize', src: 'hero.jpg', width: 1200, dests: ['/project/src/images/hero-1200w.webp'] },
 *   { op: 'palette', src: 'hero.jpg', count: 5 },
 * ]);
 * ```
 */


// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

/**
 * Returned by every prepros operation.
 */
export interface PreprosResult {
  /** `true` when the operation completed without errors. */
  success: boolean;

  /**
   * Paths of every file written to disk by this operation (relative to the
   * project root).  Includes the compiled HTML page(s) and any side-effect
   * files such as `.cache.db` or resized images produced by `IMG::save()`.
   */
  files: string[];

  /** Human-readable error message.  Only present when `success` is `false`. */
  error?: string;

  /**
   * Raw PHP stdout / stderr, useful for debugging.
   * Only present when response parsing fails.
   */
  response?: string;
}


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile one PHP source file **or** an entire directory tree.
 *
 * - **Single file** — `_index.php` → `index.html` (leading underscore is
 *   stripped from the output filename).
 * - **Directory** — every `_*.php` file found recursively is compiled.
 *   Files inside directories whose name starts with `_` are skipped.
 *
 * The PHPDOC block at the top of each source file drives the page:
 *
 * ```php
 * <?php
 * /**
 *  * @name     index
 *  * @title    My Page Title
 *  * @abstract Short description used as <meta name="description">
 *  * @articles _articles.yaml   ← auto-parsed and injected as $articles
 *  * @data     _data.json        ← auto-parsed and injected as $data
 *  *\/
 * ?>
 * ```
 *
 * Any `@tag filename` annotation whose extension is `.yaml`, `.yml`,
 * `.json`, or `.md` is automatically loaded and made available as a PHP
 * variable with the same name as the tag.  Remote URLs are supported when
 * `network: true` is set in `kirigami.yaml`.
 *
 * @param file Path to a `.php` source file or a directory, relative to the
 *             project root.  Defaults to `.` (the entire source tree).
 *
 * @returns A {@link PreprosResult} describing what was written.
 *
 * @throws When the `kirigami.yaml` config is missing or malformed.
 * @throws When `kirigami.root` does not exist on disk.
 */
export function render(file?: string): Promise<PreprosResult>;


/**
 * Generate a `sitemap.xml` at the source root.
 *
 * Scans every `_index.php` found in the source tree and produces a
 * standard Sitemaps 0.9 XML document.  Priority is calculated from depth
 * (root = 1.0, each extra level −0.1).  `changefreq` is set to `weekly`.
 *
 * The base URL is taken from `kirigami.baseurl` in `kirigami.yaml`.
 *
 * @returns A {@link PreprosResult} with `files` containing the path to the
 *          generated `sitemap.xml`.
 */
export function sitemap(dir?: string): Promise<PreprosResult>;


/**
 * Run an arbitrary PHP script — not a page template — inside the same
 * sandboxed WASM environment used by {@link render}, with the full
 * `php-prepros` class library autoloaded and `kirigami.yaml`'s `kirigami`
 * block available as `PREPROS::$config->data`.
 *
 * Useful for one-off maintenance scripts, data migrations, or CLI-style
 * tooling that needs `CACHE`, `SCRAPER`, `IMG`, etc. without going through
 * the page-rendering pipeline.
 *
 * ```js
 * // Run a standalone PHP script
 * const result = await runenv('scripts/purge-cache.php');
 *
 * // Also mount extra local paths/files into the sandbox before running
 * const result = await runenv('scripts/build-og-images.php', ['assets/photos']);
 *
 * // Extra arguments are appended and available as $argv[2], $argv[3], … in the script
 * const result = await runenv('scripts/import.php', [], '--force');
 * ```
 *
 * @param script Path to a PHP file inside the project, executed with
 *               `require_once`.
 * @param paths  Extra local paths (files or directories) to mount into the
 *               sandbox before the script runs.
 * @param args   Extra string arguments appended to the script's `$argv`.
 *
 * @returns A {@link PreprosResult} describing what was written. Call
 *          `PREPROS::exportFile()` inside the script for any file you want
 *          listed in `result.files`.
 *
 * @throws When no `script` path is given.
 * @throws When `script` resolves outside the project root, or doesn't exist.
 */
export function runenv(script: string, paths?: string[], ...args: string[]): Promise<PreprosResult>;


/**
 * The JavaScript-side counterpart to `PREPROS::mount()`. Mounts a local
 * file or directory — recursively, preserving structure — into the WASM
 * sandbox's virtual filesystem, ahead of (or between) calls to
 * {@link render}, {@link sitemap}, or {@link runenv}.
 *
 * Mounting a directory only copies files whose extension is one of the
 * defaults (`.php`, `.json`, `.yaml`, `.yml`, `.md`, `.db`, `.txt`) or
 * listed in `prepros.mountext`, same as automatic root mounting. Mounting a
 * single file directly copies it regardless of extension.
 *
 * ```js
 * // Mount a single file at its natural virtual path (/project/<relative path>)
 * await mountPath('assets/data/team.yaml');
 *
 * // Mount a whole directory, at a custom virtual path
 * await mountPath('vendor/fonts', '/project/fonts');
 * ```
 *
 * @param localPath  Path to a local file or directory. Relative paths are
 *                    resolved against the project root.
 * @param virtualDir  Destination path inside the WASM filesystem. Defaults
 *                     to `/project/<localPath relative to the project root>`
 *                     when omitted.
 * @param php  WASM PHP instance to mount into. Defaults to the shared
 *             singleton instance (creating it if needed).
 */
export function mountPath(localPath: string, virtualDir?: string, php?: unknown): Promise<void>;


/**
 * A single unit of work for {@link processImages}.
 *
 * - **`resize`** — decode `src` (resolved against `image.source`), optionally
 *   resize it, and encode a copy to every path in `dests` (each an absolute
 *   virtual path, e.g. `/project/src/images/hero-800w.webp`, already carrying
 *   the target extension). Omitting both `width` and `height` re-encodes at the
 *   source size. Staleness must be decided by the caller — every job passed in
 *   is executed.
 * - **`palette`** — extract `count` representative colours from `src` via
 *   `IMG::palette()` (cached in `.cache.db`); returned in `colors`, not written.
 */
export type ImageJob =
  | {
      op: "resize";
      /** Source path, relative to `image.source` in `kirigami.yaml`. */
      src: string;
      /** Target width in px. `0`/omitted = derive from height (or keep). */
      width?: number;
      /** Target height in px. `0`/omitted = derive from width (or keep). */
      height?: number;
      /** Crop to fill instead of fitting inside `width`×`height`. */
      cover?: boolean;
      /** Encoder quality (0-100) for lossy formats. Defaults to 82. */
      quality?: number;
      /** Absolute virtual destination paths to write the encoded image to. */
      dests: string[];
    }
  | {
      op: "palette";
      /** Source path, relative to `image.source` in `kirigami.yaml`. */
      src: string;
      /** Number of colours to extract. Defaults to 5. */
      count?: number;
    };


/**
 * Result of {@link processImages}: a {@link PreprosResult} whose `files` lists
 * every image written back to the host, plus the palettes that were requested.
 */
export interface ImageBatchResult extends PreprosResult {
  /** Extracted palettes, keyed `"<src>:<count>"`, each a list of `#rrggbb`. */
  colors: Record<string, string[]>;
}


/**
 * Run a batch of image jobs through the same `IMG` class (GD, with the Imagick
 * fallback) used by `IMG::asset()` and the `<img asset>` tag.
 *
 * This is the engine behind `@kirigami/kirigami`'s Sass `img-asset()` and
 * `colors()` functions: one implementation, one `image:` config, one set of
 * output filenames across Sass, PHP and HTML — no native image dependency.
 *
 * @param jobs List of {@link ImageJob}s. An empty list is a no-op (the WASM
 *             runtime is not started).
 *
 * @returns An {@link ImageBatchResult}. Resized files are also copied to the
 *          host at the project-relative equivalent of each `dests` entry.
 */
export function processImages(jobs?: ImageJob[]): Promise<ImageBatchResult>;