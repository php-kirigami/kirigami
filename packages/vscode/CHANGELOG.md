# Changelog

## 0.1.0 — Unreleased

Initial scaffold: build/export/run/validate commands, dev-server status bar
toggle, kirigami.yaml reload watcher.

## Unreleased

- Added **Kirigami: Create Project…**: runs the CLI's `kiri create` wizard (template list and questions) in an integrated terminal, then offers to open the new project. Available outside Kirigami projects; the project commands are hidden there.
- Added the extension icon (the Kirigami elephant).

- Fixed Run Script success notifications for failed results (A14); errors and returned diagnostics appear in the Kirigami Output channel.

- Fixed A08 resource resolution and working-directory capture using staged ESM runtime dependencies and an external Node worker.
- Added relocated integration coverage and a Windows real-host smoke runner; verified with VS Code 1.138.0.

- Clarified the implemented scaffold and outstanding activation/resource-path defects.
- Documented initial-build, PHP reload, and script-result limitations.
- The initial scaffold had pending host validation; the A08 smoke tests above now pass. Interactive checks and VSIX packaging remain pending. No package version changed.
