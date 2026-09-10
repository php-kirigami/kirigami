// ---------------------------------------------------------------------------
// Generic in-memory hook registry. The @kirigami/kirigami tasks (like sass.js)
// fire named extension points via run(hookName, ...args), and any plugin can
// hook into them via on(hookName, fn).
//
// This module knows nothing about kirigami.yaml or the plugins themselves:
// kirigami-core's plugin system reads kirigami.yaml, loads the active
// packages, and lets each plugin call on() itself. Here we only route — which
// is what lets kirigami-core and the plugins (separate npm packages) share the
// same in-memory registry, all depending on the same instance of this module.
// ---------------------------------------------------------------------------

const listeners = new Map(); // hookName -> Set<fn>


export function on(hookName, fn) {
	if (!listeners.has(hookName)) listeners.set(hookName, new Set());
	listeners.get(hookName).add(fn);
	return () => off(hookName, fn); // handy for unregistering if needed
}


export function off(hookName, fn) {
	listeners.get(hookName)?.delete(fn);
}


// True if at least one listener is registered for a hook. Lets a task skip
// expensive setup (reading files, booting a runtime) when nothing hooks in.
export function has(hookName) {
	return !!listeners.get(hookName)?.size;
}


// Runs every listener of a hook, in registration order, and flattens their
// results. A listener may return undefined/null (ignored), a single value, or
// an array of values.
export async function run(hookName, ...args) {
	const fns = listeners.get(hookName);
	if (!fns || !fns.size) return [];

	const results = [];
	for (const fn of fns) {
		const value = await fn(...args);
		if (value == null) continue;
		results.push(...(Array.isArray(value) ? value : [value]));
	}
	return results;
}


// Pipes `value` through every listener of a hook, in registration order: each
// listener receives (value, ...args) and, unless it returns null/undefined,
// its return value becomes the input for the next one. Mirrors the PHP-side
// PREPROS::runHook() waterfall — the shape a task wants when a hook transforms
// a single artefact (an HTML string, a config object) rather than collecting
// contributions like run() does.
export async function runWaterfall(hookName, value, ...args) {
	const fns = listeners.get(hookName);
	if (!fns || !fns.size) return value;

	for (const fn of fns) {
		const next = await fn(value, ...args);
		if (next != null) value = next;
	}
	return value;
}
