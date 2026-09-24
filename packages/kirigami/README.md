<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/kirigami

The programmatic build engine of the **Kirigami** static site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/kirigami)](https://www.npmjs.com/package/@kirigami/kirigami)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

For the cross-package execution model, see [Internal execution](../../docs/INTERNALS.md). The [Project API reference](../../docs/API.md) covers return values, failures, and resource ownership; the [user guide](../../docs/USER-GUIDE.md) provides a minimal site walkthrough.

The core engine loads `kirigami.yaml`, validates configuration, registers plugins, renders PHP pages, runs asset tasks, and exposes build, export, watch, and preview operations through `Project`.

Use [the CLI](../cli/README.md) for terminal commands. This package is the programmatic integration point for the Kirigami ecosystem.

---

## What's new in 3.0.2

- Ships `@kirigami/php-prepros` 3.0.1: a registered tag written inside
  Markdown code (an inline code span or a fenced block), such as a
  `<markdown>` or `<img asset>` example, is shown as written instead of
  being processed.

---

## What's new in 3.0.1

- `kiri create` also writes `.vscode/extensions.json` when the template has
  none: it recommends the Kirigami VS Code extension and the tools the
  official templates use. The starter `.vscode/settings.json` no longer
  configures Live Server, which is now listed as unwanted.

---

## 3.0.0 — breaking

- **Breaking: the `kiri` command moved to
  [`@kirigami/cli`](https://www.npmjs.com/package/@kirigami/cli).** This
  package is now the programmatic engine only and no longer installs a `kiri`
  executable. Scripts such as `npx kiri build`, and `package.json` scripts
  calling `kiri`, fail until the CLI is installed. Migration:

  ```bash
  npm install -D @kirigami/cli        # in each site; keeps @kirigami/kirigami as its engine
  npm install -g @kirigami/cli        # only if you ran a globally installed kiri
  ```

  The commands and their options are unchanged. Keep `@kirigami/kirigami` as a
  dependency if your code imports the `Project` API.
- **Export only empties directories it created.** Export writes a
  `.kirigami-export` marker into its output. An existing non-empty output
  directory without that marker is refused instead of emptied: after
  upgrading, the first export into an existing `dist/` fails once. Empty the
  directory, or create an empty `.kirigami-export` file in it to confirm it may
  be replaced. Export also refuses any destination that contains the project.
- **Update your plugins with the core.** A plugin that still bundles
  `@kirigami/sdk` older than 0.3.0 gets its own copy of the SDK next to this
  engine's, and its hooks would never run; loading now fails with
  `npm install <plugin>@latest` instead of building without them. The
  plugins released with 3.0.0 require it (`kirigami.minVersion: 3.0.0`).
- **Duplicate task names are rejected**, including a plugin task injected via
  `tasks:register` with the same name as a `kirigami.yaml` task.
- **`seo.jsonld` is now an on/off switch, not a sub-block** (matching
  `@kirigami/php-prepros`): its keys move up into `seo:`, and `seo.language`
  is renamed `seo.lang`. The old shapes fail validation with a message saying
  so. JSON-LD is now on whenever `seo:` exists; `seo.jsonld: false` turns it off.
- `Project.validate()` no longer replaces a loaded project's configuration;
  call `reload()` to apply a change.

---

## What's new in 2.0.0

- **Breaking: `kirigami.schema.json` now requires `seo:` instead of the old
  `meta:` / `jsonld:` blocks** (bumped for
  [`@kirigami/php-prepros`](https://www.npmjs.com/package/@kirigami/php-prepros)
  **2.0.0**'s matching config merge — see its own changelog for the full
  migration note and rationale). The `kiri` CLI itself is unchanged; this is a
  major bump because upgrading validates any existing `kirigami.yaml` still
  using `meta:`/`jsonld:` as an unrecognised property and fails the build —
  a real break for real projects, even though no CLI code moved. Migration:
  rename `meta:` to `seo:`, and move `jsonld:`'s content under it as
  `seo.jsonld:`.

---

## What's new in 1.5.7

- Cascade dependency bump to
  [`@kirigami/canva`](https://www.npmjs.com/package/@kirigami/canva) **2.6.0**
  — the new `styles/lightswitch` animated theme toggle and `.palette--compact`.

---

## What's new in 1.5.6

- **`kiri serve` gives a direct fix for a taken port** instead of a raw
  Node crash: `Port 4321 on 127.0.0.1 is already in use — try a different
  one with --port 4322.`
- **`kiri serve` hot-injects CSS with no full reload.** A `sass`-only
  rebuild now sends a named `css` event instead of the default full-reload
  one — every `<link rel=stylesheet>` is swapped for a cache-busted copy
  (new one loaded before the old one is removed, no flash), so scroll
  position and form state survive a stylesheet-only change. `esbuild` /
  `prepros` rebuilds still trigger a full reload.
- `kiri create --help` (and the READMEs) now mention every template ships
  its own `CLAUDE.md` — Claude Code-ready out of the box.

---

## What's new in 1.5.5 / 1.5.4

Dependency bumps: [`@kirigami/php-prepros`](https://www.npmjs.com/package/@kirigami/php-prepros)
**1.9.2** (1.5.5) and [`@kirigami/canva`](https://www.npmjs.com/package/@kirigami/canva)
**2.5.1** (1.5.4) — see each package's own changelog.

---

## What's new in 1.5.3

- **`kiri serve`** (1.5.0) — everything `kiri watch` does, plus a static file
  server over `kirigami.root` and browser hot-reload over Server-Sent Events
  (zero-dependency — no live-reload framework bundled). See
  [`kiri serve`](../cli/README.md#kiri-serve).
- **`kiri install <plugin>`** (1.5.0) — installs a plugin (`npm install`,
  devDependency by default) and prints the `plugins:` entry to paste into
  `kirigami.yaml`, built from the plugin's own `kirigami.optionsSchema`. A
  bare name (`highlight`) resolves against the `@kirigami/plugin-*` /
  `kirigami-plugin-*` conventions. See [`kiri install`](../cli/README.md#kiri-install-plugin).
- **Plugin loader** (1.2.0) — `plugins:` in `kirigami.yaml` resolves each
  entry from the project's `node_modules` (falling back to kiri's own),
  checks the plugin's `kirigami.minVersion`, merges its options, and calls
  its default export at the top of every build/export/watch. Three official
  first-party plugins now exist:
  [`@kirigami/plugin-highlight`](https://www.npmjs.com/package/@kirigami/plugin-highlight)
  (build-time syntax highlighting),
  [`@kirigami/plugin-extlink`](https://www.npmjs.com/package/@kirigami/plugin-extlink)
  (external link preview cards) and
  [`@kirigami/plugin-embed`](https://www.npmjs.com/package/@kirigami/plugin-embed)
  (YouTube/Vimeo oEmbed cards).
- **Banner from a template** (1.4.2) — the banner text has its `### ###`
  tokens (`###DATE###`, `###YEAR###`, `###PROJECT###`, `###AUTHOR###`,
  `###EMAIL###`, `###REPO###`, `###BASEURL###`) filled from the `kirigami:`
  block on every build/export, not just at export time; a bundled ASCII
  template is used when no `banner:` file is set. `kiri create` also gained
  `--email` / `--repo` and drops a starter `banner.txt`.
- Readable task failures (1.1.5): a failing task prints the error message,
  the page it came from, and the tail of PHP `stderr` — instead of
  `undefined`. PHP warnings/notices no longer fail the build.
- Ongoing dependency bumps to
  [`@kirigami/php-prepros`](https://www.npmjs.com/package/@kirigami/php-prepros)
  — now at **1.9.1**; see its own changelog for `META`/`LD`/managed `<head>`/
  the `{% img-asset %}` Markdown plugin and more.

---

## Table of contents

- [@kirigami/kirigami](#kirigamikirigami)
- [Overview](#overview)
- [What's new in 3.0.2](#whats-new-in-302)
- [What's new in 3.0.1](#whats-new-in-301)
- [3.0.0 — breaking](#300--breaking)
- [What's new in 2.0.0](#whats-new-in-200)
- [What's new in 1.5.7](#whats-new-in-157)
- [What's new in 1.5.6](#whats-new-in-156)
- [What's new in 1.5.5 / 1.5.4](#whats-new-in-155--154)
- [What's new in 1.5.3](#whats-new-in-153)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Programmatic API](#programmatic-api)
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
  - [esbuild task](#esbuild-task)
  - [sass task](#sass-task)
  - [prepros task](#prepros-task)
  - [dist task](#dist-task)
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

This installs the engine for JavaScript imports. For terminal commands, install `@kirigami/cli` and use `npx kiri`; see [the CLI reference](../cli/README.md).

---|---|
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
3. Create the referenced layout files, install `@kirigami/cli`, then run `npx kiri build` and `npx kiri serve`. Use `npx kiri export` for production output.

---

## Programmatic API

`@kirigami/kirigami` is the engine. The `kiri` binary belongs to [`@kirigami/cli`](../cli/README.md); [MCP](../mcp/README.md) and [VS Code](../vscode/README.md) also use this API.

```js
import { load } from '@kirigami/kirigami';

// Launch this process from the directory containing kirigami.yaml.
const project = await load();
const result = await project.build();
if (!result.success) throw new Error(JSON.stringify(result));

const server = await project.serve({ port: 0, initialBuild: false });
console.log(server.url);
// Call await server.close() when the preview is no longer needed.
```

Exports: `Project`, `load()`, and `Kirigami.load()`. There is no static `Project.load()`.
The package ships `index.d.ts` declarations for these exports, project
configuration, operation results, task metadata, notifications, and lifecycle
handles.

Project scaffolding (what `kiri create`, the VS Code *Create Project* command
and the MCP `kirigami_create_project` tool run) is exported too, as plain
functions that need no loaded project — `listTemplates()`, `createProject()`,
`installDependencies()` and helpers. Import them from
`@kirigami/kirigami/create` to skip loading the engine. See
[the API reference](../../docs/API.md#project-scaffolding).

| Member | Contract |
|---|---|
| `reload()` | Reload configuration and register plugins again; invalidate PHP configuration, mounts/runtime, and plugin includes. Returns the project. |
| `validate()` | Re-read and validate configuration without reloading plugins; resolves to `true` or throws. A loaded project keeps its current configuration (including plugin-injected tasks); call `reload()` to apply changes. |
| `build()` | Run `before-build`, implicit rendering, and buildable or forced tasks. Returns `{ success, trigger, results }`. |
| `export({ path }?)` | Run export/build triggers, implicit rendering and copy, eligible explicit tasks, then `after-export`. Returns `success`, `dist`, trigger results and task results. A path override remains in the loaded config. |
| `serve({ port, host, onBuildResult }?)` | Start watching and serving; returns `{ address, port, url, close() }`. Defaults to loopback and port 4321; port 0 selects a free port. |
| `watch()` | Start file watchers; returns `{ close() }`. |
| `run(name, argv?)` | Execute `scripts/<name>.php` and return the PHP result. Missing scripts can throw. |
| `runTask(name)` | Run one named task without build triggers or other tasks. |
| `config` / `plugins` | Current configuration and activated plugin metadata. Returned objects are not immutable snapshots. |
| `tasks` / `scripts` | Discover configured/implicit tasks and available PHP scripts with metadata. |

Inspect `success` as well as catching exceptions. A resolved promise is not necessarily a successful build. Task results include `task`, `type` and `taskname` plus task-specific output.

The development server denies dot/underscore-prefixed path components and `.php`, `.phtml`, `.phar`, `.scss`, and `.sass` sources (extensions are case-insensitive). Requested names and canonical symlink/junction targets must both be public and remain within the source root; custom `404.html` content follows the same checks. Denied paths return 404. Dot-prefixed public directories such as `.well-known` are also excluded. JavaScript and source maps remain available for local debugging. These filesystem checks do not isolate the server from concurrent hostile local filesystem changes.

The development server returns 400 for malformed URL path encodings or NUL pathnames. File-read and stream failures return 500 before headers are sent; failures after partial output close that response. These failures do not stop subsequent requests. Missing pages use `404.html` when available, otherwise the built-in 404 response.

Watch tasks process additions, changes, file removals, and directory removals. A modified page (`_*.php`) re-renders only itself, or its whole directory with `prepros.deep: true`; a modified layout, include or other non-page PHP file re-renders the whole site and sitemap; a modified data file (`.yaml`/`.yml`/`.md`/`.json`) re-renders its directory. PHP additions/removals reset the runtime and rebuild the whole site and sitemap; HTML belonging to removed/renamed page sources tracked since watcher startup is deleted. Unrelated HTML is preserved; historical orphan outputs without a source at watcher startup are not swept. JavaScript/Sass dependencies are rebuilt on addition/removal; failed builds retain their previous bundles.

`serve()` and `watch()` await watcher readiness and release acquired resources if startup fails. Closing discards pending events and waits for active callbacks before finishing; callbacks that never settle can delay shutdown.

`serve()` and `watch()` build once before acquiring server/watch resources. Pass `{ initialBuild: false }` to skip this when output is already current. A failed initial build rejects with diagnostics in `error.result`. Initial serve notifications use `initial: true`, `rule: "initial-build"`, and `type: "build"`; their done event contains the full build result. `onBuildResult` receives `{ status: 'start', rule, type }` followed by `{ status: 'done', rule, type, ...result }` for completed watch callbacks. A thrown build callback or start observer produces a failed done notification. A rejecting done observer is logged without stopping later batches. Failed builds do not trigger browser reloads.

Current limitations: one project per process, working directory established **before importing the engine**, and shared plugin registries. Await project operations in sequence; only PHP-prepros operations/resets are internally serialized. `reload()` refreshes PHP configuration, mounts, network mode, and plugin includes, but JavaScript plugin code remains subject to Node's module cache (restart after code changes). Repeated watcher setup preserves the configured task list; the implicit PHP rule is added only to the local watch-rule list (A12 fixed). See [the audit](../../docs/AUDIT-2026-09-20.md) for reproductions.

An empty `prepros: {}` supports rendering without layout files. PHP warnings
remain nonfatal and appear on the prepros task entry in `results`, including
warnings from rendering and sitemap generation. Diagnostics are kept out of
generated HTML; a failed sitemap preserves the preceding render diagnostics.

Export rejects equal, ancestor, or descendant source/output paths before clearing the destination, including symlink/junction aliases. PHP files (case-insensitive `.php`) and dot-prefixed directories are excluded from the copy. Add `export.ignore` rules for any other project-specific private files. The development server denies private/source paths and checks canonical link targets, while allowing JavaScript and source maps for debugging. It is intended for loopback use.

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
| `banner` | – | Path to a text file stamped as a comment header on exported `.js`/`.css`/`.html`. Keeps its `### ###` tokens on disk (`###DATE###`, `###PROJECT###`, `###AUTHOR###`, `###EMAIL###`, `###REPO###`, `###BASEURL###`) — kiri fills them each build. With no file set, a bundled template is used. See [The banner](#the-banner). |
| `author`, `email`, `repo` | – | Free-form, but read by the banner (and `email` / `author` by the `META` / `LD` classes). `kiri create` fills these; `repo` also auto-derives from a `*.github.io` base URL. |
| *(anything else)* | – | Free-form data (string, number, boolean, list, map). Every key becomes a PHP variable of the same name in page templates, `before`/`after`, and `prepros.includes` files. |

### `prepros:`

Declaring this block (even empty) auto-prepends a forced `prepros` task on every
build/export/watch.

| Key | Type | Default | Description |
|---|---|---|---|
| `before` | string | – | PHP file (relative to `root`) included before every page body. |
| `after` | string | – | PHP file included after every page body. |
| `deep` | boolean | `false` | Watch/serve: a modified page (`_*.php`) re-renders its whole directory instead of just itself. Layout/include changes always re-render the whole site. |
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

An active plugin can also register a runnable script via the `scripts:register`
hook from `@kirigami/sdk`, without a `scripts:` entry: a `name` runnable the
same way, an absolute `file` path to the plugin's own `.php` file, and an
optional `trigger`/`mount`. A project's own `scripts/<name>.php` always wins
over a plugin registering the same name. See the SDK README's hook table.

### `tasks:`

Ordered list, run in array order, on top of the implicit `prepros` and `dist`
tasks. Common entries use `esbuild` or `sass`. The schema also accepts explicit `prepros` tasks (`target`, `force`) and `dist` tasks (`path`, `ignore`, `force`); non-buildable types need `force: true` for a one-shot build. See [Build tasks](#build-tasks).

An active plugin can register additional task types with
`registerTaskType()` from `@kirigami/sdk`. Plugin-task entries require `name`
and `type`; their remaining fields and imperative validation belong to the
plugin. Plugins load before Kirigami performs the final strict task validation,
so an unregistered type still fails configuration loading.

A plugin can also inject the task entry itself via the `tasks:register` hook
— no `tasks:` entry needed in kirigami.yaml at all. See the SDK README's hook
table.

| `type` | Purpose | Required fields | Optional |
|---|---|---|---|
| `esbuild` | Bundle/minify a JS/TS entry. Build + watch. | `name`, `type`, `entry` | `force` |
| `sass` | Compile a `.scss`/`.sass` entry. Build + watch. | `name`, `type`, `entry` | `force` |

---

## Build tasks

`esbuild` and `sass` are the tasks you declare in `tasks:`; `prepros` and
`dist` are added automatically (the former whenever a `prepros:` block
exists, the latter during `kiri export`). Explicit tasks of those types are also supported.

Plugin-provided types participate in the same build, export, `runTask()`, and
watch paths. Their definitions use the SDK task-type registry; built-in names
take precedence and cannot be overridden.

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

Dot-prefixed public directories such as `.well-known` are excluded too; there is no exception mechanism in the current export filter.

Empties `path`, then copies `kirigami.root` into it preserving structure.
For safety, an existing non-empty `path` is only emptied if it contains the
`.kirigami-export` marker that every export writes; otherwise export fails
without touching it. `path` must also not contain the project directory.
**Excluded:** underscore- or dot-prefixed directories, files whose basename starts with `_` or `.`, `.php` files, `.scss` files, `.map`
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

A text file — `kirigami.banner` if set, otherwise kiri's **bundled ASCII
template** — is stamped as a comment header on every exported `.js`, `.css` and
`.html` file (and `sitemap.xml`). The file keeps its placeholder tokens on disk;
kiri fills them from the `kirigami` block on every build / export:

| Token | Value |
|---|---|
| `###DATE###` | today — English long date + 24h local time (`Tuesday, September 9, 2026 at 14:30`) |
| `###YEAR###` | current year |
| `###PROJECT###` | `kirigami.project` |
| `###AUTHOR###` / `###EMAIL###` | `kirigami.author` / `kirigami.email` |
| `###REPO###` | `kirigami.repo`, or the repo derived from a `*.github.io` base URL |
| `###BASEURL###` | `kirigami.baseurl` |

A line whose value(s) come out empty is dropped (`Author: Foo <>` →
`Author: Foo`; a bare `Github:` line disappears). `kiri create` drops a starter
`banner.txt` at the project root so you can edit the layout.

---

## Continuous deployment

Include a local `@kirigami/cli` dependency for the current API split. The sibling action’s global fallback still installs the old core package; that fallback requires migration.

Kirigami ships an official reusable GitHub Action,
[`php-kirigami/kiribuild`](https://github.com/php-kirigami/kiribuild)
(**v2**): it checks out nothing itself — the caller does — installs Node +
`kiri`, and runs `kiri export`. Everything else (committing back whatever the
build regenerated, uploading the Pages artifact, deploying) is wired by the
caller's own workflow, so it's explicit and easy to adapt:

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

Every official template (`kiri create`) ships this workflow already, at
`.github/workflows/page.yml` — copy it from there rather than retyping it.

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

---

## Requirements

- Node.js `>= 24.0.0`
- npm `>= 10.2.3`

---

## License

GPL-3.0-or-later © Maxime Larrivée-Roy, 2026
