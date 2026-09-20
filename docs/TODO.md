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
- **Fix the bundled schema/resource paths and working-directory capture before the VS Code F5 run** (audit A08).
- **`packages/vscode` needs an actual F5 run** — the v1 scaffold (see
  [STATUS.md](STATUS.md)) was compiled; the later audit supplied a stub `vscode` module and found an additional missing-schema activation failure; nobody has driven the real Extension Development Host yet.
  Open `packages/vscode` as its own workspace root, F5, open a folder with
  a `kirigami.yaml` (e.g. `../template-demo`) in the host window, then
  walk through: the activation smoke test first (incl. the `node:sqlite`
  risk noted in [BUGS.md](BUGS.md)), then all 5 commands, the status
  bar's idle/running/building/error transitions, and the config-reload
  watcher.
