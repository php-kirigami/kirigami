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
| VSIX packaging and interactive-host verification | Update EXTENSION-VSCODE.md and the extension README with packaging commands, included runtime licenses, supported platforms, and verified host behavior. | Inspect an actual VSIX and record the host/platform checks; compilation alone is insufficient. |
| Authorized package release | Move PHP-prepros/PHP-WASM unversioned notes into the actual release entries and verify examples against published packages and the migrated kiribuild fallback. | Published versions and clean-consumer example runs; do not assign versions in a documentation-only pass. |
| Sibling dependency migration and release | Both templates carry the new short CLAUDE.md, migrated dependencies and README (local commits, see RELEASE-PLAN step 8). The org site still has the old 940-line CLAUDE.md and dependencies. | Site migrated like the templates; all three pushed after the release. |
| php-prepros `SCHEMA`/`Normalizer` switch to jsonk/norm | The org site's PHP reference (`../php-kirigami.github.io/src/docs/php/_index.php`, `## SCHEMA`) still calls `SCHEMA` a pure-PHP Draft-7 validator with the old keyword list; align it with php-prepros' README (jsonk, draft 2020-12, `SCHEMA_LEGACY`), and mention `NORMALIZER_LEGACY`. | Site section matches the package README. |
| Publication of the new `phpext-*` packages | `packages/php-wasm/README.md` lists 14 `@kirigami/phpext-*` packages as published (none is yet); php-wasm-compiler now builds 27 (adds ffi, fileinfo, intl, rar, scanmeqr, snmp, xsl, fastchart, anydoc, odbc, pdo_dblib, pdo_firebird, pdo_odbc). Update the list once they publish; note that intl.so is ~40 MB (ICU data embedded) and that anydoc aborts PHP on a Rust panic. | README list matches the packages on npm. |
| Organization profile and site publication | Publish the profile source and regenerate/deploy the public site through the release workflow. | Verify the deployed pages; local Markdown edits do not count as publication. |
