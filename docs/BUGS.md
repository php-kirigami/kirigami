# Bugs

Known open issues, limitations, and unresolved questions that need a
decision from Maxime before they can be closed. Fixed bugs move to
[STATUS.md](STATUS.md) / [DECISIONS.md](DECISIONS.md) instead of staying here.

## Repository audit — 2026-09-20

See [the full audit](AUDIT-2026-09-20.md) for evidence, reproduction results,
source locations, corrective actions, and verification limits. The audit did not change production code. Documentation finding A15 was addressed by the subsequent Markdown refresh; A01/A02 were subsequently fixed by export path validation and source-file exclusions; A03 was fixed by enabling CURL peer/hostname verification; A04 was fixed by strict plugin-name validation and shell-free npm invocation; A05 was fixed by resolving starter dependencies and banner assets from their installed packages; A06 was fixed by coordinated PHP runtime/configuration and plugin include invalidation; the remaining code findings are open.

A07 is also fixed: optional layouts default safely, and PHP diagnostics survive task aggregation without entering generated HTML. A09 is fixed: malformed URL paths return 400, and file-read/stream failures no longer terminate the development server. A10 is fixed: the server denies private/source paths and checks canonical link targets, including the custom 404 fallback.

- **P2 / A16:** Incomplete regression coverage and missing CI gates (focused regression suites now exist).
- **P3 / A17–A18:** WASM tarballs include local backups; unavailable browser
  storage prevents oEmbed metadata fetching. (On s'en fout du browser, on target seulement NodeJS)

A14 is fixed: VS Code Run Script reports structured failures as errors, logs the returned diagnostics, and only announces success for `success: true`.

A13 is fixed: watcher callback rejections are contained, serve attempts a terminal failure notification, and startup/close paths release resources and await active callbacks.

A12 is fixed: watch-rule construction uses a local task list, so repeated setup does not accumulate implicit PHP tasks or mutate configured task listings.

A11 is fixed: watch rules handle additions and file/directory removals; PHP structural changes refresh mounts, remove obsolete known page outputs, and rebuild pages plus sitemap.

A08 resource paths and working-directory capture are fixed with a staged ESM runtime and external Node worker. Relocated integration and real VS Code 1.138.0 smoke tests pass on Windows. Older editors, interactive host behavior, and VSIX packaging remain validation follow-ups; see [the extension guide](EXTENSION-VSCODE.md).

## WASM HTTPS integration follow-up

During A03 verification, local HTTPS requests from the current working-tree WASM binary timed out before the network proxy received a connection. The binary and generated loader already had local modifications before this fix and were left untouched; the cause has not been established. Native PHP exercises of the actual CURL helper pass certificate, hostname, redirect, and download checks. WASM tests verify the injected CA contents and active ini directives, but do not establish successful end-to-end HTTPS. Investigate the networking path before claiming that integration is verified.

## Media package inspection — 2026-09-21

`npm pack --dry-run --ignore-scripts` listed only the intended seven files for
each of audiowaveform-wasm and bestframe in this working tree. This narrows the
current A17 packaging evidence for those two packages; it does not verify
PHP-WASM packaging or any already published tarball.
