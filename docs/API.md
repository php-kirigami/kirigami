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
| `validate()` | `Promise<true>` | Validate `kirigami.yaml` on disk; reject invalid input. Does not reload plugins or PHP, and does not replace a loaded project's configuration — call `reload()` to apply a change. |
| `config` | object or `null` | Resolved configuration; null before loading. |
| `plugins` | array of `{ name, version }` | Activated plugins; version may be null. |
| `tasks` | array | Configured tasks, with implicit forced `render-all` when prepros is enabled. |
| `scripts` | array of `{ name, mount, trigger }` | Sorted `scripts/*.php` files with optional configuration metadata (trigger defaults to null), plus any plugin-registered script (see below) not shadowed by a project file of the same name. |

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

Active plugins may also inject actual task entries through `@kirigami/sdk`'s
`tasks:register` hook — shaped exactly like a kirigami.yaml `tasks:` entry
(`{ name, type, ... }`), most often of a type the same plugin registers.
Reload appends these once, right after plugins load and before strict task
validation, onto the project's own `tasks:` list, so a project doesn't need
its own `tasks:` entry for a plugin's task to run; `tasks`/`config.tasks`,
`build()`, `export()`, `runTask()`, and watch all see the merged list. Task
names must be unique across the merged list: a duplicate, including a plugin
task named like a kirigami.yaml task, is rejected as a configuration error.

Active plugins may also register a PHP script through `@kirigami/sdk`'s
`scripts:register` hook — an absolute path to their own `.php` file, a `name`
runnable via `run()`/`kiri run`, and an optional `trigger` that fires it
automatically at a build/export checkpoint, exactly like a kirigami.yaml
`scripts:` entry. A project's own `scripts/<name>.php` always takes
precedence over a plugin registering the same name.

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

## Project scaffolding

Creating a project from an official template needs no loaded project and no `kirigami.yaml`. These functions are exported from the root and from `@kirigami/kirigami/create`, which skips loading the engine (no PHP runtime). `kiri create`, the VS Code *Create Project* command, and the MCP `kirigami_create_project` tool all call them. None of them prompts, prints, or exits.

```js
import { listTemplates, createProject, installDependencies } from '@kirigami/kirigami/create';

const templates = await listTemplates();            // [{ template: 'default', description, … }]
const result = await createProject({
  template: 'default',                              // name, "template-default", or a listTemplates() entry
  target: 'my-site',                                // created if missing
  meta: { name: 'My Site', baseurl: 'https://me.github.io' },
  git: true,
});
if (!result.success) throw new Error(result.error);
await installDependencies(result.target);           // { success, code, error? }
```

| Function | Result | Behavior |
|---|---|---|
| `listTemplates({ refresh })` | `Promise<TemplateInfo[]>` | `php-kirigami/template-*` repositories, sorted, with `template` (the short name). Cached for 1 h in `~/.config/kirigami/kiri.db`; rejects when GitHub is unreachable and nothing is cached. |
| `findTemplate(name)` | entry or `null` | Accepts `blog` or `template-blog`. |
| `inspectTarget(dir)` | `{ target, exists, hasPackageJson, hasConfig, entries }` | What the target already holds, ignoring local caches and the lockfile. |
| `gitUserConfig()` | `{ name, email }` | Author defaults from git configuration (empty strings when unset). |
| `resolveMeta(dir, meta)` | metadata with `slug` | Defaults: name from the directory name, repo derived from a `*.github.io` base URL. |
| `canInitGit(dir)` | `{ ok }` or `{ ok: false, reason }` | `reason` is `git-missing` or `inside-worktree`; lets an interface skip a moot question. |
| `createProject(options)` | `{ success: true, … }` or `{ success: false, error }` | Downloads, extracts, writes metadata, starter `package.json`/`banner.txt`/`.mcp.json`/`.github/workflows/page.yml`/`.vscode/settings.json` when missing, then optional git init + first commit. |
| `installDependencies(dir, { stdio })` | `{ success, code, error? }` | Runs `npm install` (no shell). `stdio` defaults to `"inherit"`; a stdio-bound caller such as an MCP server must keep npm off stdout, for example `["ignore", 2, 2]`. |

`createProject` options: `template`, `target` (default: working directory), `meta` (`name`, `description`, `author`, `email`, `baseurl`, `repo`; empty fields keep the template's values), `git` (default `true`), `cliVersion` (the `@kirigami/cli` version written as a caret range in a starter `package.json`; by default the npm registry's current version, or the `latest` dist-tag when the registry is unreachable), and `onProgress({ step: 'download', url })`. The success result reports `template`, `target`, `archive`, resolved `meta`, `written`/`skipped` counts, `merged`, `packageJson` (`starter`, `template`, `merged` or `existing`), the `changed` keys, `banner`, `starterFiles` (the tooling files written), and `git` (`{ initialised, committed, skipped?, error? }`). Unknown templates and download failures are structured failures. A failed git commit is reported in `git` and does not fail the result.

Extraction never overwrites. Existing files are kept, and an existing `package.json` is deep-merged with its own values winning. `.cache.db`, `.node.db`, `.cookie.txt` and `package-lock.json` are never copied. GitHub is queried anonymously (60 requests per hour per IP) unless `GITHUB_TOKEN` or `GH_TOKEN` is set. The token is only sent to `api.github.com`.

## Related package APIs

| Need | Reference |
|---|---|
| Hook registration, waterfalls, commands, SQLite cache | [SDK](../packages/sdk/README.md) |
| Direct PHP rendering and PHP helper classes | [PHP-prepros](../packages/php-prepros/README.md) |
| Owned/shared WASM runtimes, execution, ini helpers | [PHP-WASM](../packages/php-wasm/README.md) |
| MCP tools and server creation | [MCP](../packages/mcp/README.md) |
| CLI flags and scaffolding | [CLI](../packages/cli/README.md) |
