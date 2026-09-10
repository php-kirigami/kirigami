const handlers = /* @__PURE__ */ new Map();
const seen = /* @__PURE__ */ new WeakSet();
let mo = null;
const toNodes = (result) => {
  if (result == null || result === false) return [];
  if (result instanceof Node) return [result];
  if (result instanceof NodeList || Array.isArray(result)) {
    return [...result].flatMap(toNodes);
  }
  const tpl = document.createElement("template");
  tpl.innerHTML = String(result);
  return [...tpl.content.childNodes];
};
const dispatch = (el) => {
  const entry = handlers.get(el.localName);
  if (!entry || seen.has(el)) return;
  seen.add(el);
  let result;
  try {
    result = entry.fn(el);
  } catch (err) {
    console.error(`[canva/observer] "${el.localName}" handler threw`, err);
    return;
  }
  if (result === void 0) return;
  if (entry.options.voidLike && el.hasChildNodes()) {
    const stray = document.createDocumentFragment();
    while (el.firstChild) stray.appendChild(el.firstChild);
    el.after(stray);
  }
  const nodes = toNodes(result);
  if (nodes.length) el.replaceWith(...nodes);
  else el.remove();
  document.dispatchEvent(new CustomEvent("canva:observed", {
    detail: { tag: el.localName, source: el, nodes }
  }));
};
const scan = (root = document) => {
  if (!handlers.size) return;
  const selector = [...handlers.keys()].join(",");
  if (root instanceof Element && handlers.has(root.localName)) dispatch(root);
  root.querySelectorAll?.(selector).forEach(dispatch);
};
const onMutations = (records) => {
  for (const rec of records) {
    for (const node of rec.addedNodes) {
      if (node.nodeType === 1) scan(node);
    }
  }
};
const start = () => {
  if (mo) return;
  mo = new MutationObserver(onMutations);
  mo.observe(document.documentElement, { childList: true, subtree: true });
  scan(document);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan(document), { once: true });
  }
};
const stop = () => {
  mo?.disconnect();
  mo = null;
};
const register = (tag, fn, options = {}) => {
  if (typeof fn !== "function") {
    throw new TypeError("register(tag, fn): fn must be a function");
  }
  const name = String(tag).toLowerCase();
  const entry = { fn, options: { voidLike: true, ...options } };
  handlers.set(name, entry);
  if (mo) scan(document);
  return () => {
    if (handlers.get(name) === entry) handlers.delete(name);
  };
};
start();
export {
  register,
  scan,
  start,
  stop
};
//# sourceMappingURL=observer.js.map
