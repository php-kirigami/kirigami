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
	/**
	 * A plugin-provided runnable script — the plugin's counterpart of a
	 * project's own `scripts/<name>.php` file plus its kirigami.yaml
	 * `scripts:` entry. Each listener returns (or an array of)
	 * `{ name, file, trigger?, mount? }`:
	 *   - `name`: identifier, invoked manually via `kiri run <name>`.
	 *   - `file`: absolute path to the plugin's own .php file, e.g.
	 *     `fileURLToPath(new URL('./scripts/optimize.php', import.meta.url))`.
	 *   - `trigger`: optional — 'before-build' | 'before-export' |
	 *     'after-export' — runs it automatically at that checkpoint, same as
	 *     a kirigami.yaml-declared script.
	 *   - `mount`: optional array of glob patterns (relative to the project
	 *     root) to mount into the WASM sandbox before it runs.
	 * A project's own scripts/<name>.php takes precedence over a plugin
	 * registering the same name. Fired with `{ config }`.
	 */
	SCRIPTS_REGISTER: 'scripts:register',
	/**
	 * A plugin-injected build task — the plugin's counterpart of a project's
	 * own kirigami.yaml `tasks:` entry. Each listener returns (or an array of)
	 * a task object shaped exactly like a `tasks:` entry (`{ name, type, ...
	 * }`, `type` being a built-in or any registered task type — often one the
	 * same plugin registers via `registerTaskType()`). Appended to the
	 * project's own `tasks:` list once, right after plugins load, so it goes
	 * through the same validation/build/export/watch path as any other task.
	 * Fired with `{ config }`.
	 */
	TASKS_REGISTER: 'tasks:register',
	/**
	 * An alternative to calling `registerCommand()` directly: each listener
	 * returns (or an array of) `{ name, description?, run }` — same shape
	 * `registerCommand()` takes — for a new `kiri <name>` subcommand. Routed
	 * through `registerCommand()` itself right after plugins load, so a
	 * duplicate name (against another hook entry or a directly-registered
	 * command) or a non-function `run` throws the same way either style is
	 * used. Fired with `{ config }`.
	 */
	COMMANDS_REGISTER: 'commands:register',
});
