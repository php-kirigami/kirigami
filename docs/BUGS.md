# Bugs

Known open issues, limitations, and unresolved questions that need a
decision from Maxime before they can be closed. Fixed bugs move to
[STATUS.md](STATUS.md) / [DECISIONS.md](DECISIONS.md) instead of staying here.

## Repository audit — 2026-09-20

See [the full audit](AUDIT-2026-09-20.md) for evidence, reproduction results,
source locations, corrective actions, and verification limits. The audit did not change production code. Documentation finding A15 was addressed by the subsequent Markdown refresh; A01/A02 were subsequently fixed by export path validation and source-file exclusions; A03 was fixed by enabling CURL peer/hostname verification; A04 was fixed by strict plugin-name validation and shell-free npm invocation; A05 was fixed by resolving starter dependencies and banner assets from their installed packages; A06 was fixed by coordinated PHP runtime/configuration and plugin include invalidation; the remaining code findings are open.

A07 is also fixed: optional layouts default safely, and PHP diagnostics survive task aggregation without entering generated HTML.

- **P2 / A09–A14, A16:** Malformed
  development URLs; served PHP source; missing add/delete watch handling;
  duplicate watch tasks; uncaught async watch failures; hidden script failures
  in VS Code; incomplete regression coverage and missing CI gates (focused export tests now exist).
- **P3 / A17–A18:** WASM tarballs include local backups; unavailable browser
  storage prevents oEmbed metadata fetching.

## Previously recorded issues

- **`font-style-detect()`'s `"ital-axis"` sentinel — open question.**
  Previously this returned a sentinel string (`"ital-axis"`) that the
  Sass templates guarded back to `normal` to avoid emitting invalid CSS.
  To make the intent explicit and enable future handling the Sass helper
  `font-has-ital-axis($path)` has been added and the `canva` stylesheet
  now uses it to fall back to `normal`.

  If a project actually needs full support for variable fonts exposing a
  binary `ital` axis, the correct approach is still to emit two distinct
  `@font-face` blocks (one per `ital` value) so browsers can choose the
  correct face based on font-variation settings. That is a design decision
  left open (and requires generating two `src` entries). For now, the
  conservative fallback avoids invalid CSS while exposing a small API to
  detect the axis presence if downstream code wants to split faces.

- **`|+` (keep-chomping) literal blocks: `YAML::` vs `YAML_LEGACY::` differ
  by one trailing blank line.** Historically the legacy parser preserved
  all trailing blank lines for `|+`, while the native `yaml` extension
  (used by `YAML::`) returned a single trailing newline. To reduce
  surprising diffs when switching parsers, `YAML_LEGACY::applyChomping()`
  has been normalised so `|+` produces a single trailing newline — matching
  the behaviour observed from libyaml. This is a conservative, low-risk
  normalization; the legacy parser is still retained for reference or
  rollback but behaves consistently with the native-backed parser now.
  See [DECISIONS.md](DECISIONS.md) for the rationale behind preferring
  the native-backed `YAML::`. (Low priority; `|+` is rarely used.)

A08 resource paths and working-directory capture are fixed with a staged ESM runtime and external Node worker. Relocated integration and real VS Code 1.138.0 smoke tests pass on Windows. Older editors, interactive host behavior, and VSIX packaging remain validation follow-ups; see [the extension guide](EXTENSION-VSCODE.md).

## WASM HTTPS integration follow-up

During A03 verification, local HTTPS requests from the current working-tree WASM binary timed out before the network proxy received a connection. The binary and generated loader already had local modifications before this fix and were left untouched; the cause has not been established. Native PHP exercises of the actual CURL helper pass certificate, hostname, redirect, and download checks. WASM tests verify the injected CA contents and active ini directives, but do not establish successful end-to-end HTTPS. Investigate the networking path before claiming that integration is verified.
