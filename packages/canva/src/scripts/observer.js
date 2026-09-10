/******************************************************
 *                    Tag Observer                    *
 *                                                    *
 *  Register a custom element name plus a handler;    *
 *  every matching tag already in the document — and  *
 *  every one inserted later — is handed to that      *
 *  handler and replaced by whatever it returns.      *
 *                                                    *
 *  Built for "non-closing" authoring tags:           *
 *                                                    *
 *      <youtube id="abc123">                         *
 *                                                    *
 *  Browsers parse an unknown tag as an ordinary      *
 *  element, so whatever follows a tag left unclosed  *
 *  ends up *nested inside* it. With `voidLike` (on   *
 *  by default) those stray children are lifted back  *
 *  out as siblings before the tag is swapped.        *
 *                                                    *
 *  The observer starts on import (side effect): it   *
 *  first sweeps what is already parsed, then watches *
 *  the document for additions. Register from         *
 *  anywhere, whenever — a late registration still    *
 *  catches up on tags already on the page. This is   *
 *  the seam plugins hook into.                       *
 *                                                    *
 *      import { register } from                      *
 *          '@kirigami/canva/observer';               *
 *                                                    *
 *      register('youtube', el => `<iframe            *
 *          class="youtube" allowfullscreen           *
 *          src="https://www.youtube-nocookie.com/    *
 *          embed/${el.getAttribute('id')}"></iframe>`*
 *      );                                            *
 ******************************************************/

const handlers = new Map();   // localName (lowercase) → { fn, options }
const seen = new WeakSet();    // elements already dispatched
let mo = null;                 // the live MutationObserver, once started


/******************************************************
 *                   Result → Nodes                   *
 *                                                    *
 *  A handler may return an HTML string, a Node, a    *
 *  NodeList, or an array mixing any of those.        *
 ******************************************************/
const toNodes = (result) => {
	if (result == null || result === false) return [];
	if (result instanceof Node) return [result];
	if (result instanceof NodeList || Array.isArray(result)) {
		return [...result].flatMap(toNodes);
	}
	const tpl = document.createElement('template');
	tpl.innerHTML = String(result);
	return [...tpl.content.childNodes];
};


/******************************************************
 *                 Dispatch one element               *
 ******************************************************/
const dispatch = (el) => {
	const entry = handlers.get(el.localName);
	if (!entry || seen.has(el)) return;
	seen.add(el);

	let result;
	try {
		result = entry.fn(el);
	} catch (err) {
		console.error(`[canva/observer] "${el.localName}" handler threw`, err);
		return;
	}

	// No return value → leave the element alone (tag used only for a
	// side effect, e.g. lazy-loading or analytics wiring).
	if (result === undefined) return;

	// Undo the parser's "missing close tag" nesting: move any children
	// back out as siblings, right after where the tag sits.
	if (entry.options.voidLike && el.hasChildNodes()) {
		const stray = document.createDocumentFragment();
		while (el.firstChild) stray.appendChild(el.firstChild);
		el.after(stray);
	}

	const nodes = toNodes(result);
	if (nodes.length) el.replaceWith(...nodes);
	else el.remove(); // null / false / "" → drop the tag

	document.dispatchEvent(new CustomEvent('canva:observed', {
		detail: { tag: el.localName, source: el, nodes },
	}));
};


/******************************************************
 *                  Sweep a subtree                   *
 ******************************************************/
export const scan = (root = document) => {
	if (!handlers.size) return;
	const selector = [...handlers.keys()].join(',');

	if (root instanceof Element && handlers.has(root.localName)) dispatch(root);
	root.querySelectorAll?.(selector).forEach(dispatch);
};


const onMutations = (records) => {
	for (const rec of records) {
		for (const node of rec.addedNodes) {
			if (node.nodeType === 1) scan(node);
		}
	}
};


/******************************************************
 *                   Start / Stop                     *
 ******************************************************/
export const start = () => {
	if (mo) return;
	mo = new MutationObserver(onMutations);
	mo.observe(document.documentElement, { childList: true, subtree: true });

	// Process whatever is already parsed, then sweep once more when the
	// parser finishes, in case this ran mid-parse (rare for a module,
	// which is deferred, but cheap insurance).
	scan(document);
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => scan(document), { once: true });
	}
};

export const stop = () => {
	mo?.disconnect();
	mo = null;
};


/******************************************************
 *                  Register a tag                    *
 *                                                    *
 *  register(tag, fn, options?) → unregister()        *
 *                                                    *
 *  fn(el) may return:                                *
 *    • an HTML string / Node / NodeList / array      *
 *        → the tag is replaced by it                 *
 *    • null | false | ""                             *
 *        → the tag is removed                        *
 *    • undefined (no return)                         *
 *        → the tag is left in place                  *
 *                                                    *
 *  options.voidLike (default true): treat the tag    *
 *  as non-closing and lift any accidental nested     *
 *  children back out before replacing.               *
 ******************************************************/
export const register = (tag, fn, options = {}) => {
	if (typeof fn !== 'function') {
		throw new TypeError('register(tag, fn): fn must be a function');
	}
	const name = String(tag).toLowerCase();
	const entry = { fn, options: { voidLike: true, ...options } };
	handlers.set(name, entry);

	// Catch up on any matching tags already in the document.
	if (mo) scan(document);

	return () => {
		if (handlers.get(name) === entry) handlers.delete(name);
	};
};


start();
