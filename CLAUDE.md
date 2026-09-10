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

### Sibling repos (checked out next to this one)

Cloned as siblings of this repo (`../<name>/`), all under the `php-kirigami` org:

| Path | Repo | What it is |
|---|---|---|
| `../template-*/` | `php-kirigami/template-<name>` | **every Kirigami template** — `kiri create <name>` clones these. Currently `../template-default/` (minimal starter) and `../template-demo/` (full feature tour; has its own `todo.md`). |
| `../php-kirigami.github.io/` | `php-kirigami/php-kirigami.github.io` | the org site, itself built with Kirigami |
| `../kiribuild/` | `php-kirigami/kiribuild` | the reusable GitHub Action (`kiri export` + Pages deploy) |
| `../php-wasm-builder/` | (upstream fork) | toolchain that compiles the custom PHP WASM in `@kirigami/php-wasm` |

Every Kirigami **site** project (`../template-*/`, the `.github.io` site) carries
a `CLAUDE.md` copied verbatim from `docs/template-CLAUDE.md` here — authored in
this repo, never edited in the sibling. **After changing `docs/template-CLAUDE.md`,
re-copy it into every `../template-*/CLAUDE.md`** (and the site repo).

### Packages (`packages/`)

| Package | Ver | Role |
|---|---|---|
| `@kirigami/kirigami` | 1.3.0 | the `kiri` CLI: build / export / watch / run / create / phpinfo. No native deps: the `sass` task's `img-asset()`/`colors()` run through php-prepros `processImages()` (was `sharp`, removed 2026-09-10). 1.1.5: `printTaskError()` — failures show message + page + stderr tail, PHP warnings no longer fail the build. 1.2.0: **plugin loader** (`bin/libs/plugins.js`) — reads `plugins:` from kirigami.yaml, resolves each from the project's node_modules (falls back to kiri's), checks pkg `kirigami.minVersion`, merges options (pkg `kirigami.options` ← yaml), calls the plugin's default export; run at the top of build/export/watch. `esbuild` task gained `before`/`after`/`plugins` (config + `esbuild:*` hooks, synthetic `stdin` entry like sass). `prepros` task pipes each rendered `.html` through the `prepros:html` waterfall hook. Fixed: sass synthetic-entry `url` collided with the real entry ("module loop") — now `__kirigami_entry__.scss`. Fixed: the sass `@use "@scope/pkg/x"` importer (`createPkgImporter`) resolved packages by joining `./node_modules` + `npm root -g` only — now it resolves via Node (`createRequire` from cwd **and** kiri's own location), so `npm link` / global-kiri / pnpm / workspace hoisting all work (root cause of the demo's "custom SCSS palette unreachable" DX issue) |
| `@kirigami/php-prepros` | 1.6.0 | PHP→HTML compiler + PHP class library (PREPROS, MD, HTML, YAML, SCHEMA, LD, CACHE, IMG, FS, STR, ARR, CURL, SCRAPER, OBF, STD; + bundled `Normalizer` polyfill). `LD` (new 1.3.0) = schema.org JSON-LD generator; injects `<script type="application/ld+json">` into `<head>`, **opt-in via a top-level `jsonld:` block** (sibling of `kirigami:`; empty `jsonld: {}` enough; then reads the `kirigami:` loose keys too). JS exports: `render`/`sitemap`/`runenv`/`mountPath`/`processImages`. 1.4.0 = DX fix pass: `HTML::format()` keeps `<pre>`/`<textarea>` verbatim; `md.plugins.php` auto-loaded (default `{% %}` plugins on); `catch(Throwable)` + structured errors (`error`/`page`/`where`), warnings non-fatal; PHPDOC multi-line values + prose `@word` ignored; `FS::getBreadcrumb()`/`getChildren()` anchored on `PREPROS::$file` (work from a layout/partial/helper); `{% tag %}` literal inside code spans; `IMG` clamps instead of upscaling; `###YEAR###`/`###TIMESTAMP###`/`###TODAY###` expanded at render (not just export); `page_info` hook accepts `[$file,$info]` or bare `$info`. 1.5.0: `render(file, phpIncludes[])` — extra abs PHP paths mounted under `/plugins/` + `include_once`'d once before any render (via `$config->phpIncludes`, set from `PREPROS::loadConfig`); the seam kiri's `prepros:php` hook feeds so a plugin can `PREPROS::registerTag()` from PHP. 1.6.0: **managed `<head>`** (`PREPROS::injectHead()`, gated on `prepros.head` ≠ false) — injects a theme/FOUC guard as `<head>`'s first child + a `<link>` per `sass` task + a `<script>` (no `defer`, before `</body>`) per `esbuild` task, per-page-relative + `?###TIMESTAMP###`; skips a file already referenced, or a task with `head:false`. `prepros.js` now forwards `config.tasks` into `preprosConfig`. Templates' `header.php` no longer wire assets |
| `@kirigami/php-wasm` | 8.5.10-5 | custom PHP 8.5.10 WASM build, JSPI + Node only, fork of WordPress Playground; now includes Imagick (wasm ~22 MB) |
| `@kirigami/struct-walker` | 1.0.4 | recursive YAML/JSON walker: resolves nested file refs, converts assets to data URIs |
| `@kirigami/sdk` | 0.2.0 | plugin hook registry (`on`/`run`/`HOOKS`) + `Cache` (SQLite via `node:sqlite`). 0.2.0: `runWaterfall()` (pipe a value through listeners) + `has()`; new hooks `esbuild:before`/`esbuild:after`/`esbuild:plugins` (mirror the sass ones) and `prepros:html` (waterfall — transform each rendered page's HTML) |
| `@kirigami/canva` | 2.3.0 | shared Sass/JS design system; published & public like the rest (was private until 2026-09-10); still WIP. 1.1.0 adds optional light/dark theming to `conf` (`$dark` + `$theme: auto\|class\|both`, built-in dark palette from `assets/chart/chart.html`) + `theme` script (`data-theme` toggle, persists to `localStorage`). 1.1.1: `--font-size` is `clamp($font-min .. $font-base)` (was floorless `min()`); new `$font-min` default 17. **2.0.0 (breaking): script subpaths dropped the `scripts/` segment** — `exports` is now `{ "./styles/*": …, "./*": "./dist/scripts/*.js" }`, so `@kirigami/canva/dom` / `/theme` / `/observer` / `/components/burger` (old `scripts/*` paths gone); styles unchanged. Also new in 2.0.0: `observer` — tag-rewriting engine for non-closing authoring tags (`register('youtube', el => …)`); starts on import, sweeps current DOM + `MutationObserver`, `voidLike` lifts stray nested children out; fires `canva:observed`; the seam plugins hook into. 2.1.0: `theme` gained declarative toggles — `[data-theme-toggle]` (bare = flip, or `="dark\|light\|auto"`), wired on import (new `bindToggles()` export), reflects `data-theme-state`/`aria-pressed`, fires `canva:themechange` on `window`, re-syncs on OS change while in `auto`. Replaces the hand-rolled toggle in template-demo's `kirigami.core.js`. 2.2.0: `helpers` gained `dedent(str)` — strips the leading-whitespace prefix common to every non-blank line (relative indent kept; trims leading blank lines + trailing ws), a pure no-DOM string helper; `@kirigami/plugin-highlight` consumes it to de-indent fenced code blocks. 2.3.0: when `$dark` is on, `conf` emits a `background-color`/`background-image`/`color` transition (`var(--transition-duration)`) on `*, ::before, ::after` so a theme switch eases; `prefers-reduced-motion`-guarded, no first-paint animation, a component's own `transition` shorthand overrides it |
| `@kirigami/plugin-highlight` | 0.1.0 | first real plugin: **build-time** highlight.js (highlighting ships 0 runtime JS). `prepros:html` hook rewrites `<pre><code class="language-x">` with `.hljs-*` spans (`hljs.highlight`, `highlightAuto` for un-tagged; each block de-indented first via `@kirigami/canva`'s `dedent` — shared leading whitespace stripped like `STR::trimIndent`, so fenced blocks can be indented in the source markdown; relative indent kept); `sass:after` appends a parametric SCSS theme (mixin `assets/_highlight.scss` + `dark()`/`light()` presets; `assets/theme-*.scss` are copy-me examples) + embedded JetBrains Mono `@font-face` (~39 KB base64 woff2, `assets/_font.scss`) + copy-button layout (`assets/_copy.scss`); `esbuild:after` bundles the ~1 KB hover copy-button script (`assets/copy.js`, skips a `<pre>` that already has a sibling `<button>`) when `copyButton` is on (warns if the project has no esbuild task); `prepros:php` includes `php/highlight.php` (the `<highlight lang="…">` authoring tag → emits `<pre><code class="language-…">`) when `tag` is on. Options (kirigami.yaml only): `languages` (12 common, or `all`), `theme` (`auto`\|`dark`\|`light`\|`none`), `autodetect`, `embedFont`, `copyButton`, `tag`; code defaults in `index.js`, schema `options.schema.json` (pkg `kirigami.optionsSchema`) — the loader validates against it, **and** `kirigami.schema.json` `$ref`s it (see its `plugins.items.allOf`) so VS Code completes/validates `plugins[].options` for this plugin. Dir renamed from `plugin-hljs` 2026-09-10 |

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

## Releasing

`npm run release` (→ `node scripts/publish.js`). Bump the version in each
package's `package.json` first, and — because the internal deps are pinned to
**exact** versions — bump every dependent's dep range to match (e.g. bumping
`@kirigami/canva` means editing `@kirigami/kirigami` and
`@kirigami/plugin-highlight` too), then `npm install` to refresh the lockfile,
commit, and **push `main`** before releasing.

The script: topo-sorts `packages/*` on their `@kirigami/*` deps, then for each,
skips it if that exact version is already on npm, else runs its `build` script
(tarball publishes skip `prepublishOnly`), `npm pack`s into `packs/`, and
`npm publish`es. Then it purges the jsDelivr cache for `kirigami.schema.json`
and every plugin's `kirigami.optionsSchema` — they're served from GitHub `@main`
and editors would otherwise keep the stale copy for up to 12 h. Flags:
`--dry-run`, `--no-purge`, `--purge-only`, `--only <name>`, `--otp <code>`,
`--yes` (skip the "is HEAD pushed?" preflight). Needs `npm login` with
`@kirigami` publish rights.

---

## Current work (as of 2026-09-10, uncommitted on `main`)

Committed: the plugin system, `@kirigami/plugin-highlight` v0.1.0, SDK cache
migration, `SCHEMA` and `LD` classes (697eb3d and earlier); `@kirigami/canva`
2.2.0 `helpers.dedent(str)` + plugin-highlight consuming it (551dfbf); the
release script (b48fe5f); `kiri create` wizard + git + metadata (f81862d);
`@kirigami/canva` 2.3.0 theme-change transition (3fce596).

**canva is a permanent part of this monorepo — reuse its code rather than
re-implementing shared helpers per package** (that's why plugin-highlight now
depends on it).

Uncommitted:

- **Managed `<head>` — `@kirigami/php-prepros` 1.6.0, `@kirigami/kirigami`
  1.3.0.** `PREPROS::injectHead()` auto-wires every page's `<head>` (theme guard
  + `<link>` per sass task + `<script>` per esbuild task, no `defer`, before
  `</body>`); opt out with `prepros.head: false` or `head: false` per task.
  Schema gained `prepros.head` + `tasks[].head`. `template-default` and
  `template-demo` `header.php` gutted of asset plumbing (their repos; rebuilt
  and OK). Every `template-*` `CLAUDE.md` re-copied from `docs/template-CLAUDE.md`.
- **`../template-default/` rebuilt as a real starter kit** (that repo, its own
  `main`): layout + 2 pages + themeable SCSS (green palette, light/dark) +
  progressive-enhancement JS + `.vscode` + `package.json` + `.editorconfig`.
- **DX issue logged in `todo.md`, not fixed:** `HTML::format()`
  (`php-prepros/src/libraries/html.class.php`) lowercases element/attribute
  names unconditionally (`:76`, `:166`, `:246`), flattening inline SVG/MathML
  foreign-content camelCase (`viewBox` → `viewbox`, `linearGradient`, …) on
  output. Not a render bug — the browser's foreign-content adjustment re-maps it
  at parse — but the serialised source is invalid. Fix: make the serializer
  namespace-aware (keep original case under `<svg>` / MathML).

Still-open `todo.md` items: an `<extlink>` authoring tag (calls `SCRAPER`); a
real kiribuild action test; `@highlight false` PHPDOC page-skip for
plugin-highlight; plugin-declared tasks / commands (`kirigami.type` `"task"` /
`"command"`).
