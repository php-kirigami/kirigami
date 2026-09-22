# Build your first Kirigami site

Kirigami executes PHP during the build and produces static HTML. Your deployed site does not need PHP. Use Node 24+ and npm; the PHP runtime is supplied by WebAssembly. This guide uses a source directory separate from the export directory so production export can safely replace its output.

## Create the project

In a new directory, run:

```bash
npm init -y
npm install --save-dev @kirigami/cli
```

The CLI package provides `kiri`; installing only `@kirigami/kirigami` provides the JavaScript engine. These instructions describe the current checkout's CLI split. Published-package and starter-template verification remains a release follow-up in [DOCTODO.md](DOCTODO.md).

Create these files:

```text
my-site/
  package.json
  kirigami.yaml
  src/
    _index.php
```

`kirigami.yaml`:

```yaml
kirigami:
  project: My first site
  root: src
  baseurl: https://example.com
prepros: {}
export:
  path: dist
```

`src/_index.php`:

```php
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My first site</title>
</head>
<body>
  <h1><?= htmlspecialchars($project, ENT_QUOTES, 'UTF-8') ?></h1>
  <p>Built with PHP, served as HTML.</p>
</body>
</html>
```

`baseurl` is the deployed site's URL, used for absolute site metadata such as sitemap URLs. It is not the address of the local preview server. The empty `prepros` block enables page rendering without requiring layout files.

## Build and preview

Run commands from the project directory containing `kirigami.yaml`:

```bash
npx kiri serve
```

Build renders `src/_index.php` to `src/index.html` and generates site metadata. Serve watches inputs and previews generated files at the URL it prints (default `http://127.0.0.1:4321`). It performs an initial build before starting; a build failure stops startup with diagnostics. Stop it with Ctrl+C.

Edit PHP source rather than generated HTML. Add `src/_about.php` for `about.html`, or `src/news/_index.php` for `news/index.html`. Use `kiri watch` when another server provides your preview. Restart the development command after changing task/plugin configuration so watch rules are recreated.

## Add layouts and assets

When multiple pages share markup, create wrapper files and configure them relative to `src`:

```yaml
prepros:
  before: _layouts/header.php
  after: _layouts/footer.php
```

Move the document opening through `<body>` into the header, and `</body></html>` into the footer; pages then contain their body content. Create both referenced files before building. See [the PHP-prepros reference](../packages/php-prepros/README.md) for page types, Markdown, YAML data, images, and SEO, and [core configuration](../packages/kirigami/README.md) for Sass/esbuild tasks. Public assets such as images can live under `src/assets`.

## Export and deploy

```bash
npx kiri export
```

Deploy the contents of `dist` to a static host. Export replaces that directory's contents and writes a `.kirigami-export` marker into it. An existing non-empty directory without that marker is refused rather than emptied: empty it yourself, or create the marker to confirm it may be replaced. Keep it dedicated to output; it must not equal, contain, or be contained by `src`, including through symlinks/junctions. A failed build/export may leave partial output, so deploy only after success.

The export copy excludes PHP, Sass sources, source maps, underscore/dot-prefixed private files, and non-minified JavaScript. Configure an esbuild task for JavaScript output; do not assume a raw `app.js` will be copied. Use `export.ignore` for additional private assets. Development serving allows JavaScript/source maps for debugging while still denying private/source paths; its file set differs from production export.

## Diagnose a problem

| Symptom | First check |
|---|---|
| `kiri` not found | Install `@kirigami/cli` in the project and use `npx kiri`. |
| Configuration not found | Run from the directory containing `kirigami.yaml`. |
| Empty preview or 404 | Check the initial build diagnostics and that the page uses the `_*.php` convention. |
| Invalid wrapper path | Layout paths are relative to `kirigami.root`; create the referenced file. |
| Unsafe export destination | Use separate source/output trees such as `src` and `dist`. |
| Plugin implementation changes are ignored | Restart the command; imported JavaScript modules are cached. |
| PHP extension startup warnings | Inspect [automatic discovery](../packages/php-wasm/README.md#automatic-extension-discovery); nearby extension packages may be loaded. |

Use `npx kiri <command> --help` for command options. [The CLI reference](../packages/cli/README.md) also covers scripts, plugins, templates, cache cleanup, PHP inspection, and MCP. For JavaScript embedding, continue with [API.md](API.md).
