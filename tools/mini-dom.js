'use strict';

/* Small dependency-free DOM for exercising the actual renderers in Node.
   It models reparenting/removal, native disabled buttons, attributes,
   bubbling events and the selectors used by the app. Browser QA remains
   responsible for layout, focus order and actual browser API behavior. */
const decode = s => String(s).replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, x => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }[x]));
const dataKey = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

class Node {
  constructor(tag = 'div', text = '') {
    this.tagName = tag.toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1;
    this.parentNode = null; this.childNodes = []; this.style = {};
    this.dataset = {}; this.attributes = {}; this._text = text; this._handlers = {};
    this.disabled = false; this.value = ''; this.tabIndex = -1; this._classes = new Set();
    this.classList = {
      add: (...xs) => xs.forEach(x => this._classes.add(x)),
      remove: (...xs) => xs.forEach(x => this._classes.delete(x)),
      contains: x => this._classes.has(x),
      toggle: (x, force) => { const yes = force == null ? !this._classes.has(x) : !!force; if (yes) this._classes.add(x); else this._classes.delete(x); return yes; },
    };
  }
  get children() { return this.childNodes.filter(x => x.nodeType === 1); }
  get firstChild() { return this.childNodes[0] || null; }
  get parentElement() { return this.parentNode; }
  get className() { return [...this._classes].join(' '); }
  set className(s) { this._classes = new Set(String(s).split(/\s+/).filter(Boolean)); }
  get textContent() { return this.nodeType === 3 ? this._text : this.childNodes.map(x => x.textContent).join(''); }
  set textContent(s) { this.replaceChildren(); this._text = String(s); if (this.nodeType !== 3 && s !== '') this.appendChild(new Node('#text', String(s))); }
  get innerHTML() { return this._html || this.textContent; }
  set innerHTML(html) {
    this.replaceChildren(); this._html = String(html);
    const stack = [this], tokens = String(html).match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [];
    const voids = new Set(['AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR']);
    for (const token of tokens) {
      if (token.startsWith('<!--')) continue;
      if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
      if (!token.startsWith('<')) { stack[stack.length - 1].appendChild(new Node('#text', decode(token))); continue; }
      const match = token.match(/^<([\w:-]+)([\s\S]*?)\/?\s*>$/);
      if (!match) continue;
      const child = new Node(match[1]);
      const attrs = match[2].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g);
      for (const a of attrs) child.setAttribute(a[1], decode(a[2] ?? a[3] ?? a[4] ?? ''));
      stack[stack.length - 1].appendChild(child);
      if (!voids.has(child.tagName) && !token.endsWith('/>')) stack.push(child);
    }
  }
  appendChild(child) { if (!child) return child; if (child.parentNode) child.remove(); child.parentNode = this; this.childNodes.push(child); return child; }
  append(...children) { children.forEach(x => this.appendChild(typeof x === 'string' ? new Node('#text', x) : x)); }
  replaceChildren(...children) { this.childNodes.forEach(x => { x.parentNode = null; }); this.childNodes = []; this.append(...children); }
  removeChild(child) { const i = this.childNodes.indexOf(child); if (i >= 0) { this.childNodes.splice(i, 1); child.parentNode = null; } return child; }
  insertBefore(child, before) { if (!before) return this.appendChild(child); if (child.parentNode) child.remove(); const i = this.childNodes.indexOf(before); child.parentNode = this; this.childNodes.splice(i < 0 ? 0 : i, 0, child); return child; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  contains(node) { return node === this || this.childNodes.some(x => x.contains(node)); }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'class') this.className = value;
    else if (name === 'id') this.id = String(value);
    else if (name.startsWith('data-')) this.dataset[dataKey(name.slice(5))] = String(value);
    else if (name === 'disabled') this.disabled = true;
    else if (name === 'value') this.value = String(value);
    else if (name === 'tabindex') this.tabIndex = Number(value);
    else if (['type', 'min', 'max', 'step'].includes(name)) this[name] = String(value);
  }
  getAttribute(name) { if (name === 'class') return this.className; if (name.startsWith('data-')) return this.dataset[dataKey(name.slice(5))] ?? null; return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; if (name === 'disabled') this.disabled = false; }
  addEventListener(name, handler) { (this._handlers[name] ||= []).push(handler); }
  dispatchEvent(event) {
    event.target ||= this; event.preventDefault ||= function () { this.defaultPrevented = true; };
    event.stopPropagation ||= function () { this.stopped = true; };
    let node = this;
    while (node) {
      event.currentTarget = node;
      if (node['on' + event.type]) node['on' + event.type](event);
      for (const fn of node._handlers[event.type] || []) fn(event);
      if (!event.bubbles || event.stopped) break;
      node = node.parentNode;
    }
    return !event.defaultPrevented;
  }
  click() { if (!this.disabled) this.dispatchEvent({ type: 'click', bubbles: true }); }
  matches(selector) {
    let s = selector.trim();
    const negatives = [...s.matchAll(/:not\(([^)]+)\)/g)].map(m => m[1]);
    if (negatives.some(n => this.matches(n))) return false;
    s = s.replace(/:not\([^)]+\)/g, '');
    if (s.includes(':first-child') && this.parentNode && this.parentNode.children[0] !== this) return false;
    s = s.replace(/:first-child/g, '');
    const attrs = [...s.matchAll(/\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/g)];
    for (const a of attrs) { const value = this.getAttribute(a[1]); if (value == null || (a[2] != null && value !== a[2])) return false; }
    s = s.replace(/\[[^\]]+\]/g, '');
    const id = s.match(/#([\w-]+)/); if (id && this.id !== id[1]) return false;
    const classes = [...s.matchAll(/\.([\w-]+)/g)].map(m => m[1]); if (classes.some(c => !this.classList.contains(c))) return false;
    const tag = s.match(/^[\w-]+/); return !tag || this.tagName === tag[0].toUpperCase();
  }
  querySelectorAll(selector) {
    const result = [], selectors = selector.split(',').map(x => x.trim());
    const hit = node => selectors.some(s => {
      const parts = s.split(/\s+(?![^\[]*\])/); if (!node.matches(parts.pop())) return false;
      let parent = node.parentNode;
      while (parts.length) { const p = parts.pop(); while (parent && !parent.matches(p)) parent = parent.parentNode; if (!parent) return false; parent = parent.parentNode; }
      return true;
    });
    const walk = node => { for (const child of node.children) { if (hit(child)) result.push(child); walk(child); } };
    walk(this); return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let n = this; n; n = n.parentNode) if (n.matches(selector)) return n; return null; }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  scrollIntoView() {}
  getBoundingClientRect() { return { x: 0, y: 0, top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 }; }
  get offsetWidth() { return 0; }
}

function environment() {
  const pending = new Map(); let nextTimer = 1;
  const doc = { body: new Node('body'), documentElement: new Node('html'), activeElement: null };
  doc.createElement = tag => { const node = new Node(tag); node.ownerDocument = doc; return node; };
  doc.createTextNode = text => new Node('#text', text);
  doc.getElementById = id => doc.body.querySelector('#' + id);
  for (const id of ['app', 'topbar']) { const node = doc.createElement(id === 'app' ? 'main' : 'header'); node.setAttribute('id', id); doc.body.appendChild(node); }
  const store = {};
  const sandbox = {
    console, Math, Date, JSON, Buffer, RegExp, Error, parseInt, parseFloat, isNaN, Number,
    document: doc, Element: Node, location: { href: '' }, navigator: {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    window: { scrollTo() {}, addEventListener() {}, matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }) },
    setTimeout(fn) { const id = nextTimer++; pending.set(id, fn); return id; }, clearTimeout(id) { pending.delete(id); },
    requestAnimationFrame: fn => fn(), scrollTo() {}, encodeURIComponent, decodeURIComponent,
  };
  sandbox.globalThis = sandbox;
  return { sandbox, document: doc, flush() { for (let guard = 0; pending.size; guard++) { if (guard > 5000) throw new Error('Timer loop'); const batch = [...pending.values()]; pending.clear(); batch.forEach(fn => fn()); } }, clearTimers() { pending.clear(); } };
}
module.exports = { Node, environment };
