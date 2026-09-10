<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# Kirigami

**A static site generator that turns PHP into fast, dependency-free HTML — no server required.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/php-kirigami/kirigami/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![npm](https://img.shields.io/npm/v/@kirigami/kirigami?label=%40kirigami%2Fkirigami)](https://www.npmjs.com/package/@kirigami/kirigami)

</div>

---

## Overview

**Kirigami** lets you build static websites using a language you already know — **PHP** — and compiles them straight into clean, production-ready HTML. There's no server to provision, no runtime to patch, and no infrastructure to maintain: the PHP engine runs entirely in **WebAssembly**, directly inside the Node.js process. You get the full expressiveness of PHP templating with the simplicity, speed, and portability of a static site.

- **Real PHP templating** — includes, loops, Markdown, YAML — compiled directly to clean HTML, no server needed at runtime.
- **Integrated asset pipeline** with esbuild for JS and Sass for styles, wired in from the start.
- **A `watch` mode with hot-reload**, so changes show up instantly during development.
- **A single-command production export** — a fully static site ready to deploy anywhere (GitHub Pages, Netlify, any static host), with a license banner and an auto-generated sitemap.
- **Instant project scaffolding** from official templates via `kiri create`.
- **Continuous deployment** through the official [`kiribuild`](https://github.com/php-kirigami/kiribuild) GitHub Action.

Every project is driven by a single configuration file, `kirigami.yaml`, at the project root.

---

## Repositories

| Repository | Description |
|---|---|
| [`kirigami`](https://github.com/php-kirigami/kirigami) | The main monorepo: the `kiri` CLI, the PHP → HTML compiler, the PHP-WASM runtime, and every supporting package. |
| [`kiribuild`](https://github.com/php-kirigami/kiribuild) | The official reusable GitHub Action — build and deploy a Kirigami site straight from CI, typically to GitHub Pages. |

---

## Packages

All packages live in the [`kirigami`](https://github.com/php-kirigami/kirigami/tree/main/packages) monorepo and are published on npm under the [`@kirigami`](https://www.npmjs.com/org/kirigami) scope.

| Package | Description |
|---|---|
| [`@kirigami/kirigami`](https://www.npmjs.com/package/@kirigami/kirigami) | The heart of the project: the `kiri` CLI (build, export, watch, run, create, phpinfo). |
| [`@kirigami/php-prepros`](https://www.npmjs.com/package/@kirigami/php-prepros) | The PHP → HTML compiler that powers the CLI — template rendering, sitemap generation, and a full PHP class library. |
| [`@kirigami/php-wasm`](https://www.npmjs.com/package/@kirigami/php-wasm) | A custom PHP WebAssembly build for Node.js (JSPI only, no browser support). Distributed under **GPL-2.0-or-later**. |
| [`@kirigami/struct-walker`](https://www.npmjs.com/package/@kirigami/struct-walker) | Recursively walks YAML/JSON structures, resolving relative file references and converting assets to data URIs. |
| [`@kirigami/sdk`](https://www.npmjs.com/package/@kirigami/sdk) | Shared runtime for plugins: the hook registry and the on-disk `Cache`. |
| [`@kirigami/canva`](https://www.npmjs.com/package/@kirigami/canva) | Shared Sass/JS design system reused across Kirigami projects. |

---

## Quick start

Install the CLI:

```bash
npm install -D @kirigami/kirigami
```

Drop a `kirigami.yaml` at the root of your project:

```yaml
kirigami:
  project: "My Site"
  baseurl: "https://mysite.com"
  root: "src"

prepros:
  before: "_layouts/header.php"
  after: "_layouts/footer.php"
  format: true
```

Write your `_*.php` pages inside `src/`, then:

```bash
npx kiri watch     # dev mode with hot-reload
npx kiri export    # fully static site, ready to deploy
```

Full documentation lives in the [main repository README](https://github.com/php-kirigami/kirigami#readme).

---

## License

Everything is distributed under the [MIT license](https://github.com/php-kirigami/kirigami/blob/main/LICENSE), except for [`@kirigami/php-wasm`](https://www.npmjs.com/package/@kirigami/php-wasm), which is **GPL-2.0-or-later**.

---

## Author

MIT © Maxime Larrivée-Roy, 2026
