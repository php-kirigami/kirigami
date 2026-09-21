PR: Clarify licensing and separate php-wasm runtime

Summary

This PR clarifies the repository licensing policy and separates runtime/binary
components from the project core. In particular:

- The project core is documented as GPL-3.0-or-later (root LICENSE updated).
- Runtime/binary packages that include compiled or upstream-derived assets
  (notably `packages/php-wasm`) are treated as separately licensed and keep
  their own LICENSE files.
- A repository-level NOTICE file was added to summarize the separation.

Why this change

The php-wasm package contains an embedded PHP/WASM binary produced from
upstream or third-party sources. Because binaries inherit license obligations
from their inputs, treating such runtime packages as separately licensed avoids
incorrectly asserting a single-license status across the whole monorepo.

What changed (high level)

- LICENSE (root) replaced with GPL-3.0-or-later text
- README.md: license badge and "License" section updated
- NOTICE: new repository-level file summarising package-level licensing
- packages/php-wasm/NOTICE: new per-package notice
- packages/php-wasm/README.md: small clarification added
- docs/LICENSING-TEMPLATES.md: snippet to copy to package READMEs and a PR
  template / checklist for maintainers
- Several package.json license fields in core packages updated to
  "GPL-3.0-or-later" (packages that are pure source maintained by project
  authors)

Reviewer instructions

- Confirm that packages that contain third-party code or compiled binaries
  retain their original LICENSE files and are not subsumed by the root license.
- Check that every package that was switched to GPL-3 is indeed entirely
  project-owned source code or that contributor agreement exists.
- Verify the NOTICE wording is accurate and links to the correct package files.

Follow-ups

- If any package must remain under a different license, revert that package's
  package.json license field and add an entry to NOTICE documenting the
  exception.
- Consider running an automated license scan and adding a short note in
  docs/STATUS.md describing the change.

Suggested commit message

chore(licensing): separate php-wasm runtime and set project core to GPL-3.0-or-later

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
