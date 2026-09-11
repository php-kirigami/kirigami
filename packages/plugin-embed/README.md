<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/plugin-embed

YouTube / Vimeo / Dailymotion embed cards for the **Kirigami** static site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/plugin-embed)](https://www.npmjs.com/package/@kirigami/plugin-embed)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)

</div>

---

## Overview

`@kirigami/plugin-embed` turns a bare `<youtube id="…">` or `<vimeo id="…">`
tag into a real video card — a cover thumbnail, the video title, and a play
button — with **no build-time network call**: the oEmbed lookup happens in
the visitor's browser, on first paint, via
[`@kirigami/canva`'s `observer`](https://github.com/php-kirigami/kirigami/tree/main/packages/canva).

The result is cached in `localStorage`, so a repeat visit (or a second embed
of the same video) costs nothing. The play button is a single inline SVG
themed off the project's own `--accent` — nothing to draw yourself.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/plugin-embed](#kirigamiplugin-embed)
  - [Overview](#overview)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Options](#options)
  - [Usage](#usage)
  - [How it works](#how-it-works)
  - [Styling](#styling)
  - [Requirements](#requirements)
  - [License](#license)

---

## Installation

```
kiri install embed
```

or by hand:

```
npm install --save-dev @kirigami/plugin-embed
```

```yaml
plugins:
  - name: "@kirigami/plugin-embed"
    active: true
```

Needs an `esbuild` task in `kirigami.yaml` — that's where the observer script
ships to the browser.

---

## Configuration

### Options

| Option  | Type    | Default | Description |
|---|---|---|---|
| `style` | boolean | `true`  | Append the default `.embed` card styles to every `sass` task. Set `false` to write your own. |

---

## Usage

Straight in HTML — the tag is deliberately non-closing, like `<img>`:

```
<youtube id="dQw4w9WgXcQ">
<vimeo id="1084537">
<dailymotion id="x7tgad0">
```

or, inside Markdown, the shorthand:

```
{% youtube dQw4w9WgXcQ %}
{% vimeo 1084537 %}
{% dailymotion x7tgad0 %}
```

Both forms produce the exact same tag — the shorthand just saves typing raw
HTML in prose.

**Facebook is not supported.** Its oEmbed (Graph API) has required an app
`access_token` since 2018 — there's no anonymous client-side fetch to make.
A project with its own Facebook App ID could add it on top with its own
`register('facebook', …)` call (see [How it works](#how-it-works)) — nothing
here stops you, it's just not bundled.

---

## How it works

1. `src/embed.js` registers `youtube`, `vimeo` and `dailymotion` on
   `@kirigami/canva`'s `observer`, which sweeps the page for those tags (on
   load, and for anything added later) and hands each one to the plugin.
2. The tag is swapped **immediately** for a `.embed` placeholder — sized by
   the default 16∶9 aspect-ratio — so there's no layout shift waiting on the
   network.
3. The video's oEmbed data is read from `localStorage`
   (`kirigami-embed:<provider>:<id>`) if a previous visit already resolved
   this id, or fetched from the provider's oEmbed endpoint otherwise and
   cached for next time.
4. Once that resolves, the thumbnail, real aspect-ratio and title are
   patched into the same placeholder — no second layout shift, no
   re-registering.
5. Clicking the play button swaps the placeholder's content for the real
   player `<iframe>` — nothing loads (or autoplays) before that click.

---

## Styling

The bundled `.embed` card (`.embed__title`, `.embed__play`, `.embed__player`)
is themed off `@kirigami/canva` `conf`'s `--accent` / `--surface-2`, so it
tracks your project's own palette automatically. Set `style: false` and
target those same class names to restyle it from scratch.

---

## Requirements

- Node.js `>= 24.0.0`
- `@kirigami/kirigami` `^1.5.1`
- An `esbuild` task in `kirigami.yaml`

---

## License

MIT © Maxime Larrivée-Roy, 2026
