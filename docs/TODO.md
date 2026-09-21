# Todo

Small, concrete, near-term code action items; documentation debt belongs in [DOCTODO.md](DOCTODO.md). These are — not full features (those go in
[ROADMAP.md](ROADMAP.md)) and not open questions (those go in [BUGS.md](BUGS.md)).

- **Automate the existing regression suite (A16)**: add a root test command and Windows/Linux CI covering Node 24 and 26, with native PHP/cURL and VS Code compilation prerequisites. Isolate PHP extension discovery from local sibling/global packages so test results are reproducible. See [the contributor guide](../.github/CONTRIBUTING.md#development-setup) for the currently verified manual command.
- **Complete VS Code interactive and packaging verification after A08**: relocated integration and a real VS Code 1.138.0 smoke test pass. Verify script selection, build failures, status transitions, real-host configuration watching, browser preview, and VSIX contents/licenses. See [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md) for reproducible checks.
