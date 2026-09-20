# Bugs

Known open issues, limitations, and unresolved questions that need a
decision from Maxime before they can be closed. Fixed bugs move to
[STATUS.md](STATUS.md) / [DECISIONS.md](DECISIONS.md) instead of staying here.

## Repository audit — 2026-09-20

See [the full audit](AUDIT-2026-09-20.md) for evidence, reproduction results,
source locations, corrective actions, and verification limits. The audit did not change production code. Documentation finding A15 was addressed by the subsequent Markdown refresh; A01/A02 were subsequently fixed by export path validation and source-file exclusions; A03 was fixed by enabling CURL peer/hostname verification; A04 was fixed by strict plugin-name validation and shell-free npm invocation; A05 was fixed by resolving starter dependencies and banner assets from their installed packages; A06 was fixed by coordinated PHP runtime/configuration and plugin include invalidation; the remaining code findings are open.

A07 is also fixed: optional layouts default safely, and PHP diagnostics survive task aggregation without entering generated HTML.

- **P1 / A08:** The compiled VS Code bundle cannot resolve the core schema.
- **P2 / A09–A14, A16:** Malformed
  development URLs; served PHP source; missing add/delete watch handling;
  duplicate watch tasks; uncaught async watch failures; hidden script failures
  in VS Code; incomplete regression coverage and missing CI gates (focused export tests now exist).
- **P3 / A17–A18:** WASM tarballs include local backups; unavailable browser
  storage prevents oEmbed metadata fetching.

## Previously recorded issues

- **`font-style-detect()`'s `"ital-axis"` sentinel — open question.**
  Currently guarded back to `normal` when a variable font exposes a
  binary `ital` axis (see [DECISIONS.md](DECISIONS.md)). If a project ever
  actually uses a font with that axis, should the `@font-face` `@each`
  loop in `canva/conf.scss` split into two blocks (one per `ital` value),
  or is there a better approach? No project has hit this yet, so left
  unresolved on purpose rather than guessed at.

- **`|+` (keep-chomping) literal blocks: `YAML::` vs `YAML_LEGACY::` differ
  by one trailing blank line.** Happens when the block is immediately
  followed by a less-indented line with a blank line in between. Not yet
  root-caused which one matches the YAML spec — low priority, `|+` is
  rarely used. See [DECISIONS.md](DECISIONS.md) for the switch to the
  native-backed `YAML::`.

- **`packages/vscode` may not activate at all in older/forked VS Code
  builds — unverified, needs the real Extension Development Host to
  confirm.** `Project.reload()` (called by every command) transitively
  imports `@kirigami/sdk` → `node:sqlite`, which must exist in whatever
  Node build the *VS Code extension host* embeds — Electron's bundled
  Node, not the user's own installed Node (`engines.node` isn't enforced
  for extensions). The declared editor range does not establish embedded-runtime compatibility; verify the actual Extension Host. Separately, `activate()` calls
  `process.chdir(folder.uri.fsPath)` once, since `Project` only resolves
  `kirigami.yaml` off `process.cwd()` — a process-global mutation in a
  host shared with every other installed extension; not expected to
  conflict with anything today, but nothing's actually exercised this in
  the real host yet either. See [TODO.md](TODO.md)’s F5 item — the first
  thing to check is the Output channel's activation log line
  (`node ${process.version}`, no error) before trusting anything built on
  top of it.

## WASM HTTPS integration follow-up

During A03 verification, local HTTPS requests from the current working-tree WASM binary timed out before the network proxy received a connection. The binary and generated loader already had local modifications before this fix and were left untouched; the cause has not been established. Native PHP exercises of the actual CURL helper pass certificate, hostname, redirect, and download checks. WASM tests verify the injected CA contents and active ini directives, but do not establish successful end-to-end HTTPS. Investigate the networking path before claiming that integration is verified.
