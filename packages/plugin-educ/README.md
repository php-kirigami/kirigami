# @kirigami/plugin-educ

Authoring tags for course pages in **Kirigami**. Ported from the VueJS
components of the original "manuel" engine.

## Installation

```yaml
# kirigami.yaml
plugins:
  - name: "@kirigami/plugin-educ"
```

An `esbuild` task is required (the client script is bundled into it).

## Options

| Option | Default | Description |
|---|---|---|
| `style` | `true` | Append the default component styles to every sass task. |

## `<checklist>`

One item per line; inline HTML (links, `<b>`, …) is allowed in an item.

```html
<checklist>
Read chapter 1
Do the <a href="/exercises">exercises</a>
Take the quiz
</checklist>
```

or, in Markdown (a `.md` page or a `<markdown>` block — Markdown strips unknown
tags, so only the shortcut works there):

```
{% checklist
Read chapter 1
Take the quiz
%}
```

Clicking an item toggles it; a progress bar and percentage follow. The checked
items are remembered **in the reader's browser** (`localStorage`), per page path
and per list. Editing the list's items resets its saved state. Links inside an
item open in a new tab and do not toggle the item.

In the `{% checklist %}` shortcode each line is inline Markdown (`_emphasis_`, `` `code` ``,
`[links](…)`); in the `<checklist>` tag each line is raw HTML.

## `<doclink>`

A pill-shaped link showing the favicon of the site it points to.

```html
<doclink href="https://developer.mozilla.org/fr/docs/Web/CSS">Le CSS</doclink>
```

```
{% doclink https://developer.mozilla.org/fr/docs/Web/CSS Le CSS %}
```

At build time the favicon of the host is looked up once (icons declared by the home
page, then `/favicon.ico`, then Google's favicon service) and saved as a 64 px webp
(`assets/images/doclink/<host>.webp`, published through the image pipeline). One icon per
host, shared by all its links; the lookup result is cached in `_data/doclink/<host>.json`
(commit both; delete the `.json` to retry a host). A host with no icon gets a generic link
badge; a local `.zip` link gets a zip badge, any other local link a file badge. An extra
`class=""` attribute is added to the link. Transparency of the favicon is flattened, the
badge has a white background.

Requires `prepros.network: true` in `kirigami.yaml`.

## `<intlink>`

Like plugin-extlink's `<extlink>`, but for another page of the same site: the card's
content comes from the target page's own header.

```html
<intlink href="../html-base/">
```

```
{% intlink ../html-base/ %}
```

`href` is relative to the current page (a leading `/` = the site root) and must point to
a page folder (with an `_index.php` or `_index.md`); a missing target fails the build.
From the target's header:

| Tag | Used for |
|---|---|
| `@title` | card title |
| `@abstract` (or `@description`) | description |
| `@label` (or `@code`) | small caption |
| `@image` (or `@ogimage`, `@meta_image`) | card image: a path relative to the site root, or a URL |

Without an image on the target page the card uses the site's default OG image
(`seo.image`, then `seo.logo`, then the `image` / `ogimage` keys of `kirigami:`). The tag
accepts `title`, `description`, `label`, `image` and `class` attributes to override.
The image is square-cropped to 200 px as a webp in `assets/images/intlink/` (commit it).

## `<color>`

A pill filled with a color; clicking it copies the code to the clipboard (the label
briefly reads "Copied!", or "Copié!" when `<html lang>` starts with `fr`).

```html
<color>#ff5500</color>
```

```
{% color #ff5500 %}
```

Hex colors only (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`); anything else fails the build.
The text is black or white, chosen at build time from the color's luminance. The color
itself is passed as a `--color` custom property in a `style` attribute (the value is data).

## Information bubbles

Five colored boxes with a round icon badge straddling the top-left corner: `<info>`
(blue), `<warning>` (yellow), `<alert>` (red), `<thumbsup>` (green) and `<bravo>` (purple).

```html
<info>Ceci est une bulle d'information</info>
```

In Markdown (where unknown tags are dropped) use the shortcodes, on one line or as a block;
the text is rendered as Markdown:

```
{% warning Ceci est une bulle d'avertissement %}

{% alert
Plusieurs lignes, avec du **gras**.
%}
```

The icons are drawn by the stylesheet (CSS masks), so each bubble is a single `<div>`;
the colors are the `--bubble` custom property of each `.bubble--<type>` class. The tag form
keeps its content as written (HTML allowed) and accepts a `class=""` attribute.

## `<quote>`

A citation: the text in italics under a large quote mark, the author, title and a round photo
right-aligned below.

```html
<quote author="Gandalf" title="Magicien" photo="./images/gandalf.webp">
Un magicien n'est jamais en retard…
</quote>
```

In Markdown use the shortcode: the quoted arguments (author, title, photo) on the first line,
the quote as a block below, rendered as Markdown:

```
{% quote "Gandalf" "Magicien" "./images/gandalf.webp"
Un magicien n'est jamais en retard…
%}
```

All three are optional. `photo` is a path relative to the page (`./…`, `../…`), a path from the
site root, or a URL; it is square-cropped to 112 px as a webp in `assets/images/quote/` (commit it).

## `<tool>`

A card for an external tool the course recommends: a caption ("OUTIL"), a title and a description
on the left, a picture on the right. Nothing is scraped; the text and the picture are written by hand.

```html
<tool href="https://responsive-css.spritegen.com/" title="Responsive CSS Sprites" image="tools/spritegen/thumb.jpg">
    Combine separate key frames into one sprite sheet.
</tool>
```

In Markdown, the quoted arguments (href, title, optional image) on the first line and the description
below:

```
{% tool https://responsive-css.spritegen.com/ "Responsive CSS Sprites" "tools/spritegen/thumb.jpg"
Combine separate key frames into one sprite sheet.
%}
```

`label` (default `OUTIL`) and `class` are optional attributes. The image is a path relative to the
page, from the site root or a URL; it is square-cropped to 200 px as a webp in `assets/images/tool/`
(commit it). The card opens in a new tab.

## `<codepen>`

```html
<codepen id="BaOaBOJ" tab="css,result" height="360">
```

```
{% codepen BaOaBOJ anonymous 360 css,result %}
```

An iframe on the pen's embed page. `id` is the pen hash (last part of its URL), `user` its owner
(default `anonymous`; CodePen finds a pen by its id), `height` in pixels (default 400), `tab` the tab
shown first (default `result`). The shortcode keeps the argument order of php-prepros' own
`{% codepen %}` (id, user, height) and adds the tab, so it replaces it.

## Images in components

`<quote photo>` and `<tool image>` accept `./x` and `../x` (relative to the page), `/x` (from the
site root), a plain `x/y.jpg` (relative to the page when the file is there, else from the site root)
or a URL.

## Responsive

Every component is fluid: long words and URLs wrap instead of widening the box, the bubble badges
and side bleed only appear from 52rem up, and the cards shrink their image on phones.

## Requirements

Node.js `>=24.0.0`, Kirigami `>=3.0.0`.

## License

GPL-3.0-or-later
