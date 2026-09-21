<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/mcp

MCP server exposing a **Kirigami** project to an AI agent.

[![npm version](https://img.shields.io/npm/v/@kirigami/mcp)](https://www.npmjs.com/package/@kirigami/mcp)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

`@kirigami/mcp` wraps `@kirigami/kirigami`'s `Project` API — the same one
`@kirigami/cli` drives for `kiri build`/`export`/`run` — behind a
[Model Context Protocol](https://modelcontextprotocol.io) server, so an AI
agent can build, export, validate, and run a Kirigami project the same way
the terminal does, without shelling out to `kiri` and parsing its output.

Talks stdio, and is bound to whatever directory it's launched from — same
as `kiri` itself. Meant to be started by an MCP client (`kiri mcp` from
`@kirigami/cli`, or this package's own `kiri-mcp` binary), not run
interactively.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/mcp](#kirigamimcp)
- [Overview](#overview)
- [Usage](#usage)
- [Tools](#tools)
- [Why no `serve`/`watch`](#why-no-servewatch)
- [JavaScript API](#javascript-api)
  - [Documentation index helpers](#documentation-index-helpers)
- [License](#license)

---

## Usage

From `@kirigami/cli` (recommended — no separate install):

```bash
npx kiri mcp
```

Or run this package directly, e.g. from an MCP client's own config:

```json
{
  "mcpServers": {
    "kirigami": {
      "command": "npx",
      "args": ["-y", "@kirigami/mcp"],
      "cwd": "/path/to/your/kirigami/project"
    }
  }
}
```

Either way, the server needs to run with the Kirigami project's root as its
working directory (`kirigami.yaml` resolved from there) — use the client’s supported working-directory setting or a launcher that changes directory before importing Kirigami. The `cwd` key above is client-specific, not a universal MCP setting.

---

## Tools

| Tool | What it does |
|---|---|
| `kirigami_config` | Re-reads and returns the resolved `kirigami.yaml` plus the active plugin list. Call this first to understand a project. |
| `kirigami_validate` | Re-reads and validates `kirigami.yaml` against the schema, without loading plugins. |
| `kirigami_build` | Same as `kiri build` — runs every configured task once, in place. |
| `kirigami_export` | Same as `kiri export` — runs buildable or explicitly forced tasks plus implicit rendering and a copy into `export.path` (optionally overridden per call). |
| `kirigami_run` | Same as `kiri run <command>` — runs `scripts/<command>.php` inside the PHP-WASM runtime, with extra args as `$argv`. |
| `kirigami_list_scripts` | Lists every `scripts/<name>.php` file the project actually has (not just the ones with a `scripts:` yaml entry), each with its `trigger`/`mount` metadata if declared. Use before `kirigami_run` to discover valid names. |
| `kirigami_list_tasks` | Lists the tasks `kirigami_build`/`kirigami_run_task` would run — `tasks:` entries plus the implicit `"render-all"` prepros task. Use before `kirigami_run_task`. |
| `kirigami_run_task` | Runs exactly one task by name, bypassing `before-build` and every other task — for re-running (or first-running) a single piece of the pipeline instead of the whole build. |
| `kirigami_about` | Returns a compact project manifest (README/docs/LICENSE summary, package metadata, tasks and scripts) so an AI agent can orient itself immediately. |
| `kirigami_search_docs` | Searches the docs/ and README files for a query and returns matching paths plus short excerpts. It now uses a cached full-text index that refreshes when files change. |
| `kirigami_doc_hints` | Suggests the most relevant docs for a topic such as build, package, MCP, extension, troubleshooting or licensing. |
| `kirigami_site_blueprint` | Returns a suggested site tree, example configuration, and example PHP page. It does not create files or validate that the suggested layout files exist. |

Configuration, build/export, script/task listing and execution, and `kirigami_about` reload the project before answering. Reload invalidates PHP state and re-registers plugins, so even `about` can execute plugin registration code. `kirigami_validate` only validates core configuration. Documentation search, hints, and the site blueprint do not reload the project. The standard stdio launcher still loads a project before starting the server. Await project operations in sequence: there is no whole-project operation queue. JavaScript plugin code changes require restarting the MCP process because Node caches imported modules.

Tool results contain JSON in text content. Inspect the payload's `success` field for operations: a structured `success: false` result is not automatically an MCP `isError` response. Validation instead returns `{ valid: true }` or `{ valid: false, error }`, including when validation throws. Other caught exceptions are reported as tool errors.

`kirigami_run`/`kirigami_run_task` execute any named script/task the
project defines — only point this server at a project you trust.

---

## Why no `serve`/`watch`

`Project.serve()` and `.watch()` build initially, then return handles while leaving background resources running. MCP tools for them would need explicit resource ownership, status, and stop operations; those tools are not implemented.

---

## JavaScript API

```js
import { createServer } from '@kirigami/mcp';
import { load } from '@kirigami/kirigami';

// Full control over the McpServer instance (e.g. to add your own tools
// alongside Kirigami's, or use a transport other than stdio):
const project = await load();
const server = createServer(project, { name: 'kirigami', version: '0.1.0' });

```

Alternatively, start the standard stdio transport:

```js
import { serveStdio } from '@kirigami/mcp';

// The one-liner bin/kiri-mcp.js and `kiri mcp` both use — loads the
// project at process.cwd() and connects a StdioServerTransport:
await serveStdio();
```

### Documentation index helpers

These synchronous named exports can be used independently of a loaded Project:

| Export | Behavior |
|---|---|
| `buildDocIndex(projectDir, { cachePath } = {})` | Scan Markdown, return an index, and write it to `.kirigami/mcp-doc-index.json` by default. Pass `cachePath: null` to avoid writing a cache. |
| `loadDocIndex(projectDir)` | Reuse the default cache, rebuilding when file membership changes or a file has a newer modification time. |
| `searchDocIndex(index, query, scope = 'all', limit = 10)` | Return ranked `{ path, score, excerpt }` matches without reading source files again. Empty or untokenizable queries return no matches. |

```js
import { buildDocIndex, searchDocIndex } from '@kirigami/mcp';

const index = buildDocIndex(process.cwd(), { cachePath: null });
const matches = searchDocIndex(index, 'initial build', 'docs', 5);
console.log(matches);
```

The index includes the root README and Markdown under `docs`, `packages`, `src`, `assets`, and `scripts`. It skips `.git`, `node_modules`, and `.kirigami` directories; other generated Markdown under included paths can still be indexed. Root CLAUDE.md, AGENTS.md, and `.github` documentation are not included by the final path filter.

Scopes are `all`, `docs`, `readme` (root README only), and `packages`. The MCP search tool validates a positive limit of at most 20; direct JavaScript calls do not apply that schema. Excerpts are the first 220 normalized characters of each document, not a passage around the match. Ranking uses up to 50 token frequencies per document plus full-query substring matches. Modification-time refresh is not content hashing: preserved or older timestamps can leave edited content cached. Search writes a cache by default, but does not modify source documentation. Built-in topic hints are a fixed list and may lag newly added guides.

---

## License

GPL-3.0-or-later © Maxime Larrivée-Roy, 2026
