<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# Kirigami

**A static site generator that turns PHP into fast, dependency-free HTML — no server required.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](#requirements)

</div>

---

## Overview

**Kirigami** lets you build static websites using a language you already know — **PHP** — and compiles them straight into clean, production-ready HTML. There's no server to provision, no runtime to patch, and no infrastructure to maintain: the PHP engine runs entirely in **WebAssembly** (via `@kirigami/php-wasm`), directly inside the Node.js process. You get the full expressiveness of PHP templating with the simplicity, speed, and portability of a static site.

Here's what Kirigami brings to your workflow:

- **Real PHP templating** — includes, loops, Markdown, YAML — compiled directly to clean HTML, no server needed at runtime.
- **Integrated asset pipeline** with esbuild for JS and Sass for styles, wired in from the start.
- **A `serve` mode with browser reload**, so changes show up instantly during development.
- **A single-command production export** — a fully static site ready to deploy anywhere (GitHub Pages, Netlify, any static host), complete with a license banner and an auto-generated sitemap.
- **Instant project scaffolding** from official templates via `kiri create`.
- **Scriptable automation**, running PHP scripts on demand or as build-pipeline hooks with `kiri run`.

Every project is driven by a single configuration file, `kirigami.yaml`, at the project root.

---

## Table of contents

- [Kirigami](#kirigami)
- [Overview](#overview)
- [Monorepo structure](#monorepo-structure)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [CLI commands](#cli-commands)
- [Configuration (`kirigami.yaml`)](#configuration-kirigamiyaml)
  - [`kirigami:` — core project settings](#kirigami--core-project-settings)
  - [`prepros:` — the PHP → HTML compiler](#prepros--the-php--html-compiler)
  - [`image:` — image autogenerator](#image--image-autogenerator)
  - [`plugins:` — Kirigami plugins](#plugins--kirigami-plugins)
  - [`esbuild:` / `sass:` — global build options](#esbuild--sass--global-build-options)
  - [`export:` — production export options](#export--production-export-options)
  - [`scripts:` — named PHP scripts](#scripts--named-php-scripts)
  - [`tasks:` — the build pipeline](#tasks--the-build-pipeline)
- [Continuous deployment](#continuous-deployment)
- [License](#license)
- [Author](#author)

---

## Monorepo structure

The current working tree includes the core/API split; these docs describe checked-in behavior, not registry publication status. [Known issues](docs/BUGS.md) and [the audit](docs/AUDIT-2026-09-20.md) track the remaining implementation defects.

This repository is an npm workspaces monorepo, organized as follows:

| Package | Description |
|---|---|
| [`packages/cli`](./packages/cli) | The `kiri` terminal interface. |
| [`packages/mcp`](./packages/mcp) | MCP tools for project discovery and operations. |
| [`packages/vscode`](./packages/vscode) | VS Code extension scaffold; activation/packaging remain under validation. |
| [`packages/kirigami`](./packages/kirigami) | The programmatic `Project` engine shared by the CLI, MCP server, and editor extension. |
| [`packages/php-prepros`](./packages/php-prepros) | The PHP → HTML compiler that powers the CLI (template rendering, sitemap generation, and more). |
| [`packages/php-wasm`](./packages/php-wasm) | A custom PHP WebAssembly build for Node.js (JSPI only, no browser support). |
| [`packages/struct-walker`](./packages/struct-walker) | Recursively walks YAML/JSON structures, resolving relative file references and converting assets to data URIs. |
| [`packages/sdk`](./packages/sdk) | Shared runtime for plugins: the hook registry and the on-disk `Cache`. |
| [`packages/canva`](./packages/canva) | Shared Sass/JS design system reused across Kirigami projects. |
| [`packages/plugin-highlight`](./packages/plugin-highlight) | Official plugin: build-time syntax highlighting (highlight.js), 0 runtime JS. |
| [`packages/plugin-extlink`](./packages/plugin-extlink) | Official plugin: external link preview cards, `SCRAPER`-backed, cached to disk. |
| [`packages/plugin-embed`](./packages/plugin-embed) | Official plugin: YouTube/Vimeo oEmbed video cards, resolved client-side. |

---

## Requirements

- Node.js `>= 24.0.0`
- npm `>= 10.2.3`

---

## Installation

Get the CLI via the [`@kirigami/cli`](./packages/cli) package:

```bash
npm install -D @kirigami/cli
```

That's it — the `kiri` command is ready to go (via `npx kiri` or an npm script).

---

## Quick start

Create every layout file referenced below relative to `kirigami.root`. Watch and serve do not perform an initial build. `kiri create` currently has dependency/banner lookup defects after the CLI split; use a template checkout until [A05](docs/AUDIT-2026-09-20.md) is fixed.

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
npx kiri build
npx kiri serve
```

4. Ship it! Export the fully static site for production:

```bash
npx kiri export
```

---

## CLI commands

| Command | Description |
|---|---|
| `kiri build` | Compiles the project for development (runs every configured task once, no minification/export step). |
| `kiri export` | Compiles and exports the project for production (runs eligible tasks plus implicit rendering and a static-file copy). |
| `kiri watch` | Starts dev mode: watches project files and rebuilds automatically on change. |
| `kiri serve` | Same as `kiri watch`, plus a local server and browser hot-reload (Server-Sent Events, no server framework). |
| `kiri run <script>` | Runs a PHP command script from the `scripts/` folder inside the Kirigami runtime. |
| `kiri create <template>` | Creates a new project from an official template — ships its own `CLAUDE.md`, Claude Ready out of the box. |
| `kiri install <plugin...>` | Installs a plugin and prints the `plugins:` entry to paste into `kirigami.yaml`. |
| `kiri cache purge [mask]` | Purges the local `.node.db` / `.cache.db` / `.cookie.txt` caches (or just the keys matching `mask`). |
| `kiri phpinfo` | Prints `phpinfo()` from the embedded PHP-WASM runtime. |

Every command comes with its own detailed help: `kiri <command> --help`.

---

## Configuration (`kirigami.yaml`)

The whole project is configured through a single `kirigami.yaml` file at the project root, validated against a [JSON schema](./packages/kirigami/kirigami.schema.json). Point your editor at it and enjoy full autocompletion:

```yaml
# yaml-language-server: $schema=https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json
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
  includes: [_lib/functions.php]
  before: _layouts/header.php
  after:  _layouts/footer.php


image:
  # format: avif        # webp | avif (default: webp)
  source: assets/images  # relative to cwd()          (default: assets/images)
  dest:   images         # relative to kirigami.root  (default: images)


plugins:
  - name: "@kirigami/plugin-highlight"
    active: true
    options: {}


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
    entry: scripts/kirigami.core.js

  - name:  scss-core
    type:  sass
    entry: styles/kirigami.core.scss
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

Declaring this block prepends a forced `prepros` task that renders pages and regenerates `sitemap.xml` and `robots.txt`. Set `before` and `after` to existing layout files: an empty block currently causes PHP warnings.

`prepros.head` controls managed asset/theme injection; set it to `false` to opt out. `prepros.types` maps page-type names to extra `before`/`after` wrappers, selected by a page’s `@type` annotation. The separate top-level `seo` block opts into managed metadata and can contain `jsonld`. See [the complete PHP configuration reference](packages/php-prepros/README.md#configuration--kirigamiyaml).

| Key | Description |
|---|---|
| `before` | PHP file (relative to `root`) included before every page's body — typically your `<head>`/layout opening. |
| `after` | PHP file included after every page's body — typically your layout closing. |
| `format` | Pretty-print the compiled HTML output (4-space indentation). Defaults to `false`. |
| `network` | Enable outbound HTTP(S) requests inside the sandboxed WASM runtime (needed for remote `@tag` fetches and cURL/scraper classes). Defaults to `false`. |
| `mountext` | Extra file extensions auto-mounted into the virtual filesystem, in addition to the built-in defaults (`.php`, `.json`, `.yaml`, `.yml`, `.md`, `.db`, `.txt`). |
| `includes` | PHP files `include_once`'d right after config load, before any page renders — the natural place to register tags/hooks/Markdown plugins. |

### `image:` — image autogenerator

Options for the built-in image autogenerator. One feature, four entry points that
share this config, one engine and the same output files: the `img-asset()` and
`colors()` Sass functions, the PHP `IMG::asset()` / `IMG::palette()` helpers, and
the `<img asset="…">` tag in page templates — all resize/encode through the `IMG`
class (GD/Imagick) in the WASM runtime, so there is no native image dependency.
Optional — the defaults below apply even when the block is absent.

| Key | Description |
|---|---|
| `format` | Output format for generated images: `webp` or `avif`. Defaults to `webp`. |
| `source` | Folder holding the source images, relative to `cwd()`. Defaults to `assets/images`. |
| `dest` | Destination folder for generated images, relative to `kirigami.root`. Defaults to `images`. |

### `plugins:` — Kirigami plugins

A list of plugins loaded through [`@kirigami/sdk`](./packages/sdk). Each entry's package name must match `@kirigami/plugin-*`, `<scope>/kirigami-plugin-*`, or `kirigami-plugin-*`.

| Key | Description |
|---|---|
| `name` | Plugin package name (following one of the naming conventions above). |
| `active` | Whether the plugin is loaded. |
| `options` | Free-form object passed to the plugin; its shape depends on the plugin. |

### `esbuild:` / `sass:` — global build options

Both are free-form objects passed straight through to the underlying build call, *after* Kirigami's own defaults (so they can override them): `esbuild:` maps to esbuild's own [`BuildOptions`](https://esbuild.github.io/api/#build-api), `sass:` to Dart Sass's own [`Options`](https://sass-lang.com/documentation/js-api/interfaces/options/). `sass:` also accepts `before` / `after` — arrays of extra `.scss` files compiled respectively before and after the entry (paths relative to `cwd()`). Leaving a block empty (as in the example above) is equivalent to omitting it entirely.

### `export:` — production export options

The destination is emptied before copying; keep it separate from the source tree. Exclusion is not a general private-file filter: non-underscore PHP helpers and hidden directories may be copied. Add explicit `export.ignore` rules for private source material.

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
| `prepros` | Renders pages + `sitemap.xml`. Watch only on a plain `kiri build`/`watch` — the implicit task added by the `prepros:` block is always forced. | `name` |
| `dist` | Copies `kirigami.root` into the export output dir. Added automatically by `kiri export`; explicit entries need `force: true` to build. | `name`, `path` |

---

## Continuous deployment

The sibling action currently falls back to installing `@kirigami/kirigami`. For the CLI split, include `@kirigami/cli` in the site’s dependencies so a local `kiri` exists. Verify the action migration before relying on its fallback.

Kirigami ships an official reusable GitHub Action, [`php-kirigami/kiribuild`](https://github.com/php-kirigami/kiribuild)
(**v2**) — published on the [**GitHub Marketplace**](https://github.com/marketplace/actions/kiribuild),
installable straight from a workflow file's Actions sidebar. The action itself
only installs Node + `kiri` and runs `kiri export` — checkout, committing back
whatever the build regenerated, and the actual Pages upload/deploy are wired by
the caller's own workflow steps, so the full flow stays explicit:

```yaml
# .github/workflows/page.yml
name: Build & Deploy
on:
  push: { branches: [main] }
permissions: { contents: write, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - uses: actions/checkout@v7

      - uses: php-kirigami/kiribuild@v2
        with:
          node-version: "24"

      - name: Commit regenerated files
        run: |
          if [ -n "$(git status --porcelain)" ]; then
            git config user.name  "kirigami[bot]"
            git config user.email "kirigami-bot@users.noreply.github.com"
            git add -A && git commit -m "chore: update generated files [skip ci]" && git push
          fi

      - uses: actions/upload-pages-artifact@v5
        with: { path: dist }

      - id: deployment
        uses: actions/deploy-pages@v5
```

Every official template (`kiri create`) already ships this workflow at
`.github/workflows/page.yml` — copy it from there. Check the
[action's own documentation](https://github.com/php-kirigami/kiribuild) for
its inputs.

---

## License

Most packages use MIT. The exceptions are `@kirigami/php-wasm` (GPL-2.0-or-later), `@kirigami/audiowaveform-wasm` (GPL-3.0-or-later), and `@kirigami/bestframe` (LGPL-2.1-or-later). See each package’s `LICENSE` and README for upstream notices.

---

## Author

MIT © Maxime Larrivée-Roy, 2026
