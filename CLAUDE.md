# CLAUDE.md

Entry point for working in this repo. Kept short on purpose — detailed,
evolving material lives in `docs/`, split by topic:

| File | What's in it |
|---|---|
| [docs/CONTEXT.md](docs/CONTEXT.md) | What Kirigami is, monorepo/sibling-repo layout, packages table, licensing, code conventions |
| [docs/INSTRUCTIONS.md](docs/INSTRUCTIONS.md) | The dev workflow, releasing procedure, README template |
| [docs/STATUS.md](docs/STATUS.md) | Running log of what's shipped recently |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architectural decisions and the reasoning behind them |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Future feature ideas, not yet scheduled |
| [docs/BUGS.md](docs/BUGS.md) | Known open issues / questions needing a decision |
| [docs/TODO.md](docs/TODO.md) | Small, concrete, near-term action items |
| [docs/DOCTODO.md](docs/DOCTODO.md) | Documentation debt — pending doc updates code changes left behind |
| [docs/EXTENSION-VSCODE.md](docs/EXTENSION-VSCODE.md) | VS Code extension implementation, limitations, and remaining work |
| [docs/UPDATE.md](docs/UPDATE.md) | Procedures for updating repository Markdown and the MCP doc-search index |

`docs/template-CLAUDE.md` is a different thing entirely — it's the
`CLAUDE.md` template copied verbatim into every `../template-*/` sibling
repo and the org site (end-user Kirigami *sites*, not this monorepo). See
[docs/CONTEXT.md](docs/CONTEXT.md) for the fan-out rule.

## What Kirigami is (one line)

A static site generator that compiles PHP page templates into
dependency-free static HTML, running PHP entirely in WebAssembly inside
Node.js — full detail in [docs/CONTEXT.md](docs/CONTEXT.md).

## Non-negotiable conventions

- **English everywhere in the repo**: code, comments, READMEs, `docs/*.md`.
  Commit messages and changes to the legacy `assets/kiri/` tree are English too.
  **Conversations with the user are in French.** This preference applies
  across all projects and supersedes the previous French-content exceptions.
- **ESM source** — runtime packages use `"type": "module"`; the VS Code extension bundles to CommonJS.
- **Node `>=24.0.0`** for every package.
- **Stay lite** — minimise dependencies, no native deps; check for a
  `node:` builtin or ~30 lines of code before adding a lib.
- **Dev machine is Windows** (PowerShell primary) — watch path separators.

Full detail and rationale for each of these: [docs/CONTEXT.md](docs/CONTEXT.md).

## Before you start non-trivial work

1. Check [docs/STATUS.md](docs/STATUS.md) for what's already in flight.
2. Check [docs/DECISIONS.md](docs/DECISIONS.md) so you don't re-litigate a
   settled question.
3. When you finish something durable, log it in `docs/STATUS.md` (what
   shipped), `docs/DECISIONS.md` (a non-obvious "why"), `docs/TODO.md` /
   `docs/ROADMAP.md` (what's still open), or `docs/DOCTODO.md` (docs it left
   stale) — whichever fits, per step 3 of the workflow in
   [docs/INSTRUCTIONS.md](docs/INSTRUCTIONS.md).
