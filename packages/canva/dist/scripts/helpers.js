const busy = async (promise) => {
  document.documentElement.classList.add("is-busy");
  const results = await Promise.allSettled(promise instanceof Array ? promise : [promise]);
  document.documentElement.classList.remove("is-busy");
  return promise instanceof Array ? results : results[0];
};
const working = async (promise) => {
  document.documentElement.classList.add("is-working");
  const results = await Promise.allSettled(promise instanceof Array ? promise : [promise]);
  document.documentElement.classList.remove("is-working");
  return promise instanceof Array ? results : results[0];
};
const preloadImage = (url) => {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.onload = () => res("preloaded");
    img.onerror = rej;
    img.src = url;
    if (img.complete && img.naturalWidth > 0) res("memory-cache");
  });
};
const dedent = (str) => {
  const lines = String(str).replace(/^\n+/, "").replace(/\s+$/, "").split("\n");
  let min = Infinity;
  for (const line of lines) {
    if (line.trim() === "") continue;
    min = Math.min(min, line.match(/^\s*/)[0].length);
  }
  if (!min || min === Infinity) return lines.join("\n");
  return lines.map((line) => line.slice(min)).join("\n");
};
const documentReady = function(clb = null) {
  return new Promise((res) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        if (clb) res(clb());
        else res(true);
      }, { once: true });
    } else {
      if (clb) res(clb());
      else res(true);
    }
  });
};
export {
  busy,
  dedent,
  documentReady,
  preloadImage,
  working
};
//# sourceMappingURL=helpers.js.map
