# @kirigami/struct-walker

[![npm version](https://img.shields.io/npm/v/@kirigami/struct-walker.svg)](https://www.npmjs.com/package/@kirigami/struct-walker)
[![license](https://img.shields.io/npm/l/@kirigami/struct-walker.svg)](./LICENSE)
[![node version](https://img.shields.io/node/v/@kirigami/struct-walker.svg)](https://nodejs.org)

Recursively walks a YAML or JSON file, resolving string values that reference other files relative to their parent. Nested YAML/JSON files are deserialized and inlined. Assets (images, fonts, audio, video…) are optionally converted to data URIs — either percent-encoded for text formats like SVG and CSS, or base64 for binary formats.

## Installation

```bash
npm install @kirigami/struct-walker
```

## Usage

```js
import { walkFile } from '@kirigami/struct-walker';

// Resolve nested YAML/JSON references only
const config = await walkFile('./config/main.yaml');

// Also embed asset files as data URIs
const theme = await walkFile('./theme/index.yaml', true);
```

## How it works

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

## API

### `walkFile(filePath, resolveAssets?, _visited?)`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `filePath` | `string` | — | Path to the root YAML or JSON file |
| `resolveAssets` | `boolean` | `false` | Convert asset file references to data URIs |
| `_visited` | `Set<string>` | — | Internal — do not pass |

Returns `Promise<unknown>` — the fully resolved value.

Throws an `Error` if a circular reference is detected (e.g. `A → B → A`).

---

### `fileToDataUri(absolutePath)`

Converts a single file to a data URI string. MIME type is detected first via magic bytes ([`file-type`](https://github.com/sindresorhus/file-type)), then by extension ([`mime-types`](https://github.com/jshttp/mime-types)), with `application/octet-stream` as last resort.

| MIME category | Encoding |
|---|---|
| `image/svg+xml`, `text/*`, `application/json`, `application/xml` | `data:<mime>;charset=utf-8,<percent-encoded>` |
| Everything else | `data:<mime>;base64,<base64>` |

SVG files are always forced to `image/svg+xml` and percent-encoded regardless of magic-byte detection.

---

### `TEXT_URI_MIME_TYPES`

`Set<string>` of MIME types that use percent-encoding instead of base64. The default set:

```
image/svg+xml  text/css       text/html    text/plain
text/javascript  application/json  application/xml  text/xml
```

---

### `ASSET_EXTS`

`Set<string>` of file extensions that trigger data URI conversion. Covers:

- **Raster images** — `.png` `.jpg` `.jpeg` `.gif` `.webp` `.avif` `.ico` `.bmp` `.tiff` `.tif` `.heic` `.heif`
- **Vector** — `.svg` `.svgz`
- **Audio** — `.mp3` `.ogg` `.wav` `.flac` `.aac` `.opus` `.m4a` `.mid` `.midi` `.kar`
- **Video** — `.mp4` `.webm` `.ogv` `.mov` `.avi` `.mkv`
- **Fonts** — `.woff` `.woff2` `.ttf` `.otf` `.eot`
- **Documents / data** — `.pdf` `.txt` `.csv` `.xml` `.html` `.htm` `.css`
- **Code** — `.js` `.mjs` `.cjs` `.ts` `.wasm`
- **3-D models** — `.glb` `.gltf`
- **Archives** — `.zip` `.gz`

## Dependencies

| Package | Role |
|---|---|
| [`js-yaml`](https://github.com/nodeca/js-yaml) `5.0.0` | YAML parsing and serialization |
| [`file-type`](https://github.com/sindresorhus/file-type) `22.0.1` | MIME detection via magic bytes |
| [`mime-types`](https://github.com/jshttp/mime-types) `3.0.2` | MIME detection via extension (fallback) |

## Requirements

- Node.js `>=20.10.0`
- npm `>=10.2.3`
- ESM only (`"type": "module"`)

## License

MIT © Maxime Larrivée-Roy, 2026