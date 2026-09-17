# Bugs

Known open issues, limitations, and unresolved questions that need a
decision from Maxime before they can be closed. Fixed bugs move to
[STATUS.md](STATUS.md) / [DECISIONS.md](DECISIONS.md) instead of staying here.

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
  for extensions). Current VS Code (1.129+) ships a Node new enough for
  this, but older or forked builds (VSCodium, Cursor, pinned Insiders)
  are a real unknown. Separately, `activate()` calls
  `process.chdir(folder.uri.fsPath)` once, since `Project` only resolves
  `kirigami.yaml` off `process.cwd()` — a process-global mutation in a
  host shared with every other installed extension; not expected to
  conflict with anything today, but nothing's actually exercised this in
  the real host yet either. See `docs/TODO.md`'s F5 item — the first
  thing to check is the Output channel's activation log line
  (`node ${process.version}`, no error) before trusting anything built on
  top of it.
