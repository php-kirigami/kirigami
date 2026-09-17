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
