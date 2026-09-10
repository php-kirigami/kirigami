const STORAGE_KEY = "kirigami-theme";
const root = document.documentElement;
const systemDark = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
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
  return resolvedTheme();
};
const toggleTheme = () => setTheme(resolvedTheme() === "dark" ? "light" : "dark");
const initTheme = () => applyPref(getTheme());
initTheme();
export {
  getTheme,
  initTheme,
  resolvedTheme,
  setTheme,
  toggleTheme
};
//# sourceMappingURL=theme.js.map
