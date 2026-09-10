<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/kirigami

The `kiri` CLI — the command-line entry point of the **Kirigami** static site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/kirigami)](https://www.npmjs.com/package/@kirigami/kirigami)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)

</div>

---

## Overview

`@kirigami/kirigami` installs the **`kiri`** command. It reads a single
`kirigami.yaml` at the project root and drives the whole build: it renders PHP
pages to HTML through [`@kirigami/php-prepros`](https://www.npmjs.com/package/@kirigami/php-prepros)
(PHP running in WebAssembly — no PHP install), bundles JavaScript with esbuild,
compiles Sass with Dart Sass, generates `sitemap.xml`, runs project PHP scripts,
and exports a fully static site ready to deploy.

This package is **CLI-only** — it exposes no JavaScript API. Its only package
`exports` are `./package.json` and `./schema` (the JSON schema for
`kirigami.yaml`).

Part of the **Kirigami** project ecosystem.

---

## What's new in 1.1.5

- **Readable task failures.** When a task fails, `kiri` now prints the error
  message, the page it came from, and the tail of the PHP `stderr` / debug
  output — instead of `undefined`. PHP warnings and notices from a render no
  longer fail the build: they are printed under a `Warnings:` heading and the
  build carries on.
- Bundles [`@kirigami/php-prepros`](https://www.npmjs.com/package/@kirigami/php-prepros)
  **1.4.0** (see its changelog: `<pre>` formatting, default Markdown plugins,
  structured render errors, multi-line PHPDOC, breadcrumb/children from a
  layout, build-time `###YEAR###` expansion, and more).

---

## Table of contents

- [@kirigami/kirigami](#kirigamikirigami)
  - [Overview](#overview)
  - [What's new in 1.1.5](#whats-new-in-115)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [Quick start](#quick-start)
  - [Commands](#commands)
    - [`kiri build`](#kiri-build)
    - [`kiri export`](#kiri-export)
    - [`kiri watch`](#kiri-watch)
    - [`kiri run <script>`](#kiri-run-script)
    - [`kiri create <template>`](#kiri-create-template)
    - [`kiri cache purge`](#kiri-cache-purge)
    - [`kiri phpinfo`](#kiri-phpinfo)
  - [Configuration — `kirigami.yaml`](#configuration--kirigamiyaml)
    - [`kirigami:`](#kirigami)
    - [`prepros:`](#prepros)
    - [`image:`](#image)
    - [`plugins:`](#plugins)
    - [`esbuild:` / `sass:`](#esbuild--sass)
    - [`export:`](#export)
    - [`scripts:`](#scripts)
    - [`tasks:`](#tasks)
  - [Build tasks](#build-tasks)
    - [esbuild](#esbuild-task)
    - [sass](#sass-task)
    - [prepros](#prepros-task)
    - [dist](#dist-task)
  - [Sass functions](#sass-functions)
  - [The banner](#the-banner)
  - [Continuous deployment](#continuous-deployment)
  - [Dependencies](#dependencies)
  - [Requirements](#requirements)
  - [License](#license)

---

## Installation

```bash
npm install -D @kirigami/kirigami
```

The `kiri` binary is then available through `npx kiri` or an npm script.

```bash
npx kiri --help        # global help
npx kiri --version     # kiri + embedded PHP version
```

| Global flag | Description |
|---|---|
| `--help`, `-h` | Show global help (or `kiri <command> --help` for a command). |
| `--version`, `-v` | Print the `kiri` version and the bundled PHP-WASM version. |

---

## Quick start

1. Add a `kirigami.yaml` at the project root:

```yaml
# yaml-language-server: $schema=https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json
kirigami:
  project: My Site
  baseurl: https://mysite.com
  root:    src

prepros:
  before: _layouts/header.php
  after:  _layouts/footer.php
  format: true
```

2. Write `_*.php` pages under `src/` (or wherever `root` points).
3. `npx kiri watch` for development, `npx kiri export` to ship.

---

## Commands

| Command | Summary |
|---|---|
| `kiri build` | Compile the project for development (run every task once). |
| `kiri export` | Compile + export a production-ready static site. |
| `kiri watch` | Watch project files and rebuild on change. |
| `kiri run <script>` | Run a PHP script from `scripts/` in the Kirigami runtime. |
| `kiri create <template>` | Scaffold a new project from an official template. |
| `kiri cache purge [mask]` | Purge the local `.node.db` / `.cache.db` / `.cookie.txt` caches. |
| `kiri phpinfo` | Print `phpinfo()` from the embedded PHP-WASM runtime. |

Every command has its own `--help`.

### `kiri build`

Reads `kirigami.yaml` and runs every declared `tasks` entry **once**, in order.
If a `prepros` block is present, a forced `prepros` task is prepended (renders
all pages + `sitemap.xml`). Fires the `before-build` script trigger first. Only
tasks whose type supports building run, unless the task sets `force: true`.
Output is written next to each entry, under `kirigami.root`.

### `kiri export`

Production build. Runs `before-export` then `before-build` triggers, prepends a
forced `prepros` task (if configured) and a forced `dist` task, runs **every**
task with `force`, then fires `after-export`. The `dist` task copies
`kirigami.root` into `export.path` (default `dist/`), and the banner is stamped
onto every exported `.js` / `.css` / `.html` file.

### `kiri watch`

Dev mode. Attaches a file watcher to every task whose type supports watching
(`esbuild`, `sass`, `prepros`). Changes are debounced (150 ms) and batched per
task. `node_modules/`, `.git/` and `dist/` are always ignored. `Ctrl+C` closes
every watcher cleanly.

### `kiri run <script>`

Executes `scripts/<script>.php` inside the same sandboxed PHP-WASM environment
used for rendering, via `runenv()` from `@kirigami/php-prepros` — the full PHP
class library is available and `kirigami.yaml`'s `kirigami` block is exposed as
`PREPROS::$config->data`. Extra words after the script name are forwarded as
`$argv` entries. Declare a matching `scripts:` entry in `kirigami.yaml` to
`mount` extra files or to fire the script automatically via `trigger`.

```bash
kiri run convert-images
kiri run deploy production --force
```

### `kiri create <template>`

Scaffolds a project from an official template — a GitHub repository named
`template-<name>` under the [`php-kirigami`](https://github.com/php-kirigami)
organization.

| Flag | Description |
|---|---|
| `--list`, `-l` | List available templates (cached 1 h in `~/.config/kirigami/kiri.db`). |
| `--help`, `-h` | Show help. |

```bash
kiri create --list
kiri create blog my-blog
```

The template `.tar.gz` is downloaded and unpacked with a zero-dependency tar
parser (Node has no zip API). The target directory must be empty — **unless** it
already contains a `package.json`, in which case the template's `package.json`
is deep-merged into it (existing values always win), and `npm install` is run.
`.cache.db`, `.node.db`, `.cookie.txt` and `package-lock.json` are never copied.

### `kiri cache purge`

Clears the working caches Kirigami leaves at the project root: `.node.db`
(kirigami-core's cache — `@kirigami/sdk`, `node:sqlite`), `.cache.db` (the PHP
`CACHE` class) and `.cookie.txt` (the `CURL` / `SCRAPER` cookie jar).

| Invocation | Effect |
|---|---|
| `kiri cache purge` | Deletes the `.node.db`, `.cache.db` and `.cookie.txt` files (whichever exist). |
| `kiri cache purge <mask>` | Keeps the files, but deletes every cache **key** matching `<mask>` in both SQLite stores. |

`<mask>` is a glob against the key namespace (`meta_*`, `colors_*`, `font_*`, …).
Runs against the current working directory.

```bash
kiri cache purge
kiri cache purge meta_*
kiri cache purge "colors_*"
```

| Flag | Description |
|---|---|
| `--help`, `-h` | Show help. |

### `kiri phpinfo`

Prints `phpinfo()` from the embedded PHP-WASM runtime — handy to check the
available PHP version and extensions.

| Flag | Description |
|---|---|
| `--md`, `-m` | Output Markdown instead of HTML. |
| `--json`, `-j` | Output JSON instead of HTML. |
| `--help`, `-h` | Show help. |

```bash
kiri phpinfo > phpinfo.html
kiri phpinfo -m > phpinfo.md
```

---

## Configuration — `kirigami.yaml`

Every project **must** have a `kirigami.yaml` at its root. It is validated
against [`kirigami.schema.json`](./kirigami.schema.json) (the same schema
editors use for autocompletion — also exported as `@kirigami/kirigami/schema`)
and then checked imperatively. `kiri` throws on any unknown key, wrong type, or
missing required property.

```yaml
kirigami:
  project:     My Website
  baseurl:     https://example.com
  root:        src
  banner:      assets/banner.txt
  # any other key → PHP variable of the same name
  author:      Jane Doe
  gtag:        G-XXXXXXXXXX
  description: A short description of the site.
  keywords:    [static site, php]

prepros:
  before:   _layouts/header.php
  after:    _layouts/footer.php
  format:   true
  network:  false
  mountext: [.svg, .webp]
  includes: [_lib/functions.php]

image:
  format: webp          # webp | avif
  source: assets/images # relative to cwd()
  dest:   images        # relative to kirigami.root

plugins:
  - name: "@kirigami/plugin-highlight"
    active: true
    options: {}

esbuild:
  # minify: false
sass:
  # style: expanded

export:
  path:   dist
  ignore: ["*.psd", "notes/"]

scripts:
  - name: convert-images
    mount: ["assets/images/**/*.jpg"]
    trigger: before-build   # before-build | before-export | after-export

tasks:
  - { name: js-core,   type: esbuild, entry: scripts/kiri.core.js }
  - { name: scss-core, type: sass,    entry: styles/kiri.core.scss }
```

### `kirigami:`

| Key | Required | Description |
|---|---|---|
| `project` | ✅ | Site name. Printed in the CLI banner, exposed as `$project`. |
| `baseurl` | ✅ | Deployed root URL, no trailing slash (stripped if present). Used for absolute `<loc>` entries in `sitemap.xml`, exposed as `$baseurl`. |
| `root` | ✅ | Directory (relative to the project root) holding your `_*.php` pages. All task `entry` paths and prepros rendering are relative to it. Build fails if it doesn't exist. |
| `banner` | – | Path to a text file stamped as a license/copyright banner on exported `.js`/`.css`/`.html`. May contain the `###DATE###` token (→ French-formatted date). Falls back to an auto-generated banner. |
| *(anything else)* | – | Free-form data (string, number, boolean, list, map). Every key becomes a PHP variable of the same name in page templates, `before`/`after`, and `prepros.includes` files. |

### `prepros:`

Declaring this block (even empty) auto-prepends a forced `prepros` task on every
build/export/watch.

| Key | Type | Default | Description |
|---|---|---|---|
| `before` | string | – | PHP file (relative to `root`) included before every page body. |
| `after` | string | – | PHP file included after every page body. |
| `format` | boolean | `false` | Pretty-print the HTML (4-space indent, via `HTML::format()`). |
| `network` | boolean | `false` | Allow outbound HTTP(S) inside the WASM runtime (remote `@tag` fetches, `CURL`/`SCRAPER`). |
| `mountext` | string[] | `[]` | Extra file extensions auto-mounted into the virtual FS, on top of `.php .json .yaml .yml .md .db .txt`. |
| `includes` | string[] | `[]` | PHP files `include_once`'d before any page renders — the place to register tags/hooks/MD plugins. |

### `image:`

Options for the built-in image autogenerator. The same config drives every entry
point into it: the `img-asset()` / `colors()` Sass functions (below), and — on
the PHP side — [`IMG::asset()` / `IMG::palette()`](https://www.npmjs.com/package/@kirigami/php-prepros#img)
and the `<img asset="…">` tag in page templates. Optional — defaults apply even
when the block is absent.

| Key | Default | Description |
|---|---|---|
| `format` | `webp` | Output format: `webp` or `avif`. |
| `source` | `assets/images` | Source image folder, relative to `cwd()`. |
| `dest` | `images` | Output folder for generated images, relative to `kirigami.root`. |

### `plugins:`

List of Kirigami plugins (see [`@kirigami/sdk`](https://www.npmjs.com/package/@kirigami/sdk)).

| Key | Required | Description |
|---|---|---|
| `name` | ✅ | Plugin package name. Must match `@kirigami/plugin-*`, `<scope>/kirigami-plugin-*`, or `kirigami-plugin-*`. |
| `active` | ✅ | Whether the plugin is loaded. |
| `options` | – | Free-form object passed to the plugin. |

### `esbuild:` / `sass:`

Free-form objects merged straight into every `esbuild` / `sass` task call —
refer to esbuild's [`BuildOptions`](https://esbuild.github.io/api/#build-api)
and Dart Sass's [`Options`](https://sass-lang.com/documentation/js-api/interfaces/options/).
Writing the key with nothing under it parses to `null`, equivalent to omitting
it. `sass:` additionally accepts `before` / `after` — arrays of extra `.scss`
files compiled respectively before and after the entry (paths relative to
`cwd()`).

### `export:`

| Key | Default | Description |
|---|---|---|
| `path` | `dist` | Output directory for `kiri export`, relative to the project root. |
| `ignore` | `[]` | Extra gitignore-style patterns (parsed with `ignore`) excluded from the copy, on top of Kirigami's built-in exclusions. |

### `scripts:`

| Key | Required | Description |
|---|---|---|
| `name` | ✅ | Must match `scripts/<name>.php`. Run with `kiri run <name> [args...]`. |
| `mount` | – | Glob patterns (relative to the project root) of extra files mounted into the sandbox before the script runs. |
| `trigger` | – | Fire automatically: `before-build` (start of `build` and `export`), `before-export` (very start of `export`), `after-export` (once `export` finished). |

### `tasks:`

Ordered list, run in array order, on top of the implicit `prepros` and `dist`
tasks.

| `type` | Purpose | Required fields | Optional |
|---|---|---|---|
| `esbuild` | Bundle/minify a JS/TS entry. Build + watch. | `name`, `type`, `entry` | `force` |
| `sass` | Compile a `.scss`/`.sass` entry. Build + watch. | `name`, `type`, `entry` | `force` |
| `prepros` | Render pages + `sitemap.xml`. Watch only (runs on build/export only when forced/implicit). | `name`, `type` | `target`, `force` |
| `dist` | Copy `root` into an output dir. Forced/implicit only. | `name`, `type`, `path` | `ignore`, `force` |

---

## Build tasks

### esbuild task

Bundles and minifies the entry (`bundle: true`, `minify: true`,
`treeShaking: true`, `target: es2020`, `.json` loader, `template-literal`
lowering disabled). Output: `<entry>.min.js` next to the entry, plus a
`.map` outside of `kiri export`. Extra options from the top-level `esbuild:`
block are merged in.

### sass task

Compiles with Dart Sass (`style: compressed`), minified again with `csso` on
export. Output: `<entry>.min.css` next to the entry, plus a `.css.map` outside
of `kiri export`. Resolves `@use`/`@forward` through Sass's
`NodePackageImporter` **and** a custom package importer that also accepts an
implicit `styles/` prefix (so `@use '@scope/pkg/x'` finds `@scope/pkg/styles/x`)
and falls back to the global `npm root -g`. `sass.before` / `sass.after` and the
`@kirigami/sdk` hooks `SASS_BEFORE` / `SASS_AFTER` / `SASS_FUNCTIONS` let other
packages contribute files and functions.

### prepros task

Calls `render()` then `sitemap()` from `@kirigami/php-prepros`. With `target`
set, only that file or subdirectory (relative to `root`) is rendered. Does not
run during a plain `kiri build` unless forced — the implicit task added by the
`prepros:` block always is.

### dist task

Empties `path`, then copies `kirigami.root` into it preserving structure.
**Excluded:** anything whose name starts with `_` or `.`, `.scss` files, `.map`
files, and non-minified `.js` files, plus every `export.ignore` pattern. The
project banner is stamped onto copied `.js` / `.css` (`/*! … */`) and `.html`
(`<!-- … -->`) files. Token replacements in output: `###YEAR###` and
`###TIMESTAMP###` in `.html`, `###TODAY###` in `sitemap.xml`.

---

## Sass functions

Available in every `sass` task, in addition to anything contributed through the
`SASS_FUNCTIONS` hook (native functions always win a signature collision):

| Function | Returns | Description |
|---|---|---|
| `inline-file($path)` | `url(...)` | Base64 data-URI of a file (relative to `cwd()`), cached per compile. |
| `img-asset($path, $width: null, $height: null, $cover: false)` | `url(...)` | Registers a source image for the autogenerator and returns the generated asset's URL. Resize/encode runs through `@kirigami/php-prepros` (`processImages()` → the `IMG` class, GD/Imagick) — the same engine, config and output filenames as the PHP `IMG::asset()` / `<img asset>` tag. No native image dependency. |
| `colors($path, $count: 5)` | comma list of colors | Extracts `$count` representative colors from an image (median-cut in Lab space), cached in `.node.db`. |
| `font-weight-range($path)` | e.g. `100 900` | `font-weight` range of a (variable) font. |
| `font-stretch-range($path)` | e.g. `75% 125%` | `font-stretch` range. |
| `font-unicode-range($path)` | `U+…` list | `unicode-range` covering the font's character set. |
| `font-format($path)` | `woff2` / `truetype` / … | `format()` keyword for the font file. |
| `font-style-detect($path)` | `normal` / `italic` / `oblique …deg` | Detected font style (`slnt`/`ital` axes, `italicAngle`, subfamily name). |

---

## The banner

The banner text (from `kirigami.banner` or the auto-generated fallback
`Exported by Kirigami: <date>`) is stamped on exported `.js`, `.css` and `.html`
files. In the banner **file**, the token `###DATE###` is replaced with today's
date formatted in French (e.g. `Mardi le 9 septembre 2026 à 14 h 30`).

---

## Continuous deployment

Kirigami ships an official reusable GitHub Action,
[`php-kirigami/kiribuild`](https://github.com/php-kirigami/kiribuild), that runs
`kiri export` and deploys — typically to GitHub Pages — on every push:

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: php-kirigami/kiribuild@v1
```

---

## Dependencies

| Package | Role |
|---|---|
| [`@kirigami/canva`](https://www.npmjs.com/package/@kirigami/canva) | Shared Sass/JS design system, resolved by the `sass` task's package importer. |
| [`@kirigami/php-prepros`](https://www.npmjs.com/package/@kirigami/php-prepros) | PHP → HTML compiler, `sitemap()`, `runenv()`, `processImages()` (the `img-asset()` / `colors()` engine). |
| [`@kirigami/php-wasm`](https://www.npmjs.com/package/@kirigami/php-wasm) | Embedded PHP runtime (via php-prepros; used directly for `kiri phpinfo` / `--version`). |
| [`@kirigami/sdk`](https://www.npmjs.com/package/@kirigami/sdk) | Hook registry + `Cache` (`.node.db`). |
| [`@kirigami/struct-walker`](https://www.npmjs.com/package/@kirigami/struct-walker) | Loads and resolves `kirigami.yaml`. |
| [`ajv`](https://ajv.js.org/) | `kirigami.yaml` schema validation. |
| [`sass`](https://sass-lang.com/) · [`csso`](https://github.com/css/csso) | Sass compilation + CSS minification. |
| [`esbuild`](https://esbuild.github.io/) | JS/TS bundling. |
| [`fontkit`](https://github.com/foliojs/fontkit) | Font metadata for the `font-*()` Sass functions. |
| [`chokidar`](https://github.com/paulmillr/chokidar) · [`picomatch`](https://github.com/micromatch/picomatch) · [`ignore`](https://github.com/kaelzhang/node-ignore) | File watching / glob matching / export exclusions. |
| [`@octokit/rest`](https://github.com/octokit/rest.js) | Template listing for `kiri create`. |

---

## Requirements

- Node.js `>= 24.0.0`
- npm `>= 10.2.3`

---

## License

MIT © Maxime Larrivée-Roy, 2026
