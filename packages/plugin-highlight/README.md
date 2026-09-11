<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/plugin-highlight


highlight.js syntax highlighting for the **Kirigami** static site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/plugin-highlight)](https://www.npmjs.com/package/@kirigami/plugin-highlight)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

`@kirigami/plugin-highlight` runs [highlight.js](https://highlightjs.org/) over
your pages **at build time**. Fenced code blocks compiled by
`@kirigami/php-prepros` (`<pre><code class="language-…">`) come out with the full
`.hljs-*` span markup baked in — no highlight.js script, no CSS framework, and no
flash of unstyled code in the browser.

It also ships a small, parametric SCSS theme for that markup (with a built-in
light/dark pair) and an embedded **JetBrains Mono** web font, so a code block
looks right with nothing else to wire up.

It is the first plugin built on `@kirigami/sdk`, and a reference for the Kirigami
plugin model: declared in `kirigami.yaml`, loaded by `kiri`, hooked into the
build. Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/plugin-highlight](#kirigamiplugin-highlight)
  - [Overview](#overview)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Options](#options)
  - [How it works](#how-it-works)
  - [Theming](#theming)
    - [Automatic (`theme: auto` / `dark` / `light`)](#automatic-theme-auto--dark--light)
    - [Manual (`theme: none`)](#manual-theme-none)
    - [The embedded font](#the-embedded-font)
  - [The `<highlight>` tag](#the-highlight-tag)
  - [Per-page and per-block control](#per-page-and-per-block-control)
  - [Per-page control](#per-page-control)
  - [Requirements](#requirements)
  - [License](#license)

---

## Installation

```bash
npm install --save-dev @kirigami/plugin-highlight
```

Then declare it in `kirigami.yaml`:

```yaml
plugins:
  - name: "@kirigami/plugin-highlight"
    active: true
    options:
      languages: [php, javascript, bash, json, yaml, css, scss, xml, markdown]
      theme: auto
```

`kiri build` / `kiri export` / `kiri watch` load every active plugin before
running the tasks.

---

## Configuration

Everything lives under the plugin's `options:` in `kirigami.yaml`. They are
validated against the schema the package points at
(`kirigami.optionsSchema` in its `package.json` → [`options.schema.json`](./options.schema.json))
before the plugin loads — an unknown key or a bad value stops the build with a
clear message. Anything you leave out falls back to the default below.

`kirigami.schema.json` also `$ref`s this schema, so **VS Code completes and
validates `options:` as you type** (once `name:` is set), via the
`# yaml-language-server: $schema=…` line in your `kirigami.yaml`.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `languages` | `string[]` \| `"all"` | a common set of 12 | Languages to register. `"all"` loads the full highlight.js build (~190 languages, slower). An unknown name is skipped with a warning. |
| `theme` | `"auto"` \| `"dark"` \| `"light"` \| `"none"` | `"auto"` | Which theme stylesheet to append to the Sass build. `"none"` appends nothing — you `@use` it yourself. |
| `autodetect` | `boolean` | `true` | Guess the language of code blocks that have no `language-…` class (restricted to the registered set). |
| `embedFont` | `boolean` | `true` | Append the embedded JetBrains Mono `@font-face` (~39 KB woff2, base64) to the Sass build. |
| `copyButton` | `boolean` | `true` | Hover "Copy" button on every code block. Bundles a ~1 KB script into every `esbuild` task (you need one) and appends the button styles to the Sass build. |
| `tag` | `boolean` | `true` | Register the `<highlight lang="…">…</highlight>` authoring tag (PHP-side). |

The default `languages` set is: `php`, `javascript`, `typescript`, `bash`,
`json`, `yaml`, `css`, `scss`, `xml` (HTML), `markdown`, `sql`, `python`.

---

## How it works

The plugin registers `@kirigami/sdk` hooks:

- **`prepros:html`** — after `@kirigami/php-prepros` writes each page, the plugin
  finds every `<pre><code>` block, decodes it, runs `hljs.highlight()` (or
  `hljs.highlightAuto()` for un-tagged blocks), and writes back
  `<pre><code class="hljs language-…">…spans…</code></pre>`. A block whose
  language isn't registered is left as-is but still tagged `.hljs`, so the
  theme's frame still applies. Pages marked `@highlight false` and blocks tagged
  `nohighlight` / `plaintext` are skipped (see
  [Per-page and per-block control](#per-page-and-per-block-control)). Each block
  is de-indented first (via
  `@kirigami/canva`'s `dedent`) — the whitespace prefix shared by every line is
  stripped, matching what `STR::trimIndent` already does for the `<highlight>`
  tag — so you can indent a fenced block in your source markdown for readability
  without that indentation showing up in the rendered code. Relative indentation
  is kept. When `@kirigami/php-prepros` has pretty-printed the page
  (`prepros.format: true`), the rewritten block is re-indented to the same column
  `HTML::format()` left the `<pre>` at, so the served HTML stays consistently
  indented; php-prepros 1.7.2+ flattens that leading run again before the first
  paint (its `injectHead` de-indent script). With `format` off the block is
  written flush, as before.
- **`sass:after`** — appends the theme stylesheet (plus, by default, the font
  `@font-face` and the copy-button styles) to every `sass` task's output.
- **`esbuild:after`** — with `copyButton` on, bundles the copy-button script
  (`assets/copy.js`, ~1 KB) into every `esbuild` task. It wraps each
  `pre > code.hljs` in a `.hljs-copy-wrap` and adds a `.hljs-copy` button that
  writes the block's text to the clipboard. **If your project has no `esbuild`
  task, the script has nowhere to go** — the build warns and the styles are
  emitted but inert; add an `esbuild` task or set `copyButton: false`.
- **`prepros:php`** — always includes `php/page.php` (the `@highlight false`
  page opt-out: a `page_info` / `post_render` hook pair that leaves a marker
  comment for the `prepros:html` pass). With `tag` on it also includes
  `php/highlight.php`, which registers the `<highlight>` authoring tag (see
  below) — no highlighter, just `<pre><code class="language-…">` for the
  `prepros:html` pass to pick up.

highlight.js is a **dev dependency of your build** only. Nothing from it reaches
the deployed site except the class names in the HTML, the CSS that styles them,
and (with `copyButton`) the small copy script.

---

## Theming

The markup the plugin produces is standard highlight.js markup, so any
highlight.js stylesheet works. The bundled theme is a parametric Sass mixin with
a built-in light/dark palette.

### Automatic (`theme: auto` / `dark` / `light`)

`auto` emits the light palette as the baseline, then the dark palette under both
`@media (prefers-color-scheme: dark)` and `[data-theme="dark"]` — the same model
as [`@kirigami/canva`](https://www.npmjs.com/package/@kirigami/canva)'s theming.
`dark` / `light` emit just that one palette.

### Manual (`theme: none`)

Set `theme: none` and pull the mixin in yourself:

```scss
@use "@kirigami/plugin-highlight/highlight" as hljs;

// A built-in palette…
@include hljs.dark();

// …with overrides…
@include hljs.light((accent: #0b6bcb, punctuation: #8a94a6));

// …or a palette entirely your own:
@include hljs.theme((
  bg: #10131a, surface: #171b24, surface-2: #141821, border: #2b3140,
  ink: #e8ecf1, ink-muted: #93a0b4, accent: #7cc4ff, accent-soft: #1d2b3a,
));
```

The copy-button **layout** is still appended automatically (from `copyButton`);
its **colours** come from whichever `theme()` / `dark()` / `light()` mixin you
`@include` above.

A palette needs eight base colours (`bg`, `surface`, `surface-2`, `border`,
`ink`, `ink-muted`, `accent`, `accent-soft`); every syntax colour is derived
from those, and any of them (`keyword`, `string`, `number`, `title`,
`built-in`, `type`, `variable`, `attr`, `symbol`, `meta`, `punctuation`) can be
pinned in the same map.

`assets/theme-dark.scss` and `assets/theme-light.scss` are stand-alone,
copy-me-and-tweak examples — not part of the mixin API.

### The embedded font

The theme's code font stack leads with **JetBrains Mono**. With `embedFont: true`
(the default) the `@font-face` — a ~39 KB base64 woff2, variable weight
100–800 — is appended to the Sass build so it just works. Turn it off with
`embedFont: false`, or override the stack:

```scss
@use "@kirigami/plugin-highlight/highlight" as hljs with (
  $code-font: (Consolas, "Liberation Mono", monospace)
);
```

Pull only the `@font-face` in on its own with
`@use "@kirigami/plugin-highlight/styles/font" as font; @include font.face;`.

---

## The `<highlight>` tag

With `tag: true` (the default), you can write a code block as an authoring tag
instead of a fence — handy inside a PHP layout, or when you want the language
explicit:

```html
<highlight lang="js">
const greet = (name) => `hi ${name}`;
</highlight>
```

It is normalised (PHP-side, leading/trailing blank lines trimmed, indentation
stripped) to `<pre><code class="language-js">…</code></pre>` and then highlighted
by the same `prepros:html` pass as a fenced block. `lang` (aliases: `language`,
`l`) is optional — without it the block still gets `.hljs` and, if `autodetect`
is on, a guessed language. A literal `</highlight>` inside the code will end the
block early — use a fence for that case.

---

## Per-page and per-block control

**Skip a whole page** — put `@highlight false` (also `no` / `off` / `0`) in the
page's first PHPDOC block. Every `<pre><code>` on that page is left exactly as
rendered:

```php
<?php
/**
 * @title  Raw output
 * @highlight false
 */
```

**Skip one block** — give the `<code>` a `nohighlight` (or `no-highlight`) class,
or tag it as plain text — `language-plaintext` / `language-text` / `language-none`.
A fenced block does this with its info string:

    ```plaintext
    this stays verbatim
    ```

---

## Requirements

- Node.js `>= 24.0.0`
- npm `>= 10.2.3`
- `@kirigami/kirigami` `>= 1.4.3` (the plugin loader; `prepros:html` /
  `prepros:php` / `esbuild:*` hooks; bundles `@kirigami/php-prepros` `>= 1.7.2`,
  whose de-indent script flattens the re-indented highlight markup)
- `@kirigami/canva` (bundled dependency — supplies the `dedent` helper used to
  de-indent fenced blocks)
- ESM only (`"type": "module"`)

---

## License

MIT © Maxime Larrivée-Roy, 2026
