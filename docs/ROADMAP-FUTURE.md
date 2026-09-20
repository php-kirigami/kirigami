# Future roadmap

This document captures the medium- and long-term direction of Kirigami beyond the current scaffold and early stabilization work. It complements the repo-level planning and should be read alongside `docs/STATUS.md`, `docs/TODO.md`, `docs/ROADMAP.md`, and `docs/DECISIONS.md`.

## Implemented baseline

The `Project` API, CLI wrappers, eight MCP tools, build/watch batching, serve handles, build-result callbacks, and VS Code command/status-bar scaffold already exist. The items below are stabilization goals, not a claim that these features are absent. See [STATUS.md](STATUS.md) for implementation history and [BUGS.md](BUGS.md) for reproduced defects.

## Purpose

Kirigami is meant to become a reliable static site generator for PHP templates, compiling them into dependency-free static HTML and running PHP in WebAssembly inside Node.js. The long-term objective is not only a working CLI, but a coherent ecosystem around a single `Project` API.

## Core strategy

### 1. Stabilize the `Project` API
The `Project` object is the canonical integration point for the whole monorepo. All wrappers should sit on top of it rather than reimplementing logic.

Remaining work / stabilization:
- finalize configuration loading and validation
- define lifecycle semantics for load, reload, build, export, and serve
- complete failure propagation in existing build-state notifications
- document supported project layout and multi-root behaviour
- keep the abstraction stable across CLI, MCP, and VS Code

Success criteria:
- the same project can be built and served consistently through different interfaces
- external callers can observe success/error without parsing terminal output

### 2. Make the build pipeline dependable
Kirigami needs a reproducible and debuggable build path before it is production-ready.

Planned work:
- regression coverage for the existing template compilation pipeline
- correct add/delete handling and async error propagation in the existing watcher
- safe export paths, private-file exclusions, and reproducible asset generation
- structured error reporting with file and line metadata where possible
- explicit bridge between rebuild progress and UI consumers

Success criteria:
- repeated builds remain deterministic
- failures are actionable
- local development feels stable and understandable

### 3. Finish the serve and export story
The runtime experience matters as much as compilation.

Planned work:
- harden the existing `serve()` address/shutdown lifecycle and error handling
- export static HTML and assets for deployment
- expose enough state for editors and tools to reflect what is running
- separate local developer workflows from production export workflows

Success criteria:
- `serve()` returns a usable handle
- deployable output is reproducible
- the dev server does not hide build failures

## Ecosystem integration

### 4. CLI parity
The CLI should remain a thin wrapper over the same `Project` API as the rest of the system.

Planned work:
- parity for build, export, validate, serve, and script discovery
- stable exit codes and user-facing output
- clear command UX for project setup and execution
- keep shell usage aligned with core library semantics

Success criteria:
- the CLI and library behave consistently
- users do not need to understand internal implementation details

### 5. MCP server
The MCP layer is meant to expose project capabilities to AI and agent workflows without duplicating the core implementation.

Planned work:
- discover available scripts and templates
- validate config and project state
- preserve parity of existing build/export/run tools with `Project`
- expose diagnostics in a structured, tool-friendly way

Success criteria:
- agents can discover and invoke supported actions via tools
- tool behavior mirrors the same project model as CLI and editor integrations

### 6. VS Code extension
The extension should consume `@kirigami/kirigami` directly instead of re-implementing workflows through subprocesses.

Planned work:
- validate the implemented status bar in a real Extension Host
- fix activation paths and validate the five implemented palette actions
- watch project config changes and reload safely
- show build failures in editor-facing diagnostics where possible
- optional MCP registration for in-editor agent usage

Success criteria:
- VS Code reflects real project state rather than console-only output
- extension actions call the canonical `Project` API

## Operational maturity

### 7. Release and packaging workflow
Eventually the repo should support predictable publishing across packages with clear boundaries.

Planned work:
- clarify package versioning
- define release checks for monorepo packages
- document the VS Code packaging flow separately from npm publishing
- validate workspace scripts and package metadata before release

Success criteria:
- each package has a clear and documented release path
- no package is published with stale metadata or hidden assumptions

### 8. Documentation debt
Documentation must stay current as the project evolves.

Planned work:
- keep `docs/*.md` topic-driven and current
- maintain `STATUS.md` as a log of completed work, explicitly distinguishing unpublished changes from releases
- update `DECISIONS.md` when a durable architectural choice is made
- keep `TODO.md` small and actionable
- clear stale documentation via `DOCTODO.md`

Success criteria:
- onboarding is straightforward
- contributors can tell what is implemented, what is pending, and why decisions were made

## Recommended first slice

The immediate priority is to make the implemented core reliable: export safety, configuration freshness, watcher correctness, and extension activation.

Recommended order:
1. finish the `Project` lifecycle and config loading
2. make build/watch/serve semantics reliable
3. repair CLI creation/installation after the API split
4. verify structured failures and watch notifications across interfaces
5. validate the extension against the same contract in the real host
6. extend MCP and AI/editor workflows after that

This sequence keeps the architecture coherent and avoids creating three disconnected implementations.

## Long-term vision

The end state is a single dependable generation engine with multiple delivery surfaces:
- terminal users via `@kirigami/cli`
- AI/agent users via `@kirigami/mcp`
- editor users via `kirigami-vscode`

The goal is not three separate products. It is one project engine with multiple interfaces, all powered by the same underlying `Project` abstraction.