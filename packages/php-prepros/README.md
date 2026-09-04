# @kirigami/php-prepros

> PHP preprocessor for the **Kirigami** static site generator.

Build full static websites in PHP — with zero server, zero runtime dependency, zero compromise on expressiveness. Write your pages as regular PHP files, annotate them with a PHPDOC header, and let `php-prepros` compile everything to clean, deployable HTML.

It is the perfect solution for **GitHub Pages**. Since it runs entirely in Node.js, it is fully compatible with **GitHub Actions**, allowing you to automate your deployment pipeline effortlessly.

Part of the **Kirigami** project ecosystem. Other packages are coming soon.

[![npm version](https://img.shields.io/npm/v/@kirigami/php-prepros)](https://www.npmjs.com/package/@kirigami/php-wasm)
[![License: MIT](https://img.shields.io/badge/MIT-blue)](./LICENSE)
[![Node.js >=20.10.0](https://img.shields.io/badge/node-%3E%3D20.10.0-brightgreen)](https://nodejs.org)

---

## Table of contents

- [@kirigami/php-prepros](#kirigamiphp-prepros)
	- [Table of contents](#table-of-contents)
	- [What's new in 1.1.0](#whats-new-in-110)
	- [How it works](#how-it-works)
	- [Installation](#installation)
	- [Configuration — `kirigami.yaml`](#configuration--kirigamiyaml)
		- [`kirigami` block](#kirigami-block)
		- [`prepros` block](#prepros-block)
	- [Writing pages](#writing-pages)
		- [PHPDOC header](#phpdoc-header)
		- [Auto-loading data files](#auto-loading-data-files)
		- [`@content` and `@indent`](#content-and-indent)
	- [JavaScript API](#javascript-api)
		- [`render(file?)`](#renderfile)
		- [`sitemap()`](#sitemap)
		- [`runenv(script, paths?, ...args)`](#runenvscript-paths-args)
		- [`mountPath(localPath, virtualDir?, php?)`](#mountpathlocalpath-virtualdir-php)
	- [PHP classes reference](#php-classes-reference)
		- [PREPROS](#prepros)
			- [`PREPROS::render(string $file)`](#preprosrenderstring-file)
			- [`PREPROS::sitemap()`](#preprossitemap)
			- [`PREPROS::mount(string|array $patterns)`](#preprosmountstringarray-patterns)
			- [`PREPROS::exportFile(string $file)`](#preprosexportfilestring-file)
		- [MD](#md)
			- [Plugin API](#plugin-api)
		- [HTML](#html)
		- [YAML](#yaml)
		- [CACHE](#cache)
		- [IMG](#img)
		- [FS](#fs)
		- [STR](#str)
		- [ARR](#arr)
		- [CURL](#curl)
		- [SCRAPER](#scraper)
		- [OBF](#obf)
		- [STD](#std)
	- [Plugin system](#plugin-system)
		- [PREPROS tags](#prepros-tags)
		- [PREPROS hooks](#prepros-hooks)
		- [MD plugins](#md-plugins)
		- [Built-in plugins](#built-in-plugins)
			- [`{% callout type ["Title"] content %}`](#-callout-type-title-content-)
			- [`{% youtube id [width height] %}`](#-youtube-id-width-height-)
			- [`{% codepen id [user height] %}`](#-codepen-id-user-height-)
			- [`{% checklist ["Title"] items %}`](#-checklist-title-items-)
	- [Extending the `<markdown>` tag](#extending-the-markdown-tag)
	- [License](#license)

---

## What's new in 1.1.0

- **`PREPROS::mount()`** — mount extra files into the WASM filesystem on demand, from a glob pattern, at any point during rendering.
- **`mountPath()`** JavaScript export — the JS-side counterpart to `PREPROS::mount()`: mount a local file or directory into the WASM sandbox from Node.js, before calling `render()`/`runenv()`.
- **`runenv()`** JavaScript export — run an arbitrary PHP script (not a page template) inside the same sandboxed environment, with full access to every `php-prepros` class.
- **`SCRAPER`** class — fetch a URL and extract `title` / `description` / `image` / `label` from its Open Graph, `<meta>`, and JSON-LD data, with automatic caching.
- **`CURL`** class — low-level cURL helper used internally by `SCRAPER`, also usable directly (`urlExists()`, `getInfo()`, `getContents()`), with a shared, persisted cookie jar.
- **`ARR`** class — recursive associative array/object key lookup.
- **`YAML::loadFile()`** — like `YAML::parseFile()`, but recursively resolves any string value that points to another existing `.yaml`/`.yml`/`.json` file into its parsed content.
- New `STR` helpers: `STR::is_url()`, `STR::html_entities_decode()`, `STR::shorthash()`, `STR::slug()`.
- New built-in MD plugins: `{% youtube %}`, `{% codepen %}`, and `{% checklist %}`, alongside the existing `{% callout %}`.
- `@content` and `@indent` PHPDOC annotations, letting a page skip its own PHP body in favour of pre-rendered content, and control its indentation when nested inside a layout.

---

## How it works

`@kirigami/php-prepros` runs your PHP source files inside a **WebAssembly PHP 8.x runtime** ([`@kirigami/php-wasm`](https://github.com/kirigami/php-wasm)), entirely in Node.js — no PHP installation required on the host machine.

The lifecycle of a page build looks like this:

```
_index.php  ──▶  PHP (wasm)  ──▶  processTags()  ──▶  HTML::format()  ──▶  index.html
                    │
                    ├── before.php  (optional layout header)
                    ├── after.php   (optional layout footer)
                    └── PHPDOC annotations resolved (yaml / json / md / url)
```

Files are mounted into the WebAssembly virtual filesystem on demand. Only `.php`, `.json`, `.yaml`, `.yml`, `.md`, `.db`, `.txt` and any extra extensions listed in `prepros.mountext` are mounted automatically, keeping memory usage low. Anything else can be mounted on demand with [`PREPROS::mount()`](#preprosmountstringarray-patterns).

---

## Installation

```bash
npm install @kirigami/php-prepros
```

> **Node.js ≥ 20** is required (ESM-only package).

---

## Configuration — `kirigami.yaml`

Every project **must** have a `kirigami.yaml` at its root. The preprocessor reads it at startup and throws if it is absent or invalid.

```yaml
kirigami:
  # ── Required ──────────────────────────────────────────────────────────
  root:        src                  # Source directory containing your _*.php pages.

  # ── Used internally ──────────────────────────────────────────────────
  baseurl:     https://example.com  # Used as the base URL when generating sitemap.xml.

  # ── Arbitrary project data ──────────────────────────────────────────
  # Everything else under `kirigami:` is free-form. The whole block is
  # extracted as PHP variables and made available in every page, in
  # before.php/after.php, and anywhere PREPROS::$config->data is read.
  project:     My Website
  author:      Jane Doe
  person:      John Smith
  jobtitle:    Founder
  email:       hello@example.com
  facebook:    https://www.facebook.com/example
  area:        Somewhere, Country
  gtag:        G-XXXXXXXXXX
  banner:      assets/banner.txt
  description: A short description of the site, useful for <meta name="description">.
  knowsabout:
    - Topic one
    - Topic two
  keywords:
    - keyword one
    - keyword two

prepros:
  before:  _layout/header.php   # Included before every page body.
  after:   _layout/footer.php   # Included after every page body.
  format:  true                 # Pretty-print the HTML output (default: false).
  network: false                # Allow HTTP fetches in PHPDOC @tag annotations.
  mountext:                     # Extra file extensions to auto-mount into the wasm fs,
    - .svg                      # in addition to the defaults (.php .json .yaml .yml .md .db .txt).
    - .webp
  includes:                     # PHP files auto-included once, before any page renders.
    - _lib/helpers.php
```

### `kirigami` block

| Key | Required | Description |
|-----|----------|--------------|
| `root` | ✅ | Path (relative to the project root) to the directory containing your `_*.php` source pages. Build fails immediately if missing or if the path doesn't exist. |
| `baseurl` | for `sitemap()` | Root URL used to build absolute `<loc>` entries when generating `sitemap.xml`. |
| *anything else* | — | Free-form key/value pairs (strings, numbers, booleans, lists, nested maps — anything valid YAML). Every key is extracted as a PHP variable (`$project`, `$author`, `$gtag`, …) and available in page templates, `before.php`, `after.php`, and PHP files listed under `prepros.includes`. Use this to hold your site name, contact info, social links, analytics IDs, SEO keywords, banners, or any project-specific data you want available everywhere. |

### `prepros` block

| Key | Type | Default | Description |
|-----|------|---------|--------------|
| `before` | `string` | — | Path (relative to `kirigami.root`) to a PHP file included **before** every page's body. Typically your `<head>`/layout opening. |
| `after` | `string` | — | Path (relative to `kirigami.root`) to a PHP file included **after** every page's body. Typically your layout closing. |
| `format` | `bool` | `false` | Pretty-print the compiled HTML via [`HTML::format()`](#html) before writing it to disk. |
| `network` | `bool` | `false` | Enables outbound HTTP(S) inside the WASM PHP runtime. Required for PHPDOC `@tag https://…` annotations that fetch remote `.yaml`/`.json`/`.md` data (see [Auto-loading data files](#auto-loading-data-files)). |
| `mountext` | `string[]` | `[]` | Extra file extensions to mount automatically into the virtual filesystem alongside the built-in `.php`, `.json`, `.yaml`, `.yml`, `.md`, `.db`, `.txt`. Use this for assets your PHP code reads directly (e.g. `.svg`, `.txt`, `.webp`). Files with extensions not in this set are simply skipped during mounting — mount them on demand with [`PREPROS::mount()`](#preprosmountstringarray-patterns) instead. |
| `includes` | `string[]` | `[]` | PHP files (relative to `kirigami.root`) `include_once`'d once, right after config is loaded — before any page renders. The natural place to `PREPROS::registerTag()`, `PREPROS::registerHook()`, or `MD::registerPlugin()`. |

The entire `kirigami` block is extracted into PHP variables and made available in every page template, `before.php`, and `after.php`. `$project`, `$author`, `$gtag`, etc. are available without any further setup.

---

## Writing pages

Source pages live in the directory pointed to by `kirigami.root`. The naming convention is straightforward: any file whose name starts with `_` and ends in `.php` is treated as a page source. The leading underscore is stripped in the output filename.

```
src/
├── _layout/
├── _lib/
├── about/
├── _index.php          →  src/index.html
├── about/
│   └── _index.php      →  src/about/index.html
└── blog/
    ├── _index.php       →  src/blog/index.html
    └── _articles.yaml   (data file, not compiled)
```

Directories whose name starts with `_` (e.g. `_layout/`, `_lib/`) are skipped entirely during directory-wide builds.

### PHPDOC header

Every page starts with a PHP docblock that drives metadata and data loading:

```php
<?php
/**
 * @name     about
 * @title    About us
 * @abstract A short description of this page.
 */
?>
<section>
    <h1><?php echo $title; ?></h1>
    <p><?php echo $abstract; ?></p>
</section>
```

All annotations are injected as PHP variables (`$name`, `$title`, `$abstract`, …). You can define any custom annotation you need.

Annotations are also available as variables in `before` and `after` PHP included files, so you can write proper metas in the HTML header.

### Auto-loading data files

When an annotation value looks like a filename (with a `.yaml`, `.yml`, `.json`, or `.md` extension), it is automatically parsed and injected as a structured variable instead of a plain string.

```php
<?php
/**
 * @name     medias
 * @articles _articles.yaml
 */
?>
<?php foreach ($articles as $article): ?>
    <a href="<?php echo $article->lien; ?>">
        <?php echo $article->titre; ?>
    </a>
<?php endforeach; ?>
```

| Extension | Parsed as |
|-----------|-----------|
| `.yaml` / `.yml` | `stdClass` object (or array of objects for sequences) |
| `.json` | Result of `json_decode()` |
| `.md` | HTML string via `MD::toHtml()` |

When `network: true` is set in `kirigami.yaml`, annotation values that start with `http://` or `https://` are fetched from the network and parsed the same way:

```php
/**
 * @posts https://api.example.com/posts.json
 */
```

### `@content` and `@indent`

Two special annotation names change how a page's body is assembled:

- **`@content`** — if a `content` variable already resolves to a non-empty value (typically because it's a `.md`/`.yaml`/`.json` annotation that auto-loaded into HTML/data, see above), it is used **as-is** as the page body, and the PHP file itself is **not executed** for its output. This is handy for pages that are pure data/markdown wrapped by a shared layout.
- **`@indent`** — when set to a number, every line of the rendered body is prefixed with that many spaces before being wrapped by `before.php`/`after.php`. Useful for keeping generated HTML readable when a page is nested inside indented layout markup.

```php
<?php
/**
 * @name    changelog
 * @title   Changelog
 * @content _changelog.md
 * @indent  4
 */
```

---

## JavaScript API

```js
import { render, sitemap, runenv, mountPath } from '@kirigami/php-prepros';
```

### `render(file?)`

Compile a single PHP page or a whole directory.

```js
// Compile one page
const result = await render('about/_index.php');

// Compile everything under src/
const result = await render('.');

// Compile everything (uses kirigami.root from config)
const result = await render();
```
> Paths used by `render()` are all relative to the `kirigami.root` configuration.


**Returns** `Promise<PreprosResult>`:

```ts
interface PreprosResult {
  success: boolean;
  files:   string[];   // relative paths of every file written
  error?:  string;     // present only on failure
}
```

### `sitemap()`

Generate `sitemap.xml` at the source root.

```js
const result = await sitemap();
// result.files === ['src/sitemap.xml']
```

### `runenv(script, paths?, ...args)`

Run an arbitrary PHP script — not a page template — inside the very same sandboxed WASM environment used for `render()`, with the full `php-prepros` class library autoloaded and `kirigami.yaml`'s `kirigami` block available as `PREPROS::$config->data`. Useful for one-off maintenance scripts, data migrations, or CLI-style tooling that needs `CACHE`, `SCRAPER`, `IMG`, etc. without going through the page-rendering pipeline.

```js
// Run a standalone PHP script
const result = await runenv('scripts/purge-cache.php');

// Also mount extra local paths/files into the sandbox before running
const result = await runenv('scripts/build-og-images.php', ['assets/photos']);

// Extra arguments are appended and available as $argv[2], $argv[3], … in the script
const result = await runenv('scripts/import.php', [], '--force');
```

- `script` — path to a PHP file **inside the project**, executed with `require_once`.
- `paths` — optional array of extra local paths (files or directories) to mount into the sandbox before the script runs.
- `...args` — extra string arguments appended to the script's `$argv`.

**Returns** `Promise<PreprosResult>`, following the same shape as `render()`. Inside the script, call `PREPROS::exportFile()` for any file you want listed in `result.files`.

### `mountPath(localPath, virtualDir?, php?)`

The JavaScript-side counterpart to [`PREPROS::mount()`](#preprosmountstringarray-patterns). Mounts a local file or directory — recursively, preserving structure — into the WASM sandbox's virtual filesystem, ahead of (or between) calls to `render()`, `sitemap()`, or `runenv()`. Useful when a Node-side build step needs to make extra local files visible to PHP before rendering starts.

```js
import { mountPath, render } from '@kirigami/php-prepros';

// Mount a single file at its natural virtual path (/project/<relative path>)
await mountPath('assets/data/team.yaml');

// Mount a whole directory, at a custom virtual path
await mountPath('vendor/fonts', '/project/fonts');

await render();
```

- `localPath` — path to a local file or directory. Relative paths are resolved against the project root.
- `virtualDir` — optional destination path inside the WASM filesystem. Defaults to `/project/<localPath relative to the project root>` when omitted.
- `php` — optional WASM PHP instance to mount into. Defaults to the shared singleton instance (the same one used internally by `render()`/`sitemap()`/`runenv()`), creating it if needed.

Mounting a **directory** only copies files whose extension is one of the defaults (`.php`, `.json`, `.yaml`, `.yml`, `.md`, `.db`, `.txt`) or listed in `prepros.mountext`, same as automatic root mounting. Mounting a **single file directly** copies it regardless of extension — this is the simplest way to make an arbitrary asset (an image, a font, a CSV, …) available to PHP without adding its extension to `prepros.mountext` project-wide.

**Returns** `Promise<void>`.

---

## PHP classes reference

All classes are autoloaded — no manual `require` needed inside your page files.

---

### PREPROS

The core engine. Manages the rendering pipeline, tag processing, hooks, mounting, and file export.

```php
// Available inside page templates and included files.
PREPROS::$config          // stdClass — full resolved config (prepros section of kirigami.yaml)
PREPROS::registerTag(string $tag, callable $callback)
PREPROS::registerHook(string $hook, callable $callback)
PREPROS::mount(string|array $patterns)
PREPROS::exportFile(string $absolutePath)
PREPROS::getExportedFiles(): string[]
```

#### `PREPROS::render(string $file)`

Internal method called once per source file. Orchestrates the full pipeline:

1. Resolves PHPDOC metadata and auto-loads data files.
2. Fires the `pre_render` hook with the raw source contents.
3. Includes `before.php`, the page body (or `@content`, see [above](#content-and-indent)), and `after.php` into a single string.
4. Processes all registered custom HTML tags.
5. Fires the `post_render` hook on the assembled HTML.
6. Optionally pretty-prints via `HTML::format()` (when `format: true`).
7. Writes the output `.html` file.

#### `PREPROS::sitemap()`

Scans the source tree for `_index.php` files and generates a standards-compliant `sitemap.xml` (Sitemaps 0.9), using `kirigami.baseurl` as the root URL.

#### `PREPROS::mount(string|array $patterns)`

Mounts additional local project files into the WASM virtual filesystem, on demand, from one or more glob patterns evaluated against the project root (via `picomatch`). Unlike the automatic mounting done for `kirigami.root` (limited to `.php`, `.json`, `.yaml`, `.yml`, `.md`, `.db`, `.txt`, and `prepros.mountext`), `mount()` copies **any** matching file, regardless of extension.

```php
// Mount every .webp under assets/, wherever the page needs them
PREPROS::mount('assets/**/*.webp');

// Multiple patterns at once
PREPROS::mount(['data/**/*.csv', 'vendor/fonts/*.woff2']);
```

Returns an array of the virtual paths (under `/project/...`) that were mounted, or `false` on failure.

#### `PREPROS::exportFile(string $file)`

Marks a file as a build output so it gets surfaced in `PreprosResult.files`. Called automatically by `render()`, `sitemap()`, `CACHE::set()`, and `CURL`. Call it manually if your custom code writes additional files.

---

### MD

Markdown-to-HTML converter with a plugin system for custom shortcodes.

```php
$html = MD::toHtml(string $markdown): string;
```

Supports the full GitHub Flavored Markdown subset:

- ATX headings (`#` through `######`) with auto-generated `id` attributes
- Ordered and unordered lists, including nested
- GFM task lists (`- [ ]` / `- [x]`)
- GFM tables with column alignment
- GFM alerts (`> [!NOTE]`, `> [!WARNING]`, etc.)
- Blockquotes (recursive)
- Fenced code blocks with language class
- Inline code
- Bold, italic, bold+italic, strikethrough
- Links with automatic `target="_blank" rel="noopener noreferrer"` for external URLs
- Images with `loading="lazy"`
- Auto-linked bare URLs
- Horizontal rules
- Hard line breaks (trailing double space → `<br>`)

#### Plugin API

Extend Markdown with custom shortcode tags:

```php
// Inline tag  {% tagname arg1 "arg with spaces" %}
// Block tag   {% tagname arg1
//             body content
//             %}

MD::registerPlugin(string $name, callable $callback): void
MD::unregisterPlugin(string $name): void
MD::getRegisteredPlugins(): string[]
```

The callback always receives `(array $args, string $body)`:

```php
MD::registerPlugin('video', function (array $args, string $body): string {
    $src = htmlspecialchars($args[0] ?? '', ENT_QUOTES, 'UTF-8');
    return "<video src=\"{$src}\" controls></video>";
});
```

Then in any Markdown content (including inside `<markdown>` tags):

```
{% video /videos/intro.mp4 %}
```

---

### HTML

Pretty-printer for the final HTML output. Used automatically when `format: true` is set in the config.

```php
$formatted = HTML::format(string $html): string;
```

Uses PHP 8.4's `Dom\HTMLDocument` (Lexbor engine) to parse the input and re-serialize it with consistent 4-space indentation. Inline elements, `<script>`, and `<style>` blocks are handled correctly — their content is indented but not reformatted. Boolean HTML5 attributes (`muted`, `autoplay`, `noopener`, etc.) are written without a value.

---

### YAML

A lightweight, zero-dependency YAML parser. Covers the full subset used in static site projects.

```php
$data = YAML::parse(string $yaml, bool $assoc = false): mixed;
$data = YAML::parseFile(string $path, bool $assoc = false): mixed;
$data = YAML::loadFile(string $path, bool $assoc = false): mixed;
```

Supported features:

- Scalars: strings (quoted and unquoted), integers, floats, booleans, null
- Single and double quoted strings with escape sequences
- Literal block scalars (`|`, `|-`, `|+`)
- Folded block scalars (`>`, `>-`, `>+`)
- Plain scalars spanning multiple lines
- Nested mappings and sequences
- Inline collections (`[a, b]` and `{k: v}`)
- Comments (`#`)
- Multiple documents separated by `---`

By default, YAML mappings are returned as `stdClass` objects. Pass `true` as the second argument to get associative arrays instead.

`YAML::loadFile()` behaves like `YAML::parseFile()`, then walks the result recursively: any string value ending in `.yaml`, `.yml`, or `.json` that resolves to an existing file (relative to *its own* file's directory) is replaced by that file's parsed content, and so on, recursively. Values that don't match an existing file are left untouched. Circular references (`A → B → A`) throw a `RuntimeException`.

```yaml
# team.yaml
lead: people/jane.yaml     # resolved and inlined automatically
members:
  - people/jane.yaml
  - people/john.yaml
```

```php
$team = YAML::loadFile('/project/data/team.yaml');
// $team->lead is now the fully parsed content of people/jane.yaml, not a string
```

---

### CACHE

Persistent SQLite-backed key-value cache. Survives across incremental builds via `.cache.db` at the project root.

```php
CACHE::get(string $key): mixed
CACHE::set(string $key, mixed $val, int $ttl = 0): bool
CACHE::delete(string $key): bool
CACHE::purge(): bool   // removes expired entries
```

The `$ttl` is in seconds. `0` means the entry never expires. Typical use case: caching the result of network fetches in custom hooks or plugins — it is what powers [`SCRAPER`](#scraper) and `CURL`'s cookie persistence internally.

```php
$data = CACHE::get('my-remote-data');
if ($data === null) {
    $data = json_decode(file_get_contents('https://api.example.com/data.json'));
    CACHE::set('my-remote-data', $data, 3600); // cache for 1 hour
}
```

---

### IMG

Image manipulation helper built on PHP GD. Supports JPEG, PNG, GIF, and WebP.

```php
$img = new IMG(string $file);

// Properties
$img->width   // int
$img->height  // int

// Methods (chainable)
$img->resize(int $width, int $height = 0, bool $cover = false): self
$img->save(string $dest): self
```

`resize()` operates in *contain* mode by default (scales to fit within the target box while preserving aspect ratio). Pass `$cover = true` to crop and fill the exact target dimensions.

`save()` infers the output format from the file extension (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`).

```php
(new IMG('/project/src/images/hero.jpg'))
    ->resize(1200, 630, true)
    ->save('/project/src/images/hero-og.jpg');
```

---

### FS

Filesystem utilities.

```php
FS::dig(string $glob): iterable          // recursive glob, yields file paths
FS::getRelativePath(string $from, string $to): string
FS::phpFileInfo(string $file): object|false  // parse PHPDOC annotations
FS::rmdir(string $dir, bool $removeSelf = true): bool
FS::pathJoin(string ...$parts): string   // URL-aware path join with .. resolution
```

`FS::dig()` is the workhorse of directory-wide builds — it recursively walks a glob pattern and yields every matching file path.

`FS::phpFileInfo()` parses the first PHPDOC block of a PHP file and returns its `@tag value` pairs as a `stdClass`. This is used internally to resolve page metadata and data-file annotations.

---

### STR

String utilities used internally by the tag-processing pipeline, and available for your own templates and plugins.

```php
STR::htmlesc(string $str): string
STR::replaceTags(string $tag, string $html, callable $callback): string
STR::parseHtmlAttributes(string $attrString): array
STR::trimIndent(string $str): string
STR::is_url(string $str): bool
STR::html_entities_decode(string $str): string
STR::shorthash(string $str): string
STR::slug(string $str): string
```

`STR::replaceTags()` is the engine behind `PREPROS::registerTag()`. It finds all occurrences of `<tagname ...>...</tagname>` in an HTML string and replaces each with the return value of `$callback($fullMatch, $attrs, $body)`.

`STR::trimIndent()` strips the common leading whitespace from a multi-line string — handy when pulling content out of indented `<markdown>` blocks.

`STR::is_url()` checks whether a string parses as a URL with a recognized scheme (`http`, `https`, `ftp`, `ftps`, `ssh`, `ssl`, `sftp`, `itunes`).

`STR::html_entities_decode()` trims a string and decodes its HTML entities — handy when normalizing text scraped from a third-party page.

`STR::shorthash()` returns the first 12 characters of a string's SHA-256 hash — used internally as a stable, filename-safe cache key (see `SCRAPER`).

`STR::slug()` transliterates a string to ASCII, lowercases it, and strips anything that isn't `[a-z0-9]` — a compact identifier rather than a hyphenated slug.

---

### ARR

Recursive lookup helper for nested arrays and objects.

```php
ARR::find_key(mixed $data, string $key): mixed
```

Walks an array or object (including mixed nested `stdClass`/array structures, as produced by `YAML::parse()` or `json_decode()`) depth-first and returns the value of the **first** matching key found, at any depth, or `null` if none matches.

```php
$config = YAML::parseFile('team.yaml');
$email  = ARR::find_key($config, 'email'); // finds `email` however deep it's nested
```

---

### CURL

Low-level HTTP client built on PHP's cURL extension, used internally by `SCRAPER`. Ships with a realistic browser `User-Agent`/header set and a cookie jar persisted at `.cookie.txt` (auto-registered via `PREPROS::exportFile()`).

```php
CURL::urlExists(string $url, ?string $mimereg = null): bool
CURL::getInfo(string $url): array|false     // HEAD request, returns curl_getinfo()
CURL::getContents(string $file, ?string $dest = null, ?callable $clb = null): string|bool
```

`CURL::urlExists()` issues a `HEAD` request and returns `true` for any `2xx`/`3xx` response.

`CURL::getContents()` downloads a URL. Without `$dest`, it returns the body as a string; with `$dest`, it streams the download to that file path and returns a boolean. Pass `$clb` to receive download progress as a float between `0` and `1`.

```php
CURL::getContents('https://example.com/report.pdf', '/project/src/downloads/report.pdf', function (float $progress) {
    error_log(sprintf('%.0f%%', $progress * 100));
});
```

---

### SCRAPER

Fetches a URL and extracts page metadata (`title`, `description`, `image`, `label`) from its JSON-LD (`schema.org`), Open Graph, and standard `<meta>` tags — the kind of data you'd want for a rich link preview. Results are cached indefinitely via `CACHE`, keyed on the URL.

```php
$metas = SCRAPER::get(string $url): object|false;
```

```php
$metas = SCRAPER::get('https://example.com/blog/some-article');
if ($metas) {
    echo $metas->title;        // string
    echo $metas->description;  // string
    echo $metas->image;        // string (absolute URL, may be empty)
    echo $metas->label;        // string — site/publisher name, may be empty
    echo $metas->url;          // string — the URL that was scraped
}
```

Returns `false` if the page can't be reached, can't be parsed, or has no discoverable title. Throws an `Exception` on invalid URLs. Uses `CURL::getContents()` under the hood, so it benefits from the same shared cookie jar and browser-like headers.

---

### OBF

Simple reversible obfuscation for values you want to embed in HTML without making them trivially readable (e.g., contact data, API tokens in templates).

```php
$encoded = OBF::encode(mixed $obj): string;
$decoded = OBF::decode(string $str): mixed;
```

Applies JSON encoding → base64 → ROT-13 → gzip. Not cryptographically secure; intended for light obfuscation only.

---

### STD

Output helpers used by the PHP runtime to communicate back to Node.js over stdout/stderr.

```php
STD::succeed(array|string $props = []): void  // exits 0, writes JSON to stdout
STD::error(array|string $props = []): void    // exits 1, writes JSON to stderr
```

These are internal to the build runner (`render()`, `sitemap()`, and `runenv()` all rely on them). You generally do not need to call them in page templates, but they are available if a script run via `runenv()` needs to terminate early with a custom result.

---

## Plugin system

`@kirigami/php-prepros` has two complementary plugin layers: **PREPROS** (HTML-tag level, operates on the assembled page) and **MD** (shortcode level, operates inside Markdown content).

---

### PREPROS tags

Register a custom HTML tag that is processed **after** PHP execution, on the fully assembled HTML string:

```php
// In a file listed under prepros.includes in kirigami.yaml, or in before.php:

PREPROS::registerTag('gallery', function (string $fullTag, array $attrs, string $body): string {
    $id   = $attrs['id'] ?? '';
    $imgs = glob("/project/src/images/gallery/{$id}/*.webp");
    $html = '<div class="gallery">';
    foreach ($imgs as $img) {
        $src = str_replace('/project/src', '', $img);
        $html .= "<img src=\"{$src}\" loading=\"lazy\">";
    }
    return $html . '</div>';
});
```

Then in any page template:

```html
<gallery id="summer-2025"></gallery>
```

The callback receives:

| Parameter | Type | Description |
|-----------|------|-------------|
| `$fullTag` | `string` | The complete matched tag string |
| `$attrs` | `array` | Parsed HTML attributes as an associative array |
| `$body` | `string` | Inner content between opening and closing tags |

The built-in `<markdown>` tag is registered this way (see below).

---

### PREPROS hooks

Hooks let you intercept and transform data at key points in the rendering pipeline:

```php
PREPROS::registerHook(string $hookName, callable $callback): void
```

| Hook | When it fires | `$data` type | Expected return |
|------|---------------|--------------|-----------------|
| `page_info` | After PHPDOC parsing, before rendering (auto-loads `.yaml`/`.json`/`.md` annotations) | `[$filePath, $pageObject]` | `$pageObject` (modified) |
| `pre_render` | Before PHP execution | Raw file contents as `string` | `string` |
| `post_render` | After tag processing, before `HTML::format()` | Assembled HTML `string` | `string` |

Multiple callbacks can be registered for the same hook — they are executed in registration order, each receiving the return value of the previous one.

```php
// Example: inject a last-modified date into every page
PREPROS::registerHook('post_render', function (string $html): string {
    $date = date('Y-m-d');
    return str_replace('{{build_date}}', $date, $html);
});
```

---

### MD plugins

MD plugins add custom shortcode tags inside Markdown content. They work inside `<markdown>` blocks, in `.md` data files, and anywhere `MD::toHtml()` is called.

**Inline syntax** (all on one line):

```
{% tagname arg1 "argument with spaces" %}
```

**Block syntax** (body on subsequent lines):

```
{% tagname optional-arg
Line one of the body.
Line two of the body.
%}
```

```php
MD::registerPlugin(string $name, callable $callback): void
```

The callback signature is always `(array $args, string $body): string`. `$args` contains arguments parsed from the opening line; `$body` is the trimmed multi-line body (empty string for inline tags).

---

### Built-in plugins

The following MD plugins are registered out of the box in `md.plugins.php`:

#### `{% callout type ["Title"] content %}`

Renders a styled callout block. `type` is one of `info`, `success`, `warning`, `danger`.

```
{% callout warning "Heads up" This section is outdated. %}

{% callout danger "Critical"
Line one of a longer warning.

Line two after a blank line.
%}
```

#### `{% youtube id [width height] %}`

Embeds a responsive YouTube player via `<iframe>`. `width`/`height` default to `560`/`315`.

```
{% youtube dQw4w9WgXcQ %}
{% youtube dQw4w9WgXcQ 800 450 %}
```

#### `{% codepen id [user height] %}`

Embeds a CodePen result via `<iframe>`. `user` defaults to `anonymous`, `height` defaults to `400`.

```
{% codepen abcXYZ %}
{% codepen abcXYZ jsmith 500 %}
```

#### `{% checklist ["Title"] items %}`

Renders a block-syntax list of checkbox items, one per line, with an optional title.

```
{% checklist "Today"
Do the dishes
Walk the dog
Read a book
%}
```

---

## Extending the `<markdown>` tag

The `<markdown>` tag is registered as a PREPROS tag out of the box. It converts its inner content from Markdown to HTML and strips common leading indentation so you can write cleanly inside your PHP templates:

```html
<section class="about">
    <div>
        <markdown>
            ## Who we are

            We are a **student organization** from Québec.

            {% youtube dQw4w9WgXcQ %}
        </markdown>
    </div>
</section>
```

All registered MD plugins are available inside `<markdown>` blocks. You can extend the tag's behaviour by registering additional MD plugins (see above) or by overriding the tag itself:

```php
PREPROS::registerTag('markdown', function (string $tag, array $attrs, string $body): string {
    $body = STR::trimIndent($body);
    $html = MD::toHtml($body);
    // wrap in a container, add a class, etc.
    $class = $attrs['class'] ?? 'prose';
    return "<div class=\"{$class}\">{$html}</div>";
});
```

---

## License

MIT © Maxime Larrivée-Roy, 2026
