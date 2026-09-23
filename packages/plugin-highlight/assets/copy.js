// ---------------------------------------------------------------------------
// Hover "Copy" button on every highlighted code block.
//
// @kirigami/plugin-highlight appends this to every esbuild bundle (the
// `esbuild:after` hook) when `copyButton` is on. It's a side-effect module —
// importing it registers `<pre>` on @kirigami/canva's observer, which hands
// over every block already in the page and every one inserted later (content
// loaded after the first paint, an SPA re-render). Pairs with the
// `.hljs-copy*` styles from the theme.
//
// Safe to run more than once (multiple bundles): every code block is enhanced
// at most once. It does NOT touch blocks another script has already wrapped —
// if you see two stacked buttons, a second copy-button implementation is
// still running (e.g. an older hand-rolled one); remove it.
// ---------------------------------------------------------------------------

import { register } from '@kirigami/canva/observer';

(() => {
	if (typeof document === 'undefined') return;

	const LABEL = 'Copy';
	const RESET_MS = 1600;

	function enhance(pre) {
		if (!pre || pre.dataset.hljsCopy) return;
		// A <button> already sits next to this <pre> — our own from an earlier
		// run, or another copy-button implementation. Either way, don't add
		// a second one.
		if (pre.nextElementSibling?.tagName === 'BUTTON'
			|| pre.previousElementSibling?.tagName === 'BUTTON') return;

		pre.dataset.hljsCopy = '1';

		const wrap = document.createElement('div');
		wrap.className = 'hljs-copy-wrap';
		pre.replaceWith(wrap);
		wrap.append(pre);

		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'hljs-copy';
		btn.textContent = LABEL;
		btn.setAttribute('aria-label', 'Copy code to clipboard');
		wrap.append(btn);

		let timer;
		btn.addEventListener('click', async () => {
			const code = pre.querySelector('code') || pre;
			const text = code.innerText.replace(/\n$/, '');
			try {
				await navigator.clipboard.writeText(text);
				btn.textContent = 'Copied';
				btn.dataset.copied = '1';
			} catch {
				btn.textContent = 'Press ⌘C';
			}
			clearTimeout(timer);
			timer = setTimeout(() => {
				btn.textContent = LABEL;
				delete btn.dataset.copied;
			}, RESET_MS);
		});
	}

	// The handler returns nothing, so the observer leaves the <pre> in place:
	// enhance() moves it into its wrapper itself, and the wrapper's insertion
	// doesn't re-dispatch a <pre> the observer has already seen. That also
	// means one chance per block: while the page is still parsing, a <pre>
	// can be reported before its <code> child is attached, so check it again
	// once parsing is done.
	const isHighlighted = (pre) => pre.querySelector(':scope > code.hljs');
	register('pre', (pre) => {
		if (isHighlighted(pre)) enhance(pre);
		else if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => {
				if (isHighlighted(pre)) enhance(pre);
			}, { once: true });
		}
	}, { voidLike: false });
})();
