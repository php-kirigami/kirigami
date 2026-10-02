// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — client-side behaviour for <checklist>, <color>
// and <medialink>.
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
const FR = (document.documentElement.lang || '').toLowerCase().startsWith('fr');
const COPIED = FR ? 'Copié!' : 'Copied!';

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


// ── <medialink>: absolute URL, copy link, download through a blob ───────
const MEDIA_LABELS = FR
	? { download: 'Télécharger', copy: 'Copier le lien', copied: 'Lien copié ✓' }
	: { download: 'Download', copy: 'Copy link', copied: 'Link copied ✓' };

function initMedialink(root) {
	const link = root.querySelector('.medialink__download');
	const copy = root.querySelector('.medialink__copy');
	const field = root.querySelector('.medialink__url');
	if (!link || !copy) return;
	const href = new URL(link.getAttribute('href'), document.baseURI).href;

	for (const [el, label] of [[link, MEDIA_LABELS.download], [copy, MEDIA_LABELS.copy]]) {
		el.title = label;
		el.setAttribute('aria-label', label);
	}
	copy.dataset.copied = MEDIA_LABELS.copied;
	if (field) {
		field.value = href;
		field.addEventListener('focus', () => field.select());
	}

	copy.addEventListener('click', async () => {
		try { await navigator.clipboard.writeText(href); } catch { return; } // insecure context / denied
		flash(copy);
	});

	// A blob URL is same-origin, so `download` is honoured even for a file the
	// browser would display (svg, images, audio) or one served from another host.
	link.addEventListener('click', async (e) => {
		e.preventDefault();
		try {
			const res = await fetch(href);
			if (!res.ok) throw new Error(res.status);
			const blobUrl = URL.createObjectURL(await res.blob());
			const a = Object.assign(document.createElement('a'), { href: blobUrl, download: link.getAttribute('download') || '' });
			document.body.append(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
			flash(link);
		} catch {
			window.open(href, '_blank', 'noopener'); // no CORS on a foreign host: open it instead
		}
	});
}

function flash(el) {
	el.classList.add('is-done');
	clearTimeout(el._flash);
	el._flash = setTimeout(() => el.classList.remove('is-done'), 1500);
}

const startMedialinks = () => document.querySelectorAll('.medialink').forEach(initMedialink);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startMedialinks);
else startMedialinks();
