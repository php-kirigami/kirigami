# Status

Running log of what's shipped recently, most recent at the bottom. This is
a changelog, not a reference — for durable facts see [CONTEXT.md](CONTEXT.md),
for the "why" behind a choice see [DECISIONS.md](DECISIONS.md).

## Release history (2026-09-10 to 2026-09-11)

**Release 1** (`00cf575`): `@kirigami/sdk` 0.2.0, `@kirigami/canva` 2.4.0,
`@kirigami/php-prepros` 1.7.0, `@kirigami/kirigami` 1.4.0,
`@kirigami/plugin-highlight` 0.1.1. Carried: the `META` class (`<head>`
SEO/social generator, opt-in `meta:` block); canva `styles/prose` +
`reveal` script (lifted from what the starter templates carried inline);
the `###TIMESTAMP###` render fix. Both `../template-*/` updated and pushed.

**Release 2**: `@kirigami/php-prepros` 1.7.1 (lazy `kirigami.yaml` load —
`import '@kirigami/php-prepros'` is now side-effect-free, fixing `kiri
build/export/run --help` crashing with "Config file not found") +
`@kirigami/kirigami` 1.4.1. Templates floored and now commit a
`package-lock.json` (`npm ci`-ready).

**Release 3** (`8e36913`): `@kirigami/canva` 2.5.0, `@kirigami/php-prepros`
1.7.2, `@kirigami/kirigami` 1.5.0, `@kirigami/plugin-highlight` 0.1.3.
Carried: canva's `styles/main` (`.breadcrumb`, `.docs-toc`, `.table`,
`.badge`, `.palette`) + themed scrollbars; plugin-highlight's `@highlight
false` page opt-out, clean re-indented HTML output, and the language-alias
fix (`html`→`xml.js` etc., via a `MODULE_ALIASES` table); php-prepros's
banner-from-template system, `kiri serve` (watch + local server +
hot-reload), and `kiri install`.

**Release 4**: `@kirigami/canva` 2.5.2, `@kirigami/struct-walker` 1.0.5,
`@kirigami/php-prepros` 1.9.3, `@kirigami/sdk` 0.2.1, `@kirigami/kirigami`
1.5.6, `@kirigami/plugin-embed` 0.1.4, `@kirigami/plugin-extlink` 0.1.3,
`@kirigami/plugin-highlight` 0.1.6. Carried: canva's `.hljs` specificity
fix (theme toggle no longer reflows highlighted code) and
plugin-highlight's matching inline-code fix; plugin-extlink's `{%
extlink %}` Markdown shortcut; `kiri serve`'s `EADDRINUSE` message and CSS
hot-injection; php-prepros's `/roadmap/` multi-line-list fix;
plugin-highlight now fails the build eagerly on an unknown `languages:`
name, and no longer ships a dead `copyButton` when there's no esbuild task.

**Release 5**: `@kirigami/canva` 2.6.0, `@kirigami/kirigami` 1.5.7,
`@kirigami/plugin-highlight` 0.1.7, `@kirigami/plugin-embed` 0.1.5.
Feature: canva's `styles/lightswitch` — an animated theme toggle whose pin
morphs from a sun into a crescent moon via a real CSS `d` path transition,
colored from `conf` tokens rather than a fixed palette (after user
feedback on an earlier hardcoded-color draft). Also: a full README "what's
new" audit across kirigami/php-prepros/sdk/plugin-highlight/plugin-extlink/
plugin-embed, several of which had fallen behind their actual published version.

**Release 6**: `@kirigami/php-prepros` 2.0.0, `@kirigami/kirigami` 2.0.0.
**Breaking**: `meta:`/`jsonld:` merged into `seo:` (see
[DECISIONS.md](DECISIONS.md)). `../php-kirigami.github.io/` and both
`../template-*/` migrated and floor-bumped to `^2.0.0` in the same release.

**kiribuild v2**: the composite action trimmed to Node 24 + `kiri` CLI +
`kiri export` only; checkout/commit-back/Pages upload-deploy moved to the
caller's workflow. Both templates ship an identical `.github/workflows/page.yml`.
Tagged `v2.0.5`, published on the GitHub Marketplace. Verified end-to-end
against real live deployments (not just green CI runs) on all three public
sites — `sitemap.xml`'s `<lastmod>` matched the real push timestamp.

**New package**: `packages/audiowaveform-wasm/`, published as
`@kirigami/audiowaveform-wasm@1.0.0` (2026-09-12) — waveform peak
extraction + ID3 tag/cover-art reading, vendoring the compiled output of
the sibling repo `audiowaveform-wasm-compiler`.

## Session 2026-09-15 / 2026-09-17

- `canva/conf.scss` now calls `font-style-detect($path)` in its
  `@font-face` loop instead of a hardcoded `font-style: normal` — see
  [DECISIONS.md](DECISIONS.md) for the `"ital-axis"` sentinel guard.
  Verified against a real `kiri build` (template-default, Roboto Flex +
  Quicksand fonts).
- New `$font-mono` / `--font-mono` token in `canva/conf.scss`
  (`main.scss`/`prose.scss` and plugin-highlight's `$code-font` now point
  at it instead of duplicating a fallback stack).
- `.d.ts` files written for every `canva/dist/scripts/*.js` export (`dom`,
  `helpers`, `theme`, `observer`, `reveal`, `components/burger`) — the
  `copyDeclarations()` plumbing in `build.js` already existed, nothing was
  being copied yet. Verified with a real `tsc --noEmit` against all 6 import paths.
- `canva/utils.scss` reviewed end to end: every function still pulls its
  weight (`wash`/`hex6`/`hexbin` are intentional documented public API,
  not dead code); only actual finding was an unused `@use "sass:map"`, removed.
- `plugin-highlight`'s build-time highlighter and canva's `observer` are
  **not a candidate for merging** — one rewrites a raw HTML string in Node
  before any DOM exists, the other needs a live browser DOM. Documented in
  the source so the question doesn't resurface.
- `@kirigami/plugin-extlink`: `class=""` attribute added to `<extlink>`,
  same pattern as the existing `title`/`description`/`image`/`label`
  overrides (not exposed on the `{% extlink %}` Markdown shortcut, which
  only takes 2 positional args). README updated.
- `php-prepros`: `humans.txt` now generated from `kirigami.yaml`'s
  `author`/`email` fields (`PREPROS::humans()`, wired into `sitemap()`) —
  only written when at least one of the two is present.
- `injectHead()`'s "already referenced" check tightened — see
  [DECISIONS.md](DECISIONS.md) for the `hasAssetTag()` fix.
- `@kirigami/bestframe` added: automatic video thumbnail/still-frame
  selection via a small embedded aesthetic-AI model compiled to WASM.
- `refactor/core-api` branch: `@kirigami/cli` package extracted from
  `@kirigami/kirigami` — see [DECISIONS.md](DECISIONS.md). In progress,
  not yet published.
- `CLAUDE.md` (470 lines) retired in favor of this `docs/` split, kept
  under 200 lines as a short entry point going forward.
