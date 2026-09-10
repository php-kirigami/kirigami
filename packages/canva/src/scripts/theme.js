/******************************************************
 *                  Theme switching                   *
 *                                                    *
 *  Companion to styles/conf.scss `$dark` / `$theme`. *
 *  Writes `data-theme` on <html>:                    *
 *    • "auto"  → attribute removed, OS decides        *
 *    • "light" → data-theme="light" (forces light)   *
 *    • "dark"  → data-theme="dark"  (forces dark)     *
 *  The choice is persisted in localStorage.          *
 *                                                    *
 *  On import: re-applies the stored preference, then *
 *  wires every [data-theme-toggle] control and keeps *
 *  them in sync (incl. with OS changes in auto mode).*
 ******************************************************/

const STORAGE_KEY = 'kirigami-theme';
const EVENT = 'canva:themechange';
const root = document.documentElement;
const media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
const systemDark = () => !!(media && media.matches);

const onReady = (fn) =>
	document.readyState === 'loading'
		? document.addEventListener('DOMContentLoaded', fn, { once: true })
		: fn();


// Stored preference: "auto" | "light" | "dark" ("auto" when nothing is set).
export const getTheme = () => {
	try {
		return localStorage.getItem(STORAGE_KEY) || 'auto';
	} catch {
		return 'auto';
	}
};


// The theme actually on screen right now, resolving "auto" against the OS.
export const resolvedTheme = () => {
	const attr = root.getAttribute('data-theme');
	if (attr === 'light' || attr === 'dark') return attr;
	return systemDark() ? 'dark' : 'light';
};


const applyPref = (pref) => {
	if (pref === 'light' || pref === 'dark') root.setAttribute('data-theme', pref);
	else root.removeAttribute('data-theme');
};


// Set (and persist) the preference. Returns the resolved theme now shown.
export const setTheme = (pref) => {
	try {
		if (pref === 'light' || pref === 'dark') localStorage.setItem(STORAGE_KEY, pref);
		else localStorage.removeItem(STORAGE_KEY);
	} catch { /* private mode / storage disabled — apply anyway */ }
	applyPref(pref);
	const resolved = resolvedTheme();
	syncToggles(resolved);
	return resolved;
};


// Flip between light and dark based on what is currently shown.
export const toggleTheme = () =>
	setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark');


// Re-apply the stored preference. Call as early as possible (this module does
// it on import); for a flash-free first paint, also inline the snippet from
// the README in <head>.
export const initTheme = () => applyPref(getTheme());


// ── Declarative toggles ─────────────────────────────────────────────
//
//   <button data-theme-toggle>…</button>            → flips light ⇄ dark
//   <button data-theme-toggle="dark">…</button>     → forces that preference
//   <button data-theme-toggle="light|auto">…</button>
//
// Every toggle gets `data-theme-state="light|dark"` (the resolved theme) and,
// when it's a real control, `aria-pressed` (true while dark). A
// `canva:themechange` CustomEvent fires on `window` with `{ detail: { theme,
// preference } }` on every change.

const PREFS = new Set(['auto', 'light', 'dark']);

function syncToggles(resolved = resolvedTheme()) {
	document.querySelectorAll('[data-theme-toggle]').forEach((el) => {
		el.setAttribute('data-theme-state', resolved);
		if (el.matches('button, [role="switch"], [role="button"], [role="checkbox"]')) {
			el.setAttribute('aria-pressed', String(resolved === 'dark'));
		}
	});
	window.dispatchEvent(new CustomEvent(EVENT, {
		detail: { theme: resolved, preference: getTheme() },
	}));
}


// Wire every [data-theme-toggle] under `target` (idempotent). Called on import;
// call again yourself after injecting toggles into the DOM later.
export function bindToggles(target = document) {
	target.querySelectorAll('[data-theme-toggle]').forEach((el) => {
		if (el.dataset.themeToggleBound) return;
		el.dataset.themeToggleBound = '1';
		el.addEventListener('click', (e) => {
			e.preventDefault();
			const attr = el.getAttribute('data-theme-toggle');
			if (PREFS.has(attr)) setTheme(attr);
			else toggleTheme();
		});
	});
	syncToggles();
}


initTheme();

// Keep toggles (and listeners) current when the OS flips while in auto mode.
if (media) {
	const onOsChange = () => { if (getTheme() === 'auto') syncToggles(); };
	media.addEventListener ? media.addEventListener('change', onOsChange)
		: media.addListener(onOsChange);
}

onReady(() => bindToggles());
