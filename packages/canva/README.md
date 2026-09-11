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

> **Work in progress.** The `Burger` component is still an empty stub; the API
> below is what currently ships.

Part of the **Kirigami** project ecosystem.

---

## What's new in 2.5.0

- **`styles/main` — shared components.** No longer an empty stub. Five small,
  generic patterns lifted from what Kirigami sites kept re-implementing
  identically: `.breadcrumb` (pairs with php-prepros' `FS::getBreadcrumb()`),
  `.docs-toc` (a quick-jump anchor list for long reference pages), `.table` /
  `.table-wrap` (a generic data table, `&__num` for tabular-figure columns),
  `.badge` / `.badge--muted` (status/license tags), and `.palette` (a row of
  colour chips, for `IMG::palette()` / `colors()` output). All `conf` tokens,
  so light/dark comes for free. Opt-in via `@use "@kirigami/canva/main"`.
- **`conf` — themed native scrollbars.** The reset now sets
  `scrollbar-color: var(--border) var(--surface-2)` and `scrollbar-width: thin`
  on `<html>`, so scrollbars on overflowing content (a wide code block, an
  `<iframe>`) follow the palette instead of defaulting to white in dark mode.
  No opt-out flag — every project's `conf` already defines both tokens.

---

## What's new in 2.4.0

- **`styles/prose` — Markdown / long-form base styles.** A new partial with a
  `prose($measure, $flow)` mixin and, unless you `@use ... with ($emit-class:
  false)`, a ready-made `.prose {}` wrapper. Styles headings, lists, tables,
  quotes, code, media, definition lists and `<details>`, plus the GFM output
  `@kirigami/php-prepros`' `MD` class emits (`.task-list` / `.task-item`,
  `.markdown-alert*`, `.footnotes`). All colours are `conf` tokens, so it tracks
  the light / dark palette for free. Tunable at runtime through `--prose-measure`
  / `--prose-flow` / `--prose-radius`. `@kirigami/plugin-highlight`'s code theme
  still layers on top via its `sass:after` hook.
- **`reveal` — reveal-on-scroll.** A new script: `import '@kirigami/canva/reveal'`
  adds `is-in` to each `[data-reveal]` element as it scrolls into view (once,
  then unobserved). Reduced-motion, no `IntersectionObserver`, and a safety
  timeout all fall back to showing everything. Lifted from the copy the starter
  templates each carried in `kirigami.core.js`.

---

## What's new in 2.3.0

- **`conf` — theme-change transition.** When the dark palette is enabled
  (`$dark`), `conf` now emits a `background-color` / `background-image` / `color`
  transition (`var(--transition-duration)`) on every element, so a theme toggle
  or an OS switch eases between palettes instead of snapping. Guarded by
  `prefers-reduced-motion`; the first paint is not animated. A component that
  sets its own `transition` shorthand overrides this — re-add those properties
  there if you want them to animate too.

---

## What's new in 2.2.0

- **`helpers` — `dedent()`.** Strips the whitespace prefix shared by every
  non-blank line of a string, so a block indented for readability in its source
  (a fenced code block, a template literal, an authoring-tag body) renders
  flush-left with its relative indentation intact. See [`helpers`](#helpers).

---

## What's new in 2.1.0

- **`theme` — declarative toggles.** Mark up any control with
  `[data-theme-toggle]` (bare = flip light ⇄ dark, or `="dark|light|auto"` to
  force a preference) and importing `@kirigami/canva/theme` wires it — no click
  handler to write. Toggles reflect state via `data-theme-state` /
  `aria-pressed`, a `canva:themechange` event fires on `window`, and an OS
  switch re-syncs everything while in `auto`. New export `bindToggles()`. See
  [`theme`](#theme).

---

## What's new in 2.0.0

- **Script subpaths dropped the `scripts/` segment.** Scripts are now imported
  as `@kirigami/canva/<name>` — `@kirigami/canva/dom`, `.../theme`,
  `.../observer`, `.../components/burger`. The old `@kirigami/canva/scripts/*`
  paths no longer resolve. Styles are unchanged (`@kirigami/canva/styles/*`,
  and the bare `@kirigami/canva/<name>` the `sass` task also accepts).
- **`observer`** — a tiny tag-rewriting engine for "non-closing" authoring
  tags. `register('youtube', el => …)` and every `<youtube id="…">` already in
  the page (and every one added later) is handed to the handler and replaced by
  what it returns. Starts on import, sweeps the current document, then watches
  for additions via `MutationObserver`. This is the seam plugins hook into. See
  [`observer`](#observer).

---

## What's new in 1.1.1

- **The fluid root font-size has a floor.** `--font-size` is now
  `clamp(var(--font-min), var(--font-resp), var(--font-base))` — previously a
  bare `min(--font-resp, --font-base)` with no lower bound, which let a narrow
  viewport collapse the root font (and every `rem` measured against it). Tune
  the bounds with the new `$font-min` (default `17`) and the existing
  `$font-base`. See [`styles/conf`](#stylesconf).

---

## What's new in 1.1.0

- **Optional light/dark theming in `conf`.** Opt in with `$dark: true` (or a
  palette map) plus `$theme: auto | class | both`; `conf` then emits the dark
  palette — custom properties and recoloured icons — under a
  `prefers-color-scheme` media query, a `data-theme="dark"` rule, or both.
  See [Dark theme](#dark-theme).
- **`scripts/theme`** — a small `data-theme` toggle (`toggleTheme` /
  `setTheme` / `getTheme` / `resolvedTheme`) that persists to `localStorage`.

---

## Table of contents

- [@kirigami/canva](#kirigamicanva)
  - [Overview](#overview)
  - [What's new in 2.5.0](#whats-new-in-250)
  - [What's new in 2.4.0](#whats-new-in-240)
  - [What's new in 2.3.0](#whats-new-in-230)
  - [What's new in 2.2.0](#whats-new-in-220)
  - [What's new in 2.1.0](#whats-new-in-210)
  - [What's new in 2.0.0](#whats-new-in-200)
  - [What's new in 1.1.1](#whats-new-in-111)
  - [What's new in 1.1.0](#whats-new-in-110)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [Package layout](#package-layout)
  - [Styles](#styles)
    - [`styles/conf`](#stylesconf)
    - [Dark theme](#dark-theme)
    - [`styles/utils`](#stylesutils)
    - [`styles/prose`](#stylesprose)
    - [`styles/main`](#stylesmain)
  - [Scripts](#scripts)
    - [`dom`](#dom)
    - [`helpers`](#helpers)
    - [`theme`](#theme)
    - [`observer`](#observer)
    - [`reveal`](#reveal)
    - [`components/burger`](#componentsburger)
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
import { create } from '@kirigami/canva/dom';
import { documentReady } from '@kirigami/canva/helpers';
```

```scss
@use '@kirigami/canva/styles/utils' as *;
@use '@kirigami/canva/styles/conf';
```

When the `.scss` is compiled by kirigami-core's `sass` task, its package
importer retries every unresolved subpath with a `styles/` prefix, so
`@use '@kirigami/canva/conf'` resolves to `styles/conf` — the `styles/`
segment is optional there (Node's own resolver still needs it).

---

## Package layout

```
@kirigami/canva
└── dist/                      # the only published/consumed directory
    ├── scripts/               # exposed as @kirigami/canva/<name>
    │   ├── dom.js             # + dom.js.map, dom.d.ts when present
    │   ├── helpers.js
    │   ├── theme.js
    │   ├── observer.js
    │   ├── reveal.js
    │   └── components/
    │       └── burger.js
    └── styles/                # exposed as @kirigami/canva/styles/<name>
        ├── conf.scss
        ├── utils.scss
        ├── prose.scss
        └── main.scss
```

`dist/` is generated from `src/` by [`build.js`](./build.js): scripts are
transpiled one-to-one with esbuild (no bundling), `.d.ts` files are copied
through, and `styles/` is copied verbatim.

The `exports` map (`{ "./styles/*": …, "./*": "./dist/scripts/*.js" }`) drops
the `scripts/` segment: `dist/scripts/dom.js` is imported as
`@kirigami/canva/dom`. Styles keep their `styles/` prefix for Node — but the
`sass` task's importer makes it optional (see above), and since `./styles/*`
is matched before the `./*` catch-all, style `@use`s are never shadowed by it.

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
  `font-size`, themed native scrollbars (`scrollbar-color` / `scrollbar-width`
  from the `--border` / `--surface-2` tokens), and `.is-busy` / `.is-working`
  cursor-lock states on `<html>`.

The root `font-size` is fluid and bounded both ways:
`clamp(var(--font-min), var(--font-resp), var(--font-base))`, where
`--font-resp` scales with the viewport (`$font-base * 100 / $font-break` vw) and
`$font-min` (default `17`) keeps a narrow screen from collapsing every `rem`.

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

### Dark theme

`conf` is single-theme by default. Opt in through two tokens:

| Token | Values | Effect |
|---|---|---|
| `$dark` | `false` *(default)* / `true` / a palette map | `false` emits nothing extra. `true` enables the built-in dark palette. A map starts from that built-in palette and overrides the keys you pass. |
| `$theme` | `auto` / `class` / `both` *(default)* | `auto` follows the OS (`prefers-color-scheme`). `class` only reacts to `data-theme` on `<html>`. `both` follows the OS but lets `data-theme="light"` / `"dark"` force either way. |

When enabled, `conf` emits a second copy of every palette custom property
(and every recoloured `--icon-*`) under the dark palette — as a
`@media (prefers-color-scheme: dark)` block, a `:root[data-theme="dark"]`
rule, or both, per `$theme`.

It also adds a `background-color` / `background-image` / `color` transition
(`var(--transition-duration)`, ~200 ms) on `*, *::before, *::after` so switching
theme eases instead of snapping. It's wrapped in
`@media (prefers-reduced-motion: no-preference)` and doesn't fire on first paint.
A component that declares its own `transition` shorthand replaces this on that
element — list the palette-driven properties there too if you want them animated.

The built-in dark palette is exposed as `$dark-*` `!default` variables
(`$dark-bg`, `$dark-ink`, `$dark-accent`, `$dark-logo-ink`, …), overridable
like the light tokens:

```scss
@forward "@kirigami/canva/conf" with (
    $bg:      #f7f8f7,
    $ink:     #2f3640,
    $accent:  #c7402c,

    // simplest: just switch it on
    $dark:    true,

    // …or tune individual dark tokens
    $dark: (
        bg:     #14181b,
        ink:    #e7ecef,
        accent: #ff6b52,
    ),
);
```

Pair it with [`theme`](#theme) for a manual toggle — that
needs `$theme: class` or `both`, since the toggle drives `data-theme`. For a
flash-free first paint, inline this in `<head>` before the stylesheet:

```html
<script>
  try {
    var t = localStorage.getItem('kirigami-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
</script>
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

### `styles/prose`

Baseline typography for rendered Markdown and other long-form content. Colours
are `conf` tokens, so it follows the light / dark palette with nothing extra to
wire.

```scss
// take the ready-made wrapper class
@use '@kirigami/canva/prose';
//  → `.prose { … }` is now defined
```

```scss
// …or just the mixin, on a selector of your own
@use '@kirigami/canva/prose' as prose with ($emit-class: false);

.page-about #main { @include prose.prose($measure: 46rem); }
```

| | |
|---|---|
| `prose($measure: 42rem, $flow: 1.5em)` | Mixin. `$measure` → `max-width` (`none` to skip); `$flow` → vertical rhythm between top-level blocks. |
| `$emit-class` (`true`) | `@use ... with ($emit-class: false)` suppresses the `.prose {}` rule and exposes only the mixin. |

Covers headings, lists, `blockquote`, `hr`, `table`, `code` / `pre`, `img` /
`figure`, `dl`, `<details>`, inline `mark` / `sub` / `sup` / `abbr`, and the GFM
output `@kirigami/php-prepros`' `MD` class emits: `.task-list` / `.task-item`,
`.markdown-alert*`, `.footnotes`. Tables scroll within themselves rather than
widening the page.

Runtime knobs (set on the element or `:root`): `--prose-measure`,
`--prose-flow`, `--prose-radius`.

`@kirigami/plugin-highlight` appends its code-block theme (embedded font,
`.hljs-*` colours) after this via its `sass:after` hook, so highlighted `<pre>`
blocks pick up the richer styling automatically.

### `styles/main`

Small, generic UI patterns that kept turning up identically across Kirigami
sites. All colours are `conf` tokens, so light/dark comes for free. Opt-in:

```scss
@use '@kirigami/canva/main';
```

| Class | Purpose |
|---|---|
| `.breadcrumb` | A trail of links + the current page. Pairs with php-prepros' `FS::getBreadcrumb()`. |
| `.docs-toc` | An inline quick-jump list of anchor links, for long reference pages. |
| `.table-wrap` / `.table` | A generic data table; wrap in `.table-wrap` to scroll horizontally instead of widening the page. `&__num` (`.table__num`) styles a tabular-figure column (e.g. a version number). |
| `.badge` / `.badge--muted` | A small status/license tag — accent-filled by default, `--muted` for an outlined neutral variant. |
| `.palette` | A row of colour chips, for visualising a hex list (e.g. `IMG::palette()` / `colors()` output) — one `<li>` per swatch. |

---

## Scripts

ESM modules, browser target (`es2022`), exposed under `@kirigami/canva/*`
(the `scripts/` segment is not part of the import path). Each source file
compiles to its own dist file — import them individually.

### `dom`

```js
import { create } from '@kirigami/canva/dom';
```

| Export | Signature | Description |
|---|---|---|
| `create` | `create(tag, classname?, content?, attrs?) → HTMLElement` | Creates an element, optionally setting `className`, `innerHTML`, and attributes from an object. |
| `HTMLElement.prototype.create` | `el.create(tag, classname?, content?, attrs?) → HTMLElement` | Same as `create()`, but also appends the new element to `el` and returns it. **Side effect:** importing this module patches `HTMLElement.prototype`. |

### `helpers`

```js
import { busy, working, preloadImage, documentReady, dedent } from '@kirigami/canva/helpers';
```

| Export | Signature | Description |
|---|---|---|
| `busy` | `busy(promise \| promise[]) → Promise` | Adds `is-busy` to `<html>` while the promise(s) settle (`Promise.allSettled`), then removes it. Returns the settled result(s). |
| `working` | `working(promise \| promise[]) → Promise` | Same, with the `is-working` class. |
| `preloadImage` | `preloadImage(url) → Promise<'preloaded' \| 'memory-cache'>` | Resolves once the image has loaded (or immediately if already cached), rejects on error. |
| `documentReady` | `documentReady(cb?) → Promise` | Resolves on `DOMContentLoaded` (or immediately if the document is already parsed); resolves with `cb()`'s return value when a callback is given. |
| `dedent` | `dedent(str) → string` | Strips the whitespace prefix shared by every non-blank line (relative indentation kept); trims leading blank lines and trailing whitespace. Pure string helper, no DOM. |

### `theme`

```js
import { toggleTheme, setTheme, getTheme, resolvedTheme } from '@kirigami/canva/theme';
```

Manual light/dark switch for the [`conf` dark theme](#dark-theme). Writes
`data-theme` on `<html>` and persists the choice in `localStorage`
(`kirigami-theme`). **Side effect:** importing the module re-applies the stored
preference immediately, then (on `DOMContentLoaded`) wires every
`[data-theme-toggle]` control.

| Export | Signature | Description |
|---|---|---|
| `getTheme` | `getTheme() → 'auto' \| 'light' \| 'dark'` | The stored preference (`'auto'` when nothing is set). |
| `resolvedTheme` | `resolvedTheme() → 'light' \| 'dark'` | The theme actually on screen, resolving `'auto'` against `prefers-color-scheme`. |
| `setTheme` | `setTheme(pref) → 'light' \| 'dark'` | Persists `pref` (`'auto'` clears the attribute and lets the OS decide) and applies it; returns the now-resolved theme. |
| `toggleTheme` | `toggleTheme() → 'light' \| 'dark'` | Flips between light and dark from what is currently shown. |
| `initTheme` | `initTheme() → void` | Re-applies the stored preference (run on import). |
| `bindToggles` | `bindToggles(target = document) → void` | Wires every `[data-theme-toggle]` under `target` (idempotent; run on import). Call again after injecting toggles later. |

#### Declarative toggle

No wiring needed — just import the module and mark up a control:

```html
<button data-theme-toggle aria-label="Toggle theme">🌗</button>   <!-- flips light ⇄ dark -->
<button data-theme-toggle="dark">Dark</button>                    <!-- forces a preference -->
<button data-theme-toggle="light">Light</button>
<button data-theme-toggle="auto">System</button>
```

Each toggle receives `data-theme-state="light|dark"` (the resolved theme) and,
when it's a real control, `aria-pressed` (`true` while dark) — style them from
those. Every change (click **or** an OS switch while in `auto`) fires a
`canva:themechange` CustomEvent on `window`:

```js
addEventListener('canva:themechange', (e) => {
	e.detail; // { theme: 'light' | 'dark', preference: 'auto' | 'light' | 'dark' }
});
```

### `observer`

```js
import { register } from '@kirigami/canva/observer';
```

A minimal tag-rewriting engine. Register a custom element name and a handler;
every matching tag **already in the document** and every one **inserted later**
is handed to the handler and replaced by whatever it returns. **Side effect:**
importing the module starts the observer immediately — it sweeps the current
document, then watches `<html>` for additions with a `MutationObserver`.

It is built for *non-closing* authoring tags. Browsers parse an unknown tag as
an ordinary element, so anything after a tag left unclosed ends up nested
*inside* it; with `voidLike` (the default) those stray children are lifted back
out as siblings before the tag is swapped. So this is enough:

```html
<youtube id="dQw4w9WgXcQ">
<p>…and the rest of the page carries on as siblings.</p>
```

```js
register('youtube', (el) => `
	<iframe class="youtube" allowfullscreen loading="lazy"
		src="https://www.youtube-nocookie.com/embed/${el.getAttribute('id')}">
	</iframe>`);
```

Registration order does not matter — a handler registered after the page has
loaded still catches up on tags already present. This is the seam Kirigami
plugins use to add authoring shortcuts.

| Export | Signature | Description |
|---|---|---|
| `register` | `register(tag, fn, options?) → unregister()` | Registers `fn` for `<tag>`. Returns a function that removes the registration. |
| `scan` | `scan(root?) → void` | Manually sweeps `root` (default `document`) for registered tags — rarely needed; the observer does this automatically. |
| `start` | `start() → void` | Starts the observer (idempotent; run on import). |
| `stop` | `stop() → void` | Disconnects the `MutationObserver`. Registered handlers stay; future insertions are no longer processed. |

`fn(el)` return values:

| Returns | Effect |
|---|---|
| HTML string / `Node` / `NodeList` / array of those | The tag is replaced by it. |
| `null` / `false` / `""` | The tag is removed. |
| `undefined` (no `return`) | The tag is left in place — for tags that only need a side effect. |

`options.voidLike` (default `true`) — treat the tag as non-closing and lift any
accidental nested children out as siblings before replacing. Set `false` when
the tag genuinely wraps content you want to keep inside the replacement.

Each replacement also fires a `canva:observed` `CustomEvent` on `document`
(`detail: { tag, source, nodes }`).

### `reveal`

```js
import { reveal } from '@kirigami/canva/reveal';
```

Adds `is-in` to each `[data-reveal]` element the first time it scrolls into
view, then stops watching it. **Side effect:** importing the module sweeps the
document once the DOM is ready.

Pair it with a CSS rule that hides `[data-reveal]` and shows
`[data-reveal].is-in` — gate that rule on the `js` class Kirigami's managed
`<head>` sets on `<html>`, so content stays visible if the bundle never loads:

```scss
@media (prefers-reduced-motion: no-preference) {
    .js [data-reveal]        { opacity: 0; transform: translateY(14px);
                               transition: opacity .5s ease, transform .5s ease; }
    .js [data-reveal].is-in  { opacity: 1; transform: none; }
}
```

| Export | Signature | Description |
|---|---|---|
| `reveal` | `reveal(target = document) → void` | Reveals every `[data-reveal]` under `target`. Elements already carrying `is-in` are skipped, so call it again after inserting more content. |

`prefers-reduced-motion: reduce`, a missing `IntersectionObserver`, or the
internal safety timeout each fall back to revealing everything at once.

### `components/burger`

```js
import Burger from '@kirigami/canva/components/burger';
```

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
