<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/php-wasm

A custom PHP 8.5 WebAssembly build for Node.js — JSPI-only, no browser target.  
Built for the **[Kirigami](https://github.com/php-kirigami)** static site generator.

[![npm version](https://img.shields.io/npm/v/@kirigami/php-wasm)](https://www.npmjs.com/package/@kirigami/php-wasm)
[![License: GPL-2.0-or-later](https://img.shields.io/badge/license-GPL--2.0--or--later-yellow)](./LICENSE)
[![Node.js >=24.0.0](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![PHP 8.5.10](https://img.shields.io/badge/php-8.5.10-777bb4)](https://www.php.net/releases/8.5/)
[![Website](https://img.shields.io/badge/website-php--kirigami.github.io-1f6b4a)](https://php-kirigami.github.io)

</div>

---

## Overview

`@kirigami/php-wasm` is a **custom fork** of the PHP-WASM package from the [WordPress Playground](https://github.com/WordPress/wordpress-playground) project. It ships a pre-compiled PHP 8.5.10 WebAssembly binary and its Node.js loader, stripped down to exactly what the Kirigami project needs:

- ✅ **JSPI** (JavaScript Promise Integration) target only
- ✅ **Node.js** runtime only
- ❌ No browser build
- ❌ No `WORKER` / `IFRAME` targets

This intentional reduction keeps the package lean and avoids shipping browser-specific glue code that would never be used inside Kirigami's server-side execution environment.

Part of the **Kirigami** project ecosystem.

---

## Table of contents

- [@kirigami/php-wasm](#kirigamiphp-wasm)
- [Overview](#overview)
- [What's new — next release](#whats-new--next-release)
- [Fork origin](#fork-origin)
- [Compatibility & Runtime Helpers](#compatibility--runtime-helpers)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
  - [1. High-level execution with Outbound Networking](#1-high-level-execution-with-outbound-networking)
  - [2. Quick execution with `exec()`](#2-quick-execution-with-exec)
  - [3. Standard isolated runtime](#3-standard-isolated-runtime)
  - [4. Low-level configuration (Manual)](#4-low-level-configuration-manual)
- [Security considerations](#security-considerations)
- [TypeScript](#typescript)
- [Package contents](#package-contents)
- [PHP version](#php-version)
- [Related](#related)
- [Runtime extension inspection](#runtime-extension-inspection)
  - [Automatic extension discovery](#automatic-extension-discovery)
- [License](#license)

---

## What's new — next release

Unreleased notes for the current embedded build; no package version bump is assigned here.

The runtime includes a broader native extension set for Kirigami's PHP templates:

| Extension | Capability | Compared with the previous README snapshot |
|---|---|---|
| `bz2` | BZip2 compression/decompression, `compress.bzip2://`, and stream filters | Newly present in the current `phpinfo` output |
| `mdhtml` | Native Markdown rendering through cmark-gfm, used by `php-prepros`'s `MD::` wrapper | Already present in the previous snapshot; now documented as the active wrapper backend |
| `yaml` | Native YAML parsing through LibYAML, used by `YAML::` | Already present in the previous snapshot; YAML 1.1 scalar behavior now documented |
| `jsonk` | Native JSON Schema support and replacement of `json_encode()` / `json_decode()` | Already present and enabled in both snapshots |
| `lexbor` | HTML5 parsing and CSS selection | Already present in both snapshots |
| `navicat` | HTTP-tunnel database bridge for MySQL, PostgreSQL, and SQLite | Already present in both snapshots |
| `norm` | Unicode normalization and the `Normalizer` API | Already present in both snapshots |
| `apcu` / `igbinary` | In-memory caching and compact serialization | Already present in both snapshots |

Comparison source: the README's previously committed `phpinfo()` snapshot versus `node packages/cli/bin/kiri.js phpinfo -m` on 2026-09-20. Only `bz2` is a newly listed extension in that direct comparison; the other extensions should not be described as newly added relative to that snapshot. The current cURL/Navicat build also reports an updated linked zlib library. This comparison describes the local binary, not the contents of a published npm release.

For the PHP wrappers, quote YAML string keys/values such as `"NO"` to avoid YAML 1.1 boolean coercion. Markdown footnotes now use `<section class="footnotes" data-footnotes>`; custom CSS should target `.footnotes` instead of the old `div` tag. See [php-prepros](../php-prepros/README.md#unreleased).

---

## Fork origin

This package is derived from the [`@php-wasm/node`](https://github.com/WordPress/wordpress-playground/tree/trunk/packages/php-wasm/node) package inside the WordPress Playground monorepo:

> **Upstream:** https://github.com/WordPress/wordpress-playground

The WASM binary (`jspi/8_5_10/php_8_5.wasm`) and the Emscripten-generated loader (`jspi/php_8_5.js`) are built from that upstream source with a custom Dockerfile that enables JSPI and targets the Node.js environment only. No browser polyfills, no `TextEncoder`/`TextDecoder` shims, no DOM stubs.

---

## Compatibility & Runtime Helpers

This package is a **drop-in replacement** for the loader module consumed by [`@php-wasm/universal`](https://www.npmjs.com/package/@php-wasm/universal). It exposes the raw `PHPLoaderModule` interface along with high-level runtime instantiators that include out-of-the-box **networking capabilities**.

| Export | Description |
|---|---|
| `getPHPLoaderModule()` | Returns the raw JSPI PHP 8.5 loader module |
| `jspi()` | Detects JSPI support in the current runtime (re-exported from `wasm-feature-detect`) |
| `getPHPRuntime()` | Returns a standard PHP instance. **Memoized singleton** — the first call creates it, subsequent calls return the same instance |
| `getPHPRuntimeWithNetwork()` | Returns a PHP instance bound to a local TCP outbound proxy using Node built-ins and `ws` with SSL root certificates injected. **Memoized singleton**, separate from `getPHPRuntime()` |
| `createPHPRuntime({ network? }?)` | Creates an independent owned runtime, without changing either singleton. Call `php.exit()` when finished; this also closes its network proxy and sockets when networking is enabled |
| `getLoadedExtensions()` | Returns the names of every loaded PHP extension, sorted case-insensitively (e.g. `["Core", "curl", "gd", "imagick", "openssl", …]`) |
| `exec(code, network?)` | Executes a PHP code snippet against the standard runtime, or the network-enabled one if `network` is `true`. Returns `{ returnCode, stdout, stderr }` |
| `phpversion()` | Returns the running PHP interpreter's version string, e.g. `"8.5.10"` |
| `phpinfo()` | Returns the HTML result of `phpinfo()` |
| `setPhpIniValues(php, values, iniPath?)` | Updates or adds one or more `php.ini` directives on a PHP instance. Also available as `php.setIniValues(values)` on instances from `getPHPRuntime()` / `getPHPRuntimeWithNetwork()` |
| `getPhpIniValue(php, key, iniPath?)` | Reads the current value of a single, active (uncommented) `php.ini` directive |


---

## Requirements

- Node.js `>= 24.0.0`
- npm `>= 10.2.3`

> **JSPI support:** use the exported async `jspi()` feature check before creating a runtime. The package requires Node.js `>= 24.0.0`; embedded editor runtimes must be checked independently.

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

php.writeFile('/network-demo.php', `<?php
  // Native HTTPS request inside WASM using cURL!
  $ch = curl_init("https://api.github.com/zen");
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_USERAGENT, "Kirigami-PHP-WASM");

  $response = curl_exec($ch);

  echo "GitHub says: " . $response;
`);

const streamedResponse = await php.runStream({ scriptPath: '/network-demo.php' });

console.log(await streamedResponse.stdoutText);

// Clean up the proxy server when done if necessary
if (php._networkProxyServer) {
  php._networkProxyServer.close();
}

```

### 2. Quick execution with `exec()`

For one-off PHP snippets, `exec()` skips the manual `writeFile`/`runStream` dance: it writes your code to a temporary file, runs it, cleans up, and gives you back a plain result object.

```ts
import { exec } from '@kirigami/php-wasm';

// Standard runtime (no networking)
const { returnCode, stdout, stderr } = await exec('echo "Hello, Kirigami!";');
console.log(returnCode, stdout, stderr); // 0 "Hello, Kirigami!" ""

// Pass `true` as the second argument to run against the network-enabled runtime
const net = await exec(`
  $ch = curl_init("https://api.github.com/zen");
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  echo curl_exec($ch);
`, true);
console.log(net.stdout);
```

The `<?php` opening tag is added automatically if you don't include it.

Two small helpers are built on top of `exec()`:

```ts
import { phpversion, phpinfo } from '@kirigami/php-wasm';

console.log(await phpversion()); // "8.5.10"
console.log(await phpinfo());    // full phpinfo() HTML output
```

### 3. Standard isolated runtime

If you need the raw PHP instance instead of the `exec()` shorthand — for example to keep writing files to its virtual filesystem across multiple calls — use the lightweight isolated helper:

```ts
import { getPHPRuntime } from '@kirigami/php-wasm';

const php = await getPHPRuntime();
php.writeFile('/version.php', '<?php echo PHP_VERSION;');
const streamedResponse = await php.runStream({ scriptPath: '/version.php' });
console.log(await streamedResponse.stdoutText); // "8.5.10"

```

> `getPHPRuntime()` and `getPHPRuntimeWithNetwork()` are memoized: every call within the same process returns the same shared instance, so state persists between calls.

### 4. Low-level configuration (Manual)

For manual construction, use `loadPHPRuntime()` and pass its runtime ID to the `PHP` constructor:

```ts
import { getPHPLoaderModule } from '@kirigami/php-wasm';
import { PHP, loadPHPRuntime } from '@php-wasm/universal';

const loaderModule = await getPHPLoaderModule();
const runtimeId = await loadPHPRuntime(loaderModule);
const php = new PHP(runtimeId);

php.writeFile('/hello.php', '<?php echo "Hello, Kirigami!";');
const streamedResponse = await php.runStream({ scriptPath: '/hello.php' });
console.log(await streamedResponse.stdoutText); // Hello, Kirigami!

```

---

## Security considerations

`exec()` and the low-level `PHP` instance run inside the compiled WASM/Emscripten sandbox: PHP code sees a virtual filesystem (`writeFile`/`unlink` operate on it, not on your real disk) unless the host explicitly mounts files or installs bridges for filesystem, environment, or process access. `php-prepros` configures additional integration; do not treat arbitrary project PHP as untrusted isolated input. This is not equivalent to `child_process.exec()`, which runs directly on the host.

Two things narrow that isolation and are worth keeping in mind:

- **`getPHPRuntimeWithNetwork()`** gives the sandboxed PHP instance genuine outbound TCP access via the local proxy (not just HTTP/HTTPS). The proxy itself binds to `127.0.0.1` only, but the PHP code running inside can now reach out to the network like any other client.
- WASM sandboxing reduces host exposure but isn't a substitute for a security boundary like a container or VM if you're running fully untrusted PHP (e.g. user-submitted code) — apply the isolation appropriate to your threat model on top.

---

## TypeScript

The instances returned by `getPHPRuntime()` and `getPHPRuntimeWithNetwork()` aren't plain `@php-wasm/universal` `PHP` objects — this package attaches its own convenience members to them, and the types reflect that:

* `getPHPRuntime()` resolves to a `KirigamiPHP`, which extends `PHP` with a bound `.setIniValues(values)` method.
* `getPHPRuntimeWithNetwork()` resolves to a `KirigamiNetworkPHP`, which further adds `._networkProxyServer` (the `node:http` `Server` backing the outbound proxy).

```ts
import { getPHPRuntimeWithNetwork } from '@kirigami/php-wasm';

const php = await getPHPRuntimeWithNetwork();
php.setIniValues({ memory_limit: '256M' }); // typed, no cast needed
php._networkProxyServer.close();            // typed, no cast needed
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
│   └── 8_5_10/
│       └── php_8_5.wasm  # Compiled PHP 8.5.10 WebAssembly binary (size depends on the embedded build)
└── LICENSE

```

---

## PHP version

This package ships **PHP 8.5.10**.

The version is encoded in the package version number (`major.minor.patch` → `8.5.10`) so that the installed PHP version is always immediately visible from `package.json`.

---

## Related

* [WordPress Playground](https://github.com/WordPress/wordpress-playground) — upstream project
* [`@php-wasm/universal`](https://www.npmjs.com/package/@php-wasm/universal) — the runtime this loader integrates with
* [`wasm-feature-detect`](https://www.npmjs.com/package/wasm-feature-detect) — used for JSPI detection

---

## Runtime extension inspection

Inspect the embedded runtime used by your checkout:

```bash
npx kiri phpinfo -m
# From the monorepo, without relying on a globally installed CLI:
node packages/cli/bin/kiri.js phpinfo -m
```

`-m` / `--md` selects Markdown output; `-j` / `--json` selects JSON. The full output includes runtime settings and environment data, so it is generated on demand instead of maintained as a large machine-specific snapshot here.

The local runtime inspection on 2026-09-20 confirmed `mdhtml` with cmark-gfm and `yaml` with LibYAML enabled. `MD::` delegates to mdhtml; `YAML::` delegates to native YAML. The PHP YAML path uses YAML 1.1 scalar rules, including implicit booleans; quote string keys/values such as `"NO"`. Node’s `kirigami.yaml` parsing is a separate path. See [the PHP class reference](../php-prepros/README.md#yaml) for wrapper behavior and Markdown migration notes.

Other bundled capabilities include JSON/JSONK, DOM/XML, GD/Imagick, cURL/OpenSSL, SQLite, APCu, igbinary, norm, lexbor, and navicat. Query `getLoadedExtensions()` for the exact installed inventory rather than assuming an extension from another PHP installation is available.

```js
import { getLoadedExtensions } from '@kirigami/php-wasm';
console.log(await getLoadedExtensions());
```

The standard and network helpers each cache their runtime. Closing the network proxy is final for that cached instance; it is not a per-request cleanup step followed by automatic reopening.

### Automatic extension discovery

At runtime creation, the loader searches for directories named `phpext-*`, including those under `@kirigami`, in `node_modules` and `packages` under the current working directory and its ancestors. It also searches npm's global root for globally installed extension packages. That root is computed the way npm resolves its global prefix (`npm_config_prefix`, then `prefix=` in `~/.npmrc`, then the default next to the Node executable) rather than by spawning npm; a prefix set only in a global or builtin npmrc is not seen. Sibling projects are not searched, so an unrelated compiler checkout next to a Kirigami site cannot affect its runtime.

For each package, `manifest.json` may provide an extension `name` and an `artifacts` array with `phpVersion` and `sourcePath`. The loader prefers an artifact matching the runtime's PHP major/minor version, then a matching patch version, then a generic artifact. If no usable manifest artifact is found, it recursively selects the first `.so` file. It stages the resolved extensions under `/internal/shared/extensions` and adds `extension` directives to the VM's generated `php.ini`.

Set `KIRIGAMI_PHPEXT_DISCOVERY` to `local` to skip the global root, or to `off` to disable discovery entirely (the regression suite uses `off`). There is no explicit search-root option. Artifact selection does not establish binary compatibility. Use `getLoadedExtensions()` to check what actually loaded; finding or staging a `.so` does not prove that PHP accepted it. Cached runtimes are not rescanned for every execution.

---

## License

This package is distributed under `GPL-2.0-or-later` and is treated as a separate runtime component from the project core. See [LICENSE](./LICENSE) for the full text.

The repository root is licensed under `GPL-3.0-or-later`, but `@kirigami/php-wasm` remains independently licensed because it contains a compiled PHP/WASM runtime and binary assets with their own provenance and compatibility constraints. See [NOTICE](./NOTICE) for the package-level summary.
