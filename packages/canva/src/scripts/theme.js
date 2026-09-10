/******************************************************
 *                  Theme switching                   *
 *                                                    *
 *  Companion to styles/conf.scss `$dark` / `$theme`. *
 *  Writes `data-theme` on <html>:                    *
 *    • "auto"  → attribute removed, OS decides        *
 *    • "light" → data-theme="light" (forces light)   *
 *    • "dark"  → data-theme="dark"  (forces dark)     *
 *  The choice is persisted in localStorage.          *
 ******************************************************/

const STORAGE_KEY = 'kirigami-theme';
const root = document.documentElement;
const systemDark = () =>
	window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;


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
	return resolvedTheme();
};


// Flip between light and dark based on what is currently shown.
export const toggleTheme = () =>
	setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark');


// Re-apply the stored preference. Call as early as possible (this module does
// it on import); for a flash-free first paint, also inline the snippet from
// the README in <head>.
export const initTheme = () => applyPref(getTheme());


initTheme();
