<div align="center">

<img src="https://zmotrin.github.io/assets/kirigami/kirigami-logo-universal.svg" alt="Kirigami" width="400" />

---

# @kirigami/php-wasm

A custom PHP 8.5 WebAssembly build for Node.js — JSPI-only, no browser target.  
Built for the [Kirigami](https://github.com/php-kirigami) project.

[![npm version](https://img.shields.io/npm/v/@kirigami/php-wasm)](https://www.npmjs.com/package/@kirigami/php-wasm)
[![License: GPL-2.0-or-later](https://img.shields.io/badge/license-GPL--2.0--or--later-blue)](./LICENSE)
[![Node.js >=20.10.0](https://img.shields.io/badge/node-%3E%3D20.10.0-brightgreen)](https://nodejs.org)

</div>

---

## Overview

`@kirigami/php-wasm` is a **custom fork** of the PHP-WASM package from the [WordPress Playground](https://github.com/WordPress/wordpress-playground) project. It ships a pre-compiled PHP 8.5.10 WebAssembly binary and its Node.js loader, stripped down to exactly what the Kirigami project needs:

- ✅ **JSPI** (JavaScript Promise Integration) target only
- ✅ **Node.js** runtime only
- ❌ No browser build
- ❌ No `WORKER` / `IFRAME` targets

This intentional reduction keeps the package lean and avoids shipping browser-specific glue code that would never be used inside Kirigami's server-side execution environment.

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
| `getPHPRuntimeWithNetwork()` | Returns a PHP instance bound to a native, zero-dependency TCP outbound proxy with SSL root certificates injected. **Memoized singleton**, separate from `getPHPRuntime()` |
| `getLoadedExtensions()` | Returns the loaded extensions by the PHP-WASM Runtime` |
| `exec(code, network?)` | Executes a PHP code snippet against the standard runtime, or the network-enabled one if `network` is `true`. Returns `{ returnCode, stdout, stderr }` |
| `phpversion()` | Returns the running PHP interpreter's version string, e.g. `"8.5.10"` |
| `phpinfo()` | Returns the HTML result of `phpinfo()` |


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

> `getPHPRuntime()` and `getPHPRuntimeWithNetwork()` are memoized: every call within the same process returns the same shared instance, so state (files, defined constants, etc.) persists between calls.

### 4. Low-level configuration (Manual)

If you prefer to configure the `@php-wasm/universal` instance manually, pass the result of `getPHPLoaderModule()` to `PHP.load()`:

```ts
import { getPHPLoaderModule } from '@kirigami/php-wasm';
import { PHP } from '@php-wasm/universal';

const loaderModule = await getPHPLoaderModule();
const php = await PHP.load('8.5', { phpLoaderModule: loaderModule });

php.writeFile('/hello.php', '<?php echo "Hello, Kirigami!";');
const streamedResponse = await php.runStream({ scriptPath: '/hello.php' });
console.log(await streamedResponse.stdoutText); // Hello, Kirigami!

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
│       └── php_8_5.wasm  # Compiled PHP 8.5.10 WebAssembly binary (~17 MB)
└── LICENSE

```

---

## PHP version

This package ships **PHP 8.5.10**.

The version is encoded in the package version number (`major.minor.patch` → `8.5.10`) so that the installed PHP version is always immediately visible from `package.json`.

---

## License

`GPL-2.0-or-later` — same as the upstream WordPress Playground project.

See [LICENSE](https://www.google.com/search?q=./LICENSE) for the full text.

---

## Related

* [WordPress Playground](https://github.com/WordPress/wordpress-playground) — upstream project
* [`@php-wasm/universal`](https://www.npmjs.com/package/@php-wasm/universal) — the runtime this loader integrates with
* [`wasm-feature-detect`](https://www.npmjs.com/package/wasm-feature-detect) — used for JSPI detection


---


## PHP 8.5.10 - phpinfo()

**Version PHP :** 8.5.10

### General

**PHP Version 8.5.10**

> PHP Version 8.5.10

| Key | Value |
| --- | --- |
| System | Emscripten emscripten 4.0.19 #1 wasm32 |
| Build Date | Sep 1 2026 02:57:39 |
| Build System | Linux buildkitsandbox 6.18.33.2-microsoft-standard-WSL2 #1 SMP PREEMPT_DYNAMIC Thu Jun 18 21:54:43 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux |
| Configure Command | './configure' 'PKG_CONFIG_PATH=/root/lib/lib/pkgconfig' '--disable-fiber-asm' '--disable-phar' '--enable-json' '--enable-embed=static' '--with-layout=GNU' '--disable-cgi' '--disable-posix' '--enable-hash' '--enable-static' '--enable-shared' '--disable-session' '--enable-filter' '--enable-calendar' '--disable-rpath' '--disable-phpdbg' '--without-pear' '--with-valgrind=no' '--without-pcre-jit' '--enable-bcmath' '--enable-ctype' '--enable-tokenizer' '--enable-wasm_memory_storage' '--enable-dns_polyfill' '--enable-post_message_to_js' '--disable-opcache' '--with-zlib' '--with-zlib-dir=/root/lib' '--with-zip' '--enable-libxml' '--with-libxml' '--with-libxml-dir=/root/lib' '--enable-dom' '--enable-xml' '--enable-simplexml' '--enable-xmlreader' '--enable-xmlwriter' '--disable-soap' '--with-sqlite3' '--enable-pdo' '--with-pdo-sqlite=/root/lib' '--with-external-gd=/root/lib' '--enable-gd' '--with-avif' '--with-png-dir=/root/lib' '--with-jpeg' '--with-webp' '--with-openssl' '--with-openssl-dir=/root/lib' '--disable-fileinfo' '--with-iconv=/root/lib' '--with-curl=/root/lib' '--enable-mbstring' '--enable-exif' '--disable-mbregex' 'PKG_CONFIG_LIBDIR=/root/emsdk/upstream/emscripten/cache/sysroot/local/lib/pkgconfig:/root/emsdk/upstream/emscripten/cache/sysroot/lib/pkgconfig' 'CURL_CFLAGS=-I/root/lib/include' 'CURL_LIBS=-I/root/lib/lib -L/root/lib/lib' 'PNG_CFLAGS=-I/root/lib/include' 'PNG_LIBS=-L/root/lib/lib -lpng16 -lz' 'AVIF_CFLAGS=-I/root/lib/include' 'AVIF_LIBS=-L/root/lib/lib -lavif' 'WEBP_CFLAGS=-I/root/lib/include' 'WEBP_LIBS=-L/root/lib/lib -lwebp -lsharpyuv' 'JPEG_CFLAGS=-I/root/lib/include' 'JPEG_LIBS=-L/root/lib/lib -ljpeg' 'GDLIB_CFLAGS=-I/root/lib/include' 'GDLIB_LIBS=-L/root/lib/lib -lgd -lpng16 -lz -ljpeg -lwebp -lsharpyuv -lavif' |
| Server API | PHP WASM SAPI (JSPI) |
| Virtual Directory Support | disabled |
| Configuration File (php.ini) Path | /usr/local/etc |
| Loaded Configuration File | /internal/shared/php.ini |
| Scan this dir for additional .ini files | (none) |
| Additional .ini files parsed | (none) |
| PHP API | 20250925 |
| PHP Extension | 20250925 |
| Zend Extension | 420250925 |
| Zend Extension Build | API420250925,NTS |
| PHP Extension Build | API20250925,NTS |
| PHP Integer Size | 64 bits |
| Debug Build | no |
| Thread Safety | disabled |
| Zend Signal Handling | enabled |
| Zend Memory Manager | enabled |
| Zend Multibyte Support | provided by mbstring |
| Zend Max Execution Timers | disabled |
| IPv6 Support | enabled |
| DTrace Support | disabled |
| Registered PHP Streams | https, ftps, compress.zlib, php, file, glob, data, http, ftp, zip |
| Registered Stream Socket Transports | tcp, udp, unix, udg, ssl, tls, tlsv1.0, tlsv1.1, tlsv1.2, tlsv1.3 |
| Registered Stream Filters | zlib.*, string.rot13, string.toupper, string.tolower, convert.*, consumed, dechunk, convert.iconv.* |

| Key | Value |
| --- | --- |
| This program makes use of the Zend Scripting Language Engine:<br>Zend Engine v4.5.10, Copyright (c) Zend Technologies<br>with Zend OPcache v8.5.10, Copyright (c), by Zend Technologies | _no value_ |

### bcmath

| Key | Value |
| --- | --- |
| BCMath support | enabled |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| bcmath.scale | 0 | 0 |

### calendar

| Key | Value |
| --- | --- |
| Calendar support | enabled |

### Core

| Key | Value |
| --- | --- |
| PHP Version | 8.5.10 |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| allow_url_fopen | On | On |
| allow_url_include | Off | Off |
| arg_separator.input | & | & |
| arg_separator.output | & | & |
| auto_append_file | _no value_ | _no value_ |
| auto_globals_jit | On | On |
| auto_prepend_file | /internal/shared/auto_prepend_file.php | /internal/shared/auto_prepend_file.php |
| browscap | _no value_ | _no value_ |
| default_charset | UTF-8 | UTF-8 |
| default_mimetype | text/html | text/html |
| disable_functions | _no value_ | _no value_ |
| display_errors | On | On |
| display_startup_errors | On | On |
| doc_root | _no value_ | _no value_ |
| docref_ext | _no value_ | _no value_ |
| docref_root | _no value_ | _no value_ |
| enable_dl | On | On |
| enable_post_data_reading | On | On |
| error_append_string | _no value_ | _no value_ |
| error_log | _no value_ | _no value_ |
| error_log_mode | 0644 | 0644 |
| error_prepend_string | _no value_ | _no value_ |
| error_reporting | 30719 | 30719 |
| expose_php | On | On |
| extension_dir | /usr/local/lib/php/20250925 | /usr/local/lib/php/20250925 |
| fatal_error_backtraces | On | On |
| fiber.stack_size | _no value_ | _no value_ |
| file_uploads | On | On |
| hard_timeout | 2 | 2 |
| highlight.comment | #FF8000 | #FF8000 |
| highlight.default | #0000BB | #0000BB |
| highlight.html | #000000 | #000000 |
| highlight.keyword | #007700 | #007700 |
| highlight.string | #DD0000 | #DD0000 |
| html_errors | On | On |
| ignore_repeated_errors | On | On |
| ignore_repeated_source | Off | Off |
| ignore_user_abort | Off | Off |
| implicit_flush | On | On |
| include_path | .: | .: |
| input_encoding | _no value_ | _no value_ |
| internal_encoding | _no value_ | _no value_ |
| log_errors | On | On |
| mail.add_x_header | Off | Off |
| mail.cr_lf_mode | crlf | crlf |
| mail.force_extra_parameters | _no value_ | _no value_ |
| mail.log | _no value_ | _no value_ |
| mail.mixed_lf_and_crlf | Off | Off |
| max_execution_time | 0 | 0 |
| max_file_uploads | 20 | 20 |
| max_input_nesting_level | 64 | 64 |
| max_input_time | -1 | -1 |
| max_input_vars | 1000 | 1000 |
| max_memory_limit | -1 | -1 |
| max_multipart_body_parts | -1 | -1 |
| memory_limit | 256M | 256M |
| open_basedir | _no value_ | _no value_ |
| output_buffering | 0 | 0 |
| output_encoding | _no value_ | _no value_ |
| output_handler | _no value_ | _no value_ |
| post_max_size | 2000M | 2000M |
| precision | 14 | 14 |
| realpath_cache_size | 4096K | 4096K |
| realpath_cache_ttl | 120 | 120 |
| register_argc_argv | Off | Off |
| report_memleaks | On | On |
| report_zend_debug | Off | Off |
| request_order | _no value_ | _no value_ |
| sendmail_from | _no value_ | _no value_ |
| sendmail_path | /usr/sbin/sendmail -t -i | /usr/sbin/sendmail -t -i |
| serialize_precision | -1 | -1 |
| short_open_tag | On | On |
| SMTP | localhost | localhost |
| smtp_port | 25 | 25 |
| sys_temp_dir | _no value_ | _no value_ |
| syslog.facility | LOG_USER | LOG_USER |
| syslog.filter | no-ctrl | no-ctrl |
| syslog.ident | php | php |
| unserialize_callback_func | _no value_ | _no value_ |
| upload_max_filesize | 2000M | 2000M |
| upload_tmp_dir | _no value_ | _no value_ |
| user_dir | _no value_ | _no value_ |
| user_ini.cache_ttl | 300 | 300 |
| user_ini.filename | .user.ini | .user.ini |
| variables_order | EGPCS | EGPCS |
| xmlrpc_error_number | 0 | 0 |
| xmlrpc_errors | Off | Off |
| zend.assertions | 1 | 1 |
| zend.detect_unicode | On | On |
| zend.enable_gc | On | On |
| zend.exception_ignore_args | Off | Off |
| zend.exception_string_param_max_len | 15 | 15 |
| zend.multibyte | Off | Off |
| zend.script_encoding | _no value_ | _no value_ |
| zend.signal_check | Off | Off |

### ctype

| Key | Value |
| --- | --- |
| ctype functions | enabled |

### curl

| Key | Value |
| --- | --- |
| cURL support | enabled |
| cURL Information | 7.69.1 |
| Age | 5 |
| Features | _no value_ |
| AsynchDNS | No |
| CharConv | No |
| Debug | No |
| GSS-Negotiate | No |
| IDN | No |
| IPv6 | No |
| krb4 | No |
| Largefile | Yes |
| libz | Yes |
| NTLM | Yes |
| NTLMWB | Yes |
| SPNEGO | No |
| SSL | Yes |
| SSPI | No |
| TLS-SRP | Yes |
| HTTP2 | No |
| GSSAPI | No |
| KERBEROS5 | No |
| UNIX_SOCKETS | Yes |
| PSL | No |
| HTTPS_PROXY | Yes |
| MULTI_SSL | No |
| BROTLI | No |
| ALTSVC | No |
| HTTP3 | No |
| Protocols | dict, file, http, https |
| Host | i386-pc-linux-gnu |
| SSL Version | OpenSSL/1.1.1t |
| ZLib Version | 1.2.13 |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| curl.cainfo | _no value_ | _no value_ |

### date

| Key | Value |
| --- | --- |
| date/time support | enabled |
| timelib version | 2022.17 |
| "Olson" Timezone Database Version | 2026.3 |
| Timezone Database | internal |
| Default timezone | UTC |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| date.default_latitude | 31.7667 | 31.7667 |
| date.default_longitude | 35.2333 | 35.2333 |
| date.sunrise_zenith | 90.833333 | 90.833333 |
| date.sunset_zenith | 90.833333 | 90.833333 |
| date.timezone | UTC | UTC |

### dns_polyfill

| Key | Value |
| --- | --- |
| dns_polyfill support | enabled |

### dom

| Key | Value |
| --- | --- |
| DOM/XML | enabled |
| DOM/XML API Version | 20031129 |
| libxml Version | 2.9.10 |
| HTML Support | enabled |
| XPath Support | enabled |
| XPointer Support | enabled |
| Schema Support | enabled |
| RelaxNG Support | enabled |

### exif

| Key | Value |
| --- | --- |
| EXIF Support | enabled |
| Supported EXIF Version | 0220 |
| Supported filetypes | JPEG, TIFF |
| Multibyte decoding support using mbstring | enabled |
| Extended EXIF tag formats | Canon, Casio, Fujifilm, Nikon, Olympus, Samsung, Panasonic, DJI, Sony, Pentax, Minolta, Sigma, Foveon, Kyocera, Ricoh, AGFA, Epson |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| exif.decode_jis_intel | JIS | JIS |
| exif.decode_jis_motorola | JIS | JIS |
| exif.decode_unicode_intel | UCS-2LE | UCS-2LE |
| exif.decode_unicode_motorola | UCS-2BE | UCS-2BE |
| exif.encode_jis | _no value_ | _no value_ |
| exif.encode_unicode | ISO-8859-15 | ISO-8859-15 |

### filter

| Key | Value |
| --- | --- |
| Input Validation and Filtering | enabled |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| filter.default | unsafe_raw | unsafe_raw |
| filter.default_flags | _no value_ | _no value_ |

### gd

| Key | Value |
| --- | --- |
| GD Support | enabled |
| GD headers Version | 2.3.3 |
| GD library Version | 2.3.3 |
| FreeType Support | enabled |
| FreeType Linkage | with freetype |
| GIF Read Support | enabled |
| GIF Create Support | enabled |
| JPEG Support | enabled |
| PNG Support | enabled |
| WBMP Support | enabled |
| XBM Support | enabled |
| WebP Support | enabled |
| BMP Support | enabled |
| AVIF Support | enabled |
| TGA Read Support | enabled |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| gd.jpeg_ignore_warning | On | On |

### hash

| Key | Value |
| --- | --- |
| hash support | enabled |
| Hashing Engines | md2 md4 md5 sha1 sha224 sha256 sha384 sha512/224 sha512/256 sha512 sha3-224 sha3-256 sha3-384 sha3-512 ripemd128 ripemd160 ripemd256 ripemd320 whirlpool tiger128,3 tiger160,3 tiger192,3 tiger128,4 tiger160,4 tiger192,4 snefru snefru256 gost gost-crypto adler32 crc32 crc32b crc32c fnv132 fnv1a32 fnv164 fnv1a64 joaat murmur3a murmur3c murmur3f xxh32 xxh64 xxh3 xxh128 haval128,3 haval160,3 haval192,3 haval224,3 haval256,3 haval128,4 haval160,4 haval192,4 haval224,4 haval256,4 haval128,5 haval160,5 haval192,5 haval224,5 haval256,5 |

### iconv

| Key | Value |
| --- | --- |
| iconv support | enabled |
| iconv implementation | libiconv |
| iconv library version | 1.17 |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| iconv.input_encoding | _no value_ | _no value_ |
| iconv.internal_encoding | _no value_ | _no value_ |
| iconv.output_encoding | _no value_ | _no value_ |

### json

| Key | Value |
| --- | --- |
| json support | enabled |

### lexbor

| Key | Value |
| --- | --- |
| Lexbor support | active |
| Lexbor version | 2.7.0 |

### libxml

| Key | Value |
| --- | --- |
| libXML support | active |
| libXML Compiled Version | 2.9.10 |
| libXML Loaded Version | 20910-GITv2.9.10 |
| libXML streams | enabled |

### mbstring

| Key | Value |
| --- | --- |
| Multibyte Support | enabled |
| Multibyte string engine | libmbfl |
| HTTP input encoding translation | disabled |
| libmbfl version | 1.3.2 |

**mbstring extension makes use of "streamable kanji code filter and converter", which is distributed under the GNU Lesser General Public License version 2.1.**

> mbstring extension makes use of "streamable kanji code filter and converter", which is distributed under the GNU Lesser General Public License version 2.1.

| Directive | Local Value | Master Value |
| --- | --- | --- |
| mbstring.detect_order | _no value_ | _no value_ |
| mbstring.encoding_translation | Off | Off |
| mbstring.http_input | _no value_ | _no value_ |
| mbstring.http_output | _no value_ | _no value_ |
| mbstring.http_output_conv_mimetypes | ^(text/\|application/xhtml\+xml) | ^(text/\|application/xhtml\+xml) |
| mbstring.internal_encoding | _no value_ | _no value_ |
| mbstring.language | neutral | neutral |
| mbstring.strict_detection | Off | Off |
| mbstring.substitute_character | _no value_ | _no value_ |

### openssl

| Key | Value |
| --- | --- |
| OpenSSL support | enabled |
| OpenSSL Library Version | OpenSSL 1.1.1t 7 Feb 2023 |
| OpenSSL Header Version | OpenSSL 1.1.1t 7 Feb 2023 |
| Openssl default config | /root/install/ssl/openssl.cnf |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| openssl.cafile | _no value_ | _no value_ |
| openssl.capath | _no value_ | _no value_ |
| openssl.libctx | custom | custom |

### pcre

| Key | Value |
| --- | --- |
| PCRE (Perl Compatible Regular Expressions) Support | enabled |
| PCRE Library Version | 10.44 2024-06-07 |
| PCRE Unicode Version | 15.0.0 |
| PCRE JIT Support | not compiled in |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| pcre.backtrack_limit | 1000000 | 1000000 |
| pcre.recursion_limit | 100000 | 100000 |

### PDO

| Key | Value |
| --- | --- |
| PDO support | enabled |
| PDO drivers | sqlite |

### pdo_sqlite

| Key | Value |
| --- | --- |
| PDO Driver for SQLite 3.x | enabled |
| SQLite Library | 3.51.0 |

### post_message_to_js

| Key | Value |
| --- | --- |
| post_message_to_js support | enabled |

### random

| Key | Value |
| --- | --- |
| Version | 8.5.10 |

### Reflection

| Key | Value |
| --- | --- |
| Reflection | enabled |

### SimpleXML

| Key | Value |
| --- | --- |
| SimpleXML support | enabled |
| Schema support | enabled |

### SPL

| Key | Value |
| --- | --- |
| SPL support | enabled |
| Interfaces | OuterIterator, RecursiveIterator, SeekableIterator, SplObserver, SplSubject |
| Classes | AppendIterator, ArrayIterator, ArrayObject, BadFunctionCallException, BadMethodCallException, CachingIterator, CallbackFilterIterator, DirectoryIterator, DomainException, EmptyIterator, FilesystemIterator, FilterIterator, GlobIterator, InfiniteIterator, InvalidArgumentException, IteratorIterator, LengthException, LimitIterator, LogicException, MultipleIterator, NoRewindIterator, OutOfBoundsException, OutOfRangeException, OverflowException, ParentIterator, RangeException, RecursiveArrayIterator, RecursiveCachingIterator, RecursiveCallbackFilterIterator, RecursiveDirectoryIterator, RecursiveFilterIterator, RecursiveIteratorIterator, RecursiveRegexIterator, RecursiveTreeIterator, RegexIterator, RuntimeException, SplDoublyLinkedList, SplFileInfo, SplFileObject, SplFixedArray, SplHeap, SplMinHeap, SplMaxHeap, SplObjectStorage, SplPriorityQueue, SplQueue, SplStack, SplTempFileObject, UnderflowException, UnexpectedValueException |

### sqlite3

| Key | Value |
| --- | --- |
| SQLite3 support | enabled |
| SQLite Library | 3.51.0 |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| sqlite3.defensive | On | On |
| sqlite3.extension_dir | _no value_ | _no value_ |

### standard

| Key | Value |
| --- | --- |
| Dynamic Library Support | enabled |
| Path to sendmail | /usr/sbin/sendmail -t -i |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| assert.active | On | On |
| assert.bail | Off | Off |
| assert.callback | _no value_ | _no value_ |
| assert.exception | On | On |
| assert.warning | On | On |
| auto_detect_line_endings | Off | Off |
| default_socket_timeout | 60 | 60 |
| from | _no value_ | _no value_ |
| session.trans_sid_hosts | _no value_ | _no value_ |
| session.trans_sid_tags | a=href,area=href,frame=src,form= | a=href,area=href,frame=src,form= |
| unserialize_max_depth | 4096 | 4096 |
| url_rewriter.hosts | _no value_ | _no value_ |
| url_rewriter.tags | form= | form= |
| user_agent | _no value_ | _no value_ |

### tokenizer

| Key | Value |
| --- | --- |
| Tokenizer Support | enabled |

### uri

| Key | Value |
| --- | --- |
| URI support | active |
| uriparser bundled version | 1.0.2 |

### wasm_memory_storage

| Key | Value |
| --- | --- |
| wasm_memory_storage support | enabled |

### xml

| Key | Value |
| --- | --- |
| XML Support | active |
| XML Namespace Support | active |
| libxml2 Version | 2.9.10 |

### xmlreader

| Key | Value |
| --- | --- |
| XMLReader | enabled |

### xmlwriter

| Key | Value |
| --- | --- |
| XMLWriter | enabled |

### Zend OPcache

| Key | Value |
| --- | --- |
| Opcode Caching | Up and Running |
| Optimization | Enabled |
| SHM Cache | Disabled |
| File Cache | Enabled |
| JIT | Disabled |
| Startup | OK |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| opcache.blacklist_filename | _no value_ | _no value_ |
| opcache.dups_fix | Off | Off |
| opcache.enable | On | On |
| opcache.enable_cli | On | On |
| opcache.enable_file_override | Off | Off |
| opcache.error_log | _no value_ | _no value_ |
| opcache.file_cache | /internal/shared/opcache | /internal/shared/opcache |
| opcache.file_cache_consistency_checks | On | On |
| opcache.file_cache_only | On | On |
| opcache.file_cache_read_only | Off | Off |
| opcache.file_update_protection | 2 | 2 |
| opcache.force_restart_timeout | 180 | 180 |
| opcache.huge_code_pages | Off | Off |
| opcache.interned_strings_buffer | 8 | 8 |
| opcache.jit | 0 | 0 |
| opcache.jit_bisect_limit | 0 | 0 |
| opcache.jit_blacklist_root_trace | 16 | 16 |
| opcache.jit_blacklist_side_trace | 8 | 8 |
| opcache.jit_buffer_size | 64M | 64M |
| opcache.jit_debug | 0 | 0 |
| opcache.jit_hot_func | 127 | 127 |
| opcache.jit_hot_loop | 61 | 61 |
| opcache.jit_hot_return | 8 | 8 |
| opcache.jit_hot_side_exit | 8 | 8 |
| opcache.jit_max_exit_counters | 8192 | 8192 |
| opcache.jit_max_loop_unrolls | 8 | 8 |
| opcache.jit_max_polymorphic_calls | 2 | 2 |
| opcache.jit_max_recursive_calls | 2 | 2 |
| opcache.jit_max_recursive_returns | 2 | 2 |
| opcache.jit_max_root_traces | 1024 | 1024 |
| opcache.jit_max_side_traces | 128 | 128 |
| opcache.jit_max_trace_length | 1024 | 1024 |
| opcache.jit_prof_threshold | 0.005 | 0.005 |
| opcache.lockfile_path | /tmp | /tmp |
| opcache.log_verbosity_level | 1 | 1 |
| opcache.max_accelerated_files | 1000 | 1000 |
| opcache.max_file_size | 0 | 0 |
| opcache.max_wasted_percentage | 5 | 5 |
| opcache.memory_consumption | 64 | 64 |
| opcache.opt_debug_level | 0 | 0 |
| opcache.optimization_level | 0x7FFEBFFF | 0x7FFEBFFF |
| opcache.preferred_memory_model | _no value_ | _no value_ |
| opcache.preload | _no value_ | _no value_ |
| opcache.preload_user | _no value_ | _no value_ |
| opcache.protect_memory | Off | Off |
| opcache.record_warnings | Off | Off |
| opcache.restrict_api | _no value_ | _no value_ |
| opcache.revalidate_freq | 2 | 2 |
| opcache.revalidate_path | Off | Off |
| opcache.save_comments | On | On |
| opcache.use_cwd | On | On |
| opcache.validate_permission | Off | Off |
| opcache.validate_root | Off | Off |
| opcache.validate_timestamps | On | On |

### zip

| Key | Value |
| --- | --- |
| Zip | enabled |
| Zip version | 1.22.8 |
| Libzip version | 1.9.2 |
| BZIP2 compression | No |
| XZ compression | No |
| ZSTD compression | No |
| AES-128 encryption | No |
| AES-192 encryption | No |
| AES-256 encryption | No |

### zlib

| Key | Value |
| --- | --- |
| ZLib Support | enabled |
| Stream Wrapper | compress.zlib:// |
| Stream Filter | zlib.inflate, zlib.deflate |
| Compiled Version | 1.2.13 |
| Linked Version | 1.2.13 |

| Directive | Local Value | Master Value |
| --- | --- | --- |
| zlib.output_compression | Off | Off |
| zlib.output_compression_level | -1 | -1 |
| zlib.output_handler | _no value_ | _no value_ |

### Additional Modules

**Module Name**

> Module Name

### Environment

| Variable | Value |
| --- | --- |
| USER | web_user |
| LOGNAME | web_user |
| PATH | /internal/shared/bin |
| PWD | / |
| HOME | /home/web_user |
| LANG | en_CA.UTF-8 |
| _ | C:/Program Files/nodejs/node_modules/@kirigami/kirigami/bin/kiri.js |
| USE_ZEND_ALLOC | 0 |

### PHP Variables

| Variable | Value |
| --- | --- |
| $_SERVER['USER'] | web_user |
| $_SERVER['LOGNAME'] | web_user |
| $_SERVER['PATH'] | /internal/shared/bin |
| $_SERVER['PWD'] | / |
| $_SERVER['HOME'] | /home/web_user |
| $_SERVER['LANG'] | en_CA.UTF-8 |
| $_SERVER['_'] | C:/Program Files/nodejs/node_modules/@kirigami/kirigami/bin/kiri.js |
| $_SERVER['USE_ZEND_ALLOC'] | 0 |
| $_SERVER['REQUEST_URI'] | _no value_ |
| $_SERVER['SCRIPT_NAME'] | _no value_ |
| $_SERVER['SCRIPT_FILENAME'] | _no value_ |
| $_SERVER['PHP_SELF'] | _no value_ |
| $_SERVER['argv'] | _no value_ |
| $_SERVER['SERVER_SOFTWARE'] | PHP.wasm |
| $_SERVER['SERVER_PORT'] | 80 |
| $_SERVER['SERVER_NAME'] | example.com:443 |
| $_SERVER['HTTP_HOST'] | example.com:443 |
| $_SERVER['REQUEST_METHOD'] | GET |
| $_SERVER['QUERY_STRING'] | _no value_ |
| $_SERVER['HTTPS'] | off |
| $_SERVER['REQUEST_TIME_FLOAT'] | 1788281833.099 |
| $_SERVER['REQUEST_TIME'] | 1788281833 |
| $_ENV['USER'] | web_user |
| $_ENV['LOGNAME'] | web_user |
| $_ENV['PATH'] | /internal/shared/bin |
| $_ENV['PWD'] | / |
| $_ENV['HOME'] | /home/web_user |
| $_ENV['LANG'] | en_CA.UTF-8 |
| $_ENV['_'] | C:/Program Files/nodejs/node_modules/@kirigami/kirigami/bin/kiri.js |
| $_ENV['USE_ZEND_ALLOC'] | 0 |

### PHP Credits

**PHP Group**

| Key | Value |
| --- | --- |
| Thies C. Arntzen, Stig Bakken, Shane Caraveo, Andi Gutmans, Rasmus Lerdorf, Sam Ruby, Sascha Schumann, Zeev Suraski, Jim Winstead, Andrei Zmievski | _no value_ |

**Language Design & Concept**

| Key | Value |
| --- | --- |
| Andi Gutmans, Rasmus Lerdorf, Zeev Suraski, Marcus Boerger | _no value_ |

**PHP Authors**

| Contribution | Authors |
| --- | --- |
| Zend Scripting Language Engine | Andi Gutmans, Zeev Suraski, Stanislav Malyshev, Marcus Boerger, Dmitry Stogov, Xinchen Hui, Nikita Popov |
| Extension Module API | Andi Gutmans, Zeev Suraski, Andrei Zmievski |
| UNIX Build and Modularization | Stig Bakken, Sascha Schumann, Jani Taskinen, Peter Kokot |
| Windows Support | Shane Caraveo, Zeev Suraski, Wez Furlong, Pierre-Alain Joye, Anatol Belski, Kalle Sommer Nielsen |
| Server API (SAPI) Abstraction Layer | Andi Gutmans, Shane Caraveo, Zeev Suraski |
| Streams Abstraction Layer | Wez Furlong, Sara Golemon |
| PHP Data Objects Layer | Wez Furlong, Marcus Boerger, Sterling Hughes, George Schlossnagle, Ilia Alshanetsky |
| Output Handler | Zeev Suraski, Thies C. Arntzen, Marcus Boerger, Michael Wallner |
| Consistent 64 bit support | Anthony Ferrara, Anatol Belski |

**SAPI Modules**

| Contribution | Authors |
| --- | --- |
| Apache 2 Handler | Ian Holsman, Justin Erenkrantz (based on Apache 2 Filter code) |
| CGI / FastCGI | Rasmus Lerdorf, Stig Bakken, Shane Caraveo, Dmitry Stogov |
| CLI | Edin Kadribasic, Marcus Boerger, Johannes Schlueter, Moriyoshi Koizumi, Xinchen Hui |
| Embed | Edin Kadribasic |
| FastCGI Process Manager | Andrei Nigmatulin, dreamcat4, Antony Dovgal, Jerome Loyet |
| litespeed | George Wang |
| phpdbg | Felipe Pena, Joe Watkins, Bob Weinand |

**Module Authors**

| Module | Authors |
| --- | --- |
| BC Math | Andi Gutmans |
| Bzip2 | Sterling Hughes |
| Calendar | Shane Caraveo, Colin Viebrock, Hartmut Holzgraefe, Wez Furlong |
| COM and .Net | Wez Furlong |
| ctype | Hartmut Holzgraefe |
| cURL | Sterling Hughes |
| Date/Time Support | Derick Rethans |
| DB-LIB (MS SQL, Sybase) | Wez Furlong, Frank M. Kromann, Adam Baratz |
| DBA | Sascha Schumann, Marcus Boerger |
| DOM | Christian Stocker, Rob Richards, Marcus Boerger, Nora Dossche |
| enchant | Pierre-Alain Joye, Ilia Alshanetsky |
| EXIF | Rasmus Lerdorf, Marcus Boerger |
| FFI | Dmitry Stogov |
| fileinfo | Ilia Alshanetsky, Pierre Alain Joye, Scott MacVicar, Derick Rethans, Anatol Belski |
| Firebird driver for PDO | Ard Biesheuvel |
| FTP | Stefan Esser, Andrew Skalski |
| GD imaging | Rasmus Lerdorf, Stig Bakken, Jim Winstead, Jouni Ahto, Ilia Alshanetsky, Pierre-Alain Joye, Marcus Boerger, Mark Randall |
| GetText | Alex Plotnick |
| GNU GMP support | Stanislav Malyshev |
| Iconv | Rui Hirokawa, Stig Bakken, Moriyoshi Koizumi |
| Input Filter | Rasmus Lerdorf, Derick Rethans, Pierre-Alain Joye, Ilia Alshanetsky |
| Internationalization | Ed Batutis, Vladimir Iordanov, Dmitry Lakhtyuk, Stanislav Malyshev, Vadim Savchuk, Kirti Velankar |
| JSON | Jakub Zelenka, Omar Kilani, Scott MacVicar |
| LDAP | Amitay Isaacs, Eric Warnke, Rasmus Lerdorf, Gerrit Thomson, Stig Venaas |
| LIBXML | Christian Stocker, Rob Richards, Marcus Boerger, Wez Furlong, Shane Caraveo |
| Multibyte String Functions | Tsukada Takuya, Rui Hirokawa |
| MySQL driver for PDO | George Schlossnagle, Wez Furlong, Ilia Alshanetsky, Johannes Schlueter |
| MySQLi | Zak Greant, Georg Richter, Andrey Hristov, Ulf Wendel |
| MySQLnd | Andrey Hristov, Ulf Wendel, Georg Richter, Johannes Schlüter |
| ODBC driver for PDO | Wez Furlong |
| ODBC | Stig Bakken, Andreas Karajannis, Frank M. Kromann, Daniel R. Kalowsky |
| Opcache | Andi Gutmans, Zeev Suraski, Stanislav Malyshev, Dmitry Stogov, Xinchen Hui |
| OpenSSL | Stig Venaas, Wez Furlong, Sascha Kettler, Scott MacVicar, Eliot Lear |
| pcntl | Jason Greene, Arnaud Le Blanc |
| Perl Compatible Regexps | Andrei Zmievski |
| PHP Archive | Gregory Beaver, Marcus Boerger |
| PHP Data Objects | Wez Furlong, Marcus Boerger, Sterling Hughes, George Schlossnagle, Ilia Alshanetsky |
| PHP hash | Sara Golemon, Rasmus Lerdorf, Stefan Esser, Michael Wallner, Scott MacVicar |
| Posix | Kristian Koehntopp |
| PostgreSQL driver for PDO | Edin Kadribasic, Ilia Alshanetsky |
| PostgreSQL | Jouni Ahto, Zeev Suraski, Yasuo Ohgaki, Chris Kings-Lynne |
| random | Go Kudo, Tim Düsterhus, Guilliam Xavier, Christoph M. Becker, Jakub Zelenka, Bob Weinand, Máté Kocsis, and Original RNG implementators |
| Readline | Thies C. Arntzen |
| Reflection | Marcus Boerger, Timm Friebe, George Schlossnagle, Andrei Zmievski, Johannes Schlueter |
| Sessions | Sascha Schumann, Andrei Zmievski |
| Shared Memory Operations | Slava Poliakov, Ilia Alshanetsky |
| SimpleXML | Sterling Hughes, Marcus Boerger, Rob Richards |
| SNMP | Rasmus Lerdorf, Harrie Hazewinkel, Mike Jackson, Steven Lawrance, Johann Hanne, Boris Lytochkin |
| SOAP | Brad Lafountain, Shane Caraveo, Dmitry Stogov |
| Sockets | Chris Vandomelen, Sterling Hughes, Daniel Beulshausen, Jason Greene |
| Sodium | Frank Denis |
| SPL | Marcus Boerger, Etienne Kneuss |
| SQLite 3.x driver for PDO | Wez Furlong |
| SQLite3 | Scott MacVicar, Ilia Alshanetsky, Brad Dewar |
| System V Message based IPC | Wez Furlong |
| System V Semaphores | Tom May |
| System V Shared Memory | Christian Cartus |
| tidy | John Coggeshall, Ilia Alshanetsky |
| tokenizer | Andrei Zmievski, Johannes Schlueter |
| uri | Máté Kocsis, Tim Düsterhus, Ignace Nyamagana Butera, Arnaud Le Blanc, Dennis Snell, Nora Dossche, Nicolas Grekas |
| XML | Stig Bakken, Thies C. Arntzen, Sterling Hughes |
| XMLReader | Rob Richards |
| XMLWriter | Rob Richards, Pierre-Alain Joye |
| XSL | Christian Stocker, Rob Richards |
| Zip | Pierre-Alain Joye, Remi Collet |
| Zlib | Rasmus Lerdorf, Stefan Roehrich, Zeev Suraski, Jade Nicoletti, Michael Wallner |

**PHP Documentation**

| Key | Value |
| --- | --- |
| Authors | Mehdi Achour, Friedhelm Betz, Antony Dovgal, Nuno Lopes, Hannes Magnusson, Philip Olson, Georg Richter, Damien Seguy, Jakub Vrana, Adam Harvey |
| Editor | Peter Cowburn |
| User Note Maintainers | Daniel P. Brown, Thiago Henrique Pojda |
| Other Contributors | Previously active authors, editors and other contributors are listed in the manual. |

**PHP Quality Assurance Team**

| Key | Value |
| --- | --- |
| Ilia Alshanetsky, Joerg Behrens, Antony Dovgal, Stefan Esser, Moriyoshi Koizumi, Magnus Maatta, Sebastian Nohn, Derick Rethans, Melvyn Sopacua, Pierre-Alain Joye, Dmitry Stogov, Felipe Pena, David Soria Parra, Stanislav Malyshev, Julien Pauli, Stephen Zarkos, Anatol Belski, Remi Collet, Ferenc Kovacs | _no value_ |

**Websites and Infrastructure team**

| Key | Value |
| --- | --- |
| PHP Websites Team | Rasmus Lerdorf, Hannes Magnusson, Philip Olson, Lukas Kahwe Smith, Pierre-Alain Joye, Kalle Sommer Nielsen, Peter Cowburn, Adam Harvey, Ferenc Kovacs, Levi Morrison |
| Event Maintainers | Damien Seguy, Daniel P. Brown |
| Network Infrastructure | Daniel P. Brown |
| Windows Infrastructure | Alex Schoenmaker |

### PHP License

| Key | Value |
| --- | --- |
| This program is free software; you can redistribute it and/or modify it under the terms of the PHP License as published by the PHP Group and included in the distribution in the file: LICENSE<br>This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.<br>If you did not receive a copy of the PHP license, or have any questions about PHP licensing, please contact license@php.net. | _no value_ |


---

## License

MIT © Maxime Larrivée-Roy, 2026