<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/audiowaveform-wasm

Waveform peak extraction and ID3 tag/cover-art reading for Node.js, compiled from BBC's `audiowaveform` to WebAssembly.  
Built for the **[Kirigami](https://github.com/php-kirigami)** static site generator's MP3 player plugin.

[![npm version](https://img.shields.io/npm/v/@kirigami/audiowaveform-wasm)](https://www.npmjs.com/package/@kirigami/audiowaveform-wasm)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-yellow)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

`@kirigami/audiowaveform-wasm` ships a pre-compiled WebAssembly build of the peak-generation core of [BBC's `audiowaveform`](https://github.com/bbc/audiowaveform) — not its CLI, not its PNG renderer — plus ID3 tag and cover-art reading via `libid3tag`:

- ✅ **Node.js** only, no browser target
- ✅ One monolithic wasm module — no JSPI, no Asyncify (peak extraction is synchronous, CPU-bound work)
- ✅ Buffer in, plain JS object out — peaks are shaped like `audiowaveform`'s own documented JSON format, so [`waveform-data.js`](https://github.com/bbc/waveform-data.js) can consume them directly
- ✅ MP3, WAV (16/24-bit PCM, 32-bit float), and AIFF today — see [Format support](#format-support)

Built by [`audiowaveform-wasm-compiler`](https://github.com/php-kirigami/audiowaveform-wasm-compiler), which also documents the full build pipeline and architecture decisions.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/audiowaveform-wasm](#kirigamiaudiowaveform-wasm)
  - [Overview](#overview)
  - [Table of contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Format support](#format-support)
  - [ID3 tag support](#id3-tag-support)
  - [License](#license)
  - [Author](#author)

---

## Requirements

- Node.js `>= 24.0.0`

---

## Installation

```bash
npm install @kirigami/audiowaveform-wasm
```

---

## Usage

```js
import { extractAudioPeaks, getId3Tags, getId3CoverArt } from '@kirigami/audiowaveform-wasm';
import fs from 'node:fs';

const mp3Bytes = fs.readFileSync('song.mp3');

const peaks = await extractAudioPeaks(mp3Bytes, 512);
// { version: 2, channels: 2, sample_rate: 44100, samples_per_pixel: 512,
//   bits: 16, length: 1234, data: [...] }

const tags = await getId3Tags(mp3Bytes);
// { title, artist, album, albumArtist, year, track, genre } — each a
// string or null; null if there's no tag at all

const cover = await getId3CoverArt(mp3Bytes);
// { mimeType, pictureType, data } — data is a plain array of byte values
// (0-255); null if there's no embedded cover art
if (cover) {
	fs.writeFileSync('cover.jpg', Buffer.from(cover.data));
}
```

`extractAudioPeaks()` auto-detects the format from the buffer's own container magic bytes — no need to know it up front.

---

## Format support

| Format | Status |
| --- | --- |
| MP3 | ✅ Works |
| WAV (16-bit PCM) | ✅ Works |
| WAV (24-bit PCM) | ✅ Works |
| WAV (32-bit float) | ✅ Works |
| AIFF | ✅ Works |
| FLAC | ❌ Not yet |
| Ogg Vorbis | ❌ Not yet |
| Opus | ❌ Not yet |
| M4A/AAC | ❌ Not yet |

Unsupported formats resolve to `null` — never throw.

---

## ID3 tag support

Tested against 25 real, randomly-sampled tagged MP3s plus a deliberately adversarial batch: ID3v2.3, ID3v2.4, ID3v1-only, Unicode (Japanese, emoji, Cyrillic, French accents), very long strings, and numeric-style genre codes. See [`audiowaveform-wasm-compiler`'s CLAUDE.md](https://github.com/php-kirigami/audiowaveform-wasm-compiler/blob/main/CLAUDE.md) for the full test results.

---

## License

`GPL-3.0-or-later` — inherited from `audiowaveform` itself, which links `libmad` (GPL-2.0). See [LICENSE](./LICENSE) for the full text.

---

## Author

Maxime Larrivée-Roy, 2026
