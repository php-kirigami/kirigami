# Project API reference

This reference covers the public root exports of `@kirigami/kirigami`, verified against [index.js](../packages/kirigami/index.js). It complements [the execution model](INTERNALS.md). Package `internal/*` exports expose implementation modules; prefer `Project` for integrations.

## Loading and lifecycle

```js
import { load, Kirigami, Project } from '@kirigami/kirigami';

const project = await load();
// Equivalent factory: await Kirigami.load().
// Manual construction: new Project(), then await project.reload().
```

Launch Node from the directory containing `kirigami.yaml` before importing core. `load()` takes no project-directory argument. One project per process is supported. The API uses ESM and Node 24+ and ships TypeScript declarations for its public entry point.

| Member | Result | Behavior |
|---|---|---|
| `load()` / `Kirigami.load()` | `Promise<Project>` | Construct and reload a project. |
| `new Project()` | `Project` | Construct unloaded; operational methods load lazily. |
| `reload()` | `Promise<Project>` | Refresh configuration/plugins and invalidate PHP runtime/includes. |
| `validate()` | `Promise<true>` | Refresh/validate core configuration; reject invalid input. Does not reload plugins or PHP. |
| `config` | object or `null` | Resolved configuration; null before loading. |
| `plugins` | array of `{ name, version }` | Activated plugins; version may be null. |
| `tasks` | array | Configured tasks, with implicit forced `render-all` when prepros is enabled. |
| `scripts` | array of `{ name, mount, trigger }` | Sorted `scripts/*.php` files with optional configuration metadata; trigger defaults to null. |

Getters do not return immutable snapshots. Treat their values as read-only. `tasks` does not include export's synthetic copy task. Call `reload()` after editing configuration; close/recreate watch handles if their rules must change. Restart for changes to imported JavaScript plugin code.

## Build, export, tasks, and scripts

| Method | Options | Return shape |
|---|---|---|
| `build()` | none | `{ success, trigger, results }` |
| `export({ path } = {})` | Optional destination override; otherwise configured path or `dist` | `{ success, dist, beforeExport, beforeBuild, afterExport, results, error? }` |
| `runTask(name)` | Exact name from `tasks` | Task result with `task`, `type`, `taskname`; unknown name returns `{ success: false, error }` |
| `run(command, argv = [])` | Script basename without `.php`, array of arguments | Script result, including a `files` array |

Build `trigger` is `{ success, results }` for `before-build`; each trigger result has the script name and its returned fields. Export trigger fields are null when that stage has not run. A task result normally includes `success` and may include `files`, `error`, `warnings`, `stderr`, or `debug`; payloads vary by task, so do not assume every optional field exists.

`runTask()` forces the named task and bypasses build triggers. `run()` executes `scripts/<command>.php`, including scripts without a YAML entry; YAML entries add mount/trigger metadata. A missing script throws. These methods run project code and are not a sandbox API for untrusted projects.

Active plugins may register additional task types through `@kirigami/sdk`.
They use the same validation, build, export, `runTask()`, and watch paths as
built-in tasks. Reload rebuilds the task-type registry before strict task
validation; a configured type with no active registration is rejected.

Export resolves its destination relative to the process working directory, not `kirigami.root`. The source and destination must be separate trees, including canonical symlink/junction paths. The destination is cleared by the copy task. The path override also updates the loaded configuration's export path. Work is not rolled back after failure.

## Errors and sequencing

Check both rejected promises and structured failures:

```js
import { load } from '@kirigami/kirigami';

try {
  const project = await load();
  const result = await project.build();
  if (!result.success) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  }
} catch (error) {
  // Some existing paths throw strings rather than Error instances.
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
```

A successful result may contain warnings. A failed result can contain files produced before the failure. Do not reduce failures to `result.error`: build failures often live in `results` or trigger results. Core methods do not call `process.exit()`, but underlying tasks may log to the console.

Await operations sequentially. There is no whole-project operation queue; `Promise.all([project.build(), project.reload()])` is unsupported. The PHP queue protects only PHP operations.

## Watching and serving

`watch({ initialBuild = true } = {})` returns `Promise<{ close() }>` after watcher readiness. `serve({ port = 4321, host = '127.0.0.1', onBuildResult, initialBuild = true } = {})` returns `Promise<{ address, port, url, close() }>` after server/watch startup. Use `port: 0` to request an available port and read the actual URL from the handle.

Both methods await a complete initial build before allocating server/watch resources. Pass `initialBuild: false` if output is already current. Failure rejects with the build diagnostics in `error.result`. Always await `close()` when the owning application stops the session. There is no general `Project.dispose()` method.

```js
import { load } from '@kirigami/kirigami';

const project = await load();

const server = await project.serve({
  port: 0,
  onBuildResult(event) {
    if (event.status === 'done' && event.success === false) {
      console.error(event.error ?? event);
    }
  },
});
console.log(server.url);
// The embedding application retains server and calls await server.close()
// when its preview/session ends.
```

The callback is awaited. Initial-build events have `initial: true`, `rule: "initial-build"`, and `type: "build"`; the done event includes the full build result (nested tasks and triggers). Observer rejection during startup rejects startup. Events include `status: 'start' | 'done'`, `rule`, and `type`. Done events include the callback result fields when supplied, such as success/files/warnings/error. Do not assume `success` is always present. An observer exception can fail a rebuild notification; keep the observer lightweight and handle its own errors.

## Related package APIs

| Need | Reference |
|---|---|
| Hook registration, waterfalls, commands, SQLite cache | [SDK](../packages/sdk/README.md) |
| Direct PHP rendering and PHP helper classes | [PHP-prepros](../packages/php-prepros/README.md) |
| Owned/shared WASM runtimes, execution, ini helpers | [PHP-WASM](../packages/php-wasm/README.md) |
| MCP tools and server creation | [MCP](../packages/mcp/README.md) |
| CLI flags and scaffolding | [CLI](../packages/cli/README.md) |
