/**
 * @kirigami/php-wasm
 *
 * A custom PHP-WASM build for Node.js — JSPI only, no browser support.
 * Built for the Kirigami project as a fork of wordpress-playground.
 *
 * @see https://github.com/WordPress/wordpress-playground
 */

import type { PHP } from '@php-wasm/universal';
import type { Server } from 'node:http';

/**
 * The PHP loader module interface, compatible with `@php-wasm/universal`.
 *
 * This mirrors the `PHPLoaderModule` shape expected by `@php-wasm/universal`'s
 * `PHP.load()` factory. You can use it anywhere `@php-wasm/universal` expects
 * a loader module.
 */
export interface PHPLoaderModule {
  /**
   * Absolute path to the `.wasm` binary on disk.
   * Resolved at build time relative to the package's `jspi/` directory.
   */
  readonly dependencyFilename: string;

  /**
   * Total byte size of the `.wasm` binary.
   * Used by consumers to display loading progress.
   */
  readonly dependenciesTotalSize: number;

  /**
   * Initialises the Emscripten runtime and returns the PHP module instance.
   *
   * @param RuntimeName - Must be `"NODE"` for this build. `"WORKER"` is also
   * accepted but has not been tested in this distribution.
   * @param PHPLoader   - The loader object provided by `@php-wasm/universal`.
   * Pass the object you receive inside the `onPhpLoader`
   * callback — do not construct it manually.
   * @returns A promise that resolves to the initialised Emscripten module.
   */
  init(RuntimeName: "NODE" | "WORKER", PHPLoader: object): Promise<unknown>;
}

/**
 * Dynamically imports the JSPI PHP 8.5 loader module.
 *
 * This is the primary entry-point for this package. Pass the returned module
 * directly to `@php-wasm/universal`'s `PHP.load()` as `phpLoaderModule`.
 *
 * @example
 * ```ts
 * import { getPHPLoaderModule } from '@kirigami/php-wasm';
 * import { PHP } from '@php-wasm/universal';
 *
 * const loaderModule = await getPHPLoaderModule();
 * const php = await PHP.load('8.5', { phpLoaderModule: loaderModule });
 *
 * const result = await php.run({ code: '<?php echo "Hello from PHP!";' });
 * console.log(result.text); // "Hello from PHP!"
 * ```
 *
 * @returns A promise that resolves to the PHP loader module.
 */
export declare function getPHPLoaderModule(): Promise<PHPLoaderModule>;

/**
 * Detects whether the current JavaScript runtime supports
 * **JavaScript Promise Integration (JSPI)** for WebAssembly.
 *
 * This package ships a JSPI-only build. Call this function before loading PHP
 * and handle the unsupported case gracefully if your environment might not
 * support JSPI.
 *
 * Re-exported from `wasm-feature-detect` for convenience.
 *
 * @example
 * ```ts
 * import { jspi } from '@kirigami/php-wasm';
 *
 * if (!(await jspi())) {
 * throw new Error('This runtime does not support WASM JSPI.');
 * }
 * ```
 *
 * @returns A promise that resolves to `true` if JSPI is available.
 */
export declare function jspi(): Promise<boolean>;

/**
 * A {@link PHP} instance as actually returned by this package's runtime
 * helpers — the base `@php-wasm/universal` instance plus the convenience
 * members this package attaches to it at creation time.
 */
export interface KirigamiPHP extends PHP {
  /**
   * Updates or adds `php.ini` directives on this instance.
   *
   * Bound convenience wrapper around {@link setPhpIniValues} — equivalent to
   * calling `setPhpIniValues(php, values)`, but without having to pass the
   * instance yourself.
   *
   * @example
   * ```ts
   * const php = await getPHPRuntime();
   * php.setIniValues({ memory_limit: '256M' });
   * ```
   */
  setIniValues(values: PHPIniValues): void;
}

/**
 * A {@link KirigamiPHP} instance as returned by {@link getPHPRuntimeWithNetwork},
 * additionally carrying a reference to its backing outbound proxy server.
 */
export interface KirigamiNetworkPHP extends KirigamiPHP {
  /**
   * The Node.js HTTP server backing this instance's WebSocket-to-TCP outbound
   * proxy. It is `unref()`'d, so it will not by itself keep the process
   * alive — call `.close()` on it for an explicit, immediate shutdown.
   *
   * @example
   * ```ts
   * php._networkProxyServer.close();
   * ```
   */
  _networkProxyServer: Server;
}

/**
 * Instantiates and returns a standard, isolated PHP runtime instance.
 *
 * A higher-level abstraction helper that automates the loader fetching
 * and initialization process using `@php-wasm/universal`.
 *
 * The instance is a **memoized singleton**: the first call creates it,
 * every subsequent call returns the same instance (state persists across
 * calls, e.g. files written to the virtual filesystem stay in place).
 *
 * @returns A promise that resolves to the shared PHP instance.
 */
export declare function getPHPRuntime(): Promise<KirigamiPHP>;

/**
 * Instantiates and returns a PHP runtime instance configured with full outbound networking.
 *
 * Automatically provisions a zero-dependency local WebSocket-to-TCP proxy on a free port,
 * injects the host's root certificates into the virtual filesystem (for native HTTPS/cURL/OpenSSL),
 * and hooks into Emscripten's SOCKFS layer.
 *
 * The instance is a **memoized singleton**, separate from the one returned by
 * {@link getPHPRuntime}: the first call creates it, every subsequent call
 * returns the same network-enabled instance.
 *
 * @returns A promise that resolves to the shared, network-enabled PHP instance.
 */
export declare function getPHPRuntimeWithNetwork(): Promise<KirigamiNetworkPHP>;

/**
 * A map of `php.ini` directive names to the value they should be set to.
 *
 * Keys are directive names as they appear in `php.ini` (e.g. `"memory_limit"`,
 * `"date.timezone"`, `"openssl.cafile"`). Values are coerced to strings when
 * written to the file.
 */
export type PHPIniValues = Record<string, string | number>;

/**
 * Updates or adds one or more directives in a PHP instance's `php.ini`.
 *
 * Any existing active line for a given directive is removed and replaced
 * with a new line at the end of the file; comments and unrelated directives
 * are left untouched. If a directive doesn't exist yet, it is appended.
 *
 * @example
 * ```ts
 * import { getPHPRuntimeWithNetwork, setPhpIniValues } from '@kirigami/php-wasm';
 *
 * const php = await getPHPRuntimeWithNetwork();
 *
 * setPhpIniValues(php, {
 *   memory_limit: '256M',
 *   upload_max_filesize: '20M',
 *   'date.timezone': 'Europe/Paris',
 * });
 * ```
 *
 * @param php - The PHP instance whose `php.ini` should be updated.
 * @param values - A map of directive names to the values they should take.
 * @param iniPath - Absolute path to the `php.ini` file inside the PHP
 * instance's virtual filesystem. Defaults to the runtime's shared
 * `php.ini`.
 */
export declare function setPhpIniValues(
  php: PHP,
  values: PHPIniValues,
  iniPath?: string
): void;

/**
 * Reads the current value of a single `php.ini` directive.
 *
 * Only active (uncommented) lines are considered; a directive that is
 * commented out (e.g. `;memory_limit = 128M`) is treated as absent.
 *
 * @example
 * ```ts
 * import { getPHPRuntime, getPhpIniValue } from '@kirigami/php-wasm';
 *
 * const php = await getPHPRuntime();
 * console.log(getPhpIniValue(php, 'memory_limit')); // e.g. "128M" or undefined
 * ```
 *
 * @param php - The PHP instance whose `php.ini` should be read.
 * @param key - The directive name to look up (e.g. `"memory_limit"`).
 * @param iniPath - Absolute path to the `php.ini` file inside the PHP
 * instance's virtual filesystem. Defaults to the runtime's shared
 * `php.ini`.
 * @returns The directive's current value as a trimmed string, or
 * `undefined` if the directive is not set (or only present in a comment).
 */
export declare function getPhpIniValue(
  php: PHP,
  key: string,
  iniPath?: string
): string | undefined;

/**
 * Result of {@link exec}.
 */
export interface PHPExecResult {
  /** Exit code of the PHP script. `0` means success. */
  returnCode: number;
  /** Captured stdout. */
  stdout: string;
  /** Captured stderr. */
  stderr: string;
}

/**
 * Executes a PHP code snippet and returns its result.
 *
 * The code is written to a temporary file in the virtual filesystem and
 * executed via `runStream()` (`php.run()` being deprecated). The opening
 * `<?php` tag is added automatically if missing. The temporary file is
 * removed once execution completes, even if it throws.
 *
 * @example
 * ```ts
 * import { exec } from '@kirigami/php-wasm';
 *
 * const { returnCode, stdout, stderr } = await exec('echo "Hello!";');
 *
 * // With outbound networking (proxy + CA bundle)
 * const net = await exec('echo file_get_contents("https://example.com");', true);
 * ```
 *
 * @param code - PHP code to execute (with or without the `<?php` tag).
 * @param network - When `true`, runs against the shared network-enabled
 * instance (see {@link getPHPRuntimeWithNetwork}) instead of the standard
 * one (see {@link getPHPRuntime}). Default: `false`.
 * @returns A promise that resolves to `{ returnCode, stdout, stderr }`.
 */
export declare function exec(code: string, network?: boolean): Promise<PHPExecResult>;

/**
 * Returns the names of every PHP extension currently loaded, sorted
 * case-insensitively.
 *
 * Shorthand for {@link exec} running `get_loaded_extensions()` and parsing
 * the JSON-encoded result.
 *
 * @example
 * ```ts
 * import { getLoadedExtensions } from '@kirigami/php-wasm';
 *
 * console.log(await getLoadedExtensions()); // e.g. ["Core", "curl", "openssl", ...]
 * ```
 *
 * @returns A promise that resolves to the sorted list of loaded extension names.
 */
export declare function getLoadedExtensions(): Promise<string[]>;

/**
 * Returns the running PHP interpreter's version string.
 *
 * Shorthand for {@link exec} running `echo phpversion();` and trimming
 * the result.
 *
 * @example
 * ```ts
 * import { phpversion } from '@kirigami/php-wasm';
 *
 * console.log(await phpversion()); // "8.5.10"
 * ```
 *
 * @returns A promise that resolves to the PHP version string.
 */
export declare function phpversion(): Promise<string>;

/**
 * Runs PHP's built-in `phpinfo()` and returns the rendered output as a string.
 *
 * Shorthand for {@link exec} running `phpinfo();`.
 *
 * @example
 * ```ts
 * import { phpinfo } from '@kirigami/php-wasm';
 *
 * const output = await phpinfo();
 * console.log(output);
 * ```
 *
 * @returns A promise that resolves to the phpinfo() output as a string.
 */
export declare function phpinfo(): Promise<string>;