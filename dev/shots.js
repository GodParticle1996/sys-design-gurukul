#!/usr/bin/env node
/* =====================================================================
   shots.js — headless-browser check for a track built with the dry-run renderer (default: 'sdd-resil')
   of System Gurukul (explain.js: dryrun / cards renderer + style.css tail).

   Run:   node dev/shots.js                   (from the app root, or any folder)
   Opts:  --viewports=390,1280                which viewports (default both)
          --track=ID                          which track to play (default sdd-resil)
          --levels=cb-kyun,cb-kaise           only these level ids (default: every level of that track)
          --fonts=liberation|system           liberation (default): alias Segoe UI/system-ui/sans-serif -> Liberation Sans
                                              (Arial metrics, closer to Segoe UI/Roboto than this machine's default DejaVu Sans);
                                              system: leave fontconfig alone (DejaVu Sans, ~10% wider)
          --wait-stable=SECONDS               first wait until data-v2-breaker-*.js / explain.js / style.css have not changed for that long
          --report-only                       rebuild REPORT.md from the last results.json (no browser)
          --no-shots                          measurements only, no PNGs
          --out=DIR                           output folder (default: <os tmp>/sysdesigngurukul-shots — never inside the repo: ~65 MB of PNGs)
          --app=DIR                           app root (default: the folder above this script)

   Writes: <out>/img/*.png, <out>/results.json, <out>/REPORT.md
           (REPORT.md also embeds <out>/manual-notes.md if that file exists)
   Read-only on the app. Does not install or download anything.
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

/* ------------------------------------------------------------------ args */
const ARGS = {};
process.argv.slice(2).forEach(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) ARGS[m[1]] = m[2] === undefined ? true : m[2];
});
const OUT = path.resolve(ARGS.out || path.join(os.tmpdir(), 'sysdesigngurukul-shots'));
const IMG = path.join(OUT, 'img');
const APP = path.resolve(ARGS.app || path.join(__dirname, '..'));
const URL = 'file://' + path.join(APP, 'index.html');
const NO_SHOTS = !!ARGS['no-shots'];
const FONTS = ARGS.fonts || 'liberation';
const TRACK = String(ARGS.track || 'sdd-resil');     /* which track to play (its levels, in order) */

const ALL_VIEWPORTS = [
  { name: '390', width: 390, height: 844, dsf: 2, mobile: true },
  { name: '1280', width: 1280, height: 900, dsf: 1, mobile: false },
];
const VIEWPORTS = ARGS.viewports
  ? ALL_VIEWPORTS.filter(v => String(ARGS.viewports).split(',').includes(v.name))
  : ALL_VIEWPORTS;

/* ------------------------------------------------------- find playwright */
function dataFileStamps() {
  const o = {};
  try { fs.readdirSync(APP).filter(f => /^data-v2-breaker-/.test(f) || f === 'explain.js' || f === 'style.css').forEach(f => { const st = fs.statSync(path.join(APP, f)); o[f] = st.mtime.toISOString() + ' ' + st.size + 'B'; }); } catch (e) { /* ignore */ }
  return o;
}

function findPlaywright() {
  const home = os.homedir();
  const npx = path.join(home, '.npm', '_npx');
  const cands = [];
  if (fs.existsSync(npx)) {
    for (const d of fs.readdirSync(npx)) {
      for (const n of ['playwright-core', 'playwright']) {
        const p = path.join(npx, d, 'node_modules', n);
        if (fs.existsSync(path.join(p, 'package.json'))) cands.push(p);
      }
    }
  }
  cands.sort((a, b) => (a.endsWith('playwright-core') ? -1 : 1) - (b.endsWith('playwright-core') ? -1 : 1));
  for (const p of cands) {
    try { return { mod: require(p), dir: p }; } catch (e) { /* try next */ }
  }
  throw new Error('No playwright / playwright-core found under ' + npx);
}

function findChromiums() {
  const root = path.join(os.homedir(), '.cache', 'ms-playwright');
  const out = [];
  if (!fs.existsSync(root)) return out;
  const rev = d => parseInt((d.match(/-(\d+)$/) || [0, 0])[1], 10);
  const dirs = fs.readdirSync(root);
  dirs.filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => rev(b) - rev(a)).forEach(d => {
    const p = path.join(root, d, 'chrome-linux64', 'chrome');
    if (fs.existsSync(p)) out.push(p);
  });
  dirs.filter(d => /^chromium_headless_shell-\d+$/.test(d)).sort((a, b) => rev(b) - rev(a)).forEach(d => {
    const p = path.join(root, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    if (fs.existsSync(p)) out.push(p);
  });
  return out;
}

/* fontconfig that maps the app's font stack onto metric-compatible fonts */
function writeFontConf() {
  const f = path.join(OUT, 'fonts.conf');
  const alias = (from, to) =>
    `  <match target="pattern"><test qual="any" name="family"><string>${from}</string></test>` +
    `<edit name="family" mode="assign" binding="strong"><string>${to}</string></edit></match>\n`;
  const sans = ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif', 'Helvetica', 'Arial'];
  const mono = ['Cascadia Code', 'Fira Code', 'Consolas', 'monospace'];
  fs.writeFileSync(f, '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n' +
    '  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n' +
    sans.map(s => alias(s, 'Liberation Sans')).join('') + mono.map(s => alias(s, 'Liberation Mono')).join('') +
    '</fontconfig>\n');
  return f;
}

/* ------------------------------------------------------------- utilities */
const pad2 = n => String(n).padStart(2, '0');
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9+_-]+/g, '-').replace(/^-+|-+$/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const uniq = a => [...new Set(a)];
const mdEsc = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

/* ====================================================================
   Code that runs INSIDE the page (must be self-contained)
   ==================================================================== */
function measureInPage() {
  const out = {};
  const R = n => Math.round(n * 10) / 10;
  const iw = window.innerWidth, ih = window.innerHeight;
  const de = document.documentElement;
  const q = s => document.querySelector(s);
  const vis = e => {
    if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect();
    if (r.width <= 0 && r.height <= 0) return false;
    const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  };
  const desc = e => {
    if (!e) return '?';
    let s = e.tagName.toLowerCase();
    if (e.id) s += '#' + e.id;
    const cl = (e.getAttribute && e.getAttribute('class')) || '';
    if (cl) s += '.' + cl.trim().split(/\s+/).slice(0, 3).join('.');
    const t = (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 36);
    return t ? s + ' "' + t + '"' : s;
  };
  const inSvg = e => e.tagName.toLowerCase() !== 'svg' && !!e.closest('svg');
  /* nearest ancestor that clips sideways AND whose own right edge is inside the limit */
  const clipper = (e, limitRight, stopAt) => {
    for (let p = e.parentElement; p && p !== stopAt; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' && p.getBoundingClientRect().right <= limitRight + 1) return p;
    }
    return null;
  };

  out.iw = iw; out.ih = ih;
  out.scrollW = de.scrollWidth;
  out.pageH = Math.max(de.scrollHeight, document.body.scrollHeight);
  out.scrollY = R(window.scrollY);
  out.hOverflow = de.scrollWidth > iw + 1;
  out.bodyOverflowX = getComputedStyle(document.body).overflowX;

  /* ---- which element makes the page scroll sideways ---- */
  out.pageOffenders = [];
  if (out.hOverflow) {
    const all = [...document.body.querySelectorAll('*')].filter(e => !inSvg(e) && vis(e));
    const off = all.filter(e => e.getBoundingClientRect().right > iw + 1 && !clipper(e, iw, de));
    const set = new Set(off);
    out.pageOffenders = off.filter(e => !set.has(e.parentElement)).slice(0, 8)
      .map(e => ({ el: desc(e), right: R(e.getBoundingClientRect().right), width: R(e.getBoundingClientRect().width) }));
  }

  /* ---- visible text containing undefined / NaN / [object Object] ---- */
  out.badText = [];
  {
    const re = /\bundefined\b|\bNaN\b|\[object Object\]/;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (!re.test(n.nodeValue)) continue;
      const p = n.parentElement;
      if (!p || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(p.tagName)) continue;
      if (p.checkVisibility && !p.checkVisibility({ checkVisibilityCSS: true })) continue;
      out.badText.push({ text: n.nodeValue.trim().replace(/\s+/g, ' ').slice(0, 100), el: desc(p), inCode: !!p.closest('.dr-code, pre, code') });
    }
  }

  const wrap = q('.dr-wrap');
  out.hasWrap = !!wrap;
  if (!wrap) return out;
  const panel = wrap.closest('.panel') || q('.panel');
  const pr = panel.getBoundingClientRect();
  out.panelRight = R(pr.right); out.panelLeft = R(pr.left);
  out.counter = (q('.dr-counter') || {}).textContent || '';

  /* ---- elements inside .dr-wrap sticking out of the panel (right or left) ---- */
  out.drOverflow = []; out.hScrollers = [];
  {
    const els = [...wrap.querySelectorAll('*')].filter(e => !inSvg(e) && vis(e));
    const bad = els.filter(e => {
      const r = e.getBoundingClientRect();
      return r.right > pr.right + 1 || r.left < pr.left - 1;
    });
    const clipped = [], loose = [];
    bad.forEach(e => (clipper(e, pr.right, panel.parentElement) ? clipped : loose).push(e));
    const set = new Set(loose);
    out.drOverflow = loose.filter(e => !set.has(e.parentElement)).slice(0, 8).map(e => {
      const r = e.getBoundingClientRect();
      return { el: desc(e), right: R(r.right), left: R(r.left), overBy: R(Math.max(r.right - pr.right, pr.left - r.left)) };
    });
    /* containers that scroll sideways on purpose (tables/pre in .dr-scroll, .dr-say pre ...) */
    wrap.querySelectorAll('.dr-scroll, .dr-say pre, .dr-say table, .dr-code, .dr-vars, .dr-diagram').forEach(e => {
      if (vis(e) && e.scrollWidth > e.clientWidth + 1) out.hScrollers.push({ el: desc(e), clientW: e.clientWidth, scrollW: e.scrollWidth });
    });
  }

  /* ---- SVG diagram ---- */
  const svg = wrap.querySelector('.dr-diagram svg');
  out.svg = null;
  if (svg) {
    const vb = svg.viewBox.baseVal;
    const sr = svg.getBoundingClientRect();
    const scale = sr.width / vb.width;
    const fsOf = sel => { const e = svg.querySelector(sel); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
    const px = { node: fsOf('.ms-lbl'), flabel: fsOf('.ms-flabel text'), badge: fsOf('.ms-badge text'), icon: fsOf('.ms-ico') };
    const eff = {};
    Object.keys(px).forEach(k => { eff[k] = px[k] == null ? null : R(px[k] * scale); });
    const S = { renderedW: R(sr.width), renderedH: R(sr.height), vbW: vb.width, vbH: vb.height, scale: Math.round(scale * 1000) / 1000, fontUser: px, effPx: eff };

    const bb = e => { const b = e.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.x + b.width, b: b.y + b.height }; };
    const tolerance = 0.5;
    S.cut = [];       /* <text> whose box leaves the svg viewBox */
    S.spill = [];     /* <text> wider/taller than the pill/box that is meant to hold it */
    svg.querySelectorAll('text').forEach(t => {
      const b = bb(t);
      const label = (t.textContent || '').trim();
      if (b.x < vb.x - tolerance || b.y < vb.y - tolerance || b.r > vb.x + vb.width + tolerance || b.b > vb.y + vb.height + tolerance) {
        S.cut.push({ text: label, cls: t.getAttribute('class') || '', box: [R(b.x), R(b.y), R(b.r), R(b.b)], viewBox: [vb.x, vb.y, vb.width, vb.height] });
      }
      const g = t.parentElement;
      let holder = null;
      if (t.classList.contains('ms-lbl')) holder = g.querySelector(':scope > rect');
      else if (g.classList.contains('ms-flabel') || g.classList.contains('ms-badge')) holder = g.querySelector(':scope > rect');
      if (holder) {
        const h = bb(holder);
        if (b.x < h.x - tolerance || b.r > h.r + tolerance || b.y < h.y - 1 || b.b > h.b + 1) {
          S.spill.push({ text: label, cls: t.getAttribute('class') || (g.getAttribute('class') || ''), textBox: [R(b.x), R(b.y), R(b.r), R(b.b)], holder: [R(h.x), R(h.y), R(h.r), R(h.b)] });
        }
      }
    });

    /* overlaps */
    const boxes = [];
    svg.querySelectorAll('.ms-flabel').forEach(g => boxes.push({ kind: 'flow-label', name: (g.querySelector('text') || {}).textContent, b: bb(g.querySelector('rect')), g }));
    svg.querySelectorAll('.ms-node').forEach(g => {
      const lbl = (g.querySelector('.ms-lbl') || {}).textContent;
      boxes.push({ kind: 'node', name: lbl, b: bb(g.querySelector(':scope > rect')), g });
      const bd = g.querySelector('.ms-badge');
      if (bd) boxes.push({ kind: 'badge', name: ((bd.querySelector('text') || {}).textContent || '') + ' @' + lbl, b: bb(bd.querySelector('rect')), g: bd, owner: lbl });
    });
    const inter = (a, b) => {
      const w = Math.min(a.r, b.r) - Math.max(a.x, b.x), h = Math.min(a.b, b.b) - Math.max(a.y, b.y);
      return w > 0.5 && h > 0.5 ? { w: R(w), h: R(h) } : null;
    };
    S.overlaps = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.kind === 'badge' && b.kind === 'node' && a.owner === b.name) continue;
      if (b.kind === 'badge' && a.kind === 'node' && b.owner === a.name) continue;
      const o = inter(a.b, b.b);
      if (o) S.overlaps.push({ a: a.kind + ' "' + a.name + '"', b: b.kind + ' "' + b.name + '"', w: o.w, h: o.h });
    }
    /* a flow-label pill / badge sitting on top of somebody's TEXT */
    S.coversText = [];
    const hostTexts = [];
    svg.querySelectorAll('.ms-lbl, .ms-ico, .ms-badge text, .ms-flabel text').forEach(t => hostTexts.push({ t, b: bb(t) }));
    boxes.filter(b => b.kind === 'flow-label' || b.kind === 'badge').forEach(f => {
      hostTexts.forEach(h => {
        if (h.t.closest('.ms-flabel, .ms-badge') === f.g) return;      /* the pill's own text */
        const o = inter(f.b, h.b);
        if (!o) return;
        const frac = (o.w * o.h) / Math.max(1, h.b.w * h.b.h);
        if (frac > 0.05) S.coversText.push({ cover: f.kind + ' "' + f.name + '"', text: (h.t.textContent || '').trim() + ' [' + (h.t.getAttribute('class') || h.t.parentElement.getAttribute('class') || '') + ']', frac: R(frac * 100) });
      });
    });
    S.counts = { nodes: svg.querySelectorAll('.ms-node').length, flows: svg.querySelectorAll('.ms-flow').length, flabels: svg.querySelectorAll('.ms-flabel').length, badges: svg.querySelectorAll('.ms-badge').length };
    out.svg = S;
  }

  /* ---- code pane ---- */
  out.code = null;
  const pre = wrap.querySelector('.dr-code');
  if (pre && vis(pre)) {
    const pr2 = pre.getBoundingClientRect();
    const on = [...pre.querySelectorAll('.dr-ln.on')];
    const inside = e => { const r = e.getBoundingClientRect(); return r.top >= pr2.top - 1 && r.bottom <= pr2.bottom + 1; };
    const lines = [...pre.querySelectorAll('.dr-ln')];
    const cs = getComputedStyle(pre);
    const lineH = parseFloat(getComputedStyle(lines[0]).lineHeight) || parseFloat(cs.fontSize) * 1.6;
    let rows = 0, wrapped = 0, maxRows = 1;
    lines.forEach(l => { const r = Math.max(1, Math.round(l.getBoundingClientRect().height / lineH)); rows += r; if (r > 1) wrapped++; maxRows = Math.max(maxRows, r); });
    /* chars per row, measured with the real font */
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = cs.fontSize + ' ' + cs.fontFamily;
    const cw = cv.measureText('0000000000').width / 10;
    const b = lines[0] && lines[0].querySelector('b');
    const gutter = b ? b.getBoundingClientRect().width + parseFloat(getComputedStyle(b).marginRight) : 0;
    const textCol = pre.clientWidth - gutter - 12 - 3;
    const longest = Math.max.apply(null, lines.map(l => (l.textContent || '').length - (b ? b.textContent.length : 0)));
    out.code = {
      fontSize: parseFloat(cs.fontSize), whiteSpace: getComputedStyle(lines[0]).whiteSpace, clientW: pre.clientWidth, clientH: pre.clientHeight, scrollH: pre.scrollHeight, scrollW: pre.scrollWidth,
      scrollTop: R(pre.scrollTop), codeLines: lines.length, totalRows: rows, wrappedLines: wrapped, maxRowsPerLine: maxRows,
      charPx: R(cw), charsPerRow: Math.floor(textCol / cw), longestLineChars: longest,
      onCount: on.length, onVisible: on.filter(inside).length, firstOnVisible: on.length ? inside(on[0]) : null,
      sideways: pre.scrollWidth > pre.clientWidth + 1,
    };
  }

  /* ---- nav row ---- */
  out.nav = null;
  const nav = wrap.querySelector('.dr-nav'), prev = wrap.querySelector('.dr-prev'), next = wrap.querySelector('.dr-next');
  if (nav && vis(nav) && prev && next) {
    const a = prev.getBoundingClientRect(), b = next.getBoundingClientRect(), n = nav.getBoundingClientRect();
    const rows = e => { const rg = document.createRange(); rg.selectNodeContents(e); return new Set([...rg.getClientRects()].map(r => Math.round(r.top / 4))).size || 1; };
    out.nav = {
      oneRow: Math.abs(a.top - b.top) < 6 && a.right <= b.left + 1,
      inPanel: a.left >= pr.left - 1 && b.right <= pr.right + 1,
      prev: { x: R(a.left), w: R(a.width), h: R(a.height), lines: rows(prev) },
      next: { x: R(b.left), w: R(b.width), h: R(b.height), lines: rows(next) },
      prevText: prev.textContent, nextText: next.textContent, nextDisabled: next.disabled, prevDisabled: prev.disabled,
      navTop: R(n.top + window.scrollY), navBottom: R(n.bottom + window.scrollY),
    };
  }

  /* ---- geometry of one step (absolute document y / height) ---- */
  const geo = sel => { const e = wrap.querySelector(sel); if (!e || !vis(e)) return null; const r = e.getBoundingClientRect(); if (r.height < 1) return null; return { y: Math.round(r.top + window.scrollY), h: Math.round(r.height) }; };
  out.geom = { wrap: null, diagram: geo('.dr-diagram'), cols: geo('.dr-cols'), vars: geo('.dr-vars'), code: geo('.dr-code'), say: geo('.dr-say'), ask: geo('.dr-ask'), nav: geo('.dr-nav'), end: geo('.dr-end') };
  { const r = wrap.getBoundingClientRect(); out.geom.wrap = { y: Math.round(r.top + window.scrollY), h: Math.round(r.height) }; }

  /* ---- tables inside the explanation ---- */
  out.tables = [...wrap.querySelectorAll('.dr-say table')].filter(vis).map(t => {
    const rows = [...t.rows];
    const cells = [].concat.apply([], rows.map(r => [...r.cells]));
    const widths = cells.map(c => c.getBoundingClientRect().width);
    const firstRow = rows[0] ? [...rows[0].cells].map(c => R(c.getBoundingClientRect().width)) : [];
    const sc = t.closest('.dr-scroll');
    return { cols: Math.max.apply(null, rows.map(r => r.cells.length)), rows: rows.length, tableW: R(t.getBoundingClientRect().width), tableH: R(t.getBoundingClientRect().height),
      minCellW: R(Math.min.apply(null, widths)), firstRowWidths: firstRow, inScroller: !!sc, scrollerW: sc ? sc.clientWidth : null, head: (rows[0] ? rows[0].textContent : '').trim().replace(/\s+/g, ' ').slice(0, 50) };
  });

  /* ---- misc ---- */
  out.optCount = wrap.querySelectorAll('.dr-opt').length;
  out.optMinH = out.optCount ? Math.round(Math.min.apply(null, [...wrap.querySelectorAll('.dr-opt')].map(b => b.getBoundingClientRect().height))) : null;
  out.optMaxW = out.optCount ? Math.round(Math.max.apply(null, [...wrap.querySelectorAll('.dr-opt')].map(b => b.getBoundingClientRect().width))) : null;
  out.chg = wrap.querySelectorAll('.dr-chg').length;
  out.varRows = wrap.querySelectorAll('.dr-vars tr').length;
  out.fb = [...wrap.querySelectorAll('.ms-ask-fb')].filter(vis).map(e => ({ cls: e.className, text: (e.textContent || '').trim().slice(0, 140) }));
  out.hasDone = !!wrap.querySelector('.dr-done');
  out.hasWin = !!wrap.querySelector('.lab-win');
  return out;
}

/* ====================================================================
   Node side
   ==================================================================== */
const results = {
  startedAt: new Date().toISOString(), app: APP, url: URL, fonts: FONTS, viewports: VIEWPORTS.map(v => v.name),
  env: {}, levels: [], snapshots: [], flowErrors: [], assertions: [], logs: [], expectedMissing: [], wrongPath: [], prevTest: [], scrollAfterNext: [],
};

function metaOfLevels(page) {
  return page.evaluate(T => {
    const L = (SD.levelSets[T] || []);
    return L.map(l => {
      const stages = l.stages.slice();
      if (l.interview) stages.push({ type: 'interview', title: '🎤 Interview Round' });
      return {
        id: l.id, title: l.title,
        stages: stages.map(s => ({
          type: s.type, title: s.title, hasCode: !!s.code, hasDiagram: (s.nodes || []).length > 0, hasVars: !!s.vars,
          steps: (s.type === 'dryrun' || s.type === 'cards') ? (s.steps || []).map(st => ({
            ask: st.ask ? { answer: st.ask.answer, n: st.ask.choices.length, q: st.ask.q } : null, title: st.title || null, line: st.line == null ? null : st.line,
          })) : [],
        })),
      };
    });
  }, TRACK);
}

async function newPage(browser, vp, logSink) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf, isMobile: vp.mobile, hasTouch: vp.mobile,
    colorScheme: 'dark', reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const ctxInfo = { get: () => ctxInfo.cur, cur: { vp: vp.name, where: 'load' } };
  const add = e => logSink.push(Object.assign({ vp: vp.name }, ctxInfo.cur, e));
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') add({ kind: 'console-' + m.type(), text: m.text(), url: m.location().url || '' });
  });
  page.on('pageerror', e => add({ kind: 'pageerror', text: String((e && e.message) || e), stack: String((e && e.stack) || '').split('\n').slice(0, 4).join(' | ') }));
  page.on('requestfailed', r => add({ kind: 'requestfailed', text: r.url() + ' ' + ((r.failure() || {}).errorText || ''), url: r.url() }));
  return { ctx, page, ctxInfo };
}

/* is this log entry a "level file listed in index.html but not written yet" load failure? */
function isExpectedMissing(e) {
  const u = (e.url || '') + ' ' + (e.text || '');
  const m = u.match(/data-v2-breaker-[A-Za-z0-9-]+\.js/);
  if (!m) return false;
  return !fs.existsSync(path.join(APP, m[0]));   /* only "expected" while that exact file really does not exist */
}

async function settle(page) {
  await page.evaluate(() => (document.fonts && document.fonts.ready) || null).catch(() => {});
  await sleep(120);
}

/* one measurement (+ optional screenshot) */
async function snap(env, info, opts) {
  opts = opts || {};
  const { page, vp } = env;
  env.ctxInfo.cur = Object.assign({ vp: vp.name }, info);
  await page.mouse.move(0, 0).catch(() => {});   /* no stray :hover (.btn:hover lifts the button 2px) in measurements/screenshots */
  await settle(page);
  const m = await page.evaluate(measureInPage);
  const rec = Object.assign({ vp: vp.name, level: info.level || null, stage: info.stage == null ? null : info.stage, stageType: info.stageType || null, step: info.step == null ? null : info.step, tag: info.tag || null, file: null }, m);
  /* decide on screenshot */
  let shoot = opts.shot !== false && !NO_SHOTS;
  rec.auto = false;
  if (!shoot && !NO_SHOTS && opts.shot === false) {
    /* auto-shoot unseen dynamic problems so every problem has a picture */
    const sigs = dynamicSignatures(rec);
    const fresh = sigs.filter(s => !env.seenSigs.has(s));
    if (fresh.length) { shoot = true; rec.auto = true; rec.tag = (rec.tag ? rec.tag + '_' : '') + 'problem'; }
  }
  dynamicSignatures(rec).forEach(s => env.seenSigs.add(s));
  if (shoot) {
    const name = info.fileOverride || fileName(vp, info, rec.tag);
    try {
      /* sticky top bar would otherwise be drawn in the middle of a full-page capture */
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(IMG, name), fullPage: true, animations: 'disabled' });
      rec.file = name;
    } catch (e) {
      rec.shotError = String(e.message || e).split('\n')[0];
      try {
        await page.screenshot({ path: path.join(IMG, name), fullPage: false, animations: 'disabled' });
        rec.file = name; rec.shotError += ' (viewport-only fallback)';
      } catch (e2) { /* give up */ }
    }
  }
  results.snapshots.push(rec);
  return rec;
}

function fileName(vp, info, tag) {
  const parts = [vp.name];
  if (info.level) parts.push(info.level);
  if (info.stage != null) parts.push('s' + info.stage + '-' + (info.stageType || 'x'));
  if (info.step != null) parts.push('step' + pad2(info.step));
  parts.push(slug(tag || 'shot'));
  return parts.join('_') + '.png';
}

/* signatures of problems that vary from step to step (used for auto-screenshots) */
function dynamicSignatures(r) {
  const s = [];
  if (r.hOverflow) s.push('hOverflow');
  (r.badText || []).filter(b => !b.inCode).forEach(b => s.push('badText:' + b.text.slice(0, 30)));
  (r.drOverflow || []).forEach(o => s.push('drOverflow:' + o.el.slice(0, 40)));
  if (r.svg) {
    r.svg.cut.forEach(c => s.push('cut:' + c.text));
    r.svg.spill.forEach(c => s.push('spill:' + c.text));
    r.svg.overlaps.forEach(c => s.push('overlap:' + c.a + '|' + c.b));
    r.svg.coversText.forEach(c => s.push('covers:' + c.cover + '|' + c.text));
  }
  if (r.code && r.code.onCount && !r.code.firstOnVisible) s.push('codeNotVisible');
  if (r.code && r.code.onCount && r.code.onVisible < r.code.onCount) s.push('codePart');
  (r.hScrollers || []).filter(h => !/dr-code|dr-diagram/.test(h.el)).forEach(h => s.push('hscroll:' + h.el.slice(0, 50)));
  if (r.nav && (!r.nav.oneRow || !r.nav.inPanel)) s.push('navWrap');
  return s;
}

function clickText(page, selector, startsWith) {
  return page.locator(selector).filter({ hasText: startsWith }).first().click({ force: true });
}

/* ------------------------------------------------------------- home / track */
async function runHomeAndTrack(browser, vp) {
  const env = { vp, seenSigs: new Set() };
  const { ctx, page, ctxInfo } = await newPage(browser, vp, results.logs);
  env.page = page; env.ctxInfo = ctxInfo;
  try {
    ctxInfo.cur = { vp: vp.name, where: 'home' };
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForSelector('.trackcard');
    await snap(env, { level: null, tag: 'home', fileOverride: vp.name + '_00-home.png' }, { shot: true });
    const home = await page.evaluate(T => {
      const cards = [...document.querySelectorAll('.trackcard')].map(c => ({
        name: (c.querySelector('.tk-name') || {}).textContent || '', locked: c.classList.contains('locked'), go: (c.querySelector('.tk-go') || {}).textContent || '',
      }));
      const idx = SD.tracks.findIndex(t => t.id === T), coreIdx = SD.tracks.findIndex(t => !t.alwaysUnlocked);
      return { idx, card: cards[idx] || null, coreIdx, core: cards[coreIdx] || null };
    }, TRACK);
    const A = (name, ok, detail) => results.assertions.push({ vp: vp.name, name, ok: !!ok, detail });
    A(`home: track '${TRACK}' has a card (position ${home.idx + 1})`, !!home.card, home.card ? home.card.name : 'no card');
    A('home: that card is not locked', home.card && !home.card.locked, home.card ? home.card.go : '-');
    A('home: the first core (sequential) track is NOT locked', home.core && !home.core.locked, home.core ? home.core.name + ' · ' + home.core.go : 'no core track card');

    ctxInfo.cur = { vp: vp.name, where: 'track' };
    await page.locator('.trackcard').nth(home.idx).click({ force: true });
    await page.waitForSelector('.levelcard');
    const lv = await page.evaluate(T => ({
      n: document.querySelectorAll('.levelcard').length, locked: document.querySelectorAll('.levelcard.locked').length,
      expected: SD.levelSets[T].length, nums: [...document.querySelectorAll('.levelcard .lv-num')].map(x => x.textContent),
    }), TRACK);
    await snap(env, { level: null, tag: 'track', fileOverride: vp.name + '_01-track.png' }, { shot: true });
    A('track: level card count equals the number of levels in the track', lv.n === lv.expected, lv.n + ' cards / ' + lv.expected + ' levels');
    A('track: no .levelcard is .locked', lv.locked === 0, lv.locked + ' locked; labels: ' + lv.nums.join(', '));
  } catch (e) {
    results.flowErrors.push({ vp: vp.name, where: 'home/track', error: String(e.message || e).split('\n')[0] });
  }
  await ctx.close();
}

/* ------------------------------------------------------------------ level */
async function runLevel(browser, vp, meta, li, S) {
  const L = meta[li];
  const env = { vp, seenSigs: new Set() };
  const { ctx, page, ctxInfo } = await newPage(browser, vp, results.logs);
  env.page = page; env.ctxInfo = ctxInfo;
  const nStages = L.stages.length;
  let stageNo = 0;
  try {
    ctxInfo.cur = { vp: vp.name, level: L.id, where: 'open' };
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForSelector('.trackcard');
    const trackIdx = await page.evaluate(T => SD.tracks.findIndex(t => t.id === T), TRACK);
    await page.locator('.trackcard').nth(trackIdx).click({ force: true });
    await page.waitForSelector('.levelcard');
    await page.locator('.levelcard').nth(li).click({ force: true });
    await page.waitForSelector('.level-h');
    await snap(env, { level: L.id, stage: 0, stageType: 'intro', tag: 'intro' }, { shot: true });
    await clickText(page, '.btn.big', '🎮 Shuru karo');
    await page.waitForSelector('.stage-h');

    for (let si = 0; si < nStages; si++) {
      stageNo = si + 1;
      const st = L.stages[si];
      const base = { level: L.id, stage: stageNo, stageType: st.type };
      /* sanity: we really are on this stage */
      const cur = await page.evaluate(() => SD.session ? SD.session.stageIdx : -1);
      if (cur !== si) throw new Error('expected stage index ' + si + ' but session is at ' + cur);

      if (st.type === 'dryrun' || st.type === 'cards') {
        await page.waitForSelector('.dr-wrap');
        await playDryrun(env, vp, L, li, st, base, S, si === nStages - 1);
        if (si < nStages - 1) {
          /* real flow: click the stage summary's button */
          await page.waitForSelector('.stage-summary .btn');
          await page.locator('.stage-summary .btn').first().click({ force: true });
          await page.waitForSelector('.stage-h');
        }
      } else {
        await sleep(80);
        await snap(env, Object.assign({ tag: 'initial' }, base), { shot: true });
        if (si < nStages - 1) {
          await page.evaluate(() => { SD.session.stageIdx++; runStage(); });
          await page.waitForSelector('.stage-h');
        }
      }
    }
  } catch (e) {
    const msg = String(e.message || e).split('\n').filter(Boolean).slice(0, 7).join(' | ');
    results.flowErrors.push({ vp: vp.name, level: L.id, stage: stageNo, error: msg });
    if (!NO_SHOTS) {
      try { await page.screenshot({ path: path.join(IMG, `${vp.name}_${L.id}_s${stageNo}_FLOW-ERROR.png`), fullPage: true, animations: 'disabled' }); } catch (e2) { /* ignore */ }
    }
  }
  await ctx.close();
}

async function playDryrun(env, vp, L, li, st, base, S, isLastStage) {
  const { page } = env;
  const n = st.steps.length;
  let badlaDone = false;
  const answeredIdx = new Set();
  for (let i = 0; i < n; i++) {
    const step = st.steps[i];
    const info = Object.assign({}, base, { step: i + 1 });
    const counter = await page.evaluate(() => (document.querySelector('.dr-counter') || {}).textContent || '');
    if (!new RegExp('^\\s*Step\\s*' + (i + 1) + '\\s*/\\s*' + n).test(counter)) {
      results.flowErrors.push({ vp: vp.name, level: L.id, stage: base.stage, step: i + 1, error: 'counter reads "' + counter.trim() + '" (expected Step ' + (i + 1) + ' / ' + n + ')' });
    }
    /* what does this step show? (measure first, decide on tags) */
    const probe = await page.evaluate(() => ({ chg: document.querySelectorAll('.dr-wrap .dr-chg').length, opts: document.querySelectorAll('.dr-wrap .dr-opt').length }));
    const tags = [];
    if (i === 0) tags.push('first');
    if (step.ask) tags.push('ask-before');
    if (probe.chg > 0 && !badlaDone) { tags.push('badla'); badlaDone = true; }
    if (i === n - 1) tags.push('last');
    await snap(env, Object.assign({ tag: tags.join('_') }, info), { shot: tags.length > 0 });

    if (step.ask) {
      if (probe.opts !== step.ask.n) {
        results.flowErrors.push({ vp: vp.name, level: L.id, stage: base.stage, step: i + 1, error: 'ask shows ' + probe.opts + ' options, data has ' + step.ask.n });
      }
      /* wrong path, once per viewport (first ask met) */
      if (!S.wrongDone) {
        S.wrongDone = true;
        const wrongI = [...Array(step.ask.n).keys()].find(k => k !== step.ask.answer);
        await page.locator(`.dr-wrap .dr-opt[data-i="${wrongI}"]`).click({ force: true });
        await sleep(450);
        const w = await page.evaluate(() => {
          const fb = document.querySelector('.dr-wrap .ms-ask-fb');
          const nx = document.querySelector('.dr-wrap .dr-next');
          const wr = document.querySelector('.dr-wrap .dr-opt.wrong');
          return { fbText: fb ? fb.textContent.trim() : null, fbCls: fb ? fb.className : null, fbVisible: !!(fb && fb.getBoundingClientRect().height > 0), nextDisabled: nx ? nx.disabled : null, wrongBtnDisabled: wr ? wr.disabled : null };
        });
        const ok = w.fbVisible && /❌/.test(w.fbText || '') && w.nextDisabled === true && w.wrongBtnDisabled === true;
        results.wrongPath.push(Object.assign({ vp: vp.name, level: L.id, stage: base.stage, step: i + 1, ok }, w));
        await snap(env, Object.assign({ tag: 'ask-wrong' }, info), { shot: true });
      }
      await page.locator(`.dr-wrap .dr-opt[data-i="${step.ask.answer}"]`).click({ force: true });
      await sleep(120);
      answeredIdx.add(i);
      const after = await page.evaluate(() => ({ nextDisabled: document.querySelector('.dr-wrap .dr-next').disabled }));
      if (after.nextDisabled) results.flowErrors.push({ vp: vp.name, level: L.id, stage: base.stage, step: i + 1, error: 'correct answer clicked but .dr-next still disabled' });
      await snap(env, Object.assign({ tag: 'ask-after' }, info), { shot: true });
    }

    /* advance */
    if (i < n - 1) {
      await page.locator('.dr-wrap .dr-next').click({ force: true });
      await sleep(550);                       /* smooth scrollIntoView finishes */
      const sc = await page.evaluate(() => {
        const w = document.querySelector('.dr-wrap'), d = document.querySelector('.dr-diagram'), say = document.querySelector('.dr-say');
        const r = w.getBoundingClientRect(), rs = say.getBoundingClientRect();
        const tb = document.getElementById('topbar'), tbr = tb ? tb.getBoundingClientRect() : null;
        return { topbarBottom: tbr ? Math.round(tbr.bottom) : 0, topbarSticky: tb ? getComputedStyle(tb).position : null, scrollY: Math.round(window.scrollY), wrapTop: Math.round(r.top), diagramTop: d ? Math.round(d.getBoundingClientRect().top) : null, sayTop: Math.round(rs.top), sayBottom: Math.round(rs.bottom), ih: window.innerHeight };
      });
      results.scrollAfterNext.push(Object.assign({ vp: vp.name, level: L.id, stage: base.stage, toStep: i + 2 }, sc));

      /* .dr-prev test, once per viewport, right after the first ask was answered */
      if (!S.prevDone && answeredIdx.has(i)) {
        S.prevDone = true;
        const t = { vp: vp.name, level: L.id, stage: base.stage, fromStep: i + 2, backToStep: i + 1 };
        await page.locator('.dr-wrap .dr-prev').click({ force: true });
        await sleep(150);
        const b = await page.evaluate(() => ({ counter: document.querySelector('.dr-counter').textContent, opts: document.querySelectorAll('.dr-wrap .dr-opt').length, nextDisabled: document.querySelector('.dr-wrap .dr-next').disabled, fb: [...document.querySelectorAll('.dr-wrap .ms-ask-fb.good')].map(e => e.textContent.trim().slice(0, 80)) }));
        t.back = b;
        t.backOk = new RegExp('Step\\s*' + (i + 1) + '\\s*/').test(b.counter) && b.opts === 0 && b.nextDisabled === false && b.fb.length > 0;
        await snap(env, Object.assign({}, base, { step: i + 1, tag: 'prev-back-answered' }), { shot: true });
        await page.locator('.dr-wrap .dr-next').click({ force: true });
        await sleep(300);
        const f = await page.evaluate(() => ({ counter: document.querySelector('.dr-counter').textContent, opts: document.querySelectorAll('.dr-wrap .dr-opt').length, nextDisabled: document.querySelector('.dr-wrap .dr-next').disabled }));
        t.forward = f;
        const nextHasAsk = !!st.steps[i + 1].ask;
        t.forwardOk = new RegExp('Step\\s*' + (i + 2) + '\\s*/').test(f.counter) && f.nextDisabled === nextHasAsk && (nextHasAsk ? f.opts > 0 : f.opts === 0);
        results.prevTest.push(t);
      }
    }
  }
  /* finished state */
  await page.locator('.dr-wrap .dr-next').click({ force: true });
  await sleep(300);
  await snap(env, Object.assign({ tag: 'done' }, base, { step: n }), { shot: true });
  const fin = await page.evaluate(() => ({ done: !!document.querySelector('.dr-done'), win: !!document.querySelector('.lab-win'), doneVisible: !!(document.querySelector('.dr-done') && document.querySelector('.dr-done').getBoundingClientRect().height > 0), navHidden: getComputedStyle(document.querySelector('.dr-nav')).display === 'none' }));
  if (!fin.done) results.flowErrors.push({ vp: vp.name, level: L.id, stage: base.stage, error: 'finished state has no .dr-done button' });
  await page.locator('.dr-wrap .dr-done').click({ force: true });
  await page.waitForSelector('.stage-summary');
  await sleep(250);
  await snap(env, Object.assign({ tag: 'summary' }, base, { step: n }), { shot: true });
  void isLastStage;
}

/* ===================================================================== */
async function waitStable(seconds) {
  const t0 = Date.now();
  let last = JSON.stringify(dataFileStamps()), since = Date.now();
  while (Date.now() - since < seconds * 1000) {
    if (Date.now() - t0 > 15 * 60 * 1000) { console.log('wait-stable: gave up after 15 min, running anyway'); return; }
    await sleep(5000);
    const now = JSON.stringify(dataFileStamps());
    if (now !== last) { console.log('wait-stable: content files changed, waiting again'); last = now; since = Date.now(); }
  }
}

async function main() {
  if (ARGS['report-only']) {                          /* rebuild REPORT.md from the last results.json (e.g. after editing manual-notes.md) */
    const R = JSON.parse(fs.readFileSync(path.join(OUT, 'results.json'), 'utf8'));
    const rep = buildReport(R);
    fs.writeFileSync(path.join(OUT, 'REPORT.md'), rep.md);
    console.log('REPORT.md rebuilt from results.json');
    return;
  }
  if (ARGS['wait-stable']) await waitStable(parseInt(ARGS['wait-stable'], 10) || 60);
  fs.mkdirSync(IMG, { recursive: true });
  /* only our own old PNGs */
  fs.readdirSync(IMG).filter(f => f.endsWith('.png')).forEach(f => fs.unlinkSync(path.join(IMG, f)));

  results.env.filesAtStart = dataFileStamps();
  const pw = findPlaywright();
  results.env.playwrightDir = pw.dir;
  const chromes = findChromiums();
  results.env.chromeCandidates = chromes;
  if (!chromes.length) throw new Error('No cached Chromium under ~/.cache/ms-playwright');

  const launchEnv = Object.assign({}, process.env);
  if (FONTS === 'liberation') launchEnv.FONTCONFIG_FILE = writeFontConf();

  let browser = null, tried = [];
  for (const exe of chromes) {
    try {
      browser = await pw.mod.chromium.launch({ executablePath: exe, headless: true, env: launchEnv, args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] });
      results.env.chrome = exe;
      break;
    } catch (e) { tried.push(exe + ' -> ' + String(e.message || e).split('\n')[0]); }
  }
  if (!browser) throw new Error('Could not launch any Chromium. Tried:\n' + tried.join('\n'));
  results.env.chromeVersion = browser.version();
  results.env.launchFailures = tried;

  /* level list + platform fonts */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    results.levels = await metaOfLevels(page);
    try {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      const doc = await cdp.send('DOM.getDocument', { depth: 1 });
      const fontsOf = async sel => {
        const n = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel });
        if (!n.nodeId) return null;
        const f = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: n.nodeId });
        return (f.fonts || []).map(x => x.familyName);
      };
      results.env.platformFonts = { body: await fontsOf('body'), code: await fontsOf('code') || null };
    } catch (e) { results.env.platformFonts = 'unavailable: ' + String(e.message || e).split('\n')[0]; }
    await ctx.close();
  }
  if (!results.levels.length) throw new Error("track '" + TRACK + "' has no levels (wrong --track, or the page did not load it)");
  let meta = results.levels;
  if (ARGS.levels) meta = meta.filter(l => String(ARGS.levels).split(',').includes(l.id));
  console.log("Levels in track '" + TRACK + "': " + results.levels.map(l => l.id).join(', ') + (meta.length !== results.levels.length ? '  (running: ' + meta.map(l => l.id).join(', ') + ')' : ''));
  console.log('Chrome: ' + results.env.chrome + ' (' + results.env.chromeVersion + '), fonts=' + FONTS + ', platform fonts: ' + JSON.stringify(results.env.platformFonts));

  for (const vp of VIEWPORTS) {
    console.log('== viewport ' + vp.name + ' ==');
    await runHomeAndTrack(browser, vp);
    const S = { wrongDone: false, prevDone: false };
    for (const L of meta) {
      const li = results.levels.findIndex(x => x.id === L.id);
      const t0 = Date.now();
      await runLevel(browser, vp, results.levels, li, S);
      console.log('  ' + L.id + ' done in ' + Math.round((Date.now() - t0) / 1000) + ' s');
    }
  }
  await browser.close();

  /* classify logs */
  results.logs.forEach(e => { e.expected = isExpectedMissing(e); });
  results.expectedMissing = uniq(results.logs.filter(e => e.expected).map(e => (e.url || e.text).replace(/^.*\//, '')));
  results.finishedAt = new Date().toISOString();
  results.env.filesAtEnd = dataFileStamps();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
  const report = buildReport(results);
  fs.writeFileSync(path.join(OUT, 'REPORT.md'), report.md);
  console.log('Wrote ' + path.join(OUT, 'REPORT.md') + ' (' + results.snapshots.length + ' measurements, ' + results.snapshots.filter(s => s.file).length + ' screenshots)');
  console.log('Problems: broken=' + report.counts.broken + ' ugly=' + report.counts.ugly + ' fine-notes=' + report.counts.note);
}

/* ====================================================================
   Report
   ==================================================================== */
const SUGGEST = {
  'svg-font': 'Label font sizes are in viewBox units, so they shrink with the diagram width. Suggested CSS (end of style.css): `@media (max-width:640px){ .dr-diagram{overflow-x:auto} .dr-diagram .ms-svg{min-width:560px} }` (diagram scrolls sideways, labels stay near 60% of design size) -- or, in the same media query, raise `.ms-lbl` to ~30px, `.ms-flabel text` to ~26px, `.ms-badge text` to ~24px and widen the pill/box maths in explain.js to match.',
  'svg-cut': '`<text>` leaves the viewBox: enlarge the stage `viz: { w, h }`, move the node inward (`x` between ~110 and w-110), or shorten the label/badge text. For long badges raise the cap in explain.js (`Math.min(380, ...)`).',
  'svg-spill': 'Text wider than its pill/box: shorten the label, or widen the box (widthOf() in explain.js: 12.8px per char is too tight for this font) / pill (`20 + len*10.2`).',
  'svg-overlap': 'Flow-label pill / node / badge boxes overlap: move the nodes further apart in `NODES` (x/y), give the flow an `offset`, or shorten the label. A label sits over its arrow, so two flows between the same pair need different `offset` values.',
  'svg-covers': 'A flow-label pill or badge sits on top of other text, hiding it. Move the node or flow `offset`, or shorten the label.',
  'page-overflow': 'The page scrolls sideways. Find the offender listed in the details and give it `min-width:0; max-width:100%; overflow-x:auto` (or `overflow-wrap:anywhere`).',
  'dr-overflow': 'An element inside `.dr-wrap` sticks out of the panel. Add `max-width:100%; overflow-x:auto` (tables: wrap in `<div class="dr-scroll">`), or `min-width:0` on the grid child.',
  'bad-text': 'Visible text contains undefined / NaN / [object Object]: a content field is missing or has the wrong type. See the element named in the details.',
  'code-vis': 'The highlighted code line is not inside the visible part of `.dr-code`. In explain.js paint(): scroll so the first `.on` line is centred, e.g. `pre.scrollTop = cur.offsetTop - (pre.clientHeight - cur.offsetHeight) / 2` (the fixed `-70` only works when the box is >= ~140px tall and lines are ~20px).',
  'nav-wrap': '`.dr-nav` buttons do not fit one row: shorten the button text, or in the existing `@media (max-width:640px)` block set `.dr-nav .btn{padding:10px 12px;font-size:.9rem;white-space:nowrap}` / `.dr-nav{flex-wrap:nowrap}`.',
  'flow': 'The scripted flow failed here: the page did not behave as described in explain.js / app.js. See the error text.',
  'assert': 'Failed assertion, see details.',
  'js-error': 'Console / page error. See the message.',
  'hscroll': 'Wide <pre>/table inside `.dr-say` needs sideways panning on a phone. Shorten the lines in the content (<= ~30 chars per line at 390 px), or for `pre` add `white-space:pre-wrap; overflow-wrap:anywhere` in the 640px media query, or turn the table into stacked rows.',
  'code-part': 'Some highlighted lines of a multi-line highlight are outside the code box. Raise `.dr-code{max-height}` (e.g. 420px on phones) or lower the number of lines highlighted in one step; scrolling is centred on the FIRST highlighted line only.',
  'code-wrap': 'Phone code pane wraps long lines with `white-space:pre-wrap`, so continuation rows start under the line-number gutter and lose their indentation. Suggested CSS inside the existing `@media (max-width:640px)`: `.dr-ln{padding-left:50px;text-indent:-50px}` (hanging indent: gutter `b` is 34px + 10px margin + 3px border) or `.dr-ln{display:grid;grid-template-columns:44px 1fr}`.',
  'code-wide': 'When the code pane sits next to a vars/panels column at desktop it is only ~510px wide (1.3fr of two columns), so long lines scroll sideways. Either shorten the long comments in the shown code lines, or give `.dr-cols.two` `grid-template-columns:minmax(0,1.8fr) minmax(0,1fr)` when a code pane is present.',
  'topbar': 'On a phone the sticky `#topbar` wraps to three rows and is ~116px tall, but `.dr-wrap{scroll-margin-top:84px}` (style.css) is what "Agla step" scrolls to, so the step counter / clock end up hidden behind the bar. Fix: `@media (max-width:640px){ .dr-wrap{scroll-margin-top:130px} }` (the desktop bar is shorter, 84px is fine there).',
  'table-narrow': 'A multi-column table inside `.dr-say` gets ~65px columns on a phone (one word per line, very tall). Fix in the content: <= 3 columns, short cells; or in CSS inside the 640px media query turn rows into stacked blocks: `.dr-say table,.dr-say tbody,.dr-say tr,.dr-say td{display:block}` and hide the `thead`, with `td::before{content:attr(data-label)}`.',
  'tall': 'One step needs several screens of scrolling on a phone. Consider moving the diagram/vars table below the question, or trimming the `say` text.',
};

function stepRanges(nums) {
  const a = uniq(nums.filter(x => x != null)).sort((x, y) => x - y);
  const out = []; let i = 0;
  while (i < a.length) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; out.push(i === j ? '' + a[i] : a[i] + '-' + a[j]); i = j + 1; }
  return out.join(',');
}


function svgAgg(R) {
  const m = new Map();
  R.snapshots.filter(r => r.svg).forEach(r => {
    const k = [r.vp, r.level, r.stage].join('|');
    if (!m.has(k)) m.set(k, { vp: r.vp, level: r.level, stage: r.stage, stageType: r.stageType, file: null, renderedW: r.svg.renderedW, renderedH: r.svg.renderedH, vbW: r.svg.vbW, vbH: r.svg.vbH, scale: r.svg.scale, node: null, flabel: null, badge: null, icon: null, fu: { node: null, flabel: null, badge: null } });
    const g = m.get(k);
    ['node', 'flabel', 'badge', 'icon'].forEach(f => { const v = r.svg.effPx[f]; if (v != null && (g[f] == null || v < g[f])) g[f] = v; });
    ['node', 'flabel', 'badge'].forEach(f => { if (g.fu[f] == null && r.svg.fontUser[f] != null) g.fu[f] = r.svg.fontUser[f]; });
    if (!g.file && r.file) g.file = r.file;
  });
  return [...m.values()];
}

function collectProblems(R) {
  const P = [];   /* {sev, kind, vp, level, stage, stageType, step, detail, file, key} */
  const add = (sev, kind, rec, detail, key) => P.push({ sev, kind, vp: rec.vp, level: rec.level, stage: rec.stage, stageType: rec.stageType, step: rec.step, detail, file: rec.file, key: key || detail });

  const codeSeen = new Set();
  R.snapshots.forEach(r => {
    if (r.code) {
      const k = [r.vp, r.level, r.stage].join('|');
      if (!codeSeen.has(k)) {
        codeSeen.add(k);
        if (r.vp === '390' && r.code.wrappedLines > 0) add('ugly', 'code-wrap', r, `${r.code.wrappedLines} of ${r.code.codeLines} code lines wrap (up to ${r.code.maxRowsPerLine} rows; box ${r.code.clientW}px wide = ${r.code.charsPerRow} chars/row at ${r.code.fontSize}px font, longest line ${r.code.longestLineChars} chars); continuation rows start flush-left under the line numbers`, 'codewrap');
        if (r.vp === '1280' && r.code.sideways) add('note', 'code-wide', r, `code box ${r.code.clientW}px wide (${r.code.charsPerRow} chars/row) but longest line is ${r.code.longestLineChars} chars: long lines need sideways scroll`, 'codewide');
      }
    }
    if (r.hOverflow) add('broken', 'page-overflow', r, `page scrollWidth ${r.scrollW} > innerWidth ${r.iw}; offender(s): ` + (r.pageOffenders.map(o => `${o.el} (right ${o.right}, width ${o.width})`).join('; ') || 'not found'), 'page-overflow');
    (r.badText || []).forEach(b => add(b.inCode ? 'note' : 'broken', 'bad-text', r, `text "${b.text}" in ${b.el}` + (b.inCode ? ' (inside code, probably legitimate)' : ''), 'bad:' + b.text.slice(0, 40)));
    (r.drOverflow || []).forEach(o => add(o.overBy > 6 ? 'broken' : 'ugly', 'dr-overflow', r, `${o.el} sticks out of .panel by ${o.overBy}px (right ${o.right} vs panel ${r.panelRight})`, 'dro:' + o.el.slice(0, 50)));
    if (r.svg) {
      r.svg.cut.forEach(c => add('broken', 'svg-cut', r, `<text class="${c.cls}">"${c.text}"</text> box ${c.box.join(',')} leaves viewBox ${c.viewBox.join(',')}`, 'cut:' + c.text));
      r.svg.spill.forEach(c => add('ugly', 'svg-spill', r, `"${c.text}" (${c.cls}) text box [${c.textBox.join(',')}] is wider/taller than its holder [${c.holder.join(',')}]`, 'spill:' + c.text));
      r.svg.overlaps.forEach(c => add('ugly', 'svg-overlap', r, `${c.a} overlaps ${c.b} by ${c.w} x ${c.h} units`, 'ov:' + c.a + '|' + c.b));
      r.svg.coversText.forEach(c => add(c.frac >= 30 ? 'broken' : 'ugly', 'svg-covers', r, `${c.cover} covers ${c.frac}% of text ${c.text}`, 'cv:' + c.cover + '|' + c.text));
    }
    if (r.code && r.code.onCount && !r.code.firstOnVisible) add('ugly', 'code-vis', r, `highlighted line not inside the visible part of .dr-code (scrollTop ${r.code.scrollTop}, box ${r.code.clientH}px, content ${r.code.scrollH}px)`, 'codevis');
    if (r.code && r.code.onCount && r.code.firstOnVisible && r.code.onVisible < r.code.onCount) add('note', 'code-part', r, `${r.code.onVisible} of ${r.code.onCount} highlighted lines visible in the code box (box ${r.code.clientW}x${r.code.clientH}px, ${r.code.charsPerRow} chars/row)`, 'codevis-part');
    if (r.nav && (!r.nav.oneRow || !r.nav.inPanel)) add('ugly', 'nav-wrap', r, `nav buttons not on one row / outside panel: prev ${JSON.stringify(r.nav.prev)}, next ${JSON.stringify(r.nav.next)}`, 'nav');
    if (r.nav && r.vp === '390' && (r.nav.next.lines > 1 || r.nav.prev.lines > 1)) add('ugly', 'nav-wrap', r, `a nav button text wraps to 2 lines (prev ${r.nav.prev.lines}, next ${r.nav.next.lines})`, 'navtext');
    if (r.optCount && r.optMinH != null && r.optMinH < 40) add('note', 'tap', r, `answer buttons only ${r.optMinH}px tall`, 'tap');
  });

  /* SVG label size, judged once per stage (min over its steps) */
  svgAgg(R).forEach(g => {
    if (g.vp !== '390') return;
    const small = [];
    if (g.node != null && g.node < 11) small.push('node labels ' + g.node + 'px');
    if (g.flabel != null && g.flabel < 11) small.push('flow labels ' + g.flabel + 'px');
    if (g.badge != null && g.badge < 11) small.push('badges ' + g.badge + 'px');
    if (small.length) P.push({ sev: 'ugly', kind: 'svg-font', vp: g.vp, level: g.level, stage: g.stage, stageType: g.stageType, step: null, file: g.file, key: 'font',
      detail: small.join(', ') + ` on screen (svg ${g.renderedW}px wide for viewBox ${g.vbW}x${g.vbH}, scale ${g.scale}; design sizes 21/18/16 units)` });
  });
  /* narrow / tall tables in the explanation at phone width */
  R.snapshots.forEach(r => (r.tables || []).forEach(t => {
    if (r.vp !== '390') return;
    if (t.minCellW < 80 || t.cols >= 4 || t.tableH > 0.5 * r.ih)
      add('ugly', 'table-narrow', r, `table "${t.head}": ${t.cols} columns x ${t.rows} rows, ${t.tableW}px wide x ${t.tableH}px tall, narrowest cell ${t.minCellW}px (first row widths ${t.firstRowWidths.join('/')})`, 'tbl:' + t.head);
  }));
  /* containers that need sideways panning */
  R.snapshots.forEach(r => (r.hScrollers || []).forEach(h => {
    if (/dr-code|dr-diagram/.test(h.el)) return;
    const frac = Math.round(h.clientW / h.scrollW * 100);
    add(r.vp === '390' ? 'ugly' : 'note', 'hscroll', r, `${h.el} needs sideways panning: shows ${h.clientW}px of ${h.scrollW}px (${frac}%)`, 'hs:' + h.el.slice(0, 60));
  }));
  R.flowErrors.forEach(f => P.push({ sev: 'broken', kind: 'flow', vp: f.vp, level: f.level || null, stage: f.stage == null ? null : f.stage, stageType: null, step: f.step == null ? null : f.step, detail: f.error, file: null, key: f.error }));
  R.assertions.filter(a => !a.ok).forEach(a => P.push({ sev: 'broken', kind: 'assert', vp: a.vp, level: null, stage: null, stageType: null, step: null, detail: a.name + ' -- ' + a.detail, file: null, key: a.name }));
  R.wrongPath.filter(w => !w.ok).forEach(w => P.push({ sev: 'broken', kind: 'flow', vp: w.vp, level: w.level, stage: w.stage, stageType: null, step: w.step, detail: 'wrong-answer path: ' + JSON.stringify(w), file: null, key: 'wrongpath' }));
  R.prevTest.filter(t => !(t.backOk && t.forwardOk)).forEach(t => P.push({ sev: 'broken', kind: 'flow', vp: t.vp, level: t.level, stage: t.stage, stageType: null, step: t.backToStep, detail: '.dr-prev test failed: ' + JSON.stringify(t), file: null, key: 'prevtest' }));
  R.logs.filter(l => !l.expected && l.kind !== 'requestfailed').forEach(l => P.push({ sev: 'broken', kind: 'js-error', vp: l.vp, level: l.level || null, stage: l.stage == null ? null : l.stage, stageType: null, step: l.step == null ? null : l.step, detail: `[${l.kind}] ${l.text}` + (l.stack ? ' @ ' + l.stack : ''), file: null, key: l.kind + l.text }));
  { const hid = R.scrollAfterNext.filter(x => x.vp === '390' && x.topbarSticky === 'sticky' && x.wrapTop < x.topbarBottom - 1);
    if (hid.length) P.push({ sev: 'ugly', kind: 'topbar', vp: '390', level: null, stage: null, stageType: null, step: null, file: null, key: 'topbar', detail: `after "Agla step" the sticky top bar (bottom at ${hid[0].topbarBottom}px) covers the top of .dr-wrap in ${hid.length} of ${R.scrollAfterNext.filter(x => x.vp === '390').length} step changes (wrap top at ${Math.min.apply(null, hid.map(x => x.wrapTop))}-${Math.max.apply(null, hid.map(x => x.wrapTop))}px)` }); }
  /* tall steps at 390 */
  R.snapshots.filter(r => r.vp === '390' && r.hasWrap && r.pageH > 3 * r.ih).forEach(r => add('note', 'tall', r, `page ${r.pageH}px tall = ${Math.round(r.pageH / r.ih * 10) / 10} screens`, 'tall'));
  return P;
}

function groupProblems(P) {
  const m = new Map();
  P.forEach(p => {
    const k = [p.sev, p.kind, p.vp, p.level, p.stage, p.key].join('|');
    if (!m.has(k)) m.set(k, Object.assign({}, p, { steps: [], count: 0, files: [] }));
    const g = m.get(k);
    g.count++; if (p.step != null) g.steps.push(p.step); if (p.file && !g.files.includes(p.file)) g.files.push(p.file);
  });
  return [...m.values()];
}

function buildReport(R) {
  const P = collectProblems(R);
  const G = groupProblems(P);
  const sevOrder = { broken: 0, ugly: 1, note: 2 };
  const counts = { broken: G.filter(g => g.sev === 'broken').length, ugly: G.filter(g => g.sev === 'ugly').length, note: G.filter(g => g.sev === 'note').length };
  const L = [];
  const w = s => L.push(s === undefined ? '' : s);

  w(`# Browser check report — track \`${TRACK}\``);
  w();
  w(`Generated ${R.finishedAt} by \`shots.js\`. App: \`${R.app}\`. Viewports: ${R.viewports.join(', ')}.`);
  w(`Levels in the track at run time: ${R.levels.map(l => '`' + l.id + '`').join(', ')} (${R.levels.length}).`);
  w(`Screenshots: \`img/\` (${R.snapshots.filter(s => s.file).length} files). Raw data: \`results.json\`. Step numbers are 1-based and match the on-screen "Step n / N".`);
  w();
  w('## Environment');
  w();
  w(`- Browser: ${R.env.chrome} (${R.env.chromeVersion}) — the installed Playwright (${R.env.playwrightDir.replace(os.homedir(), '~')}) wants a newer revision, so \`executablePath\` points at a cached build.`);
  w(`- Fonts: \`--fonts=${R.fonts}\`. Platform fonts actually used for body text: ${JSON.stringify(R.env.platformFonts)}. ` + (R.fonts === 'liberation' ? 'The machine has no Segoe UI / Roboto and no colour-emoji font: the app\'s font stack is aliased to Liberation Sans (Arial metrics) via a throw-away fontconfig file. **Emoji render as blank/tofu boxes in the screenshots** (this is a limit of the test machine, not of the app), and real-device text widths will differ by a few percent.' : 'System fonts (DejaVu Sans is ~10% wider than Segoe UI/Roboto, so text overflow is pessimistic). No colour-emoji font: emoji render as blank/tofu boxes.'));
  w('- 390 x 844: deviceScaleFactor 2, isMobile + touch. 1280 x 900: deviceScaleFactor 1. Fresh browser context (empty localStorage) per level, dark colour scheme.');
  w(`- Expected-missing script loads (a data-v2-breaker-*.js file listed in index.html but not on disk at the end of the run; not counted as problems): ${R.expectedMissing.length ? R.expectedMissing.map(x => '`' + x + '`').join(', ') : 'none (all level files exist)'}.`);
  { const a = R.env.filesAtStart || {}, b = R.env.filesAtEnd || {};
    w('- Files this run depends on (mtime, size at end of run): ' + Object.keys(b).map(f => '`' + f + '` ' + b[f]).join('; ') + '.');
    const ch = Object.keys(b).filter(f => a[f] !== b[f]);
    if (ch.length) w('- **WARNING: these files changed while the run was in progress, results may mix old and new content: ' + ch.join(', ') + '. Re-run.**'); }
  if (R.env.launchFailures && R.env.launchFailures.length) w(`- Browser builds that failed to launch first: ${R.env.launchFailures.join('; ')}`);
  w();

  /* ---------- assertions */
  w('## Assertions');
  w();
  w('| viewport | check | result | detail |');
  w('|---|---|---|---|');
  R.assertions.forEach(a => w(`| ${a.vp} | ${mdEsc(a.name)} | ${a.ok ? 'PASS' : '**FAIL**'} | ${mdEsc(a.detail)} |`));
  R.wrongPath.forEach(x => w(`| ${x.vp} | wrong answer path (${x.level} s${x.stage} step ${x.step}): feedback shown, \`.dr-next\` stays disabled | ${x.ok ? 'PASS' : '**FAIL**'} | feedback: ${mdEsc(x.fbText)} ; next disabled: ${x.nextDisabled} |`));
  R.prevTest.forEach(x => w(`| ${x.vp} | \`.dr-prev\` (${x.level} s${x.stage}: step ${x.fromStep} -> back to ${x.backToStep} -> forward) : answered question not asked again | ${x.backOk && x.forwardOk ? 'PASS' : '**FAIL**'} | back: ${mdEsc(JSON.stringify(x.back))} ; forward: ${mdEsc(JSON.stringify(x.forward))} |`));
  w();

  /* ---------- problems */
  w('## Problems');
  w();
  w(`Automatic findings, grouped (same problem on consecutive steps = one row). Severity rule of thumb: **broken** = something unusable/cut off/erroring; **ugly-but-usable** = works but looks wrong or is hard to read; **note** = informational. Counts: broken ${counts.broken}, ugly-but-usable ${counts.ugly}, note ${counts.note}.`);
  w();
  if (!G.length) w('_No automatic findings._');
  else {
    w('| severity | problem | viewport | level | stage | steps | screenshot | detail | suggested fix |');
    w('|---|---|---|---|---|---|---|---|---|');
    G.sort((a, b) => sevOrder[a.sev] - sevOrder[b.sev] || String(a.kind).localeCompare(b.kind) || String(a.vp).localeCompare(b.vp) || String(a.level).localeCompare(b.level) || (a.stage || 0) - (b.stage || 0))
      .forEach(g => {
        const sev = g.sev === 'ugly' ? 'ugly-but-usable' : g.sev;
        const shot = g.files[0] ? '`' + g.files[0] + '`' + (g.files.length > 1 ? ` (+${g.files.length - 1} more)` : '') : '-';
        w(`| ${sev} | ${g.kind} | ${g.vp} | ${g.level || '-'} | ${g.stage == null ? '-' : 's' + g.stage + (g.stageType ? ' ' + g.stageType : '')} | ${g.steps.length ? stepRanges(g.steps) : '-'}${g.count > 1 ? ' (x' + g.count + ')' : ''} | ${shot} | ${mdEsc(g.detail).slice(0, 420)} | ${mdEsc(SUGGEST[g.kind] || '')} |`);
      });
  }
  w();

  /* ---------- manual notes */
  const manual = path.join(OUT, 'manual-notes.md');
  if (fs.existsSync(manual)) {
    w('## Manual review notes');
    w();
    w('_Written by hand after looking at the screenshots of one particular run (see the date inside). If levels changed since, re-check._');
    w();
    w(fs.readFileSync(manual, 'utf8'));
    w();
  }

  /* ---------- measurements */
  w('## Measurements');
  w();
  /* SVG font sizes */
  w('### SVG diagram label sizes as seen on screen (CSS px = svg rendered width / viewBox width x font-size)');
  w();
  w('| viewport | level | stage | svg rendered (px) | viewBox | scale | node label px | flow label px | badge px | icon px |');
  w('|---|---|---|---|---|---|---|---|---|---|');
  svgAgg(R).forEach(g => {
    w(`| ${g.vp} | ${g.level} | s${g.stage} ${g.stageType} | ${g.renderedW} x ${g.renderedH} | ${g.vbW} x ${g.vbH} | ${g.scale} | ${g.node} (of ${g.fu.node}) | ${g.flabel} (of ${g.fu.flabel}) | ${g.badge} (of ${g.fu.badge}) | ${g.icon} |`);
  });
  w();

  /* per-stage heights */
  w('### Page height per step');
  w();
  w('"screens" = page height / viewport height. Stage rows summarise every step (all steps are measured, not only the screenshotted ones).');
  w();
  w('| viewport | level | stage | steps measured | min px | median px | max px | tallest step | max screens | tallest-step screenshot |');
  w('|---|---|---|---|---|---|---|---|---|---|');
  const groups = new Map();
  R.snapshots.filter(r => r.hasWrap && r.stageType && (r.stageType === 'dryrun' || r.stageType === 'cards') && r.step != null && !/done|summary/.test(r.tag || '')).forEach(r => {
    const k = [r.vp, r.level, r.stage, r.stageType].join('|');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  });
  groups.forEach((rs, k) => {
    const [vp, level, stage, type] = k.split('|');
    /* one value per step: the max over its measurements (before/after answering) */
    const byStep = new Map();
    rs.forEach(r => { if (!byStep.has(r.step) || byStep.get(r.step).pageH < r.pageH) byStep.set(r.step, r); });
    const arr = [...byStep.values()];
    const hs = arr.map(r => r.pageH);
    const tall = arr.reduce((a, b) => (b.pageH > a.pageH ? b : a));
    const shotRec = rs.filter(r => r.step === tall.step && r.file)[0];
    w(`| ${vp} | ${level} | s${stage} ${type} | ${arr.length} | ${Math.min.apply(null, hs)} | ${median(hs)} | ${Math.max.apply(null, hs)} | step ${tall.step} | ${Math.round(tall.pageH / tall.ih * 10) / 10} | ${shotRec ? '`' + shotRec.file + '`' : '-'} |`);
  });
  w();

  /* detailed 390 per-step geometry */
  w('### Per-step geometry at 390 px (document y / height in px; "ask" and "nav" positions show how far the learner must scroll)');
  w();
  w('Offsets are measured from the top of `.dr-wrap` (where the page lands after "Agla step"), so they show what a learner must scroll through. First screen below the wrap top = viewport height minus the sticky top bar.');
  w();
  w('| level | stage | step | page h | diagram h | vars/code block h | say starts at (px below wrap top) | say h | ask starts at | ask h | nav bottom at (px below wrap top) |');
  w('|---|---|---|---|---|---|---|---|---|---|---|');
  const perStep = new Map();
  R.snapshots.filter(r => r.vp === '390' && r.hasWrap && r.step != null && (r.stageType === 'dryrun' || r.stageType === 'cards') && !/done|summary|prev-back|ask-after|ask-wrong/.test(r.tag || '')).forEach(r => {
    const k = [r.level, r.stage, r.step].join('|');
    if (!perStep.has(k)) perStep.set(k, r);
  });
  [...perStep.values()].forEach(r => {
    const g = r.geom, f = x => (x ? x.h : '-'), wy = g.wrap ? g.wrap.y : 0;
    w(`| ${r.level} | s${r.stage} | ${r.step} | ${r.pageH} | ${f(g.diagram)} | ${f(g.cols)} | ${g.say ? g.say.y - wy : '-'} | ${f(g.say)} | ${g.ask ? g.ask.y - wy : '-'} | ${f(g.ask)} | ${g.nav ? g.nav.y + g.nav.h - wy : '-'} |`);
  });
  w();

  /* nav */
  w('### `.dr-nav` buttons');
  w();
  const navs390 = R.snapshots.filter(r => r.vp === '390' && r.nav);
  const navs1280 = R.snapshots.filter(r => r.vp === '1280' && r.nav);
  const navLine = (arr, name) => arr.length ? `- ${name}: ${arr.filter(r => r.nav.oneRow && r.nav.inPanel).length}/${arr.length} measurements have both buttons on one row inside the panel; widest next-button text seen: ${uniq(arr.map(r => r.nav.nextText)).join(' | ')}; button heights prev ${Math.min.apply(null, arr.map(r => r.nav.prev.h))}-${Math.max.apply(null, arr.map(r => r.nav.prev.h))} px, next ${Math.min.apply(null, arr.map(r => r.nav.next.h))}-${Math.max.apply(null, arr.map(r => r.nav.next.h))} px; widths prev ${Math.min.apply(null, arr.map(r => r.nav.prev.w))}-${Math.max.apply(null, arr.map(r => r.nav.prev.w))}, next ${Math.min.apply(null, arr.map(r => r.nav.next.w))}-${Math.max.apply(null, arr.map(r => r.nav.next.w))} px.` : `- ${name}: no measurements`;
  w(navLine(navs390, '390 px')); w(navLine(navs1280, '1280 px'));
  w();

  /* code pane */
  const codeRecs = R.snapshots.filter(r => r.code);
  w('### Code pane (`.dr-code`)');
  w();
  if (!codeRecs.length) w('No stage with a `code:` pane exists in the levels covered by this run.');
  else {
    w('| viewport | level | stage | measurements | highlighted line visible | font px | white-space | box w x h | chars/row | longest line (chars) | wrapped lines (of N) | max rows per line | scrolls sideways |');
    w('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    const cg = new Map();
    codeRecs.forEach(r => { const k = [r.vp, r.level, r.stage].join('|'); if (!cg.has(k)) cg.set(k, []); cg.get(k).push(r); });
    cg.forEach((rs, k) => {
      const [vp, level, stage] = k.split('|');
      const withOn = rs.filter(r => r.code.onCount);
      const vis = withOn.filter(r => r.code.firstOnVisible).length;
      const c = rs[0].code;
      w(`| ${vp} | ${level} | s${stage} | ${rs.length} | ${vis}/${withOn.length} | ${c.fontSize} | ${c.whiteSpace} | ${c.clientW} x ${c.clientH} | ${c.charsPerRow} | ${c.longestLineChars} | ${c.wrappedLines} of ${c.codeLines} | ${c.maxRowsPerLine} | ${rs.some(r => r.code.sideways)} |`);
    });
  }
  w();

  /* scroll after next */
  w('### After clicking "Agla step" (does the new step start in view?)');
  w();
  const sa = R.scrollAfterNext;
  ['390', '1280'].forEach(vp => {
    const a = sa.filter(x => x.vp === vp);
    if (!a.length) return;
    const topOk = a.filter(x => x.wrapTop >= -2 && x.wrapTop < x.ih * 0.5).length;
    w(`- ${vp} px: ${a.length} step changes; after the (smooth) scroll the \`.dr-wrap\` top sat in the upper half of the screen in ${topOk}/${a.length} cases; \`.dr-say\` top within the first screen in ${a.filter(x => x.sayTop < x.ih).length}/${a.length}; \`.dr-say\` bottom within the first screen in ${a.filter(x => x.sayBottom <= x.ih).length}/${a.length}.`);
  });
  w();

  /* console log */
  w('### Console / page errors');
  w();
  const real = R.logs.filter(l => !l.expected);
  const exp = R.logs.filter(l => l.expected);
  w(`- Real errors/warnings: ${real.length}. Expected-missing script loads: ${exp.length} log lines, one per page load (${R.expectedMissing.join(', ') || 'none'}).`);
  const lg = new Map();
  real.forEach(l => { const k = l.kind + '|' + l.text; if (!lg.has(k)) lg.set(k, { l, n: 0 }); lg.get(k).n++; });
  if (lg.size) {
    w();
    w('| kind | count | first seen (viewport / level / where) | message |');
    w('|---|---|---|---|');
    lg.forEach(v => w(`| ${v.l.kind} | ${v.n} | ${v.l.vp} / ${v.l.level || '-'} / ${v.l.where || ''} s${v.l.stage == null ? '-' : v.l.stage} step ${v.l.step == null ? '-' : v.l.step} | ${mdEsc(v.l.text).slice(0, 300)}${v.l.stack ? ' @ ' + mdEsc(v.l.stack).slice(0, 200) : ''} |`));
  }
  w();

  /* overflow summary */
  w('### Overflow summary');
  w();
  ['390', '1280'].forEach(vp => {
    const a = R.snapshots.filter(r => r.vp === vp);
    const wr = a.filter(r => r.hasWrap);
    w(`- ${vp} px: ${a.length} measurements; page sideways overflow in ${a.filter(r => r.hOverflow).length}; elements past the panel edge in ${wr.filter(r => r.drOverflow.length).length}/${wr.length} dryrun measurements; SVG text cut off in ${wr.filter(r => r.svg && r.svg.cut.length).length}; text spilling out of its pill/box in ${wr.filter(r => r.svg && r.svg.spill.length).length}; svg box overlaps in ${wr.filter(r => r.svg && r.svg.overlaps.length).length}; undefined/NaN text in ${a.filter(r => r.badText.some(b => !b.inCode)).length}.`);
    const hs = [].concat.apply([], wr.map(r => r.hScrollers.map(h => h.el + ` (client ${h.clientW}, scroll ${h.scrollW})`)));
    if (hs.length) w(`  - containers that need sideways scrolling by design at ${vp} px: ${uniq(hs).slice(0, 6).join('; ')}${uniq(hs).length > 6 ? ' ...' : ''}`);
  });
  w();

  /* levels covered */
  w('### Coverage');
  w();
  w('| level | stage | type | viewports | steps |');
  w('|---|---|---|---|---|');
  R.levels.forEach(l => l.stages.forEach((s, i) => {
    const vps = uniq(R.snapshots.filter(r => r.level === l.id && r.stage === i + 1).map(r => r.vp));
    w(`| ${l.id} | s${i + 1} | ${s.type} | ${vps.join(', ') || 'NOT REACHED'} | ${s.steps.length || '-'} |`);
  }));
  w();
  if (R.flowErrors.length) {
    w('### Flow errors (script could not continue)');
    w();
    R.flowErrors.forEach(f => w(`- ${f.vp} ${f.level || ''} s${f.stage == null ? '-' : f.stage}${f.step ? ' step ' + f.step : ''}: ${f.error}`));
    w();
  }
  return { md: L.join('\n') + '\n', counts, groups: G };
}

if (require.main === module) main().catch(e => { console.error('FATAL: ' + (e && e.stack || e)); process.exit(1); });
module.exports = { measureInPage };
