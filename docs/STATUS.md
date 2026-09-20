# Status

## Documentation refresh — 2026-09-20

Reviewed all 32 repository-owned Markdown files against the current source and manifests. Updated the core/CLI split, MCP and VS Code status, native YAML/Markdown references, page types, SDK command registration, runtime helpers, examples, license inventory, and documentation navigation. Historical version entries remain historical; no package versions were changed. Runtime extension availability was checked with `node packages/cli/bin/kiri.js phpinfo -m`.

Audit A15 is addressed in the monorepo documentation. Other audit findings remain open; documenting their behavior does not fix the code. Registry publication, organization-profile publication, live site deployment, and a real VS Code Extension Host test are not part of this documentation pass. Remaining documentation/release work is tracked in [DOCTODO.md](DOCTODO.md).

Earlier entries record the state at the time of implementation. In particular, reload freshness claims are limited by the later A06 finding: PHP state remains cached.

Running log of what's shipped recently, most recent at the bottom. This is
a changelog, not a reference — for durable facts see [CONTEXT.md](CONTEXT.md),
for the "why" behind a choice see [DECISIONS.md](DECISIONS.md).

Audit reference: [2026-09-20 repository audit](AUDIT-2026-09-20.md).

## Release history (2026-09-10 to 2026-09-11)

**Release 1** (`00cf575`): `@kirigami/sdk` 0.2.0, `@kirigami/canva` 2.4.0,
`@kirigami/php-prepros` 1.7.0, `@kirigami/kirigami` 1.4.0,
`@kirigami/plugin-highlight` 0.1.1. Carried: the `META` class (`<head>`
SEO/social generator, opt-in `meta:` block); canva `styles/prose` +
`reveal` script (lifted from what the starter templates carried inline);
the `###TIMESTAMP###` render fix. Both `../template-*/` updated and pushed.

**Release 2**: `@kirigami/php-prepros` 1.7.1 (lazy `kirigami.yaml` load —
`import '@kirigami/php-prepros'` is now side-effect-free, fixing `kiri
build/export/run --help` crashing with "Config file not found") +
`@kirigami/kirigami` 1.4.1. Templates floored and now commit a
`package-lock.json` (`npm ci`-ready).

**Release 3** (`8e36913`): `@kirigami/canva` 2.5.0, `@kirigami/php-prepros`
1.7.2, `@kirigami/kirigami` 1.5.0, `@kirigami/plugin-highlight` 0.1.3.
Carried: canva's `styles/main` (`.breadcrumb`, `.docs-toc`, `.table`,
`.badge`, `.palette`) + themed scrollbars; plugin-highlight's `@highlight
false` page opt-out, clean re-indented HTML output, and the language-alias
fix (`html`→`xml.js` etc., via a `MODULE_ALIASES` table); php-prepros's
banner-from-template system, `kiri serve` (watch + local server +
hot-reload), and `kiri install`.

**Release 4**: `@kirigami/canva` 2.5.2, `@kirigami/struct-walker` 1.0.5,
`@kirigami/php-prepros` 1.9.3, `@kirigami/sdk` 0.2.1, `@kirigami/kirigami`
1.5.6, `@kirigami/plugin-embed` 0.1.4, `@kirigami/plugin-extlink` 0.1.3,
`@kirigami/plugin-highlight` 0.1.6. Carried: canva's `.hljs` specificity
fix (theme toggle no longer reflows highlighted code) and
plugin-highlight's matching inline-code fix; plugin-extlink's `{%
extlink %}` Markdown shortcut; `kiri serve`'s `EADDRINUSE` message and CSS
hot-injection; php-prepros's `/roadmap/` multi-line-list fix;
plugin-highlight now fails the build eagerly on an unknown `languages:`
name, and no longer ships a dead `copyButton` when there's no esbuild task.

**Release 5**: `@kirigami/canva` 2.6.0, `@kirigami/kirigami` 1.5.7,
`@kirigami/plugin-highlight` 0.1.7, `@kirigami/plugin-embed` 0.1.5.
Feature: canva's `styles/lightswitch` — an animated theme toggle whose pin
morphs from a sun into a crescent moon via a real CSS `d` path transition,
colored from `conf` tokens rather than a fixed palette (after user
feedback on an earlier hardcoded-color draft). Also: a full README "what's
new" audit across kirigami/php-prepros/sdk/plugin-highlight/plugin-extlink/
plugin-embed, several of which had fallen behind their actual published version.

**Release 6**: `@kirigami/php-prepros` 2.0.0, `@kirigami/kirigami` 2.0.0.
**Breaking**: `meta:`/`jsonld:` merged into `seo:` (see
[DECISIONS.md](DECISIONS.md)). `../php-kirigami.github.io/` and both
`../template-*/` migrated and floor-bumped to `^2.0.0` in the same release.

**kiribuild v2**: the composite action trimmed to Node 24 + `kiri` CLI +
`kiri export` only; checkout/commit-back/Pages upload-deploy moved to the
caller's workflow. Both templates ship an identical `.github/workflows/page.yml`.
Tagged `v2.0.5`, published on the GitHub Marketplace. Verified end-to-end
against real live deployments (not just green CI runs) on all three public
sites — `sitemap.xml`'s `<lastmod>` matched the real push timestamp.

**New package**: `packages/audiowaveform-wasm/`, published as
`@kirigami/audiowaveform-wasm@1.0.0` (2026-09-12) — waveform peak
extraction + ID3 tag/cover-art reading, vendoring the compiled output of
the sibling repo `audiowaveform-wasm-compiler`.

## Session 2026-09-15 / 2026-09-17

- `canva/conf.scss` now calls `font-style-detect($path)` in its
  `@font-face` loop instead of a hardcoded `font-style: normal` — see
  [DECISIONS.md](DECISIONS.md) for the `"ital-axis"` sentinel guard.
  Verified against a real `kiri build` (template-default, Roboto Flex +
  Quicksand fonts).
- New `$font-mono` / `--font-mono` token in `canva/conf.scss`
  (`main.scss`/`prose.scss` and plugin-highlight's `$code-font` now point
  at it instead of duplicating a fallback stack).
- `.d.ts` files written for every `canva/dist/scripts/*.js` export (`dom`,
  `helpers`, `theme`, `observer`, `reveal`, `components/burger`) — the
  `copyDeclarations()` plumbing in `build.js` already existed, nothing was
  being copied yet. Verified with a real `tsc --noEmit` against all 6 import paths.
- `canva/utils.scss` reviewed end to end: every function still pulls its
  weight (`wash`/`hex6`/`hexbin` are intentional documented public API,
  not dead code); only actual finding was an unused `@use "sass:map"`, removed.
- `plugin-highlight`'s build-time highlighter and canva's `observer` are
  **not a candidate for merging** — one rewrites a raw HTML string in Node
  before any DOM exists, the other needs a live browser DOM. Documented in
  the source so the question doesn't resurface.
- `@kirigami/plugin-extlink`: `class=""` attribute added to `<extlink>`,
  same pattern as the existing `title`/`description`/`image`/`label`
  overrides (not exposed on the `{% extlink %}` Markdown shortcut, which
  only takes 2 positional args). README updated.
- `php-prepros`: `humans.txt` now generated from `kirigami.yaml`'s
  `author`/`email` fields (`PREPROS::humans()`, wired into `sitemap()`) —
  only written when at least one of the two is present.
- `injectHead()`'s "already referenced" check tightened — see
  [DECISIONS.md](DECISIONS.md) for the `hasAssetTag()` fix.
- `@kirigami/bestframe` added: automatic video thumbnail/still-frame
  selection via a small embedded aesthetic-AI model compiled to WASM.
- `refactor/core-api` branch: `@kirigami/cli` package extracted from
  `@kirigami/kirigami` — see [DECISIONS.md](DECISIONS.md). In progress,
  not yet published.
- `CLAUDE.md` (470 lines) retired in favor of this `docs/` split, kept
  under 200 lines as a short entry point going forward.
- `php-prepros`: `YAML::` switched to a native-`yaml`-extension backend
  (libyaml, statically built into `@kirigami/php-wasm`) — ~6.8x faster
  (0.58ms/iter vs 3.97ms/iter on a ~4KB corpus, 500 iterations), same
  public API (`parse()`, `parseFile()`, `loadFile()`). The previous
  hand-written parser is kept as `YAML_LEGACY`
  (`src/libraries/yaml-legacy.class.php`, autoloadable) as a rollback
  path. See [DECISIONS.md](DECISIONS.md) for the "why" and
  [BUGS.md](BUGS.md) for the one open behavioural difference.
- **Page types** (`php-prepros`): a page can now declare `@type <name>` in
  its PHPDOC header; if `prepros.types.<name>` exists in `kirigami.yaml`,
  its `before`/`after` wrap the page body one level *inside* the global
  `prepros.before`/`after` (global before → type before → body → type
  after → global after). No `@type`, or a name absent from
  `prepros.types`, falls back silently to the global-only wrap — verified
  with a local fixture build (`kiri build` against the workspace source).
  New `pre_type_before`/`post_type_before`/`pre_type_after`/
  `post_type_after` hooks mirror the existing global-wrap hooks. Schema
  (`prepros.types`), `prepros.js` (mounts type before/after files), and
  `prepros.class.php` (`PREPROS::render()`) all updated; `php-prepros`
  README updated (config table, `@content`/`@indent` section renamed to
  include `@type`, hooks table, render pipeline steps). See
  [DECISIONS.md](DECISIONS.md) for the design. Not yet in a
  `docs/template-CLAUDE.md` fan-out or a released version — `refactor/core-api`
  branch, in progress.
- **`php-prepros` bootstrap switched to `auto_prepend_file`**: the
  framework (autoloader, `$argv`/`$config`, aliases, `boot` hook —
  `src/utils.inc.php`) used to be loaded by an explicit
  `include(__DIR__.'/utils.inc.php')` at the top of each of the three PHP
  entrypoints (`prepros.php`, `runenv.php`, `imagebatch.php`). Now it's one
  `auto_prepend_file` ini directive set in `prepros.js`'s
  `getPHPInstance()` (`setIniValues()`, already the mechanism used for
  `memory_limit` etc.); the three entrypoints no longer `include` it
  themselves. New symmetric `shutdown` hook (via
  `register_shutdown_function()` in `utils.inc.php`) — **not**
  `auto_append_file`, which PHP skips whenever the script exits, and every
  entrypoint always exits via `STD::succeed()`/`STD::error()`. Verified
  with a local fixture: page rendering unchanged, `kiri run` still sees
  `PREPROS`/`MD` classes, and the `shutdown` hook fires even through
  `STD::succeed()`'s `exit()` (confirmed via `error_log()` landing in
  `stderr`/`warnings`, since `PREPROS::exportFile()` called from a
  shutdown hook is too late — the result JSON is already written before
  shutdown runs). See [DECISIONS.md](DECISIONS.md). README updated
  (`shutdown` hook row, bootstrap note). `refactor/core-api` branch, in
  progress.
- **`@kirigami/mcp` added**: new package, a third "face" over
  `@kirigami/kirigami`'s `Project` API (sibling to `@kirigami/cli`), serving
  an MCP server over stdio — `kirigami_config`/`validate`/`build`/`export`/`run`
  tools. `@kirigami/cli` gained `kiri mcp` as a thin wrapper (same pattern as
  its other commands), resolving a `// Ajouter une commande pour starter le
  mcp` note that had been sitting at the top of `bin/kiri.js`. `serve`/`watch`
  deliberately excluded — long-running, doesn't fit a request/response tool
  call (see [DECISIONS.md](DECISIONS.md)). Every tool but `kirigami_validate`
  calls `project.reload()` before acting, so a tool never answers from a
  config snapshot older than the agent's own last edit. Verified end-to-end
  with a raw JSON-RPC smoke test against a local fixture: `initialize` →
  `tools/list` → `kirigami_config` (reflects the page-types feature added
  earlier this session) → `kirigami_build` (real files rendered) →
  `kirigami_run` (confirms `PREPROS`/`MD` availability and the `shutdown`
  hook firing) — and `kiri mcp`/`kiri mcp --help` from `@kirigami/cli`, stdout
  confirmed clean of anything but protocol JSON once connected. Not yet
  published (`0.1.0`, unreleased) — `refactor/core-api` branch.
- **`@kirigami/mcp`/`@kirigami/kirigami` grown discoverability + single-task
  run**: three new tools — `kirigami_list_scripts`, `kirigami_list_tasks`,
  `kirigami_run_task` — plus the `Project` methods/getters backing them
  (`.scripts`, `.tasks`, `.runTask(name)`, all in `packages/kirigami/index.js`
  since they're general `Project` API, not MCP-specific — same "lives in
  @kirigami/kirigami" call as the rest of this feature). `.scripts` doesn't
  just echo the yaml `scripts:` block — it globs `scripts/*.php` on disk
  (`findFiles()`, already used by `runscript.js`'s own `mount:` resolution)
  and merges in `mount`/`trigger` from a matching yaml entry when one
  exists, because `runscript()` runs any `scripts/<name>.php` file
  regardless of yaml declaration — a yaml-only listing would have
  undersold what `kirigami_run` can actually do. `.tasks` is exactly the
  list `build()` iterates (`tasks:` entries + the implicit `"render-all"`
  prepros task); `.runTask(name)` finds one by name and runs it forced,
  bypassing `before-build` and every other task. Verified against the same
  local fixture (now with a `scripts:`/`tasks:` block added): listing
  correctly merges disk + yaml, `runTask("js-core")` and
  `runTask("render-all")` both produce real output files independently,
  and an unknown name returns a structured failure instead of throwing.
- **`MD::` swapped to the native `mdhtml` extension** (`@kirigami/php-wasm`
  8.5.10-6, freshly compiled via `php-wasm-compiler` with `mdhtml` now
  statically built in). Old hand-rolled renderer retired to `MD_LEGACY`
  (`md-legacy.class.php`), same pattern as the earlier `YAML::` swap — see
  [DECISIONS.md](DECISIONS.md). Verified through the real WASM runtime:
  `MD::toHtml()` renders CommonMark/GFM correctly and the default plugins
  ({% codepen %}, {% checklist %}, {% callout %}, {% img-asset %}, loaded
  from `md.plugins.php`) still register and expand correctly, including
  the C extension calling back into the registered PHP closure.
- **`packages/vscode` v1 scaffold** — a fourth "face" over
  `@kirigami/kirigami`'s `Project` API (npm name `kirigami-vscode`, not
  `@kirigami/vscode` — see [DECISIONS.md](DECISIONS.md) for why), per the
  scope in [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md): 5 Command Palette
  actions (build/export/run/validate/toggle dev server), a status bar item
  reflecting idle/running/building/error, and a `kirigami.yaml` reload
  watcher. Required a new `Project.serve({ onBuildResult })` option
  (`@kirigami/kirigami` 2.0.0 → 2.1.0, `@kirigami/cli`/`@kirigami/mcp`'s
  pins bumped to match) so watch-triggered rebuild results reach an
  embedder instead of only `console.log` — see
  [DECISIONS.md](DECISIONS.md) for that and for three esbuild-bundling
  gotchas found (and fixed) by actually building and running the bundle:
  an `import.meta.url`-in-CJS shim, a `require()`-vs-ESM-only-exports
  workaround for `@kirigami/php-prepros`, and a `node_modules/vscode` name
  collision. Verified: `npm install` picks up the new workspace package,
  `npm run compile` bundles cleanly, and the bundle loads under plain Node
  up to (and only up to) the expected `Cannot find module 'vscode'` —
  the real Extension Development Host (F5) wasn't driven end-to-end (no
  GUI in this environment), so the actual command/status-bar/watcher
  behavior inside VS Code itself is still unverified — see the plan's
  verification steps 3–6 for what to check first.

## 2026-09-20 — Repository audit and language preference

Recorded the repository audit in docs/AUDIT-2026-09-20.md and indexed its open
findings in docs/BUGS.md. Verified JavaScript/PHP syntax, dependency resolution,
registry audit, the extension build, and isolated runtime reproductions.
Production fixes remain open. Added AGENTS.md and aligned CLAUDE.md and
docs/CONTEXT.md: project content and commit messages are English; conversations
with the user are French. The preference is also stored in the user's global
Codex AGENTS.md.

## Export safety — A01 and A02

Export now rejects identical or nested source/destination paths, checking both lexical and real filesystem paths (including junctions and nonexistent output descendants). The public API checks before export hooks or rendering, and the dist task rechecks immediately before clearing its output. Absolute paths retain their meaning instead of being rewritten by `replaceRoot()`.

The copy excludes `.php` files case-insensitively and dot-prefixed directories, preserving the existing underscore/source-asset filters and explicit ignore rules. Hidden public directories such as `.well-known` are excluded too; there is no exception mechanism in this change.

Regression command: `node --test --test-isolation=none packages/kirigami/test/dist.test.js`. Tests cover destructive overlaps, junction aliases, a missing output under an alias, public/private file selection, replacement of stale output, and rejection before API triggers. No package versions changed. Sibling documentation synchronization remains deferred at the user’s request.

## TLS verification — A03

Enabled certificate-chain and hostname verification in `CURL::getInfo()` and `CURL::getContents()` without adding an insecure opt-out. Failed metadata requests now return `false` instead of an apparently usable cURL info array.

Validation: `node --test --test-isolation=none packages/php-prepros/test/curl-tls.test.js` passes using a local HTTPS server and a temporary generated certificate. Native PHP runs the helper with only its WASM cookie path relocated into the fixture directory. Tests cover untrusted certificates, a trusted certificate, mismatched hostnames, redirects to a mismatched hostname, and file downloads. The test also verifies that WASM receives Node’s CA bundle and active `curl.cainfo`/`openssl.cafile` directives. It requires a local PHP executable (`PHP_BINARY` can override `php`) with the cURL extension available.

The current working-tree WASM binary timed out before reaching the proxy in end-to-end HTTPS trials; no runtime/binary changes were made to hide this limitation. Follow-up is recorded in BUGS.md. No versions changed, and no sibling documents were synchronized.

## Plugin installation safety — A04

`kiri install` validates all plugin arguments before registry access or installation. It accepts lowercase bare names, `@kirigami/plugin-*`, `kirigami-plugin-*`, and `@scope/kirigami-plugin-*`; URLs, paths, version suffixes, options masquerading as names, and shell syntax are rejected. Registry versions are validated before forming package specifications. Full names still support offline/private-registry fallback. Boolean `--save` now works before or after names.

npm runs through `execFileSync` with separate arguments and `shell: false`; Windows resolves `npm-cli.js` from the npm environment, PATH installation directories, or the Node installation and executes it with Node. Missing npm produces an explicit error, with no shell fallback.

Validation: all eight tests pass with `node --test --test-isolation=none packages/cli/test/install.test.js` on Windows / Node 26. Tests stub registry requests and installation, and use a real local Node subprocess to verify Windows argument delivery and failure propagation. No registry packages were installed; Unix execution and Node 24 were not exercised. No versions changed.

## Starter project generation — A05

`kiri create` now generates missing starter manifests with explicit `@kirigami/cli`, `@kirigami/kirigami`, and `@kirigami/canva` dependencies, using each installed package's version. Package resolution follows the CLI/core dependency graph rather than assuming a workspace layout. Canva now exports its `package.json` for this lookup. The fallback banner comes from core's assets and retains its build-time tokens. Existing manifests and banners retain their previous preservation/merge behavior.

Validation: all four tests pass with `node --test --test-isolation=none packages/cli/test/create.test.js` on Windows / Node 26. Coverage includes an isolated nested package fixture and the real create command using local archive fixtures, with `--no-git --no-install`. The command creates missing starter files, points YAML at the generated banner, and preserves existing dependency/script/banner values. GitHub downloads, registry installation, Node 24, and Unix execution were not tested. No package versions changed; sibling documentation synchronization remains deferred.
