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
`serve`, `run`, `mcp`, `create`, `install`, `cache`, `phpinfo`. It parses arguments,
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

- [@kirigami/cli](#kirigamicli)
- [Overview](#overview)
- [Installation](#installation)
- [Commands](#commands)
  - [`kiri build`](#kiri-build)
  - [`kiri export`](#kiri-export)
  - [`kiri watch`](#kiri-watch)
  - [`kiri serve`](#kiri-serve)
  - [`kiri run <script>`](#kiri-run-script)
  - [`kiri create [template]`](#kiri-create-template)
  - [`kiri install <plugin...>`](#kiri-install-plugin)
  - [`kiri cache purge`](#kiri-cache-purge)
  - [`kiri phpinfo`](#kiri-phpinfo)
  - [`kiri mcp`](#kiri-mcp)
- [License](#license)

---

## Installation

```bash
npm install --save-dev @kirigami/cli
npx kiri --help
```

For a global installation, use `npm install -g @kirigami/cli`. In a project, prefer the locally installed binary through `npx kiri`.

Run `npx kiri build` before starting `npx kiri serve` or `npx kiri watch`: neither performs the initial build. Creation is currently affected by incorrect dependency/banner lookup after the CLI split; see [A05](../../docs/AUDIT-2026-09-20.md). Until fixed, use a template checkout and explicitly install the CLI.

The development server serves source files, including PHP and hidden files. Keep it on the default loopback address for local development. Export rejects equal, ancestor, or descendant source/output paths before clearing the destination, including symlink/junction aliases. PHP files (case-insensitive `.php`) and dot-prefixed directories are excluded from the copy. Add `export.ignore` rules for any other project-specific private files.

---

## Commands

| Command | Summary |
|---|---|
| `kiri build` | Compile the project for development (run every task once). |
| `kiri export` | Compile + export a production-ready static site. |
| `kiri watch` | Watch project files and rebuild on change. |
| `kiri serve` | `kiri watch`, plus a local server and browser hot-reload. |
| `kiri run <script>` | Run a PHP script from `scripts/` in the Kirigami runtime. |
| `kiri create [template]` | Scaffold a new project from an official template (interactive wizard with no args). |
| `kiri install <plugin...>` | Install a plugin and print the `plugins:` entry to paste into `kirigami.yaml`. |
| `kiri cache purge [mask]` | Purge the local `.node.db` / `.cache.db` / `.cookie.txt` caches. |
| `kiri phpinfo` | Print `phpinfo()` from the embedded PHP-WASM runtime. |

Every command has its own `--help`.

### `kiri build`

Reads `kirigami.yaml` and runs every declared `tasks` entry **once**, in order.
If a `prepros` block is present, a forced `prepros` task is prepended (renders
all pages + `sitemap.xml`). Fires the `before-build` script trigger first. Only
tasks whose type supports building run, unless the task sets `force: true`.
Output is written next to each entry, under `kirigami.root`.

### `kiri export`

Production build. Runs `before-export` then `before-build` triggers, prepends a
forced `prepros` task (if configured) and a forced `dist` task, runs explicit tasks whose type supports building or which set `force: true`, then fires `after-export`. The `dist` task copies
`kirigami.root` into `export.path` (default `dist/`), and the banner is stamped
onto every exported `.js` / `.css` / `.html` file.

### `kiri watch`

Dev mode. Attaches a file watcher to every task whose type supports watching
(`esbuild`, `sass`, `prepros`). Changes are debounced (150 ms) and batched per
task. `node_modules/`, `.git/` and `dist/` are always ignored. `Ctrl+C` closes
every watcher cleanly.

### `kiri serve`

Everything `kiri watch` does, plus a static file server over `kirigami.root`
and a hot-reload channel (Server-Sent Events — no WebSocket dependency): every
open tab reloads once a batch finishes rebuilding. Zero-dependency
(`node:http`, `node:fs`); no live-reload framework bundled in.

```bash
kiri serve                # http://127.0.0.1:4321/
kiri serve --port 5000
kiri serve --host 0.0.0.0 # reachable from other devices on the network
```

Use `kiri watch` instead when you don't need a browser tab — CI, or an
editor's own preview server.

### `kiri run <script>`

Executes `scripts/<script>.php` inside the same sandboxed PHP-WASM environment
used for rendering, via `runenv()` from `@kirigami/php-prepros` — the full PHP
class library is available and `kirigami.yaml`'s `kirigami` block is exposed as
`PREPROS::$config->data`. Extra words after the script name are forwarded as
`$argv` entries. Declare a matching `scripts:` entry in `kirigami.yaml` to
`mount` extra files or to fire the script automatically via `trigger`.

```bash
kiri run convert-images
kiri run deploy production --force
```

### `kiri create [template]`

Scaffolds a project from an official template — a GitHub repository named
`template-<name>` under the [`php-kirigami`](https://github.com/php-kirigami)
organization.

| Flag | Description |
|---|---|
| `--list`, `-l` | List available templates (cached 1 h in `~/.config/kirigami/kiri.db`). |
| `--name`, `--description`, `--author`, `--email`, `--baseurl`, `--repo` | Metadata to write into `package.json` / `kirigami.yaml`. `--repo` defaults to the repo derived from a `*.github.io` base URL. |
| `--yes`, `-y` | Non-interactive: take defaults, ask nothing. |
| `--no-git` | Don't initialise a git repository. |
| `--no-install` | Don't run `npm install` afterwards. |
| `--help`, `-h` | Show help. |

```bash
kiri create                      # interactive wizard
kiri create --list
kiri create blog my-blog
```

Run with no arguments in a terminal for a wizard: it asks for the template, the
target directory, and the project **name / description / author / email / base
URL / repo**, then writes those into `package.json` and `kirigami.yaml`
(comments preserved). Pass a template name to skip straight to extraction.

The template `.tar.gz` is downloaded and unpacked with a zero-dependency tar
parser (Node has no zip API). **Extraction never overwrites**: files already in
the target are kept as-is, an existing `package.json` is deep-merged (existing
values win), everything missing is added — so an existing `package.json`, `.git`,
`README`, `node_modules`, etc. are fine. If the template ships no `package.json`
or `banner.txt`, a starter one is written — the banner keeps its `### ###` tokens
(`###DATE###`, `###PROJECT###`, `###AUTHOR###`, `###EMAIL###`, `###REPO###`,
`###BASEURL###`), which `kiri build` / `kiri export` fill from `kirigami.yaml`
every time. Then, unless the target is already inside a git worktree (or
`--no-git`), `git init` + an initial commit; then `npm install` unless
`--no-install`. `.cache.db`, `.node.db`, `.cookie.txt` and `package-lock.json`
are never copied from the template.

Every official template ships its own `CLAUDE.md` at the project root, copied
along with everything else — a fresh `kiri create` is **Claude Ready** out of
the box, no setup needed to start a Claude Code session in it.

### `kiri install <plugin...>`

Installs a plugin (`npm install`, devDependency by default — `--save` for a
regular one) and prints the `plugins:` entry to paste into `kirigami.yaml`,
built from the plugin's own `kirigami.optionsSchema`. **Never touches
`kirigami.yaml` itself** — you paste the printed block in.

A bare name (`highlight`) is resolved against the `@kirigami/plugin-*` /
`kirigami-plugin-*` conventions and checked on npm; a full package name is
used as-is. Already installed → checks npm for a newer version and updates
if there is one.

```bash
kiri install highlight
kiri install @kirigami/plugin-highlight
kiri install highlight extlink   # multiple at once
```

| Flag | Description |
|---|---|
| `--save` | Install as a regular dependency (default: devDependency). |
| `--help`, `-h` | Show help. |

### `kiri cache purge`

Clears the working caches Kirigami leaves at the project root: `.node.db`
(kirigami-core's cache — `@kirigami/sdk`, `node:sqlite`), `.cache.db` (the PHP
`CACHE` class) and `.cookie.txt` (the `CURL` / `SCRAPER` cookie jar).

| Invocation | Effect |
|---|---|
| `kiri cache purge` | Deletes the `.node.db`, `.cache.db` and `.cookie.txt` files (whichever exist). |
| `kiri cache purge <mask>` | Keeps the files, but deletes every cache **key** matching `<mask>` in both SQLite stores. |

`<mask>` is a glob against the key namespace (`meta_*`, `colors_*`, `font_*`, …).
Runs against the current working directory.

```bash
kiri cache purge
kiri cache purge meta_*
kiri cache purge "colors_*"
```

| Flag | Description |
|---|---|
| `--help`, `-h` | Show help. |

### `kiri phpinfo`

Prints `phpinfo()` from the embedded PHP-WASM runtime — handy to check the
available PHP version and extensions.

| Flag | Description |
|---|---|
| `--md`, `-m` | Output Markdown instead of HTML. |
| `--json`, `-j` | Output JSON instead of HTML. |
| `--help`, `-h` | Show help. |

```bash
kiri phpinfo > phpinfo.html
kiri phpinfo -m > phpinfo.md
```

---

### `kiri mcp`

Starts the stdio MCP server for the project in the current directory. See [the MCP reference](../mcp/README.md). Reserve stdout for the MCP transport.

---

## License

MIT © Maxime Larrivée-Roy, 2026
