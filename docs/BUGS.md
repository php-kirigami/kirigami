# Bugs

Known open issues, limitations, and unresolved questions that need a
decision from Maxime before they can be closed. Remove an entry as soon as it
is fixed; what shipped goes to [STATUS.md](STATUS.md), and a non-obvious "why"
to [DECISIONS.md](DECISIONS.md). Audit evidence stays in the dated
`AUDIT-*.md` files.

## Open

- **`php-mdhtml` v0.1.3 in the PHP-WASM binary corrupts the heap across
  renders:** its plugin/emoji tables outlive the request while holding
  request memory. Plugins are worked around in php-prepros
  (`md.class.php` empties the table at shutdown); `MDHtmlRegisterEmoji()`
  has no unregister call, so a project registering custom emoji is still
  exposed. Fixed in `php-mdhtml` `v0.1.4` (committed locally, 2026-09-23),
  pending: push + tag `v0.1.4`, add it to `php-wasm-compiler`'s
  `matrix.json`, rebuild the WASM, then drop the workaround.

- **VS Code extension validation (A08 follow-up):** the development folder
  and the win32-x64 VSIX pass the real VS Code 1.138.0 smoke test. Older
  editors, interactive host behavior, and VSIX builds for other platforms are
  unverified; see [the extension guide](EXTENSION-VSCODE.md).
