// ---------------------------------------------------------------------------
// Names of the hooks exposed by the @kirigami/kirigami tasks. A plugin should
// always use these constants rather than retyping the strings by hand, to
// avoid silent typos (a misspelled hook throws no error, it just never fires)
// and to get autocomplete.
//
// This list grows as tasks expose new extension points — see the README for
// what each hook receives and expects in return.
// ---------------------------------------------------------------------------

export const HOOKS = Object.freeze({
	/** Path(s) of .scss file(s) compiled before the sass task entry. */
	SASS_BEFORE: 'sass:before',
	/** Path(s) of .scss file(s) compiled after the sass task entry. */
	SASS_AFTER: 'sass:after',
	/** Custom Sass functions, in the same format as the Sass API `functions` option. */
	SASS_FUNCTIONS: 'sass:functions',
	/** Path(s) of .js/.ts file(s) bundled (as side-effect imports) before the esbuild task entry. */
	ESBUILD_BEFORE: 'esbuild:before',
	/** Path(s) of .js/.ts file(s) bundled (as side-effect imports) after the esbuild task entry. */
	ESBUILD_AFTER: 'esbuild:after',
	/** esbuild plugin object(s), in the same format as the esbuild API `plugins` option. */
	ESBUILD_PLUGINS: 'esbuild:plugins',
	/**
	 * Final HTML of each rendered page, after @kirigami/php-prepros has written
	 * it. A waterfall hook (see `runWaterfall`): the listener receives
	 * `(html, { file, abs, exportPath, config })` and returns the modified HTML
	 * string (or null/undefined to leave it untouched).
	 */
	PREPROS_HTML: 'prepros:html',
	/**
	 * Absolute path(s) of PHP file(s) to include in the prepros runtime once,
	 * before any page renders — for a plugin to `PREPROS::registerTag()` /
	 * `registerHook()` etc. from PHP. Fired with `{ __root, config }`.
	 */
	PREPROS_PHP: 'prepros:php',
});
