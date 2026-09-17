# VS Code extension

Design notes for the Kirigami VS Code extension — a GUI face over
`@kirigami/kirigami`'s `Project` API, the same one `@kirigami/cli` (terminal)
and `@kirigami/mcp` (AI agent) already wrap. The v1 scope below is now
scaffolded in `packages/vscode` (see [STATUS.md](STATUS.md) for what
shipped and [DECISIONS.md](DECISIONS.md) for the implementation-level
decisions that came up building it) — this file stays as the design
record rather than being folded into the package's own README. See
[ROADMAP.md](ROADMAP.md) for where this sits among other unscheduled ideas,
and [DECISIONS.md](DECISIONS.md) for why this is a third "face" rather than
routing through `@kirigami/mcp`.

## Why a direct `Project` consumer, not MCP

The extension runs in the same Node.js extension host process as any other
VS Code extension code. It imports `@kirigami/kirigami` and calls
`Project.load()/.build()/.export()/.run()/.serve()/...` in-process — exactly
like `@kirigami/cli` does. Going through `@kirigami/mcp`'s stdio server to
talk to itself would be a pointless subprocess + JSON-RPC detour for an API
that's already one `import` away.

(`@kirigami/mcp` remains relevant to VS Code in a different way: VS Code
supports extensions registering MCP servers for Copilot Chat / agent mode.
The extension could *additionally* register `@kirigami/mcp` so in-editor AI
chat gets Kirigami tools too — a bonus wiring, not this extension's primary
mechanism.)

## Packaging

Proposed: a new workspace package, `packages/vscode` (npm name TBD —
possibly `@kirigami/vscode` for monorepo consistency, though the extension
manifest's own `name`/`publisher` fields, which live in the same
`package.json` per VS Code convention, are a separate concern from the npm
scope). Depends on `@kirigami/kirigami` like `@kirigami/cli` does.

Not resolved yet: how it ships. VS Code extensions package via `vsce`
into a `.vsix` and publish to the Marketplace (and/or Open VSX) — a
different pipeline from `npm run release`'s `packages/*` publish loop.
`docs/INSTRUCTIONS.md`'s workflow already has a placeholder for this
("(Future: pack the VS Code extension + publish.)" at step 11) — needs
fleshing out once this package exists.

## Scope for v1

### Commands (Command Palette)

Mirror `@kirigami/cli`'s one-shot commands, wired to the same `Project`
methods: build, export, run (prompts for a script name — see
`kirigami_list_scripts` in `@kirigami/mcp` for the same discoverability
need), validate. `create`/`install`/`cache`/`phpinfo` are CLI-only
concerns per `docs/CONTEXT.md`'s packages table — not natural `Project`
methods, so lower priority here; scope them later if useful for a GUI
workflow (e.g. `create` as a "New Kirigami Project" command).

### Status bar item

Bottom-right (VS Code's right-aligned status bar area), one item, toggles
the dev server:

- **Click when not running** → calls `Project.serve()` (already returns
  `{ address, port, url, close() }` — its own docblock in
  `packages/kirigami/index.js` already anticipated this exact consumer).
  Once it resolves, show a `QuickPick`: **"Open in VS Code" (Simple
  Browser, `simpleBrowser.show` built-in command, pointed at `url`)** or
  **"Open in external browser"** (`vscode.env.openExternal(Uri.parse(url))`).
  Asked every time (decided over remembering a setting or splitting into
  two buttons) — explicit and no extra config surface to maintain.
  No extra refresh wiring needed on the extension side either way:
  `kiri serve`'s dev server already does its own hot-reload via
  Server-Sent Events (`docs/template-CLAUDE.md`'s CLI table — "browser
  hot-reload" is already the server's job, not the client's).
- **Click when running** → stops it (`close()` from the `serve()` result).

### Status indicator states

The same status bar item reflects what the server is doing, not just
whether it's on:

| State | Meaning | Look (proposed) |
|---|---|---|
| Idle / not running | No `serve()` call active | Plain icon, default colors |
| Running | Server up, no build in flight | Solid icon (e.g. `$(radio-tower)`), default colors, tooltip shows the URL |
| Building | A watch-triggered rebuild is in progress | Spinner (`$(sync~spin)`), default colors |
| Error | The last rebuild failed | Error icon (`$(error)`), `statusBarItem.errorBackground` |

**Not there yet, needs a small `Project`-level addition**: `serve()`'s
watchers already run a callback per file-change batch
(`buildWatchRules`/`createWatchers` in `packages/kirigami/bin/libs/
watchengine.js`), but today that result only reaches a `console.log`
(`packages/kirigami/bin/tasks/prepros.js`'s watch callback calls
`log.step()`/`printTaskError()` directly and returns nothing) — there is
currently no programmatic success/failure signal for an external caller
to read. `Project.serve()` needs to expose one (an `onBuildResult`
callback in its options, or an `EventEmitter` on the returned handle) so
the extension reflects real state instead of re-parsing console output.
Once that exists, the extension's job is just to reflect it in the status
bar item, not to reimplement watching.

### Config reload

A file watcher on `kirigami.yaml` (workspace-root level, separate from
`serve()`'s own build-triggering watchers) calls `Project.reload()` when
it changes, so the extension's in-memory `Project` instance — and
whatever it's showing (status bar, commands) — stays in sync with the
file on disk without the user restarting anything. `reload()`'s own
docblock (`packages/kirigami/index.js`) already anticipates this: "safe
to call again after the file ... changed on disk."

Scoped to `kirigami.yaml` only for v1. `reload()` also re-reads installed
plugins ("or an installed plugin changed on disk" per its docblock) —
watching `node_modules` for plugin install/removal to trigger the same
reload is a natural extension of this, but not scoped yet.

(Separately, `Project.validate()` — cheaper, config-only, no plugin
reload — has a docblock literally anticipating "every keystroke in a VS
Code editor": a candidate for live-validating `kirigami.yaml` as the user
types, e.g. surfacing errors via a `Diagnostic`. Related to the Problems
panel open question below, not decided yet.)

## Open questions

- Multi-root workspaces: which folder's `kirigami.yaml` does the status
  bar item target when more than one is open? (`@kirigami/kirigami`'s
  `Project` is bound to `process.cwd()`, single-project per instance —
  see its own docblock's "not supported yet" note.)
- Where does a crashed build's actual error surface beyond the status bar
  tooltip — an Output channel? The Problems panel (would need mapping a
  PHP/task error to a `Diagnostic` with a real file/line)?
- Extension activation: onStartup if a `kirigami.yaml` is present at the
  workspace root, vs. a manual "Kirigami: Enable" command?
- Should the `node_modules` plugin-install watch mentioned above (Config
  reload) be in scope for v1, or deferred alongside `create`/`install`?