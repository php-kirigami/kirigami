# Todo

Small, concrete, near-term code action items; documentation debt belongs in [DOCTODO.md](DOCTODO.md). These are — not full features (those go in
[ROADMAP.md](ROADMAP.md)) and not open questions (those go in [BUGS.md](BUGS.md)).

- **VS Code packaging on other platforms**: interactive checks passed (2026-09-23) and the win32-x64 VSIX is built and tested; VSIX builds for other targets are not. See [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md) for reproducible checks.
- **php-wasm: regression test for multi-module phpext packages**: the loader's `register()` path, `mysqlnd` dedup and ini ordering were verified by hand against `../php-wasm-compiler/packages`; no automated test covers them (they need real `.so` artifacts).
- **SCHEMA test for object `enum`/`const`**: once `@kirigami/php-wasm` ships jsonk 0.1.5 (object equality fix), add an `enum`/`const` object case to `packages/php-prepros/test/schema.test.js`; with jsonk 0.1.4 such schemas never match.
- **mdhtml expands shortcodes inside code** (`../php-mdhtml`, then a PHP-WASM rebuild): with mdhtml 0.1.4, `{% name %}` runs inside inline code spans and indented code blocks (fenced blocks are fine); the old pure-PHP `MD` left them literal. Visible in `template-default`'s About page, where `` `{% lead %}` `` renders as an empty `<code></code>`. Add a php-prepros test once fixed.
