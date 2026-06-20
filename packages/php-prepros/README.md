# @kirigami/php-prepros

> PHP preprocessor for the **Kirigami** static site generator.

Build full static websites in PHP — with zero server, zero runtime dependency, zero compromise on expressiveness. Write your pages as regular PHP files, annotate them with a PHPDOC header, and let `php-prepros` compile everything to clean, deployable HTML.

Part of the **Kirigami** project ecosystem. Other packages are coming soon.

[![npm version](https://img.shields.io/npm/v/@kirigami/php-prepros)](https://www.npmjs.com/package/@kirigami/php-wasm)
[![License: MIT](https://img.shields.io/badge/MIT-blue)](./LICENSE)
[![Node.js >=20.10.0](https://img.shields.io/badge/node-%3E%3D20.10.0-brightgreen)](https://nodejs.org)

---

## Table of contents

- [@kirigami/php-prepros](#kirigamiphp-prepros)
	- [Table of contents](#table-of-contents)
	- [How it works](#how-it-works)
	- [Installation](#installation)
	- [Configuration — `kirigami.yaml`](#configuration--kirigamiyaml)
	- [Writing pages](#writing-pages)
		- [PHPDOC header](#phpdoc-header)
		- [Auto-loading data files](#auto-loading-data-files)
	- [JavaScript API](#javascript-api)
		- [`render(file?)`](#renderfile)
		- [`sitemap()`](#sitemap)
	- [PHP classes reference](#php-classes-reference)
		- [PREPROS](#prepros)
			- [`PREPROS::render(string $file)`](#preprosrenderstring-file)
			- [`PREPROS::sitemap()`](#preprossitemap)
			- [`PREPROS::exportFile(string $file)`](#preprosexportfilestring-file)
		- [MD](#md)
			- [Plugin API](#plugin-api)
		- [HTML](#html)
		- [YAML](#yaml)
		- [CACHE](#cache)
		- [IMG](#img)
		- [FS](#fs)
		- [STR](#str)
		- [OBF](#obf)
		- [STD](#std)
	- [Plugin system](#plugin-system)
		- [PREPROS tags](#prepros-tags)
		- [PREPROS hooks](#prepros-hooks)
		- [MD plugins](#md-plugins)
		- [Built-in plugins](#built-in-plugins)
			- [`{% callout type ["Title"] content %}`](#-callout-type-title-content-)
	- [Extending the `<markdown>` tag](#extending-the-markdown-tag)
	- [License](#license)

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

Files are mounted into the WebAssembly virtual filesystem on demand. Only `.php`, `.json`, `.yaml`, `.md` and any extra extensions listed in `prepros.mountext` are mounted, keeping memory usage low.

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
  root: src/                # Required. Source directory containing your _*.php pages.
  baseurl: https://example.com   # Used by sitemap generation.
  sitename: My Website         # Arbitrary key/value pairs injected as PHP   variables.
  author:   Jane Doe

prepros:
  before: _layout/header.php    # Included before every page body.
  after:  _layout/footer.php    # Included after every page body.
  format: true                   # Pretty-print the HTML output (default: false).
  network: false                 # Allow HTTP fetches in PHPDOC @tag annotations.
  mountext:                      # Extra file extensions to mount into the wasm fs.
    - .svg
    - .txt
  includes:                      # PHP files auto-included before page rendering.
    - _lib/helpers.php
```

The entire `kirigami` block is extracted into PHP variables and made available in every page template. `$sitename`, `$author`, etc. are available without any further setup.

---

## Writing pages

Source pages live in the directory pointed to by `kirigami.root`. The naming convention is straightforward: any file whose name starts with `_` and ends in `.php` is treated as a page source. The leading underscore is stripped in the output filename.

```
src/
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

Anotations are also avaiables as variables in `before` and `after` php included files so you can write proper metas in the HTML header.

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

---

## JavaScript API

```js
import { render, sitemap } from '@kirigami/php-prepros';
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
> Path use by `render()` are all relative to `kirigami.root` configuration.


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

---

## PHP classes reference

All classes are autoloaded — no manual `require` needed inside your page files.

---

### PREPROS

The core engine. Manages the rendering pipeline, tag processing, hooks, and file export.

```php
// Available inside page templates and included files.
PREPROS::$config          // stdClass — full resolved config (prepros section of kirigami.yaml)
PREPROS::registerTag(string $tag, callable $callback)
PREPROS::registerHook(string $hook, callable $callback)
PREPROS::exportFile(string $absolutePath)
PREPROS::getExportedFiles(): string[]
```

#### `PREPROS::render(string $file)`

Internal method called once per source file. Orchestrates the full pipeline:

1. Resolves PHPDOC metadata and auto-loads data files.
2. Fires the `pre_render` hook with the raw source contents.
3. Includes `before.php`, the page body, and `after.php` into a single string.
4. Processes all registered custom HTML tags.
5. Fires the `post_render` hook on the assembled HTML.
6. Optionally pretty-prints via `HTML::format()` (when `format: true`).
7. Writes the output `.html` file.

#### `PREPROS::sitemap()`

Scans the source tree for `_index.php` files and generates a standards-compliant `sitemap.xml` (Sitemaps 0.9).

#### `PREPROS::exportFile(string $file)`

Marks a file as a build output so it gets surfaced in `PreprosResult.files`. Called automatically by `render()`, `sitemap()`, `CACHE::set()`, and `IMG::save()`. Call it manually if your custom code writes additional files.

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

---

### CACHE

Persistent SQLite-backed key-value cache. Survives across incremental builds via `.cache.db` at the project root.

```php
CACHE::get(string $key): mixed
CACHE::set(string $key, mixed $val, int $ttl = 0): bool
CACHE::delete(string $key): bool
CACHE::purge(): bool   // removes expired entries
```

The `$ttl` is in seconds. `0` means the entry never expires. Typical use case: caching the result of network fetches in custom hooks or plugins.

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

`save()` infers the output format from the file extension (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`). The saved file is automatically registered via `PREPROS::exportFile()`.

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

String utilities used internally by the tag-processing pipeline.

```php
STR::htmlesc(string $str): string
STR::replaceTags(string $tag, string $html, callable $callback): string
STR::parseHtmlAttributes(string $attrString): array
STR::trimIndent(string $str): string
```

`STR::replaceTags()` is the engine behind `PREPROS::registerTag()`. It finds all occurrences of `<tagname ...>...</tagname>` in an HTML string and replaces each with the return value of `$callback($fullMatch, $attrs, $body)`.

`STR::trimIndent()` strips the common leading whitespace from a multi-line string — handy when pulling content out of indented `<markdown>` blocks.

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

These are internal to the build runner. You generally do not need to call them in page templates.

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
| `page_info` | After PHPDOC parsing, before rendering | `[$filePath, $pageObject]` | `$pageObject` (modified) |
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