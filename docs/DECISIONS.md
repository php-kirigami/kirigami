# Decisions

Architectural decisions and the reasoning behind them, so a question doesn't
get re-litigated later without knowing it was already settled. For "what
shipped and when," see [STATUS.md](STATUS.md).

## `YAML::` now backed by the native `yaml` extension

Switched from the hand-written recursive-descent parser to PHP's native
`yaml` extension (libyaml), now statically built into `@kirigami/php-wasm`.
~6.8x faster on a representative corpus (see STATUS.md), and it fixed a
real bug found along the way: the old parser corrupted the whole document
on a compact nested sequence (`- - item`).

Kept the old implementation as `YAML_LEGACY` (`yaml-legacy.class.php`) —
untouched, still autoloadable — as a rollback path, rather than deleting
it outright, since the native extension follows YAML 1.1's implicit-boolean
resolution (the "Norway problem") slightly more aggressively: bare `y`/`n`
(unquoted, either case) now resolve to booleans as both values *and*
mapping keys, where `YAML::` used to leave them as strings. Every other
supported feature (quotes, `|`/`>` blocks incl. chomping, inline
collections, comments, multi-doc, `loadFile()`'s recursive external
reference resolution) was verified to match byte-for-byte across ~40 test
cases before switching. See [BUGS.md](BUGS.md) for the one remaining
un-root-caused difference (`|+` keep-chomping, one trailing blank line).

## `MD::` now backed by the native `mdhtml` extension

Switched from the hand-written regex/placeholder renderer to the native
`mdhtml` extension (real `cmark-gfm` 0.29.0.gfm.13), statically built into
`@kirigami/php-wasm` from `php-kirigami/php-mdhtml`. Same swap pattern as
the `YAML::` decision above: every `MD::` public method (`toHtml()`,
`registerPlugin()`, `unregisterPlugin()`, `getRegisteredPlugins()`,
`registerEmoji()`) is reimplemented in C — not just the CommonMark/GFM
core, but the `{% %}` plugin syntax and emoji shortcodes too — so
`md.plugins.php`'s default plugins ({% codepen %}, {% checklist %},
{% callout %}, {% img-asset %}) keep working unchanged against the new
class, verified end-to-end through the WASM runtime (plugin callback
invoked from the C extension back into PHP).

Diff-tested (in `php-mdhtml`, 2026-09-12) against `MD_LEGACY::`'s real
output across a full corpus. Byte-identical or visually-equivalent on
everything except one deliberate change: footnote HTML now uses GitHub's
real markup (`<section class="footnotes" data-footnotes>`, `fn-1` ids,
`aria-label`s) instead of `MD_LEGACY::`'s custom `<div class="footnotes">`
— checked against `packages/canva/src/styles/prose.scss` first, whose
`.footnotes`/`.footnote-backref` rules are plain class selectors that keep
matching regardless of the element tag, so nothing broke. The diff also
surfaced a pre-existing `MD_LEGACY::` bug, now moot: its single-pass list
regex used to drop a `1.`/`2.` ordered list entirely when it immediately
followed an unordered one with no blank line between; `MD::` (native)
handles it correctly.

Kept the old implementation as `MD_LEGACY` (`md-legacy.class.php`) —
untouched, still autoloadable — as a rollback path, same as
`YAML_LEGACY`. Unlike the `YAML::` swap, `MD_LEGACY`'s default-plugin
include was dropped from that file (it hardcoded `MD::registerPlugin(...)`,
which would otherwise register against the *new* native class instead of
itself) — reviving `MD_LEGACY` for real use would need that wired back.

## Core-API / CLI split (`refactor/core-api`)

`@kirigami/kirigami` is now the pure engine (`Project.load()/.reload()/
.validate()/.build()/.serve()/.watch()/.export()/.run()`); the CLI was
extracted into a new package, `@kirigami/cli` (command `kiri` unchanged —
no renaming). `build`/`serve`/`watch`/`export`/`run` in the CLI are now
pure wrappers around `Project`. Rationale: any other interface (an editor
extension, an MCP server, a script) can drive Kirigami programmatically
without going through a terminal.

- **Command registry for plugins**, in direct response to plugins needing
  to install their own commands: `@kirigami/sdk` gained
  `registerCommand()`/`getCommand()`/`listCommands()`, parallel to `on()`
  for hooks. The CLI dispatcher tries a built-in file (`bin/cmd/<name>.js`)
  first, then — if absent — loads the project (running each plugin's
  `register()`) and checks the sdk registry.
- **The two dispatch mechanisms (built-in files vs. plugin registry) stay
  separate, on purpose — not unified.** A built-in is resolved by filename
  *before* the project loads, which is what lets `kiri phpinfo`/`kiri
  create`/`kiri --help` work with no `kirigami.yaml` at all, and avoids
  paying the cost of loading a project just to check if a command exists.
  The registry is only populated by `loadPlugins()`, which needs an
  already-loaded project — a plugin gets that "for free" since it must
  load the project anyway for its `register()` to run. Routing built-ins
  through the same registry would force *every* command, even ones that
  need no project, to load one first just to know its name — a real
  regression, not a simplification.
- `create`/`install`/`cache`/`phpinfo` **deliberately not migrated** to
  `Project` methods — `create` has no project loaded yet (it creates one),
  `install` shells out to `npm` before plugins even load, and
  `cache`/`phpinfo` don't touch `kirigami.yaml` at all.
- Only one project can be loaded per process (`process.cwd()` is baked
  into `config.js`/`plugins.js`/`runscript.js`). Loading a project at an
  arbitrary path, different from the cwd, isn't supported.
- The `@kirigami/sdk` hooks/commands registry is **process-global** — a
  `Project.reload()` resets the hooks of *every* loaded project in the
  process, not just the one being reloaded. No consequence while only one
  project loads at a time, but a real limitation if an embedder (e.g. a VS
  Code extension) ever needs several Kirigami workspaces open at once.
- Not yet published to npm as of this writing; `../template-*/` and the
  site don't point at `@kirigami/cli` yet.

## `seo:` block replaces `meta:` + `jsonld:` (breaking, both 2.0.0)

Merged into one top-level `seo:` block (`jsonld` nested inside it),
user-requested for one encapsulated "SEO system" instead of two blocks
that happened to share fallback data. Every independent on/off switch and
fallback chain is otherwise unchanged — the merge is purely about *where*
the config lives, not how it resolves.

## `font-style-detect()`'s `"ital-axis"` sentinel: guarded, not split

`canva/conf.scss`'s `@font-face` loop now calls the existing
`font-style-detect($path)` instead of hardcoding `font-style: normal`. For
a variable font with a binary `ital` axis, that function returns a
sentinel (`"ital-axis"`), not a real CSS value — nothing consumes it
anywhere, so emitting it as-is would produce invalid CSS
(`font-style: ital-axis;`). Guarded back to `normal` (same behavior as
before) rather than splitting the `@each` loop into two `@font-face`
blocks (one per `ital` value) — open question in [BUGS.md](BUGS.md) if a
project ever actually uses such a font.

## `injectHead()`'s "already referenced" check: regex tag match, not `str_contains`

The old check (`str_contains($contents, $out)`) matched the compiled
file's name anywhere in the rendered HTML — a page that merely *mentions*
that name in prose or a `<code>` block (e.g. docs showing real `kiri
build` output) got its real `<link>`/`<script>` injection skipped.
Replaced with `hasAssetTag()`, a regex that targets an actual
`<link href="…">` / `<script src="…">` tag containing the name.

## Page types: explicit `prepros.types` dict, header/footer pair, single flat type

Design discussed with Maxime for a "page type" concept: a page opts in with
`@type <name>` and gets wrapped with type-specific markup *inside* the
site's real global `before`/`after`, without touching them. Three choices
made, all deliberate:

- **Explicit `prepros.types.<name>.{before,after}` in `kirigami.yaml`**,
  not convention-based path discovery (e.g. auto-resolving
  `_layouts/types/<name>.header.php`). Consistent with how the *global*
  `before`/`after` are already explicit yaml paths rather than inferred —
  it documents/autocompletes via `kirigami.schema.json`, and a type isn't
  forced into a fixed subfolder. The cost is one yaml entry per type, judged
  acceptable since a site has a handful of types at most, not dozens.
- **A header/footer pair per type** (mirroring the global `before`/`after`
  shape), not a single template file with a content placeholder. Keeps both
  sides executable PHP with hook symmetry (`pre_type_before`/
  `post_type_before`/`pre_type_after`/`post_type_after`, matching the
  existing `pre_before`/`post_before`/`pre_after`/`post_after`), rather than
  introducing a second, different templating mechanism alongside the
  existing include-based one.
- **Single flat type per page, no inheritance/stacking** — Maxime's explicit
  call. Covers the common case (a handful of named page kinds, each with its
  own extra chrome) without the complexity of resolving multiple nested
  types. Revisit only if a real project needs to compose types.

Implementation: `PREPROS::render()` wraps `$body` with the type's
before/after (via `$type`, already available for free since PHPDOC tags are
extracted generically — no parser change needed) right after the
`@indent` reflow and before the global `after` include. A missing `@type`
or an unmatched type name resolves to `null` through PHP's `??`
null-coalescing chain (safe even through an unset `self::$config->types`),
so the page falls back to exactly today's global-only behavior — this was
the main risk to guard since page types must never change existing sites
that don't use them.

## `php-prepros` bootstrap: `auto_prepend_file`, not `auto_append_file`+exit

Maxime wanted the framework bootstrap (`src/utils.inc.php` — autoloader,
`$argv`/`$config`, aliases, `boot` hook) loaded through php.ini's
`auto_prepend_file`/`auto_append_file` instead of the explicit
`include(__DIR__.'/utils.inc.php')` repeated at the top of `prepros.php`,
`runenv.php`, and `imagebatch.php`. `@kirigami/php-wasm` already exposes a
working `setIniValues()` (VFS-based php.ini rewrite, same idiom as the CA
bundle injection) — so `auto_prepend_file` pointed at
`/prepros/utils.inc.php`, set once in `prepros.js`'s `getPHPInstance()`,
is a clean 1:1 replacement: PHP runs it in the same global scope right
before the main script, exactly like the `include()` it replaces.

`auto_append_file` is a trap here, though: **every** entrypoint ends via
`STD::succeed()`/`STD::error()`, both of which call `exit()` — and PHP
documents that `auto_append_file` is skipped whenever the script
terminates through `exit()`/`die()`. Anything placed there would be dead
code that silently never runs. Used `register_shutdown_function()` from
inside `utils.inc.php` instead, firing a new `shutdown` hook symmetric to
the existing `boot` hook — shutdown functions run regardless of `exit()`,
which is exactly the guarantee `auto_append_file` can't give here.
Verified with a local fixture (see [STATUS.md](STATUS.md)): the hook
fires even through `STD::succeed()`'s `exit()`, but a `PREPROS::exportFile()`
call made from *inside* a shutdown hook is too late to reach the JSON
result — `STD::succeed()` snapshots `getExportedFiles()` before `exit()`
triggers the shutdown sequence. `shutdown` hooks are for side effects
(logging, flushing an external resource), not for growing the build's
`files` list.

## `@kirigami/mcp`: a sibling package to `@kirigami/cli`, not a subpath or inline feature

Discussed three shapes for exposing Kirigami to an AI agent over MCP: code
inline in `@kirigami/kirigami`, an optional subpath export of that same
package, or a separate package. Landed on a separate package,
`@kirigami/mcp`, depending on `@kirigami/kirigami` — same relationship
`@kirigami/cli` already has, on the same branch that just extracted it for
this exact reason.

Why not inline: `packages/kirigami/index.js`'s own docblock already
anticipated this — `Project` is documented as being for "a long-lived
embedder — a VS Code extension, an MCP server, a script," i.e. the API is
meant to stay agent-agnostic. Baking `@modelcontextprotocol/sdk` (and its
`zod` peer dep) into `@kirigami/kirigami` would force that dependency on
every consumer of `Project` — the CLI, a future VS Code extension, any
script — even though only an MCP client actually needs it. Same "stay
lite" reasoning behind keeping every package's dependency list to what
that package itself actually uses.

A **VS Code extension** (on [ROADMAP.md](ROADMAP.md), not started) is a
different consumer again: it would import `@kirigami/kirigami` directly,
in-process, the same way `@kirigami/cli` does — going through
`@kirigami/mcp`'s stdio server to talk to itself would be a pointless
subprocess+JSON-RPC detour. `@kirigami/mcp` is for an actual external MCP
client (Claude, Copilot Chat, …); VS Code does support extensions
registering MCP servers, so the extension could *additionally* register
`@kirigami/mcp` for its own in-editor AI chat, but that's a bonus wiring,
not the extension's primary path to the API.

`serve`/`watch` are excluded from the tool set: both start a long-running
process (HTTP server, filesystem watcher) that doesn't return, which
doesn't fit a request/response MCP tool call. Revisiting that needs a
background-process model (spawn + `status`/`stop` tools), not attempted
here.

Every tool but `kirigami_validate` calls `project.reload()` before acting
rather than trusting `Project`'s own lazy `#loaded` cache — an MCP server
is long-lived across many independent tool calls, and the expected agent
loop (edit a file, call a tool, read the result, edit again) means a
config snapshot from an earlier call is exactly the kind of staleness that
would silently mislead the agent.
