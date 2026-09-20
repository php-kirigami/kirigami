# VS Code extension

The extension scaffold lives in [packages/vscode](../packages/vscode/README.md). Its package name is `kirigami-vscode` and its extension identity is `php-kirigami.kirigami-vscode`. It consumes the core `Project` API directly in the extension process; it does not invoke the CLI or connect through MCP.

## Implemented

- Five commands: Build, Export, Run Script, Validate Configuration, and Toggle Dev Server.
- A Kirigami Output channel and command notifications.
- A status bar showing idle, running, building, and error states.
- A preview choice between Simple Browser and the external browser.
- A configuration watcher that calls reload.
- `Project.serve({ onBuildResult })` callbacks for watch-triggered build state.

The extension compiles to CommonJS; core runtime source remains ESM. It binds to the first workspace folder. Neither multiple projects in one process nor multi-root workspaces are supported by the core’s current working-directory/global-registry model.

## Verified state and blockers

Compilation succeeds. A Node activation test with a stub `vscode` module fails because the bundled core resolves `../kirigami.schema.json` relative to the extension output. The import-meta shim also changes other module-relative resource paths. Core modules capture the working directory before activation calls `process.chdir()`. Fix resource loading and project-root ownership before treating activation as working (audit A08).

A real Extension Development Host run has not been completed. The manifest’s editor range does not guarantee its embedded Node supports `node:sqlite` and JSPI. An external Node installation does not change the extension host’s Node.

Run Script currently ignores a structured `success: false` result (A14). Core reload also leaves PHP configuration/runtime state cached (A06), so the configuration watcher cannot guarantee fresh PHP output. Watch callbacks that throw can bypass the final build-state notification (A13).

## Development and verification

From the monorepo root, install workspace dependencies and compile:

```bash
npm install
npm run compile -w kirigami-vscode
code packages/vscode
```

Open `packages/vscode` as the workspace root so its launch/tasks configuration resolves correctly. Press F5, then open a disposable Kirigami site in the development host. Verify activation and runtime capabilities first, then all five commands, build failures, configuration changes, start/stop, browser preview, and deactivation cleanup.

Build before starting preview: `serve()` does not perform an initial build. Export into a dedicated destination separate from source files; the current core lacks overlap protection.

## Remaining work

1. Fix schema/task/runtime resource resolution in the bundled extension.
2. Establish an explicit project root without relying on a late process-wide directory change.
3. Propagate structured operation failures and guarantee build-state completion on errors.
4. Complete the real-host validation above.
5. Add and verify VSIX packaging, including runtime assets and dependency licenses. The npm release script currently scans this non-private workspace too; a separate extension release path is not implemented.
6. Consider diagnostics, tasks integration, multi-root support, and optional MCP registration after the existing commands are reliable.

See [DECISIONS.md](DECISIONS.md), [TODO.md](TODO.md), and [the audit](AUDIT-2026-09-20.md) for rationale and reproductions.
