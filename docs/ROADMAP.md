# Roadmap

Future feature ideas, not yet scheduled or scoped in detail. For active,
near-term action items see [TODO.md](TODO.md); for known open questions
and limitations see [BUGS.md](BUGS.md).

- **`FS::phpFileInfo()` cascade** — let a page inherit PHPDOC tags from an
  ancestor `_index.php` (instead of only reading the file itself), so a
  value can be set once at a section level rather than repeated on every
  child page.
- **Composer support for PHP** — allow PHP dependencies via Composer
  (`vendor/autoload.php`) in a Kirigami project, alongside the current
  JS classes/plugins system. Needs scoping: mounting `vendor/` in the WASM
  runtime, package compatibility with the sandboxed environment, etc.
- **Electron UI + VS Code extension** — a GUI to drive `kiri`
  (build/export/serve, plugin management, `kirigami.yaml` editing) without
  the terminal. The VS Code half is now scoped (commands, a status-bar
  server toggle + task indicator, packaging) — see
  [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md). The Electron half is still
  just an idea.
- **Automatic Google Analytics (gtag) integration** — a config option
  under the unified `seo:` block that injects `gtag.js` automatically when
  a measurement ID is provided.
- **Language file system (i18n)** — externalize text strings instead of
  hardcoding them in PHP pages. First step toward multilingual support
  (routing/URLs per language, `hreflang`, project structure — explore later).
- **`kiri deploy` command with a plugin system** (FTP, Git push to a
  branch, etc.) — takes the exported `dist/` and deploys it. Complements
  `kiribuild` (already GitHub Pages via Actions) rather than replacing it,
  for non-Pages targets.
- **Local (gitignored) file for env vars mimicking GitHub Actions** — to
  test locally under conditions close to CI (same variable names) without
  depending on a real GitHub run.
- **`template-react`** — an official template with a real JSX/TSX pipeline
  (esbuild already supports it natively). Needs scoping: build-time-only
  static HTML vs. client hydration, and how it fits alongside the existing
  PHP pages.
- **`kirigami.type: "task"` / `"command"`** — packages that add a task
  type or a `kiri` subcommand, and their loading (`"plugin"` is already in
  place). The broader idea: a plugin declaring its own task / bundling its
  own JS, without depending on a project esbuild task.
- **`prepros:before-render` hook** — JS hook before render (the
  post-render `prepros:html` hook already exists).
- **Official Google Docs → Markdown action/script** — a service that
  takes a Google Doc and converts it to `.md` (to feed a `_data/` folder
  or a Kirigami page), packaged as an official action/script.
- **Official Excel → JSON action/script** — same idea, for an
  Excel/`.xlsx` file to `.json` (to feed a `_data/` folder).
- **Wire the `navicat` PHP-WASM extension into `php-prepros`.** The
  extension itself is already built and available in the runtime
  (`@kirigami/php-wasm`, v0.1.5 — mysql/pgsql/sqlite backends over
  libcurl, see [docs/CONTEXT.md](CONTEXT.md)), inspired by Navicat's HTTP
  tunnel mechanism. Nothing in `php-prepros` calls it yet — needs a class
  (`DB`? mirroring `SCRAPER`'s shape) so a page/`_data/` can query a
  database through it instead of relying on a static export.
- **Wire the `jsonk` PHP-WASM extension into `php-prepros`.** Also already
  built (v0.1.4) — native JSON-schema validation (pattern/patternProperties/
  format:"regex", external `$ref` resolution via curl, apcu-backed fetch
  cache) plus a drop-in `json_encode()`/`json_decode()` replacement. Not
  yet consumed anywhere. Candidate: replace `SCHEMA`'s pure-PHP validator
  (see the "stay lite" convention in [docs/CONTEXT.md](CONTEXT.md), which
  this would need to update) — worth checking whether `jsonk`'s validation
  coverage actually matches what `kirigami.schema.json` / plugin
  `options.schema.json` need before swapping it in.
- **A class to fetch posts (and more) via the WordPress REST API** — same
  spirit as `SCRAPER`: a dedicated PHP class to query a WordPress site
  (`/wp-json/wp/v2/posts`, etc.) and feed a page/`_data/` with real
  WordPress content.
- **Get `kirigami.schema.json` onto SchemaStore officially** — submit the
  schema to schemastore.org / `SchemaStore/schemastore` so autocomplete
  works without the `# yaml-language-server: $schema=...` comment in every
  `kirigami.yaml`.
- **esbuild importer** — give it the same Node resolution as the Sass
  importer, if it's ever needed (currently bundles absolute paths supplied
  by hooks, so it's fine for now).
- **No-build theme toggle, layer 2** — `injectHead()` already injects the
  FOUC guard as `<head>`'s first child. Extend it: when the doc contains
  `data-theme-toggle` (probed via `str_contains`), also inject the full
  runtime (~15 lines) before `</body>`, like the de-indent script. Gate:
  `prepros.head.theme` (default on, `false` for whoever imports
  `@kirigami/canva/theme` directly). Result: a bare
  `<button data-theme-toggle>` in the layout is enough, zero JS/import/
  esbuild task. `canva/theme.js` stays the "I want the exports /
  `setTheme()`" path. Cost: the contract (`kirigami-theme` key,
  `canva:themechange` event, `data-theme` attr) then lives in both canva
  **and** a PHP string in php-prepros — keep the injected snippet minimal,
  `canva/theme.js` stays the source of truth.
- **favicon.ico / apple-touch-icon.png generator from an `assets/`
  image** — one source image → both files, via `runenv` to call Imagick
  (GD alone doesn't do multi-resolution `.ico`). Candidate: a new `IMG`
  method (`IMG::favicon()`?) or a bundled `kiri run`; hook into the
  existing `image.source`/`image.dest` config rather than a new block.
- **Our own `php-wasm-builder`, derived from WordPress Playground** — to
  more easily update PHP/extension/lib versions (currently following the
  upstream fork as-is). Large project, not scoped yet — needs its own plan
  (which extensions to keep, target PHP version, how to reproduce
  Playground's Docker build).
- **`plugin-highlight`: line numbers option** — no current way to show
  line numbers on a highlighted `<pre><code>` block. New option (e.g.
  `lineNumbers: true`), handled in `highlightHtml()`
  (`src/highlight.js`) + the SCSS theme (`assets/_highlight.scss`).

## Elsewhere

- **`template-demo`** has its own `todo.md`:
  `C:\projects\kirigami\template-demo\todo.md`. Theme toggle: settled —
  both templates use `import "@kirigami/canva/theme"` (no more inline
  reimplementation). Still open there: reactivate `prepros.format`.
