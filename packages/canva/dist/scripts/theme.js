const STORAGE_KEY = "kirigami-theme";
const EVENT = "canva:themechange";
const root = document.documentElement;
const media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
const systemDark = () => !!(media && media.matches);
const onReady = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();
const getTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || "auto";
  } catch {
    return "auto";
  }
};
const resolvedTheme = () => {
  const attr = root.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return systemDark() ? "dark" : "light";
};
const applyPref = (pref) => {
  if (pref === "light" || pref === "dark") root.setAttribute("data-theme", pref);
  else root.removeAttribute("data-theme");
};
const setTheme = (pref) => {
  try {
    if (pref === "light" || pref === "dark") localStorage.setItem(STORAGE_KEY, pref);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
  applyPref(pref);
  const resolved = resolvedTheme();
  syncToggles(resolved);
  return resolved;
};
const toggleTheme = () => setTheme(resolvedTheme() === "dark" ? "light" : "dark");
const initTheme = () => applyPref(getTheme());
const PREFS = /* @__PURE__ */ new Set(["auto", "light", "dark"]);
function syncToggles(resolved = resolvedTheme()) {
  document.querySelectorAll("[data-theme-toggle]").forEach((el) => {
    el.setAttribute("data-theme-state", resolved);
    if (el.matches('button, [role="switch"], [role="button"], [role="checkbox"]')) {
      el.setAttribute("aria-pressed", String(resolved === "dark"));
    }
  });
  window.dispatchEvent(new CustomEvent(EVENT, {
    detail: { theme: resolved, preference: getTheme() }
  }));
}
function bindToggles(target = document) {
  target.querySelectorAll("[data-theme-toggle]").forEach((el) => {
    if (el.dataset.themeToggleBound) return;
    el.dataset.themeToggleBound = "1";
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const attr = el.getAttribute("data-theme-toggle");
      if (PREFS.has(attr)) setTheme(attr);
      else toggleTheme();
    });
  });
  syncToggles();
}
initTheme();
if (media) {
  const onOsChange = () => {
    if (getTheme() === "auto") syncToggles();
  };
  media.addEventListener ? media.addEventListener("change", onOsChange) : media.addListener(onOsChange);
}
onReady(() => bindToggles());
export {
  bindToggles,
  getTheme,
  initTheme,
  resolvedTheme,
  setTheme,
  toggleTheme
};
//# sourceMappingURL=theme.js.map
