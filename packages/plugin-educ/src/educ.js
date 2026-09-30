// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — client-side behaviour for <checklist>.
//
// Bundled into the first esbuild task (`esbuild:after`). The markup is built
// at build time (php/educ.php); this script restores and persists the checked
// items in the reader's browser (localStorage, keyed by page path + list id)
// and keeps the progress bar/percentage in sync.
// ---------------------------------------------------------------------------

const KEY_PREFIX = 'kirigami-checklist:';

function load(key, length) {
	let raw = null;
	try { raw = localStorage.getItem(key); } catch { /* storage unavailable */ }
	const checks = raw ? raw.split(',').map((v) => (v === '1' ? 1 : 0)) : [];
	// Saved state that no longer matches the list is discarded.
	return checks.length === length ? checks : new Array(length).fill(0);
}

function save(key, checks) {
	try { localStorage.setItem(key, checks.join(',')); } catch { /* full/unavailable — not fatal */ }
}

function init(root) {
	const items = [...root.querySelectorAll(':scope > ol > li')];
	const percent = root.querySelector('.checklist__percent');
	const key = KEY_PREFIX + location.pathname + ':' + root.dataset.id;
	const checks = load(key, items.length);

	const render = () => {
		const done = checks.reduce((a, b) => a + b, 0);
		const value = items.length ? Math.round((done / items.length) * 100) : 0;
		root.style.setProperty('--progress', value + '%');
		if (percent) percent.textContent = value + '%';
		items.forEach((li, i) => li.classList.toggle('checked', !!checks[i]));
	};

	// Links open in a new tab (same-page anchors excepted) and never toggle the item.
	const here = new URL(location.href);
	root.querySelectorAll('a').forEach((a) => {
		const target = new URL(a.href, document.baseURI);
		if (!(target.hash && target.host === here.host && target.pathname === here.pathname)) {
			a.target = '_blank';
			a.rel = 'noopener noreferrer';
		}
		a.addEventListener('click', (e) => e.stopPropagation());
	});

	items.forEach((li, i) => li.addEventListener('click', () => {
		if (window.getSelection().toString().length) return; // selecting text is not a click
		checks[i] = checks[i] ? 0 : 1;
		save(key, checks);
		render();
	}));

	render();
}

const start = () => document.querySelectorAll('.checklist[data-id]').forEach(init);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();


// ── <color>: click copies the color code ────────────────────────────────
const COPIED = (document.documentElement.lang || '').toLowerCase().startsWith('fr') ? 'Copié!' : 'Copied!';

document.addEventListener('click', async (e) => {
	const badge = e.target.closest?.('.color[data-color]');
	if (!badge || badge.dataset.copying) return;
	try { await navigator.clipboard.writeText(badge.dataset.color); } catch { return; } // insecure context / denied
	badge.dataset.copying = '1';
	// Both labels are measured in the same frame and the wider one is locked in, so the badge never resizes.
	const before = badge.offsetWidth;
	badge.textContent = COPIED;
	badge.style.minWidth = Math.max(before, badge.offsetWidth) + 'px';
	setTimeout(() => {
		badge.textContent = badge.dataset.color;
		delete badge.dataset.copying;
	}, 2000);
});
