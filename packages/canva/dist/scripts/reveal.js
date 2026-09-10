const SELECTOR = "[data-reveal]";
const SHOWN = "is-in";
const ROOT_MARGIN = "0px 0px -10% 0px";
const SAFETY_MS = 1500;
const show = (el) => el.classList.add(SHOWN);
const reduceMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
function reveal(target = document) {
  const els = [...target.querySelectorAll(SELECTOR)].filter((el) => !el.classList.contains(SHOWN));
  if (!els.length) return;
  if (reduceMotion() || !("IntersectionObserver" in window)) {
    els.forEach(show);
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      show(entry.target);
      obs.unobserve(entry.target);
    }
  }, { rootMargin: ROOT_MARGIN });
  els.forEach((el) => io.observe(el));
  setTimeout(() => els.forEach(show), SAFETY_MS);
}
const onReady = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();
onReady(() => reveal());
export {
  reveal
};
//# sourceMappingURL=reveal.js.map
