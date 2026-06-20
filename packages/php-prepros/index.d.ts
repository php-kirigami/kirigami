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
 * import { render, sitemap } from '@kirigami/php-prepros';
 *
 * // Compile a single page
 * const result = await render('src/index.php');
 *
 * // Compile every page in the source directory
 * const result = await render('src/');
 *
 * // Generate sitemap.xml
 * const sitemap = await sitemap();
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