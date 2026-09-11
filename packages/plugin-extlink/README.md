<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/plugin-extlink

External link preview cards for the **Kirigami** static site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/plugin-extlink)](https://www.npmjs.com/package/@kirigami/plugin-extlink)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

`@kirigami/plugin-extlink` registers an `<extlink src="…">` authoring tag that
turns a bare URL into a link preview card — a square thumbnail on the left,
title / description / site name stacked on the right — using
`@kirigami/php-prepros`'s `SCRAPER` class (Open Graph, JSON-LD, oembed, …) to
pull the metadata.

Both the scrape result and the thumbnail are cached to disk on first use and
meant to be committed, so a later build — including CI, from a fresh checkout
— never re-crawls a URL it has already resolved.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/plugin-extlink](#kirigamiplugin-extlink)
  - [Overview](#overview)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Options](#options)
  - [The `<extlink>` tag](#the-extlink-tag)
  - [The `{% extlink %}` shortcut](#the-extlink-shortcut)
  - [How it works](#how-it-works)
  - [Styling](#styling)
  - [Requirements](#requirements)
  - [License](#license)

---

## Installation

```
kiri install extlink
```

or by hand:

```
npm install --save-dev @kirigami/plugin-extlink
```

```yaml
plugins:
  - name: "@kirigami/plugin-extlink"
    active: true
```

---

## Configuration

### Options

| Option  | Type    | Default | Description |
|---|---|---|---|
| `style` | boolean | `true`  | Append the default `.extlink` card styles to every `sass` task. Set `false` to write your own on top of the markup. |

---

## The `<extlink>` tag

```
<extlink src="https://example.com/some-article">
```

renders a card built from the target page's own metadata: title,
description, preview image, and site name. Any of those can be overridden
right on the tag — handy when the scrape misses something, or gets it wrong:

```
<extlink src="https://example.com/some-article" title="A better title" description="…" image="https://example.com/cover.jpg" label="Example">
```

If the scrape (and no override) turns up no title at all, the tag throws a
clear build error naming the offending `src` — pass `title="…"` to fix it.

---

## The `{% extlink %}` shortcut

The same card from Markdown — handy inside a `<markdown>` block or a `.md`
data file, where writing an HTML tag by hand is awkward:

```
{% extlink https://example.com/some-article %}
```

An optional second argument overrides the title, same as the tag's
`title="…"` attribute:

```
{% extlink https://example.com/some-article "A better title" %}
```

Only `title` is available inline (description/image/label overrides still
need the full `<extlink>` tag). Both forms resolve through the exact same
code path — same disk cache, same behavior either way.

---

## How it works

On first use of a given URL, the tag:

1. Calls `SCRAPER::get($src)` and writes the raw result to
   `_data/extlink/<hash>.json`, `<hash>` being `STR::shorthash($src)`.
2. Downloads the scraped preview image and saves it, untouched at its native
   resolution (re-encoded to jpg), to `assets/extlink/<hash>.jpg` — an
   archival copy, in case a different size or crop is ever needed without
   re-downloading.
3. Square-crops that same image and re-encodes it to the project's own
   `image:` config (`format`, default `webp`) at
   `assets/images/extlink/<hash>.<format>` — then publishes it under
   `image.dest` the same way `<img asset>` does, so it ships with the site
   like any other image. This is the one actually used by the card.

Every later build for that same `src` finds all three files already on disk
and skips straight to rendering the card — no network call, no re-encode.
**Commit `_data/extlink/`, `assets/extlink/` and `assets/images/extlink/` to
your repo** so CI and every contributor share the same cache instead of
re-crawling from scratch.

Requires `prepros.network: true` in `kirigami.yaml` (same prerequisite as
`SCRAPER`/`CURL` themselves).

---

## Styling

The bundled `.extlink` card (`.extlink__image`, `.extlink__body`,
`.extlink__title`, `.extlink__desc`, `.extlink__site`) is themed entirely off
`@kirigami/canva` `conf` custom properties, so it tracks your project's
light/dark palette automatically. Set `style: false` and target those same
class names to restyle it from scratch.

---

## Requirements

- Node.js `>= 24.0.0`
- `@kirigami/kirigami` `^1.5.0`
- `prepros.network: true` in `kirigami.yaml`

---

## License

MIT © Maxime Larrivée-Roy, 2026
