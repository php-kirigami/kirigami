# Changelog

## 0.1.0

First release.

- **Kirigami: Create Project…** — a wizard (template, project details, git
  and `npm install` options) that scaffolds a new site from an official
  template and opens it. Available in any window.
- **Build**, **Export**, **Run Script…** and **Validate kirigami.yaml**
  commands for the open project, with results in a **Kirigami** output
  channel that looks like the `kiri` CLI.
- **Toggle Dev Server** from the status bar: builds, serves the site with
  live rebuilds, shows the build state, and opens the preview in VS Code's
  Simple Browser or your browser.
- Activates in workspaces whose root has a `kirigami.yaml`, and reloads the
  project when that file changes.
- Settings: `kirigami.nodePath` (the Node 24+ executable that runs the engine)
  and `kirigami.previewPort` (the dev server's port, default `4321`).
