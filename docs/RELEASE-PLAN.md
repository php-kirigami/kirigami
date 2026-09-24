# Release plan — coordinated release

Checklist for the next release, which ships everything together: the npm
packages, the PHP extension packages (`@kirigami/phpext-*`), and the first VS
Code extension. Prepared on 2026-09-22; nothing has been published or pushed.
Delete this file once the release is done, and log the outcome in
[STATUS.md](STATUS.md).

For the standing procedure (publish script, 2FA, propagation), see
[INSTRUCTIONS.md](INSTRUCTIONS.md#releasing).

## 1. Decisions for Maxime

### Version numbers

Every package differs from its published version, so every one needs a new
version: `scripts/publish.js` skips versions that already exist on npm.

**Decided (2026-09-23):** every package gets a new version. Core **3.0.0**,
php-wasm **8.5.11**. The other numbers are proposals (breaking → major,
feature → minor, fixes/docs only → patch), to confirm on release day.

| Package | Local | npm | Files changed vs npm | Release | Notes |
|---|---|---|---|---|---|
| `@kirigami/kirigami` | 2.1.0 | 2.0.0 | 29 | **3.0.0** | **Breaking**; see below |
| `@kirigami/cli` | 0.1.0 | — | — | 0.1.0 | First publish; now owns `kiri` |
| `@kirigami/mcp` | 0.1.0 | — | — | 0.1.0 | First publish |
| `@kirigami/php-prepros` | 2.0.0 | 2.0.0 | 15 | 3.0.0 | New `runPluginScript()` API; **breaking** `seo:` block (`seo.jsonld` merged) |
| `@kirigami/sdk` | 0.2.1 | 0.2.1 | 8 | 0.3.0 | New hooks (`scripts:register`, `tasks:register`, `commands:register`) |
| `@kirigami/php-wasm` | 8.5.10-6 | 8.5.10-5 | 6 | **8.5.11** | PHP 8.5.11 core validated (see section 2) |
| `@kirigami/canva` | 2.6.0 | 2.6.0 | 12 | 2.7.0 | Two `@font-face` blocks for fonts with an `ital` axis |
| `@kirigami/plugin-embed` | 0.1.5 | 0.1.5 | 4 | 0.1.6 | |
| `@kirigami/plugin-highlight` | 0.1.7 | 0.1.7 | 5 | 0.1.8 | |
| `@kirigami/plugin-extlink` | 0.1.3 | 0.1.3 | 3 | 0.1.4 | |
| `@kirigami/audiowaveform-wasm` | 1.1.0 | 1.1.0 | 2 | 1.1.1 | |
| `@kirigami/struct-walker` | 1.0.5 | 1.0.5 | 2 | 1.0.6 | |
| `@kirigami/bestframe` | 0.1.0 | 0.1.0 | 1 | 0.1.1 | |

"Files changed" comes from `npm diff --diff-name-only` against the published
tarball, excluding `package.json`. Internal dependencies are pinned to exact
versions, so each bump must also be applied to the dependents' manifests.

**Why the core should be 3.0.0, not 2.1.0:** it no longer installs `kiri`
(moved to `@kirigami/cli`). The templates and the org site declare
`"@kirigami/kirigami": "^2.0.0"` and run `kiri build`. A 2.1.0 would be picked
up by `^2.0.0` and break every one of those sites on their next install. The
README's "Unreleased — breaking" section documents the migration. Export's
new marker check and duplicate-task rejection are further behavior breaks.

### VS Code extension

**Decided (2026-09-23):** ship every platform, and publish the extension
last, after everything else is out; the Marketplace setup is still to be
worked out then.

- **Target platforms.** The staged runtime contains native binaries
  (`@esbuild/<platform>`, `@parcel/watcher-<platform>`), so the VSIX is
  platform-specific: one `vsce package --target <target>` per platform, each
  staged on a machine (or CI runner) of that platform. Pick the targets, e.g.
  `win32-x64`, `linux-x64`, `darwin-arm64`, `darwin-x64`.
- **Marketplace publisher** `php-kirigami` must exist, with a personal access
  token for `vsce publish`.
- **Version**: 0.1.0 for the first publish? `CHANGELOG.md` has to be turned
  into a release entry.

### PHP extension packages

The 27 `@kirigami/phpext-*` packages live in `../php-wasm-compiler/packages/`
and none is published yet (that repository's work is committed on `main`,
not pushed).
`packages/php-wasm/README.md` already says they are "currently published":
true only after this release.

## 2. Before release day

- [x] **Linux test run** (2026-09-22): `npm ci` + `npm test` in WSL Ubuntu with
      Node 24.21.0 and a static PHP 8.5.8: 68 passed, 0 failed, 1 skipped (the
      Windows-only npm launcher test). CI itself has never run.
- [x] **Interactive VS Code checks** (2026-09-23, by Maxime in a real editor).
- [x] **phpext compatibility**: load every `phpext-*` artifact with the
      php-wasm binary being released (`getLoadedExtensions()`), since artifact
      selection does not prove binary compatibility. First pass on 2026-09-23
      (PHP 8.5.11 binary, 18 packages, 19 modules): all load together once
      the loader honors multi-module packages (see STATUS); `mysqli_init()`
      and the PDO `mysql` driver work. Second pass (same day, core
      8ac01de, all 27 packages, 28 modules): all load together with empty
      stderr, `pdo_firebird` included (its exit-time `Aborted()` is fixed),
      and smoke calls pass (gmp, sodium, fileinfo, tidy, dba, intl, the six
      PDO drivers, snmp over UDP). Third pass (same day, against real
      MySQL 8.4 and PostgreSQL 17 in Docker): every MySQL connection failed
      with "Bad handshake" because the phpize-built `mysqlnd.so` lost its
      `config.h` defines (`MYSQLND_SSL_SUPPORTED` etc.) and sent two auth
      packets; fixed in the compiler (phpext-mysqli 0.1.4, phpext-pdo_mysql
      0.1.3). mysqli, pdo_mysql, TLS 1.3 to MySQL, pgsql, pdo_pgsql and
      async pgsql now pass. Final pass (same day, final core 69c3280, wasm
      sha1 `2d64ca87c051`): all 28 modules load together with empty stderr,
      the smoke calls, the network probes (TCP/UDP/SNMP) and the MySQL/
      PostgreSQL checks above pass, and `npm test` passes 89/89 on Windows.
- [x] **kiribuild** (2026-09-23, local changes in `../kiribuild`, not
      committed): the global fallback installs `@kirigami/cli@<cli-version>`
      (new input, default `latest`); `kirigami-version` becomes a legacy
      input, empty by default, that still installs `@kirigami/kirigami` < 3.
      The JSPI flag is only passed when `node` accepts it (Node 26 rejects
      it). Tests: new non-blocking `local-cli-package` scenario, canary on
      `@kirigami/cli@latest`. Tag `v2.1.0` on release day (step 7), then
      make `local-cli-package` blocking.
- [ ] Commit or discard the pending working-tree changes here
      (`packages/php-wasm/README.md`) and in `../php-wasm-compiler`. Waiting
      on the corrected WASM builds.
- [x] **CI dry run with `act`** (2026-09-23): `act push -W
      .github/workflows/ci.yml -j test --matrix os:ubuntu-latest` passes both
      Linux jobs (act cannot run the Windows ones). It first failed on Node
      24 because the parallel jobs share act's host network and the VS Code
      activation test used the fixed port 4321; fixed with the
      `kirigami.previewPort` setting and a free port in the test.

## 3. Release day, in order

1. Bump versions (section 1) and internal dependency pins; `npm install` to
   refresh the lockfile; `npm test`.
2. Replace "Unreleased" headings (core README, extension CHANGELOG) with the
   chosen versions.
3. Merge `refactor/core-api` into `main`, push, and wait for CI to pass on all
   four jobs.
4. `npm run release` — publishes the npm packages in dependency order and
   purges the schema CDN cache. The script skips `kirigami-vscode`
   (packages with `engines.vscode` go through vsce).
5. Publish the `phpext-*` packages from `../php-wasm-compiler`.
6. For each target platform: `npm ci`, then in `packages/vscode`
   `npx @vscode/vsce package --no-dependencies --target <target>`, check the
   VSIX (below), then `vsce publish --packagePath <file>`.
7. Tag a new `kiribuild` version and move the `v2` tag (only after its
   `@kirigami/cli` change).
8. Templates (`../template-*/`): already migrated in local, unpushed commits
   (2026-09-23: `template-default` 141d049, `template-demo` 44df446, with
   `@kirigami/cli ^0.1.0` + `@kirigami/kirigami ^3.0.0`, page types, no
   `tasks.json`). Adjust those ranges if the chosen versions differ, restore
   `node_modules` with `npm install` (it refreshes `package-lock.json`; during
   development `node_modules/@kirigami` was junctioned to the monorepo, the
   published copies kept in `node_modules/.kirigami-published`), rebuild,
   commit, push. Existing `dist/` output folders need the `.kirigami-export`
   marker once.
9. Org site (`../php-kirigami.github.io/`): same dependency change, rebuild,
   deploy.

## 4. VSIX facts (checked 2026-09-22, win32-x64)

- Builds with `vsce package --no-dependencies --target win32-x64`:
  19.2 MB, 1,745 files, 56.3 MB unpacked, 63 staged runtime packages. Type
  declarations and source maps are no longer staged, and the core no longer
  pulls in `@octokit/rest` (since removed everywhere: core has its own GitHub client).
- Passes the real-host smoke test in VS Code 1.138.0 when unzipped and loaded
  through `test/run-host.ps1 -ExtensionPath <unzipped>/extension`.
- Path length: the longest path inside the extension is 98 characters, 179
  once installed under `%USERPROFILE%\.vscode\extensions\`. Before the octokit
  removal it was 140, and the extension host failed to start when the VSIX was
  unzipped under a 130-character folder (over Windows' 260 limit); the same
  folder now works.
- Bundled licenses: 42 MIT, 5 GPL-3.0-or-later (Kirigami), 5 GPL-2.0-or-later
  (PHP-WASM), 3 Apache-2.0, 3 BSD-3-Clause, and one each of ISC, Python-2.0,
  CC0-1.0, 0BSD. `@php-wasm/util` declares no license in its manifest but
  ships a LICENSE file. Five MIT packages ship no license file
  (`@tokenizer/token`, `@esbuild/win32-x64`, `fontkit`, `brotli`, `dfa`).
  Consider a generated third-party notices file in the VSIX.
- Icon: `packages/vscode/images/icon.png`, the elephant from the logo at
  256 px (vector source: `assets/chart/kirigami-elephant.svg`). The extension
  README uses `images/logo.png`, because the Marketplace rejects SVG images in
  READMEs.
