# Roadmap

Unscheduled feature directions for Kirigami. Concrete near-term work belongs in
[TODO.md](TODO.md), known defects and unresolved limitations in
[BUGS.md](BUGS.md), and completed work in [STATUS.md](STATUS.md).

The architectural direction is one `Project` engine shared by the CLI, MCP,
VS Code, and any future GUI. New interfaces should extend that engine rather
than reproduce its workflows.

## Project and build extensibility

- **`prepros:before-render` hook** — add a JavaScript hook before PHP rendering;
  `prepros:html` already covers generated HTML afterward.
- **Composer support** — mount a project's `vendor/` tree and load
  `vendor/autoload.php`, with explicit compatibility limits for the WASM
  environment.
- **esbuild package resolution** — provide an importer equivalent to the Sass
  importer if hooks begin supplying package specifiers instead of the current
  absolute entry paths.
- **Local CI environment file** — support a gitignored variable file using the
  same names as GitHub Actions for reproducible local runs.

## Content and data

- **Internationalization** — externalize strings first, then define language
  routing, project layout, and `hreflang` behavior.
- **WordPress REST client** — provide a PHP helper, similar to `SCRAPER`, for
  posts and other `/wp-json/` resources.
- **Database bridge** — expose the bundled `navicat` extension through a
  PHP-prepros API for MySQL, PostgreSQL, and SQLite HTTP-tunnel queries.
- **Native JSON Schema validation** — assess `jsonk` against Kirigami and plugin
  schemas, then replace `SCHEMA`'s pure-PHP validator only if compatibility is
  demonstrated. Its JSON encode/decode replacement is already active.
- **JSONPath in the PHP classes** — the runtime ships the `jsonpath` extension
  (php-wasm 8.5.11-2); a small PHP-prepros wrapper would make it as easy to
  reach from a page as `YAML::` and `MD::`.

## Plugins

- **`plugin-gdrive` (Google Docs/Sheets)** — build a site from Google Drive:
  Docs become Markdown pages, Sheets become `_data/` files, so editors never
  touch the repo. Cache fetched documents on disk like plugin-extlink so rebuilds and CI
  only download what changed. Open: access model (published-to-web links vs.
  a service-account token from the environment), page/section mapping, and
  image handling. Replaces the earlier Docs→Markdown / Excel→JSON importer
  scripts idea. Markdown pages (`_index.md`, shipped in 3.2) are what its Docs
  would become.

## Generated site features

- **Analytics integration** — inject Google Analytics `gtag.js` from a
  measurement ID in the unified `seo:` configuration.
- **No-build theme toggle** — optionally inject the small Canva theme runtime
  when `data-theme-toggle` is present, while keeping `canva/theme.js` as the
  source of truth for the storage, event, and attribute contract.
- **Icon generation** — generate `favicon.ico` and `apple-touch-icon.png` from
  one source image through Imagick and the existing image configuration.
- **React template** — define whether an official JSX/TSX template produces
  build-time static HTML, client hydration, or both before adding it.

## Interfaces and delivery

- **MCP background operations** — expose serve/watch only with explicit
  start, status, and stop ownership for their long-lived resources.
- **Editor integration beyond v1** — after the current VSIX verification,
  consider editor diagnostics, task integration, and multi-root workspaces.
- **MCP discovery beyond Claude Code and the VS Code extension** — today only
  the starter `.mcp.json` (read by Claude Code) and the extension's
  `mcpServerDefinitionProviders` registration expose `kiri mcp` automatically.
  Extend `createProject()`'s starter tooling so other clients find it too,
  following the existing rule (write only when missing, never merge):
  - `.vscode/mcp.json` (`servers` key, `type: "stdio"`) for VS Code without
    the extension;
  - `.cursor/mcp.json` (`mcpServers`) for Cursor;
  - `.gemini/settings.json` (`mcpServers`) for Gemini CLI — a general settings
    file, so an existing one must be left alone;
  - `.codex/config.toml` (`[mcp_servers.kirigami]`) for Codex, if its
    project-scoped config is reliable; otherwise document `codex mcp add`;
  - `.zed/settings.json` (`context_servers`) for Zed;
  - global-only clients (Windsurf, Claude Desktop) get a documented snippet in
    the MCP README instead of a generated file.

  Decide whether these are written by default or behind an opt-in (e.g.
  `--agents cursor,codex`), since each adds a tool-specific file to every
  project. All must reuse the same
  `node node_modules/@kirigami/cli/bin/kiri.js mcp` command to stay
  cross-platform.
- **Deploy command and provider plugins** — deploy an exported `dist/` through
  FTP, Git branches, or other providers without replacing kiribuild's GitHub
  Pages workflow.
- **Kiri Studio, next** — the Electron app for site owners
  ([php-kirigami/kiri-studio](https://github.com/php-kirigami/kiri-studio), released) still needs signed
  installers (which would also turn on macOS auto-updates), more than one
  images folder per site, and a wider check against real clients' sites. See its
  [plan](https://github.com/php-kirigami/kiri-studio/blob/main/docs/PLAN.md).
- **MCP that knows about Studio** — `kirigami_validate` accepts a `studio:` block
  but nothing explains it: add a `studio` topic to `kirigami_doc_hints` and an
  example to `kirigami_site_blueprint`.
- **SchemaStore registration** — submit `kirigami.schema.json` so YAML tooling
  can discover it without a per-file schema comment.

## Runtime and toolchain

- **Reproducible PHP-WASM builds** — add reproducibility checks to
  `../php-wasm-compiler/` (same `config.yaml` → same PHP, libraries, and
  bundled extensions) and scope the supported extension matrix.
