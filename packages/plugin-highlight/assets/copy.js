// ---------------------------------------------------------------------------
// Hover "Copy" button on every highlighted code block.
//
// @kirigami/plugin-highlight appends this to every esbuild bundle (the
// `esbuild:after` hook) when `copyButton` is on. It's a side-effect module —
// importing it runs it. Pairs with the `.hljs-copy*` styles from the theme.
//
// Safe to run more than once (multiple bundles, an SPA re-render): every code
// block is enhanced at most once. It does NOT touch blocks another script has
// already wrapped — if you see two stacked buttons, a second copy-button
// implementation is still running (e.g. an older hand-rolled one); remove it.
// ---------------------------------------------------------------------------

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

	function run() {
		document.querySelectorAll('pre > code.hljs').forEach((code) => enhance(code.parentElement));
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', run, { once: true });
	} else {
		run();
	}
})();
