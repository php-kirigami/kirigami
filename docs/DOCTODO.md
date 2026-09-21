# Documentation maintenance

This inventory covers all 32 repository-owned Markdown files, including `.github/CONTRIBUTING.md` and the untracked future-roadmap document. Dependency documentation in `node_modules`, Git internals, and generated package archives are outside the project documentation scope.

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

## Remaining work

- Finalize VSIX distribution/license documentation after packaging verification; the existing extension manifest declares GPL-3.0-or-later while its LICENSE and README still say MIT.

- TLS helper docs now reflect A03’s secure defaults. Keep the native-PHP verification / WASM end-to-end limitation explicit until the networking follow-up is resolved.

- Export documentation now reflects the A01/A02 fixes and focused regression tests. The shared-template updates remain local to this repository; sibling synchronization is still deferred.

- At release time, move the unversioned PHP-prepros and PHP-WASM notes into the actual release entry after an explicitly authorized version bump.
- Publish the updated organization-profile source and regenerate/deploy the public site during the release workflow. Local Markdown edits do not publish external pages.
- Verify documentation examples against the eventual published packages and the migrated `kiribuild` fallback.
- Update the documented limitations as the code defects in [BUGS.md](BUGS.md) are fixed.
- Synchronize the shared reference to sibling templates and the organization site in a separate authorized task. The user explicitly restricted this pass to the current repository; no sibling files were modified.

## Verification

- All local Markdown file links and heading anchors checked successfully.
- 20 YAML examples parsed; seven complete project configurations passed the local schema (including plugin option schemas).
- Native PHP checks confirmed YAML boolean/string behavior and Markdown footnote markup.
- The documented manual PHP loader example executed successfully.
- No manifests, lockfiles, or version declarations were modified.

## Review inventory

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
