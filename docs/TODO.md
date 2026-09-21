# Todo

Small, concrete, near-term code action items; documentation debt belongs in [DOCTODO.md](DOCTODO.md). These are — not full features (those go in
[ROADMAP.md](ROADMAP.md)) and not open questions (those go in [BUGS.md](BUGS.md)).

- **Add `keywords` to every package's `package.json`** — check missing entries in `kirigami`, `canva`, and `vscode`; other packages already declare them.
- **`prepros.before`/`after`/`types.*.before`/`after` have no imperative
  existence check** in `packages/kirigami/bin/config.js`'s
  `validateConfig()` — a missing file currently fails at render time with
  a raw `fs.statSync` error from `mountPath()` in `prepros.js`, not a
  clean config error like the existing `kirigami.banner` check
  (`config.js` ~line 132). Pre-existing gap for the global before/after,
  now also true of page types (see [DECISIONS.md](DECISIONS.md)) — worth
  fixing once, for all four, rather than patching just the new ones.
- **Complete VS Code interactive and packaging verification after A08**: relocated integration and a real VS Code 1.138.0 smoke test pass. Verify script selection, build failures, status transitions, real-host configuration watching, browser preview, and VSIX contents/licenses. See [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md) for reproducible checks.
