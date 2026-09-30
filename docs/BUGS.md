# Bugs

Known open issues, limitations, and unresolved questions that need a
decision from Maxime before they can be closed. Remove an entry as soon as it
is fixed; what shipped goes to [STATUS.md](STATUS.md), and a non-obvious "why"
to [DECISIONS.md](DECISIONS.md). Audit evidence stays in the dated
`AUDIT-*.md` files.

## Open

- **VS Code extension validation (A08 follow-up):** the development folder
  and the win32-x64 VSIX pass the real VS Code 1.138.0 smoke test, and the
  interactive checks passed (2026-09-23). Older editors and VSIX builds for
  other platforms are unverified; see [the extension guide](EXTENSION-VSCODE.md).
