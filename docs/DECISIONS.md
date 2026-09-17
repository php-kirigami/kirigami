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
