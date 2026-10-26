'use strict';
/* The browser script manifest is authoritative: tools and the UI load the same data. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function element(tag = 'div') {
  const e = { tag, className: '', children: [], style: {}, dataset: {}, value: '', disabled: false, _html: '', _text: '', _handlers: {},
    appendChild(c) { this.children.push(c); return c; }, append(...cs) { this.children.push(...cs); },
    addEventListener(k, f) { this._handlers[k] = f; }, removeEventListener() {},
    removeChild(c) { this.children = this.children.filter(x => x !== c); }, insertBefore(c) { this.children.unshift(c); },
    click() { if (!this.disabled && this.onclick) this.onclick(); }, remove() {}, focus() {}, scrollIntoView() {}, closest() { return null; },
    querySelector(s) { return this._queries[s] || (this._queries[s] = element(s)); }, querySelectorAll() { return []; }, _queries: {},
    setAttribute(k, v) { this[k] = v; }, getAttribute(k) { return this[k]; },
    getBoundingClientRect() { return { width: 0, height: 0 }; }, offsetWidth: 0,
  };
  Object.defineProperties(e, {
    innerHTML: { set(v) { this._html = v; this.children.length = 0; }, get() { return this._html; } },
    textContent: { set(v) { this._text = v; }, get() { return this._text; } },
  });
  const classes = new Set();
  e.classList = { add(...s) { s.forEach(x => classes.add(x)); }, remove(...s) { s.forEach(x => classes.delete(x)); }, contains(s) { return classes.has(s); }, toggle(s, force) { const on = force == null ? !classes.has(s) : force; if (on) classes.add(s); else classes.delete(s); return on; } };
  return e;
}

function loadApp() {
  const issues = [];
  const context = { console: { ...console, error(...a) { issues.push(a.map(String).join(' ')); } }, Math, Date, JSON, Buffer, RegExp, Error,
    parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent, URL,
    setTimeout(f) { if (typeof f === 'function') f(); }, clearTimeout() {}, requestAnimationFrame(f) { if (f) f(); },
    localStorage: { _data: {}, getItem(k) { return this._data[k] || null; }, setItem(k, v) { this._data[k] = String(v); }, removeItem(k) { delete this._data[k]; } },
    document: { createElement: element, createTextNode: () => element('#text'), body: element('body'), _els: {}, getElementById(k) { return this._els[k] || (this._els[k] = element()); } },
    Element: function () {}, location: { href: '' }, scrollTo() {},
    window: { scrollTo() {}, addEventListener() {}, matchMedia: () => ({ matches: false, addListener() {} }) },
  };
  context.globalThis = context;
  vm.createContext(context);
  const files = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"]+)"/g)]
    .map(m => m[1]).filter(f => !/^(https?:)?\/\//.test(f) && f !== 'app.js');
  files.forEach(file => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file }));
  const SD = vm.runInContext('SD', context);
  SD.addXP = () => {};
  const levels = SD.tracks.flatMap(track => (SD.levelSets[track.id] || []).map(level => ({ track, level })));
  const missions = [];
  levels.forEach(({ track, level }) => {
    const stages = (level.stages || []).slice();
    if (level.interview) stages.push({ type: 'interview', ...level.interview });
    stages.forEach((stage, index) => {
      if (stage.type === 'terminal') missions.push({ id: `${level.id}/stage/${index}`, track, level, stage });
      if (stage.type === 'interview') (stage.questions || []).forEach((q, qi) => { if (q.terminal) missions.push({ id: `${level.id}/interview/${qi}`, track, level, stage: q.terminal }); });
    });
  });
  function terminal(stage) {
    const arena = element(); let sim; let won = 0;
    const wrapped = { ...stage, success(s) { sim = s; return stage.success(s); } };
    const controller = SD.renderers.terminal(wrapped, arena, () => { won++; });
    const term = arena.children.find(e => e.className === 'terminal');
    const input = term.querySelector('input'); const out = term.querySelector('.term-out');
    return { arena, input, out, controller, get sim() { return sim || (controller && controller.sim); }, get won() { return won; },
      run(command) { const before = out.children.length; input.value = command; input._handlers.keydown({ key: 'Enter', preventDefault() {} }); return out.children.slice(before).map(e => ({ kind: e.className, text: e.textContent })); },
    };
  }
  return { SD, context, files, levels, missions, terminal, issues, element };
}
module.exports = { loadApp, element, ROOT };
