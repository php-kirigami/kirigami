# Roadmap

Unscheduled feature directions for Kirigami. Concrete near-term work belongs in
[TODO.md](TODO.md), known defects and unresolved limitations in
[BUGS.md](BUGS.md), and completed work in [STATUS.md](STATUS.md).

The architectural direction is one `Project` engine shared by the CLI, MCP,
VS Code, and any future GUI. New interfaces should extend that engine rather
than reproduce its workflows.

## Project and build extensibility

- **Custom task types (`kirigami.type: "task"`)** — let packages extend the
  fixed task loader. Command packages already use the SDK command registry.
- **`prepros:before-render` hook** — add a JavaScript hook before PHP rendering;
  `prepros:html` already covers generated HTML afterward.
- **Composer support** — mount a project's `vendor/` tree and load
  `vendor/autoload.php`, with explicit compatibility limits for the WASM
  environment.
- **PHPDOC inheritance** — let `FS::phpFileInfo()` inherit page metadata from
  ancestor `_index.php` files so section defaults do not need repetition.
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
- **Official document importers** — provide Google Docs to Markdown and Excel
  to JSON actions or scripts for page and `_data/` inputs.

## Generated site features

- **Analytics integration** — inject Google Analytics `gtag.js` from a
  measurement ID in the unified `seo:` configuration.
- **No-build theme toggle** — optionally inject the small Canva theme runtime
  when `data-theme-toggle` is present, while keeping `canva/theme.js` as the
  source of truth for the storage, event, and attribute contract.
- **Icon generation** — generate `favicon.ico` and `apple-touch-icon.png` from
  one source image through Imagick and the existing image configuration.
- **Highlight line numbers** — add a `plugin-highlight` option and matching
  generated markup/styles for numbered code blocks.
- **React template** — define whether an official JSX/TSX template produces
  build-time static HTML, client hydration, or both before adding it.

## Interfaces and delivery

- **MCP background operations** — expose serve/watch only with explicit
  start, status, and stop ownership for their long-lived resources.
- **Editor integration beyond v1** — after the current VSIX verification,
  consider editor diagnostics, task integration, multi-root workspaces, and
  optional MCP registration.
- **Deploy command and provider plugins** — deploy an exported `dist/` through
  FTP, Git branches, or other providers without replacing kiribuild's GitHub
  Pages workflow.
- **Desktop UI** — provide an Electron interface for users outside an editor,
  backed by the same `Project` API as the existing surfaces.
- **SchemaStore registration** — submit `kirigami.schema.json` so YAML tooling
  can discover it without a per-file schema comment.

## Runtime and toolchain

- **Reproducible PHP-WASM builder** — evolve the existing upstream-derived
  compiler into a clearly owned build pipeline for PHP, libraries, and bundled
  extensions. Scope the supported extension matrix and reproducibility checks
  before replacing the current process.
