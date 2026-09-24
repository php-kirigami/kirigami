export type ObserverResult = string | Node | NodeList | Array<string | Node> | null | false | undefined;

export interface RegisterOptions {
	// Treat the tag as non-closing and lift any accidentally-nested children
	// back out as siblings before replacing it. Default true.
	voidLike?: boolean;
}

// Sweeps `root` (default: the whole document) for every registered tag —
// called for you on start() and on every registration, so this is only for
// re-scanning content you inserted through a path the MutationObserver
// didn't see (rare).
export function scan(root?: ParentNode): void;

// Starts the observer (idempotent). Runs once on import already.
export function start(): void;

export function stop(): void;

// Registers a tag name with a handler; every matching element already in the
// document — and every one inserted later — is handed to `fn` and replaced
// by whatever it returns (a string/Node/NodeList/array replaces the tag,
// null/false/"" removes it, undefined leaves it in place). Returns an
// unregister function.
export function register(tag: string, fn: (el: Element) => ObserverResult, options?: RegisterOptions): () => void;
