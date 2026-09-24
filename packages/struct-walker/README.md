<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/struct-walker

Recursive structured files walker for the **Kirigami** static site generator.


[![npm version](https://img.shields.io/npm/v/@kirigami/struct-walker)](https://www.npmjs.com/package/@kirigami/struct-walker)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)



</div>

---

## Overview

Recursively walks a YAML or JSON file, resolving string values that reference other files relative to their parent. Nested YAML/JSON files are deserialized and inlined. Assets (images, fonts, audio, video…) are optionally converted to data URIs — either percent-encoded for text formats like SVG and CSS, or base64 for binary formats.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/struct-walker](#kirigamistruct-walker)
- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [How it works](#how-it-works)
  - [Example structure](#example-structure)
- [API](#api)
  - [`walkFile(filePath, resolveAssets?, _visited?)`](#walkfilefilepath-resolveassets-_visited)
  - [`fileToDataUri(absolutePath)`](#filetodatauriabsolutepath)
  - [`TEXT_URI_MIME_TYPES`](#text_uri_mime_types)
  - [`ASSET_EXTS`](#asset_exts)
- [Dependencies](#dependencies)
- [Requirements](#requirements)
- [License](#license)

---

## Installation

```bash
npm install @kirigami/struct-walker
```

---

## Usage

```js
import { walkFile } from '@kirigami/struct-walker';

// Resolve nested YAML/JSON references only
const config = await walkFile('./config/main.yaml');

// Also embed asset files as data URIs
const theme = await walkFile('./theme/index.yaml', true);
```

---

## How it works

YAML here is parsed in Node using `js-yaml`. PHP template data uses the native YAML extension through `YAML::`; the two paths have different implicit scalar rules. Do not infer PHP YAML 1.1 behavior from a `kirigami.yaml` example.

`walkFile` reads and deserializes the root file (YAML or JSON), then visits every value in the resulting tree. For each string it encounters:

| Condition | Result |
|---|---|
| No file extension | Kept as-is |
| Extension is `.yml`, `.yaml`, or `.json` and file exists | Replaced by the deserialized content of that file (recursive) |
| Extension is a known asset, `resolveAssets` is `true`, and file exists | Replaced by a data URI |
| File does not exist, or extension is unrecognised | Kept as-is |

Every file is resolved **relative to its own directory**, not the root file. This means a file in `config/db/` referencing `./credentials.yaml` resolves to `config/db/credentials.yaml`, regardless of where the root file lives.

### Example structure

```
config/
  main.yaml
  database.yaml
  theme/
    index.yaml
    logo.svg
    font.woff2
```

```yaml
# config/main.yaml
app: My App
database: ./database.yaml
theme: ./theme/index.yaml
```

```yaml
# config/database.yaml
host: localhost
port: 5432
```

```yaml
# config/theme/index.yaml
logo: ./logo.svg       # → data:image/svg+xml;charset=utf-8,...
font: ./font.woff2     # → data:font/woff2;base64,...
```

```js
const result = await walkFile('./config/main.yaml', true);
// {
//   app: 'My App',
//   database: { host: 'localhost', port: 5432 },
//   theme: {
//     logo: 'data:image/svg+xml;charset=utf-8,...',
//     font: 'data:font/woff2;base64,...'
//   }
// }
```

---

## API

### `walkFile(filePath, resolveAssets?, _visited?)`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `filePath` | `string` | — | Path to the root YAML or JSON file |
| `resolveAssets` | `boolean` | `false` | Convert asset file references to data URIs |
| `_visited` | `Set<string>` | — | Internal — do not pass |

Returns `Promise<unknown>` — the fully resolved value (plain object, array, string, number, boolean, or `null`).

Rejects if a circular file reference is detected (e.g. `A → B → A`). Sibling
references are allowed and loaded independently; there is no shared file cache.
Missing root files, unreadable files, invalid JSON/YAML, and empty YAML input
also reject. A missing nested reference remains its original string.

String values are trimmed for lookup, with case-insensitive extension checks;
unresolved strings retain their original whitespace. Object keys are not
resolved. Absolute paths and `..` can read outside the starting directory;
there is no project-containment boundary or network fetch. Cycle detection
uses resolved path strings, not canonical symlink targets. In-memory cycles
created by YAML aliases are not handled by the file-reference guard.

The root file uses JSON parsing only for `.json`; all other root extensions
use YAML parsing. Nested references are limited to `.json`, `.yaml`, and
`.yml`, even when `resolveAssets` is false.

---

### `fileToDataUri(absolutePath)`

Converts a single file to a data URI string. MIME type is detected first via magic bytes ([`file-type`](https://github.com/sindresorhus/file-type)), then by extension ([`mime-types`](https://github.com/jshttp/mime-types)), with `application/octet-stream` as last resort.

| MIME category | Encoding |
|---|---|
| MIME types explicitly listed in `TEXT_URI_MIME_TYPES` below | `data:<mime>;charset=utf-8,<percent-encoded>` |
| Everything else | `data:<mime>;base64,<base64>` |

Returns `Promise<string>` and reads the entire file synchronously before
asynchronous MIME detection. Read or detector errors reject; extension fallback
only applies when detection returns no MIME type. After successful detection,
`.svg` forces `image/svg+xml`; `.svgz` is not decompressed or given that override.

Text encoding normalizes line endings and escapes `%`, quotes, angle brackets,
`#`, tabs, and newlines. It is minimal encoding, not `encodeURIComponent`:
spaces and Unicode remain literal. Binary data uses base64.

---

### `TEXT_URI_MIME_TYPES`

Mutable, process-wide `Set<string>` of MIME types that use percent-encoding
instead of base64. Changes affect subsequent conversions. The default set:

```
image/svg+xml  text/css       text/html    text/plain
text/javascript  application/json  application/xml  text/xml
```

---

### `ASSET_EXTS`

Mutable, process-wide `Set<string>` of lowercase file extensions that trigger
data URI conversion when enabled. Both sets and both functions are named
exports from the package root; there is no default export. Covers:

- **Raster images** — `.png` `.jpg` `.jpeg` `.gif` `.webp` `.avif` `.ico` `.bmp` `.tiff` `.tif` `.heic` `.heif`
- **Vector** — `.svg` `.svgz`
- **Audio** — `.mp3` `.ogg` `.wav` `.flac` `.aac` `.opus` `.m4a` `.mid` `.midi` `.kar`
- **Video** — `.mp4` `.webm` `.ogv` `.mov` `.avi` `.mkv`
- **Fonts** — `.woff` `.woff2` `.ttf` `.otf` `.eot`
- **Documents / data** — `.pdf` `.txt` `.csv` `.xml` `.html` `.htm` `.css`
- **Code** — `.js` `.mjs` `.cjs` `.ts` `.wasm`
- **3-D models** — `.glb` `.gltf`
- **Archives** — `.zip` `.gz`

---

## Dependencies

The manifest pins these dependency versions; the lockfile records the resolved installation.

| Package | Role |
|---|---|
| [`js-yaml`](https://github.com/nodeca/js-yaml) `5.4.2` | YAML parsing and serialization |
| [`file-type`](https://github.com/sindresorhus/file-type) `22.1.0` | MIME detection via magic bytes |
| [`mime-types`](https://github.com/jshttp/mime-types) `3.0.2` | MIME detection via extension (fallback) |

---

## Requirements

- Node.js `>= 24.0.0`
- npm `>= 10.2.3`
- ESM only (`"type": "module"`)

---

## License

GPL-3.0-or-later © Maxime Larrivée-Roy, 2026
