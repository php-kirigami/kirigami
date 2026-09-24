export type ThemePreference = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

// Stored preference ("auto" when nothing is set).
export function getTheme(): ThemePreference;

// The theme actually on screen right now, resolving "auto" against the OS.
export function resolvedTheme(): ResolvedTheme;

// Sets (and persists) the preference. Returns the resolved theme now shown.
export function setTheme(pref: ThemePreference): ResolvedTheme;

// Flips between light and dark based on what is currently shown.
export function toggleTheme(): ResolvedTheme;

// Re-applies the stored preference. Runs once on import already.
export function initTheme(): void;

// Wires every [data-theme-toggle] under `target` (idempotent). Runs once on
// import already; call again after injecting more toggles into the DOM.
export function bindToggles(target?: ParentNode): void;
