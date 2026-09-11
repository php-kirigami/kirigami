# CLAUDE.md

> **Maintainer note (delete this block in a real project).**
> This file is the shared `CLAUDE.md` template for Kirigami site/template
> projects. It is edited in `php-kirigami/kirigami` under `docs/template-CLAUDE.md`
> and copied to the root of each `template-*` repo as `CLAUDE.md`. The first
> section is project-specific and must be filled in per project; everything from
> "Working with Kirigami" onward is generic reference and can be copied verbatim.

Project context and working conventions. Committed to the repo so it travels with
the code across machines and contributors.

---

## What this project is

<!-- FILL IN PER PROJECT -->

- **Name:** _(the site / template name — matches `kirigami.project`)_
- **Kind:** _(demo template · real site · starter)_
- **Repo:** `php-kirigami/<repo>` (`origin`, branch `main`).
- **Deployed to:** _(e.g. GitHub Pages at `https://php-kirigami.github.io/<repo>/`)_,
  built in CI by the [`php-kirigami/kiribuild`](https://github.com/php-kirigami/kiribuild) action.
- **Built with [Kirigami](https://github.com/php-kirigami/kirigami)** — a static
  site generator that compiles PHP page templates to dependency-free static HTML,
  running PHP 8.5 in WebAssembly inside Node (no PHP install, no server).
- Everything is driven by one **`kirigami.yaml`** at the project root.

If this repo appears in `kiri create --list`, it is a public template: keep
content generic, commit no secrets, and assume anyone may clone it.

---

## Conventions

- **Node `>= 24.0.0`**, **npm `>= 10.2.3`**. ESM only (`"type": "module"` in any
  JS you add).
- **Comments and docs in English.** User-facing site copy follows the project's
  own language.
- **Stay lite.** Kirigami's whole point is zero server and minimal deps — don't
  reach for a framework or a native-dep library when a `node:` builtin, a PHP
  helper class (below), or ~30 lines of code will do.
- **Dev machine is Windows** (PowerShell) — mind path separators in any script.
- The `kiri` CLI is provided by the `@kirigami/kirigami` dev dependency; run it
  as `npx kiri <command>`.
- `kiri watch` only **rebuilds** on change — it runs no HTTP server and no
  browser live-reload. Use an editor preview server (e.g. VS Code Live Server on
  `src/`) if you want a live browser.

---

## Project structure

```
.
├── kirigami.yaml          # the one config file — see full reference below
├── package.json           # dev dep: @kirigami/kirigami (+ plugins, if any)
├── assets/                # source assets NOT served as-is
│   ├── images/            #   originals for the image autogenerator
│   └── fonts/             #   font files inlined by the Sass font-*() functions
├── scripts/               # named PHP scripts for `kiri run` / triggers
│   └── <name>.php
└── src/                   # = kirigami.root — everything here is the site
    ├── _layouts/          #   header.php / footer.php (prepros before/after)
    ├── _lib/              #   PHP included via prepros.includes
    ├── _index.php         #   → src/index.html
    ├── about/
    │   └── _index.php     #   → src/about/index.html
    ├── styles/            #   Sass task entry(ies), compiled to *.min.css
    ├── scripts/           #   esbuild task entry(ies), bundled to *.min.js
    └── images/            #   = image.dest — generated images land here
```

Naming rules inside `kirigami.root`:

- A file `_name.php` is a **page source**; it compiles to `name.html` in the same
  directory (leading `_` stripped). `_index.php` → `index.html`.
- A directory whose name starts with `_` (`_layouts/`, `_lib/`) is **skipped**
  during directory-wide builds — use it for partials, layouts, includes, data.
- Data files (`.yaml`, `.yml`, `.json`, `.md`) are not compiled; they are loaded
  by pages via PHPDOC annotations (below).

### The `dist` export

`kiri export` copies `kirigami.root` into `export.path` (default `dist/`),
**excluding**: any file/dir whose name starts with `_` or `.`, `.scss` files,
`.map` files, and non-minified `.js` files, plus every `export.ignore` pattern.
Token replacements happen during the copy: `###YEAR###` and `###TIMESTAMP###` in
`.html`, `###TODAY###` in `sitemap.xml`. The banner is stamped on every exported
`.js` / `.css` / `.html`.

---

# Working with Kirigami

Generic reference — safe to copy verbatim between projects.

## CLI commands

| Command | What it does |
|---|---|
| `npx kiri build` | Run every `tasks` entry once, in order, for development (no minify/export). If `prepros:` is set, renders all pages + `sitemap.xml` first. Fires the `before-build` trigger. Output written next to each entry under `kirigami.root`. |
| `npx kiri export` | Production build. Fires `before-export` then `before-build`; forces the `prepros` task, all `tasks`, and a `dist` copy into `export.path`; stamps the banner; fires `after-export`. |
| `npx kiri watch` | Dev mode: watches files for `esbuild` / `sass` / `prepros` tasks and rebuilds on change (150 ms debounce, batched). `node_modules/`, `.git/`, `dist/` always ignored. `Ctrl+C` to stop. No server. |
| `npx kiri run <script> [args…]` | Run `scripts/<script>.php` in the Kirigami PHP runtime (full class library, `PREPROS::$config->data` populated). Extra words become `$argv` entries. |
| `npx kiri create [template] [dir]` | Scaffold from an official `template-*` repo (no args → interactive wizard: template, dir, name / description / author / base URL → written into `package.json` + `kirigami.yaml`). `--list` / `-l` to list. Extraction never overwrites (existing files kept, `package.json` deep-merged); then `git init` + initial commit (unless already in a repo or `--no-git`) and `npm install` (unless `--no-install`). |
| `npx kiri phpinfo` | Print `phpinfo()` from the embedded runtime. `--md` / `--json` for other formats. |
| `npx kiri --version` | `kiri` version + bundled PHP version. |

Every command has `--help`.

---

## `kirigami.yaml` — full reference

Point your editor at the schema for autocompletion:

```yaml
# yaml-language-server: $schema=https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json
```

The file is loaded through `@kirigami/struct-walker` (so nested file references
resolve), validated against `kirigami.schema.json`, then checked imperatively.
`kiri` throws on any unknown key, wrong type, or missing required property.

```yaml
kirigami:
  project:  My Website           # ✅ site name — CLI banner, $project
  baseurl:  https://example.com   # ✅ deployed root URL, no trailing slash — sitemap, $baseurl
  root:     src                   # ✅ dir holding _*.php pages; all task entries relative to it
  banner:   assets/banner.txt     # –  license banner file stamped on exported js/css/html

  # Any other key under `kirigami:` is free-form project data and becomes a PHP
  # variable of the same name in every page, in before/after, and in
  # prepros.includes files (also readable as PREPROS::$config->data).
  author:      Jane Doe
  email:       hello@example.com
  gtag:        G-XXXXXXXXXX
  description: A short description, handy for <meta name="description">.
  keywords:    [static site, php]
  knowsabout:  [Topic one, Topic two]

prepros:                          # PHP → HTML compiler. Present (even empty) ⇒ forced prepros task.
  before:   _layouts/header.php   # PHP file (rel. to root) included before every page body
  after:    _layouts/footer.php   # PHP file included after every page body
  format:   true                  # pretty-print HTML output (4-space indent). default false
  head:     true                  # default true — auto-inject the theme guard + a <link>/<script> per sass/esbuild task into every page. `false` to opt out
  network:  false                 # allow outbound HTTP(S) in the WASM runtime (remote @tags, CURL, SCRAPER)
  mountext: [.svg, .webp]          # extra extensions auto-mounted into the virtual FS
  includes: [_lib/functions.php]   # PHP include_once'd before any page renders — register tags/hooks/MD plugins here

image:                            # image autogenerator — powers img-asset()/colors() and IMG::asset()/palette()
  format: webp                    # webp | avif                 (default webp)
  source: assets/images           # source folder, rel. to cwd()  (default assets/images)
  dest:   images                  # output folder, rel. to kirigami.root (default images)

plugins:                          # Kirigami plugins, loaded via @kirigami/sdk
  - name: "@kirigami/plugin-highlight"   # must match @kirigami/plugin-*, <scope>/kirigami-plugin-*, or kirigami-plugin-*
    active: true
    options: {}                   # free-form, plugin-specific

esbuild:                          # free-form — merged into every esbuild task call (after Kirigami's defaults)
  # minify: false
sass:                             # free-form — merged into every sass task call
  style: expanded
  # before / after: extra .scss files compiled before/after the entry (paths rel. to cwd())

export:
  path:   dist                    # output dir for `kiri export`  (default dist)
  ignore: ["*.psd", "notes/"]      # extra gitignore-style excludes on top of the built-ins

scripts:                          # named PHP scripts in scripts/<name>.php
  - name: convert-images
    mount: ["assets/images/**/*.jpg"]   # extra files to mount into the sandbox before the script runs
    trigger: before-build         # before-build | before-export | after-export  (optional — omit for manual only)

tasks:                            # ordered build pipeline, on top of implicit prepros + dist tasks
  - { name: js-core,   type: esbuild, entry: scripts/kirigami.core.js }
  - { name: scss-core, type: sass,    entry: styles/kirigami.core.scss }
```

### Task types

| `type` | Purpose | Required | Optional | Output |
|---|---|---|---|---|
| `esbuild` | Bundle + minify a JS/TS entry (`bundle`, `treeShaking`, `target es2020`). Build + watch. | `name`, `type`, `entry` | `force`, `head` | `<entry>.min.js` (+ `.map` outside export) |
| `sass` | Compile a `.scss`/`.sass` entry (`style: compressed`), re-minified with csso on export. Build + watch. | `name`, `type`, `entry` | `force`, `head` | `<entry>.min.css` (+ `.css.map` outside export) |
| `prepros` | Render pages + `sitemap.xml`. Watch-only unless forced/implicit. `target` renders just one file/subdir. | `name`, `type` | `target`, `force` | `*.html`, `sitemap.xml`, `robots.txt` |
| `dist` | Copy `kirigami.root` into `path`, stamping the banner. Implicit during `kiri export` only. | `name`, `type`, `path` | `ignore`, `force` | the exported tree |

`sass` resolves `@use`/`@forward` through Sass's `NodePackageImporter` plus a
custom importer that also accepts an implicit `styles/` prefix
(`@use '@kirigami/canva/conf'` → `@kirigami/canva/styles/conf`) and falls back to
the global `npm root -g`.

### Managed `<head>`

Unless `prepros.head` is `false`, every rendered page's `<head>` is auto-wired
and `header.php` should **not** hand-write any of it:

- a small theme/FOUC guard as the first child of `<head>` (adds the `js` class,
  applies the stored `data-theme` before first paint — pair it with
  `@kirigami/canva`'s `$theme` / `theme` script);
- a `<link rel="stylesheet">` for every `sass` task output;
- a `<script>` (no `defer`, just before `</body>`) for every `esbuild` task output.

Paths are per-page-relative and carry a `?<timestamp>` cache-bust. A file already
referenced in the page is left alone (you can still place one by hand). Skip a
single task's tag with `head: false` on that task.

With `format: true`, `HTML::format()` also indents each `<pre><code>` block to
its nesting depth (so the HTML source stays readable) and `prepros.head` injects
a small script that de-indents it again before display. `@kirigami/plugin-highlight`
re-indents its highlighted markup to match, so it stays in the same flow — the
same runtime script flattens both.

---

## Writing pages

### PHPDOC header

Every page starts with a docblock. Each `@key value` becomes a PHP variable
(`$key`) available in the page **and** in `before`/`after` includes.

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

Define any keys you want. `before`/`after` typically read `$title`, `$description`,
etc. to build `<head>` metas.

### Auto-loaded data files

When an annotation value ends in `.yaml`, `.yml`, `.json`, or `.md` **and**
resolves to a file (relative to the page's own directory), it is parsed and
injected as structured data instead of a string:

| Extension | Becomes |
|---|---|
| `.yaml` / `.yml` | `stdClass` (or array of `stdClass` for sequences), via `YAML::parseFile()` |
| `.json` | `json_decode()` result |
| `.md` | HTML string via `MD::toHtml()` |

```php
<?php
/**
 * @name     medias
 * @articles _articles.yaml
 */
?>
<?php foreach ($articles as $a): ?>
  <a href="<?= $a->url ?>"><?= $a->title ?></a>
<?php endforeach; ?>
```

With `prepros.network: true`, annotation values starting with `http://` /
`https://` are fetched and parsed the same way.

### `@content` and `@indent`

- **`@content`** — if a `content` variable resolves to a non-empty value
  (typically an auto-loaded `.md`/`.yaml`/`.json` annotation), it is used **as-is**
  as the page body and the PHP file is **not executed** for output. Good for pure
  data/markdown pages wrapped by a shared layout.
- **`@indent N`** — prefixes every line of the rendered body with `N` spaces
  before `before`/`after` wrap it. Keeps generated HTML readable inside indented
  layout markup.

```php
<?php
/**
 * @name    changelog
 * @title   Changelog
 * @content _changelog.md
 * @indent  4
 */
```

### Variables in scope while a page renders

Injected by `PREPROS::render()`: everything from the `kirigami:` block
(`$project`, `$baseurl`, `$author`, …), every PHPDOC annotation, plus `$relroot`
(relative path from the page's dir back to `kirigami.root` — use it to build
asset URLs that work at any depth) and `$absurl` (the page's absolute URL path,
including any subfolder in `kirigami.baseurl` — safe to use as an `href`/`src` root).

### Built-in tags

Processed **after** PHP runs, on the assembled HTML:

- `<markdown> … </markdown>` — converts its body from Markdown to HTML, stripping
  common leading indentation first. All registered MD plugins work inside it.
  Add `prose` (`<markdown prose>`) to wrap the output in `<div class="prose">`
  (`@kirigami/canva`'s `styles/prose`); `class` / `id` on the tag go on that div.
- `<img asset="path/in/assets-images.jpg" width="450" height="300" cover>` —
  resolves through the image autogenerator, calling `IMG::asset()` with the same
  parameters (`asset`→`$path`, `width`/`height` optional ints, `cover` presence =
  `true` = crop to fill) and swapping `asset` for the generated `src` in
  `image.dest`. Any other attribute (`alt`, `class`, `loading`, …) passes through
  onto the output `<img>`. Empty/missing `asset` ⇒ tag left untouched.

---

## PHP class library

All classes are autoloaded — no `require`. Available in pages, `before`/`after`,
`prepros.includes`, and `kiri run` scripts.

### PREPROS — the engine

```php
PREPROS::$config                              // stdClass: ->data = kirigami: block, ->image = image: block, + before/after/format/network
PREPROS::registerTag(string $tag, callable $cb)   // $cb($fullTag, array $attrs, string $body): string
PREPROS::registerHook(string $hook, callable $cb) // hooks: page_info, pre_render, post_render
PREPROS::mount(string|array $globPatterns)     // mount extra local files (ANY extension) into the WASM FS; returns virtual paths
PREPROS::exportFile(string|array $absPath)     // mark a file as build output (surfaces in results)
PREPROS::getExportedFiles(): string[]
PREPROS::fstat(string $path)                   // stat a file in the WASM FS, or false
PREPROS::backtraceFile()                       // path of the page currently rendering
```

Render pipeline per page: resolve PHPDOC + auto-load data → `page_info` hook →
`pre_render` hook (raw source) → include `before` + body (or `@content`) +
`after` → process registered tags → `post_render` hook → `HTML::format()` if
`format: true` → write `.html`.

### MD — Markdown → HTML

```php
$html = MD::toHtml(string $markdown): string;
MD::registerPlugin(string $name, callable $cb);   // $cb(array $args, string $body): string
MD::unregisterPlugin(string $name);
MD::getRegisteredPlugins(): string[];
MD::registerEmoji(string $shortcode, string $char);
```

Supports GFM (tables with alignment, task lists, alerts `> [!NOTE]`, strikethrough,
autolinks), ATX + Setext headings with auto `id`, fenced code with language class,
footnotes (`[^1]` / `[^1]: …`), definition lists (`Term` / `: def`), emoji
shortcodes (`:rocket:` → 🚀), hard line breaks, and **allowlist-sanitized** inline
HTML. External links get `target="_blank" rel="noopener noreferrer"`; images get
`loading="lazy"`.

**Shortcode plugins** — `{% name args %}` inline, or block form with a body on
following lines ending in `%}`. Built in (`md.plugins.php`):

| Shortcode | Renders |
|---|---|
| `{% callout info\|success\|warning\|danger ["Title"] content %}` | styled callout block |
| `{% youtube <id> [w h] %}` | responsive YouTube `<iframe>` (default 560×315) |
| `{% codepen <id> [user h] %}` | CodePen `<iframe>` (user default `anonymous`, h `400`) |
| `{% checklist ["Title"] \n item \n item \n %}` | checkbox list |

### HTML

```php
HTML::format(string $html): string;   // PHP 8.4 Dom\HTMLDocument (Lexbor), 4-space indent
```

Used automatically when `format: true`. Handles inline elements, `<script>`,
`<style>`; writes boolean HTML5 attributes without a value.

### YAML

```php
YAML::parse(string $yaml, bool $assoc = false): mixed;
YAML::parseFile(string $path, bool $assoc = false): mixed;
YAML::loadFile(string $path, bool $assoc = false): mixed;   // parseFile + recursively inline nested .yaml/.yml/.json file refs
```

Zero-dependency parser: scalars, quoted strings + escapes, block scalars
(`|`, `>`, with chomping), multi-line plain scalars, nested maps/sequences,
inline `[a, b]` / `{k: v}`, comments, multi-doc `---`. Mappings are `stdClass`
unless `$assoc = true`. `loadFile()` throws `RuntimeException` on circular refs.

### SCHEMA — pure-PHP JSON Schema validator

```php
$v = new SCHEMA(array $schema);
$v->isValid(mixed $data): bool;      // alias: validate()
$v->getErrors(): string[];           // "path: message" from the last run
```

Draft-7-ish. Keywords: `type`, `required`, `properties`, `patternProperties`,
`additionalProperties`, `items`, `min/maxItems`, `uniqueItems`, `min/maxLength`,
`pattern`, `minimum`/`maximum` (+ `exclusive*`), `min/maxProperties`, `enum`,
`const`, `anyOf`/`allOf`/`oneOf`/`not`, `format`, local `$ref`.

### CACHE — persistent key/value (SQLite, `.cache.db`)

```php
CACHE::get(string $key): mixed;                  // null if missing/expired
CACHE::set(string $key, mixed $val, int $ttl = 0): bool;   // ttl seconds, 0 = forever
CACHE::delete(string $key): bool;
CACHE::purge(): bool;                            // drop expired entries
```

Survives incremental builds. Backs `SCRAPER` results and `CURL` cookie
persistence. Use it to cache network fetches in your own tags/hooks.

### IMG

```php
$img = new IMG(string $file);
$img->width; $img->height;
$img->resize(int $w, int $h = 0, bool $cover = false): self;   // contain by default; cover crops+fills
$img->save(string $dest): self;                                // format from extension: jpg png gif webp avif
$img->getRepresentativeColors(int $count = 5): string[];       // ['#rrggbb', …]

IMG::asset(string $path, int $w = 0, int $h = 0, bool $cover = false): string;  // → generated file URL, relative to caller
IMG::palette(string $path, int $colors = 5): string[];                          // CACHE-backed
```

GD handles JPEG/PNG/GIF/WebP/AVIF; Imagick fallback rasterizes HEIC/TIFF/BMP and
vectors (SVG/EPS/AI/PDF, 2000 px longest side). `asset()` resolves `$path`
against `image.source`, writes into `image.dest` only when missing/stale, names
files `<name>-<W>w` / `-<H>h` / `-<W>x<H>[-cover].<format>`.

### FS

```php
FS::dig(string $glob): iterable;                 // recursive glob, yields paths
FS::getRelativePath(string $from, string $to): string;
FS::phpFileInfo(string $file): object|false;     // parse first PHPDOC block → stdClass
FS::getChildren(string $backtrace = ''): object[]; // render-only: child _index.php pages, sorted by @position then folder name (natcasesort); each info + ->file
FS::getBreadcrumb(string $backtrace = ''): object[]; // render-only: ancestor _index.php pages, top-most first; opt-in via @breadcrumb true|1 on the caller; stops at source root or first ancestor without an active @breadcrumb (that one excluded); current folder never included
FS::rmdir(string $dir, bool $removeSelf = true): bool;
FS::pathJoin(string ...$parts): string;          // URL-aware, resolves ..
```

### STR

```php
STR::htmlesc(string $s): string;
STR::replaceTags(string $tag, string $html, callable $cb): string;   // engine behind registerTag()
STR::parseHtmlAttributes(string $attrString): array;
STR::trimIndent(string $s): string;
STR::is_url(string $s): bool;
STR::html_entities_decode(string $s): string;
STR::shorthash(string $s): string;              // first 12 chars of sha-256
STR::normalize(string $s): string;              // Unicode NFD + strip combining marks (é → e)
STR::slug(string $s, string $sep = ''): string; // '' → compact id; '-' → hyphenated slug
```

### ARR

```php
ARR::find_key(mixed $data, string $key): mixed;  // depth-first, first match at any depth, or null
```

### CURL

```php
CURL::urlExists(string $url, ?string $mimeRegex = null): bool;   // HEAD, true on 2xx/3xx
CURL::getInfo(string $url): array|false;
CURL::getContents(string $url, ?string $dest = null, ?callable $onProgress = null): string|bool;
```

Browser-like headers, cookie jar persisted at `.cookie.txt`. Needs
`prepros.network: true`.

### SCRAPER

```php
$m = SCRAPER::get(string $url): object|false;   // ->title ->description ->image ->label ->url
```

Pulls JSON-LD / Open Graph / `<meta>` for link previews. Cached indefinitely via
`CACHE`, keyed on the URL. Needs `prepros.network: true`.

### OBF

```php
OBF::encode(mixed $obj): string;   // JSON → base64 → ROT-13 → gzip
OBF::decode(string $s): mixed;
```

Light obfuscation only (contact data, etc.) — not encryption.

### STD

```php
STD::succeed(array|string $props = []): void;   // exit 0, JSON to stdout
STD::error(array|string $props = []): void;     // exit 1, JSON to stderr
```

Internal to the build runner; useful in a `kiri run` script that must end early
with a custom result.

### Bundled polyfill

`ext-intl` is not in the WASM build, so a `Normalizer` polyfill is autoloaded
(`Normalizer::normalize()` / `isNormalized()` + `NFC`/`NFD`/`NFKC`/`NFKD`
constants). Prefer the `STR` helpers; the polyfill is for third-party snippets.

### Procedural shortcuts (aliases)

`libraries/aliases.inc.php` (autoloaded) exposes every static method above as a
plain function, named `<lowercase class>_<snake_case method>()` — handy in page
templates and `kiri run` scripts:

```php
md_to_html($md)            // MD::toHtml()
html_format($html)         // HTML::format()
yaml_load_file($path)      // YAML::loadFile()   (yaml_parse / yaml_parse_file too)
schema($schema)            // new SCHEMA()  — plus schema_validate($schema, $data, $errors)
cache_get() / cache_set() / cache_delete() / cache_purge()
img_asset($path, $w, $h, $cover)   // IMG::asset(), URL relative to the calling file
img_palette($path, $count)
fs_dig() / fs_get_relative_path() / fs_php_file_info() / fs_rmdir() / fs_path_join()
str_htmlesc() str_replace_tags() str_parse_html_attributes() str_trim_indent()
str_is_url() str_html_entities_decode() str_shorthash() str_normalize() str_slug()
arr_find_key($data, $key)
curl_get_contents() / curl_get_info() / curl_url_exists()
scraper_get($url)
obf_encode() / obf_decode()
std_succeed() / std_error()
prepros_render() prepros_sitemap() prepros_mount() prepros_fstat()
prepros_export_file() prepros_get_exported_files() prepros_backtrace_file()
register_tag() / register_hook()   // = prepros_register_tag / prepros_register_hook
md_register_plugin() md_unregister_plugin() md_get_registered_plugins() md_register_emoji()
```

Each function carries a full docblock, so editor hover / autocomplete shows the
signature and description. The classes stay the canonical API.

---

## Plugin system

### PREPROS tags & hooks (PHP)

Register in a `prepros.includes` file (or `before.php`):

```php
PREPROS::registerTag('gallery', function (string $tag, array $attrs, string $body): string {
    // ... return HTML
});

PREPROS::registerHook('post_render', function (string $html): string {
    return str_replace('{{build_date}}', date('Y-m-d'), $html);
});
```

| Hook | Fires | `$data` | Return |
|---|---|---|---|
| `page_info` | after PHPDOC parse, before render | `[$filePath, $pageObject]` | `$pageObject` |
| `pre_render` | before PHP execution | raw source `string` | `string` |
| `post_render` | after tag processing, before `HTML::format()` | assembled HTML `string` | `string` |

Multiple callbacks per hook run in registration order, chained.

### MD plugins

`MD::registerPlugin('video', fn(array $args, string $body): string => …)` — works
inside `<markdown>` blocks, `.md` data files, and any `MD::toHtml()` call.

### Sass hooks (via `@kirigami/sdk`, for JS plugin packages)

A plugin package listed under `plugins:` can contribute to `sass` tasks:

```js
import { on, HOOKS } from '@kirigami/sdk';
on(HOOKS.SASS_BEFORE,    (ctx) => '/abs/path/to/before.scss');
on(HOOKS.SASS_AFTER,     (ctx) => '/abs/path/to/after.scss');
on(HOOKS.SASS_FUNCTIONS, (ctx) => ({ 'my-fn($x)': (args) => /* SassValue */ }));
```

`ctx` is `{ __root, task, exportPath, config }`. On a signature collision with a
native Sass function, the native one wins.

`@kirigami/sdk` also exports `Cache` (same `node:sqlite` store, `.node.db` by
default) for JS-side plugin caching.

---

## Sass: design system, functions, image pipeline

### `@kirigami/canva` (shared design system)

```scss
// src/styles/partials/_conf.scss — override any token, then it cascades to :root as CSS custom properties
@forward "@kirigami/canva/conf" with (
    $bg: #f5f8f6, $surface: #e7f0ea, $ink: #263b30, $accent: #c08a2e,
    $font-body: "Roboto Flex", $font-heading: "Quicksand",
    $fonts: (
        "Roboto Flex": "assets/fonts/roboto-flex.woff2",
        "Quicksand":   "assets/fonts/quicksand.woff2",
    ),
);
```

`conf` emits `@font-face` per `$fonts` entry (using the `font-*()` functions
below), mirrors every token onto `:root` (`--bg`, `--accent`, …), builds
`--icon-<name>` custom properties, and ships a minimal reset. `@kirigami/canva/utils`
adds pure helpers: `wash()`, `hex6()`, `hexbin()`, `str-replace()`,
`url-encode()`, `svg-url()`, `apply-colors()`. (`styles/main` and the `Burger` JS
component are still stubs.)

Browser JS (canva ≥ 2.0.0 subpaths, no `scripts/` segment):
`@kirigami/canva/dom` (`create()`), `@kirigami/canva/helpers` (`busy()`,
`working()`, `preloadImage()`, `documentReady()`), `@kirigami/canva/theme`
(`data-theme` toggle), `@kirigami/canva/observer` (`register()` — rewrites
non-closing authoring tags like `<youtube id="…">`; import for the side effect,
then register from a plugin).

### Native Sass functions (every `sass` task)

| Function | Returns | Notes |
|---|---|---|
| `inline-file($path)` | `url("data:…;base64,…")` | file relative to `cwd()`, cached per compile |
| `img-asset($path, $width: null, $height: null, $cover: false)` | `url("…")` | registers the source image for the autogenerator, returns the generated URL |
| `colors($path, $count: 5)` | comma list of colors | representative colors (median-cut in Lab), cached in `.node.db` |
| `font-weight-range($path)` | e.g. `100 900` | variable-font `wght` axis |
| `font-stretch-range($path)` | e.g. `75% 125%` | `wdth` axis |
| `font-unicode-range($path)` | `U+…` list | font character set |
| `font-format($path)` | `woff2` / `truetype` / … | `format()` keyword |
| `font-style-detect($path)` | `normal` / `italic` / `oblique …deg` | `slnt`/`ital` axes, `italicAngle`, subfamily |

### Image autogenerator

One feature, one `image:` config (source `image.source` rel. to `cwd()`, output
`image.dest` rel. to `kirigami.root`, format `image.format`), **one engine** (the
`IMG` class — GD, Imagick fallback — in the WASM runtime), reachable from three
surfaces, all with the same `(path, width, height, cover)` parameters and the
same output filenames:

| Surface | Call |
|---|---|
| Sass | `img-asset($path, $width: null, $height: null, $cover: false)` → `url(...)` |
| PHP | `IMG::asset(string $path, int $w = 0, int $h = 0, bool $cover = false)` → relative URL |
| HTML | `<img asset="…" width height cover>` tag — thin wrapper over `IMG::asset()` |

The `sass` task feeds its `img-asset()` / `colors()` calls to
`@kirigami/php-prepros`'s `processImages()`, which runs the same `IMG` code —
so there is no native image dependency anywhere in the toolchain.

Output filenames: source name + `-<W>w` / `-<H>h` / `-<W>x<H>` / `-<W>x<H>-cover`
+ `.<image.format>`. Regenerated only when missing or older than the source. Keep
originals in `assets/images/`; never hand-edit `src/images/`.

---

## Deployment (`php-kirigami/kiribuild`)

This project ships `.github/workflows/page.yml`. On every push to `main` it:
builds with [`php-kirigami/kiribuild@v2`](https://github.com/php-kirigami/kiribuild)
(Node 24 + `kiri` CLI + `kiri export`), **commits back anything the build
regenerated** (e.g. `src/images/` derivatives — `dist/` stays git-ignored and
ships via the Pages artifact), then publishes `dist/` to GitHub Pages.

```yaml
# .github/workflows/page.yml
name: Build & Deploy

env:
  TZ: America/Toronto

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: write      # commit files the build regenerated
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7

      - uses: php-kirigami/kiribuild@v2
        with:
          node-version: '24'

      - name: Commit regenerated files
        shell: bash
        run: |
          if [ -n "$(git status --porcelain)" ]; then
            git config user.name  "kirigami[bot]"
            git config user.email "kirigami-bot@users.noreply.github.com"
            git add -A
            git commit -m "chore: update generated files [skip ci]"
            git push
          else
            echo "Nothing to commit."
          fi

      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@v5
```

v2 of the action does **only** Node + CLI + `kiri export`; checkout, the
commit-back, and the Pages upload/deploy live in the workflow (v1 did all of it
inside the action). Enable Pages once per repo: **Settings → Pages → Source:
GitHub Actions**. See the [action's docs](https://github.com/php-kirigami/kiribuild)
for its inputs.

---

## Files that may be committed

Kirigami leaves working files at the project root: `.cache.db` (CACHE),
`.node.db` (`@kirigami/sdk` Cache), `.cookie.txt` (CURL jar). A project may or
may not `.gitignore` these — check the repo's own `.gitignore` before "cleaning
them up". `kiri create` never copies them into a new project. Run
`kiri cache purge` to delete all three, or `kiri cache purge <mask>` (e.g.
`meta_*`) to drop only matching keys from the two SQLite stores.

`kiri build` writes each rendered `*.html` next to its `_index.php` under
`kirigami.root` (so a plain preview server can serve `src/`), and many projects
commit those. The managed `<head>` gives each asset ref a `?###TIMESTAMP###`
cache-buster that is **left literal at build time and only expanded on
`kiri export`** (into `dist/`) — so rebuilding never rewrites the committed page.
Don't "fix" a `?###TIMESTAMP###` you see in a committed `.html`; a real number
there means someone committed an export.

---

## License

MIT © Maxime Larrivée-Roy, 2026 — except `@kirigami/php-wasm` (GPL-2.0-or-later).
