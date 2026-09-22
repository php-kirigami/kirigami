/**
 * A hook listener. Can return a single value, an array of values (both get
 * flattened into run()'s result array), or null/undefined to contribute
 * nothing. May be async.
 */
export type HookListener<TArgs extends unknown[] = unknown[], TResult = unknown> = (
	...args: TArgs
) => TResult | TResult[] | null | undefined | Promise<TResult | TResult[] | null | undefined>;

/**
 * Registers a listener for a named hook.
 *
 * @returns An unsubscribe function, equivalent to calling `off(hookName, fn)`.
 */
export declare function on(hookName: string, fn: HookListener): () => void;

/**
 * Removes a previously registered listener for a named hook.
 */
export declare function off(hookName: string, fn: HookListener): void;

/**
 * True when at least one listener is registered for a hook. Lets a task skip
 * work (reading files, booting a runtime) when nothing hooks in.
 */
export declare function has(hookName: string): boolean;

/**
 * Runs every listener registered for a named hook, in registration order,
 * awaiting each in turn and flattening their results into a single array.
 * Listeners returning null/undefined contribute nothing.
 */
export declare function run(hookName: string, ...args: unknown[]): Promise<unknown[]>;

/**
 * Pipes `value` through every listener of a hook, in registration order: each
 * listener receives `(value, ...args)` and, unless it returns null/undefined,
 * its return value becomes the input for the next one. The shape a task wants
 * when a hook transforms a single artefact rather than collecting values.
 */
export declare function runWaterfall<T>(hookName: string, value: T, ...args: unknown[]): Promise<T>;

/**
 * Hook names exposed by @kirigami/kirigami's built-in tasks. Prefer these
 * over hand-typed strings to avoid silent typos.
 */
export declare const HOOKS: {
	readonly SASS_BEFORE: 'sass:before';
	readonly SASS_AFTER: 'sass:after';
	readonly SASS_FUNCTIONS: 'sass:functions';
	readonly ESBUILD_BEFORE: 'esbuild:before';
	readonly ESBUILD_AFTER: 'esbuild:after';
	readonly ESBUILD_PLUGINS: 'esbuild:plugins';
	readonly PREPROS_HTML: 'prepros:html';
	readonly PREPROS_PHP: 'prepros:php';
	readonly SCRIPTS_REGISTER: 'scripts:register';
	readonly TASKS_REGISTER: 'tasks:register';
};

/** A plugin-provided runnable/triggerable PHP script, registered via the `scripts:register` hook. */
export interface PluginScript {
	name: string;
	file: string;
	trigger?: 'before-build' | 'before-export' | 'after-export';
	mount?: string[];
}

/** A plugin-injected build task, registered via the `tasks:register` hook — same shape as a kirigami.yaml `tasks:` entry. */
export interface PluginTask {
	name: string;
	type: string;
	force?: boolean;
	[key: string]: unknown;
}

/**
 * A persistent key/value cache backed by SQLite (via node:sqlite — no
 * native compilation required). Values are JSON-serialized; each can carry
 * an optional TTL in seconds (0 = never expires).
 *
 * Every key must start with a namespace: one or more `[a-z]` characters
 * followed by `_` (e.g. `colors_`, `font_`, `meta_`). Keys that don't match
 * throw a `TypeError`. The namespace is what `purge(mask)` targets.
 */
export declare class Cache {
	/**
	 * @param dbFile Path to the SQLite database file. Defaults to
	 * `.node.db` in the current working directory.
	 */
	constructor(dbFile?: string);

	/** Returns the stored value for `key`, or `null` if missing/expired. */
	get<T = unknown>(key: string): T | null;

	/** Stores `val` (JSON-serialized) under `key`, with an optional TTL in seconds. */
	set(key: string, val: unknown, ttl?: number): boolean;

	/**
	 * Without an argument: deletes all expired entries.
	 * With a glob mask (`"meta_*"`, `"colors_*"`, …): deletes every entry
	 * whose key matches, expired or not — targeted invalidation of a
	 * namespace. Returns the number of rows deleted.
	 */
	purge(mask?: string | null): number;

	/** Deletes a single entry by key. */
	del(key: string): boolean;

	/** Closes the underlying database connection. */
	close(): void;
}

/** Clear one hook, or all hooks; commands and persistent caches are unaffected. */
export declare function reset(hookName?: string): void;

/** A command receives raw arguments and the host's loaded project. */
export interface Command<TProject = unknown, TResult = unknown> {
    name: string;
    description: string;
    run: (args: string[], project: TProject) => TResult | Promise<TResult>;
}

/** Register once by name; duplicate names and non-function runners throw. */
export declare function registerCommand<TProject = unknown, TResult = unknown>(
    name: string,
    command: Pick<Command<TProject, TResult>, 'run'> & { description?: string }
): void;

/** Returns the stored mutable entry, or null. The caller supplies the host type. */
export declare function getCommand<TProject = unknown, TResult = unknown>(
    name: string
): Command<TProject, TResult> | null;

/** Returns stored entries in registration order. */
export declare function listCommands<TProject = unknown, TResult = unknown>(): Command<TProject, TResult>[];

/** Clear one command, or all commands; hooks are unaffected. */
export declare function resetCommands(name?: string): void;

/** A plugin-provided build task type. */
export interface TaskType<TTask = Record<string, unknown>, TResult = unknown, TWatcher = unknown> {
	name: string;
	taskname: string;
	canbuild: boolean;
	canwatch: boolean;
	validate?: (root: string, task: TTask) => void | Promise<void>;
	run: (root: string, task: TTask, exportPath?: string) => TResult | Promise<TResult>;
	getWatcher?: (root: string, task: TTask) => TWatcher | Promise<TWatcher>;
}

/** Register a task type from a plugin's normal registration function. */
export declare function registerTaskType<TTask = Record<string, unknown>, TResult = unknown, TWatcher = unknown>(
	name: string,
	definition: Pick<TaskType<TTask, TResult, TWatcher>, 'run'> & Partial<Omit<TaskType<TTask, TResult, TWatcher>, 'name' | 'run'>>
): void;

/** Returns the stored mutable task-type definition, or null. */
export declare function getTaskType<TTask = Record<string, unknown>, TResult = unknown, TWatcher = unknown>(
	name: string
): TaskType<TTask, TResult, TWatcher> | null;

/** Returns registered task types in registration order. */
export declare function listTaskTypes<TTask = Record<string, unknown>, TResult = unknown, TWatcher = unknown>(): TaskType<TTask, TResult, TWatcher>[];

/** Clear one task type, or all task types; hooks and commands are unaffected. */
export declare function resetTaskTypes(name?: string): void;
