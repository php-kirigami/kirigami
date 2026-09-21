# Instructions

Working conventions for how changes move from an idea to a published
release across this monorepo and its sibling repos.

## Workflow

1. Create a branch, checkout.
2. Code and write comments.
3. Log the change in [STATUS.md](STATUS.md) (or [TODO.md](TODO.md) /
   [ROADMAP.md](ROADMAP.md) if it's a note for later rather than done work).
4. Commit.
5. Repeat steps 1-3 for each iteration of ideas.
6. Push the batch.
7. Go to step 1 if more work is needed before publishing new versions.
8. Update every `README.md` that needs it across the workspace.
9. Prepare the npm packages that need a version bump.
10. Commit the release preparation, merge the approved branch to `main`, and push.
11. Publish packages and wait until the registry/CDN propagate.
12. (Future: pack the VS Code extension + publish through its separate release path.)
13. Record and commit any release follow-up changes.
14. Update `../template-*/`.
15. Deep-update the org site.
16. Go to step 1.

## Releasing

A documentation update does not include version bumps, commits, pushes, or publication unless requested. The steps below describe a release, not implicit authorization to perform one. Merge and push the approved release state to `main` before the publish preflight.

The publish script scans non-private workspace packages, including `kirigami-vscode`; it does not implement a separate VSIX release path. It runs `build`, not the extension’s `compile` script. Review the selected packages and packaging contents before a release; do not assume extension publishing is excluded automatically.

`npm run release` (→ `node scripts/publish.js`). Bump the version in each
package's `package.json` first, and — because internal deps are pinned to
**exact** versions — bump every dependent's dep range to match (e.g.
bumping `@kirigami/canva` means editing `@kirigami/kirigami` and
`@kirigami/plugin-highlight` too), then `npm install` to refresh the
lockfile, commit, and **push `main`** before releasing.

The script: topo-sorts `packages/*` on their `@kirigami/*` deps, then for
each, skips it if that exact version is already on npm, else runs its
`build` script (tarball publishes skip `prepublishOnly`), `npm pack`s into
`packs/`, and `npm publish`es. Then it purges the jsDelivr cache for
`kirigami.schema.json` and every plugin's `kirigami.optionsSchema` — served
from GitHub `@main`, editors otherwise keep the stale copy for up to 12 h.

Flags: `--dry-run`, `--no-purge`, `--purge-only`, `--only <name>`,
`--otp <code>`, `--yes` (skip the "is HEAD pushed?" preflight). Needs
`npm login` with `@kirigami` publish rights. If npm's account has 2FA on,
`npm publish` errors `EOTP` and prints a browser-auth URL — that flow only
works in an interactive TTY, so from a non-interactive shell (e.g. an
agent driving the terminal) pass `--otp <code>` explicitly. After a
publish, npm's registry/CDN + `npm view`'s local cache lag a few minutes —
a fresh `npm view <pkg>@<new-ver>` still showing the old version right
after `npm run release` is almost always propagation, not a failed publish
(check the publish log's `✓ published`).

### Push / release order (always)

Whenever a change spans several repos, ship them in this order:

1. **`npm run release`** — publish the `packages/*` bumps (push `main` first).
2. **Tag a new `kiribuild` version** if the action changed (its own repo:
   `vX.Y.Z` tag + move the `v2` tag).
3. **The templates** (`../template-*/`) — floor dep ranges, rebuild, push.
4. **`../php-kirigami.github.io/`** (the org site) — when it's in the loop.

## README template

`packages/php-prepros/README.md` is the **canonical template** every other
`packages/*` README (and the root `README.md`) is based on. Structure, in order:

1. `<div align="center">` block:
   - `<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />`
   - `---`
   - `# @kirigami/<name>` (h1)
   - one-line description, with **Kirigami** bolded
   - badges: npm version, license, Node.js version (php-wasm adds a PHP
     badge), website (static shields.io badge → `https://php-kirigami.github.io`).
     Use the actual package identity and license. A manifest version does not prove that a working-tree change has been published; the VS Code package is `kirigami-vscode`.
   - `</div>`
2. `---`
3. `## Overview` — 2-3 short paragraphs; last line ties into the Kirigami ecosystem.
4. `---`
5. `## Table of contents` — nested bullet list with `#anchor` links (use
   exactly this heading, not "Contents").
6. `---`
7. `## What's new in X.Y.Z` — optional, for released version history. Describe pending changes under `## Unreleased`; do not invent or bump a version during a documentation pass.
8. Content sections, **each separated by `---`**.
9. `## License` — the license declared by the package, including upstream notices. PHP-WASM uses GPL-2.0-or-later and bestframe LGPL-2.1-or-later; all other packages use GPL-3.0-or-later. Preserve upstream notices.

Canva's `styles/main.scss` is implemented. Only `Burger` remains a stub.

Non-package repos (`../template-*/`, `../kiribuild/`, the `.github.io`
site) don't follow the full structure, but every README everywhere still
opens with the `<div align="center">` block: logo `<img>`, `---`, an h1
title, a one-line description with **Kirigami** bolded, and at least a
license badge (+ a Node badge where the repo pins `engines.node`).
