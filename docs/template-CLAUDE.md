# CLAUDE.md

> **Maintainer note (delete this block in a real project).**
> This file is the shared `CLAUDE.md` template for Kirigami site/template
> projects. It is edited in `php-kirigami/kirigami` under `docs/template-CLAUDE.md`
> and copied to the root of each `template-*` repo as `CLAUDE.md`. Fill in the
> first section per project; everything from "Working with Kirigami" onward is
> generic and copied verbatim. Keep it short: detailed reference belongs in the
> package READMEs it points to, project history in a `docs/` folder.

Project context and working conventions for Claude and contributors.

---

## What this project is

<!-- FILL IN PER PROJECT -->

- **Name:** _(the site / template name — matches `kirigami.project`)_
- **Kind:** _(demo template · real site · starter)_
- **Repo:** `php-kirigami/<repo>` (`origin`, branch `main`).
- **Deployed to:** _(e.g. GitHub Pages at `https://php-kirigami.github.io/<repo>/`)_,
  built in CI by [`php-kirigami/kiribuild`](https://github.com/php-kirigami/kiribuild).
- **Built with [Kirigami](https://github.com/php-kirigami/kirigami)**: PHP page
  templates compiled to dependency-free static HTML by PHP 8.5 running in
  WebAssembly inside Node (no PHP install, no server). One `kirigami.yaml` at the
  project root drives everything.

If this repo appears in `kiri create --list`, it is a public template: keep
content generic, commit no secrets, and assume anyone may clone it.

---

## Conventions

- **Node `>= 24.0.0`**. ESM only (`"type": "module"`) in any JS you add.
- **Project content in English** (code, comments, site copy, docs, commit
  messages). Talk with the user in French.
- **Indent 4 wide** (PHP, HTML, SCSS, JS); follow `.editorconfig` for tabs vs spaces.
- **Stay lite**: no framework or native-dep library when a `node:` builtin, a
  PHP helper class, or ~30 lines of code will do.
- **Lean markup**: authors should write as little raw HTML as possible. Prefer a
  page type, a registered tag or a `<markdown>` block over repeated markup;
  prefer `::before`/`::after` over extra elements; no `style=""` attributes
  (use classes); sizes in `em`/`rem`, never `px`.
- **Dev machine is Windows** (PowerShell): mind path separators in scripts.

---

## Project structure

```
.
├── kirigami.yaml          # the one config file
├── package.json           # dev deps: @kirigami/cli, @kirigami/kirigami, @kirigami/canva, plugins
├── assets/images/         # originals for the image autogenerator (not served)
├── assets/fonts/          # fonts inlined by the Sass font functions
├── scripts/<name>.php     # named PHP scripts for `kiri run` / triggers
└── src/                   # = kirigami.root: everything here is the site
    ├── _layouts/          #   header.php / footer.php (prepros before/after), page-type layouts
    ├── _lib/              #   PHP loaded via prepros.includes (tags, hooks, helpers)
    ├── _index.php         #   → src/index.html
    ├── about/_index.php   #   → src/about/index.html
    ├── styles/, scripts/  #   Sass / esbuild task entries → *.min.css / *.min.js
    └── images/            #   = image.dest: generated, never hand-edited
```

- `_name.php` is a page source and compiles to `name.html` next to it.
- Directories starting with `_` are skipped by builds: partials, layouts, data.
- `.yaml`/`.json`/`.md` files are data, loaded by pages through annotations.
- `kiri export` copies `src/` into `dist/` without PHP, Sass, source maps,
  non-minified JS, private (`_`/`.`) files or `export.ignore` matches, and
  stamps `banner.txt`.

---

# Working with Kirigami

## Commands

Run through the project's `@kirigami/cli` dev dependency: `npx kiri <command>`.

| Command | What it does |
|---|---|
| `kiri serve` | Initial build, then watch + local server with browser reload (`--port`, default 4321). |
| `kiri watch` | Initial build, then rebuild on change. No server. |
| `kiri build` | One development build, output next to each source under `src/`. |
| `kiri export` | Production build into `dist/`. |
| `kiri run <script>` | Run `scripts/<script>.php` in the Kirigami PHP runtime. |
| `kiri cache purge [mask]` | Clear `.cache.db` / `.node.db` / `.cookie.txt`. |

Every command has `--help`. In VS Code, the Kirigami extension
(`php-kirigami.kirigami-vscode`) runs the same build, export, script and dev
server from the Command Palette and the status bar.

## Writing pages

A page starts with a PHPDOC block; each `@key value` becomes `$key` in the page
and in its layouts:

```php
<?php
/**
 * @title    About us
 * @abstract A short description of this page.
 * @type     doc
 * @articles _articles.yaml
 */
?>
<markdown>
Plain **Markdown** here, mixed freely with <?= $title ?> PHP.
</markdown>
```

- **Data annotations**: a value naming a `.yaml`/`.yml`/`.json`/`.md` file next
  to the page is loaded as data (`.md` → HTML). `@content <file>` uses such a
  file as the whole page body.
- **Page types**: `@type doc` wraps the body in `prepros.types.doc.before`/`after`
  (from `kirigami.yaml`), inside the global `prepros.before`/`after`. Use a type
  for any chrome that several pages repeat (page head, sidebar, prev/next nav)
  instead of copying markup into each page.
- **In scope**: every `kirigami:` key (`$project`, `$baseurl`, …), every
  annotation, `$relroot` (relative path back to `src/`, for links and assets)
  and `$absurl` (the page's URL path).
- **Built-in tags**: `<markdown>` (optionally `<markdown prose>`),
  `<img asset="photo.jpg" width="600" cover>` (generated image), plus tags that
  plugins and `_lib/` files register.
- **`<head>` is managed**: stylesheets and scripts of `sass`/`esbuild` tasks,
  the theme guard and SEO metadata (`seo:` block) are injected; don't hand-write them.

## Reference: read the installed READMEs

The installed packages document the exact versions this project uses. Read
them instead of guessing an API:

| Topic | Where |
|---|---|
| `kirigami.yaml` keys, tasks, export, Sass functions, image autogenerator | `node_modules/@kirigami/kirigami/README.md`, schema `kirigami.schema.json` |
| `kiri` commands and flags | `node_modules/@kirigami/cli/README.md` |
| Pages, annotations, page types, tags, hooks, SEO, PHP classes (`MD`, `YAML`, `IMG`, `FS`, `CACHE`, `CURL`, `SCRAPER`…) | `node_modules/@kirigami/php-prepros/README.md` |
| Design tokens, `conf`/`prose` styles, browser helpers (`theme`, `observer`) | `node_modules/@kirigami/canva/README.md` |
| Each plugin's tags and options | `node_modules/@kirigami/plugin-*/README.md` |
| Guides and tutorial | <https://php-kirigami.github.io> |

## Deployment

`.github/workflows/page.yml` runs
[`php-kirigami/kiribuild@v2`](https://github.com/php-kirigami/kiribuild) on each
push to `main`: `kiri export`, commit back regenerated files (e.g. `src/images/`),
publish `dist/` to GitHub Pages (Settings → Pages → Source: GitHub Actions).
Keep `@kirigami/cli` in `devDependencies` so the action uses the project's `kiri`.

## Files that may be committed

- Rendered `src/**/index.html` are often committed so `src/` previews as is. A
  literal `?###TIMESTAMP###` in them is expected (only export expands it).
- `.cache.db`, `.node.db` and `.cookie.txt` are build caches; check `.gitignore`
  before touching them, and never publish a cookie jar.
- `dist/` is build output and stays ignored.

## License

Set the site's own license explicitly. Kirigami packages are GPL-3.0-or-later,
except PHP-WASM (GPL-2.0-or-later) and bestframe (LGPL-2.1-or-later); that
doesn't change the license of a site built with them.
