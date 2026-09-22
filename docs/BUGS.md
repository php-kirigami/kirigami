# Bugs

Known open issues, limitations, and unresolved questions that need a
decision from Maxime before they can be closed. Remove an entry as soon as it
is fixed; what shipped goes to [STATUS.md](STATUS.md), and a non-obvious "why"
to [DECISIONS.md](DECISIONS.md). Audit evidence stays in the dated
`AUDIT-*.md` files.

## Open

- **P2 / A16 — no CI gate:** focused regression suites exist, but there is no
  root `npm test`, no CI workflow, and six packages still have a failing
  placeholder `test` script. See [TODO.md](TODO.md).
- **VS Code extension validation (A08 follow-up):** relocated integration and a
  real VS Code 1.138.0 smoke test pass on Windows. Older editors, interactive
  host behavior, and VSIX packaging are unverified; see
  [the extension guide](EXTENSION-VSCODE.md).
