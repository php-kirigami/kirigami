<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/canva

Shared Sass and browser-JS design system for **Kirigami** projects.

[![npm version](https://img.shields.io/npm/v/@kirigami/canva)](https://www.npmjs.com/package/@kirigami/canva)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)

</div>

---

## Overview

`@kirigami/canva` bundles the design tokens, Sass helpers and small browser
scripts that Kirigami sites share: a colour/typography token set exposed as
CSS custom properties, an icon system that recolours inline SVGs at build time,
a handful of pure Sass utility functions, and a few DOM helpers.

Its `.scss` entries are meant to be compiled by kirigami-core's `sass` task,
which provides the native `inline-file()` / `font-*()` functions the token layer
relies on.

> **Work in progress.** `styles/main.scss` and the `Burger` component are still
> empty stubs; the API below is what currently ships.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/canva](#kirigamicanva)
  - [Overview](#overview)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [Package layout](#package-layout)
  - [Styles](#styles)
    - [`styles/conf`](#stylesconf)
    - [`styles/utils`](#stylesutils)
    - [`styles/main`](#stylesmain)
  - [Scripts](#scripts)
    - [`scripts/dom`](#scriptsdom)
    - [`scripts/helpers`](#scriptshelpers)
    - [`scripts/components/burger`](#scriptscomponentsburger)
  - [Build](#build)
  - [Requirements](#requirements)
  - [License](#license)

---

## Installation

```bash
npm install @kirigami/canva
```

Inside the monorepo it resolves automatically as a workspace dependency.

Import individual entries by subpath — there is no barrel export:

```js
import { create } from '@kirigami/canva/scripts/dom';
import { documentReady } from '@kirigami/canva/scripts/helpers';
```

```scss
@use '@kirigami/canva/styles/utils' as *;
@use '@kirigami/canva/styles/conf';
```

When the `.scss` is compiled by kirigami-core's `sass` task, its package
importer also accepts the `styles/` prefix implicitly, so
`@use '@kirigami/canva/conf'` resolves to the same file.

---

## Package layout

```
@kirigami/canva
└── dist/                      # the only published/consumed directory
    ├── scripts/
    │   ├── dom.js             # + dom.js.map, dom.d.ts when present
    │   ├── helpers.js
    │   └── components/
    │       └── burger.js
    └── styles/
        ├── conf.scss
        ├── utils.scss
        └── main.scss
```

`dist/` is generated from `src/` by [`build.js`](./build.js): scripts are
transpiled one-to-one with esbuild (no bundling), `.d.ts` files are copied
through, and `styles/` is copied verbatim.

---

## Styles

Exposed under the `@kirigami/canva/styles/*` subpath.

### `styles/conf`

The token layer. Declares the palette, typography and icon set as `!default`
Sass variables, then:

- emits an `@font-face` rule for every entry of the `$fonts` map, using
  kirigami-core's native `inline-file()` and `font-weight-range()` /
  `font-stretch-range()` / `font-format()` / `font-unicode-range()` functions;
- mirrors every token onto `:root` as a CSS custom property (`--bg`,
  `--accent`, `--font-size`, `--transition-duration`, …);
- builds one `--icon-<name>` custom property per entry of the merged
  `$icons-defaults` + `$icons` map, running the SVG source through
  `apply-colors()` (placeholder substitution) and `svg-url()` (data-URI
  encoding) so icons pick up the current palette;
- ships a minimal reset (`* { margin: 0; box-sizing: border-box }`), smooth
  scrolling with `scroll-padding-top: var(--scroll-top)`, a responsive
  `font-size`, and `.is-busy` / `.is-working` cursor-lock states on `<html>`.

Override any token through `@use ... with (...)` (or `@forward ... with (...)`
when re-exposing it from a project partial):

```scss
// src/styles/partials/_conf.scss
@forward "@kirigami/canva/conf" with (
    $bg:          #f5f8f6,
    $surface:     #e7f0ea,
    $ink:         #263b30,
    $accent:      #c08a2e,
    $font-body:    "Roboto Flex",
    $font-heading: "Quicksand",
    $fonts: (
        "Roboto Flex": "assets/fonts/roboto-flex.woff2",
        "Quicksand":   "assets/fonts/quicksand.woff2",
    ),
);
```

### `styles/utils`

Dependency-free Sass functions (`@use` with `as *`):

| Function | Purpose |
|---|---|
| `wash($bg, $base, $amount)` | `color.mix($base, $bg, $amount)` — tint/shade a colour toward the background. |
| `hex6($c)` | Colour → lowercase `#rrggbb` string (drops any alpha). |
| `hexbin($c)` | Colour → lowercase `rrggbb` (no leading `#`). |
| `str-replace($string, $search, $replace: "")` | Recursive string replace-all. |
| `url-encode($string)` | Percent-encodes `% < > # "` for use in a `url()`. |
| `svg-url($svg)` | Wraps raw SVG markup into a `url("data:image/svg+xml,…")`. |
| `apply-colors($svg, $colors)` | Replaces each `%name%` placeholder in an SVG string with the mapped colour. |

### `styles/main`

Currently an empty entry point, reserved for the shared component styles.

---

## Scripts

ESM modules, browser target (`es2022`), exposed under
`@kirigami/canva/scripts/*`. Each source file compiles to its own dist file —
import them individually.

### `scripts/dom`

```js
import { create } from '@kirigami/canva/scripts/dom';
```

| Export | Signature | Description |
|---|---|---|
| `create` | `create(tag, classname?, content?, attrs?) → HTMLElement` | Creates an element, optionally setting `className`, `innerHTML`, and attributes from an object. |
| `HTMLElement.prototype.create` | `el.create(tag, classname?, content?, attrs?) → HTMLElement` | Same as `create()`, but also appends the new element to `el` and returns it. **Side effect:** importing this module patches `HTMLElement.prototype`. |

### `scripts/helpers`

```js
import { busy, working, preloadImage, documentReady } from '@kirigami/canva/scripts/helpers';
```

| Export | Signature | Description |
|---|---|---|
| `busy` | `busy(promise \| promise[]) → Promise` | Adds `is-busy` to `<html>` while the promise(s) settle (`Promise.allSettled`), then removes it. Returns the settled result(s). |
| `working` | `working(promise \| promise[]) → Promise` | Same, with the `is-working` class. |
| `preloadImage` | `preloadImage(url) → Promise<'preloaded' \| 'memory-cache'>` | Resolves once the image has loaded (or immediately if already cached), rejects on error. |
| `documentReady` | `documentReady(cb?) → Promise` | Resolves on `DOMContentLoaded` (or immediately if the document is already parsed); resolves with `cb()`'s return value when a callback is given. |

### `scripts/components/burger`

Empty class stub (`export default class Burger {}`) — placeholder for the
shared nav-toggle component.

---

## Build

```bash
npm run build      # one-shot: wipes and regenerates dist/
npm run watch      # rebuild on change under src/
```

`build.js` depends only on `esbuild`, `chokidar` and `fast-glob` (all dev
dependencies).

---

## Requirements

- Node.js `>= 24.0.0`
- npm `>= 10.2.3`
- ESM only (`"type": "module"`)

---

## License

MIT © Maxime Larrivée-Roy, 2026
