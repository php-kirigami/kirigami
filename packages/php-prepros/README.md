<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/php-prepros


PHP preprocessor for the **Kirigami** static site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/php-prepros)](https://www.npmjs.com/package/@kirigami/php-prepros)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)

</div>

---

## Overview

Build full static websites in PHP — with zero server, zero runtime dependency, zero compromise on expressiveness. Write your pages as regular PHP files, annotate them with a PHPDOC header, and let `php-prepros` compile everything to clean, deployable HTML.

It is the perfect solution for **GitHub Pages**. Since it runs entirely in Node.js, it is fully compatible with **GitHub Actions**, allowing you to automate your deployment pipeline effortlessly.

Part of the **Kirigami** project ecosystem.


---


## Table of contents

- [@kirigami/php-prepros](#kirigamiphp-prepros)
  - [Overview](#overview)
  - [Table of contents](#table-of-contents)
  - [What's new in 1.7.0](#whats-new-in-170)
  - [What's new in 1.6.0](#whats-new-in-160)
  - [What's new in 1.4.0](#whats-new-in-140)
  - [What's new in 1.3.0](#whats-new-in-130)
  - [What's new in 1.2.1](#whats-new-in-121)
  - [What's new in 1.2.0](#whats-new-in-120)
  - [How it works](#how-it-works)
  - [Installation](#installation)
  - [Configuration — `kirigami.yaml`](#configuration--kirigamiyaml)
    - [`kirigami` block](#kirigami-block)
    - [`jsonld` block](#jsonld-block)
    - [`meta` block](#meta-block)
    - [`prepros` block](#prepros-block)
    - [`image` block](#image-block)
    - [`plugins` block](#plugins-block)
    - [`esbuild` / `sass` blocks](#esbuild--sass-blocks)
    - [`export` block](#export-block)
    - [`scripts` block](#scripts-block)
    - [`tasks` block](#tasks-block)
  - [Writing pages](#writing-pages)
    - [PHPDOC header](#phpdoc-header)
    - [Auto-loading data files](#auto-loading-data-files)
    - [`@content` and `@indent`](#content-and-indent)
    - [Built-in tags](#built-in-tags)
  - [JavaScript API](#javascript-api)
    - [`render(file?)`](#renderfile)
    - [`sitemap()`](#sitemap)
    - [`runenv(script, paths?, ...args)`](#runenvscript-paths-args)
    - [`mountPath(localPath, virtualDir?, php?)`](#mountpathlocalpath-virtualdir-php)
    - [`processImages(jobs)`](#processimagesjobs)
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
    - [SCHEMA](#schema)
    - [LD](#ld)
      - [Automatic mode](#automatic-mode)
      - [Explicit builders](#explicit-builders)
      - [`jsonld` config](#jsonld-config)
    - [META](#meta)
      - [`meta` config](#meta-config)
    - [CACHE](#cache)
    - [IMG](#img)
    - [FS](#fs)
    - [STR](#str)
    - [ARR](#arr)
    - [CURL](#curl)
    - [SCRAPER](#scraper)
    - [OBF](#obf)
    - [STD](#std)
    - [Bundled polyfills](#bundled-polyfills)
    - [Procedural shortcuts (aliases)](#procedural-shortcuts-aliases)
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
  - [Requirements](#requirements)
  - [License](#license)

---

## What's new in 1.7.0

- **`META`** class — a `<head>` SEO / social metadata generator, the companion
  to [`LD`](#ld). Builds the standard tags — `<title>`, `description`,
  `keywords`, `robots`, `language`, `generator`, `author`, Open Graph, Twitter
  Card, `<link rel="canonical">`, favicon / apple-touch-icon / humans — from
  each page's PHPDOC, the top-level `meta:` block, and the loose `kirigami:` /
  `jsonld:` keys `LD` already reads. It emits only what it can resolve, and
  leaves any tag the layout already hand-writes untouched.

  - **Opt-in**: a top-level `meta:` block (empty `meta: {}` is enough) switches
    on automatic injection into every page's `<head>`. `meta: false` (or
    `{ auto: false }`) keeps the config but stops the injection.
  - Per-page PHPDOC: `@meta false` (skip), `@meta_title`, `@meta_description`
    (falls back to `@description` / `@abstract` / `@excerpt`), `@meta_keywords`,
    `@meta_image`, `@meta_robots`, `@meta_type`, `@canonical`.
  - Manual builders — always emitted, still de-duplicated: `META::tag()`,
    `META::link()`, `META::raw()`, `META::tags()`. Procedural aliases:
    `meta_tag()`, `meta_link()`, `meta_raw()`, `meta_tags()`.

  Full key reference: [`META` → `meta` config](#meta-config).

---

## What's new in 1.6.0

- **Managed `<head>` (`prepros.head`).** Every rendered page's `<head>` is now
  auto-wired: a tiny theme/FOUC guard as the first child (adds the `js` class,
  applies the stored `data-theme` before first paint), a
  `<link rel="stylesheet">` for every `sass` task output, and a `<script>` (no
  `defer`, just before `</body>`) for every `esbuild` task output — each with a
  per-page relative path and a `?<timestamp>` cache-bust. A file already
  referenced in the page is left alone, so you can still hand-place one. Turn it
  off with `prepros: { head: false }`, or `head: false` on a single sass/esbuild
  task. A template's `header.php` no longer wires assets at all.

- **`HTML::format()` indents `<pre><code>`.** A fenced code block's lines are
  shifted to the block's nesting depth so the HTML source stays readable
  (relative indentation preserved). The exact leading run is stripped again
  before it's shown — at build time by `@kirigami/plugin-highlight`, otherwise
  by a ~250-byte de-indent script `prepros.head` injects before `</body>` (only
  when `format` is on; it skips blocks a highlighter already flattened). A bare
  `<pre>` and `<textarea>` are still emitted byte-for-byte.

---

## What's new in 1.4.0

A round of fixes to the rough edges that showed up building a full site from
scratch — mostly developer-experience, all backward compatible.

- **`HTML::format()` keeps `<pre>` / `<textarea>` verbatim.** Their line breaks,
  indentation and blank lines are no longer collapsed, so a fenced code block
  survives the formatter intact — `format: true` and Markdown code blocks now
  coexist. (1.6.0 refines this: a `<pre><code>` block is re-indented to its
  nesting depth and de-indented again before display.)
- **The default Markdown plugins load out of the box.** `{% callout %}`,
  `{% youtube %}`, `{% codepen %}` and `{% checklist %}` are registered
  automatically (`md.plugins.php` is auto-included from `MD`), as the docs always
  said. Drop one with `MD::unregisterPlugin('name')` or shadow it with your own
  `MD::registerPlugin()`.
- **Build errors you can actually read.** A fatal in a template (a bad call, a
  `null` argument, a `TypeError`…) comes back as a structured failure with the
  message, the offending page and the `file:line` — never a bare
  `Error: undefined`. The `try/catch` now covers `Throwable`, not just
  `Exception`. PHP warnings and notices no longer sink an otherwise-clean build:
  they surface as `warnings` on the result. `kiri` prints the message, the page,
  and the tail of the PHP stderr/debug output on failure.
- **PHPDOC parsing.** A tag value may now wrap onto the following *indented*
  continuation lines instead of being silently truncated at the first line. And
  an `@word` written in the block's prose is ignored rather than overwriting a
  real tag — only lines that *start* with `@` open a tag.
- **`FS::getBreadcrumb()` / `FS::getChildren()`** are anchored on the page being
  rendered (`PREPROS::$file`), so they return the right trail / child list when
  called from a layout include, a partial, or a helper function — not only
  straight from the template. Pass an explicit path to override.
- **`{% tag %}` inside a code span or code block stays literal** (`` `{% badge %}` ``
  renders as text) instead of being expanded — or leaking an unrestored
  placeholder.
- **`IMG` never upscales.** A requested size larger than the source is clamped
  down to the source instead of throwing an opaque encoder error (the AVIF
  encoder in particular).
- **Build-time tokens expand at render time.** `###YEAR###`, `###TIMESTAMP###`
  and `###TODAY###` are substituted when each page is generated, so
  `kiri build` / `kiri watch` previews show real values, not the literal token
  (previously only `kiri export` replaced them).
- **`page_info` hook robustness.** The first built-in callback accepts either the
  `[$file, $info]` pair the hook fires with or the bare `$info` object a later
  callback receives, so a custom `page_info` hook can't fatal on the argument
  shape. See [PREPROS hooks](#prepros-hooks).

---

## What's new in 1.3.0

- **`LD`** class — a schema.org JSON-LD generator. Collects structured-data
  nodes during a render and emits them as a single
  `<script type="application/ld+json">` `@graph` in every page's `<head>`.
  - Automatic injection is **opt-in**: add a top-level `jsonld:` block to
    `kirigami.yaml` (even empty, `jsonld: {}`) and an `Organization` (+ `Person`, `WebSite`,
    `WebPage`, `BreadcrumbList`) graph is derived from that block plus the loose
    keys projects already carry (`person`, `jobtitle`, `email`, `area`,
    `knowsabout`, `keywords`, `facebook`, …). No `jsonld:` block → nothing is
    injected.
  - Turn it back off with `jsonld: false` / `jsonld: { auto: false }`, or per
    page with `@ld false`; per-page `@ld_type` / `@ld_title` / `@ld_image` / …
    tags feed the page node, and a `BreadcrumbList` is built from the
    `_index.php` ancestor trail with no opt-in.
  - Explicit builders for everything else: `LD::add()`, `LD::article()`,
    `LD::faqPage()`, `LD::breadcrumb()`, `LD::ref()`, and every schema.org type
    via `LD::typeName([...])`. Procedural aliases: `ld_add()`, `ld_organization()`,
    `ld_script()`, …
  - A page that already hand-writes an `application/ld+json` script is left
    untouched.

---

## What's new in 1.2.1

- **`processImages()`** JS export — batch resize / palette-extraction through the
  `IMG` class (`src/imagebatch.php`). `@kirigami/kirigami`'s `sass` task now uses
  it for `img-asset()` / `colors()`, so the whole toolchain is free of a native
  image dependency (`sharp` is gone).
- **`IMG::save()`** takes an optional `$quality` (0-100) for jpg / webp / avif;
  `null` keeps the per-format default (82).

---

## What's new in 1.2.0

- **`SCHEMA`** class — a pure-PHP, dependency-free JSON Schema validator
  (Draft-7 style, Ajv-like API: `isValid()` / `validate()` / `getErrors()`).
- **`IMG::asset()` / `IMG::palette()`** — static helpers powering kirigami-core's
  `img-asset()` and `colors()` Sass functions: on-demand resize/convert of a
  source image, and cached representative-colour extraction.
- **`<img asset="…">` tag** — the HTML-side entry point of the image
  autogenerator, same parameters as `IMG::asset()` (see [Built-in tags](#built-in-tags)).
- **`IMG` now handles vector and exotic formats** — SVG, EPS, AI, PDF (rasterized
  via Imagick), plus HEIC / TIFF / BMP, on top of GD's JPEG / PNG / GIF / WebP /
  AVIF.
- **`MD` emoji shortcodes** — `:rocket:` → 🚀 from a large built-in map, extend­able
  with `MD::registerEmoji()`.
- **`MD` footnotes and definition lists** — `[^1]` / `[^1]: …`, and `Term` / `: …`.
- **`MD` inline HTML is now sanitized** against a tag/attribute allowlist rather
  than passed through verbatim.
- **`STR::normalize()`** — Unicode NFD + combining-mark stripping;
  **`STR::slug($str, $sep = '')`** now takes a separator (pass `'-'` for a
  hyphenated slug).
- **Bundled `Normalizer` polyfill** — `ext-intl` isn't in the WASM build, so a
  polyfill keeps `Normalizer::normalize()` (and `STR::normalize()` / `slug()`)
  working.

Earlier, in 1.1.x: `PREPROS::mount()` + the `mountPath()` / `runenv()` JS
exports, the `SCRAPER` and `CURL` and `ARR` classes, `YAML::loadFile()`, the
`STR::is_url()` / `html_entities_decode()` / `shorthash()` / `slug()` helpers,
the `{% youtube %}` / `{% codepen %}` / `{% checklist %}` MD plugins, and the
`@content` / `@indent` PHPDOC annotations.

---

## How it works

`@kirigami/php-prepros` runs your PHP source files inside a **WebAssembly PHP 8.x runtime** ([`@kirigami/php-wasm`](https://www.npmjs.com/package/@kirigami/php-wasm)), entirely in Node.js — no PHP installation required on the host machine.

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

---

## Configuration — `kirigami.yaml`

Every project **must** have a `kirigami.yaml` at its root. The preprocessor reads it at startup and throws if it is absent or invalid.

`@kirigami/php-prepros` itself only acts on four blocks — **`kirigami:`**, **`jsonld:`**, **`prepros:`**, and **`image:`**. The remaining blocks (**`plugins:`**, **`esbuild:`**, **`sass:`**, **`export:`**, **`scripts:`**, **`tasks:`**) are consumed by the [`kiri`](https://www.npmjs.com/package/@kirigami/kirigami) CLI that drives the build; they are documented here for completeness because everything lives in the one file. The full file is validated against [`kirigami.schema.json`](https://github.com/php-kirigami/kirigami/blob/main/packages/kirigami/kirigami.schema.json), also served for editor autocompletion:

```yaml
# yaml-language-server: $schema=https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json
```

```yaml
kirigami:
  # ── Required ──────────────────────────────────────────────────────────
  project:     My Website           # Site name. Printed in the CLI banner, exposed as $project.
  baseurl:     https://example.com  # Deployed root URL, no trailing slash. Used for sitemap.xml.
  root:        src                  # Source directory containing your _*.php pages.

  # ── Optional ────────────────────────────────────────────────────────
  banner:      assets/banner.txt    # Text file stamped as a license banner on exported files.

  # ── Arbitrary project data ──────────────────────────────────────────
  # Everything else under `kirigami:` is free-form. The whole block is
  # extracted as PHP variables and made available in every page, in
  # before.php/after.php, and anywhere PREPROS::$config->data is read.
  author:      Jane Doe
  email:       hello@example.com
  gtag:        G-XXXXXXXXXX
  description: A short description of the site, useful for <meta name="description">.
  keywords:
    - keyword one
    - keyword two

jsonld:                         # Presence turns on the LD schema.org JSON-LD generator.
  type: Organization            # `jsonld: {}` alone is enough; see the jsonld block below.
  logo: assets/logo.png

prepros:
  before:  _layouts/header.php  # Included before every page body.
  after:   _layouts/footer.php  # Included after every page body.
  format:  true                 # Pretty-print the HTML output (default: false).
  network: true                 # Allow HTTP fetches in PHPDOC @tag annotations / CURL / SCRAPER.
  mountext:                     # Extra file extensions to auto-mount into the wasm fs,
    - .svg                      # in addition to the defaults (.php .json .yaml .yml .md .db .txt).
    - .webp
  includes:                     # PHP files auto-included once, before any page renders.
    - _lib/functions.php

image:                          # Image autogenerator — powers IMG::asset() / IMG::palette().
  format: webp                  # webp | avif (default: webp)
  source: assets/images         # Source folder, relative to cwd() (default: assets/images)
  dest:   images                # Output folder, relative to kirigami.root (default: images)

plugins:
  - name: "@kirigami/plugin-highlight"
    active: true
    options:
      style: canva
      color: black

esbuild:
  # minify: false

sass:
  style: expanded

export:
  path:   dist
  ignore: ["*.psd", "notes/"]

scripts:
  - name: convert-images
    mount: ["assets/images/**/*.jpg"]
    trigger: before-build       # before-build | before-export | after-export

tasks:
  - name:  js-core
    type:  esbuild
    entry: scripts/kirigami.core.js

  - name:  scss-core
    type:  sass
    entry: styles/kirigami.core.scss
```

### `kirigami` block

Core project settings. **Read by `php-prepros`.** The entire block is extracted into PHP variables and made available in every page template, `before.php`, `after.php`, and `prepros.includes` files — `$project`, `$author`, `$gtag`, etc. are available with no further setup, and also as `PREPROS::$config->data`.

| Key | Required | Description |
|-----|----------|--------------|
| `project` | ✅ | Human-readable site name. Exposed as `$project`. |
| `baseurl` | ✅ | Root URL of the deployed site, no trailing slash. Used to build absolute `<loc>` entries in `sitemap.xml`; exposed as `$baseurl`. |
| `root` | ✅ | Path (relative to the project root) to the directory containing your `_*.php` source pages. Build fails immediately if missing or if the path doesn't exist. |
| `banner` | — | Path (relative to the project root) to a text file stamped as a license/copyright banner on exported `.js`/`.css`/`.html` files during `kiri export`. May contain the `###DATE###` token, replaced with today's date. Falls back to an auto-generated banner. |
| *anything else* | — | Free-form key/value pairs (strings, numbers, booleans, lists, nested maps — anything valid YAML). Every key is extracted as a PHP variable (`$author`, `$gtag`, …). Use this for contact info, social links, analytics IDs, SEO keywords, or any project data you want available everywhere. When the top-level `jsonld` block is present, [`LD`](#ld) also reads some of these by convention: `person`, `jobtitle`, `email`, `area`, `knowsabout`, `keywords`, and social-network URL keys (`facebook`, `instagram`, …). |

### `jsonld` block

Top-level, optional. Its **presence** switches on the [`LD`](#ld) schema.org
JSON-LD generator — an `application/ld+json` graph is then injected into every
page's `<head>`. An empty `jsonld: {}` is enough; its keys refine what `LD`
otherwise infers from the `kirigami` block and each page's PHPDOC. `jsonld: false`
(or `jsonld: { auto: false }`) keeps the config values but stops the injection;
no block at all means nothing is injected. Full key reference and per-page
`@ld_*` tags: [`LD` → `jsonld` config](#jsonld-config).

### `meta` block

Top-level, optional. Its **presence** switches on the [`META`](#meta) generator —
the standard SEO / social `<meta>` and `<link>` tags are then built for every
page and injected into its `<head>`. An empty `meta: {}` is enough; everything is
derived from the `kirigami` block, the `jsonld` block, and each page's PHPDOC
(`@title`, `@description` / `@abstract`, `@keywords`, `@image`, `@robots`,
`@og_type`, `@canonical`). Keys refine those inferences. A tag the layout already
hand-writes is left untouched. `meta: false` (or `meta: { auto: false }`) keeps
the config values but stops the injection; no block at all means nothing is
injected (explicit `META::tag()` / `meta_tag()` calls still emit). Full key
reference and per-page `@meta_*` tags: [`META` → `meta` config](#meta-config).

### `prepros` block

Options for the PHP → HTML compiler. **Read by `php-prepros`.** Declaring this block (even empty) also makes `kiri` prepend a forced `prepros` task on every build/export/watch.

| Key | Type | Default | Description |
|-----|------|---------|--------------|
| `before` | `string` | — | Path (relative to `kirigami.root`) to a PHP file included **before** every page's body. Typically your `<head>`/layout opening. |
| `after` | `string` | — | Path (relative to `kirigami.root`) to a PHP file included **after** every page's body. Typically your layout closing. |
| `format` | `bool` | `false` | Pretty-print the compiled HTML via [`HTML::format()`](#html) before writing it to disk. |
| `head` | `bool` | `true` | Auto-wire each page's `<head>`: a theme/FOUC guard as the first child, a `<link rel="stylesheet">` per `sass` task output, and a `<script>` (no `defer`, before `</body>`) per `esbuild` task output — each with a per-page relative path and a `?<timestamp>` cache-bust. A file already referenced in the page is skipped. Set `false` to disable, or `head: false` on a single `sass`/`esbuild` task to skip just its tag. |
| `network` | `bool` | `false` | Enables outbound HTTP(S) inside the WASM PHP runtime. Required for PHPDOC `@tag https://…` annotations that fetch remote `.yaml`/`.json`/`.md` data (see [Auto-loading data files](#auto-loading-data-files)), and for the `CURL` / `SCRAPER` classes. |
| `mountext` | `string[]` | `[]` | Extra file extensions to mount automatically into the virtual filesystem alongside the built-in `.php`, `.json`, `.yaml`, `.yml`, `.md`, `.db`, `.txt`. Use this for assets your PHP code reads directly (e.g. `.svg`, `.webp`). Files with extensions not in this set are skipped during mounting — mount them on demand with [`PREPROS::mount()`](#preprosmountstringarray-patterns) instead. |
| `includes` | `string[]` | `[]` | PHP files (relative to `kirigami.root`) `include_once`'d once, right after config is loaded — before any page renders. The natural place to `PREPROS::registerTag()`, `PREPROS::registerHook()`, or `MD::registerPlugin()`. |

### `image` block

Options for the image autogenerator. **Read by `php-prepros`** — these are what [`IMG::asset()` / `IMG::palette()`](#img), the [`<img asset>` tag](#img-asset), and kirigami-core's `img-asset()` / `colors()` Sass functions all resolve against. Optional; the defaults below apply even when the block is absent.

| Key | Type | Default | Description |
|-----|------|---------|--------------|
| `format` | `string` | `webp` | Output format for generated images: `webp` or `avif`. |
| `source` | `string` | `assets/images` | Folder holding the source images, relative to `cwd()`. |
| `dest` | `string` | `images` | Destination folder for generated images, relative to `kirigami.root`. |

### `plugins` block

List of Kirigami plugins. **Consumed by the `kiri` CLI** (see [`@kirigami/sdk`](https://www.npmjs.com/package/@kirigami/sdk)), not by `php-prepros` directly.

| Key | Required | Description |
|-----|----------|--------------|
| `name` | ✅ | Plugin package name. Must match `@kirigami/plugin-*`, `<scope>/kirigami-plugin-*`, or `kirigami-plugin-*`. |
| `active` | ✅ | Whether the plugin is loaded. |
| `options` | — | Free-form object passed to the plugin; its shape depends on the plugin. |

### `esbuild` / `sass` blocks

Free-form objects. **Consumed by the `kiri` CLI.** There is no fixed key set: whatever you put here is spread straight into the underlying library call for every matching task, *after* Kirigami's own defaults — so it can also override them (`minify`, `target`, `style: "compressed"`, source maps, …). Refer to esbuild's [`BuildOptions`](https://esbuild.github.io/api/#build-api) and Dart Sass's [`Options`](https://sass-lang.com/documentation/js-api/interfaces/options/) for what's accepted. Writing the key with nothing under it parses to `null` in YAML, equivalent to omitting the block.

`sass:` additionally recognizes two keys that are **not** passed to Dart Sass:

| Key | Type | Description |
|-----|------|--------------|
| `before` | `string` / `string[]` | Extra `.scss` files compiled **before** the task entry (paths relative to `cwd()`). |
| `after` | `string` / `string[]` | Extra `.scss` files compiled **after** the task entry. |

### `export` block

Options for `kiri export`. **Consumed by the `kiri` CLI.** Optional.

| Key | Type | Default | Description |
|-----|------|---------|--------------|
| `path` | `string` | `dist` | Output directory for `kiri export`, relative to the project root. |
| `ignore` | `string[]` | `[]` | Extra gitignore-style patterns excluded from the export copy, on top of Kirigami's built-in exclusions. |

### `scripts` block

Named PHP scripts. **Consumed by the `kiri` CLI**, which runs each `scripts/<name>.php` through [`runenv()`](#runenvscript-paths-args) — so the full `php-prepros` class library is available and `kirigami.yaml`'s `kirigami` block is exposed as `PREPROS::$config->data`.

| Key | Required | Description |
|-----|----------|--------------|
| `name` | ✅ | Must match an existing `scripts/<name>.php` file. Run with `kiri run <name> [args...]`; extra CLI arguments are forwarded as `$argv` entries. |
| `mount` | — | Glob patterns (relative to the project root) of extra local files to mount into the sandbox before the script runs. |
| `trigger` | — | Fire the script automatically: `before-build` (start of `build` and `export`), `before-export` (very start of `export`), or `after-export` (once `export` has finished). |

### `tasks` block

Ordered list of build tasks, run in array order. **Consumed by the `kiri` CLI**, on top of the implicit `prepros` task (added when the `prepros` block is present) and the implicit `dist` task (added during `kiri export`).

| `type` | Purpose | Required fields | Optional |
|--------|---------|-----------------|----------|
| `esbuild` | Bundle/minify a JS/TS entry. Build + watch. Output: `<entry>.min.js`. | `name`, `type`, `entry` | `force` |
| `sass` | Compile a `.scss`/`.sass` entry, minified with csso on export. Build + watch. Output: `<entry>.min.css`. | `name`, `type`, `entry` | `force` |
| `prepros` | Render pages + `sitemap.xml`. Watch only (runs on build/export only when forced/implicit). | `name`, `type` | `target`, `force` |
| `dist` | Copy `kirigami.root` into an output dir, stamping the banner. Forced/implicit only. | `name`, `type`, `path` | `ignore`, `force` |

---

## Writing pages

Source pages live in the directory pointed to by `kirigami.root`. The naming convention is straightforward: any file whose name starts with `_` and ends in `.php` is treated as a page source. The leading underscore is stripped in the output filename.

```
src/
├── _layouts/
├── _lib/
├── _index.php          →  src/index.html
├── about/
│   └── _index.php      →  src/about/index.html
└── blog/
    ├── _index.php       →  src/blog/index.html
    └── _articles.yaml   (data file, not compiled)
```

Directories whose name starts with `_` (e.g. `_layouts/`, `_lib/`) are skipped entirely during directory-wide builds.

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

Only lines whose first non-whitespace character (past the `*` gutter) is `@`
open an annotation — an `@word` written in the prose of the block is left alone.
A value can wrap onto the following **indented** continuation lines:

```php
/**
 * @title       About us
 * @description A longer blurb that does not fit comfortably
 *              on a single line and continues here.
 */
```

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

### Built-in tags

Two tags are registered out of the box (`prepros.plugins.php`) and processed
**after** the PHP runs, on the assembled HTML — no include or plugin needed.

#### `<markdown> … </markdown>`

Converts its inner content from Markdown to HTML, stripping the common leading
indentation first (via `STR::trimIndent()`) so you can indent it naturally inside
your template. All registered [MD plugins](#md-plugins) work inside it. See
[Extending the `<markdown>` tag](#extending-the-markdown-tag) to override it.

```html
<section>
    <markdown>
        ## Who we are

        We are a **student organization** from Québec.
    </markdown>
</section>
```

#### `<img asset="…">`

The HTML-side entry point of the image autogenerator — the exact same feature as
the [`img-asset()` Sass function](https://www.npmjs.com/package/@kirigami/kirigami#sass-functions)
and [`IMG::asset()`](#img), with the same parameters. The tag calls `IMG::asset()`
under the hood, then swaps the `asset` attribute for the generated `src`.

```html
<!-- in:  resolves assets/images/hero.jpg through IMG::asset('hero.jpg', 800, 0, false) -->
<img asset="hero.jpg" width="800" alt="Our office" loading="lazy">
<!-- out: <img src="../images/hero-800w.webp" alt="Our office" loading="lazy"> -->
```

| Attribute | Maps to `IMG::asset()` arg | Notes |
|-----------|---------------------------|-------|
| `asset` | `$path` | **Required.** Path relative to `image.source`. Missing/empty ⇒ the tag is left untouched. |
| `width` | `$width` | Optional, integer. Omitted ⇒ `0` (keep). |
| `height` | `$height` | Optional, integer. Omitted ⇒ `0` (keep). |
| `cover` | `$cover` | Boolean — **presence means `true`** (crop + fill). |
| *(any other)* | — | `alt`, `class`, `id`, `loading`, … are passed straight through onto the output `<img>`. |

`asset` / `width` / `height` / `cover` are consumed and removed; everything else
survives. The generated file lands in `image.dest` and is only (re)generated when
missing or older than the source — see [`IMG`](#img) for the naming convention.

> The Sass `img-asset()` / `colors()` functions, the `<img asset>` tag and
> `IMG::asset()` all run on the **same engine** — the `IMG` class (GD, with the
> Imagick fallback) in this package. `@kirigami/kirigami`'s `sass` task routes its
> image work here through [`processImages()`](#processimagesjobs), so there is no
> native image dependency in the toolchain.

---

## JavaScript API

```js
import { render, sitemap, runenv, mountPath, processImages } from '@kirigami/php-prepros';
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

### `processImages(jobs)`

Run a batch of image jobs — resize/encode, or palette extraction — through the
[`IMG`](#img) class (GD, with the Imagick fallback). This is the engine
`@kirigami/kirigami`'s `sass` task uses for its `img-asset()` and `colors()`
functions, so Sass, `IMG::asset()` and the [`<img asset>` tag](#built-in-tags)
all share one implementation, one `image:` config and one set of output
filenames — with no native image dependency.

```js
import { processImages } from '@kirigami/php-prepros';

const { files, colors } = await processImages([
  // resize/encode `hero.jpg` (resolved against image.source) to each dest —
  // absolute virtual paths, already carrying the target extension
  { op: 'resize', src: 'hero.jpg', width: 1200, height: 0, cover: false, quality: 82,
    dests: ['/project/src/images/hero-1200w.webp'] },

  // extract a 5-colour palette (cached in .cache.db); returned, not written
  { op: 'palette', src: 'hero.jpg', count: 5 },
]);

// files  → ['src/images/hero-1200w.webp']   (also copied back to the host)
// colors → { 'hero.jpg:5': ['#1e3a5f', '#c8a24b', …] }
```

- `jobs` — array of `resize` / `palette` jobs (see the shape above). An **empty
  array is a no-op** and does **not** start the WASM runtime.
- Staleness is the caller's responsibility: every `resize` job listed is executed.

**Returns** `Promise<PreprosResult & { colors: Record<string, string[]> }>`.

---

## PHP classes reference

All classes are autoloaded — no manual `require` needed inside your page files.

---

### PREPROS

The core engine. Manages the rendering pipeline, tag processing, hooks, mounting, and file export.

```php
// Available inside page templates and included files.
PREPROS::$config          // stdClass — full resolved config; ->data is the kirigami: block,
                          // ->image the image: block, plus before/after/format/… from prepros:
PREPROS::registerTag(string $tag, callable $callback)
PREPROS::registerHook(string $hook, callable $callback)
PREPROS::runHook(string $hook, mixed $data = null)  // fire a hook (built-in or your own), returns the piped $data
PREPROS::mount(string|array $patterns)
PREPROS::exportFile(string|array $absolutePath)
PREPROS::getExportedFiles(): string[]
PREPROS::fstat(string $path)          // stat a file in the WASM FS (or false)
PREPROS::backtraceFile()              // path of the page currently rendering
```

#### `PREPROS::render(string $file)`

Internal method called once per source file. Orchestrates the full pipeline:

1. Resolves PHPDOC metadata and auto-loads data files.
2. Fires the `pre_render` hook with the raw source contents.
3. Includes `before.php` (wrapped in the `pre_before` / `post_before` hooks), the page body (or `@content`, see [above](#content-and-indent)), and `after.php` (wrapped in `pre_after` / `post_after`) into a single string.
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

Supports the full GitHub Flavored Markdown subset, plus a few extensions:

- ATX (`#` … `######`) and Setext headings, with auto-generated `id` attributes
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
- **Footnotes** — `[^1]` references and `[^1]: …` definitions (multi-paragraph)
- **Definition lists** — `Term` / `: Definition`
- **Emoji shortcodes** — `:rocket:` → 🚀, from a built-in map (see `MD::registerEmoji()`)
- **Sanitized inline HTML** — raw tags are filtered against an allowlist of tags and attributes, not passed through verbatim

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
MD::registerEmoji(string $shortcode, string $char): void   // `:name:` → char
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

Uses PHP 8.4's `Dom\HTMLDocument` (Lexbor engine) to parse the input and re-serialize it with consistent 4-space indentation. Inline elements, `<script>`, and `<style>` blocks are handled correctly — their content is indented but not reformatted. A `<pre><code>` block is shifted to its nesting depth too (relative indentation kept), and the leading run is stripped again before display; a bare `<pre>` and `<textarea>` stay byte-for-byte. Boolean HTML5 attributes (`muted`, `autoplay`, `noopener`, etc.) are written without a value.

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

### SCHEMA

A pure-PHP, dependency-free JSON Schema validator — Draft-7 style, with an
Ajv-like API. Used internally to validate structured data, but available to your
own code and plugins.

```php
$validator = new SCHEMA(array $schema);

$validator->isValid(mixed $data): bool     // true / false
$validator->validate(mixed $data): bool    // alias of isValid()
$validator->getErrors(): string[]          // "path: message" strings from the last run
```

Supported keywords: `type`, `required`, `properties`, `patternProperties`,
`additionalProperties`, `items`, `minItems`, `maxItems`, `uniqueItems`,
`minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `exclusiveMinimum`,
`exclusiveMaximum`, `minProperties`, `maxProperties`, `enum`, `const`,
`anyOf`, `allOf`, `oneOf`, `not`, `format`, and local `$ref` pointers.

```php
$validator = new SCHEMA([
    'type'     => 'object',
    'required' => ['name', 'age'],
    'properties' => [
        'name' => ['type' => 'string', 'minLength' => 1],
        'age'  => ['type' => 'integer', 'minimum' => 0],
    ],
    'additionalProperties' => false,
]);

if (!$validator->isValid($data)) {
    foreach ($validator->getErrors() as $err) echo $err, PHP_EOL;
}
```

---

### LD

A **schema.org JSON-LD generator**. `LD` accumulates structured-data nodes for
the page under render and emits them as one
`<script type="application/ld+json">` block — with an `@graph` when there is more
than one node — in the `<head>`.

#### Automatic mode

Opt in by adding a top-level `jsonld:` block to `kirigami.yaml` (a sibling of
`kirigami:`, not nested under it) — an empty `jsonld: {}` is enough. A
`post_render` hook then injects a graph built from that block, the loose keys of
the `kirigami` block, and the current page's PHPDOC:

- an `Organization` node (`@id` `#organization`) — `name`/`url`/`description`
  from `project`/`baseurl`/`description`, `sameAs` gathered from every
  recognised social-network URL key (`facebook`, `instagram`, `linkedin`,
  `github`, `youtube`, `mastodon`, …), plus `email`, `telephone`, `areaServed`
  (← `area`), `knowsAbout` (← `knowsabout`), `address`, `logo`, and `founder` →
  the Person node when there is one. `@type` comes from `jsonld.type`;
- a `Person` node (`#person`) when `person` is set — `name` + `jobTitle`
  (← `jobtitle`) + `email` + `url`, linked to the Organization via `worksFor`;
- a `WebSite` node (`#website`) — `publisher` → Organization, `inLanguage`,
  `keywords` (← `keywords`), and a `SearchAction` when `jsonld.search` is set;
- a `WebPage` node for the page — see the per-page tags below;
- a `BreadcrumbList` for every non-home page, derived from the `_index.php`
  ancestor trail (home → each parent section → this page). No `@breadcrumb`
  opt-in needed — it is always attempted while the `jsonld:` block is on.
  Disable it for one page with `@ld_breadcrumb false`.

Remove the `jsonld:` block (or set `jsonld: false` / `jsonld: { auto: false }`)
to stop the automatic pass. A page whose rendered `<head>` already contains an
`application/ld+json` script is never touched, so hand-rolled markup keeps
working.

**Per-page PHPDOC tags** — these feed the page node (and override the generic
`@title` / `@description` / `@datePublished` fallbacks):

| Tag | Effect |
|-----|--------|
| `@ld false` | Skip JSON-LD for this page entirely (`@ld_ignore true` also works). |
| `@ld_type <Type>` | `@type` of the page node — `AboutPage`, `ContactPage`, `CollectionPage`, `ProfilePage`, or a content type like `Article`, `Service`, `Recipe`, … (default `WebPage`). Types containing “Page” also get `primaryImageOfPage` + a `breadcrumb` link; others get a plain `image`. |
| `@ld_title <text>` | Page node `name` (default: `@title`). |
| `@ld_description <text>` | Page node `description` (default: `@description`). |
| `@ld_image <path>` | Page image, absolute or relative to `baseurl` (default: `@image` / `@ogimage`). |
| `@ld_published <date>` | `datePublished` (default: `@datePublished` / `@published` / `@date`). |
| `@ld_modified <date>` | `dateModified` (default: `@dateModified` / `@modified` / `@updated`). |
| `@ld_breadcrumb false` | No `BreadcrumbList` for this page. |

```php
/**
 * @title            À propos
 * @ld_type          AboutPage
 * @ld_title         À propos de Humain Humain
 * @ld_description   Notre approche ethnographique de la consultation.
 */
```

#### Explicit builders

Call these from a page template or from a `prepros.includes` file. Nodes added
this way are always emitted — with or without a `jsonld:` block — and share the
graph the automatic pass uses, so the two combine; a node with a stable `@id` is
merged on repeat calls.

```php
LD::add(string|array $type, array $props = [], ?string $id = null): array  // build + register a node
LD::node(string|array $type, array $props = []): array                      // build only, no register
LD::push(array $node): array                                                // register a ready-made node
LD::ref(string $id): array                                                  // ['@id' => …]  ('#person' → the Person node)
LD::remove(string $id): void
LD::graph(): array
LD::reset(): void

LD::organization(array $overrides = []): array   // config-aware, @id #organization
LD::person(array $overrides = []): array          // config-aware, @id #person
LD::website(array $overrides = []): array          // config-aware, @id #website
LD::webPage(array $overrides = []): array           // current-page-aware, @id …#webpage
LD::breadcrumb(?array $items = null, array $overrides = []): array   // items: [['name'=>…,'url'=>…], …]
LD::faqPage(array $qa, array $overrides = []): array                 // qa: ['Question ?' => 'Answer.', …]

LD::address(array|string $a): array
LD::image(string $url, ?string $id = null, ?int $w = null, ?int $h = null): array
LD::geo(float $lat, float $lng): array
LD::rating(int|float $value, ?int $count = null, $best = 5, $worst = 1): array
LD::offer(array $o): array
LD::contactPoint(array $c): array
LD::searchAction(string $urlTemplate): array

LD::script(bool $pretty = true): string   // <script>…</script>, and disables auto-injection
LD::json(bool $pretty = true): string     // the document, no wrapper
```

Every other schema.org type is reachable through `__callStatic` — the method
name is upper-cased to form the `@type`:

```php
LD::recipe([ 'name' => 'Tarte aux pommes', 'recipeYield' => '6', 'prepTime' => 'PT30M' ]);
LD::event([ 'name' => 'Vernissage', 'startDate' => '2026-10-01T18:00' ]);
LD::softwareApplication([ 'name' => 'Kirigami', 'applicationCategory' => 'DeveloperApplication' ]);

LD::article([
    'headline'      => $title,
    'datePublished' => '2026-09-01',
    'author'        => LD::ref('#person'),
    'image'         => LD::image('images/cover.webp'),
    'publisher'     => LD::ref('#organization'),
]);
```

Same API from procedural code: `ld_add()`, `ld_node()`, `ld_ref()`,
`ld_organization()`, `ld_person()`, `ld_website()`, `ld_web_page()`,
`ld_breadcrumb()`, `ld_faq_page()`, `ld_script()`, `ld_json()`.

#### `jsonld` config

`jsonld:` is a **top-level** block of `kirigami.yaml` (a sibling of `kirigami:`,
`prepros:`, …), and its presence is what **switches automatic injection on**. An
empty `jsonld: {}` is enough — everything is then derived from the `kirigami`
block's loose keys. Adding keys overrides those inferences; all are optional.

```yaml
kirigami:
  project:  Humain Humain
  baseurl:  https://humainhumain.com
  person:   Méralie Murray-Hall
  jobtitle: Anthropologue
  facebook: https://www.facebook.com/humainhumainconsultation.ethnographie/

jsonld:                                   # top-level; the block being present is
  type: ProfessionalService               #   the switch — `jsonld: {}` also works
  lang: fr-CA                              # inLanguage on WebSite / WebPage (default: en)
  logo: assets/logo.png                    # absolute, or relative to baseurl
  knowsAbout: [Ethnographie, Recherche qualitative]
  address:
    addressLocality: Québec
    addressCountry:  CA
  search: https://humainhumain.com/?q={search_term_string}
```

| Key | Type | Description |
|-----|------|-------------|
| `auto` | `bool` | Inject the `<script>` automatically. Default `true` **once the `jsonld:` block exists**. Set `auto: false` (or `jsonld: false`) to keep the block for its config values but stop the automatic injection — `LD::script()` / `ld_script()` can still place it by hand. |
| `type` | `string` | `@type` for the main entity — `Organization`, `ProfessionalService`, `LocalBusiness`, … |
| `name` / `url` / `description` | `string` | Main-entity / WebSite fields. Default to `project` / `baseurl` / `description`. |
| `logo` / `image` | `string` | Absolute URL or path relative to `baseurl`. `image` defaults to `logo`. |
| `sameAs` | `string[]` | Profile URLs, merged with the social-network URL keys found loose in the block. |
| `email` / `telephone` | `string` | Default to the loose `email` / `telephone` keys. |
| `address` | `map` | `PostalAddress` properties. |
| `areaServed` | `string` | Defaults to the loose `area` key. |
| `knowsAbout` / `keywords` | `string[]` | Default to the loose `knowsabout` / `keywords` keys. |
| `person` | `string` \| `map` | The `#person` node. A string is the name; a map takes any `Person` property. Defaults to `person` + `jobtitle` + `email`. |
| `lang` | `string` | BCP-47 tag for `inLanguage`. Default `en`. |
| `search` | `string` | URL template for a sitelinks `SearchAction`; must contain `{search_term_string}`. |

---

### META

A **`<head>` SEO / social metadata generator** — the companion to [`LD`](#ld).
Where `LD` emits a schema.org `application/ld+json` graph, `META` emits the plain
tags a browser and a link-preview crawler read: `<title>`, `<meta name="…">`,
`<meta property="og:…">`, `<meta name="twitter:…">`, and a handful of `<link>`s.

It draws on the same sources, in this order of precedence: the page's PHPDOC, the
top-level `meta:` block, then the loose `kirigami:` keys and the `jsonld:` block.
Every tag is emitted **only when it can be resolved** — no value, no tag — and a
tag the page's layout already writes by hand is detected and skipped, so it drops
in beside an existing `header.php` without duplicating anything.

**Automatic mode** is opt-in: the top-level `meta:` block (empty `meta: {}` is
enough) turns on injection into every page's `<head>`, right before `</head>`.

```yaml
kirigami:
  project:     Humain Humain
  baseurl:     https://humainhumain.com
  tagline:     Ethnographie au service des organisations
  description: A social-science consultancy using ethnography for organisational change.
  keywords:    [ethnographie, consultation publique, sciences sociales]
  author:      Maxime Larrivée-Roy

jsonld:  {}                       # META reads its logo / image / lang / person too
meta:                             # top-level; the block being present is the switch
  twitter: "@humainhumain"
  themeColor: "#0b7285"
```

Per-page, from the PHPDOC block — each falls back to the generic page tag:

| Tag | Feeds | Default |
|-----|-------|---------|
| `@meta false` | skip metadata for this page entirely | — (`@meta_ignore true` also works) |
| `@meta_title` | `<title>`, `og:title`, `twitter:title` | `@title` |
| `@meta_description` | `description`, `og:description`, `twitter:description` | `@description` / `@abstract` / `@excerpt` / `@summary`, then the site `description` |
| `@meta_keywords` | `<meta name="keywords">` | `@keywords`, then `meta.keywords` |
| `@meta_image` | `og:image`, `twitter:image` | `@image` / `@ogimage`, then `meta.image` |
| `@meta_robots` | `<meta name="robots">` | `@robots`, then `meta.robots` |
| `@meta_type` | `og:type` | `@og_type`, then `meta.ogType` |
| `@canonical` | `<link rel="canonical">` | derived from the file path + `baseurl` |

**Manual builders** — always emitted (with or without a `meta:` block), still
de-duplicated against the page:

```php
META::tag(string $name, ?string $content): void   // name= , or property= for an og:* key
META::link(string $rel, string $href, array $attrs = []): void
META::raw(string $html): void                       // a verbatim, already-valid tag line
META::tags(string $html = ''): string               // the whole block, \n-joined
META::reset(): void
```

```php
META::tag('twitter:image', 'https://humainhumain.com/card.png');
META::tag('og:image:alt', 'The Humain Humain team at work');
META::link('icon', './favicon.svg', ['type' => 'image/svg+xml']);
```

Same API from procedural code: `meta_tag()`, `meta_link()`, `meta_raw()`,
`meta_tags()`.

#### `meta` config

`meta:` is a **top-level** block of `kirigami.yaml` (a sibling of `kirigami:`,
`jsonld:`, `prepros:`, …). All keys are optional.

| Key | Type | Description |
|-----|------|-------------|
| `auto` | `bool` | Inject the tags automatically. Default `true` **once the `meta:` block exists**. `auto: false` (or `meta: false`) keeps the block for its values but stops the injection — `META::tags()` / `meta_tags()` can place them by hand. |
| `titleFormat` | `string` | `<title>` template for a normal page. Tokens `{title}`, `{project}`, `{tagline}`. Dangling separators from an empty token are trimmed. Default `{title} — {project}`. |
| `titleFormatHome` | `string` | Title template when the page has no `@title` (home / section landings). Default `{project} — {tagline}`. |
| `description` | `string` | Default description for pages with no `@description` / `@abstract`. Defaults to the `jsonld` / loose `description`. |
| `keywords` | `string[]` \| `string` | Default `keywords` content (list or comma string). Defaults to the `jsonld` / loose `keywords`. |
| `robots` | `string` | Default robots directive. Default `index, follow`. `robots: false` omits the tag. |
| `language` | `string` | BCP-47 tag → `<meta name="language">` and, dash→underscore, `og:locale`. Defaults to `jsonld.lang` / loose `lang` / `language`, then `en`. |
| `generator` | `string` \| `false` | `<meta name="generator">`. Default `Kirigami`; `false` omits it. |
| `author` / `designer` | `string` | Default to the loose `author` / `designer` keys (author also falls back to the `jsonld` person's name). `designer` is not emitted unless set. |
| `themeColor` | `string` | `<meta name="theme-color">`. Not emitted unless set. |
| `image` | `string` | Default `og:image` / `twitter:image` — absolute URL or path relative to `baseurl`. Defaults to `jsonld.image` → `jsonld.logo` → loose `image` / `ogimage`. |
| `ogType` | `string` | Default `og:type`. Default `website`. |
| `twitterCard` | `string` | `twitter:card` type. Default `summary_large_image`. |
| `twitter` | `string` \| `map` | Handle for `twitter:site` / `twitter:creator`. A bare string (with/without `@`, or a profile URL) fills both; a map takes `site` / `creator` separately. |
| `canonical` | `bool` | Emit `<link rel="canonical">`. Default `true`. |
| `favicon` / `appleTouchIcon` / `humans` | `string` \| `bool` | `<link rel="icon">` / `rel="apple-touch-icon"` / `rel="author"`. A path sets it (page-relative when a bare filename); `true` forces the default file (`favicon.ico` / `apple-touch-icon.png` / `humans.txt`); omitted, the default file is auto-detected on disk at the source root; `false` disables it. |

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

Image manipulation helper. GD handles JPEG, PNG, GIF, WebP and AVIF directly;
anything GD can't decode (HEIC, TIFF, BMP, and the vector formats SVG, EPS, AI,
PDF) falls back to Imagick, which rasterizes it to a GD image in memory. Vector
files with no intrinsic pixel size are rasterized at 2000&nbsp;px on the longest
side, preserving the aspect ratio.

```php
$img = new IMG(string $file);

// Properties
$img->width   // int
$img->height  // int

// Instance methods (resize/save are chainable)
$img->resize(int $width, int $height = 0, bool $cover = false): self
$img->save(string $dest, ?int $quality = null): self       // quality 0-100 for jpg/webp/avif; null = per-format default (82)
$img->getRepresentativeColors(int $count = 5): string[]   // ['#rrggbb', …]

// Static helpers
IMG::asset(string $path, int $width = 0, int $height = 0, bool $cover = false): string  // same feature as the <img asset> tag and the img-asset() Sass function
IMG::palette(string $path, int $colors = 5): string[]
```

`resize()` operates in *contain* mode by default (scales to fit within the target box while preserving aspect ratio). Pass `$cover = true` to crop and fill the exact target dimensions.

`save()` infers the output format from the file extension (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.avif`) and marks the file as a build output.

```php
// Build a 1200×630 cropped Open Graph image next to the original
(new IMG('/project/src/images/hero.jpg'))
    ->resize(1200, 630, true)
    ->save('/project/src/images/hero-og.jpg');
```

`IMG::asset()` and `IMG::palette()` are what back kirigami-core's `img-asset()`
and `colors()` Sass functions: they resolve `$path` against `image.source` from
`kirigami.yaml`, generate a resized/re-encoded file under `image.dest` (only
when missing or stale), or return a `CACHE`-backed list of representative
colours. Both are equally usable from your own PHP.

`IMG::asset()` is the single implementation behind the [`<img asset>` tag](#built-in-tags)
too — the tag is just a thin wrapper. Generated files are named after the source
plus a dimension suffix: `-<W>w`, `-<H>h`, `-<W>x<H>`, or `-<W>x<H>-cover`, with
the `image.format` extension (e.g. `hero.jpg` + `width="800"` → `hero-800w.webp`).
`@kirigami/kirigami`'s Sass `img-asset()` / `colors()` functions produce the same
files from the same config through this same class, via
[`processImages()`](#processimagesjobs) — one engine, no native dependency.

---

### FS

Filesystem utilities.

```php
FS::dig(string $glob): iterable          // recursive glob, yields file paths
FS::getRelativePath(string $from, string $to): string
FS::phpFileInfo(string $file): object|false  // parse PHPDOC annotations
FS::getChildren(string $backtrace = ''): object[]  // child _index.php pages, ordered by @position
FS::getBreadcrumb(string $backtrace = ''): object[]  // ancestor _index.php pages, top-most first (opt-in via @breadcrumb)
FS::rmdir(string $dir, bool $removeSelf = true): bool
FS::pathJoin(string ...$parts): string   // URL-aware path join with .. resolution
```

`FS::dig()` is the workhorse of directory-wide builds — it recursively walks a glob pattern and yields every matching file path.

`FS::phpFileInfo()` parses the first PHPDOC block of a PHP file and returns its `@tag value` pairs as a `stdClass`. This is used internally to resolve page metadata and data-file annotations.

`FS::getChildren()` (procedural: `fs_get_children()`) — usable only during a render — scans the folders directly below the calling template, keeps the ones that contain an `_index.php`, and returns one `stdClass` per child: the parsed PHPDOC of that `_index.php` plus a `->file` key with its absolute path. Entries are ordered by `@position` ascending (a page with no `@position` sorts as `999999`), then by folder name (natural, case-insensitive). Handy for building a section index or a navigation menu:

```php
<?php foreach (fs_get_children() as $page): ?>
  <li><a href="<?= FS::getRelativePath(__DIR__, dirname($page->file)) ?>/"><?= $page->title ?></a></li>
<?php endforeach ?>
```

`FS::getBreadcrumb()` (procedural: `fs_get_breadcrumb()`) — also render-only — is the upward counterpart: it returns the calling page's breadcrumb trail. It only produces output when the calling file opts in with `@breadcrumb true` (or `@breadcrumb 1`) in its first PHPDOC block, otherwise it returns `[]`. From the folder **above** the caller's own folder (a page is never part of its own trail), it walks the parent directories upward and collects the `_index.php` of each, stopping at the source root or at the first ancestor `_index.php` that carries no active `@breadcrumb` tag — that page acts as a separator and is left out. Directories without an `_index.php` are skipped without breaking the chain. Entries come back ordered from the top-most ancestor down to the nearest parent, each a `stdClass` (parsed PHPDOC of its `_index.php` plus a `->file` key with its absolute path):

```php
<nav aria-label="Breadcrumb">
<?php foreach (fs_get_breadcrumb() as $crumb): ?>
  <a href="<?= FS::getRelativePath(__DIR__, dirname($crumb->file)) ?>/"><?= $crumb->title ?></a>
<?php endforeach ?>
</nav>
```

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
STR::normalize(string $str): string
STR::slug(string $str, string $sep = ''): string
```

`STR::replaceTags()` is the engine behind `PREPROS::registerTag()`. It finds all occurrences of `<tagname ...>...</tagname>` in an HTML string and replaces each with the return value of `$callback($fullMatch, $attrs, $body)`.

`STR::trimIndent()` strips the common leading whitespace from a multi-line string — handy when pulling content out of indented `<markdown>` blocks.

`STR::is_url()` checks whether a string parses as a URL with a recognized scheme (`http`, `https`, `ftp`, `ftps`, `ssh`, `ssl`, `sftp`, `itunes`).

`STR::html_entities_decode()` trims a string and decodes its HTML entities — handy when normalizing text scraped from a third-party page.

`STR::shorthash()` returns the first 12 characters of a string's SHA-256 hash — used internally as a stable, filename-safe cache key (see `SCRAPER`).

`STR::normalize()` applies Unicode NFD decomposition and strips combining marks (`é` → `e`) — the accent-folding step used by `slug()`.

`STR::slug()` normalizes, transliterates to ASCII, lowercases, and replaces every run of non-`[a-z0-9]` characters with `$sep` (empty by default → a compact identifier; pass `'-'` for a conventional hyphenated slug).

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

### Bundled polyfills

The WASM PHP build ships without `ext-intl`, so `@kirigami/php-prepros` bundles a
`Normalizer` polyfill (autoloaded like every other class). It provides the
standard `Normalizer::normalize()` / `Normalizer::isNormalized()` API and the
`Normalizer::NFC` / `NFD` / `NFKC` / `NFKD` (and `FORM_*`) constants — enough for
`STR::normalize()` and `STR::slug()` to fold accents. Prefer the `STR` helpers in
your own code; the polyfill is there so third-party snippets that call
`Normalizer` directly keep working.

---

### Procedural shortcuts (aliases)

Every static method of every class above is also exposed as a plain function by
`src/libraries/aliases.inc.php` (autoloaded — no `require` needed). Each alias is
named `<lowercase class>_<snake_case method>()` and does nothing but forward its
arguments, so the classes remain the canonical API. They exist to make page
templates and `kiri run` scripts read better:

```php
<?= md_to_html(file_get_contents('CHANGELOG.md')) ?>
<img src="<?= img_asset('hero.jpg', 1200, 630, true) ?>" alt="">
```

Every function has a complete PHPDoc block, so editor hover and autocomplete
surface the signature, parameters, and description.

| Class | Aliases |
|---|---|
| `PREPROS` | `prepros_render` · `prepros_sitemap` · `prepros_mount` · `prepros_fstat` · `prepros_export_file` · `prepros_get_exported_files` · `prepros_backtrace_file` · `prepros_register_tag` · `prepros_register_hook` · `prepros_run_hook` |
| `MD` | `md_to_html` · `md_register_plugin` · `md_unregister_plugin` · `md_get_registered_plugins` · `md_register_emoji` |
| `HTML` | `html_format` |
| `YAML` | `yaml_parse` · `yaml_parse_file` · `yaml_load_file` |
| `SCHEMA` | `schema` (factory) · `schema_validate` |
| `LD` | `ld_add` · `ld_node` · `ld_ref` · `ld_organization` · `ld_person` · `ld_website` · `ld_web_page` · `ld_breadcrumb` · `ld_faq_page` · `ld_script` · `ld_json` |
| `META` | `meta_tag` · `meta_link` · `meta_raw` · `meta_tags` |
| `CACHE` | `cache_get` · `cache_set` · `cache_delete` · `cache_purge` |
| `IMG` | `img_asset` · `img_palette` |
| `FS` | `fs_dig` · `fs_get_relative_path` · `fs_php_file_info` · `fs_rmdir` · `fs_path_join` |
| `STR` | `str_htmlesc` · `str_replace_tags` · `str_parse_html_attributes` · `str_trim_indent` · `str_is_url` · `str_html_entities_decode` · `str_shorthash` · `str_normalize` · `str_slug` |
| `ARR` | `arr_find_key` |
| `CURL` | `curl_url_exists` · `curl_get_info` · `curl_get_contents` |
| `SCRAPER` | `scraper_get` |
| `OBF` | `obf_encode` · `obf_decode` |
| `STD` | `std_succeed` · `std_error` |

Notes:

- `register_tag()` / `register_hook()` are kept as unprefixed aliases of
  `prepros_register_tag()` / `prepros_register_hook()`.
- `img_asset()` resolves the generated URL relative to the file that calls it,
  exactly like `IMG::asset()`.
- `schema_validate(array $schema, mixed $data, ?array &$errors = null): bool`
  fills `$errors` with the validation messages.
- `yaml_parse()` / `yaml_parse_file()` are only defined when the PECL `yaml`
  extension isn't already providing them.

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

The built-in [`<markdown>` and `<img asset>` tags](#built-in-tags) are registered
this way.

---

### PREPROS hooks

Hooks let you intercept and transform data at key points in the rendering pipeline:

```php
PREPROS::registerHook(string $hookName, callable $callback): void
```

| Hook | When it fires | `$data` type | Expected return |
|------|---------------|--------------|-----------------|
| `boot` | Once per process, right after bootstrap (config loaded, `includes` pulled in), before any page renders. Fires for every entrypoint. | `stdClass $config` | ignored |
| `page_info` | After PHPDOC parsing, before rendering (auto-loads `.yaml`/`.json`/`.md` annotations) | `[$filePath, $pageObject]` — see note | `$pageObject` (modified) |
| `pre_render` | Before PHP execution | Raw file contents as `string` | `string` |
| `pre_before` | Just before the `before` include (inside its output buffer — `echo` to prepend to the header) | `before` config path as `string\|null` | ignored |
| `post_before` | Right after the `before` include, on the captured header | Header `string` | `string` |
| `pre_after` | Just before the `after` include (inside its output buffer — `echo` to prepend to the footer) | `after` config path as `string\|null` | ignored |
| `post_after` | Right after the `after` include, on the captured footer | Footer `string` | `string` |
| `post_render` | After tag processing, before `HTML::format()` | Assembled HTML `string` | `string` |

Multiple callbacks can be registered for the same hook — they are executed in registration order, each receiving the return value of the previous one.

> Built-in `page_info` + `post_render` callbacks power [`LD`](#ld) and
> [`META`](#meta): `page_info` captures the page under render, `post_render`
> injects the JSON-LD `<script>` and the `<meta>`/`<link>` block into its
> `<head>`. Your own callbacks run after them.

> **`page_info` payload shape.** The hook *fires* with `[$filePath, $pageObject]`,
> but each callback is expected to return the `$pageObject` alone — so a callback
> registered after the built-ins receives the bare object, not the pair. Handle
> both: `$page = is_array($p) ? $p[1] : $p;` (the current page path is always
> available as `PREPROS::$file`).

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

The `<markdown>` tag is one of the [built-in tags](#built-in-tags) (alongside
`<img asset>`), registered as a PREPROS tag out of the box. It converts its inner
content from Markdown to HTML and strips common leading indentation so you can
write cleanly inside your PHP templates:

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

## Requirements

- Node.js `>= 24.0.0`
- npm `>= 10.2.3`
- ESM only (`"type": "module"`)

---

## License

MIT © Maxime Larrivée-Roy, 2026
