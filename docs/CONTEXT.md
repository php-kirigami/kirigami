# Context

Durable facts about Kirigami: what it is, how the monorepo and its sibling
repos are laid out, licensing, and code conventions. This is the "what is
true right now and doesn't change often" file — see [STATUS.md](STATUS.md)
for what's actively being worked on and [DECISIONS.md](DECISIONS.md) for
the "why" behind non-obvious choices.

## What Kirigami is

**Kirigami** is a static site generator that compiles PHP page templates
into dependency-free static HTML, running PHP entirely in WebAssembly
inside Node.js (no PHP install, no server). It targets GitHub Pages +
GitHub Actions especially.

- npm workspaces monorepo. Packages are published under the `@kirigami/*` scope.
- GitHub org `php-kirigami`, repo `php-kirigami/kirigami` (`origin`, branch `main`).
- The reusable CI action lives separately at `php-kirigami/kiribuild`.
- Sole author / maintainer: Maxime Larrivée-Roy.
- Every project that uses Kirigami is driven by one `kirigami.yaml` at its
  root, validated against `packages/kirigami/kirigami.schema.json`.

## Sibling repos (checked out next to this one)

Cloned as siblings of this repo (`../<name>/`), all under the `php-kirigami` org:

| Path | Repo | What it is |
|---|---|---|
| `../template-*/` | `php-kirigami/template-<name>` | every Kirigami template — `kiri create <name>` clones these. Currently `../template-default/` (minimal starter) and `../template-demo/` (full feature tour; has its own `todo.md`). |
| `../php-kirigami.github.io/` | `php-kirigami/php-kirigami.github.io` | the org site, itself built with Kirigami |
| `../kiribuild/` | `php-kirigami/kiribuild` | the reusable GitHub Action (v2: Node 24 + `kiri` CLI + `kiri export` only — checkout/commit-back/Pages upload-deploy live in the caller's workflow) |
| `../php-wasm-compiler/` | `php-kirigami/php-wasm-compiler` | toolchain that compiles the custom PHP WASM in `@kirigami/php-wasm` |
| `../audiowaveform-wasm-compiler/` | `php-kirigami/audiowaveform-wasm-compiler` | Docker/Emscripten pipeline that produces `@kirigami/audiowaveform-wasm`'s compiled output |

Every Kirigami **site** project (`../template-*/`, the `.github.io` site)
carries a `CLAUDE.md` based on [template-CLAUDE.md](template-CLAUDE.md)
in this same `docs/` folder. The shared reference is authored here; project-specific headers remain local.
**After changing `docs/template-CLAUDE.md`, re-copy it into every
`../template-*/CLAUDE.md`** (and the site repo), preserving any filled-in project-specific header. Apply updated conventions to that header without replacing site metadata with placeholders. Don't confuse that file
with this one: `template-CLAUDE.md` is the doc for end-user Kirigami
*sites*, this `CLAUDE.md`/`docs/` set is for the Kirigami monorepo itself.

## Packages (`packages/`)

| Package | Ver | Role |
|---|---|---|
| `@kirigami/kirigami` | 2.1.0 | Core engine — `load()` / `Kirigami.load()` → `Project.reload()/.validate()/.build()/.serve()/.watch()/.export()/.run()/.runTask()`, plus `.config`/`.plugins`/`.tasks`/`.scripts` getters (returned objects are not immutable), config loading, the plugin/task/schema system. No CLI of its own since the core-api split — `@kirigami/cli` is the terminal face. `serve()` also takes an `onBuildResult` callback (added for `packages/vscode`, see [DECISIONS.md](DECISIONS.md)) so an embedder can reflect real watch-rebuild state. |
| `@kirigami/cli` | 0.1.0 | The `kiri` command — thin terminal wrapper (`build`/`export`/`watch`/`serve`/`run`/`mcp`/`create`/`install`/`cache`/`phpinfo`) around `@kirigami/kirigami`'s `Project` API. |
| `@kirigami/mcp` | 0.1.0 | MCP server (stdio) exposing `Project` as tools (`kirigami_config`/`validate`/`build`/`export`/`run`/`list_scripts`/`list_tasks`/`run_task`) for an AI agent — a third "face" over the core API, sibling to `@kirigami/cli`. No `serve`/`watch` tools yet: background handles need explicit status/stop lifecycle tools. `kiri mcp` is a thin wrapper over it, same pattern as `@kirigami/cli`'s other commands. |
| `kirigami-vscode` (`packages/vscode`) | 0.1.0 | VS Code extension — a fourth "face" over `Project`, using a dedicated external Node worker and staged runtime dependencies. v1: build/export/run/validate commands, a status-bar dev-server toggle with live build state, a `kirigami.yaml` reload watcher. Unscoped npm name (not `@kirigami/vscode`) — it doubles as the VS Code extension identity and npm workspaces symlinks by this field; see its own README for why. See [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md)/[DECISIONS.md](DECISIONS.md). |
| `@kirigami/php-prepros` | 2.0.0 | PHP→HTML compiler + PHP class library (`PREPROS`, `MD`, `HTML`, `YAML`, `SCHEMA`, `LD`, `META`, `CACHE`, `IMG`, `FS`, `STR`, `ARR`, `CURL`, `SCRAPER`, `OBF`, `STD`). `MD::` is now backed by the native `mdhtml` extension (see [DECISIONS.md](DECISIONS.md)). |
| `@kirigami/php-wasm` | 8.5.10-6 | Custom PHP 8.5.10 WASM build, JSPI + Node only, compiled by our own `../php-wasm-compiler/`; includes Imagick. Version encodes the bundled PHP build (`8.5.10-6` → PHP 8.5.10, build 6). Also bundles a custom "Kirigami PHP extension family" (all show up in `kiri phpinfo`): `lexbor` (2.7.0, HTML5/CSS parser), `jsonk` (0.1.4, native JSON-schema validation + `json_encode`/`json_decode` replacement), `mdhtml` (0.1.2, `cmark-gfm`-backed Markdown→HTML — now consumed by `php-prepros`'s `MD::`, see [DECISIONS.md](DECISIONS.md)), `navicat` (0.1.5, HTTP-tunnel DB bridge — mysql/pgsql/sqlite over libcurl, not consumed yet — see [ROADMAP.md](ROADMAP.md)). |
| `@kirigami/struct-walker` | 1.0.5 | Recursive YAML/JSON walker: resolves nested file refs, converts assets to data URIs. |
| `@kirigami/sdk` | 0.2.1 | Plugin hook registry (`on`/`run`/`HOOKS`), command and custom task-type registries, plus `Cache` (SQLite via `node:sqlite`). |
| `@kirigami/canva` | 2.6.0 | Shared Sass/JS design system: tokens, light/dark theming, inline-SVG icon system, `observer` (tag-rewriting engine), `reveal`, `theme`, pure Sass utilities. Permanent part of the monorepo — reuse it rather than re-implementing shared helpers per package. |
| `@kirigami/plugin-highlight` | 0.1.7 | Build-time `highlight.js` syntax highlighting; the optional copy button adds client-side JavaScript. |
| `@kirigami/plugin-extlink` | 0.1.3 | `<extlink>` authoring tag — `SCRAPER`-backed external link preview card, disk-cached. |
| `@kirigami/plugin-embed` | 0.1.5 | `<youtube>`/`<vimeo>` oEmbed video cards, entirely client-side. |
| `@kirigami/audiowaveform-wasm` | 1.1.0 | Waveform peak extraction + ID3 tag/cover-art reading, BBC's `audiowaveform` compiled to WASM. |
| `@kirigami/bestframe` | 0.1.0 | Automatic video thumbnail/still-frame selection via a tiny embedded aesthetic-AI model, compiled to WASM. |

Extension version annotations above are retained from the earlier build inventory; inspect `kiri phpinfo -m` for the actual local binary. The current runtime includes native YAML/Markdown and BZip2; see [the 8.5.11 release notes](../packages/php-wasm/README.md#whats-new-in-8511).

## Licensing

Kirigami packages use GPL-3.0-or-later, except `@kirigami/php-wasm` (GPL-2.0-or-later) and `@kirigami/bestframe` (LGPL-2.1-or-later). These binary packages retain their existing upstream license terms. See each package's `LICENSE` and README for upstream notices.

## Code conventions

Match these when writing code in this repo.

- **Comments and READMEs: English.** All code comments and README prose are
  English, as are all project documentation, commit messages, user-facing
  CLI strings, and changes to the legacy `assets/kiri/` tree. Conversations
  with the user are in French. This cross-project preference supersedes the
  previous exceptions for French repository content (2026-09-20).
- **ESM source.** Runtime packages use `"type": "module"` and
  `import`/`export`. The VS Code extension has a CommonJS output bundle. Tab indentation in the newer JS (sdk, tasks).
- **Node version: `>=24.0.0` for every package.** All `packages/*/package.json`
  `engines.node`, plus every README Node badge and "Requirements" line, must say `>=24.0.0`.
- **Stay lite — minimise dependencies, no native deps.** The cache is
  `node:sqlite` (not better-sqlite3); the PHP JSON-schema validator is pure
  PHP (not ajv); `kiri create` extracts tarballs with a hand-rolled tar
  parser + `node:zlib` rather than a zip lib; image resize/encode for the
  `sass` task goes through the WASM `IMG` class, not `sharp`. When a task
  needs a lib, first check whether a `node:` builtin or ~30 lines of code covers it.
- **Dev machine is Windows** (PowerShell primary); watch for path
  separators — helpers normalize `path.sep` to `/` in many spots.

Schema reference (autocomplete/validation): `https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json`
