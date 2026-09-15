<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/bestframe

Automatic thumbnail/still-frame selection for video, picked by a tiny embedded aesthetic AI model, compiled to WebAssembly for Node.js.  
Built for the **[Kirigami](https://github.com/php-kirigami)** static site generator's video player.

[![npm version](https://img.shields.io/npm/v/@kirigami/bestframe)](https://www.npmjs.com/package/@kirigami/bestframe)
[![License: LGPL-2.1-or-later](https://img.shields.io/badge/license-LGPL--2.1--or--later-yellow)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

`@kirigami/bestframe` samples frames across a video, filters out the obviously bad ones, scores the rest with a small embedded aesthetic model, and returns the best one as a ready-to-use thumbnail image:

- ✅ **Node.js** only, no browser target
- ✅ **No file I/O, no long-lived runtime instance** — one stateless call, buffer in, thumbnail out
- ✅ **Multithreaded** decode, matching the real CPU core count of whatever machine this runs on
- ✅ **Four mainstream web video codecs**: H.264, VP9, HEVC, AV1 — in MP4, Matroska (`.mkv`), and WebM containers
- ✅ **A real AI model picks the frame**, not just "highest contrast" or "N seconds in" — a MobileNet-based NIMA aesthetic model, embedded directly in the WASM binary (no separate model file to fetch)
- ✅ **Always returns a real frame** — even if every sampled frame fails the technical filters, you get the least-bad one back instead of nothing
- ✅ **JPEG or PNG** output, your choice
- ✅ Comes back with more than just the image: the source video's own duration, dimensions, and container metadata tags

Built by [`libbestframe`](https://github.com/php-kirigami/libbestframe), which also documents the full build pipeline, the model, and every architecture decision behind it.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/bestframe](#kirigamibestframe)
  - [Overview](#overview)
  - [Table of contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Options](#options)
  - [Result](#result)
  - [Codec \& container support](#codec--container-support)
  - [How the frame gets picked](#how-the-frame-gets-picked)
  - [License](#license)
  - [Author](#author)

---

## Requirements

- Node.js `>= 24.0.0`

---

## Installation

```bash
npm install @kirigami/bestframe
```

---

## Usage

```js
import { bestFrame } from '@kirigami/bestframe';
import fs from 'node:fs';

const result = await bestFrame('movie.mp4');
console.log(result.timestamp, result.score, result.width, result.height);
fs.writeFileSync('thumbnail.jpg', result.data);
```

A `Buffer`/`Uint8Array` already in memory works just as well as a file path — nothing is written to disk internally either way:

```js
const buffer = fs.readFileSync('clip.webm');
const result = await bestFrame(buffer, {
	samples: 48,
	width: 1280,
	format: 'png',
});
```

If the source video can't be decoded at all (unsupported codec/container, corrupt data), `bestFrame()` resolves to `null` — it never throws for that.

---

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `samples` | `number` | `24` | How many timestamps to sample across the video. |
| `width` | `number` | `640` | Target output width in pixels — height is computed to preserve the source's aspect ratio. |
| `format` | `'jpeg' \| 'png'` | `'jpeg'` | Output image format. PNG is lossless. |
| `quality` | `number` | `85` | JPEG quality, 0-100 (libjpeg-style, higher = better). Ignored for `format: 'png'`. |

---

## Result

```js
{
	timestamp: 23.732,      // the winning frame's real timestamp, in seconds
	score: 0.421,           // its composite aesthetic score — higher is better
	width: 640,             // encoded output width
	height: 266,            // encoded output height
	data: Buffer,           // the encoded image bytes (JPEG or PNG)
	duration: 45.545,       // source video's total duration, in seconds
	sourceWidth: 1920,      // source video's own (pre-scaling) width
	sourceHeight: 800,      // source video's own (pre-scaling) height
	metadata: {             // container tags, exactly as the file carries them, or null
		encoder: 'Lavf62.3.100',
	},
}
```

---

## Codec & container support

| | Supported |
| --- | --- |
| **Video codecs** | H.264, VP9, HEVC (H.265), AV1 |
| **Containers** | MP4, Matroska (`.mkv`), WebM |
| **Audio** | Not read at all — thumbnails don't need it |

Older/niche codecs (MPEG-4 part 2 / Xvid, etc.) aren't supported — `bestFrame()` resolves to `null` for those, same as any other undecodable input.

---

## How the frame gets picked

1. **Sample** — timestamps spread across the video (avoiding the very start/end, to dodge fade-ins, intro logos, and credits).
2. **Filter** — each sampled frame is checked for being black, low-contrast/uniform, blurry, or a near-duplicate of an already-kept frame. Obviously bad frames never reach the model.
3. **Score** — survivors are resized and run through a small embedded NIMA-based aesthetic model (a general photo-aesthetics model, not one trained specifically on "thumbnail-worthiness" — it's a genuinely good proxy for it in practice), combined with a couple of cheap technical signals (sharpness, exposure) into one composite score.
4. **Pick & encode** — the highest-scoring frame is decoded fresh at the requested output size and encoded as JPEG or PNG.

If literally every sampled frame fails step 2's filters (a clip that stays dark or blurry throughout, for instance), the least-bad one is scored and returned anyway — you always get a real frame back, never nothing.

See [`libbestframe`'s own `CLAUDE.md`](https://github.com/php-kirigami/libbestframe/blob/main/CLAUDE.md) for the full decision-by-decision history behind every piece of this — the model, the filters, the composite score formula, and every real bug found along the way.

---

## License

`LGPL-2.1-or-later` — see [LICENSE](./LICENSE) for the full text.

---

## Author

Maxime Larrivée-Roy, 2026
