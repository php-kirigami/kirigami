<div align="center">

<img src="images/logo.png" alt="Kirigami" width="400" />

---

# Kirigami for VS Code

Create, build, preview and export a **Kirigami** static site without leaving
the editor.

[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![VS Code >=1.90.0](https://img.shields.io/badge/vscode-%5E1.90.0-blue)](https://code.visualstudio.com)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

[Kirigami](https://php-kirigami.github.io) compiles PHP page templates into
dependency-free static HTML, running PHP in WebAssembly inside Node.js — no
PHP install needed. This extension runs the same engine as the `kiri`
command line, from the Command Palette and the status bar.

It activates in any workspace whose root folder has a `kirigami.yaml`, and
reloads the project when that file changes.

---

## Table of contents

- [Kirigami for VS Code](#kirigami-for-vs-code)
- [Overview](#overview)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Dev server](#dev-server)
- [Settings](#settings)
- [Known limitations](#known-limitations)
- [License](#license)

---

## Requirements

- **Node.js 24 or later**, installed on your machine. The engine runs in its
  own Node process rather than in VS Code's. If `node` isn't on your PATH,
  set `kirigami.nodePath` to its executable and restart the extension.
- VS Code 1.90 or later.
- A trusted workspace: the extension doesn't run in Restricted Mode.

---

## Getting started

Run **Kirigami: Create Project…** from the Command Palette (it works in any
window). Pick a folder, an official template and your project details, and
choose whether to initialise git and run `npm install`. The new project
opens as soon as it's ready.

To work on an existing site, open the folder that holds its `kirigami.yaml`.

---

## Commands

All commands are in the **Kirigami** category of the Command Palette:

| Command | What it does |
|---|---|
| Kirigami: Create Project… | Scaffolds a new site from an official template, then opens it |
| Kirigami: Build | Builds the project |
| Kirigami: Export | Exports the static site for deployment |
| Kirigami: Run Script… | Runs one of the project's PHP scripts |
| Kirigami: Validate kirigami.yaml | Checks the configuration against its schema |
| Kirigami: Toggle Dev Server | Starts or stops the dev server |

Every command except Create Project appears once a Kirigami project is
loaded. Results show in a notification; full details, including every
rebuild, go to the **Kirigami** output channel.

---

## Dev server

The status bar item (bottom right) starts and stops the dev server. Starting
it builds the project first, then serves it with live rebuilds, and asks
whether to open the preview in VS Code's Simple Browser or in your browser.

| State | Meaning |
|---|---|
| Idle | The server isn't running |
| Running | The server is up; the tooltip shows its URL |
| Building | A rebuild is in progress |
| Error | The last rebuild failed; see the output channel |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `kirigami.nodePath` | `node` | Node.js 24+ executable that runs the engine. Restart the extension after changing it. |
| `kirigami.previewPort` | `4321` | Port of the dev server. Applies the next time the server starts. |

---

## Known limitations

- One project per window: the extension uses the first workspace folder, and
  multi-root workspaces aren't supported.
- Installing or removing a plugin doesn't reload the project; run
  **Developer: Restart Extension Host** or reopen the folder.

---

## License

GPL-3.0-or-later © Maxime Larrivée-Roy, 2026
