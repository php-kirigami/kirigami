# Todo

Small, concrete, near-term code action items; documentation debt belongs in [DOCTODO.md](DOCTODO.md). These are — not full features (those go in
[ROADMAP.md](ROADMAP.md)) and not open questions (those go in [BUGS.md](BUGS.md)).

- **Check the first CI run**: `.github/workflows/ci.yml` has never run on GitHub. Its two Linux jobs pass under `act` (2026-09-23, Node 24 and 26 in parallel, 79 passed, 1 Windows-only skip); the Windows jobs can't run under act, but the suite passes locally on Windows with Node 24 and 26.
- **VS Code packaging on other platforms**: interactive checks passed (2026-09-23) and the win32-x64 VSIX is built and tested; VSIX builds for other targets are not. See [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md) for reproducible checks.
- **php-wasm: regression test for multi-module phpext packages**: the loader's `register()` path, `mysqlnd` dedup and ini ordering were verified by hand against `../php-wasm-compiler/packages`; no automated test covers them (they need real `.so` artifacts).
- **SCHEMA test for object `enum`/`const`**: once `@kirigami/php-wasm` ships jsonk 0.1.5 (object equality fix), add an `enum`/`const` object case to `packages/php-prepros/test/schema.test.js`; with jsonk 0.1.4 such schemas never match.
- **UDP readiness in the PHP-WASM build** (php-wasm-compiler): `__wrap_select` polls read descriptors with `POLLIN | POLLOUT`, so a UDP socket is "readable" once its WebSocket opens; and SOCKFS's `poll()` treats connectionless sockets as always readable. Fix both (read set → `POLLIN` only; datagram sockets readable only with a queued datagram), then replace the `MSG_DONTWAIT` loop in the UDP test with `socket_select()`.
