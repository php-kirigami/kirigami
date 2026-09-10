<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/sdk

Shared runtime for **Kirigami** plugins — the hook registry and the on-disk cache.

[![npm version](https://img.shields.io/npm/v/@kirigami/sdk)](https://www.npmjs.com/package/@kirigami/sdk)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)

</div>

---

## Overview

`@kirigami/sdk` is the shared runtime between `@kirigami/kirigami` (kirigami-core)
and plugin packages: essentially, an in-memory hook registry.

`@kirigami/kirigami` fires named hooks during its build; a plugin hooks into
them via `on(hookName, fn)`. Since both depend on the same instance of this
module (via the monorepo's npm workspaces, or as a regular dependency once
published), they share the same in-memory registry — the plugin doesn't need
to know anything about kirigami-core's internal structure.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/sdk](#kirigamisdk)
  - [Overview](#overview)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage in a plugin](#usage-in-a-plugin)
  - [Available hooks](#available-hooks)
  - [API](#api)
    - [`on(hookName, fn)`](#onhookname-fn)
    - [`off(hookName, fn)`](#offhookname-fn)
    - [`run(hookName, ...args)`](#runhookname-args)
    - [`HOOKS`](#hooks)
  - [Cache](#cache)
  - [Requirements](#requirements)
  - [License](#license)

---

## Installation

```bash
npm install @kirigami/sdk
```

---

## Usage in a plugin

```js
import { on, HOOKS } from '@kirigami/sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));

on(HOOKS.SASS_BEFORE, () => path.join(pluginDir, 'styles/before.scss'));
on(HOOKS.SASS_AFTER,  () => path.join(pluginDir, 'styles/after.scss'));

on(HOOKS.SASS_FUNCTIONS, () => ({
	'my-plugin-function($value)': (args) => {
		// ...
	},
}));
```

A listener can return:
- a single value,
- an array of values (automatically flattened into the result),
- `null`/`undefined` to contribute nothing this run — useful if the listener
  wants to inspect the received context (see below) and decide to opt out.

It can also be `async` — `run()` awaits each listener before moving on to the
next one.

---

## Available hooks

Each hook below is fired with a single argument, `hookContext`, shaped as
`{ __root, task, exportPath, config }` (the same values `build()` receives
for the current task, plus the resolved kirigami.yaml config).

| Hook | Task | Expected return value |
|---|---|---|
| `HOOKS.SASS_BEFORE` | sass | `.scss` file path(s), compiled before the entry |
| `HOOKS.SASS_AFTER` | sass | `.scss` file path(s), compiled after the entry |
| `HOOKS.SASS_FUNCTIONS` | sass | object(s) `{ 'signature($arg)': (args) => SassValue }`, in the same shape as the Sass API's `functions` option |

For `SASS_BEFORE`/`SASS_AFTER`, prefer an absolute path resolved from the
plugin itself (as in the example above) — a relative path would be resolved
from the `cwd()` of the project using kirigami, not from the plugin.

For `SASS_FUNCTIONS`, if the signature collides with one of kirigami's native
functions (`inline-file`, `img-asset`, `colors`, `font-*`), the native one
wins.

---

## API

### `on(hookName, fn)`

Registers a listener. Returns a function to unregister it (equivalent to
calling `off(hookName, fn)`).

### `off(hookName, fn)`

Unregisters a listener previously added with `on()`.

### `run(hookName, ...args)`

Runs every listener registered for a hook, in registration order, and
flattens their results into a single array. Used internally by
kirigami-core — a plugin normally doesn't need to call `run()` itself.

### `HOOKS`

Frozen object listing the known hook names (see table above). Prefer these
over hand-typed strings.

---

## Cache

A persistent key/value cache on disk, backed by `node:sqlite` (built into
Node — no native compilation, unlike `better-sqlite3`). This is what
kirigami-core uses for its own cache (representative colors, font metadata),
but a plugin can just as well spin up its own:

```js
import { Cache } from '@kirigami/sdk';
import path from 'node:path';

// A file dedicated to the plugin instead of sharing the core's.
const cache = new Cache(path.join(pluginDir, '.my-plugin.db'));

cache.set('meta_home', { hello: 'world' }, 3600); // 1h TTL, in seconds (0 = never expires)
cache.get('meta_home'); // { hello: 'world' }, or null if missing/expired
cache.del('meta_home');
cache.purge();          // deletes all expired entries
cache.purge('meta_*');  // deletes every "meta_" entry, expired or not
cache.close();          // closes the underlying SQLite connection
```

`new Cache()` with no argument opens `.node.db` in the current working
directory — the same file kirigami-core uses. Pass an explicit path to keep a
plugin's cache separate.

| Method | Returns | Description |
|---|---|---|
| `get(key)` | value \| `null` | Stored value, or `null` if missing/expired. |
| `set(key, val, ttl = 0)` | `boolean` | Stores `val` (JSON-serialized); `ttl` in seconds, `0` = never expires. |
| `del(key)` | `boolean` | Deletes one entry. |
| `purge(mask?)` | `number` | No argument: deletes expired entries. With a glob mask (`'meta_*'`): deletes every matching entry, expired or not. Returns rows deleted. |
| `close()` | `void` | Closes the SQLite connection (reopened lazily on the next call). |

**Key naming.** Every key must start with a namespace — one or more `[a-z]`
characters followed by `_` (`colors_`, `font_`, `meta_`, …). A key that
doesn't match throws. That namespace is what `purge(mask)` targets: pass a
glob like `'meta_*'` to drop a whole namespace at once (`*` is the only
wildcard). `purge()` with no argument keeps its original meaning — sweep
expired entries only. Both forms return the number of rows deleted.

Every value goes through `JSON.stringify`/`JSON.parse` — so only serializable
data (no functions, class instances, `Buffer`, etc.).

---

## Requirements

- Node.js `>= 24.0.0`
- npm `>= 10.2.3`
- ESM only (`"type": "module"`)

---

## License

MIT © Maxime Larrivée-Roy, 2026
