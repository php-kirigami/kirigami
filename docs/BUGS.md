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
