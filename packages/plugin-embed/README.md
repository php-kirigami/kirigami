<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/plugin-embed

YouTube / Vimeo embed cards for the **Kirigami** static site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/plugin-embed)](https://www.npmjs.com/package/@kirigami/plugin-embed)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

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

## What's new in 0.1.5

- Dependency bump to
  [`@kirigami/canva`](https://www.npmjs.com/package/@kirigami/canva) **2.6.0**
  / `@kirigami/sdk` 0.2.1; `homepage` + README pointed at the site (metadata
  only).

---

## What's new in 0.1.4

- Dependency bump to `@kirigami/canva` 2.5.1.

---

## What's new in 0.1.3

- **Superseded the 16∶9 aspect-ratio floor with a `maxWidth` cap + the real
  ratio.** A full-page-wide `.embed` (no `max-width`) still read as huge even
  at a "correct" ratio, so the floor hack is gone: `.embed` now caps at
  `max-width: var(--embed-max-width, 40rem)`, and the video's **actual**
  aspect-ratio is used. Two new options: `maxWidth` (default `"40rem"`,
  `"none"` removes the cap) and `forcedAspectRatio` (e.g. `"1 / 1"` to pin
  every card in a grid to one uniform shape).

---

## What's new in 0.1.1

- **Aspect-ratio floored at 16∶9** — a real, reported bug: a narrower source
  video (4∶3, portrait, a Short) produced an unusually tall card that
  dominated the page next to normal widescreen ones. The real player, once
  clicked, still showed at its own true ratio, pillarboxed rather than
  stretched. (Superseded by 0.1.3's `maxWidth` cap, above.)

---

## Table of contents

- [@kirigami/plugin-embed](#kirigamiplugin-embed)
  - [Overview](#overview)
  - [What's new in 0.1.5](#whats-new-in-015)
  - [What's new in 0.1.4](#whats-new-in-014)
  - [What's new in 0.1.3](#whats-new-in-013)
  - [What's new in 0.1.1](#whats-new-in-011)
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

| Option              | Type    | Default   | Description |
|---|---|---|---|
| `style`             | boolean | `true`    | Append the default `.embed` card styles to every `sass` task. Set `false` to write your own. |
| `maxWidth`          | string  | `"40rem"` | Caps how wide (and, via aspect-ratio, how tall) a card can get — any CSS length, or `"none"` to remove the cap. Ignored when `style` is `false`. |
| `forcedAspectRatio` | string  | `""`      | Pin every card to one shape (`"16 / 9"`, `"1 / 1"`, …) instead of each video's own real ratio — handy for a uniform grid. Empty uses each video's real ratio. Ignored when `style` is `false`. |

---

## Usage

Straight in HTML — the tag is deliberately non-closing, like `<img>`:

```
<youtube id="dQw4w9WgXcQ">
<vimeo id="1084537">
```

or, inside Markdown, the shorthand:

```
{% youtube dQw4w9WgXcQ %}
{% vimeo 1084537 %}
```

Both forms produce the exact same tag — the shorthand just saves typing raw
HTML in prose.

**Dailymotion and Facebook are not supported.** Dailymotion's oEmbed endpoint
sends no `Access-Control-Allow-Origin` header, so an anonymous browser
`fetch()` is blocked by CORS regardless of video id — confirmed against real
videos, not just one bad id. Facebook's oEmbed (Graph API) has required an
app `access_token` since 2018, so no anonymous fetch is possible there
either. A project with its own working endpoint for either (a proxy, an
access token, …) can still add it on top with its own
`register('dailymotion' | 'facebook', …)` call (see
[How it works](#how-it-works)) — nothing here stops you, it's just not
bundled.

---

## How it works

1. `src/embed.js` registers `youtube` and `vimeo` on `@kirigami/canva`'s
   `observer`, which sweeps the page for those tags (on load, and for
   anything added later) and hands each one to the plugin.
2. The tag is swapped **immediately** for a `.embed` placeholder — sized by
   the default 16∶9 aspect-ratio — so there's no layout shift waiting on the
   network.
3. The video's oEmbed data is read from `localStorage`
   (`kirigami-embed:<provider>:<id>`) if a previous visit already resolved
   this id, or fetched from the provider's oEmbed endpoint otherwise and
   cached for next time.
4. Once that resolves, the thumbnail and title are patched into the same
   placeholder, and the aspect-ratio is updated to the video's own real
   ratio (4∶3, square, portrait, a Short — whatever it actually is). It's
   the card's `max-width` (`maxWidth`, default `40rem`) that keeps a
   narrower video from ever looking oversized, not a distorted ratio — the
   real player, once clicked, shows at that same real ratio too, nothing
   is ever stretched.
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
- `@kirigami/kirigami` `^1.5.3`
- An `esbuild` task in `kirigami.yaml`

---

## License

MIT © Maxime Larrivée-Roy, 2026
