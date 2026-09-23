# Status

## CLI-style Kirigami output channel in VS Code — 2026-09-23

- The output channel reads like `kiri`: "kiri — Build Project" headers,
  `› TASK: name ✔` lines with their files, `› Error:`/`› Warnings:` blocks,
  `✔ Build finished!` (`packages/vscode/src/log.js`, a port of core's
  `log`/`printTaskError`). Build, export, run, serve, validate, config
  reload and Create Project all use it.
- Colors come from a `kirigami-output` language + TextMate grammar
  (`packages/vscode/syntaxes/`) mapped to the scopes themes use for logs;
  output channels can't render ANSI.
- Core's `c` colors only when stdout is a terminal, honoring `NO_COLOR` and
  `FORCE_COLOR`; the extension also sets `NO_COLOR` for its worker and
  strips any remaining ANSI codes. `kiri create --list` now pads before
  coloring, so it stays aligned without colors.

## PHP-WASM crash after a few renders (php-mdhtml) — 2026-09-23

Symptom (VS Code, `kiri serve`/`watch`, repeated builds): `RuntimeError:
unreachable` from `zend_mm_panic` a few renders into one process, then
"Cannot redeclare function _print_r()". Cause: `php-mdhtml` v0.1.3 keeps
Markdown plugins in a process-lifetime table holding request-allocated
Closures and keys; the next request's re-registration double-frees them.
Triggered by any `md_register_plugin()` (template-default's
`_lib/functions.php`) plus JS heap activity between renders (Sass). Same
crash with the 8.5.10 and 8.5.11 binaries.

- Resolved by the PHP 8.5.11 binary, built with php-mdhtml v0.1.4 (tables
  request-scoped again, pushed and tagged 2026-09-23). The interim
  workaround (`md.class.php` emptying the plugin table at shutdown) is
  removed; the regression test now also covers custom emoji, which the
  workaround could not fix.
- php-prepros `run()`: a WASM abort now resets the runtime and returns a
  structured failure, so the next build starts on a fresh runtime.
- Regression test: `packages/kirigami/test/md-plugin-repeat.test.js` (fails
  without the workaround).
- `php-mdhtml` v0.1.4 (local commit `2d4f011`): tables request-scoped
  again; natively 40/40 requests vs a segfault with v0.1.3.
- VS Code command titles no longer repeat the category ("Kirigami: Kirigami:
  …").

## Scaffolding moved to core; shared by CLI, VS Code and MCP — 2026-09-22

- `@kirigami/kirigami/create` (also root exports): `listTemplates`,
  `findTemplate`, `inspectTarget`, `gitUserConfig`, `resolveMeta`,
  `canInitGit`, `createProject`, `installDependencies`, typed in
  `create.d.ts`. No prompts or console output; failures are structured.
- `@octokit/rest` removed: core's own `bin/libs/github.js` (fetch, Link
  pagination, optional `GITHUB_TOKEN`/`GH_TOKEN`). The tar reader moved to
  `bin/libs/tar.js`, the npm launcher to `bin/libs/npm.js` (the CLI's
  `npm.js` reuses its `resolveNpmCli`). `@kirigami/cli` no longer depends
  on `@octokit/rest` or `picomatch`; `bin/starter.js` is gone.
- `kiri create` is a thin wrapper (same flags and output). It now accepts
  `template-<name>` as well as `<name>`, and asks the git question before
  downloading.
- VS Code **Create Project** is now a native wizard (template quick pick,
  input boxes, git / npm install options) calling core in a short-lived
  external-Node worker. It supersedes the terminal `npx` flow logged below.
  `ProjectClient.dispose()` now waits for the worker to exit.
- MCP: new `kirigami_list_templates` and `kirigami_create_project` tools.
  `serveStdio()` no longer loads the project upfront, so the server starts
  in a folder without `kirigami.yaml`. The VS Code MCP provider still only
  offers the server in Kirigami folders.
- Starter tooling: when neither the template nor the target has one,
  `createProject()` writes `.mcp.json` (`node node_modules/@kirigami/cli/bin/kiri.js mcp`,
  so Claude Code sees the Kirigami MCP server), `.github/workflows/page.yml`
  (GitHub Pages via `php-kirigami/kiribuild`) and `.vscode/settings.json`,
  copied from `packages/kirigami/assets/starter/` (stored without the leading
  dot so npm/vsce keep them). Reported as `starterFiles`.
- VS Code Create Project opens the new project directly (same window when
  empty, new window otherwise, reload when it is the current folder) instead
  of asking.
- F5 in `packages/vscode` runs a one-shot `node esbuild.mjs` build task: the
  `$esbuild-watch` matcher needed an extension, and `type: npm` tasks
  followed the user's package-manager setting (yarn).
- A generated starter `package.json` pins `@kirigami/cli` to `^<registry
  version>` when the caller gives no `cliVersion` (`latest` only offline;
  until the CLI is published, the registry has none and `latest` is used).
- Tests: `packages/kirigami/test/create.test.js` (GitHub client, scaffolding),
  `packages/mcp/test/create.test.js`, rewritten
  `packages/vscode/test/create.test.cjs` (real worker, GitHub stubbed through
  `NODE_OPTIONS=--import`), and the CLI end-to-end test. `npm test`: 76/76
  on Windows / Node 26. Checked live against GitHub: `listTemplates()` and `createProject()` of
  `template-default` (33 files). The real VS Code host and Node 24/Linux were
  not run.

## VS Code: Create Project command — 2026-09-22

`Kirigami: Create Project…` (`kirigami.create`) picks a folder, opens an
integrated terminal there and runs `npx --yes "@kirigami/cli" create`: the
CLI's existing wizard lists the templates and asks the questions, so nothing
is duplicated and the VSIX does not grow. With terminal shell integration
(VS Code 1.93+) the extension waits for the command to finish, finds the new
`kirigami.yaml` (chosen folder or a direct subfolder), and offers Open Folder /
Open in New Window, or Reload Window when it is the current folder; without it
the command is only typed. The command is registered in any trusted window
(`onCommand:kirigami.create` activation); the engine only starts when the
folder has a `kirigami.yaml`, and the project commands are hidden from the
palette until then. Tests: `packages/vscode/test/create.test.cjs`.
Requires `@kirigami/cli` to be published for `npx` to find it.

## VSIX packaging and release preparation — 2026-09-22

- The win32-x64 VSIX builds with vsce (19.2 MB, 1,745 files) and passes the
  real VS Code host test once unzipped (`run-host.ps1` gained
  `-ExtensionPath`). It is platform-specific: the staged runtime holds native
  binaries.
- Staging no longer copies type declarations and source maps (~16 MB), and the
  core no longer depends on the unused `@octokit/rest` (still a CLI
  dependency). The longest installed path dropped from ~221 to 179
  characters; a VSIX unzipped under a long folder used to exceed Windows' 260
  limit and the extension host failed to start.
- Extension icon: the elephant from the logo, cropped, trimmed, centered with
  transparent padding (`packages/vscode/images/icon.png`, source
  `assets/chart/kirigami-elephant.svg`). The extension README uses a PNG logo:
  the Marketplace rejects SVG images.
- `scripts/publish.js` skips VS Code extensions (`engines.vscode`), which
  would otherwise have been published to npm.
- Core README: "Unreleased — breaking" section (`kiri` moved to
  `@kirigami/cli`, export marker, duplicate task names).
- [RELEASE-PLAN.md](RELEASE-PLAN.md): the checklist for the coordinated
  release.

## Regression suite automation (A16) — 2026-09-22

- `npm test` at the root runs `scripts/test.js`: it compiles the VS Code
  extension, then runs every package test file with `node --test`, one file at
  a time, with `KIRIGAMI_PHPEXT_DISCOVERY=off`. The six placeholder `test`
  scripts are gone: packages with tests run them, bestframe and struct-walker
  have none.
- CI: `.github/workflows/ci.yml` runs `npm test` on Windows and Linux with
  Node 24 and 26, with a native PHP for the TLS test. Not run yet.
- Locally: 69/69 on Windows with Node 26.9.0 and with Node 24.21.0 (the
  declared floor, never tested before). Linux (WSL Ubuntu, Node 24.21.0,
  static PHP 8.5.8 for the TLS test): 68 passed, 1 Windows-only test skipped.
- PHP extension discovery: new `KIRIGAMI_PHPEXT_DISCOVERY` (`all` | `local` |
  `off`). The global root is now computed instead of spawning `npm root -g`,
  which never worked on Windows (`npm.cmd` cannot be spawned without a shell,
  and the failure was silently ignored) and would have added ~0.6 s to every
  runtime start.

## WASM HTTPS, linked plugin scripts, embed storage — 2026-09-22

- **WASM HTTPS works end to end.** Every libcurl request inside WASM used to
  time out, plain HTTP included, while `fsockopen()` worked: libcurl
  busy-looped on the loader's synchronous `poll()`, so Node's event loop never
  ran and the WebSocket to the network proxy never opened. The network runtime
  (`packages/php-wasm/runtime/runtime.js`) now instantiates the module through
  Emscripten's `instantiateWasm` hook with a yielding `poll()`. That poll
  suspends via JSPI only when nothing is ready, and wakes on WebSocket activity,
  with a 10 ms timer as the fallback. No binary or loader change. Measured
  locally: ~9 ms per plain HTTP request and ~61 ms per HTTPS request. The TLS
  regression test now also runs the real CURL helper inside WASM, covering
  untrusted certificates, hostname mismatches, redirects, and downloads. It
  fails without the fix.
- **N5:** plugin scripts outside the project (`npm link`, workspaces) run when
  they are inside an active plugin's package directory. New
  `runPluginScript()` in `@kirigami/php-prepros`, which mounts them under
  `/plugin-scripts/<package dir>/`. Scripts inside the project are unchanged.
  Test: `plugin-script-linked.test.js`.
- **A18:** `plugin-embed` guards the `localStorage` read, not only the write.
- Removed stray files: `phpinfo.html`, `PR-LICENSE-SEPARATION.md`, and the
  `kiri test` debug command.

## Audit 2026-09-22 fixes — 2026-09-22

Fixed findings N1–N4 and A17 from [the follow-up audit](AUDIT-2026-09-22.md):

- **N1:** Export refuses to empty an existing non-empty destination unless it
  holds the `.kirigami-export` marker that every export now writes. It also
  rejects destinations that contain the project directory. See
  [DECISIONS.md](DECISIONS.md#export-only-empties-directories-it-owns).
  Existing output directories need the marker once.
- **N2:** `Project.validate()` validates the file on disk without replacing a
  loaded project's configuration, so plugin-injected tasks survive it.
- **N3:** Duplicate task names, including a plugin task named like a
  kirigami.yaml task, are rejected as a configuration error.
- **N4:** `export({ path })` no longer writes into `config.export`, and the
  export banner is passed on per-run task copies instead of mutating
  `config.tasks`.
- **A17:** `packages/php-wasm/jspi/php.js.bak` is untracked (kept locally),
  `*.bak` is git-ignored, and the php-wasm `files` allowlist is narrowed.

Cleanup: removed the empty `bin/tasks/conf.js` and the unused CLI
`bin/libs/triggers.js`, and translated the French comments in
`packages/mcp/index.js`. Regression coverage: `dist.test.js`, and the new
`export-safety.test.js` and `plugin-task-validate.test.js`. N5 and A18 were
fixed later the same day (entry above). Package versions were not changed.

## Plugin commands via a hook — 2026-09-22

`@kirigami/sdk`'s existing `registerCommand()` registry now has a hook-based
alternative: a plugin's `on(HOOKS.COMMANDS_REGISTER, ...)` listener returns
`{ name, description?, run }` — the same shape `registerCommand()` takes —
instead of calling it directly. `loadPlugins()` collects these once, right
after plugins register, and routes each one through the existing
`registerCommand()` call, so a duplicate name or a non-function `run` throws
the same error either style produces; `getCommand()`/`listCommands()` (read
by `@kirigami/cli`'s dispatcher and any embedder) are unchanged, staying
synchronous. `registerCommand()` itself is untouched — this is an additional
way to reach it, not a replacement, kept for consistency with
`scripts:register`/`tasks:register`.

## Plugin-injected build tasks — 2026-09-22

Active plugins can now inject actual build tasks — not just task types —
through `@kirigami/sdk`'s `tasks:register` hook. A listener returns one (or
an array of) task object(s) shaped exactly like a kirigami.yaml `tasks:`
entry (`{ name, type, ... }`), most often of a type the same plugin
registers via `registerTaskType()` in the same `register()` call, so a
project doesn't need its own `tasks:` entry for the task to run. `reload()`
collects these once, right after plugins load, and appends them onto
`config.tasks` before strict task validation — so build(), export(),
`runTask()`, watch, and the `tasks`/`config.tasks` getters all see them
through the exact same path as a project-declared task, with zero changes
needed to any of those call sites. Re-collected fresh on every `reload()`
(no accumulation across reloads).

## Plugin-registered trigger scripts — 2026-09-22

Active plugins can now register a runnable PHP script through
`@kirigami/sdk`'s existing hook system (`on(HOOKS.SCRIPTS_REGISTER, ...)`)
instead of a new dedicated registry — reusing `reset()`'s existing hook-wide
reload cleanup for free. A listener returns `{ name, file, trigger?, mount? }`:
`name` is invocable via `run()`/`kiri run <name>`, `file` is an absolute path
to the plugin's own `.php` file, and an optional `trigger`
(`before-build`/`before-export`/`after-export`) fires it automatically,
exactly like a kirigami.yaml `scripts:` entry. A project's own
`scripts/<name>.php` always takes precedence over a plugin registering the
same name. Plugin registrations are collected lazily and cached for the
loaded project's lifetime, invalidated on `reload()` the same way
`prepros:php` include paths already were. `Project#scripts` now also lists
plugin-registered scripts not shadowed by a local file.

## Plugin-defined task types — 2026-09-21

Active plugins can now register custom build task types through
`@kirigami/sdk`'s `registerTaskType()` registry. A shared resolver combines
built-in modules with registered definitions across configuration validation,
build, export, `runTask()`, and watch setup. Configuration performs built-in
checks first, loads plugins, then strictly validates all task types and invokes
each optional custom validator. Reload resets hooks, commands, task types, and
resolved task caches before plugins register again.

The public schema accepts plugin-task fields without weakening the closed
schemas for built-in tasks. SDK runtime and declaration contracts cover
registration, lookup, listing, reset, defaults, duplicate rejection, and
invalid runners. An integration fixture verifies custom validation, build,
export-path delivery, direct execution, watcher rules, reload, and rejection
when the providing plugin is disabled. The core package now also publishes an
`index.d.ts` contract for `Project`, configuration, results, notifications, and
serve/watch handles; its manifest and export map advertise that declaration.
Package versions were not changed.

## Roadmap consolidation — 2026-09-21

Merged the stale strategic scaffold from `ROADMAP-FUTURE.md` into the canonical
roadmap and removed the duplicate file. Completed stabilization work remains in
STATUS, concrete CI and VS Code verification stays in TODO, and the consolidated
roadmap now groups only unscheduled product directions by project extensibility,
content, generated-site features, interfaces, and runtime tooling.

## PHP extension discovery isolation — 2026-09-21

PHP-WASM extension discovery no longer scans sibling repositories beside the
current project or its ancestors. It remains limited to local `node_modules`
and workspace `packages` directories along the current project's ancestor
chain, plus explicitly global npm packages. This prevents an unrelated
`php-wasm-compiler` checkout from silently staging experimental extensions and
emitting PHP startup warnings in commands such as `kiri phpinfo`.

Validation from the adjacent `project-test` site confirmed that `kiri phpinfo`
exits successfully with empty stderr and no DBA, FTP, Gettext, GMP, MySQLi,
PDO MySQL, POSIX, SOAP, or Sodium artifact staged from the sibling compiler.
Package versions and dependencies were not changed by this fix.

## Package contract fixes — 2026-09-21

Addressed the five follow-ups from the README audit. SDK declarations now
cover reset and generic command registration/lookup. PHP-prepros declarations
match render includes, sitemap arguments, file-only script mounts, optional
result diagnostics, and normalized image file lists. Audio metadata prose now
allows an all-null tag object without changing the binary's behavior.

`runenv()` validates script and extra files against lexical and canonical
project boundaries before initializing PHP, rejecting directories and external
links while preserving internal links and missing optional files. Rendering
and sitemap share a page predicate that excludes every private ancestor below
the configured source root, including explicit private page requests.

Canva now propagates compilation/copy failures to the one-shot exit status.
Watch rebuilds are serialized and regenerate the full output tree so deleted
scripts, maps, declarations, and styles disappear; a failed rebuild logs its
error and subsequent changes recover. The READMEs describe the corrected
behavior, and the five completed findings were removed from BUGS.md. No
package versions or project dependencies were changed.

Validation: 16 targeted Node tests passed on Windows / Node 26.8.2 across the
new contract suites and existing minimal-render, reload, initial-build, and
watch-rule regressions. The Canva integration verifies nonzero CLI failure,
watch deletion cleanup, recovery, and copy-error propagation. A strict NodeNext
TypeScript consumer checks package imports and positive/negative signatures;
its compiler and Node types were installed only in a temporary directory.
Private-page and script tests include an underscore-prefixed source root,
nested private directories, external junctions, and accepted internal links.
README links/anchors and diff whitespace were checked. These checks do not
establish Linux or Node 24 compatibility.


## Remaining package README audits — 2026-09-21

Completed the six pending source/manifest/declaration reviews: PHP-prepros,
SDK, struct-walker, Canva, audiowaveform-wasm, and bestframe. Updated JavaScript
signatures, result/failure semantics, hook ordering and reset ownership, cache
behavior, reference/data-URI resolution, dependency pins, exported paths,
browser boundaries, and WASM runtime layout. Corrected executable examples
and distinguished current contracts from historical release/format claims.
Removed those audits from DOCTODO.md. New declaration, traversal, and Canva
build defects are recorded separately in BUGS.md; no runtime code, declaration
files, package versions, or lockfiles changed.

Validation on Windows / Node 26.8.2:

- SDK smoke checks covered listener deduplication, one-level collection,
  waterfall ordering, independent hook/command resets, and SQLite cache
  set/get/delete/purge/close/reopen behavior.
- Struct-walker checks covered sibling and circular references, missing
  references, SVG data URIs, empty YAML rejection, and scalar parsing.
- PHP-prepros exercised all six JavaScript exports in a temporary project:
  single/directory rendering, plugin includes, sitemap/robots, directory
  mounting, script arguments/stdout, resize/palette jobs, and runtime reset.
  Image jobs used a generated PNG; malformed image input also produced a
  structured failure.
- Canva's eight Sass examples without external font files compiled. Five
  shipped styles matched source; all six script aliases and adjacent
  declarations existed; `dedent` ran in Node. Browser interactions were
  reviewed in source, not tested in an interactive browser.
- Synthetic stereo PCM WAV extraction returned the documented mono min/max
  shape. Invalid audio, untagged metadata, and absent cover art were checked.
  A synthetic H.264/MP4 clip produced JPEG and PNG Buffers with dimensions and
  metadata; invalid video and invalid input types followed the documented
  failure paths. Other codec matrices remain historical verification.
- npm dry-run packaging confirmed each media package's seven intended files,
  including its loader/WASM pair. No tarball was published. Local Markdown
  links/anchors and diff whitespace were checked.


## Plugin documentation review and backlog cleanup — 2026-09-21

Reviewed highlight, extlink, and embed against their JavaScript/PHP source, option schemas, and manifests. Documented language aliases and copy-button limits, extlink destination-image reuse and failure behavior, and embed generated styles, storage, and fetch behavior. Corrected minimum-version requirements and highlight schema descriptions without changing validation rules. Moved package tables of contents ahead of release history.

Removed completed entries and the historical review inventory from DOCTODO.md; remaining README audits and prerequisite-dependent work stay explicit. Earlier completion records remain in this log and Git history. No package versions or runtime behavior changed.

Validation: local checks passed for language aliases, invalid-language rejection, highlighting, block opt-out, schema JSON parsing, and all highlight README Sass examples (including the standalone font). README links and diff whitespace were checked. Browser/provider and end-to-end WASM network behavior were reviewed in source, not executed.

## Historical verification — 2026-09-20

- All local Markdown file links and heading anchors checked successfully.
- 20 YAML examples parsed; seven complete project configurations passed the local schema (including plugin option schemas).
- Native PHP checks confirmed YAML boolean/string behavior and Markdown footnote markup.
- The documented manual PHP loader example executed successfully.
- No manifests, lockfiles, or version declarations were modified.



## Package README follow-up — 2026-09-21

Made all 14 package READMEs explicit in DOCTODO.md's active scope, distinguishing targeted updates from a complete example audit. Corrected the core README's remaining server-filtering description. Expanded the MCP README with the site-blueprint tool, three exported documentation-index helpers, indexing/cache limits, and accurate per-tool reload and validation-result behavior, checked against packages/mcp/index.js.

## Shared site reference synchronization — 2026-09-21

Synchronized docs/template-CLAUDE.md into the CLAUDE.md files of the sibling template-default, template-demo, and php-kirigami.github.io repositories. Preserved project-specific headers and directory trees while refreshing generic reference, language conventions, and export guidance. Added a version caveat: sibling manifests still use the older core-only CLI dependency layout and declare MIT for their sites; the current monorepo reference does not imply those dependencies or site licenses were migrated. Verified shared-section equality, preserved headers, and diff whitespace. Changes remain local and uncommitted in the sibling repositories; no packages, site pages, or deployed content changed.

## Initial build for serve and watch — 2026-09-21

`Project.serve()` and `watch()` now await the normal build pipeline, including `before-build`, before allocating HTTP/watch resources. `initialBuild: false` preserves explicit build-then-watch integrations. Failed builds reject with full diagnostics in `error.result`; serve emits initial start/done notifications marked `initial: true`. CLI readiness messages follow successful startup. VS Code reports startup failures and only marks preview running once the server handle exists.

Validation: six targeted core tests pass, including fresh PHP output before serving/watching, opt-out, structured and thrown failures, observer errors, and watcher startup cleanup. The recompiled relocated VS Code integration passes initial rendering, failure reporting with no listening server, and successful retry. Documentation and CLI help reflect the new default; no package versions changed. Real Extension Host validation of this change remains pending.

## Internal, API, and user documentation — 2026-09-21

Added INTERNALS.md for execution order and state ownership, API.md for the core Project contract and failure/lifecycle handling, and USER-GUIDE.md for a minimal site through production export. These documents describe current source behavior, including process-wide state, in-place PHP rendering before export, non-transactional output, and the absence of an initial build in serve/watch. Connected the guides to CLAUDE.md and root/core READMEs; corrected the stale private-file exposure statement in the CLI README. Published-package verification remains a release follow-up.

Validation: extracted the user guide's YAML and PHP blocks into a disposable project and successfully loaded, built, and exported it through the local ESM API, checking the rendered title. Local documentation links/anchors and diff whitespace were checked. This does not verify npm installation or deployment from published packages.

## Documentation backlog reconciliation — 2026-09-21

Reorganized DOCTODO.md around concrete prerequisites and completion evidence, retaining the previous review and verification as historical records. Corrected the contributor guide's stale MIT inventory and documented the full regression command: 48 tests passed on Windows/Node 26.8.2 after VS Code compilation, with native PHP 8.5.10 for TLS checks. PHP-WASM now documents automatic extension discovery and its observed load warnings. Removed completed keywords and layout-validation TODOs after checking source and manifests. CI, VSIX packaging, end-to-end WASM HTTPS, release validation, and sibling publication remain separate follow-ups; this pass changes documentation only.

## GPL-3 package documentation and license alignment (A15) — 2026-09-21

Following the maintainer's decision to use GPL 3 as broadly as possible, replaced the 11 remaining project-owned MIT package license texts with the repository's GPL v3 text and aligned their README badges and declarations with the existing GPL-3.0-or-later manifests. Added the root manifest license, synchronized workspace lockfile metadata, and updated the shared documentation inventory and repository notice. PHP-WASM and bestframe retain their existing GPL-2.0-or-later and LGPL-2.1-or-later binary package licenses; upstream notices are unchanged.

A15 is closed in this repository. Validation compared all 14 workspace manifests, license texts, README declarations, and lockfile entries; CLI installation instructions still match the CLI's binary declaration. Package versions are unchanged. Sibling documentation synchronization and publication remain pending in [DOCTODO.md](DOCTODO.md).

## A15 verification follow-up — 2026-09-21

Verified that the root, core, and CLI READMEs direct terminal users to `@kirigami/cli`, matching its `bin.kiri` declaration. Reopened the licensing portion of A15: 11 GPL-3.0-or-later package manifests still have MIT LICENSE files and README declarations. No license text or package version was changed; reconciliation awaits confirmation of the intended package licenses. Remaining documentation updates are tracked in [DOCTODO.md](DOCTODO.md).

## Auto-loaded PHP extension packages — 2026-09-21

`@kirigami/php-wasm` now scans project and global install roots for `@kirigami/phpext-*` packages when a runtime is created, stages each matching `.so` under `/internal/shared/extensions`, and writes the corresponding `extension=...` entries into the PHP WASM VM's generated `php.ini` so they are picked up automatically at startup. The extension discovery walks ancestor project directories and the global npm root, which covers both workspace installs and sibling repo checkouts like `../php-wasm-compiler/packages/phpext-*`.

## Documentation refresh — 2026-09-20

Reviewed all 32 repository-owned Markdown files against the current source and manifests. Updated the core/CLI split, MCP and VS Code status, native YAML/Markdown references, page types, SDK command registration, runtime helpers, examples, license inventory, and documentation navigation. Historical version entries remain historical; no package versions were changed. Runtime extension availability was checked with `node packages/cli/bin/kiri.js phpinfo -m`.

Audit A15 is addressed in the monorepo documentation. Other audit findings remain open; documenting their behavior does not fix the code. Registry publication, organization-profile publication, live site deployment, and a real VS Code Extension Host test are not part of this documentation pass. Remaining documentation/release work is tracked in [DOCTODO.md](DOCTODO.md).

Earlier entries record the state at the time of implementation. The later A06 finding identified stale PHP state after reload; its correction is recorded below under PHP reload freshness.

## MCP doc search index — 2026-09-20

`@kirigami/mcp` now builds and caches a lightweight full-text document index for `kirigami_search_docs` instead of scanning every Markdown file on each tool call. The index is regenerated when source files change (mtime-based refresh) and is stored under `.kirigami/mcp-doc-index.json` for the current project. This keeps discovery fast for agents while preserving the same doc excerpts that were already returned by the tool.

Validation: targeted Node smoke test confirmed the index builds successfully and `searchDocIndex()` returns hits for a real repo query (`kirigami mcp`).

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

## PHP reload freshness — A06

`Project.reload()` now clears the core configuration, PHP runtime/configuration, and cached plugin PHP include list. Plugin hooks are registered from the new configuration. Failed reloads leave the project unloaded so the next build retries instead of using stale state. PHP-prepros uses an owned runtime from the new `createPHPRuntime()` factory; disposing it leaves PHP-WASM's shared getter instances intact. Network runtime exit closes its proxy and both WebSocket and outbound TCP connections. The next PHP operation remounts the current source tree and selects the current network mode.

PHP-prepros operations and resets are queued together, preventing disposal during a PHP request or its mounts. Empty plugin include lists replace previous lists. This does not serialize entire `Project` operations or bypass Node's JavaScript module cache; callers should await project operations, and JavaScript plugin code changes still require a process restart.

Validation on Windows / Node 26 with the current working-tree WASM binary:

- `node --test --test-isolation=none packages/kirigami/test/reload.test.js`: real PHP rendering across repeated builds/reloads, changed data/root/mount extensions, deleted files, plugin disable/re-enable/include changes, network mode changes, queued resets, and error recovery.
- `node --test --test-isolation=none packages/php-wasm/test/runtime-lifecycle.test.js`: two tests for owned/shared runtime isolation and network proxy/socket teardown.
- Export regression suite: seven tests passed. `npm run compile --workspace=kirigami-vscode` passed with the new reset bridge; real-host activation remains unverified (A08).

No package versions or generated WASM/loader files were changed by this fix. End-to-end HTTPS remains the separate A03 follow-up; Node 24 and Unix were not exercised.

## Optional layouts and PHP diagnostics — A07

Missing global `prepros.before`/`after` fields now default to `null` before PHP hooks/includes run. PHP-prepros disables inline error display while retaining stderr logging, so warnings no longer contaminate generated HTML. The aggregate render/sitemap task retains both phases' warnings, stderr and debug output. A sitemap failure keeps its error and the preceding render's diagnostics and produced-file list. Nonfatal warnings remain nonfatal and are available on the prepros entry in `Project.build()` / `Project.export()` results.

Validation: `node --test --test-isolation=none packages/kirigami/test/minimal-render.test.js` passes all five scenarios (six test-runner entries including the parent): empty `prepros` build/export, all global layout combinations, render/page/sitemap warnings, sitemap failure after successful rendering, and render failure. The real WASM A06 reload regression also passes. Tested on Windows / Node 26; no versions changed.

## VS Code runtime resources and activation (A08)

The editor bundle now starts an external Node worker in the project directory before loading core. Runtime staging preserves ESM package-relative schemas, task modules, PHP libraries, WASM files, and dependency license files. The shared Extension Host working directory is unchanged. Commands use the IPC adapter; shutdown closes the server and PHP runtime before terminating the worker.

Validation on Windows / external Node 26.8.2: compilation succeeds; `node --test --test-isolation=none packages/vscode/test/activation.test.cjs` passes after relocating the extension away from workspace dependencies, covering all five commands, PHP build/export/run, configuration reload, and server cleanup. `packages/vscode/test/run-host.ps1` passes with VS Code 1.138.0 / host Node 24.18.1, covering activation, validation, PHP build/export, the empty-script path, and server start/stop. The host fixture uses an isolated profile and retains logs.

Interactive preview/status/config-watcher checks, older editors, other platforms, and actual VSIX packaging remain unverified. No package versions changed.

## Development server request failures (A09)

Malformed percent encodings, invalid UTF-8 encodings, and NUL pathnames now return 400 without escaping the request callback. HTML and custom-404 reads are guarded; an absent 404 page retains the built-in fallback. Stream errors return 500 before headers or terminate only the affected response after partial output. Closing a response destroys its file stream.

Validation: `node --test --test-isolation=none packages/kirigami/test/devserver.test.js` passes all three tests on Windows / Node 26.8.2. Real HTTP requests exercise invalid and valid encoded paths, custom/default 404 pages, and continued service after each failure. Deterministically injected read/stream failures cover missing or unreadable HTML, unreadable custom 404 content, and failures before/after partial output. Filesystem races are simulated, not timing-dependent reproductions. A10 source-file exposure remains separate. No package versions changed.

## Development server public-file boundaries (A10)

The server denies dot/underscore-prefixed path components and PHP/PHTML/PHAR/SCSS/Sass source paths, case-insensitively for extensions. Checks apply to decoded request paths and canonical filesystem targets. Directory indexes, aliases, and custom 404 content must stay inside the canonical source root and pass the same public-path policy. Windows alternate-data-stream syntax and trailing dot/space aliases are denied. Denied paths use a safe 404 response. JavaScript and source maps remain available for browser debugging; other ordinary public assets retain their existing behavior.

Validation: all six tests pass with `node --test --test-isolation=none packages/kirigami/test/devserver.test.js` on Windows / Node 26.8.2, including the three A09 regressions. New cases cover direct/encoded private names, traversal and Windows aliases, public assets/indexes, outward and private-target junctions, allowed public-target junctions, and file symlinks hiding PHP behind HTML names (also as the custom 404). No tests were skipped. Canonical checks do not claim protection against a hostile local process changing the filesystem between validation and opening a file. No package versions changed.

## Watch file lifecycle (A11)

Watch rules now receive `unlink` and `unlinkDir` as well as `add` and `change`; removed directories reach rules even when file globs do not match the directory itself. PHP, esbuild, and Sass no longer discard add-only batches. The internal watcher handle exposes a readiness promise for deterministic startup checks.

On PHP additions/removals, a fresh runtime drops stale mounted files, a full render regenerates pages and sitemap, and the watcher removes individual HTML outputs corresponding to deleted/renamed page sources in its inventory. Current sources sharing an output keep it. Cleanup does not traverse directory links, remove directories, or sweep unrelated HTML; outputs predating the watcher with no corresponding source are not inventoried. Structural rebuilds deliberately favor consistency over incremental speed. Existing change-only batches keep their incremental behavior. JavaScript/Sass rebuilds report missing dependencies and recover on recreation, retaining prior bundles on build failure.

Validation: `node --test --test-isolation=none packages/kirigami/test/watch-lifecycle.test.js` passes on Windows / Node 26.8.2 with real Chokidar events, PHP WASM, esbuild, and Sass. It covers page creation/deletion/rename, sitemap updates, removed data disappearing from PHP, directory and empty-directory removal, preservation of unrelated HTML, and JS/Sass dependency deletion plus add-only recovery. Expected compiler errors during dependency deletion are asserted failures. A12 task accumulation and A13 async-error/lifecycle handling remain separate. No versions changed.

## Stable watch-rule construction (A12)

`buildWatchRules()` now constructs a local task list before prepending implicit prepros. Repeated watch/serve setup no longer mutates `config.tasks`, accumulates implicit tasks, or contaminates later task listings/builds. Explicit tasks keep their order and are not deduplicated.

Validation: both tests pass with `node --test --test-isolation=none packages/kirigami/test/watch-rules.test.js` on Windows / Node 26.8.2. Coverage includes frozen configuration/tasks, repeated calls, explicit prepros alongside the implicit rule, non-watchable tasks, and disabling prepros between calls. These tests exercise rule construction directly; they do not claim additional real-host validation. A13 asynchronous watcher failure handling remains open. No versions changed.

## Watcher error and resource lifecycle (A13)

Scheduled watch batches catch and log callback rejections without preventing later batches. `Project.serve()` converts thrown build callbacks and start notifications into failed terminal results; it attempts the done notification once, and the scheduler contains a rejection from that observer too. Failed builds no longer trigger browser reload broadcasts.

Internal watcher startup errors reject the readiness promise only after cleanup. Watch/serve await readiness; a failed serve startup closes its HTTP server. Watcher close is idempotent, drops queued/late events, closes all handles, and waits for active callbacks. Serve closes HTTP in a finally block even if watcher close fails. A callback that never settles still delays close; no forced cancellation was added.

Validation on Windows / Node 26.8.2: all five tests in `node --test --test-isolation=none packages/kirigami/test/watch-errors.test.js` pass. Injected watcher handles cover callback rejection/recovery, in-flight close, and synchronous/asynchronous startup failures. The serve test uses a real HTTP listener and PHP rendering, verifies failure notifications including rejecting observers, a successful later build, and port reuse after failed startup. The real Chokidar/PHP/esbuild/Sass A11 lifecycle regression also passes. No versions changed.

## VS Code script failure reporting (A14)

Run Script now requires `success: true` before displaying its completion notification. Structured failures display an error and append the full returned result to the Kirigami Output channel, preserving error details and other diagnostics. Thrown-operation handling remains in place.

Validation: extension compilation and `node --test --test-isolation=none packages/vscode/test/activation.test.cjs` pass on Windows / Node 26.8.2. The relocated compiled extension uses its real worker/PHP runtime with a stub VS Code API: a throwing PHP script produces an error notification and detailed log without success, cancellation does not execute it, and a corrected script subsequently succeeds. Existing activation/build/export/reload/server checks also pass. A14 notification behavior was not rechecked interactively in the real Extension Host. No package versions changed.
