# Todo

Small, concrete, near-term code action items; documentation debt belongs in [DOCTODO.md](DOCTODO.md). These are — not full features (those go in
[ROADMAP.md](ROADMAP.md)) and not open questions (those go in [BUGS.md](BUGS.md)).

- **Check the first CI run**: `.github/workflows/ci.yml` has never run. Push, then fix whatever fails, especially on Linux, which has never been exercised.
- **Complete VS Code interactive and packaging verification after A08**: relocated integration and a real VS Code 1.138.0 smoke test pass. Verify script selection, build failures, status transitions, real-host configuration watching, browser preview, and VSIX contents/licenses. See [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md) for reproducible checks.
