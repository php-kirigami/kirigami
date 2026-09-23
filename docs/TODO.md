# Todo

Small, concrete, near-term code action items; documentation debt belongs in [DOCTODO.md](DOCTODO.md). These are — not full features (those go in
[ROADMAP.md](ROADMAP.md)) and not open questions (those go in [BUGS.md](BUGS.md)).

- **Check the first CI run**: `.github/workflows/ci.yml` has never run. The suite already passes locally on Windows (Node 24 and 26) and on Linux (WSL, Node 24), so remaining risks are runner-specific (setup-php, npm ci, Node 26 on Linux).
- **VS Code packaging on other platforms**: interactive checks passed (2026-09-23) and the win32-x64 VSIX is built and tested; VSIX builds for other targets are not. See [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md) for reproducible checks.
- **php-wasm: regression test for multi-module phpext packages**: the loader's `register()` path, `mysqlnd` dedup and ini ordering were verified by hand against `../php-wasm-compiler/packages`; no automated test covers them (they need real `.so` artifacts).
- **Replace the `SCHEMA` class with jsonk**: php-prepros' `schema.class.php` is a ~550-line pure-PHP JSON Schema validator; the `jsonk` extension (php-kirigami/php-jsonk, already in the PHP-WASM binary) validates natively (`jsonk_validate()`, `jsonk_decode()`/`jsonk_encode()` with a schema, errors as `[{path, keyword, message}]` via `jsonk_get_last_errors()`). Keep the PHP API (`new SCHEMA($schema)`, `isValid()`/`validate()`/`getErrors()`, the `schema()`/`schema_validate()` aliases) as a thin wrapper: jsonk takes JSON strings, so encode the array schema and data, and map jsonk's errors to `getErrors()`'s current string format. Compare keyword coverage (Draft 7 vs jsonk's) first, then update php-prepros' README `SCHEMA` section.
