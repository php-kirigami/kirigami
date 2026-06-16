/**
 * @kirigami/php-wasm
 *
 * A custom PHP-WASM build for Node.js — JSPI only, no browser support.
 * Built for the Kirigami project as a fork of wordpress-playground.
 *
 * @see https://github.com/WordPress/wordpress-playground
 */

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
   *                      accepted but has not been tested in this distribution.
   * @param PHPLoader   - The loader object provided by `@php-wasm/universal`.
   *                      Pass the object you receive inside the `onPhpLoader`
   *                      callback — do not construct it manually.
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
 *   throw new Error('This runtime does not support WASM JSPI.');
 * }
 * ```
 *
 * @returns A promise that resolves to `true` if JSPI is available.
 */
export declare function jspi(): Promise<boolean>;