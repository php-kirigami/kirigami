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
 * Runs every listener registered for a named hook, in registration order,
 * awaiting each in turn and flattening their results into a single array.
 * Listeners returning null/undefined contribute nothing.
 */
export declare function run(hookName: string, ...args: unknown[]): Promise<unknown[]>;

/**
 * Hook names exposed by @kirigami/kirigami's built-in tasks. Prefer these
 * over hand-typed strings to avoid silent typos.
 */
export declare const HOOKS: {
	readonly SASS_BEFORE: 'sass:before';
	readonly SASS_AFTER: 'sass:after';
	readonly SASS_FUNCTIONS: 'sass:functions';
};
