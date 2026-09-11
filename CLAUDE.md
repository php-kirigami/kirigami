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
| `../kiribuild/` | `php-kirigami/kiribuild` | the reusable GitHub Action. **v2**: Node 24 + `kiri` CLI + `kiri export` only — checkout, commit-back, and Pages upload/deploy moved out into the caller's workflow (v1 did it all). Templates ship `.github/workflows/page.yml` wiring the full flow. |
| `../php-wasm-builder/` | (upstream fork) | toolchain that compiles the custom PHP WASM in `@kirigami/php-wasm` |

Every Kirigami **site** project (`../template-*/`, the `.github.io` site) carries
a `CLAUDE.md` copied verbatim from `docs/template-CLAUDE.md` here — authored in
this repo, never edited in the sibling. **After changing `docs/template-CLAUDE.md`,
re-copy it into every `../template-*/CLAUDE.md`** (and the site repo).

### Packages (`packages/`)

| Package | Ver | Role |
|---|---|---|
| `@kirigami/kirigami` | 1.5.6 | the `kiri` CLI: build / export / watch / serve / run / create / install / phpinfo. No native deps: the `sass` task's `img-asset()`/`colors()` run through php-prepros `processImages()` (was `sharp`, removed 2026-09-10). 1.1.5: `printTaskError()` — failures show message + page + stderr tail, PHP warnings no longer fail the build. 1.2.0: **plugin loader** (`bin/libs/plugins.js`) — reads `plugins:` from kirigami.yaml, resolves each from the project's node_modules (falls back to kiri's), checks pkg `kirigami.minVersion`, merges options (pkg `kirigami.options` ← yaml), calls the plugin's default export; run at the top of build/export/watch. `esbuild` task gained `before`/`after`/`plugins` (config + `esbuild:*` hooks, synthetic `stdin` entry like sass). `prepros` task pipes each rendered `.html` through the `prepros:html` waterfall hook. Fixed: sass synthetic-entry `url` collided with the real entry ("module loop") — now `__kirigami_entry__.scss`. Fixed: the sass `@use "@scope/pkg/x"` importer (`createPkgImporter`) resolved packages by joining `./node_modules` + `npm root -g` only — now it resolves via Node (`createRequire` from cwd **and** kiri's own location), so `npm link` / global-kiri / pnpm / workspace hoisting all work (root cause of the demo's "custom SCSS palette unreachable" DX issue). 1.3.1: hotfix — `inlinePluginOptionSchemas()` (`bin/config.js`) left `plugins.items.allOf` at `[]` when a first-party plugin's `options.schema.json` `$ref` didn't resolve (plugin absent), and Ajv refuses to compile `allOf: []` → **every `kiri build`/`export`/`watch` crashed with "schema is invalid" on 1.3.0 unless `@kirigami/plugin-highlight` was installed**; now the key is dropped when nothing resolves. 1.3.3: dep bump to `@kirigami/php-prepros` 1.6.2 (render no longer bakes `###TIMESTAMP###` into committed preview pages). 1.4.0: dep bump to `@kirigami/php-prepros` 1.7.0 (`META` class). 1.4.1: dep bump to php-prepros 1.7.1; every `bin/cmd/*.js` `HELP.notes[]` trimmed to one-liners; `developement` typo fixed in `bin/kiri.js`. 1.4.2: **banner from a template** — `bin/config.js` `fillBanner()` replaces `###DATE###`/`###YEAR###`/`###PROJECT###`/`###AUTHOR###`/`###EMAIL###`/`###REPO###`/`###BASEURL###` in the banner text on every build/export (was `###DATE###` only), from the `kirigami:` block; a line whose values resolve empty is dropped. No `banner:` file set → the bundled `packages/kirigami/assets/banner-template.txt` (ASCII logo) is used the same way (`files` gained `assets/`). `kiri create` gained `--email` / `--repo` (repo default = `deriveRepo(baseurl)`, exported from config.js: `*.github.io/x` → `github.com/user/x`), writes them to `kirigami.yaml`, and drops a starter `banner.txt` (tokens intact) at the project root when the template ships none. `###DATE###` is now English (`formatFrDate` → `formatDate`, "Thursday, September 10, 2026 at 20:04"). 1.4.3: dep bump to `@kirigami/php-prepros` 1.7.2. 1.5.0: **`kiri serve`** — everything `kiri watch` does, plus a static file server over `kirigami.root` and browser hot-reload (Server-Sent Events; `bin/libs/devserver.js`, zero-dep — `node:http`/`node:fs`, no live-reload framework). `--port` (default `4321`) / `--host` (default `127.0.0.1`). The watcher-building loop (task-rule assembly + the debounced/batched `createWatchers()`) moved out of `bin/cmd/watch.js` into `bin/libs/watchengine.js` so `watch` and `serve` share it instead of duplicating it; `watch.js` itself is otherwise unchanged. Also 1.5.0: **`kiri install <plugin>`** (`bin/cmd/install.js`) — `npm install`s a plugin (devDependency by default, `--save` for a regular one); a bare name (`highlight`) is resolved against the `@kirigami/plugin-*` / `kirigami-plugin-*` conventions via the npm registry, a full name is used as-is; already installed → checks npm for a newer version and updates; then prints the `plugins:` entry to paste into `kirigami.yaml`, built from the installed plugin's own `kirigami.optionsSchema` — never edits `kirigami.yaml` itself. `bin/libs/plugins.js`'s `resolvePlugin`/`ownerPackageDir`/`readJson`/`compareVersions`/`kiriVersion` exported so `install.js` reuses the same resolution logic as the build-time loader. 1.5.1: dep bump to `@kirigami/php-prepros` 1.8.0. 1.5.2: dep bump to `@kirigami/php-prepros` 1.9.0. 1.5.3: dep bump to `@kirigami/php-prepros` 1.9.1. 1.5.4: dep bump to `@kirigami/canva` 2.5.1. 1.5.5: dep bump to `@kirigami/php-prepros` 1.9.2. 1.5.6: `homepage` + README pointed at the site, plus a cascade dep bump (canva 2.5.2, php-prepros 1.9.3, sdk 0.2.1, struct-walker 1.0.5). Also 1.5.6: `createDevServer()` (`bin/libs/devserver.js`) catches `EADDRINUSE` specifically and rejects with `Port <n> on <host> is already in use — try a different one with --port <n>.` instead of the raw Node error — `kiri.js`'s top-level catch already avoided a raw stack trace, but didn't point at the fix. Verified against a real port conflict (two `kiri serve` on the same port). Also 1.5.6: **CSS hot-injection in `kiri serve`, no reload** — a `sass` task's rebuild now sends a named `css` SSE event instead of the default full-reload one; the injected client script swaps every `<link rel=stylesheet>` for a cache-busted copy (new link inserted, old one removed only once the new one has loaded — no FOUC) instead of calling `location.reload()`, so scroll position and form state survive a stylesheet-only change. `esbuild`/`prepros` rebuilds still trigger a full reload, unchanged. `devserver.js` gained `broadcastCssReload()` alongside `broadcastReload()`; `watchengine.js`'s `buildWatchRules()` now attaches each rule's task `type` (not part of what a task's own `getWatcher()` returns) so `serve.js` can tell a `sass` rule apart from the others. Verified end-to-end with a real headless browser: edited a live `.scss` file against a running `kiri serve`, confirmed the new color actually applied *and* a page-level marker planted before the edit survived (proof no navigation occurred). Also 1.5.6: `kiri create --help` (and the READMEs) now say every template ships its own `CLAUDE.md` — Claude Ready out of the box — was only documented inside the template repos themselves, never mentioned in the CLI/docs a user actually reads first. |
| `@kirigami/php-prepros` | 1.9.3 | PHP→HTML compiler + PHP class library (PREPROS, MD, HTML, YAML, SCHEMA, LD, META, CACHE, IMG, FS, STR, ARR, CURL, SCRAPER, OBF, STD; + bundled `Normalizer` polyfill). `LD` (new 1.3.0) = schema.org JSON-LD generator; injects `<script type="application/ld+json">` into `<head>`, **opt-in via a top-level `jsonld:` block** (sibling of `kirigami:`; empty `jsonld: {}` enough; then reads the `kirigami:` loose keys too). JS exports: `render`/`sitemap`/`runenv`/`mountPath`/`processImages`. 1.4.0 = DX fix pass: `HTML::format()` keeps `<pre>`/`<textarea>` verbatim; `md.plugins.php` auto-loaded (default `{% %}` plugins on); `catch(Throwable)` + structured errors (`error`/`page`/`where`), warnings non-fatal; PHPDOC multi-line values + prose `@word` ignored; `FS::getBreadcrumb()`/`getChildren()` anchored on `PREPROS::$file` (work from a layout/partial/helper); `{% tag %}` literal inside code spans; `IMG` clamps instead of upscaling; `###YEAR###`/`###TIMESTAMP###`/`###TODAY###` expanded at render (not just export); `page_info` hook accepts `[$file,$info]` or bare `$info`. 1.5.0: `render(file, phpIncludes[])` — extra abs PHP paths mounted under `/plugins/` + `include_once`'d once before any render (via `$config->phpIncludes`, set from `PREPROS::loadConfig`); the seam kiri's `prepros:php` hook feeds so a plugin can `PREPROS::registerTag()` from PHP. 1.6.0: **managed `<head>`** (`PREPROS::injectHead()`, gated on `prepros.head` ≠ false) — injects a theme/FOUC guard as `<head>`'s first child + a `<link>` per `sass` task + a `<script>` (no `defer`, before `</body>`) per `esbuild` task, per-page-relative + `?###TIMESTAMP###`; skips a file already referenced, or a task with `head:false`. `prepros.js` now forwards `config.tasks` into `preprosConfig`. Templates' `header.php` no longer wire assets. Also 1.6.0: `HTML::format()` indents each `<pre><code>` to its nesting depth (`soleCodeChild()`; relative indent kept) for readable source, and `injectHead()` adds a ~250-byte de-indent script before `</body>` (only when `format` on; skips blocks a highlighter flattened — those have child `<span>`s); plugin-highlight's build-time `dedent` covers its case. Bare `<pre>`/`<textarea>` still byte-for-byte. 1.6.1: `PREPROS::getExportedFiles()` wraps `array_unique()` in `array_values()` — a duplicate at a non-tail position (`.cookie.txt` re-exported by every page doing an `@readme`/`@tag http` fetch, interleaved with the `.html`) left a key gap, so `json_encode()` emitted a JSON object and the JS side threw "retobj.files.map is not a function"; `prepros.js` also normalises a non-array `retobj.files` back to a list. 1.6.2: `replaceTokens()` no longer expands `###TIMESTAMP###` at render (only `###YEAR###` / `###TODAY###`) — the `?###TIMESTAMP###` cache-buster `injectHead()` adds stays literal in the rendered `src/**` page and is substituted only on export (`dist.js`), so a plain `kiri build` / `kiri watch` no longer rewrites every committed preview page with a new number (which made a CI commit-back recommit them every run). 1.7.0: **`META`** — `<head>` SEO/social metadata generator, companion to `LD`. **Opt-in via a top-level `meta:` block** (sibling of `kirigami:`/`jsonld:`; empty `meta: {}` enough; `meta: false` / `{auto:false}` stops injection). `page_info` captures the page, `post_render` injects a `<title>` + `<meta name=…>` (description/keywords/robots/language/generator/author/designer/theme-color) + OG + Twitter Card + `<link rel=canonical>` + favicon/apple-touch-icon/humans block right before `</head>`. Sources, precedence order: page PHPDOC (`@meta_*`, falling back to `@title`/`@description`/`@abstract`/`@image`/`@robots`/`@og_type`/`@canonical`), the `meta:` block, then loose `kirigami:` keys + `jsonld:` block (`description`/`keywords`/`author`/`person`/`lang`/`logo`/`image`). Emits only what resolves; a tag the layout already hand-writes is detected (regex probe) and skipped — drops in beside an existing `header.php` with no duplication. `@meta false` skips a page. Manual: `META::tag()`/`link()`/`raw()`/`tags()` + `meta_*` aliases. `prepros.js` forwards `config.meta`; autoloaded `META` (`meta.class.php`); hooks in `prepros.plugins.php` (META before LD in `post_render`). Schema: new top-level `meta` block. 1.7.1: `prepros.js` loads `kirigami.yaml` lazily (`loadConfig()` in `getPHPInstance`/`mountPath`/`render`/`sitemap`) instead of a top-level `await`+`throw` — `import '@kirigami/php-prepros'` is now side-effect-free, so `kiri build/export/run --help` print help instead of crashing "Config file not found". 1.7.2: two output-cleanliness fixes. (a) `injectHead()`'s de-indent script now works on `innerHTML` line by line (was `textContent`) and no longer skips blocks with child `<span>`s — so a build-time highlighter's `<pre><code>` gets flattened before first paint too, which lets plugin-highlight re-indent its markup to match `HTML::format()` (clean, aligned HTML source; only the shared leading run is stripped, relative indent kept). (b) `<markdown prose>` wraps its output in `<div class="prose">` (canva `styles/prose`) — opt-in via the `prose` attribute, a bare `<markdown>` is unchanged; `class`/`id` on the tag land on the wrapper. 1.8.0: **`{% img-asset %}`** — new default Markdown plugin (`md.plugins.php`, alongside `codepen`/`youtube`/`checklist`/`callout`), same pipeline as the `<img asset>` HTML tag: positional args `path [width [height [cover]]]`, calls `IMG::asset($path, $width, $height, $cover, PREPROS::$file)` and emits `<img src="…" alt="">`. Missing path → an HTML comment, not a build error (matches `codepen`/`youtube`'s missing-id behavior). 1.9.0: **`{% youtube %}` removed** — moved to `@kirigami/plugin-embed`, which replaces the old plain-iframe output with an oEmbed-backed card (see that package's row). An unregistered `{% youtube ID %}` now falls through unresolved (HTML-escaped, printed as-is — `md.class.php`'s existing "unknown plugin" behavior) rather than rendering an iframe. `codepen`/`checklist`/`callout` unaffected. 1.9.1: **`{% img-asset %}` no longer crashes the build on an unresolvable path** — `IMG::asset()`'s exception is now caught and turned into an HTML comment. Found while documenting the tag on `../php-kirigami.github.io/`: code-span protection (`$pluginLiterals`) only swaps the *displayed* output back to literal text, the callback still runs unconditionally — so a placeholder path written as `` `{% img-asset path … %}` `` prose threw "Invalid image file." and failed the whole build. Verified against the real WASM runtime (build passes, literal text preserved in the `<code>` span). 1.9.2: **fixed the confirmed `/roadmap/` list-continuation bug** (`md.class.php`, STEP 9). A list item's source line count was 1:1 with `<li>` count — an indented continuation line with no marker of its own (a soft-wrapped `- **foo** text\n  more text`) fell outside the block-matching regex entirely (`(?:\n[ \t]*(?:\d+\.|[-*+])[ \t]+.+)*` required every subsequent line to itself start with a marker), so the list closed after the first line, the continuation resurfaced as a stray flat `<p>`, and a new list reopened for the next marker line. Fixed by widening the block regex to also accept a marker-less indented line (`[ \t]+\S.*`) and, in the per-line loop, appending such a line's text to the previous item instead of dropping it. Verified: an isolated PHP 8.5 repro (six cases — the exact bug, multiple continuation lines, ordered lists, nested sub-lists unaffected, an unrelated paragraph after a list not swallowed, single-line baseline) all correct; then end-to-end against the real WASM runtime — `../php-kirigami.github.io/`'s `/roadmap/` reformatted from the one-line-per-item workaround back to natural wrapped source, rebuilt for real (`node_modules` temporarily overwritten with the local fix before release, same technique as canva 2.5.1), confirmed every section renders as one clean list with inline `**bold**`/`` `code` `` intact and no stray paragraphs. 1.9.3: dep bump to `@kirigami/struct-walker` 1.0.5; `homepage` + README pointed at the site (metadata only). |
| `@kirigami/php-wasm` | 8.5.10-5 | custom PHP 8.5.10 WASM build, JSPI + Node only, fork of WordPress Playground; now includes Imagick (wasm ~22 MB) |
| `@kirigami/struct-walker` | 1.0.5 | recursive YAML/JSON walker: resolves nested file refs, converts assets to data URIs. 1.0.5: `homepage` + README pointed at the site (metadata only). |
| `@kirigami/sdk` | 0.2.1 | plugin hook registry (`on`/`run`/`HOOKS`) + `Cache` (SQLite via `node:sqlite`). 0.2.0: `runWaterfall()` (pipe a value through listeners) + `has()`; new hooks `esbuild:before`/`esbuild:after`/`esbuild:plugins` (mirror the sass ones) and `prepros:html` (waterfall — transform each rendered page's HTML). **Gotcha (found 2026-09-11 writing the site's plugin-authoring tutorial):** `on`/`run`'s registry is a module-level `Map` in `hooks.js` — it's only shared across a plugin and kiri's own tasks when both resolve to the *same physical copy* of the package. A plugin developed locally against a bare `file:` dependency whose own folder ends up with its own `node_modules/@kirigami/sdk` (e.g. from running `npm install` standalone inside it to fix a "Cannot find package" error) gets a second, disconnected registry — its `on()` calls are invisible to kiri's `run()` calls, silently, no error either side. Doesn't affect a real `npm install` of a published plugin (npm dedupes `@kirigami/sdk` to one copy in the consuming project in the normal case) — only ad-hoc local `file:` testing setups (workspace-hoisted `file:` deps, like this monorepo's own `packages/*`, don't hit it either — confirmed while building `plugin-extlink`/`plugin-embed`, which never had their own `node_modules`). 0.2.1: `homepage` + README pointed at the site (metadata only). |
| `@kirigami/canva` | 2.5.2 | shared Sass/JS design system; published & public like the rest (was private until 2026-09-10); still WIP. 1.1.0 adds optional light/dark theming to `conf` (`$dark` + `$theme: auto\|class\|both`, built-in dark palette from `assets/chart/chart.html`) + `theme` script (`data-theme` toggle, persists to `localStorage`). 1.1.1: `--font-size` is `clamp($font-min .. $font-base)` (was floorless `min()`); new `$font-min` default 17. **2.0.0 (breaking): script subpaths dropped the `scripts/` segment** — `exports` is now `{ "./styles/*": …, "./*": "./dist/scripts/*.js" }`, so `@kirigami/canva/dom` / `/theme` / `/observer` / `/components/burger` (old `scripts/*` paths gone); styles unchanged. Also new in 2.0.0: `observer` — tag-rewriting engine for non-closing authoring tags (`register('youtube', el => …)`); starts on import, sweeps current DOM + `MutationObserver`, `voidLike` lifts stray nested children out; fires `canva:observed`; the seam plugins hook into. 2.1.0: `theme` gained declarative toggles — `[data-theme-toggle]` (bare = flip, or `="dark\|light\|auto"`), wired on import (new `bindToggles()` export), reflects `data-theme-state`/`aria-pressed`, fires `canva:themechange` on `window`, re-syncs on OS change while in `auto`. Replaces the hand-rolled toggle in template-demo's `kirigami.core.js`. 2.2.0: `helpers` gained `dedent(str)` — strips the leading-whitespace prefix common to every non-blank line (relative indent kept; trims leading blank lines + trailing ws), a pure no-DOM string helper; `@kirigami/plugin-highlight` consumes it to de-indent fenced code blocks. 2.3.0: when `$dark` is on, `conf` emits a `background-color`/`background-image`/`color` transition (`var(--transition-duration)`) on `*, ::before, ::after` so a theme switch eases; `prefers-reduced-motion`-guarded, no first-paint animation, a component's own `transition` shorthand overrides it. 2.4.0: **`styles/prose`** — new partial, `prose($measure, $flow)` mixin + (unless `@use ... with ($emit-class: false)`) a `.prose {}` wrapper. Markdown/long-form base styles (headings, lists, tables, quotes, code, media, `dl`, `<details>`, inline `mark`/`sub`/`sup`) + the GFM output `MD` emits (`.task-list`/`.task-item`, `.markdown-alert*`, `.footnotes`); all `conf` tokens so it tracks light/dark; runtime knobs `--prose-measure`/`--prose-flow`/`--prose-radius`; tables scroll within themselves. plugin-highlight's code theme still layers on via `sass:after`. Lifted from what every site was copy-pasting into `_main.scss`. `main.scss` still a stub. Also 2.4.0: **`reveal`** script — `import "@kirigami/canva/reveal"` adds `is-in` to each `[data-reveal]` as it scrolls in (once, then unobserved); reduced-motion / no-IO / safety-timeout all fall back to show-all; pair with a `.js [data-reveal]` CSS rule. Lifted from the templates' `kirigami.core.js`. 2.5.0: **`styles/main`** no longer a stub — five generic components lifted from `../php-kirigami.github.io/`'s own `_main.scss`, spotted while building its `/docs/`: `.breadcrumb` (pairs with `FS::getBreadcrumb()`), `.docs-toc` (quick-jump anchor list), `.table`/`.table-wrap` (`&__num` for tabular-figure columns), `.badge`/`.badge--muted` (status/license tags), `.palette` (colour-chip row, for `IMG::palette()`/`colors()` output); opt-in via `@use "@kirigami/canva/main"`. Also 2.5.0: `conf`'s reset now sets `scrollbar-color`/`scrollbar-width` from `--border`/`--surface-2` on `<html>` — native scrollbars (an overflowing code block, an `<iframe>`) now follow the palette instead of defaulting to white in dark mode; every project's `conf` already defines both tokens, so no opt-out flag. `../php-kirigami.github.io/` migrated onto `styles/main` and dropped its duplicate copies of all five components + the scrollbar tokens on 2026-09-11 (see "Current work"). 2.5.2: `homepage` + README pointed at the site (metadata only). 2.5.1: `styles/prose`'s standalone code defaults (`code, kbd, samp, pre { font-family; font-size }` and `pre { code { padding: 0; … } }`) now exclude `.hljs` explicitly (`code:not(.hljs)`) — real bug fix, see "Current work": these compound `.prose`-scoped selectors had equal-or-higher specificity than plugin-highlight's own `.hljs` theme rule, so a highlighted block's font/padding were silently overridden in light mode (only `[data-theme="dark"] .hljs`, with its extra class, had enough specificity to win) — visible as the whole page reflowing on every theme toggle. |
| `@kirigami/plugin-highlight` | 0.1.6 | first real plugin: **build-time** highlight.js (highlighting ships 0 runtime JS). `prepros:html` hook rewrites `<pre><code class="language-x">` with `.hljs-*` spans (`hljs.highlight`, `highlightAuto` for un-tagged; each block de-indented first via `@kirigami/canva`'s `dedent` — shared leading whitespace stripped like `STR::trimIndent`, so fenced blocks can be indented in the source markdown; relative indent kept); `sass:after` appends a parametric SCSS theme (mixin `assets/_highlight.scss` + `dark()`/`light()` presets; `assets/theme-*.scss` are copy-me examples) + embedded JetBrains Mono `@font-face` (~39 KB base64 woff2, `assets/_font.scss`) + copy-button layout (`assets/_copy.scss`); `esbuild:after` bundles the ~1 KB hover copy-button script (`assets/copy.js`, skips a `<pre>` that already has a sibling `<button>`) when `copyButton` is on (warns if the project has no esbuild task); `prepros:php` includes `php/highlight.php` (the `<highlight lang="…">` authoring tag → emits `<pre><code class="language-…">`) when `tag` is on. Options (kirigami.yaml only): `languages` (12 common, or `all`), `theme` (`auto`\|`dark`\|`light`\|`none`), `autodetect`, `embedFont`, `copyButton`, `tag`; code defaults in `index.js`, schema `options.schema.json` (pkg `kirigami.optionsSchema`) — the loader validates against it, **and** `kirigami.schema.json` `$ref`s it (see its `plugins.items.allOf`) so VS Code completes/validates `plugins[].options` for this plugin. Dir renamed from `plugin-hljs` 2026-09-10. 0.1.1: dep bump `@kirigami/canva` 2.3.0 → 2.4.0 (exact-pin rule; no behaviour change — still only uses `dedent`). 0.1.2: **`@highlight false` page opt-out** — new `php/page.php` (always included via `prepros:php`, alongside `php/highlight.php` only when `tag` on): a `page_info` hook reads the PHPDOC `@highlight` tag, a `post_render` hook drops a `<!-- kirigami:nohighlight -->` marker into pages where it's non-truthy; `src/highlight.js` strips the marker and returns the page untouched. Also per-block: a `<code>` class of `nohighlight` / `no-highlight` / `language-plaintext` / `-text` / `-none` is left byte-for-byte. 0.1.3: **clean HTML output** — `highlightHtml()` captures the `<pre>` line's indentation and, when `HTML::format()` pretty-printed the block (body starts with a newline), re-emits the highlighted markup in the exact same shape the formatter uses (`<pre><code>` open, source one level deeper, `</code></pre>` back at the `<pre>` column) instead of flush-left. Pairs with php-prepros 1.7.2's span-safe de-indent script, which flattens it again before first paint. `dedent` (minimum shared indent removed, relative kept) unchanged; the flush path (format off) unchanged. 0.1.4: dep bump to `@kirigami/canva` 2.5.1. 0.1.5: **`inject-auto.scss` (`theme: auto`) specificity fix** — the light-mode `@include hljs.light();` was left bare while both dark-mode paths (`prefers-color-scheme` and `[data-theme="dark"]`) were selector-scoped, so light and dark carried *different* CSS specificity for the exact same declarations (`.hljs`, inline `code`); a page with its own same-or-lower-specificity rule for the same selectors (e.g. `@kirigami/canva`'s `styles/prose` inline-code reset) could beat light but lose to dark, which reads as inline code changing size on every theme toggle. Real bug, found the same day as canva 2.5.1's `.hljs` block-level version of this (see below) — this time on *inline* `code`, reported by the user as "`prepros.network: true`... plus gros sur thème dark" on `/docs/authoring/`. Fixed by scoping light under `:root:not([data-theme="dark"])` too, matching dark's shape. `theme: light` / `theme: dark` (single-palette) unaffected — only `theme: auto` (the default) had the asymmetry. 0.1.6: dep bump to `@kirigami/canva` 2.5.2 / `@kirigami/sdk` 0.2.1; `homepage` + README pointed at the site (metadata only). Also 0.1.6: **an unknown `languages:` name now fails the build**, not just warns — `validateLanguages()` (new, exported from `src/highlight.js`) throws listing every name that doesn't resolve to a real highlight.js module; `index.js`'s `register()` calls it *eagerly* (register() is now `async`), once per build, before any page renders — the old warn-only path lived inside `highlightHtml()`, which only ever runs once a page happens to contain a `<pre>` block, so a typo in a project with none yet built green forever with silently-broken highlighting waiting to surprise the first person who adds one. `languages: "all"` unaffected (no per-name resolution to validate). Verified against the real WASM runtime in a scratch project: a typo'd name now fails `kiri build` immediately with a clear message even on a page with zero code blocks; a valid list (including `html`/`yml`/`md` aliases) and `languages: "all"` both still build clean — regression-checked. |
| `@kirigami/plugin-extlink` | 0.1.3 | second plugin: `<extlink src="…">` authoring tag — an external link preview card (square thumbnail left, title/description/site name right), sourced from `@kirigami/php-prepros`'s `SCRAPER::get()`. `prepros:php` includes `php/extlink.php`, which registers the tag; any of `title`/`description`/`image`/`label` can be overridden on the tag itself (`<extlink src="…" title="…">`), and the tag throws a clear build error if the resolved title is still empty (no scrape hit, no override). Caches to disk, keyed `STR::shorthash($src)`, meant to be committed so a later build (CI, fresh checkout) never re-crawls a resolved URL: the raw `SCRAPER::get()` result to `_data/extlink/<hash>.json`, and the scraped preview image — downloaded, square-cropped (`IMG::resize($n,$n,true)`), re-encoded to the project's own `image.format` — to `assets/images/extlink/<hash>.<format>`, then published under `image.dest` (`src/images/extlink/…`) the same way `<img asset>` does (can't reuse `IMG::asset()` directly for the first-time write, since `PREPROS::fstat()` reads real host disk and the file we just wrote only exists in the WASM VFS until the render call returns — so the tag hand-rolls that one copy step, `IMG::asset()`-style, itself). `sass:after` appends the default `.extlink` card SCSS (`style: true`, `@kirigami/canva` `conf` tokens only, multi-line `line-clamp` ellipsis on title/description, single-line ellipsis on the site name) unless `style: false`. Needs `prepros.network: true`. Verified end-to-end against the real WASM runtime in a scratch project (`file:` deps): GitHub repo + a real French news URL (accents, `SCRAPER::get()`'s French labelling all correct), confirmed the committed-cache path skips the network entirely on rebuild (deleted `.cache.db`, re-ran — no re-export of the `_data`/`assets/images` files). 0.1.1: also saves the untouched download at its native resolution, re-encoded to jpg, to `assets/extlink/<hash>.jpg` — an archival copy (the square crop is decoded from the same in-memory `IMG` instance, so this costs no extra download); verified by clearing the generated dirs and rebuilding, confirmed byte size + a full uncropped frame (not a duplicate of the square). 0.1.2: **`{% extlink URL ["title"] %}` Markdown shortcut** — `php/extlink.php` refactored so the tag body is a plain `extlink_resolve(array $attrs): string` function; `PREPROS::registerTag('extlink', ...)` and the new `MD::registerPlugin('extlink', ...)` both call it directly, rather than the MD plugin emitting literal `<extlink src="…">` text for a later pass to pick up (that's `plugin-embed`'s `{% youtube %}` trick, but that one works *because* embed is client-side with no server pass to rely on — extlink's card is server-built, so there's no equivalent second pass; calling the resolver directly is also what php-prepros' own `{% img-asset %}` does for `<img asset>`). Verified end-to-end in the same scratch project: the shortcut form against a URL already resolved by the HTML-tag form hit the disk cache (identical image hash, no re-scrape), the title-override arg worked, and a bare `{% extlink %}` with no URL degraded to an HTML comment instead of crashing the build. 0.1.3: dep bump to `@kirigami/sdk` 0.2.1; `homepage` + README pointed at the site (metadata only). |
| `@kirigami/plugin-embed` | 0.1.4 | third plugin: `<youtube id="…">` / `<vimeo id="…">` video embed cards — **client-side**, unlike extlink/highlight (no build-time network call at all). `src/embed.js` registers both tags on `@kirigami/canva`'s `observer` (`ESBUILD_AFTER`, bundled into every esbuild task); each tag is swapped immediately for a `.embed` placeholder (default 16∶9), then the oEmbed data (thumbnail/title/real aspect-ratio) is fetched — from `localStorage` (`kirigami-embed:<provider>:<id>`) if already resolved, from the provider's oEmbed endpoint otherwise — and patched into that same element once it resolves; clicking the play button swaps the element's content for the real player `<iframe>` (nothing loads/autoplays before the click). Play button: a single inline SVG (ring + triangle, `fill="currentColor"`, `.embed__play { color: var(--accent) }`) — path data supplied by the user, sourced from their own `action-quebec.github.io` project; `:hover`/`:focus-visible` → `scale(1.1)` + pointer cursor. `php/embed.php` (`prepros:php`) registers `{% youtube ID %}` / `{% vimeo ID %}` Markdown shortcuts that just emit the bare tag — replaces php-prepros's old built-in `{% youtube %}` (removed in php-prepros 1.9.0), which rendered a plain iframe with no oEmbed lookup, no cover, no play button. `sass:after` appends the default `.embed`/`.embed__title`/`.embed__play`/`.embed__player` SCSS (`style: true`, `@kirigami/canva` `conf` tokens) unless `style: false`. Warns (doesn't fail) if the project has no `esbuild` task — same pattern as plugin-highlight's `copyButton`. **Dailymotion, Reddit and Facebook were evaluated and rejected**: Dailymotion's and Reddit's oEmbed endpoints send no `Access-Control-Allow-Origin` header (confirmed via `curl -D -` against real videos/posts, not just one bad test id) — an anonymous browser `fetch()` is blocked by CORS regardless of id, a hard blocker for this client-side architecture; Reddit's oEmbed is also a different shape entirely (a `<blockquote>` + their own `platform.js` widget script, not a `thumbnail_url`/`width`/`height` video object, so it wouldn't fit the card model even with CORS fixed); Facebook's oEmbed (Graph API) has required an app `access_token` since 2018, so no anonymous fetch is possible either. A project with its own working endpoint for any of the three (a proxy, an access token, …) can still add it on top via its own `register(name, …)` call on the observer. Verified end-to-end in the same scratch project as plugin-extlink: real YouTube + Vimeo ids (including one via the `{% youtube %}` Markdown shortcut), oEmbed fetch → thumbnail/title/aspect-ratio patched in, play-button click → correct `youtube-nocookie.com`/`player.vimeo.com` iframe src wired in, `wrapper.children.length === 1` (old content fully replaced) — headless Chromium, no console errors. 0.1.1: **aspect-ratio floored at 16∶9** — a real, reported bug: the resolved oEmbed ratio was applied as-is, so a 4∶3 (or narrower) source video produced an unusually tall card that dominated the page layout next to normal widescreen cards; the math itself was correct (verified: a 900px-wide 4∶3 card measured exactly 675px tall) but the *result* looked broken. `Math.max(data.width/data.height, 16/9)` caps how tall the placeholder (and the still-image cover) can get; the real player, once clicked, still shows at its own true ratio — YouTube's/Vimeo's iframe UIs pillarbox narrower content within whatever box they're given rather than stretching it, confirmed by screenshotting a clicked 4∶3 video inside the capped 16∶9 box (clean pillarboxing, no distortion). Also fixed in this version: `package.json`/README/`php/embed.php`'s header comment still listed Dailymotion in a few spots after it was dropped for CORS — cleaned up. 0.1.2: **superseded the 16∶9 floor with a `maxWidth` cap + the real ratio.** Reported follow-up: a full-page-wide `.embed` (no `max-width` at all) still read as huge even at a "correct" ratio. `.embed` now caps at `max-width: var(--embed-max-width, 40rem)`, and `embed.js` sets the video's **actual** aspect-ratio (no more `Math.max(…, 16/9)`) — once width is bounded, a 4∶3 card is simply a modestly-sized square-ish box, not a page-dominating one; the floor hack is gone. Two new options, `maxWidth` (default `"40rem"`, `"none"` removes the cap) and `forcedAspectRatio` (default `""`, e.g. `"1 / 1"` to pin every card to one shape for a uniform grid) — both bridged from JS `options` into the static SCSS the only way there is: `register()` writes a small `.generated-vars.scss` into the plugin's own install directory on every build (`:root { --embed-max-width: … }` + a `!important` `.embed { aspect-ratio: … }` when a ratio is forced, since `!important` in a stylesheet is what lets it beat the inline style `embed.js` always sets) — gitignored in this monorepo (`packages/plugin-embed/.generated-vars.scss`, since a workspace-hoisted `file:` dep here means `pluginDir` resolves to the real tracked source folder, not an installed copy). Verified: `maxWidth: 22rem` + `forcedAspectRatio: "1 / 1"` together measured exactly 429×429 (ratio 1.00) via `getBoundingClientRect()` in a real headless build. 0.1.3: dep bump to `@kirigami/canva` 2.5.1. 0.1.4: dep bump to `@kirigami/canva` 2.5.2 / `@kirigami/sdk` 0.2.1; `homepage` + README pointed at the site (metadata only). |

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
  messages (Québécois), and `todo.md`. User-facing CLI strings — and the export
  banner's `###DATE###` (`utils.js` `formatDate()`, was `formatFrDate`) — are
  English.
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
   - badges: npm version, license, Node.js version (php-wasm adds a PHP badge),
     website (static shields.io badge → `https://php-kirigami.github.io`).
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

Non-package repos (`../template-*/`, `../kiribuild/`, the `.github.io` site) don't
follow the full structure, but every README everywhere still opens with the
`<div align="center">` block: logo `<img>`, `---`, an h1 title, a one-line
description with **Kirigami** bolded, and at least a license badge (+ a Node badge
where the repo pins `engines.node`).

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
`@kirigami` publish rights. If npm's account has 2FA on, `npm publish` errors
`EOTP` and prints a browser-auth URL — that browser flow only works when the
command runs in an interactive TTY; from a non-interactive shell (e.g. an
agent driving the terminal) it fails immediately instead of polling, so pass
`--otp <code>` explicitly. After a publish, npm's registry/CDN + `npm view`'s
local cache lag a few minutes — a fresh `npm view <pkg>@<new-ver>` still
showing the old version right after `npm run release` is almost always
propagation, not a failed publish (check the publish log's `✓ published`).

### Push / release order (always)

Whenever a change spans several repos, ship them in this order:

1. **`npm run release`** — publish the `packages/*` bumps (push `main` first).
2. **Tag a new `kiribuild` version** if the action changed (its own repo:
   `vX.Y.Z` tag + move the `v2` tag).
3. **The templates** (`../template-*/`) — floor dep ranges, rebuild, push.
4. **`../php-kirigami.github.io/`** (the org site) — when it's in the loop.

---

## Current work (as of 2026-09-11)

**The big release shipped (commit `00cf575`).** On npm and good: `@kirigami/sdk`
0.2.0, `@kirigami/canva` **2.4.0**, `@kirigami/php-prepros` **1.7.0**,
`@kirigami/kirigami` **1.4.0**, `@kirigami/plugin-highlight` **0.1.1**. That
release carried: the `META` class (`<head>` SEO/social generator, opt-in via a
top-level `meta:` block, companion to `LD`); canva `styles/prose` (`prose()`
mixin + `.prose` wrapper) and the `reveal` script, both lifting code the starter
templates carried inline; and the `###TIMESTAMP###` render fix (finally — kiri
`latest` on npm is now correct). Both `../template-*/` were updated to
`@use "@kirigami/canva/prose"` + `import "@kirigami/canva/reveal"`, floored to
`@kirigami/canva ^2.4.0`, rebuilt against the published packages, and pushed
(template-default `134ed89`, template-demo `d93246e`) — their CI is unblocked.

**Second release shipped:** `@kirigami/php-prepros` **1.7.1** (lazy `kirigami.yaml`
load — `import '@kirigami/php-prepros'` is side-effect-free; fixes
`kiri build/export/run --help` crashing "Config file not found") + `@kirigami/kirigami`
**1.4.1** (dep bump + `bin/cmd/*.js` `HELP.notes[]` trimmed to one-liners +
`developement` typo). Both on npm, `latest` correct. Templates floored to
`@kirigami/kirigami ^1.4.0` / `@kirigami/plugin-highlight ^0.1.1`, and both
now commit a `package-lock.json` (`npm ci`-ready).

**Third release shipped** (commit `8e36913`, released 2026-09-11). On npm and
good: `@kirigami/canva` **2.5.0**, `@kirigami/php-prepros` **1.7.2**,
`@kirigami/kirigami` **1.5.0**, `@kirigami/plugin-highlight` **0.1.3**
(`sdk`/`struct-walker`/`php-wasm` unchanged, skipped by the release script).
That release carried:
- **canva 2.5.0** — `styles/main` no longer a stub (`.breadcrumb`, `.docs-toc`,
  `.table`/`.table-wrap`, `.badge`/`.badge--muted`, `.palette`) + `conf` themed
  scrollbars. See the package row. `../php-kirigami.github.io/` migrated onto
  it the same day (`@use "@kirigami/canva/main"`, `_main.scss` dropped down to
  its own spacing/font overrides + the one content-specific rule; templates'
  `pkg-table`/`pkg-table__version`/`badge--gpl`/`img-demo__palette` renamed to
  the shared `table`/`table__num`/`badge--muted`/`palette` classes), verified
  visually (headless Chromium, light + dark) on `/ecosystem/` and `/docs/php/`.
- **plugin-highlight 0.1.3** — `@highlight false` page opt-out +
  `nohighlight` / `language-plaintext` per-block opt-out; clean HTML (the
  highlighted `<pre><code>` markup re-indented to match `HTML::format()`
  instead of landing flush-left); the `languages: [html]` (and `js`/`ts`/`md`/
  `yml`/`sh`/`py`) alias fix — highlight.js ships those as aliases baked into
  another module's file (`html`→`xml.js` etc.), so `ensureLanguage()`
  (`src/highlight.js`) now maps the requested name to the real module file via
  a `MODULE_ALIASES` table before importing. Still open: promote an
  actually-unknown language name from warning to build error (see `todo.md`).
- **php-prepros 1.7.2** — span-safe de-indent script in `injectHead()`
  (flattens highlighted `<pre><code>` before first paint, on `innerHTML`, no
  `children.length` skip); `<markdown prose>` opt-in `.prose` wrapper; three
  fixes verified end-to-end against the real WASM runtime (`npm link`ed into
  `../php-kirigami.github.io/`, rebuilt for real): (a) a severe PHPDOC bug
  where an indented hanging-indent continuation line starting with `@word`
  (`fs.class.php` `parseDocBlock()`) was read as a new tag — when that word
  was `@content` the whole rendered page silently vanished; fixed by anchoring
  the tag regex to column 0. (b) GFM `> [!NOTE]` alerts now render inline
  markdown (`toHtml()` instead of `htmlspecialchars()`) like the standard
  blockquote does. (c) `HTML::format()` no longer lowercases SVG/MathML
  foreign-content names (`viewBox`, `linearGradient`, …) — namespace-aware via
  `isHtmlNamespace()`/`tagName()`.
- **kirigami 1.5.0** — banner-from-template (`config.js` fills all `### ###`
  tokens from the `kirigami:` block every build); bundled
  `assets/banner-template.txt` fallback; `kiri create --email`/`--repo` +
  starter `banner.txt`; **`kiri serve`** (watch + local server + hot-reload);
  **`kiri install`** (installs + prints a `plugins:` entry for a plugin). Both
  `../template-*/` got a `kiri:serve` VS Code task.

kiribuild (its own repo, unrelated to this npm release): `main` at `efddf62`,
`npm ci`-when-lockfile-committed fix, `v2.0.5` tagged (`v2` moved onto it), now
published on the GitHub Marketplace.

**`@kirigami/plugin-extlink` 0.1.0 released and live in `template-demo`**
(see the package row above for the mechanics). `/features/tags/` gained "A
tag from a plugin" — an `<extlink>` card sitting right after the hand-rolled
`register_tag()` example, as the contrast: a real installable plugin doing
the same kind of thing. `_data/extlink/` + `assets/images/extlink/` committed
there too. `template-demo`'s other deps floored to match while touching the
file anyway: `@kirigami/canva ^2.5.0`, `@kirigami/kirigami ^1.5.0`,
`@kirigami/plugin-highlight ^0.1.3`. `template-default` not touched — no
obvious spot for an external-link demo in the minimal starter.

**`@kirigami/php-prepros` 1.8.0 / `@kirigami/kirigami` 1.5.1 released.** New
default Markdown plugin `{% img-asset %}` (`md.plugins.php`, alongside
`codepen`/`youtube`/`checklist`/`callout`) — same pipeline as `<img asset>`,
positional `path [width [height [cover]]]`. Verified against the real WASM
runtime in the same scratch project as plugin-extlink (plain / width-only /
square-cover / missing-path-fallback, all four correct). `template-default`,
`template-demo` and `../php-kirigami.github.io/` all floored to
`@kirigami/kirigami ^1.5.1` (+ `template-default` also to
`@kirigami/canva ^2.5.0`, the one still on the pre-2.5.0 floor) and rebuilt —
no `{% img-asset %}` demo added anywhere yet, this was just the dep-floor
pass.

**`@kirigami/plugin-embed` 0.1.0 released** (`@kirigami/php-prepros` 1.9.0 /
`@kirigami/kirigami` 1.5.2 alongside it — see the package rows above for the
mechanics of all three). `<youtube>`/`<vimeo>` oEmbed cards, entirely
client-side. Not yet consumed by any site or template — no demo added
anywhere yet.

**`@kirigami/canva` 2.5.1 — not yet released, bumped/committed, `npm run
release` pending an OTP.** Real bug reported by the user while browsing
`../php-kirigami.github.io/`'s `/docs/authoring/`: toggling the theme
(`data-theme-toggle`) visibly reflowed every highlighted code block — the
whole page shifted on every click. Root cause: `styles/prose.scss`'s
standalone code defaults (`code, kbd, samp, pre { font-family; font-size }`
and `pre { code { padding: 0; … } }`) are scoped under `.prose`, and once
compiled that gives them **equal-or-higher CSS specificity than
`plugin-highlight`'s own `.hljs` theme rule** (a single class) — so in light
mode / no `data-theme` attribute, prose's reset wins and a highlighted block
renders unpadded with the wrong font metrics; only `[data-theme="dark"]
.hljs` (two classes) has enough specificity to win, so dark mode looked
right and light mode was actually the broken one — most visible as a jump
*when switching between them*, not as an obviously "broken" single state. A
comment in the source already claimed "those rules land after these and
take over", which is false: CSS cascade order never gets a chance to matter
here because specificity is decided first. Fixed both rules with an explicit
`:not(.hljs)` exclusion instead of relying on source order. Verified with a
Playwright repro (`getBoundingClientRect()` before/after a real
`[data-theme-toggle]` click, and a full `getComputedStyle()` diff) against
the monorepo's own source first, then — since the site consumes canva from
**the real npm registry**, not a workspace `file:` link — by temporarily
overwriting `../php-kirigami.github.io/node_modules/@kirigami/canva/dist/`
with the freshly built local `dist/` to prove the fix end-to-end before
committing to a release: page-wide height diff went from 699px (many blocks
each +40-47px) to 0px. `@kirigami/kirigami` 1.5.4 / `@kirigami/plugin-embed`
0.1.3 / `@kirigami/plugin-highlight` 0.1.4 bumped alongside it (exact-pin dep
bump only, no code change) — `npm run release` will publish all four; the
site and both templates still need their `@kirigami/canva` floor bumped to
`^2.5.1` afterward.

**canva is a permanent part of this monorepo — reuse its code rather than
re-implementing shared helpers per package** (that's why plugin-highlight now
depends on it).

### kiribuild v2 + template CI

`php-kirigami/kiribuild@v2` is live: the composite action is trimmed to Node 24 +
`kiri` CLI + `kiri export` (v1's checkout / commit-back / Pages upload-deploy
moved out to the caller; inputs `lfs` and `commit-message` gone). Both
`../template-default/` and `../template-demo/` now ship an identical
`.github/workflows/page.yml`: checkout → `kiribuild@v2` → commit back whatever the
build regenerated (`git add -A`, `[skip ci]`) → `upload-pages-artifact` →
`deploy-pages`. CI installs `@kirigami/kirigami@latest` from npm; with kiri 1.4.0+
released the `###TIMESTAMP###` re-bake is gone, so the commit-back should now be
quiet apart from genuinely regenerated assets.

**Real end-to-end deployment verified (2026-09-11), not just a green workflow
run.** This session pushed dozens of real commits to `../php-kirigami.github.io/`,
`../template-demo/` and `../template-default/`'s `main` branches — every one
triggered a real `Build & Deploy` run via `kiribuild@v2`. Checked the actual
live public URLs afterward, not just `gh run list`'s ✓: `https://php-kirigami.github.io/`
(org site), `/template-demo/` and `/template-default/` (both real project
Pages under the org site, confirmed live at those paths) all return 200 and
serve content matching the latest source — spot-checked the Marketplace
mention on `/templates/`, the `.reqs`/`.steps` mobile CSS fix's `min-width:0`
in the compiled stylesheet, and `plugin-extlink`/`plugin-embed` usage on
`template-demo`'s `/features/tags/`. `sitemap.xml`'s `<lastmod>` and the
response `Last-Modified` header both matched the actual push timestamp. Closes
the "real kiribuild test" todo item — this wasn't one staged scenario but the
action's genuine, repeated, real-world usage all session.

Recently landed (siblings, their own repos):

- **`../template-default/` rebuilt as a real starter kit**: layout + 2 pages +
  themeable SCSS (green palette, light/dark) + progressive-enhancement JS +
  `.vscode` + `package.json` + `.editorconfig`. Both templates' `header.php`
  gutted of asset plumbing (managed `<head>` does it now).
- **`.github/workflows/page.yml`** added to both templates; both rebuilt so
  `src/**/*.html` carry the literal `?###TIMESTAMP###` again (undoing an earlier
  CI commit-back that baked real timestamps in).
- **READMEs**: every repo README now opens with the `<div align="center">` logo
  block — `template-*`, the `.github.io` site and `kiribuild` included.
  `template-demo`'s README is a full feature tour ("Claude.ai Ready"); the site
  README replaced its bare `Website` stub.
- every `template-*` `CLAUDE.md` re-copied from `docs/template-CLAUDE.md` (its
  Deployment section rewritten for kiribuild v2).

The `HTML::format()` SVG/MathML lowercasing DX issue and plugin-highlight's
`@highlight false` PHPDOC page-skip are now fixed, released in php-prepros
1.7.2 / plugin-highlight 0.1.3 (see "Current work" above).

Still-open `todo.md` items: an `<extlink>` authoring tag (calls `SCRAPER`); a
real kiribuild action test; plugin-declared tasks / commands (`kirigami.type`
`"task"` / `"command"`).
