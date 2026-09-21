<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/plugin-extlink

External link preview cards for the **Kirigami** static site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/plugin-extlink)](https://www.npmjs.com/package/@kirigami/plugin-extlink)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](./LICENSE)
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

Scraped metadata and images are written to disk. Committing the metadata
avoids repeated page scraping while that cache is readable. Image reuse
depends on the generated destination file; committed source images alone
do not guarantee an offline build.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/plugin-extlink](#kirigamiplugin-extlink)
- [Overview](#overview)
- [What's new in 0.1.3](#whats-new-in-013)
- [What's new in 0.1.2](#whats-new-in-012)
- [What's new in 0.1.1](#whats-new-in-011)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Options](#options)
- [The `<extlink>` tag](#the-extlink-tag)
- [The `{% extlink %}` shortcut](#the--extlink--shortcut)
- [How it works](#how-it-works)
- [Styling](#styling)
- [Requirements](#requirements)
- [License](#license)

---

## What's new in 0.1.3

- Dependency bump to `@kirigami/sdk` 0.2.1; `homepage` + README pointed at
  the site (metadata only).

---

## What's new in 0.1.2

- **`{% extlink URL ["title"] %}` Markdown shortcut**, alongside the existing
  `<extlink src="…">` HTML tag — both call the same `extlink_resolve()`
  resolver directly, so the shortcut hits the same disk cache as an
  already-resolved URL from the tag form.

---

## What's new in 0.1.1

- Also saves the untouched download at its native resolution, re-encoded to
  jpg, to `assets/extlink/<hash>.jpg` — an archival copy alongside the
  square-cropped card image (costs no extra download, decoded from the same
  in-memory `IMG` instance).

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

A `class="…"` attribute is appended alongside the card's own `extlink`
class, for one-off styling without overriding `style: false`:

```
<extlink src="https://example.com/some-article" class="featured">
```

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

The `prepros:php` hook includes `php/extlink.php`, which registers the HTML
tag and Markdown shortcut. `sass:after` adds the styles when `style` is enabled.
No browser JavaScript is needed for the card.

For each URL, `STR::shorthash($src)` supplies the cache key:

| File | Behavior |
|---|---|
| `_data/extlink/<hash>.json` | Read when present and decodable to a nonempty value; otherwise scrape and export metadata. No expiry or automatic refresh. |
| `assets/extlink/<hash>.jpg` | Original download re-encoded to JPEG at native resolution; archival output, not read back by the resolver. |
| `<image.source>/extlink/<hash>.<format>` | 200 × 200 square crop (`webp` fallback format). Written on download, not used for the reuse check. |
| `<data.root>/<image.dest>/extlink/<hash>.<format>` | Generated card image. Its existence is the reuse check; a missing destination triggers a download even if the source crop or archive exists. |

Commit `_data/extlink/` and the source/archive images to retain them. With
default image paths the crop is in `assets/images/extlink/`. Those committed
files alone do not eliminate network access in a clean checkout. Changing an
`image` override does not invalidate an existing destination because the key
uses the page URL. Remove the destination to regenerate it; remove the JSON
to refresh scraped metadata.

Nonempty overrides take precedence over scraped fields. Scrape failures are
caught and replaced with empty metadata; a title override can still allow
rendering. A missing title throws. Image download/conversion failure leaves
a card without an image. Invalid HTML-tag URLs throw, whereas invalid
Markdown-shortcut URLs emit an HTML comment.

The anchor has `target="_blank"` and `rel="noopener noreferrer"`. Its optional
image has empty alt text and lazy loading. Descriptions over 160 characters
are shortened to 159 characters plus an ellipsis. A missing label falls back
to the hostname without `www.`. Text and attributes are HTML-escaped.

Network operations require `prepros.network: true`. CURL enables certificate
and hostname verification; end-to-end WASM HTTPS remains unverified in the
current runtime. Cached metadata does not establish working HTTPS.

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
- npm `>= 10.2.3`
- `@kirigami/kirigami` `>= 1.5.0` (declared `kirigami.minVersion`)
- A `sass` task for the bundled card styles
- `prepros.network: true` in `kirigami.yaml`

---

## License

GPL-3.0-or-later © Maxime Larrivée-Roy, 2026
