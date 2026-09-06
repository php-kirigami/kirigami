<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# Kirigami

**A static site generator that turns PHP into fast, dependency-free HTML — no server required.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.10.0-brightgreen)](#requirements)

</div>

---

## About

**Kirigami** lets you build static websites using a language you already know — **PHP** — and compiles them straight into clean, production-ready HTML. There's no server to provision, no runtime to patch, and no infrastructure to maintain: the PHP engine runs entirely in **WebAssembly** (via `@kirigami/php-wasm`), directly inside the Node.js process. You get the full expressiveness of PHP templating with the simplicity, speed, and portability of a static site.

Here's what Kirigami brings to your workflow:

- **Real PHP templating** — includes, loops, Markdown, YAML — compiled directly to clean HTML, no server needed at runtime.
- **Integrated asset pipeline** with esbuild for JS and Sass for styles, wired in from the start.
- **A `watch` mode with hot-reload**, so changes show up instantly during development.
- **A single-command production export** — a fully static site ready to deploy anywhere (GitHub Pages, Netlify, any static host), complete with a license banner and an auto-generated sitemap.
- **Instant project scaffolding** from official templates via `kiri create`.
- **Scriptable automation**, running PHP scripts on demand or as build-pipeline hooks with `kiri run`.

Every project is driven by a single configuration file, `kirigami.yaml`, at the project root.

## Monorepo structure

This repository is an npm workspaces monorepo, organized as follows:

| Package | Description |
|---|---|
| [`packages/kirigami`](./packages/kirigami) | The heart of the project: the `kiri` CLI (build, export, watch, run, create, phpinfo). |
| [`packages/php-prepros`](./packages/php-prepros) | The PHP → HTML compiler that powers the CLI (template rendering, sitemap generation, and more). |
| [`packages/php-wasm`](./packages/php-wasm) | A custom PHP WebAssembly build for Node.js (JSPI only, no browser support). |
| [`packages/struct-walker`](./packages/struct-walker) | Recursively walks YAML/JSON structures, resolving relative file references and converting assets to data URIs. |
| [`packages/canva`](./packages/canva) | Shared Sass/JS styles and scripts reused across Kirigami projects. |

## Requirements

- Node.js `>= 20.10.0`
- npm `>= 10.2.3`

## Installation

Get the CLI via the [`@kirigami/kirigami`](./packages/kirigami) package:

```bash
npm install -D @kirigami/kirigami
```

That's it — the `kiri` command is ready to go (via `npx kiri` or an npm script).

## Quick start

1. Drop a `kirigami.yaml` at the root of your project:

```yaml
kirigami:
  project: "My Site"
  baseurl: "https://mysite.com"
  root: "src"

prepros:
  before: "_layouts/header.php"
  after: "_layouts/footer.php"
  format: true
```

2. Write your `_*.php` pages inside the `src/` folder (or wherever `root` points).
3. Fire up dev mode and watch it come alive:

```bash
npx kiri watch
```

4. Ship it! Export the fully static site for production:

```bash
npx kiri export
```

## CLI commands

| Command | Description |
|---|---|
| `kiri build` | Compiles the project for development (runs every configured task once, no minification/export step). |
| `kiri export` | Compiles and exports the project for production (forces every task + copies static files). |
| `kiri watch` | Starts dev mode: watches project files and rebuilds automatically on change. |
| `kiri run <script>` | Runs a PHP command script from the `scripts/` folder inside the Kirigami runtime. |
| `kiri create <template>` | Creates a new project from an official template. |
| `kiri phpinfo` | Prints `phpinfo()` from the embedded PHP-WASM runtime. |

Every command comes with its own detailed help: `kiri <command> --help`.

## Configuration (`kirigami.yaml`)

The whole project is configured through a single `kirigami.yaml` file at the project root, validated against a [JSON schema](./packages/kirigami/kirigami.schema.json). Point your editor at it and enjoy full autocompletion:

```yaml
# yaml-language-server: $schema=https://cdn.jsdelivr.net/npm/@kirigami/kirigami/kirigami.schema.json
```

Here's a real-world example, showing most of the available sections:

```yaml
kirigami:
  project:     My Website
  baseurl:     https://example.com
  banner:      assets/banner.txt
  root:        src

  # Any extra key becomes a PHP variable available in every template

  author:      Jane Doe
  person:      John Smith
  jobtitle:    Founder
  email:       hello@example.com
  facebook:    https://www.facebook.com/example
  area:        Somewhere, Country
  gtag:        G-XXXXXXXXXX

  description: >
    A short description of the site, also exposed as $description.

  knowsabout:
    - Topic one
    - Topic two
  keywords:
    - keyword one
    - keyword two


prepros:
  format: true
  network: true
  # mountext: ['.webp']
  includes: [_layouts/functions.php]
  before: _layouts/header.php
  after:  _layouts/footer.php


esbuild:
#   minify: false

sass:
#   style: expanded


scripts:
  - name: convert-images-to-webp
    mount: ["assets/images/**/*.jpg"]
    trigger: before-build # before-build, before-export or after-export


tasks:
  - name:  js-core
    type:  esbuild
    entry: scripts/kiri.core.js

  - name:  scss-core
    type:  sass
    entry: styles/kiri.core.scss
```

### `kirigami:` — core project settings

| Key | Required | Description |
|---|---|---|
| `project` | ✅ | Human-readable project/site name. Printed in the CLI banner and available as `$project` in every template. |
| `baseurl` | ✅ | Root URL of the deployed site, no trailing slash. Used to build absolute `<loc>` entries in `sitemap.xml` and available as `$baseurl`. |
| `root` | ✅ | Path (relative to the project root) to the directory holding your `_*.php` source pages. All task `entry` paths and prepros rendering are relative to it. |
| `banner` | – | Path to a text file used as the license/copyright banner stamped on every exported `.js`/`.css`/`.html` file. May contain the `###DATE###` token, replaced at load time. Falls back to an auto-generated banner if omitted. |
| *(anything else)* | – | Free-form project data (string, number, boolean, list, or nested map). Every extra key is exposed as a PHP variable of the same name (`author` → `$author`, etc.) in page templates, `before`/`after` includes, and `prepros.includes` files. |

### `prepros:` — the PHP → HTML compiler

Just declaring this block (even empty) automatically prepends a forced `prepros` task that renders every page and regenerates `sitemap.xml`.

| Key | Description |
|---|---|
| `before` | PHP file (relative to `root`) included before every page's body — typically your `<head>`/layout opening. |
| `after` | PHP file included after every page's body — typically your layout closing. |
| `format` | Pretty-print the compiled HTML output (4-space indentation). Defaults to `false`. |
| `network` | Enable outbound HTTP(S) requests inside the sandboxed WASM runtime (needed for remote `@tag` fetches and cURL/scraper classes). Defaults to `false`. |
| `mountext` | Extra file extensions auto-mounted into the virtual filesystem, in addition to the built-in defaults (`.php`, `.json`, `.yaml`, `.yml`, `.md`, `.db`, `.txt`). |
| `includes` | PHP files `include_once`'d right after config load, before any page renders — the natural place to register tags/hooks/Markdown plugins. |

### `esbuild:` / `sass:` — global build options

Both are free-form objects passed straight through to the underlying build call: `esbuild:` maps to esbuild's own [`BuildOptions`](https://esbuild.github.io/api/#build-api), `sass:` to Dart Sass's own [`Options`](https://sass-lang.com/documentation/js-api/interfaces/options/). Leaving them empty (as in the example above) is equivalent to omitting the block entirely.

### `export:` — production export options

| Key | Description |
|---|---|
| `path` | Output directory for `kiri export`, relative to the project root. Defaults to `dist`. |
| `ignore` | Extra gitignore-style patterns of files/directories to exclude from the export copy. |

### `scripts:` — named PHP scripts

Each entry maps to a PHP file at `scripts/<name>.php`, runnable manually with `kiri run <name> [args...]` or fired automatically at a pipeline checkpoint.

| Key | Description |
|---|---|
| `name` | Script identifier — must match an existing `scripts/<name>.php` file. |
| `mount` | Glob patterns (relative to the project root) of extra local files to mount into the sandbox before the script runs. |
| `trigger` | Fires the script automatically: `before-build` (start of both `build` and `export`), `before-export` (very start of `export`), or `after-export` (once `export` has finished writing every task's output). |

### `tasks:` — the build pipeline

An ordered list of build tasks, run in array order — on top of the implicit `prepros` task (added automatically whenever the `prepros` block is present) and the implicit `dist` task (added automatically during `kiri export`).

| `type` | Purpose | Required fields |
|---|---|---|
| `esbuild` | Bundles/minifies a JS or TS entry point. Supports build & watch. | `name`, `entry` |
| `sass` | Compiles a `.scss`/`.sass` entry point, minified with csso on export. Supports build & watch. | `name`, `entry` |

## Continuous deployment

Kirigami ships an official reusable GitHub Action, [`php-kirigami/kiribuild`](https://github.com/php-kirigami/kiribuild), to build and deploy your site straight from CI — typically to GitHub Pages, on every push. Set it up once, and every push to `main` ships a fresh, fully rebuilt site.

A minimal workflow looks like this:

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: php-kirigami/kiribuild@v1
```

Check the [action's own documentation](https://github.com/php-kirigami/kiribuild) for the full list of inputs (export path, GitHub Pages deployment options, etc.).

## License

This project is distributed under the [MIT license](./LICENSE), except for the `@kirigami/php-wasm` package, which is distributed under **GPL-2.0-or-later** (see its [README](./packages/php-wasm/README.md)).

## Author

MIT © Maxime Larrivée-Roy, 2026