# VS Code extension

The extension scaffold lives in [packages/vscode](../packages/vscode/README.md). Its package name is `kirigami-vscode` and its extension identity is `php-kirigami.kirigami-vscode`. It consumes the core `Project` API in a dedicated external Node process; it does not invoke the CLI or connect through MCP.

## Implemented

- Six commands: Create Project, Build, Export, Run Script, Validate Configuration, and Toggle Dev Server. Create is registered in any trusted window: a native wizard (template quick pick, metadata input boxes, git / npm install options) that calls core's `@kirigami/kirigami/create` in a short-lived external-Node worker with the chosen folder as its cwd, then opens the created project (same window when none is open, a new window otherwise, or a reload when it is the current folder). The project commands are hidden from the palette until a project is loaded (`kirigami.projectLoaded` context key), and the engine only starts when the folder contains `kirigami.yaml`.
- A Kirigami Output channel and command notifications.
- A status bar showing idle, running, building, and error states.
- A preview choice between Simple Browser and the external browser.
- A configuration watcher that calls reload.
- `Project.serve({ onBuildResult })` callbacks for watch-triggered build state.

The extension compiles to CommonJS; core runtime source remains ESM. It binds to the first workspace folder. Neither multiple projects in one process nor multi-root workspaces are supported by the core’s current working-directory/global-registry model.

## Verified state and blockers

A08 resource resolution and working-directory capture are fixed. Compilation stages the core and its dependency tree under `dist/runtime/node_modules`, preserving ESM modules, schemas, task modules, PHP/WASM assets, and dependency licenses. A child process starts with the project directory before importing core; the extension host never changes its working directory.

A relocated stub-host integration test passes all five commands, PHP rendering, config reload, and server cleanup without workspace dependencies. The real-host smoke test passes on Windows with VS Code 1.138.0 (host Node 24.18.1, external Node 26.8.2): activation, validate/build/export, the empty-script path, and server start/stop. Older editors, visual state transitions, browser preview, and real-host config watching remain unverified. Configure `kirigami.nodePath` to an external Node 24+ executable with JSPI; embedded-host SQLite/JSPI support is no longer required.

Run Script reports structured failures in an error notification and logs the returned diagnostics (A14 fixed); only `success: true` produces a success notification. Core reload now invalidates PHP configuration/runtime and plugin includes (A06 fixed), inside the worker. Real-host configuration watcher behavior still needs verification. A13 is fixed: thrown watch callbacks now produce a failed final build notification; observer rejections are contained by the scheduler.

## Development and verification

From the monorepo root, install workspace dependencies and compile:

```bash
npm install
npm run compile -w kirigami-vscode
code packages/vscode
```

Open `packages/vscode` as the workspace root so its launch/tasks configuration resolves correctly. Press F5, then open a disposable Kirigami site in the development host. Verify build failures, configuration changes, script selection, status transitions, browser preview, and deactivation cleanup.

Preview runs an initial build before starting its server and reports failures in the Output channel. Export requires a dedicated destination separate from source files; the core rejects overlapping paths before running export triggers.

Automated checks from the repository root:

```powershell
npm run compile --workspace=kirigami-vscode
node --test --test-isolation=none packages/vscode/test/activation.test.cjs
& packages/vscode/test/run-host.ps1
```

The Windows host runner uses an isolated temporary profile and site, and retains logs for inspection. Pass `-ExtensionPath <unzipped VSIX>/extension` to test a packaged VSIX instead of the development folder. Runtime staging reflects dependencies installed for the build platform, including native binaries (esbuild, @parcel/watcher), so each VSIX is platform-specific; recompile after core/worker changes, including when using watch mode.

Packaging (no publish): from `packages/vscode`, run `npx @vscode/vsce package --no-dependencies --target win32-x64`. The win32-x64 VSIX was built and passed the real-host test on 2026-09-22; see [RELEASE-PLAN.md](RELEASE-PLAN.md#4-vsix-facts-checked-2026-09-22-win32-x64) for its size, licenses, and path lengths. Other targets have not been built.

## Remaining work

1. Complete the real-host validation above.
2. Build and test the VSIX for the other target platforms, and consider a generated third-party notices file.
3. Consider diagnostics, tasks integration, multi-root support, and optional MCP registration after the existing commands are reliable.

See [DECISIONS.md](DECISIONS.md), [TODO.md](TODO.md), and [the audit](AUDIT-2026-09-20.md) for rationale and reproductions.
