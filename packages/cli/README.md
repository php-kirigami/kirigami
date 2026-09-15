<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/cli

The **`kiri`** command — the terminal interface of the **Kirigami** static
site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/cli)](https://www.npmjs.com/package/@kirigami/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

`@kirigami/cli` installs the **`kiri`** command: `build`, `export`, `watch`,
`serve`, `run`, `create`, `install`, `cache`, `phpinfo`. It parses arguments,
prints progress and errors to the terminal, and — for `build`/`serve`/`watch`
— simply calls [`@kirigami/kirigami`](https://www.npmjs.com/package/@kirigami/kirigami)'s
programmatic `Project` API; it carries no build logic of its own for those.

This package is the terminal face of Kirigami. The actual engine — config
loading, the plugin system, the task pipeline, the dev server — lives in
`@kirigami/kirigami`, which any other interface (an editor extension, an MCP
server, a script) can use directly without going through a terminal at all.
See its README for how a Kirigami project is built.

---

## Table of contents

- [Installation](#installation)
- [Commands](#commands)
- [License](#license)

---

## Installation

```bash
npm install --save-dev @kirigami/cli
```

`kiri create` (see below) also works via `npx @kirigami/cli create` without
installing anything first.

---

## Commands

```bash
kiri build              # compile for development
kiri export              # compile + export for production
kiri watch                # dev-mode, rebuild on change
kiri serve                 # dev-mode + local server + hot-reload
kiri run <script>           # run a scripts/*.php command
kiri create                  # scaffold a new project from a template
kiri install <plugin>         # install a plugin, print its kirigami.yaml entry
kiri cache                     # purge local caches
kiri phpinfo                    # print phpinfo() from the embedded PHP runtime
```

Every command has its own `--help` (e.g. `kiri serve --help`).

---

## License

MIT © Maxime Larrivée-Roy, 2026
