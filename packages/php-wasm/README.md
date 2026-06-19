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

## Compatibility & Runtime Helpers

This package is a **drop-in replacement** for the loader module consumed by [`@php-wasm/universal`](https://www.npmjs.com/package/@php-wasm/universal). It exposes the raw `PHPLoaderModule` interface along with high-level runtime instantiators that include out-of-the-box **networking capabilities**.

| Export | Description |
|---|---|
| `getPHPLoaderModule()` | Returns the raw JSPI PHP 8.5 loader module |
| `jspi()` | Detects JSPI support in the current runtime (re-exported from `wasm-feature-detect`) |
| `getPHPRuntime()` | Instantiates and returns a clean, standard PHP instance |
| `getPHPRuntimeWithNetwork()` | Instantiates a PHP instance bound to a native, zero-dependency TCP outbound proxy with SSL root certificates injected |

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

### 1. High-level execution with Outbound Networking

The package provides a built-in proxy architecture (`node:http` & `node:net`) that routes Emscripten `SOCKFS` actions into genuine outbound TCP traffic. It also automatically binds your Node environment's root certificates (`node:tls`) to the PHP layer so `cURL` and `OpenSSL` HTTPS requests work immediately.

```ts
import { getPHPRuntimeWithNetwork, jspi } from '@kirigami/php-wasm';

// Guard: verify JSPI is available before proceeding
if (!(await jspi())) {
  throw new Error('WASM JSPI is not available in this runtime.');
}

// Spins up the runtime and its companion local proxy on a random free port
const php = await getPHPRuntimeWithNetwork();

const result = await php.run({
  code: `<?php
    // Native HTTPS request inside WASM using cURL!
    $ch = curl_init("https://api.github.com/zen");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, "Kirigami-PHP-WASM");
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    echo "GitHub says: " . $response;
  `,
});

console.log(result.text);

// Clean up the proxy server when done if necessary
if (php._networkProxyServer) {
  php._networkProxyServer.close();
}

```

### 2. Standard isolated runtime

If you do not require internet access/sockets inside the PHP code, use the lightweight isolated helper:

```ts
import { getPHPRuntime } from '@kirigami/php-wasm';

const php = await getPHPRuntime();
const result = await php.run({ code: '<?php echo PHP_VERSION;' });
console.log(result.text); // "8.5.7"

```

### 3. Low-level configuration (Manual)

If you prefer to configure the `@php-wasm/universal` instance manually, pass the result of `getPHPLoaderModule()` to `PHP.load()`:

```ts
import { getPHPLoaderModule } from '@kirigami/php-wasm';
import { PHP } from '@php-wasm/universal';

const loaderModule = await getPHPLoaderModule();
const php = await PHP.load('8.5', { phpLoaderModule: loaderModule });

const result = await php.run({ code: '<?php echo "Hello, Kirigami!";' });
console.log(result.text); // Hello, Kirigami!

```

---

## Package contents

```
@kirigami/php-wasm
├── index.js              # ESM entry point (re-exports runtime + loaders)
├── index.d.ts            # TypeScript declarations
├── runtime/
│   └── runtime.js        # Networking proxy and runtime helpers
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

See [LICENSE](https://www.google.com/search?q=./LICENSE) for the full text.

---

## Related

* [WordPress Playground](https://github.com/WordPress/wordpress-playground) — upstream project
* [`@php-wasm/universal`](https://www.npmjs.com/package/@php-wasm/universal) — the runtime this loader integrates with
* [`wasm-feature-detect`](https://www.npmjs.com/package/wasm-feature-detect) — used for JSPI detection

