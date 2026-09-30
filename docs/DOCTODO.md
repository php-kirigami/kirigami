# Documentation maintenance

Track unfinished documentation work only. Completed work and verification
history live in [STATUS.md](STATUS.md); the detailed 2026-09-20 review is also
recorded in [AUDIT-2026-09-20.md](AUDIT-2026-09-20.md) and Git history.
Dependency documentation, generated bundles, and package archives are outside
this inventory.

The scope includes **every `packages/*/README.md`**, the root README, and
repository guides. A guide in `docs/` does not replace a package's standalone
installation, API, options, examples, runtime requirements, or limitations.
A targeted correction is not a complete audit of every example.

MCP topic hints still omit the new guides and require a code change.
Published-consumer and platform verification remain below.

## Remaining work

| Prerequisite | Documentation to finish | Completion evidence |
|---|---|---|
| Markdown pages + `@@` (unreleased) | `docs/USER-GUIDE.md` (a Markdown page, section defaults with `@@`), `docs/INTERNALS.md` (page discovery), the core README's long watch paragraph and `root`/`deep` rows, `kirigami.schema.json` descriptions (`root`, `deep`) and the MCP page hints (`packages/mcp/index.js`) still say pages are `_*.php` only. | Those files mention `_index.md` pages and `@@`; MCP doc index regenerated. |
| Organization profile and site publication | Publish the profile source and regenerate/deploy the public site through the release workflow. | Verify the deployed pages; local Markdown edits do not count as publication. |
