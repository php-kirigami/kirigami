# CLAUDE.md

Project context and working conventions for Kirigami. Committed to the repo so it
travels with the code and is shared across machines and contributors.

---

## What Kirigami is

**Kirigami** is a static site generator that compiles PHP page templates into
dependency-free static HTML, running PHP entirely in WebAssembly inside Node.js
(no PHP install, no server). It is aimed especially at GitHub Pages + GitHub
Actions.

- npm workspaces monorepo. Packages are published under the `@kirigami/*` scope.
- GitHub org `php-kirigami`, repo `php-kirigami/kirigami` (`origin`, branch `main`).
- The reusable CI action lives separately at `php-kirigami/kiribuild`.
- Sole author / maintainer: Maxime Larrivée-Roy.
- Every project that uses Kirigami is driven by one `kirigami.yaml` at its root,
  validated against `packages/kirigami/kirigami.schema.json`.

### Packages (`packages/`)

| Package | Ver | Role |
|---|---|---|
| `@kirigami/kirigami` | 1.1.5 | the `kiri` CLI: build / export / watch / run / create / phpinfo. No native deps: the `sass` task's `img-asset()`/`colors()` run through php-prepros `processImages()` (was `sharp`, removed 2026-09-10). 1.1.5: `printTaskError()` — failures show message + page + stderr tail, PHP warnings no longer fail the build |
| `@kirigami/php-prepros` | 1.4.0 | PHP→HTML compiler + PHP class library (PREPROS, MD, HTML, YAML, SCHEMA, LD, CACHE, IMG, FS, STR, ARR, CURL, SCRAPER, OBF, STD; + bundled `Normalizer` polyfill). `LD` (new 1.3.0) = schema.org JSON-LD generator; injects `<script type="application/ld+json">` into `<head>`, **opt-in via a top-level `jsonld:` block** (sibling of `kirigami:`; empty `jsonld: {}` enough; then reads the `kirigami:` loose keys too). JS exports: `render`/`sitemap`/`runenv`/`mountPath`/`processImages`. 1.4.0 = DX fix pass: `HTML::format()` keeps `<pre>`/`<textarea>` verbatim; `md.plugins.php` auto-loaded (default `{% %}` plugins on); `catch(Throwable)` + structured errors (`error`/`page`/`where`), warnings non-fatal; PHPDOC multi-line values + prose `@word` ignored; `FS::getBreadcrumb()`/`getChildren()` anchored on `PREPROS::$file` (work from a layout/partial/helper); `{% tag %}` literal inside code spans; `IMG` clamps instead of upscaling; `###YEAR###`/`###TIMESTAMP###`/`###TODAY###` expanded at render (not just export); `page_info` hook accepts `[$file,$info]` or bare `$info` |
| `@kirigami/php-wasm` | 8.5.10-5 | custom PHP 8.5.10 WASM build, JSPI + Node only, fork of WordPress Playground; now includes Imagick (wasm ~22 MB) |
| `@kirigami/struct-walker` | 1.0.4 | recursive YAML/JSON walker: resolves nested file refs, converts assets to data URIs |
| `@kirigami/sdk` | 0.1.0 | plugin hook registry (`on`/`run`/`HOOKS`) + `Cache` (SQLite via `node:sqlite`) |
| `@kirigami/canva` | 1.1.1 | shared Sass/JS design system; published & public like the rest (was private until 2026-09-10); still WIP. 1.1.0 adds optional light/dark theming to `conf` (`$dark` + `$theme: auto\|class\|both`, built-in dark palette from `assets/chart/chart.html`) + `scripts/theme` (`data-theme` toggle, persists to `localStorage`). 1.1.1: `--font-size` is `clamp($font-min .. $font-base)` (was floorless `min()`); new `$font-min` default 17 |
| `packages/plugin-highlight` | — | WIP first real plugin (`@kirigami/plugin-highlight`): highlight.js SCSS themes. Dir renamed from `plugin-hljs` 2026-09-10 |

### Licensing

Everything is **MIT** *except* `@kirigami/php-wasm`, which is
**GPL-2.0-or-later** (inherited from WordPress Playground upstream).

Quirk: `@kirigami/php-wasm`'s version number encodes the bundled PHP version
(`8.5.10-4` → PHP 8.5.10, build 4), so the PHP version is visible in
`package.json`.

---

## Code conventions

Match these when writing code in this repo.

- **Comments and READMEs: English.** All code comments and README prose are
  written in English (a full FR→EN translation pass over hand-written
  `packages/*` source was done 2026-09-09). Deliberately still French: everything
  under `assets/kiri/` (an old standalone CLI copy, left untouched), commit
  messages (Québécois), `todo.md`, and `utils.js` `formatFrDate()` (intentional
  fr-CA output). User-facing CLI strings are English.
- **ESM only.** Every JS package is `"type": "module"`; use `import`/`export`,
  never CommonJS. Tab indentation in the newer JS (sdk, tasks).
- **Node version: `>=24.0.0` for every package.** All `packages/*/package.json`
  `engines.node`, plus every README Node badge and "Requirements" line, must say
  `>=24.0.0`.
- **Stay lite — minimise dependencies, no native deps.** The cache is
  `node:sqlite` (not better-sqlite3); the PHP JSON-schema validator is pure PHP
  (not ajv); `kiri create` extracts tarballs with a hand-rolled tar parser +
  `node:zlib` rather than a zip lib, and shells out to `npm install` via
  `execSync` rather than adding `@npmcli/arborist`; image resize/encode for the
  `sass` task goes through the WASM `IMG` class (php-prepros `processImages()`),
  not `sharp`. When a task needs a lib, first check whether a `node:` builtin or
  ~30 lines of code covers it.
- **Dev machine is Windows** (PowerShell primary); watch for path separators —
  helpers normalize `path.sep` to `/` in many spots.

---

## README template

`packages/php-prepros/README.md` is the **canonical template** every other
`packages/*` README (and the root `README.md`) is based on. Structure, in order:

1. `<div align="center">` block:
   - `<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />`
   - `---`
   - `# @kirigami/<name>` (h1)
   - one-line description, with **Kirigami** bolded
   - badges: npm version, license, Node.js version (php-wasm adds a PHP badge).
     All packages are published & public, canva included.
   - `</div>`
2. `---`
3. `## Overview` — 2-3 short paragraphs; last line ties into the Kirigami ecosystem.
4. `---`
5. `## Table of contents` — nested bullet list with `#anchor` links (use exactly
   this heading, not "Contents").
6. `---`
7. `## What's new in X.Y.Z` — optional.
8. Content sections, **each separated by `---`**.
9. `## License` — `MIT © Maxime Larrivée-Roy, 2026` (php-wasm: GPL-2.0-or-later).

canva's README carries a WIP note (`styles/main.scss` and `Burger` are stubs).

---

## Current work (as of 2026-09-09, uncommitted on `main`)

- **Plugin system driven by `kirigami.yaml`.** `@kirigami/sdk` (new, v0.1.0) is
  the foundation: an in-memory hook registry shared between kirigami-core and
  plugin packages via workspaces. Only sass hooks exist so far (`SASS_BEFORE`,
  `SASS_AFTER`, `SASS_FUNCTIONS`). `todo.md` wants plugins declared in
  `kirigami.yaml` and a minimum-kirigami-version key.
- **`packages/plugin-highlight`** (`@kirigami/plugin-highlight`) — first real
  plugin, in progress. Just two SCSS theme files (`theme-dark.scss`,
  `theme-light.scss`) for highlight.js output; no `package.json` yet. Dir was
  renamed from `plugin-hljs` → `plugin-highlight` 2026-09-10.
- **SDK cache migration.** `Cache` (SQLite/`node:sqlite`) moved out of
  `packages/kirigami/bin/libs/{cache,hooks}.js` into `@kirigami/sdk`
  (`src/cache.js`, `src/hooks.js`). `bin/tasks/sass.js` now imports from
  `@kirigami/sdk`. `bin/cmd/create.js` also migrated off the old
  `bin/libs/store.js` (now deleted) to `@kirigami/sdk` `Cache`, using a global
  cache db at `~/.config/kirigami/kiri.db` (NOT the per-project `.node.db` core
  uses — `create` isn't tied to a project). `create <template>` now downloads
  the GitHub `.tar.gz` and extracts it with a zero-dep tar parser; target dir
  must be empty, unless it already has a `package.json`, in which case the
  template's `package.json` is deep-merged (existing values win) and
  `npm install` runs via `execSync`.
- **`SCHEMA` class** (new, `php-prepros/src/libraries/schema.class.php`) — a
  pure-PHP, dependency-free JSON Schema validator (Draft-7-ish, Ajv-like API:
  `isValid()` / `validate()` / `getErrors()`). Replaces the "validate schemas
  with ajv" todo.
- **`LD` class** (new, `php-prepros/src/libraries/ld.class.php`, php-prepros
  1.3.0) — schema.org JSON-LD generator. Accumulates nodes during a render and
  injects one `<script type="application/ld+json">` `@graph` into `<head>` via a
  `post_render` hook. **Automatic injection is opt-in**: it fires only when
  `kirigami.yaml` has a **top-level `jsonld:` block** (sibling of `kirigami:`,
  passed through by `prepros.js` as `PREPROS::$config->jsonld`; empty
  `jsonld: {}` is enough) — that block, plus the `kirigami:` loose keys
  `person`/`jobtitle`/`area`/`knowsabout`/`keywords`/social URLs, feeds an
  `Organization`+`Person`+`WebSite`+`WebPage`+
  `BreadcrumbList` graph. No block → nothing injected (but explicit
  `LD::add()` calls from templates still emit). Config-aware builders
  (`organization`/`person`/`website`/`webPage`/`breadcrumb`/`faqPage`) + every
  schema.org type via `__callStatic` (`LD::recipe([...])`). The `BreadcrumbList`
  is built from the `_index.php` ancestor trail for every non-home page (no
  `@breadcrumb` opt-in — that stays a separate FS feature). Per-page PHPDOC
  tags: `@ld false`, `@ld_type <Type>` (AboutPage / Article / Service / …),
  `@ld_title`, `@ld_description`, `@ld_image`, `@ld_published`, `@ld_modified`,
  `@ld_breadcrumb false`. Opt out globally: drop the block, `jsonld: false`,
  `jsonld: { auto: false }`. Aliases `ld_*()`. Side changes: `FS::phpFileInfo()`
  regex now allows `_` in tag names (for `@ld_*`); fixed a latent
  `STR::is_url()` `strtolower(null)` deprecation. Closes the "système pour créer
  des schemas json+ld" todo.
- Recent commits ("Schema + sdk", "Ajv", "The good $id", "Bon là je l'ai") are
  all around `$id` / regex handling in the schema work.

Other open `todo.md` items: `kiri cache purge` command, exclude wildcard paths on
export, `@breadcrumb true` handling, before-before / after-after prepros hooks.
