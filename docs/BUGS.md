# Bugs

Known open issues, limitations, and unresolved questions that need a
decision from Maxime before they can be closed. Fixed bugs move to
[STATUS.md](STATUS.md) / [DECISIONS.md](DECISIONS.md) instead of staying here.

## Repository audit — 2026-09-20

See [the full audit](AUDIT-2026-09-20.md) for evidence, reproduction results,
source locations, corrective actions, and verification limits. The audit did not change production code. Documentation finding A15 was addressed by the subsequent Markdown refresh; all code findings remain open.

- **P1 / A01:** Export can delete its own sources when paths overlap.
- **P1 / A02:** Export includes PHP helpers and hidden-directory contents.
- **P1 / A03:** PHP CURL helpers disable TLS peer and hostname verification.
- **P1 / A05:** Starter dependencies use the CLI version as the core version,
  emit `@kirigami/canva: ^undefined`, and omit the CLI package.
- **P1 / A06:** `Project.reload()` leaves PHP configuration/includes stale.
- **P1 / A07:** Empty `prepros: {}` embeds missing-layout-property warnings
  into successfully generated HTML.
- **P1 / A08:** The compiled VS Code bundle cannot resolve the core schema.
- **P2 / A04, A09–A14, A16:** Shell interpolation in plugin installation; malformed
  development URLs; served PHP source; missing add/delete watch handling;
  duplicate watch tasks; uncaught async watch failures; hidden script failures
  in VS Code; missing regression/CI gates.
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
