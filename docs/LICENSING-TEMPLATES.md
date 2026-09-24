Licensing templates and recommended wording

Purpose

These short templates are intended to be copied into package README files and used in a repository-level pull request describing the change that separates the project core (GPL-3.0-or-later) from binary/runtime components that retain their own licenses (for example, packages/php-wasm).

1) Package README licensing snippet (copy into package README.md)

"""
## Licensing

This package is part of the Kirigami project. The project core is licensed
under GNU GPL v3.0 or later. This package is licensed as follows:

- If this package is a source-only library written and maintained by the
  Kirigami authors, it is distributed under GPL-3.0-or-later.
- If this package contains compiled binaries or upstream-derived runtime
  assets, it may retain its own license and provenance. See the package's
  LICENSE file for full terms.

See the repository-level NOTICE for a summary of package-level licensing:
`/NOTICE`.
"""

2) Repository PR / release description (use for the PR that applies the change)

Title: clarify licensing and separate php-wasm runtime package

Summary:
- Convert the project core to GPL-3.0-or-later and update the repository-level
  documentation to reflect this change.
- Explicitly treat packages that contain compiled binaries or upstream-derived
  components as separately licensed. `packages/php-wasm` is the canonical
  example and keeps its own LICENSE in `packages/php-wasm/LICENSE`.
- Add a repository-level `NOTICE` file summarising the separation and linking
  to package-level LICENSE files.

Files changed / added (examples):
- LICENSE (root) -> updated to GPL-3.0-or-later
- README.md -> license badge + "License" section updated
- NOTICE -> added at repository root
- packages/php-wasm/NOTICE -> added
- per-package README files: copy the README licensing snippet above where
  appropriate

Why:
- The php-wasm package contains compiled PHP/WASM runtime assets with
  provenance and licensing constraints that differ from the project core.
- Treating runtime binaries as separately licensed avoids misrepresenting the
  legal status of redistributed binary artifacts and reduces legal risk.

Action requested from reviewers:
- Reviewers should confirm that all package-level LICENSE files remain
  accurate and reference upstream provenance where applicable.
- Verify that any package which contains third-party code or compiled binaries
  is documented and retains its own LICENSE/NOTICE (do not subsume those
  packages into the core GPL without explicit audit and agreement).
- Confirm the README README/NOTICE wording is clear and not misleading.

Testing / follow-up:
- Optionally run a license-checker (e.g. `npm ls --all --prod` + license audit)
  or a scanning tool to confirm no new incompatibilities were introduced.
- If a package must be relicensed, obtain contributor agreement(s) or replace
  the upstream-derived component.

Suggested commit message:
chore(licensing): separate php-wasm runtime and set project core to GPL-3.0-or-later

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>

3) Short maintainer checklist (for the PR body)

- [ ] Confirm root LICENSE contains the intended text (GPL-3.0-or-later)
- [ ] Confirm packages with retained licences keep accurate LICENSE files
- [ ] Add package README snippet where appropriate
- [ ] Add NOTICE at root linking to package-level licenses
- [ ] Document the change in docs/STATUS.md if it affects releases

Notes

- This is documentation and packaging work; it does not itself alter the
  license of third-party or upstream components. Any actual relicensing of
  third-party code requires the necessary contributor or upstream permissions.
- The wording is intentionally conservative and explicit to avoid legal
  ambiguity. If you need a legally-binding change (assignment, contributor
  agreements, or relicensing), consult legal counsel.
