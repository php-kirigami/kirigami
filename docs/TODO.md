# Todo

Small, concrete, near-term action items — not full features (those go in
[ROADMAP.md](ROADMAP.md)) and not open questions (those go in [BUGS.md](BUGS.md)).

- **`@kirigami/kirigami`'s README** still opens with "The kiri CLI", which
  is no longer accurate since `@kirigami/cli` was extracted (see
  [DECISIONS.md](DECISIONS.md)). Needs a real structural rewrite once the
  core-api split is closer to release — this is the step-8 "update ALL
  README.md" pass, not something to do mid-refactor.
- **Add `keywords` to every package's `package.json`** — currently
  missing across `packages/*`, hurts npm discoverability.
- **`prepros.before`/`after`/`types.*.before`/`after` have no imperative
  existence check** in `packages/kirigami/bin/config.js`'s
  `validateConfig()` — a missing file currently fails at render time with
  a raw `fs.statSync` error from `mountPath()` in `prepros.js`, not a
  clean config error like the existing `kirigami.banner` check
  (`config.js` ~line 132). Pre-existing gap for the global before/after,
  now also true of page types (see [DECISIONS.md](DECISIONS.md)) — worth
  fixing once, for all four, rather than patching just the new ones.
- **`packages/vscode` needs an actual F5 run** — the v1 scaffold (see
  [STATUS.md](STATUS.md)) was only verified by building the bundle and
  loading it under plain Node (up to the expected `Cannot find module
  'vscode'`); nobody has driven the real Extension Development Host yet.
  Open `packages/vscode` as its own workspace root, F5, open a folder with
  a `kirigami.yaml` (e.g. `../template-demo`) in the host window, then
  walk through: the activation smoke test first (incl. the `node:sqlite`
  risk noted in [BUGS.md](BUGS.md)), then all 5 commands, the status
  bar's idle/running/building/error transitions, and the config-reload
  watcher.
