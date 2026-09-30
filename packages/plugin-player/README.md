<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/plugin-player

SoundCloud-style audio players and playlists for the **Kirigami** static site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/plugin-player)](https://www.npmjs.com/package/@kirigami/plugin-player)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

`@kirigami/plugin-player` turns a bare `<player src="…">` or `<playlist src="…">`
tag into a full player: play/pause, the track's title and artist, its cover art,
and a clickable **waveform** that fills as the track plays.

Everything expensive happens at **build time**. Each audio file is decoded once
with [`@kirigami/audiowaveform-wasm`](https://www.npmjs.com/package/@kirigami/audiowaveform-wasm);
the waveform SVG, duration and ID3 tags are baked into the page. In the browser
the only JavaScript is a small script that handles playback and seeking, and an
`<audio>` element is created only when someone presses play.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/plugin-player](#kirigamiplugin-player)
- [Overview](#overview)
- [What's new in 0.1.1](#whats-new-in-011)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Options](#options)
- [Usage](#usage)
- [How it works](#how-it-works)
- [Cache and cover art](#cache-and-cover-art)
- [Styling](#styling)
- [Requirements](#requirements)
- [License](#license)

---

## What's new in 0.1.1

- **Fix: `kiri export` failed** ("Refusing to empty export destination … no
  .kirigami-export marker") on a fresh checkout, such as CI. The cover image was
  written into the export folder during the render pass, before the `dist`
  task had emptied and refilled it. It now goes to the source tree only, and
  `dist` copies it with the rest.

---

## Installation

```
npm install --save-dev @kirigami/plugin-player
```

```yaml
plugins:
  - name: "@kirigami/plugin-player"
    active: true
```

Needs an `esbuild` task in `kirigami.yaml` — that's where the playback script
ships to the browser.

---

## Configuration

### Options

| Option      | Type    | Default | Description |
|---|---|---|---|
| `style`     | boolean | `true`  | Append the default `.player` / `.playlist` styles to every `sass` task. Set `false` to write your own. |
| `samples`   | integer | `1000`  | Points in the baked waveform (the SVG viewBox width). |
| `cover`     | boolean | `true`  | Extract the embedded MP3 cover art and publish it through the image pipeline. |
| `coverSize` | integer | `240`   | Edge, in pixels, of the generated square cover (cropped to fill). |

---

## Usage

Straight in HTML — the tags are deliberately non-closing, like `<img>`. `src` is
relative to the page (or root-relative when it starts with `/`):

```html
<player src="../audio/test.mp3">
<playlist src="../audio/test.m3u">
```

`title` and `artist` on `<player>` override the file's own tags:

```html
<player src="../audio/test.mp3" title="Live at home" artist="Me">
```

or, inside Markdown, the shorthand:

```
{% player ../audio/test.mp3 %}
{% playlist ../audio/test.m3u %}
```

A playlist is a plain `.m3u` / `.m3u8` file. Entry paths are relative to the
playlist file, and `#EXTINF:<seconds>,Artist - Title` lines are used for the
title and artist of tracks that carry no ID3 tags of their own. Remote (URL)
entries are skipped with a warning — only local files can be analysed. Each
track of a playlist is a regular player; the next one starts when a track ends.

Supported audio: everything `@kirigami/audiowaveform-wasm` decodes — MP3, WAV,
AIFF, FLAC, Ogg Vorbis, Opus, M4A/AAC and WebM. ID3 tags and cover art are read
from MP3 only.

A missing or undecodable file is reported as a build warning and replaced by an
HTML comment; it never fails the build.

---

## How it works

1. `prepros:php` registers the `{% player %}` / `{% playlist %}` shortcuts, which
   emit the bare tags.
2. `prepros:html` runs after each page is rendered: it finds the tags, loads each
   audio file (from the cache when possible), and replaces the tag with the
   final markup. This step is JavaScript because PHP running in WebAssembly
   can't reach the audiowaveform module.
3. `esbuild:after` bundles the playback script; `sass:after` appends the styles.

The waveform is one `<path>` drawn twice: a muted copy, and on top a copy in the
`--accent` colour revealed up to the playback position with `clip-path`.

---

## Cache and cover art

Per audio file, the decode result (`meta` and the SVG) is cached as
`<root>/_data/player/<content-hash>.json`. The key is the file's **content**,
not its date, so a fresh checkout (CI) hits the cache. Commit the folder, like
`plugin-extlink`'s. Changing `samples` regenerates the entries.

A cover found in an MP3 is written to `<image.source>/player/<hash>.<ext>` and
published through the same engine as `<img asset>` and `img-asset()` — square
crop, the project's `image.format`, same output naming
(`images/player/<hash>-240x240-cover.webp`).

---

## Styling

The default styles use `--accent` and `--surface-2` from
[`@kirigami/canva`](https://www.npmjs.com/package/@kirigami/canva). With
`style: false`, style these yourself: `.player`, `.player__cover`,
`.player__toggle`, `.player__title`, `.player__artist`, `.player__wave`
(with `.player__svg` and `.player__svg--progress`), `.player__times`,
`.playlist__tracks`. The script sets `.is-playing` on a playing player and a
`--progress` custom property (0–1) on each player.

---

## Requirements

- Node.js `>= 24.0.0`
- `@kirigami/kirigami` `>= 3.0.0`
- An `esbuild` task in `kirigami.yaml`
- `@kirigami/php-prepros` (shipped with `@kirigami/kirigami`) for the cover images

---

## License

`GPL-3.0-or-later` — see [LICENSE](./LICENSE).
