# Update procedure

This document records the repository workflow for keeping Markdown documentation accurate and for refreshing the MCP document-search index without drifting from the current source tree.

## Purpose

The repo uses a documentation-first workflow: source code changes must be mirrored by the relevant docs, and the MCP layer must help agents discover the right project files quickly.

This document covers two related processes:

- updating repository Markdown files so they reflect the current code and package layout
- keeping `@kirigami/mcp` document search fast and reliable without losing the search quality that agents need

## Documentation update workflow

### 1. Start from the source of truth

Before changing any Markdown, inspect the current implementation and package manifests.

Required checks:

- `CLAUDE.md` and `docs/` entry points for repo conventions
- the specific package or module being changed
- package manifests (`package.json`) and any README that acts as a user-facing contract
- relevant tests or build output that prove the behavior being documented

Do not document from memory alone when a code path or config changed.

### 2. Update only the files that are true to the current behavior

Keep documentation synchronized with the implementation.

Typical targets:

- `README.md` for high-level usage
- `docs/STATUS.md` for shipped work
- `docs/BUGS.md` for unresolved issues and open decisions
- `docs/TODO.md` for small near-term tasks
- `docs/ROADMAP.md` for future features
- `docs/DECISIONS.md` for non-obvious rationale or trade-offs
- `docs/DOCTODO.md` for documentation debt left behind by code changes

### 3. Keep the repository conventions

The repo is intentionally strict:

- English is the default language for repo content
- keep historical entries historical; do not rewrite old facts to make the timeline look neat
- do not bump package versions in a documentation pass
- do not announce a fix as if it were validated by a real host or real deployment unless that validation happened

### 4. Use the right document for the right kind of change

The repository distinguishes between implementation status, choices, and future work:

- `docs/STATUS.md`
  - record completed work and shipped behavior
  - include a short summary and validation notes
  - keep it factual and concise

- `docs/DECISIONS.md`
  - explain why a design choice exists
  - capture non-obvious trade-offs, technical constraints, and deliberate exclusions

- `docs/BUGS.md`
  - track open issues and unresolved questions only
  - fixed bugs move out of here and into status/decision docs instead

- `docs/TODO.md`
  - list small, concrete, near-term action items
  - not a backlog of long-horizon ideas

- `docs/DOCTODO.md`
  - note stale or missing documentation that still needs attention

- `docs/ROADMAP.md`
  - track future ideas that are not scheduled yet

### 5. Keep validation notes explicit

When a documentation entry describes a fix, call out what was actually verified.

Good examples:

- targeted Node smoke test passed
- package loads without syntax error
- docs were reviewed for consistency against the current source tree
- runtime check was performed with the repo's local tools, not with a real host that was not available

Avoid claiming end-to-end validation when the check did not run in the real environment.

### 6. Commit without polluting the branch

Only commit the files related to the task being shipped.

Do not include unrelated workspace edits. If the repository already has other modified files, keep them out of the patch unless they are genuinely required for the change being made.

Recommended pattern:

- update only the relevant Markdown and code files
- stage only those files
- commit with a focused message
- leave unrelated, pre-existing work alone

## MCP document search update workflow

The `@kirigami/mcp` document-search helper is designed to help an agent discover the project without reading every file from scratch.

### Goal

`kirigami_search_docs` should:

- search the repository docs quickly
- return useful excerpts
- refresh when files change
- avoid repeatedly doing a full scan of all Markdown files on every tool call

### Implementation pattern

The current implementation uses a cached, lightweight index stored under:

- `.kirigami/mcp-doc-index.json`

The index is created by reading the project tree, collecting Markdown files, and storing a compact summary for each file.

Each indexed file contains enough information to rank and excerpt matches without re-reading the entire raw file every time.

### Index build procedure

1. Resolve the project root.
2. Collect candidate documentation files.
3. Deduplicate paths to avoid double counting.
4. Skip irrelevant directories such as `.git`, `node_modules`, and the generated cache directory.
5. Read each file as UTF-8.
6. Normalize line endings.
7. Lowercase the text for matching.
8. Tokenize the content into word-ish tokens (`[\w-]{2,}` pattern).
9. Build a token frequency map for ranking.
10. Store a short excerpt and the file path.
11. Write the JSON index to `.kirigami/mcp-doc-index.json`.

### Refresh procedure

The cache must not be stale forever.

The repo uses a simple mtime-based refresh strategy:

- load the cached index if it exists
- compare the cached file list and each file's modification time
- rebuild the index when a file is missing, new, or newer than the cache snapshot

This keeps it cheap while making the tool adaptive to local edits.

### Search procedure

The tool path is:

- `loadDocIndex(projectDir)`
- `buildDocIndex(projectDir, ...)`
- `searchDocIndex(index, query, scope, limit)`

The search flow is:

1. load or rebuild the project index
2. normalize the query string
3. split it into terms
4. score matches against token frequency and exact-string presence
5. filter by `scope` (`all`, `docs`, `readme`, `packages`)
6. return the top `limit` matches with excerpts

### Safety and scope

The MCP search tool is intentionally read-only and does not execute project code. It simply reads documentation files and builds a cached summary for quick retrieval.

This is safe for agent discovery and is appropriate for a tool that needs to answer questions like:

- “Where is the build workflow documented?”
- “Which file explains the project architecture?”
- “What docs mention page types or MCP?”

### Validation

When changing the MCP search behavior, use a targeted validation command that proves the index creates and matches a real query.

Example validation pattern:

- `node --input-type=module ...`
- import the MCP module
- build the doc index
- search for a known term such as `kirigami mcp`
- confirm the result count and first match are sensible

Do not rely only on a code review of the function; run the minimal smoke check that exercises the real path.

## Commit hygiene for this workflow

For this repo, the usual pattern is:

- commit documentation and MCP changes together only when they are part of the same task
- keep the commit focused on the feature or fix being shipped
- do not include unrelated repo modifications from other work streams
- use a clear English summary, for example:

  `feat(mcp): add cached doc index for search`

When the repo context requires it, include the Copilot trailer in the commit body as the repo convention expects.

## Summary

The shortest safe rule is:

- keep Markdown aligned with the code
- update the proper file depending on the type of change
- keep the MCP search index cached, stale-safe, and fast
- validate with the smallest relevant smoke test
- commit only the relevant patch
