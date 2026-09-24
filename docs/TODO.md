# Todo

Small, concrete, near-term code action items; documentation debt belongs in [DOCTODO.md](DOCTODO.md). These are — not full features (those go in
[ROADMAP.md](ROADMAP.md)) and not open questions (those go in [BUGS.md](BUGS.md)).

- **VS Code packaging on other platforms**: interactive checks passed (2026-09-23) and the win32-x64 VSIX is built and tested; VSIX builds for other targets are not. See [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md) for reproducible checks.
- **mdhtml expands shortcodes inside code**: fixed in `../php-mdhtml` v0.1.5 (a903218, tag pushed); a `{% name %}` inside inline code or an indented code block now renders literally. Waiting on a PHP-WASM rebuild with that tag; then add a php-prepros test (inline code, double backticks, indented block) and check `template-default`'s About page.
