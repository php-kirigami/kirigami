# @kirigami/php-wasm

> A custom PHP 8.5 WebAssembly build for Node.js — JSPI-only, no browser target.  
> Built for the [Kirigami](https://github.com/php-kirigami) project.

[![npm version](https://img.shields.io/npm/v/@kirigami/php-wasm)](https://www.npmjs.com/package/@kirigami/php-wasm)
[![License: GPL-2.0-or-later](https://img.shields.io/badge/license-GPL--2.0--or--later-blue)](./LICENSE)
[![Node.js >=20.10.0](https://img.shields.io/badge/node-%3E%3D20.10.0-brightgreen)](https://nodejs.org)

---

## Overview

`@kirigami/php-wasm` is a **custom fork** of the PHP-WASM package from the [WordPress Playground](https://github.com/WordPress/wordpress-playground) project. It ships a pre-compiled PHP 8.5.7 WebAssembly binary and its Node.js loader, stripped down to exactly what the Kirigami project needs:

- ✅ **JSPI** (JavaScript Promise Integration) target only
- ✅ **Node.js** runtime only
- ❌ No browser build
- ❌ No `WORKER` / `IFRAME` targets

This intentional reduction keeps the package lean and avoids shipping browser-specific glue code that would never be used inside Kirigami's server-side execution environment.

---

## Fork origin

This package is derived from the [`@php-wasm/node`](https://github.com/WordPress/wordpress-playground/tree/trunk/packages/php-wasm/node) package inside the WordPress Playground monorepo:

> **Upstream:** https://github.com/WordPress/wordpress-playground

The WASM binary (`jspi/8_5_7/php_8_5.wasm`) and the Emscripten-generated loader (`jspi/php_8_5.js`) are built from that upstream source with a custom Dockerfile that enables JSPI and targets the Node.js environment only. No browser polyfills, no `TextEncoder`/`TextDecoder` shims, no DOM stubs.

---

## Compatibility with `@php-wasm/universal`

This package is a **drop-in replacement** for the loader module consumed by [`@php-wasm/universal`](https://www.npmjs.com/package/@php-wasm/universal). It exposes the same `PHPLoaderModule` interface:

| Export | Description |
|---|---|
| `getPHPLoaderModule()` | Returns the JSPI PHP 8.5 loader module |
| `jspi()` | Detects JSPI support in the current runtime (re-exported from `wasm-feature-detect`) |

You use it exactly the same way you would use any other `@php-wasm` loader — just pass the result of `getPHPLoaderModule()` to `PHP.load()`:

```ts
import { getPHPLoaderModule } from '@kirigami/php-wasm';
import { PHP } from '@php-wasm/universal';

const loaderModule = await getPHPLoaderModule();
const php = await PHP.load('8.5', { phpLoaderModule: loaderModule });

const result = await php.run({ code: '<?php echo "Hello, Kirigami!";' });
console.log(result.text); // Hello, Kirigami!
```

The only difference from the upstream packages is that **this build only works in Node.js with JSPI enabled**. Attempting to use it in a browser or in a Node.js version that doesn't support JSPI will fail.

---

## Requirements

| Requirement | Minimum version |
|---|---|
| Node.js | `>=20.10.0` |
| npm | `>=10.2.3` |
| Node.js JSPI flag | See note below |

> **JSPI in Node.js**: JSPI (WebAssembly JavaScript Promise Integration) landed behind a V8 flag in Node.js 20 and became available without flags in Node.js 22+. If you are on Node.js 20, start your process with `--experimental-wasm-stack-switching`. On Node.js 22 and above, no flag is needed.

---

## Installation

```bash
npm install @kirigami/php-wasm
```

---

## Usage

### Basic execution

```ts
import { getPHPLoaderModule, jspi } from '@kirigami/php-wasm';
import { PHP } from '@php-wasm/universal';

// Guard: verify JSPI is available before loading the binary
if (!(await jspi())) {
  throw new Error(
    'WASM JSPI is not available in this runtime. ' +
    'Use Node.js 22+ or pass --experimental-wasm-stack-switching on Node.js 20.'
  );
}

const loaderModule = await getPHPLoaderModule();
const php = await PHP.load('8.5', { phpLoaderModule: loaderModule });

const result = await php.run({
  code: `<?php
    $data = ['project' => 'Kirigami', 'php' => PHP_VERSION];
    echo json_encode($data);
  `,
});

console.log(result.text);
// {"project":"Kirigami","php":"8.5.7"}
```

### Checking JSPI support

```ts
import { jspi } from '@kirigami/php-wasm';

const supported = await jspi();
console.log('JSPI available:', supported);
```

---

## Package contents

```
@kirigami/php-wasm
├── index.js              # ESM entry point
├── index.d.ts            # TypeScript declarations
├── jspi/
│   ├── php_8_5.js        # Emscripten-generated Node.js loader (JSPI build)
│   └── 8_5_7/
│       └── php_8_5.wasm  # Compiled PHP 8.5.7 WebAssembly binary (~17 MB)
└── LICENSE
```

---

## PHP version

This package ships **PHP 8.5.7**.

The version is encoded in the package version number (`major.minor.patch` → `8.5.7`) so that the installed PHP version is always immediately visible from `package.json`.

---

## License

`GPL-2.0-or-later` — same as the upstream WordPress Playground project.  
See [LICENSE](./LICENSE) for the full text.

---

## Related

- [WordPress Playground](https://github.com/WordPress/wordpress-playground) — upstream project
- [`@php-wasm/universal`](https://www.npmjs.com/package/@php-wasm/universal) — the runtime this loader integrates with
- [`wasm-feature-detect`](https://www.npmjs.com/package/wasm-feature-detect) — used for JSPI detection