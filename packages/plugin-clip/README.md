<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/plugin-clip

Local video players for the **Kirigami** static site generator — the poster is picked automatically at build time.

[![npm version](https://img.shields.io/npm/v/@kirigami/plugin-clip)](https://www.npmjs.com/package/@kirigami/plugin-clip)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

`@kirigami/plugin-clip` turns a bare `<clip src="…">` tag into a video card — a
poster, the title, the duration and a play button — for a video file that lives
in **your own site** (MP4, WebM), not on YouTube. It is the local counterpart of
[`@kirigami/plugin-embed`](https://www.npmjs.com/package/@kirigami/plugin-embed).

The poster is not "the first frame" and not something you draw: at build time
[`@kirigami/bestframe`](https://www.npmjs.com/package/@kirigami/bestframe)
samples the video, drops black, flat and blurry frames, and scores the rest with a
small aesthetic model. The winner is written into your image source and published
through the same pipeline as `<img asset>`, so it comes out resized, in your
project's image format.

Nothing is downloaded from the video until someone presses play.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/plugin-clip](#kirigamiplugin-clip)
- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Options](#options)
- [Usage](#usage)
- [How it works](#how-it-works)
- [Cache and poster](#cache-and-poster)
- [Styling](#styling)
- [Requirements](#requirements)
- [License](#license)

---

## Installation

```
npm install --save-dev @kirigami/plugin-clip
```

```yaml
plugins:
  - name: "@kirigami/plugin-clip"
    active: true
```

Needs an `esbuild` task in `kirigami.yaml` — that's where the click-to-play
script ships to the browser.

---

## Configuration

### Options

| Option        | Type    | Default | Description |
|---|---|---|---|
| `style`       | boolean | `true`  | Append the default `.clip` styles to every `sass` task. Set `false` to write your own. |
| `posterWidth` | integer | `960`   | Width, in pixels, of the poster (height follows the video's ratio). |
| `samples`     | integer | `24`    | Timestamps `bestframe` samples across the video. More is slower to build; the result is cached. |

---

## Usage

Straight in HTML — the tag is deliberately non-closing, like `<img>`. `src` is
relative to the page (or root-relative when it starts with `/`):

```html
<clip src="../video/movie.mp4">
```

`title` overrides the title, which otherwise comes from the video's own `title`
tag, then from the file name (tidied up: underscores, leading track number):

```html
<clip src="../video/movie.mp4" title="Opening night">
```

or, inside Markdown, the shorthand:

```
{% clip ../video/movie.mp4 %}
```

Use **MP4 (H.264)** or **WebM** so that browsers can play the file. `bestframe`
also reads Matroska, AVI, Ogg, MPEG streams and older codecs (MPEG-4, VP8, Theora,
MPEG-1/2) to pick a poster, but a build warning is printed for a file type most
browsers won't play. A video `bestframe` can't decode gives
a warning and an HTML comment; it never fails the build.

A **vertical video** (width smaller than height) is shown in a default 16:9 box
with the picture centred, not as a tall card. Change the box with
`--clip-portrait-ratio`, and the card's maximum width with `--clip-max-width`
(default `40rem`).

Without JavaScript the play button is a plain link to the video file, which the
browser opens in its own player.

### `<inline-clip>` — a silent loop

For decoration rather than watching: a video that plays by itself, **muted, in a
loop, with no controls** (background animations, a looping demo, a GIF
replacement).

```html
<inline-clip src="../video/loop.mp4">
<inline-clip src="../video/loop.mp4" class="hero">
```

```
{% inline-clip ../video/loop.mp4 %}
```

It becomes one element, `<video class="inline-clip" autoplay muted loop playsinline …>`,
so it works with no JavaScript. Its real `width` and `height` are set from the
video so the page doesn't jump while it loads, and the `bestframe` poster shows
until the first frame. A `class` on the tag is kept. Unlike `<clip>`, a vertical
video keeps its own shape; size it with your own CSS (`--inline-clip-max-width`
caps it, default none).

The script pauses a loop while it is off-screen and leaves it on its poster for
visitors who prefer reduced motion. For the smoothest loop, encode it without an
audio track and with the last frame matching the first — the browser's own `loop`
can show a very short hiccup on some devices, which no markup can remove.

---

## How it works

1. `prepros:php` registers the `{% clip %}` shortcut, which emits the bare tag.
2. `prepros:html` runs after each page is rendered: it finds the tags, loads each
   video's poster and metadata (from the cache when possible), and replaces the
   tag with the card. This step is JavaScript because PHP running in WebAssembly
   can't reach `bestframe`.
3. `esbuild:after` bundles the click-to-play script; `sass:after` the styles.

On click, the card's content is replaced by a `<video controls>` that starts
playing. Only one clip plays at a time.

---

## Cache and poster

Picking a poster is slow — expect tens of seconds for a long video — so it is
done once per file. The result is cached as `<root>/_data/clip/<id>.json` (frame
timestamp, score, duration, dimensions, container tags). Commit that folder,
like `plugin-extlink`'s.

`<id>` is the file's size plus a hash of its first and last megabyte: cheap on a
multi-gigabyte video, and content-based, so a fresh checkout (CI) hits the
cache. Changing `posterWidth` or `samples` regenerates the entries.

The chosen frame is written to `<image.source>/clip/<id>.jpg` and published
through the image pipeline — the same engine as `<img asset>` and `img-asset()`, with the
same output naming (`images/clip/<id>-960w.webp`).

---

## Styling

The default styles use `--accent` and `--surface-2` from
[`@kirigami/canva`](https://www.npmjs.com/package/@kirigami/canva). With
`style: false`, style these yourself: `.clip` (`.clip--portrait`, `.is-playing`),
`.clip__poster`, `.clip__play`, `.clip__icon`, `.clip__title`, `.clip__duration`,
`.clip__video`, and `.inline-clip` for `<inline-clip>`.

---

## Requirements

- Node.js `>= 24.0.0`
- `@kirigami/kirigami` `>= 3.0.0`
- An `esbuild` task in `kirigami.yaml`
- `@kirigami/php-prepros` (shipped with `@kirigami/kirigami`) for the poster images
- To seek inside the video with `kiri serve`, a dev server that supports HTTP
  Range requests (added to `@kirigami/kirigami` after 3.1.1; any real web host
  already supports them)

---

## License

`GPL-3.0-or-later` — see [LICENSE](./LICENSE).
