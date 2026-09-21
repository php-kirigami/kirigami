<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# kirigami-vscode

A VS Code extension for **Kirigami** — build, export, run, and preview a
Kirigami static site without leaving the editor.

[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![VS Code >=1.90.0](https://img.shields.io/badge/vscode-%5E1.90.0-blue)](https://code.visualstudio.com)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

This development extension has passed relocated integration tests and a real VS Code 1.138.0 smoke test on Windows. VSIX packaging and the remaining interactive checks are still pending.

`kirigami-vscode` wraps `@kirigami/kirigami`'s `Project` API — the same
one `@kirigami/cli` (terminal) and `@kirigami/mcp` (AI agent) already
wrap — in a dedicated external Node process with its own project working directory. See
`docs/DECISIONS.md`'s `@kirigami/mcp` section in the monorepo for why this
doesn't go through `@kirigami/mcp`'s stdio server instead.

The scaffold is configured to activate automatically in any workspace whose root has a `kirigami.yaml`,
and gives you Command Palette actions for the one-shot operations plus a
status bar toggle for the dev server with live build state.

Note: `package.json`'s `name` is unscoped (`kirigami-vscode`, not
`@kirigami/vscode`) — deliberately, not an oversight. It doubles as the
VS Code extension identity (→ `php-kirigami.kirigami-vscode`), and npm
workspaces symlinks every `packages/*` package into the repo root's
`node_modules` by this exact field. Naming it plain `vscode` (a tempting
match for the extension ecosystem's own convention) creates
`node_modules/vscode` pointing at this package itself, shadowing the
literal string `"vscode"` for the whole monorepo — harmless inside the
real extension host (which intercepts `require("vscode")` before normal
module resolution), but confusing for anything else, including testing
this bundle with plain Node outside VS Code.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [kirigami-vscode](#kirigami-vscode)
- [Overview](#overview)
- [Commands](#commands)
- [Status bar](#status-bar)
- [Requirements](#requirements)
- [Development](#development)
- [Known limitations](#known-limitations)
- [License](#license)

---

## Commands

Available from the Command Palette, all under the **Kirigami** category:

| Command | ID | Wraps |
|---|---|---|
| Kirigami: Build | `kirigami.build` | `Project.build()` |
| Kirigami: Export | `kirigami.export` | `Project.export()` |
| Kirigami: Run Script… | `kirigami.run` | `Project.run(name)`, prompts via `Project.scripts` |
| Kirigami: Validate kirigami.yaml | `kirigami.validate` | `Project.validate()` |
| Kirigami: Toggle Dev Server | `kirigami.toggleServer` | `Project.serve()` / the returned handle's `close()` |

Results and errors are summarized in a notification; full detail (and
every watch-triggered rebuild's outcome) goes to the **Kirigami** Output
channel.

---

## Status bar

One item, bottom-right, also bound to **Kirigami: Toggle Dev Server**:

| State | Meaning | Look |
|---|---|---|
| Idle | No `serve()` call active | Plain icon, default colors |
| Running | Server up, no build in flight | `$(radio-tower)`, tooltip shows the URL |
| Building | A watch-triggered rebuild is in progress | `$(sync~spin)` |
| Error | The last rebuild failed | `$(error)`, error background |

Clicking it while idle starts the dev server, then asks whether to open it
in VS Code's Simple Browser or your default external browser — asked
every time, nothing remembered. Clicking it while running stops the
server.

---

## Requirements

The manifest declares Node `>=24.0.0` and VS Code `^1.90.0`. Install external Node 24+ with WebAssembly JSPI and SQLite support. Set `kirigami.nodePath` to its executable if `node` is unavailable on PATH, then restart the extension. Core runs in that child process independently of the embedded host. Only trusted workspaces are supported. Older VS Code versions remain untested.

---

## Development

Open this package as its own workspace root (`launch.json`/`tasks.json`
resolve relative to `${workspaceFolder}`, so opening the monorepo root
instead won't work):

```bash
# from the repo root, first
npm install

code packages/vscode
```

Then press <kbd>F5</kbd> to launch an Extension Development Host, and open
a folder containing a `kirigami.yaml` in that host window (e.g.
`../template-demo`).

---

## Known limitations

- A08 resource paths and working-directory capture are fixed; runtime dependencies are copied under `dist/runtime` during compilation. Recompile after core or worker edits; watch mode only rebuilds the host bundle.
- Runtime staging uses dependencies installed for the build platform; cross-platform VSIX packaging remains unverified.
- Run Script reports structured failures with an error notification and full result in the Output channel (A14 fixed). Interactive notification checks remain pending.
- Core reload now resets PHP runtime/config state and plugin includes (A06 fixed); the extension's configuration watcher still needs real-host verification.
- Preview builds before starting the server; a failed initial build reports an error and leaves the server stopped.

- Single workspace folder only — binds to `workspaceFolders[0]`; multi-root
  isn't supported by `Project` itself yet.
- No `.vsix` packaging/publishing set up yet.
- The `kirigami.yaml` reload watcher doesn't yet cover plugin
  installs/removals (`node_modules` changes).

---

Automated test commands and remaining host checks are documented in [the extension guide](../../docs/EXTENSION-VSCODE.md).

## License

GPL-3.0-or-later © Maxime Larrivée-Roy, 2026
