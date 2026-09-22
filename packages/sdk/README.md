<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/sdk

Shared runtime for **Kirigami** plugins — hooks, commands, task types, and the on-disk cache.

[![npm version](https://img.shields.io/npm/v/@kirigami/sdk)](https://www.npmjs.com/package/@kirigami/sdk)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

`@kirigami/sdk` is the shared runtime between `@kirigami/kirigami` (kirigami-core)
and plugin packages: essentially, an in-memory hook registry.

`@kirigami/kirigami` fires named hooks during its build; a plugin hooks into
them via `on(hookName, fn)`. Since both depend on the same instance of this
module (via the monorepo's npm workspaces, or as a regular dependency once
published), they share the same in-memory registry — the plugin doesn't need
to know anything about kirigami-core's internal structure. Core and plugins
must resolve the same installed SDK module: separate physical copies or
versions have separate registries; npm dependency declarations alone do not
guarantee a shared instance.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/sdk](#kirigamisdk)
- [Overview](#overview)
- [What's new in 0.2.1](#whats-new-in-021)
- [What's new in 0.2.0](#whats-new-in-020)
- [Installation](#installation)
- [Usage in a plugin](#usage-in-a-plugin)
- [Available hooks](#available-hooks)
- [API](#api)
  - [`reset(hookName?)`](#resethookname)
  - [Command registry](#command-registry)
  - [Task-type registry](#task-type-registry)
  - [`on(hookName, fn)`](#onhookname-fn)
  - [`off(hookName, fn)`](#offhookname-fn)
  - [`run(hookName, ...args)`](#runhookname-args)
  - [`runWaterfall(hookName, value, ...args)`](#runwaterfallhookname-value-args)
  - [`has(hookName)`](#hashookname)
  - [`HOOKS`](#hooks)
- [Cache](#cache)
- [TypeScript declarations](#typescript-declarations)
- [Requirements](#requirements)
- [License](#license)

---

## What's new in 0.2.1

- `homepage` + README pointed at the site (metadata only).

---

## What's new in 0.2.0

- `esbuild:before` / `esbuild:after` / `esbuild:plugins` hooks — the esbuild
  task now has the same extension points as sass, so a plugin can inject
  client-side JavaScript.
- `prepros:html` hook — transform the final HTML of each rendered page;
  `prepros:php` hook — contribute a PHP file to the prepros runtime (register
  authoring tags / hooks from PHP). Both used by `@kirigami/plugin-highlight`.
- `runWaterfall()` — pipe a value through listeners (vs. `run()`, which
  collects), and `has()` — check whether a hook has any listener.

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

export default function register() {
on(HOOKS.SASS_BEFORE, () => path.join(pluginDir, 'styles/before.scss'));
on(HOOKS.SASS_AFTER,  () => path.join(pluginDir, 'styles/after.scss'));

on(HOOKS.SASS_FUNCTIONS, () => ({
	'my-plugin-function($value)': (args) => {
		// ...
	},
}));

// Inject a client-side script into every esbuild bundle.
on(HOOKS.ESBUILD_AFTER, () => path.join(pluginDir, 'client/init.js'));

// Rewrite the rendered HTML of every page (waterfall — return the new string).
on(HOOKS.PREPROS_HTML, (html, { file }) => html.replaceAll('<table>', '<table class="striped">'));
}
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

Sass and esbuild hooks receive one argument, `hookContext`, shaped as
`{ __root, task, exportPath, config }` (the same values `build()` receives
for the current task, plus the resolved kirigami.yaml config). The two
prepros hooks use the separate signatures shown in the table.

| Hook | Task | Fired with | Expected return value |
|---|---|---|---|
| `HOOKS.SASS_BEFORE` | sass | `hookContext` | `.scss` file path(s), compiled before the entry |
| `HOOKS.SASS_AFTER` | sass | `hookContext` | `.scss` file path(s), compiled after the entry |
| `HOOKS.SASS_FUNCTIONS` | sass | `hookContext` | object(s) `{ 'signature($arg)': (args) => SassValue }`, in the same shape as the Sass API's `functions` option |
| `HOOKS.ESBUILD_BEFORE` | esbuild | `hookContext` | `.js`/`.ts` file path(s), bundled (as side-effect imports) before the entry |
| `HOOKS.ESBUILD_AFTER` | esbuild | `hookContext` | `.js`/`.ts` file path(s), bundled (as side-effect imports) after the entry |
| `HOOKS.ESBUILD_PLUGINS` | esbuild | `hookContext` | esbuild plugin object(s), same shape as the API's `plugins` option |
| `HOOKS.PREPROS_HTML` | prepros | `(html, { file, abs, exportPath, config })` | the modified HTML string — a **waterfall** hook (run with `runWaterfall`), so return the new string or `null`/`undefined` to leave it untouched |
| `HOOKS.PREPROS_PHP` | prepros | `({ __root, config })` | absolute path(s) of `.php` file(s) to `include_once` in the prepros runtime once, before any page renders — for a plugin to `PREPROS::registerTag()` / `registerHook()` from PHP |
| `HOOKS.SCRIPTS_REGISTER` | (none — engine-level) | `({ config })` | object(s) `{ name, file, trigger?, mount? }` — a runnable PHP script, the plugin's counterpart of a project's own `scripts/<name>.php` + kirigami.yaml `scripts:` entry |
| `HOOKS.TASKS_REGISTER` | (none — engine-level) | `({ config })` | object(s) shaped like a kirigami.yaml `tasks:` entry (`{ name, type, ... }`) — a build task, the plugin's counterpart of a project's own `tasks:` entry; its `name` must not collide with any other task |
| `HOOKS.COMMANDS_REGISTER` | (none — engine-level) | `({ config })` | object(s) `{ name, description?, run }` — same shape `registerCommand()` takes, an alternative to calling it directly |

`SCRIPTS_REGISTER` listeners each describe one script: `name` is what `kiri run
<name>` (or `Project#run(name)`) invokes it by; `file` is an absolute path to
the plugin's own `.php` file (resolve it the same way as the `*_BEFORE`/
`*_AFTER` example below); `trigger` — one of `'before-build'`,
`'before-export'`, `'after-export'` — fires it automatically at that
checkpoint, same as a kirigami.yaml-declared script; `mount` is an optional
array of glob patterns (relative to the project root) to mount into the
sandbox first. A project's own `scripts/<name>.php` always wins over a
plugin registering the same name.

`TASKS_REGISTER` listeners each describe one build task — `type` can be a
built-in or any registered task type, most often one the same plugin
registers with `registerTaskType()` in the same `register()` call, so a
project doesn't need its own `tasks:` entry to run it. Collected once, right
after plugins load, and appended to the project's own `tasks:` list — so it
goes through the exact same validation/build/export/watch path as any other
task, and reload() re-collects it fresh (no accumulation across reloads).

`COMMANDS_REGISTER` listeners are collected right after plugins load and each
routed through `registerCommand()` — so a duplicate name (against another
hook entry or a directly-registered command) or a non-function `run` throws
the same error either style produces. Prefer this over calling
`registerCommand()` directly only for consistency with the other `*_REGISTER`
hooks; functionally they're equivalent, since `register()` already has
`options`/`config` in scope either way.

For `*_BEFORE`/`*_AFTER`, prefer an absolute path resolved from the plugin
itself (as in the example above) — a relative path would be resolved from the
`cwd()` of the project using kirigami, not from the plugin. `esbuild:before` /
`esbuild:after` files are bundled as bare side-effect `import`s, so their order
is preserved: before → entry → after.

For `SASS_FUNCTIONS`, if the signature collides with one of kirigami's native
functions (`inline-file`, `img-asset`, `colors`, `font-*`), the native one
wins.

`PREPROS_HTML` fires once per rendered `.html` file. If no plugin registers a
listener, kirigami-core doesn't even read the files back.

---

Register hooks inside the plugin’s default registration function so reload can register them again after resetting the shared registry. Registries are process-wide.

## API

### `reset(hookName?)`

Remove all listeners for one hook, or every hook when omitted. This does not
clear commands (`resetCommands()` does that) or persistent caches. Resetting
a registry does not cancel a dispatch that has already started. Do not mutate
registrations during dispatch: listeners are iterated from a live `Set`. The core owns this during reload; plugins should normally retain and call their own unsubscribe functions.

### Command registry

`registerCommand(name, { description, run })` registers a plugin command. `run(args, project)` receives raw arguments and the loaded project. A duplicate name or non-function `run` throws. `getCommand(name)` returns the command or `null`; `listCommands()` returns all entries; `resetCommands(name?)` removes one or all. Register commands inside the default plugin function, with `kirigami.type: "command"` in its manifest — or return them from the `HOOKS.COMMANDS_REGISTER` hook instead (see [Available hooks](#available-hooks)); kirigami-core routes hook entries through this same `registerCommand()`, so both styles share the same validation. Entries have `{ name, description, run }`; descriptions default to an empty string, and listing preserves registration order. Returned entries are the stored mutable objects. The registry does not execute commands or validate their arguments.

### Task-type registry

`registerTaskType(name, definition)` lets a normal plugin provide a type used
by entries in `kirigami.yaml`'s `tasks:` list. Register it inside the plugin's
default registration function; project reload clears and rebuilds the task
registry together with hooks and commands.

```js
import { registerTaskType } from '@kirigami/sdk';

export default function register() {
	registerTaskType('manifest', {
		taskname: 'Generate manifest',
		canbuild: true,
		canwatch: false,
		validate(root, task) {
			if (!task.output) throw new Error('manifest tasks require output');
		},
		async run(root, task, exportPath) {
			// Generate task.output and return the standard task result shape.
			return { success: true, files: [task.output] };
		},
	});
}
```

The definition requires `run(root, task, exportPath?)`. `taskname` defaults to
the registered name; `canbuild` and `canwatch` default to `false`.
`validate(root, task)` is optional and may be asynchronous. A watchable type
must set `canwatch: true` and provide `getWatcher(root, task)`, returning the
same rule shape used by Kirigami's watch engine. Built-in task names take
precedence and cannot be overridden.

`getTaskType(name)` returns one definition or `null`; `listTaskTypes()` keeps
registration order; `resetTaskTypes(name?)` removes one or all definitions.
Duplicate names and definitions without a callable `run` are rejected.

### `on(hookName, fn)`

Registers a listener. Returns a function to unregister it (equivalent to
calling `off(hookName, fn)`). The same function object is registered only
once per hook; separate closures are separate listeners.

### `off(hookName, fn)`

Unregisters a listener previously added with `on()`.

### `run(hookName, ...args)`

Runs every listener registered for a hook, in registration order, and
flattens their results **one level** into a single array. Top-level
`null`/`undefined` results are skipped; nested arrays and nulls inside returned
arrays are preserved. A thrown error or rejected promise stops dispatch and
rejects `run()`; the same failure rule applies to `runWaterfall()`. Used internally by
kirigami-core — a plugin normally doesn't need to call `run()` itself.

### `runWaterfall(hookName, value, ...args)`

Pipes `value` through every listener in registration order: each receives
`(value, ...args)` and, unless it returns `null`/`undefined`, its return value
becomes the input for the next. The shape kirigami-core uses for hooks that
transform a single artefact (`prepros:html`) rather than collect contributions.

### `has(hookName)`

`true` when at least one listener is registered for a hook — lets a task skip
setup work when nothing hooks in.

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
const cache = new Cache(path.join(process.cwd(), '.my-plugin.db'));

cache.set('meta_home', { hello: 'world' }, 3600); // 1h TTL, in seconds (0 = never expires)
cache.get('meta_home'); // { hello: 'world' }, or null if missing/expired
cache.del('meta_home');
cache.purge();          // deletes all expired entries
cache.purge('meta_*');  // deletes every "meta_" entry, expired or not
cache.close();          // closes the underlying SQLite connection
```

`new Cache()` with no argument uses `.node.db` in the current working
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

Values round-trip through `JSON.stringify`/`JSON.parse`: use JSON-compatible
data. Dates, class instances, and Buffers lose their original type; circular
values and BigInt throw. Stored `null`, missing entries, expired entries, and
unparseable stored JSON all read as `null`.

Construction performs no I/O; the first operation opens the database. Create
its parent directory yourself. The table is initialized only for a new file,
so do not point it at an existing empty file or unrelated database. Calls are
synchronous; SQLite errors propagate. `del()` returns whether a row existed.
TTL uses whole seconds: an entry remains readable at its expiry second and
expires after it. Reads do not delete expired rows; `purge()` does. Use `0`
or a positive TTL; negative values are not validated and are not swept by
`purge()`.

---

## TypeScript declarations

The shipped `index.d.ts` covers hooks, reset, `Cache`, and the command registry.
`Command<TProject, TResult>` describes the host project and command result
without importing the core package into the SDK. They default to `unknown`;
provide your host type when registering or retrieving a typed command.
Registration and lookup do not perform runtime type validation of the host.

---

## Requirements

- Node.js `>= 24.0.0`
- npm `>= 10.2.3`
- ESM only (`"type": "module"`)

---

## License

GPL-3.0-or-later © Maxime Larrivée-Roy, 2026
