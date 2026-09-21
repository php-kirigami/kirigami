# Documentation maintenance

Track documentation work left by implementation changes. Dependency documentation, generated bundles, and package archives are outside this inventory. The review table below records the 2026-09-20 pass; it is not a claim that every file has been revalidated after every code change. `ROADMAP-FUTURE.md` is tracked in Git.

## Completed — 2026-09-21

- Aligned the 11 remaining project-owned package license texts, README declarations, root metadata, and documentation inventory with GPL-3.0-or-later (A15). Corrected the remaining MIT inventory in the contributor guide during this follow-up.
- Documented the manual full-suite command, native PHP/cURL and VS Code build prerequisites, process isolation, and the Windows/Node 26 verification boundary in the contributor guide (48 tests passed).
- Documented PHP extension discovery paths, artifact selection, caching, and observed binary-load warnings in the PHP-WASM README.
- Removed completed keyword and layout-validation tasks from TODO.md after checking manifests, configuration validation, and passing regression tests. A16 automation remains code work in TODO.md and BUGS.md.
- Separated release-dependent documentation work below from checks already completed. No package versions were changed.

## Completed — 2026-09-20

- Reconciled the core API, CLI, MCP, and VS Code documentation with current implementation.
- Documented native YAML/Markdown behavior, footnote markup, page types, plugin registration, and current runtime limits.
- Compared PHP-WASM’s previously committed README snapshot with current `kiri phpinfo -m`; added an unversioned next-release note. Only `bz2` was newly listed in that direct comparison.
- Corrected installation examples and the license inventory (audit A15).
- Kept existing package versions and historical version headings unchanged.
- Updated CLI installation documentation and audit tracking for A04's registry-name validation and shell-free npm invocation.
- Updated CLI creation documentation and the local shared template reference for A05's manifest/banner resolution fixes. Sibling synchronization remains deferred.
- Updated core, MCP, extension, and PHP runtime documentation for A06's coordinated reload/reset behavior and its remaining concurrency/module-cache limits.
- Updated optional-layout and diagnostic documentation for A07; the audit now distinguishes the original warning reproduction from the corrected behavior.

- Updated A08 runtime isolation, staging, configuration requirements, and verified activation results across the extension documentation and audit tracking.

- Updated core server behavior and audit tracking for A09, including regression scope and the separate A10 exposure issue.

- Updated A10 public-file filtering, canonical containment, and development-only JavaScript/source-map behavior in core documentation and audit tracking.

- Updated A11 watch lifecycle behavior, output-cleanup scope, structural rebuild tradeoffs, and integration-test evidence.

- Updated A12 rule-construction behavior and regression evidence; removed the fixed task-accumulation limitation from core documentation.

- Updated A13 failure notifications, startup readiness, cleanup semantics, and verification scope in core and extension documentation.

- Updated A14 script-result handling and compiled-extension regression evidence in extension documentation and audit tracking.

## Remaining work

| Prerequisite | Documentation to finish | Completion evidence |
|---|---|---|
| VSIX packaging and interactive-host verification | Update EXTENSION-VSCODE.md and the extension README with packaging commands, included runtime licenses, supported platforms, and verified host behavior. | Inspect an actual VSIX and record the host/platform checks; compilation alone is insufficient. |
| WASM HTTPS networking fix | Update the TLS verification limitations in BUGS.md and the PHP-WASM/PHP-prepros READMEs. | End-to-end WASM requests pass certificate, hostname, redirect, and download checks. Native PHP checks are already documented. |
| A16 automation and runtime discovery isolation | Replace the manual-suite limitations in the contributor guide with the implemented test/CI commands; update discovery documentation if its API changes. | CI results for the supported matrix and reproducible discovery behavior. |
| Authorized package release | Move PHP-prepros/PHP-WASM unversioned notes into the actual release entries and verify examples against published packages and the migrated kiribuild fallback. | Published versions and clean-consumer example runs; do not assign versions in a documentation-only pass. |
| Sibling-repository synchronization | Copy the shared template reference into template/site CLAUDE.md files, preserving project-specific headers, and check CLI/export/license guidance. | Reviewed diffs in each sibling repository. No sibling files were modified in this pass. |
| Organization profile and site publication | Publish the profile source and regenerate/deploy the public site through the release workflow. | Verify the deployed pages; local Markdown edits do not count as publication. |

Export safety, TLS secure defaults, A06–A14 behavior, and package license alignment are already documented. Keep those limitations current when the corresponding implementation changes; they are not unfinished documentation fixes by themselves.

## Historical verification — 2026-09-20

- All local Markdown file links and heading anchors checked successfully.
- 20 YAML examples parsed; seven complete project configurations passed the local schema (including plugin option schemas).
- Native PHP checks confirmed YAML boolean/string behavior and Markdown footnote markup.
- The documented manual PHP loader example executed successfully.
- No manifests, lockfiles, or version declarations were modified.

## Historical review inventory — 2026-09-20

| File | Status |
|---|---|
| [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md) | Reviewed and updated |
| [AGENTS.md](../AGENTS.md) | Reviewed and updated |
| [CLAUDE.md](../CLAUDE.md) | Reviewed and updated |
| [README.md](../README.md) | Reviewed and updated |
| [docs/AUDIT-2026-09-20.md](AUDIT-2026-09-20.md) | Reviewed and updated |
| [docs/BUGS.md](BUGS.md) | Reviewed and updated |
| [docs/CONTEXT.md](CONTEXT.md) | Reviewed and updated |
| [docs/DECISIONS.md](DECISIONS.md) | Reviewed and updated |
| [docs/DOCTODO.md](DOCTODO.md) | Reviewed and updated |
| [docs/EXTENSION-VSCODE.md](EXTENSION-VSCODE.md) | Reviewed and updated |
| [docs/INSTRUCTIONS.md](INSTRUCTIONS.md) | Reviewed and updated |
| [docs/ROADMAP-FUTURE.md](ROADMAP-FUTURE.md) | Reviewed and updated |
| [docs/ROADMAP.md](ROADMAP.md) | Reviewed and updated |
| [docs/STATUS.md](STATUS.md) | Reviewed and updated |
| [docs/TODO.md](TODO.md) | Reviewed and updated |
| [docs/org-profile-README.md](org-profile-README.md) | Reviewed and updated |
| [docs/template-CLAUDE.md](template-CLAUDE.md) | Reviewed and updated |
| [packages/audiowaveform-wasm/README.md](../packages/audiowaveform-wasm/README.md) | Reviewed and updated |
| [packages/bestframe/README.md](../packages/bestframe/README.md) | Reviewed and updated |
| [packages/canva/README.md](../packages/canva/README.md) | Reviewed and updated |
| [packages/cli/README.md](../packages/cli/README.md) | Reviewed and updated |
| [packages/kirigami/README.md](../packages/kirigami/README.md) | Reviewed and updated |
| [packages/mcp/README.md](../packages/mcp/README.md) | Reviewed and updated |
| [packages/php-prepros/README.md](../packages/php-prepros/README.md) | Reviewed and updated |
| [packages/php-wasm/README.md](../packages/php-wasm/README.md) | Reviewed and updated |
| [packages/plugin-embed/README.md](../packages/plugin-embed/README.md) | Reviewed and updated |
| [packages/plugin-extlink/README.md](../packages/plugin-extlink/README.md) | Reviewed and updated |
| [packages/plugin-highlight/README.md](../packages/plugin-highlight/README.md) | Reviewed and updated |
| [packages/sdk/README.md](../packages/sdk/README.md) | Reviewed and updated |
| [packages/struct-walker/README.md](../packages/struct-walker/README.md) | Reviewed and updated |
| [packages/vscode/CHANGELOG.md](../packages/vscode/CHANGELOG.md) | Reviewed and updated |
| [packages/vscode/README.md](../packages/vscode/README.md) | Reviewed and updated |
