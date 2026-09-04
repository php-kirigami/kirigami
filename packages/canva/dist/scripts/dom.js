const create = (tag, classname = null, content = null, attrs = {}) => {
  const elm = document.createElement(tag);
  if (classname) elm.className = classname;
  if (content) elm.innerHTML = content;
  Object.entries(attrs).forEach((a) => elm.setAttribute(a[0], a[1]));
  return elm;
};
HTMLElement.prototype.create = function(tag, classname = null, content = null, attrs = {}) {
  const elm = create(tag, classname, content, attrs);
  this.append(elm);
  return elm;
};
export {
  create
};
//# sourceMappingURL=dom.js.map
