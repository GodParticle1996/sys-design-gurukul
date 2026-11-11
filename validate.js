#!/usr/bin/env node
/* =====================================================================
   System Gurukul — validator

     node validate.js              # sab kuch
     node validate.js lifecycle    # sirf ek level (missions)

   Do hisse:
   1) STRUCTURE — level/stage ki shakl, unsolvable quiz/fill, softlock
      hotspot (aisa target jo diagram mein hai hi nahi), toote incident
      branches, gayab VISUALS, ranks ka order, index.html ke script tags.
   2) MISSIONS  — har terminal mission ki solution[] ko ASLI perfsim par chala ke
      dekhta hai ki tasks poore hote hain aur success() true hota hai.
      Saath hi check karta hai ki fresh sim par success() FALSE ho — warna
      mission bina kuch kiye hi "complete" ho jaayega.
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DIR = __dirname;

const ENGINE = ['core.js', 'data-core.js', 'visuals.js', 'games.js', 'perfsim.js', 'canvas.js', 'labs.js', 'dockerlab.js', 'explain.js'];
const CONTENT = ['data-flow.js', 'data-api.js', 'data-data.js', 'data-resil.js', 'data-dist.js', 'data-shapes.js', 'data-builds.js', 'data-feed.js', 'data-feed-2.js',
  'data-st-01-reddit.js', 'data-st-02-cloudflare.js', 'data-st-03-jira.js', 'data-st-04-snowflake.js',
  'data-st-05-airtable.js', 'data-st-06-slack.js', 'data-st-07-discord.js', 'data-st-08-instagram.js',
  'data-st-09-stripe.js', 'data-st-10-prime.js', 'data-st-11-dropbox.js', 'data-st-12-whatsapp.js', 'data-st-13-roblox.js', 'data-st-14-notion.js',
  'data-ai-01-safety.js', 'data-ai-02-colab.js', 'data-ai-03-tiktok.js', 'data-ai-04-replit.js', 'data-ai-05-deepseek.js', 'data-ai-06-aws.js',
  'data-pl-01-bittorrent.js', 'data-pl-02-starlink.js', 'data-pl-03-youtube.js', 'data-pl-04-gmail.js', 'data-pl-05-search.js', 'data-pl-06-maps.js',
  'data-gaps.js', 'data-ext-videos.js', 'data-ext-episodes.js', 'data-ext-sdd1.js',
  'data-v2-00-tracks.js', 'data-v2-breaker-1-kyun.js', 'data-v2-breaker-2-kaise.js', 'data-v2-breaker-3-code.js', 'data-v2-breaker-4-library.js', 'data-v2-breaker-5-kab.js',
  'data-v2-retries-1-kyun.js', 'data-v2-retries-2-kaise.js', 'data-v2-retries-3-code.js', 'data-v2-retries-4-library.js', 'data-v2-retries-5-kab.js',
  'data-v2-backpressure-1-kyun.js',
  'data-v2-backpressure-2-kaise.js',
  'data-v2-backpressure-3-code.js',
  'data-v2-backpressure-4-library.js',
  'data-v2-backpressure-5-kab.js',
  'data-v2-noisy-1-kyun.js',
  'data-v2-noisy-2-kaise.js',
  'data-v2-noisy-3-code.js',
  'data-v2-noisy-4-library.js',
  'data-v2-noisy-5-kab.js',
  'data-v2-random-1-kyun.js',
  'data-v2-random-2-kaise.js',
  'data-v2-random-3-code.js',
  'data-v2-random-4-kab.js',
  'data-v2-health-1-kyun.js',
  'data-v2-health-2-kaise.js',
  'data-v2-health-3-code.js',
  'data-v2-health-4-library.js',
  'data-v2-health-5-kab.js',
  'data-v2-dr-1-kyun.js',
  'data-v2-dr-2-kaise.js',
  'data-v2-dr-3-code.js',
  'data-v2-dr-4-library.js',
  'data-v2-dr-5-kab.js',
  'data-v2-chaos-1-kyun.js',
  'data-v2-chaos-2-kaise.js',
  'data-v2-chaos-3-code.js',
  'data-v2-chaos-4-kab.js',
  'data-v2-eda-1-kyun.js',
  'data-v2-eda-2-kaise.js',
  'data-v2-eda-3-code.js',
  'data-v2-eda-4-kab.js',
  'data-v2-eda-payload-1-kyun.js',
  'data-v2-eda-payload-2-kaise.js',
  'data-v2-eda-payload-3-code.js',
  'data-v2-eda-payload-4-kab.js',
  'data-v2-eda-tradeoffs-1-kyun.js',
  'data-v2-eda-tradeoffs-2-kaise.js',
  'data-v2-eda-tradeoffs-3-code.js',
  'data-v2-eda-tradeoffs-4-kab.js',
  'data-v2-eda-races-1-kyun.js',
  'data-v2-eda-races-2-kaise.js',
  'data-v2-eda-races-3-code.js',
  'data-v2-eda-races-4-kab.js',
  'data-v2-eda-sourcing-1-kyun.js',
  'data-v2-eda-sourcing-2-kaise.js',
  'data-v2-eda-sourcing-3-code.js',
  'data-v2-eda-sourcing-4-kab.js',
  'data-v2-eda-modeling-1-kyun.js',
  'data-v2-eda-modeling-2-kaise.js',
  'data-v2-eda-modeling-3-code.js',
  'data-v2-eda-modeling-4-kab.js',
  'data-v2-fp-physics-1-kyun.js',
  'data-v2-fp-physics-2-kaise.js',
  'data-v2-fp-physics-3-code.js',
  'data-v2-fp-physics-4-kab.js',
  'data-v2-fp-scale-1-kyun.js',
  'data-v2-fp-scale-2-kaise.js',
  'data-v2-fp-scale-3-code.js',
  'data-v2-fp-scale-4-kab.js', 'data-v2-fp-comm-1-kyun.js', 'data-v2-fp-comm-2-kaise.js', 'data-v2-fp-comm-3-code.js', 'data-v2-fp-comm-4-kab.js', 'data-v2-fp-req-1-kyun.js', 'data-v2-fp-req-2-kaise.js', 'data-v2-fp-req-3-code.js', 'data-v2-fp-req-4-kab.js', 'data-v2-fp-per-1-kyun.js', 'data-v2-fp-per-2-kaise.js', 'data-v2-fp-per-3-code.js', 'data-v2-fp-per-4-kab.js', 'data-v2-fp-tax-1-kyun.js', 'data-v2-fp-tax-2-kaise.js', 'data-v2-fp-tax-3-code.js', 'data-v2-fp-tax-4-kab.js', 'data-guidance.js', 'data-v2-concurrency.js'];
/* dev: jo file abhi register nahi hui (index.html / upar ki list mein nahi), use bhi parkhna ho:
     EXTRA_CONTENT=data-v2-x-1-kyun.js,data-v2-x-2-kaise.js node validate.js
   In files par "index.html mein script tag hai?" wali jaanch nahi lagti. Asli register tabhi karo jab file tayyar ho. */
const EXTRA = (process.env.EXTRA_CONTENT || '').split(',').map(s => s.trim()).filter(Boolean);
EXTRA.forEach(f => { if (!CONTENT.includes(f)) CONTENT.push(f); });

let errors = 0, warns = 0, checks = 0;
const fail = m => { errors++; console.log('  ❌ ' + m); };
const warn = m => { warns++; console.log('  ⚠️  ' + m); };
const ok = () => { checks++; };

/* =====================================================================
   MINI DOM — asli renderers isi par chalte hain
   ===================================================================== */
function makeEl(tag) {
  const e = {
    tag, className: '', _html: '', children: [], style: {}, _txt: '',
    disabled: false, value: '', dataset: {}, _handlers: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => e.classList._s.add(x)); },
      remove(...c) { c.forEach(x => e.classList._s.delete(x)); },
      contains: c => e.classList._s.has(c),
      toggle(c, force) { const add = force == null ? !e.classList._s.has(c) : !!force; if (add) e.classList._s.add(c); else e.classList._s.delete(c); return add; },
    },
    /* browser jaisa: innerHTML set karne se purane children hat jaate hain */
    set innerHTML(v) { e._html = v; e.children.length = 0; }, get innerHTML() { return e._html; },
    set textContent(v) { e._txt = v; }, get textContent() { return e._txt; },
    appendChild(c) { e.children.push(c); return c; },
    append(...cs) { cs.forEach(c => e.children.push(c)); },
    contains(c) { return e.children.includes(c) || e.children.some(child => child.contains && child.contains(c)); },
    setAttribute(name, value) { e[name] = String(value); },
    getAttribute(name) { return e[name] == null ? null : e[name]; },
    addEventListener(ev, fn) { e._handlers[ev] = fn; },
    removeChild(c) { const i = e.children.indexOf(c); if (i > -1) e.children.splice(i, 1); },
    insertBefore(c) { e.children.unshift(c); return c; },
    click() { if (e.onclick) e.onclick(); },
    remove() {},
    querySelector(sel) {
      if (sel === '.term-out') return (e._out = e._out || makeEl('div'));
      if (sel === 'input') return (e._in = e._in || makeEl('input'));
      return makeEl('div');
    },
    querySelectorAll() { return []; },
    closest() { return null; },
    scrollIntoView() {}, focus() {}, offsetWidth: 0,
    getBoundingClientRect: () => ({ width: 0, height: 0 }),
  };
  return e;
}

const sandbox = {
  console, Math, Date, JSON, Buffer, RegExp, Error, parseInt, parseFloat, isNaN,
  setTimeout: f => { if (typeof f === 'function') f(); }, clearTimeout() {},
  localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
  document: {
    createElement: makeEl, createTextNode: () => makeEl('#text'),
    _els: {},
    getElementById(id) { return this._els[id] || (this._els[id] = makeEl('div')); },
    body: makeEl('body'),
  },
  Element: function () {}, location: { href: '' },
  window: { scrollTo() {}, addEventListener() {}, matchMedia: () => ({ matches: false, addListener() {} }) },
  scrollTo() {}, requestAnimationFrame: f => f && f(),
  encodeURIComponent, decodeURIComponent,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const FILES = ENGINE.concat(CONTENT.filter(f => fs.existsSync(path.join(DIR, f))));
FILES.forEach(f => {
  try { vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.log(`\n💥 ${f} load nahi hua: ${e.message}\n`); process.exit(1); }
});
/* core.js `const SD` declare karta hai — woh sandbox global nahi banta, isliye padh ke lao */
vm.runInContext('globalThis.__SD = typeof SD !== "undefined" ? SD : null;' +
                'globalThis.__VISUALS = typeof VISUALS !== "undefined" ? VISUALS : null;' +
                'globalThis.__RANKS = typeof RANKS !== "undefined" ? RANKS : null;', sandbox);
const SD = sandbox.__SD, VISUALS = sandbox.__VISUALS, RANKS = sandbox.__RANKS;
if (!SD) { console.log('💥 SD namespace nahi mila'); process.exit(1); }
SD.addXP = () => {};

const ONLY = process.argv[2];

/* =====================================================================
   1. STRUCTURE
   ===================================================================== */
const LAB_TYPES = ['replay', 'tradeoff', 'estimate', 'archdiff', 'docker', 'dryrun', 'cards'];
const labStages = [];
const allLevels = [];
SD.tracks.forEach(t => (SD.levelSets[t.id] || []).forEach(l => allLevels.push({ track: t, level: l })));

function allStages(l) {
  const s = (l.stages || []).slice();
  if (l.interview) s.push(Object.assign({ type: 'interview' }, l.interview));
  return s;
}

function structure() {
  console.log('\n🔎 STRUCTURE');
  const seen = new Set();

  SD.tracks.forEach(t => {
    if (!SD.levelSets[t.id] || !SD.levelSets[t.id].length) fail(`track '${t.id}' mein koi level nahi`);
    ['icon', 'name', 'blurb', 'certTitle', 'certSub', 'motto', 'formula'].forEach(k => {
      if (!t[k]) fail(`track '${t.id}': '${k}' missing`); else ok();
    });
  });

  allLevels.forEach(({ track, level: l }) => {
    const at = `${track.id}/${l.id}`;
    if (!l.id) return fail(`${track.id}: bina id ka level`);
    if (seen.has(l.id)) fail(`duplicate level id: '${l.id}'`); else { seen.add(l.id); ok(); }
    ['icon', 'title', 'badge'].forEach(k => { if (!l[k]) fail(`${at}: '${k}' missing`); else ok(); });
    if (!(l.objectives || []).length) fail(`${at}: objectives khaali`); else ok();
    if (!(l.lesson || []).length) fail(`${at}: lesson khaali`); else ok();
    if (!(l.stages || []).length) fail(`${at}: koi stage nahi`); else ok();
    if (!(l.success || []).length) warn(`${at}: success list khaali`);
    if (!(l.cards || []).length) warn(`${at}: koi flashcard nahi`);
    if (!l.interview) warn(`${at}: koi interview nahi`);
    if (!VISUALS[l.id]) fail(`${at}: VISUALS['${l.id}'] nahi hai`); else ok();

    allStages(l).forEach((st, si) => {
      const sat = `${at} stage[${si}] (${st.type})`;
      if (!st.type) return fail(`${sat}: type missing`);
      if (st.visual && !VISUALS[st.visual]) fail(`${sat}: visual '${st.visual}' nahi hai`);

      if (st.type === 'quiz' || st.type === 'interview') {
        const qs = st.questions || [];
        if (!qs.length) fail(`${sat}: koi question nahi`);
        qs.forEach((q, qi) => {
          if (q.terminal) return;                       // missions alag se check hote hain
          if (!q.choices || q.choices.length < 2) return fail(`${sat} q[${qi}]: choices kam`);
          if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.choices.length)
            fail(`${sat} q[${qi}]: answer index range se bahar (${q.answer} / ${q.choices.length})`);
          else ok();
          if (!q.explain) warn(`${sat} q[${qi}]: explain missing`);
        });
      }

      if (st.type === 'bins') {
        const ids = (st.bins || []).map(b => b.id);
        if (ids.length < 2) fail(`${sat}: kam se kam 2 bins chahiye`);
        (st.items || []).forEach((it, ii) => {
          if (!ids.includes(it.bin)) fail(`${sat} item[${ii}]: bin '${it.bin}' exist nahi karta`);
          else ok();
          if (!it.explain) warn(`${sat} item[${ii}]: explain missing`);
        });
        if (!(st.items || []).length) fail(`${sat}: koi item nahi`);
      }

      if (st.type === 'match') {
        (st.pairs || []).forEach((p, pi) => {
          if (!p.left || !p.right) fail(`${sat} pair[${pi}]: left/right missing`); else ok();
          if (!p.explain) warn(`${sat} pair[${pi}]: explain missing`);
        });
        if (!(st.pairs || []).length) fail(`${sat}: koi pair nahi`);
      }

      if (st.type === 'order') {
        (st.steps || []).forEach((s2, i2) => {
          if (!s2.text) fail(`${sat} step[${i2}]: text missing`); else ok();
          if (!s2.explain) warn(`${sat} step[${i2}]: explain missing`);
        });
        if ((st.steps || []).length < 3) fail(`${sat}: kam se kam 3 steps chahiye`);
      }

      if (st.type === 'fill') {
        const holes = [...new Set((st.template || '').match(/\{\d+\}/g) || [])];
        const blanks = st.blanks || [];
        if (holes.length !== blanks.length)
          fail(`${sat}: template mein ${holes.length} blank, blanks[] mein ${blanks.length}`);
        else ok();
        blanks.forEach((b, bi) => {
          /* UNSOLVABLE GUARD: jawab tokens mein na ho toh player kabhi jeet hi nahi sakta */
          if (!(st.tokens || []).includes(b.answer))
            fail(`${sat} blank[${bi}]: answer '${b.answer}' tokens[] mein nahi hai — mission unsolvable`);
          else ok();
          if (!b.explain) warn(`${sat} blank[${bi}]: explain missing`);
        });
      }

      if (st.type === 'hotspot') {
        const v = VISUALS[st.visual];
        if (!v) return fail(`${sat}: visual '${st.visual}' missing`);
        const targets = new Set((v.html.match(/data-hs="([^"]+)"/g) || []).map(m => m.slice(9, -1)));
        (st.questions || []).forEach((q, qi) => {
          /* SOFTLOCK GUARD: aisa target jo diagram mein hai hi nahi = player fansa rahega */
          if (!targets.has(q.target))
            fail(`${sat} q[${qi}]: target '${q.target}' visual '${st.visual}' mein nahi hai — softlock`);
          else ok();
          if (!q.explain) warn(`${sat} q[${qi}]: explain missing`);
        });
      }

      if (st.type === 'incident') {
        const nodes = st.nodes || {};
        if (!nodes[st.start]) return fail(`${sat}: start node '${st.start}' missing`);
        ok();
        const reached = new Set([st.start]);
        const walk = id => {
          const n = nodes[id];
          if (!n || n.end) return;
          const goods = (n.choices || []).filter(c => c.good);
          if (!goods.length) fail(`${sat} node '${id}': koi good choice nahi — dead end`);
          (n.choices || []).forEach((c, ci) => {
            if (!c.explain) warn(`${sat} node '${id}' choice[${ci}]: explain missing`);
            if (c.good && !c.next) fail(`${sat} node '${id}' choice[${ci}]: good hai par 'next' nahi`);
            if (c.next) {
              if (!nodes[c.next]) fail(`${sat} node '${id}': next '${c.next}' exist nahi karta`);
              else if (!reached.has(c.next)) { reached.add(c.next); walk(c.next); }
            }
          });
        };
        walk(st.start);
        const ends = Object.keys(nodes).filter(k => nodes[k].end);
        if (!ends.length) fail(`${sat}: koi end node nahi`);
        if (!ends.some(e => reached.has(e))) fail(`${sat}: koi end node reachable nahi`); else ok();
        Object.keys(nodes).forEach(k => { if (!reached.has(k)) warn(`${sat}: node '${k}' kahin se reachable nahi`); });
      }

      if (st.type === 'design') {
        const slots = st.slots || [];
        if (slots.length < 3) fail(`${sat}: kam se kam 3 slots chahiye`);
        let max = 0;
        slots.forEach((sl, sli) => {
          if (!sl.id || !sl.label) fail(`${sat} slot[${sli}]: id/label missing`);
          const opts = sl.options || [];
          if (opts.length < 2) return fail(`${sat} slot[${sli}]: kam se kam 2 options chahiye`);
          const scores = opts.map(o => o.score);
          if (!scores.some(x => x > 0)) fail(`${sat} slot[${sli}]: koi positive-score option nahi — slot jeeta hi nahi ja sakta`);
          else ok();
          opts.forEach((o, oi) => {
            if (!o.id || !o.label) fail(`${sat} slot[${sli}] opt[${oi}]: id/label missing`);
            if (typeof o.score !== 'number') fail(`${sat} slot[${sli}] opt[${oi}]: score number nahi`);
            if (!o.why) warn(`${sat} slot[${sli}] opt[${oi}]: 'why' missing — yahi asli seekh hai`);
          });
          max += Math.max(...scores);
        });
        /* UNWINNABLE GUARD */
        if (st.pass != null && st.pass > max)
          fail(`${sat}: pass=${st.pass} par max possible score ${max} hai — jeeta hi nahi ja sakta`);
        else ok();
        if (!(st.requirements || []).length) warn(`${sat}: requirements khaali`);
      }

      if (LAB_TYPES.includes(st.type)) labStages.push({ at: sat, st });

      if (st.type === 'replay') {
        const frames = st.frames || [];
        if (frames.length < 3) fail(`${sat}: kam se kam 3 frames chahiye`); else ok();
        if (!st.incident) warn(`${sat}: 'incident' ka naam missing`);
        const mids = (st.metrics || []).map(m => m.id);
        (st.metrics || []).forEach((m, mi) => {
          if (!m.id || !m.label) fail(`${sat} metric[${mi}]: id/label missing`);
          if (typeof m.max !== 'number' || m.max <= 0) fail(`${sat} metric[${mi}]: 'max' number nahi`);
        });
        frames.forEach((f, fi) => {
          if (!f.t) fail(`${sat} frame[${fi}]: 't' (waqt) missing`);
          if (!f.event) fail(`${sat} frame[${fi}]: 'event' missing`);
          Object.keys(f.metrics || {}).forEach(k => {
            if (!mids.includes(k)) fail(`${sat} frame[${fi}]: metric '${k}' metrics[] mein declare nahi hua`);
          });
          if (f.ask) {
            const q = f.ask;
            if (!q.q) fail(`${sat} frame[${fi}] ask: sawaal missing`);
            if (!q.choices || q.choices.length < 2) fail(`${sat} frame[${fi}] ask: kam se kam 2 choices chahiye`);
            else if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.choices.length)
              fail(`${sat} frame[${fi}] ask: answer index range se bahar`);
            else ok();
            if (!q.explain) warn(`${sat} frame[${fi}] ask: explain missing`);
          }
        });
        if (!frames.some(f => f.ask)) warn(`${sat}: koi 'ask' nahi — replay sirf dekhne ki cheez ban jaayega`);
      }

      if (st.type === 'tradeoff') {
        const ks = st.knobs || [];
        if (ks.length < 2) fail(`${sat}: kam se kam 2 knobs chahiye`); else ok();
        ks.forEach((k, ki) => {
          if (!k.id || !k.label) fail(`${sat} knob[${ki}]: id/label missing`);
          if (typeof k.min !== 'number' || typeof k.max !== 'number' || k.min >= k.max)
            fail(`${sat} knob[${ki}]: min/max galat`);
          else if (k.value < k.min || k.value > k.max)
            fail(`${sat} knob[${ki}]: starting value (${k.value}) range se bahar`);
          else ok();
        });
        Object.entries(st.workload || {}).forEach(([id, minimum]) => {
          const k = ks.find(knob => knob.id === id);
          if (!k || !Number.isFinite(minimum) || minimum < k.min || minimum > k.max ||
              Math.abs((minimum - k.min) / (k.step || 1) - Math.round((minimum - k.min) / (k.step || 1))) > 1e-7)
            fail(`${sat}: workload.${id} valid knob range/step mein hona chahiye`);
          else ok();
        });
        ['readouts', 'bars', 'verdict', 'check'].forEach(fn => {
          if (typeof st[fn] !== 'function') fail(`${sat}: ${fn}() function nahi hai`); else ok();
        });
        if (st.quiz) {
          const q = st.quiz;
          if (!q.choices || typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.choices.length)
            fail(`${sat} quiz: answer index range se bahar`);
          else ok();
        }
        if (!st.goal) warn(`${sat}: 'goal' missing — player ko finish line nahi dikhegi`);
      }

      if (st.type === 'estimate') {
        const ps = st.problems || [];
        if (!ps.length) fail(`${sat}: koi problem nahi`);
        ps.forEach((p, pi) => {
          if (!p.q) fail(`${sat} problem[${pi}]: sawaal missing`);
          if (typeof p.answer !== 'number' || !(p.answer > 0) || !isFinite(p.answer))
            fail(`${sat} problem[${pi}]: 'answer' ek positive number hona chahiye`);
          else ok();
          if (!p.unit) warn(`${sat} problem[${pi}]: 'unit' missing — player ko pata nahi kis paimane mein likhna hai`);
          if (!(p.steps || []).length) fail(`${sat} problem[${pi}]: 'steps' khaali — jawab ke baad seekhne ko kuch nahi`);
          else ok();
          if (p.tol != null && (p.tol <= 0 || p.tol > 2)) warn(`${sat} problem[${pi}]: tol=${p.tol} ajeeb hai (log10 mein doori, aam taur par 0.3-0.5)`);
        });
      }

    if (st.type === 'archdiff') {
        const nodes = st.nodes || [];
        const ids = nodes.map(n => n.id);
        if (nodes.length < 4) fail(`${sat}: kam se kam 4 nodes chahiye`); else ok();
        const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
        if (dup.length) fail(`${sat}: duplicate node id: ${dup.join(', ')}`);
        nodes.forEach((n, ni) => { if (!n.id || !n.label) fail(`${sat} node[${ni}]: id/label missing`); });
        const flaws = st.flaws || [];
        if (flaws.length < 2) fail(`${sat}: kam se kam 2 flaws chahiye`); else ok();
        flaws.forEach((f, fi) => {
          /* SOFTLOCK GUARD: aisa flaw jo board par hai hi nahi = kabhi mil hi nahi sakta */
          if (!ids.includes(f.id)) fail(`${sat} flaw[${fi}]: node '${f.id}' nodes[] mein nahi hai — lab kabhi poora nahi hoga`);
          else ok();
          if (!f.why) fail(`${sat} flaw[${fi}]: 'why' missing — galti pakadne par kuch sikhaya hi nahi jaayega`);
        });
        const flawIds = flaws.map(f => f.id);
        ids.filter(id => !flawIds.includes(id)).forEach(id => {
          if (!(st.fine || {})[id]) warn(`${sat}: sahi node '${id}' ke liye fine['${id}'] nahi — galat click kuch nahi sikhaayega`);
        });
        if (!flaws.length) fail(`${sat}: koi flaw nahi`);
      }

      if (st.type === 'dryrun' || st.type === 'cards') {
        const nodeIds = new Set((st.nodes || []).map(n => n.id));
        const VW = (st.viz && st.viz.w) || 1000, VH = (st.viz && st.viz.h) || 520;
        if (st.nodes && st.nodes.length < 2) fail(`${sat}: diagram hai toh kam se kam 2 nodes chahiye`);
        (st.nodes || []).forEach((n, ni) => {
          if (typeof n.x !== 'number' || typeof n.y !== 'number') fail(`${sat} node[${ni}] '${n.id}': x/y number nahi`);
          else if (n.x < 100 || n.x > VW - 100 || n.y < 40 || n.y > VH - 70) warn(`${sat} node '${n.id}': (${n.x},${n.y}) diagram (${VW}×${VH}) ke kinare se bahar ja sakta hai`);
        });
        (st.edges || []).forEach((e, ei) => {
          if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) fail(`${sat} edge[${ei}]: '${e.from}'→'${e.to}' node exist nahi karta`);
        });
        if (st.viz && st.viz.focus != null) {
          if (!Array.isArray(st.viz.focus) || !st.viz.focus.length) fail(`${sat}: viz.focus node ids ka array hona chahiye`);
          else st.viz.focus.forEach(id => { if (!nodeIds.has(id)) fail(`${sat}: viz.focus '${id}' node exist nahi karta`); });
        }
        const varIds = new Set((st.vars || []).map(v => v.id)), panelIds = new Set((st.panels || []).map(p => p.id));
        (st.vars || []).forEach((v, vi) => { if (!v.id || !v.label) fail(`${sat} vars[${vi}]: id/label missing`); });
        /* code ka tukda ASLI file se match kare — lesson aur lab ka code kabhi alag na ho */
        let codeLines = null;
        if (st.code) {
          if (!st.code.text) fail(`${sat}: code.text missing`);
          else {
            const from = st.code.from || 1, n = String(st.code.text).split('\n').length;
            codeLines = { from, to: from + n - 1 };
            if (st.code.file) {
              const fp = path.join(DIR, st.code.file);
              if (!fs.existsSync(fp)) fail(`${sat}: code.file '${st.code.file}' disk par nahi hai`);
              else {
                const real = fs.readFileSync(fp, 'utf8').split('\n').slice(from - 1, from - 1 + n).join('\n');
                if (real !== st.code.text) fail(`${sat}: code.text asli file '${st.code.file}' (line ${from}–${from + n - 1}) se alag hai`);
                else ok();
              }
            }
          }
        }
        const steps = st.steps || [];
        if (steps.length < 3) fail(`${sat}: kam se kam 3 steps chahiye`); else ok();
        steps.forEach((s2, i2) => {
          if (!s2.say) fail(`${sat} step[${i2}]: 'say' missing`);
          (s2.flows || []).forEach((f, fi) => {
            if (!nodeIds.has(f.from) || !nodeIds.has(f.to)) fail(`${sat} step[${i2}] flow[${fi}]: '${f.from}'→'${f.to}' node exist nahi karta`);
          });
          Object.keys(s2.nodes || {}).forEach(k => { if (!nodeIds.has(k)) fail(`${sat} step[${i2}]: node '${k}' diagram mein nahi hai`); });
          Object.keys(s2.vars || {}).forEach(k => { if (!varIds.has(k)) fail(`${sat} step[${i2}]: var '${k}' stage.vars mein nahi hai`); });
          Object.keys(s2.panels || {}).forEach(k => { if (!panelIds.has(k)) fail(`${sat} step[${i2}]: panel '${k}' stage.panels mein nahi hai`); });
          if (s2.line != null) {
            if (!codeLines) fail(`${sat} step[${i2}]: 'line' hai par stage.code nahi`);
            else SD.dryrunLines(s2.line).forEach(n => {
              if (!(n >= codeLines.from && n <= codeLines.to)) fail(`${sat} step[${i2}]: line ${n} code (${codeLines.from}–${codeLines.to}) ke bahar`);
            });
          }
          if (s2.ask) {
            const q = s2.ask;
            if (!q.q || !q.choices || q.choices.length < 2) fail(`${sat} step[${i2}] ask: q/choices kam`);
            else if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.choices.length) fail(`${sat} step[${i2}] ask: answer index range se bahar`);
            else ok();
            if (!q.explain) warn(`${sat} step[${i2}] ask: explain missing`);
          }
        });
        /* har var ki shuruaati value pehle step mein ho — warna table mein "—" dikhega */
        (st.vars || []).forEach(v => {
          if (!steps.length || !(steps[0].vars && v.id in steps[0].vars)) warn(`${sat}: var '${v.id}' ki shuruaati value step[0] mein nahi`);
        });
        if (!st.lesson) warn(`${sat}: lesson (aakhri nichod) missing`);
      }

      if (st.type === 'docker') {
        if (!st.project) fail(`${sat}: project missing`);
        else {
          const pdir = path.join(DIR, 'docker-labs', st.project);
          if (!fs.existsSync(pdir)) fail(`${sat}: docker-labs/${st.project} folder nahi hai`);
          else {
            ok();
            if (st.exercise) {
              const rp = path.join(pdir, 'README.md');
              const readme = fs.existsSync(rp) ? fs.readFileSync(rp, 'utf8') : '';
              if (!readme.includes(st.exercise)) fail(`${sat}: exercise '${st.exercise}' project README mein nahi mila`);
              else ok();
            }
          }
        }
        if (!st.goal) fail(`${sat}: goal missing`);
        if ((st.steps || []).length < 2) fail(`${sat}: kam se kam 2 steps chahiye`); else ok();
        (st.steps || []).forEach((s2, i2) => { if (!s2.text) fail(`${sat} step[${i2}]: text missing`); });
        const obs = st.observe;
        if (!obs || !obs.choices || obs.choices.length < 2) fail(`${sat}: observe sawaal (2+ choices) missing`);
        else if (typeof obs.answer !== 'number' || obs.answer < 0 || obs.answer >= obs.choices.length)
          fail(`${sat} observe: answer index range se bahar`);
        else ok();
        if (obs && !obs.explain) warn(`${sat} observe: explain missing`);
      }

      if (st.type === 'terminal') {
        if (!(st.tasks || []).length) fail(`${sat}: koi task nahi`);
        if (typeof st.success !== 'function') fail(`${sat}: success() missing`);
        if ((st.hints || []).length < 3) fail(`${sat}: 3 progressive hints chahiye`);
        if (!(st.solution || []).length) fail(`${sat}: explicit solution[] missing`);
        if (typeof st.verify !== 'function') fail(`${sat}: live-state verify() missing`);
        if (!st.goal) fail(`${sat}: goal missing`);
        (st.tasks || []).forEach((t, ti) => {
          if (typeof t.check !== 'function') fail(`${sat} task[${ti}]: check() missing`);
          if (!t.text) fail(`${sat} task[${ti}]: text missing`);
        });
      }
    });
  });

  /* boss aakhir mein? */
  /* Every major topic has an authored decision guide, and every level is
     explicitly assigned. No generic fallback can hide missing coverage. */
  const guidance = SD.guidance || { topics: {}, byLevel: {} };
  allLevels.forEach(({ level }) => {
    const topic = guidance.topics[guidance.byLevel[level.id]];
    if (!topic) return fail(`${level.id}: major-topic decision guide missing`);
    ['title', 'misaal', 'asli', 'use', 'avoid', 'mistake', 'followup'].forEach(key => {
      if (typeof topic[key] !== 'string' || !topic[key].trim()) fail(`${level.id}: guidance.${key} missing`); else ok();
    });
    if (!Array.isArray(topic.points) || topic.points.length < 2 || topic.points.length > 4 || topic.points.some(p => !p)) fail(`${level.id}: guidance.points needs 2–4 bullets`); else ok();
    if ((topic.compare || []).length < 2 || topic.compare.some(row => !row.choice || !row.when || !row.tradeoff)) fail(`${level.id}: X-vs-Y comparison missing`); else ok();
    if (!(topic.sources || []).length || topic.sources.some(source => !source.title || !/^https:\/\//.test(source.url || ''))) fail(`${level.id}: primary guidance sources missing`); else ok();
  });

  /* boss aakhir mein? */
  SD.tracks.forEach(t => {
    const ls = SD.levelSets[t.id] || [];
    const bossIdx = ls.findIndex(l => /^boss/.test(l.id));
    if (bossIdx > -1 && bossIdx !== ls.length - 1)
      fail(`track '${t.id}': boss level '${ls[bossIdx].id}' aakhir mein nahi hai (position ${bossIdx + 1}/${ls.length}) — registerLevelsAfter use karo`);
    else ok();
  });

  /* ranks */
  for (let i = 1; i < RANKS.length; i++) {
    if (RANKS[i].xp <= RANKS[i - 1].xp) fail(`RANKS: xp badhta nahi (${RANKS[i - 1].name} → ${RANKS[i].name})`);
  }
  ok();

  /* orphan visuals */
  const used = new Set(allLevels.map(x => x.level.id));
  allLevels.forEach(({ level: l }) => allStages(l).forEach(st => { if (st.visual) used.add(st.visual); }));
  Object.keys(VISUALS).forEach(k => { if (!used.has(k)) warn(`VISUALS['${k}'] kisi level/stage se use nahi hota`); });

  /* SCRIPT LEAK — content Hinglish hai, yaani LATIN script mein.
     Devanagari/Cyrillic/Arabic ka ek bhi character matlab typing ke waqt
     galti se doosri script ghus gayi (yeh do baar ho chuka hai: "sochо"
     mein Cyrillic 'о', "samето" mein Cyrillic 'ето'). Aankh se yeh
     lagbhag nahi dikhta, isliye machine se pakdo. */
  const NON_LATIN = /[\u0400-\u04FF\u0900-\u097F\u0600-\u06FF]/;
  ENGINE.concat(CONTENT).forEach(f => {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) return;
    fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      const m = line.match(NON_LATIN);
      if (m) fail(`${f}:${i + 1} — non-Latin character '${m[0]}' (U+${m[0].charCodeAt(0).toString(16).toUpperCase()}): ${line.trim().slice(0, 70)}`);
    });
  });
  ok();

  /* Content HTML: a tag the browser doesn't know (`</docs/migrate>`, `<id>`) is swallowed with its text,
     and an unclosed tag bleeds its style into the rest of the screen. Literal brackets must be &lt; &gt;. */
  const KNOWN_TAGS = new Set(('a abbr b br caption code col colgroup dd del details div dl dt em h1 h2 h3 h4 h5 h6 hr i img ' +
    'ins kbd li mark ol p pre q s samp section aside small span strong sub summary sup table tbody td tfoot th thead tr u ul ' +
    'var svg g rect text line path circle polyline polygon defs marker tspan title figure figcaption label input button').split(' '));
  const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'col', 'line', 'path', 'circle', 'rect', 'polyline', 'polygon']);
  const htmlProblem = str => {
    const stack = []; const re = /<(\/?)([a-zA-Z][\w:-]*)[^<>]*?(\/?)>/g; let m;
    while ((m = re.exec(str))) {
      const tag = m[2].toLowerCase();
      if (!KNOWN_TAGS.has(tag)) return `anjaana tag ${m[0]} (browser ise text ke saath gayab kar dega; &lt; &gt; likho)`;
      if (VOID_TAGS.has(tag) || m[3]) continue;
      if (!m[1]) stack.push(tag);
      else if (stack[stack.length - 1] === tag) stack.pop();
      else return `</${tag}> bina khule (khule: ${stack.join(',') || '-'})`;
    }
    return stack.length ? `band nahi hua: <${stack.join('><')}>` : null;
  };
  const eachString = (o, p, f) => {
    if (typeof o === 'string') f(p, o);
    else if (Array.isArray(o)) o.forEach((v, i) => eachString(v, `${p}[${i}]`, f));
    else if (o && typeof o === 'object') Object.keys(o).forEach(k => eachString(o[k], p ? `${p}.${k}` : k, f));
  };
  allLevels.forEach(({ level }) => {
    let clean = true;
    eachString(level, '', (p, str) => {
      // Dry-run source panes escape raw code. Java generics such as <Runnable> are source, not HTML.
      const source = p.match(/^stages\[(\d+)\]\.code\.text$/);
      if (source && ['dryrun', 'cards'].includes(level.stages[+source[1]].type)) return;
      // Terminal hints are printed with textContent (perfsim.js print), so `<ms>` placeholders show as written.
      const hint = p.match(/^stages\[(\d+)\]\.hints\[\d+\]$/);
      if ((hint && level.stages[+hint[1]].type === 'terminal') || /\.terminal\.hints\[\d+\]$/.test(p)) return;
      const why = htmlProblem(str); if (why) { clean = false; fail(`${level.id} ${p}: ${why}`); }
    });
    if (clean) ok();
  });
  Object.keys(VISUALS).forEach(id => {
    const why = htmlProblem(String(VISUALS[id].t || '')) || htmlProblem(String(VISUALS[id].html || ''));
    if (why) fail(`VISUALS['${id}']: ${why}`); else ok();
  });

  /* index.html — the browser's list is the real one; it must match ENGINE + CONTENT exactly, in order */
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  ENGINE.concat(CONTENT).forEach(f => {
    if (EXTRA.includes(f)) return ok();
    if (fs.existsSync(path.join(DIR, f)) && !html.includes(f)) fail(`index.html mein <script src="${f}"> nahi hai`);
    else ok();
  });
  const pageScripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]).filter(f => f !== 'app.js');
  const ours = ENGINE.concat(CONTENT).filter(f => !EXTRA.includes(f));
  if (pageScripts.join('\n') !== ours.join('\n')) fail(`index.html ke <script> validate.js ki ENGINE + CONTENT list se alag hain (ya kram alag hai): ` +
    `sirf index.html mein: ${pageScripts.filter(f => !ours.includes(f)).join(' ') || '-'} · sirf validate.js mein: ${ours.filter(f => !pageScripts.includes(f)).join(' ') || '-'}`);
  else ok();

  /* gallery.html — content files register their own diagrams, so the gallery must load the same scripts */
  const scriptsOf = page => [...page.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
  const gallery = scriptsOf(fs.readFileSync(path.join(DIR, 'gallery.html'), 'utf8'));
  const appScripts = scriptsOf(html).filter(f => f !== 'app.js');
  if (gallery.join('\n') !== appScripts.join('\n')) fail(`gallery.html ke <script> index.html (app.js ke bina) se alag hain — diagrams gayab honge`);
  else ok();
}

/* =====================================================================
   2. MISSIONS — explicit solutions, fresh state, omitted steps and bad input
   ===================================================================== */
function missions() {
  console.log('\n🧪 MISSIONS (explicit solution + adversarial engine replay)');
  const result = require('./tools/replay-missions').run({ only: ONLY, silent: true });
  result.failures.forEach(fail);
  checks += result.checks;
  console.log(`  ${result.missions} missions · ${result.omissions} omitted-step attempts · ${result.fuzz} malformed-input attempts`);
}

/* =====================================================================
   3. RENDER — app.js ko sach mein BOOT karke har level ka intro render karo.
   Yeh woh galtiyan pakadta hai jo structure check nahi pakad sakta:
   toota hua template literal, gayab field jo HTML mein `undefined` ban jaata
   hai, ya koi reference error jo sirf render ke waqt aata hai.
   ===================================================================== */
function render() {
  console.log('\n🖼️  RENDER (app.js ko boot karke har level ka intro)');
  try { vm.runInContext(fs.readFileSync(path.join(DIR, 'app.js'), 'utf8'), sandbox, { filename: 'app.js' }); }
  catch (e) { fail(`app.js boot nahi hua: ${e.message}`); return; }
  ok();

  ['showHome', 'showTrack', 'showIntro', 'runStage', 'showCertificate'].forEach(fn => {
    const t = vm.runInContext(`typeof SD.ui.${fn}`, sandbox);
    if (t !== 'function') fail(`app.js mein ${fn}() nahi mila`); else ok();
  });

  let n = 0;
  allLevels.forEach(({ track, level: l }) => {
    try {
      vm.runInContext(`SD.ui.showIntro(SD.levelSets[${JSON.stringify(track.id)}].find(x => x.id === ${JSON.stringify(l.id)}))`, sandbox);
      n++;
      const app = sandbox.document._els['app'];
      const html = (app ? app.children : []).map(c => c._html || '').join(' ');
      /* HTML mein 'undefined' aana matlab kisi field ka naam galat hai */
      if (/undefined|\[object Object\]|\bNaN\b/.test(html)) fail(`${l.id}: intro HTML mein undefined/NaN aa gaya`);
      else ok();
    } catch (e) { fail(`${l.id}: intro render crash — ${e.message}`); }
  });
  console.log(`  ${n} level intro screens render hue`);

  /* gallery.html ka loop — har visual ka t aur html hona chahiye */
  Object.keys(VISUALS).forEach(k => {
    if (!VISUALS[k].t || !VISUALS[k].html) fail(`VISUALS['${k}']: 't' ya 'html' missing (gallery.html tootegi)`);
    else ok();
  });
}

/* =====================================================================
   4. LABS — naye interactive labs ko SACH MEIN render karke prove karo ki
      (a) woh crash nahi karte, (b) jeete ja SAKTE hain, aur (c) shuru mein
      hi jeete hue nahi hain. Yeh woh galtiyan pakadta hai jo aankh se
      lagbhag nahi dikhtin: aisa tradeoff jiska koi combination check() ko
      true nahi karta, ya aisa replay jo sahi jawab par bhi khatam nahi hota.
   ===================================================================== */
function findAll(node, out) {
  out = out || [];
  (node.children || []).forEach(c => { out.push(c); findAll(c, out); });
  return out;
}
function byClass(root, cls) {
  return findAll(root).filter(n => String(n.className || '').split(' ').indexOf(cls) > -1);
}
/* Buttons ko CLASS se pakdo, TEXT se kabhi nahi — content ka text button ke
   text se match kar sakta hai (ek frame ka "Player count" ne "Play" match kar
   liya tha aur walk wahin atak gaya). */
function one(root, cls) { return byClass(root, cls)[0]; }

function labs() {
  console.log('\n🎛️  LABS (har lab ko render karke solvability prove karo)');

  labStages.forEach(({ at, st }) => {
    const renderer = SD.renderers[st.type];
    if (!renderer) return fail(`${at}: renderer '${st.type}' labs.js mein nahi hai`);

    /* ---------- TRADEOFF: poora knob sweep ---------- */
    if (st.type === 'tradeoff') {
      const knobs = st.knobs || [];
      const vals = knobs.map(k => {
        const a = [], step = k.step || 1;
        for (let v = k.min; v <= k.max + 1e-9; v += step) a.push(+v.toFixed(6));
        return a;
      });
      const total = vals.reduce((a, v) => a * v.length, 1);
      if (total > 400000) {
        warn(`${at}: ${total} knob combinations — sweep bahut bada, skip kiya`);
      } else {
        let solvable = 0, crash = null, mismatch = null;
        const cur = {};
        const walk = i => {
          if (i === knobs.length) {
            try {
              const won = !!st.check(cur);
              if (SD.tradeoffStatus(st, cur).ok) solvable++;
              /* verdict ki line aur check() ek hi baat bolein — warna player "✅ sahi" padhta hai
                 par level aage nahi badhta (ya ❌ padhta hai aur level poora ho jaata hai) */
              if (!mismatch && st.verdict && !!st.verdict(cur).ok !== won) mismatch = { won, at: JSON.stringify(cur) };
            } catch (e) { crash = crash || e.message; }
            return;
          }
          for (const v of vals[i]) { cur[knobs[i].id] = v; walk(i + 1); }
        };
        walk(0);
        if (crash) fail(`${at}: check() crash — ${crash}`);
        if (mismatch) fail(`${at}: verdict aur check() alag bolte hain — ${mismatch.at} par check() = ${mismatch.won}, verdict.ok = ${!mismatch.won}`);
        else ok();
        if (!solvable) fail(`${at}: UNSOLVABLE — ${total} knob combinations mein se ek bhi check() ko true nahi karta`);
        else ok();

        const start = {};
        knobs.forEach(k => { start[k.id] = k.value; });
        let pre = false;
        try { pre = SD.tradeoffStatus(st, start).ok; } catch (e) { fail(`${at}: goal starting values par crash — ${e.message}`); }
        if (pre) fail(`${at}: goal SHURU MEIN HI poora hai — player ko knob chhoona hi nahi padega`);
        else ok();

        try { st.readouts(start); st.bars(start); st.verdict(start); ok(); }
        catch (e) { fail(`${at}: readouts/bars/verdict starting values par crash — ${e.message}`); }
      }
    }

    /* ---------- render + walk to completion ---------- */
    const arena = makeEl('div');
    let done = null;
    try { renderer(st, arena, r => { done = r; }); }
    catch (e) { return fail(`${at}: render crash — ${e.message}`); }
    ok();

    if (st.type === 'replay') {
      const asks = (st.frames || []).filter(f => f.ask);
      let ai = 0;
      for (let guard = 0; guard < (st.frames || []).length * 4 + 20 && !done; guard++) {
        const opts = byClass(arena, 'rp-opt');
        if (opts.length && ai < asks.length) {
          const want = asks[ai].ask.answer;
          const right = opts.find(b => String(b.dataset.i) === String(want));
          if (!right) { fail(`${at}: ask[${ai}] ka sahi option render hi nahi hua`); break; }
          right.click();                                        /* sahi jawab */
          ai++;
          const go = one(arena, 'rp-go');
          if (go) go.click();
        } else {
          const nxt = one(arena, 'rp-play') || one(arena, 'rp-done');
          if (!nxt) break;
          nxt.click();
        }
      }
      if (!done) fail(`${at}: SOFTLOCK — har sawaal ka sahi jawab dene par bhi replay poora nahi hua`);
      else if (asks.length && done.firstTry !== done.total)
        fail(`${at}: sab sahi jawab diye par firstTry ${done.firstTry}/${done.total} aaya`);
      else ok();
    }

    if (st.type === 'dryrun' || st.type === 'cards') {
      const steps = st.steps || [];
      for (let i = 0, guard = 0; guard < steps.length * 3 + 5 && !done; guard++) {
        const cur = steps[Math.min(i, steps.length - 1)];
        const opts = byClass(arena, 'dr-opt');
        if (cur.ask && opts.length) {
          const right = opts.filter(b => String(b.dataset.i) === String(cur.ask.answer))[0];
          if (!right) { fail(`${at}: step[${i}] ka sahi option render nahi hua`); break; }
          right.click();                                        /* sahi jawab */
        }
        const endBtn = one(arena, 'dr-done');
        if (endBtn) { endBtn.click(); break; }
        const nx = one(arena, 'dr-next');
        if (!nx) break;
        if (nx.disabled) { fail(`${at}: step[${i}] par sahi jawab ke baad bhi 'Agla' disabled — SOFTLOCK`); break; }
        nx.click();
        i++;
      }
      const asks = steps.filter(x => x.ask).length;
      if (!done) fail(`${at}: SOFTLOCK — dry run end tak nahi pahuncha`);
      else if (done.firstTry !== asks || done.total !== asks) fail(`${at}: sab sahi jawab diye par score ${done.firstTry}/${done.total} (asks ${asks})`);
      else ok();
    }

    if (st.type === 'docker') {
      byClass(arena, 'dk-tick').forEach(b => b.click());
      const opts = byClass(arena, 'dk-opt');
      const right = opts.filter(b => String(b.dataset.i) === String(st.observe.answer))[0];
      if (!right) fail(`${at}: saare steps tick karne par bhi observe sawaal ka sahi option nahi mila`);
      else {
        right.click();
        const d = one(arena, 'dk-done');
        if (d) d.click();
        if (!done) fail(`${at}: SOFTLOCK — docker lab poora nahi hua`);
        else if (done.firstTry !== 1) fail(`${at}: sahi jawab par firstTry ${done.firstTry}`);
        else ok();
      }
    }

    if (st.type === 'archdiff') {
      const flawIds = (st.flaws || []).map(f => f.id);
      byClass(arena, 'ad-node').forEach(c => {
        const action = one(c, flawIds.includes(c.dataset.id) ? 'ad-flaw-btn' : 'ad-safe-btn');
        if (action) action.click();
      });
      const fin = one(arena, 'ad-done');
      if (fin) fin.click();
      if (!done) fail(`${at}: SOFTLOCK — saari flaws par click karne par bhi lab poora nahi hua`);
      else if (done.firstTry !== done.total)
        fail(`${at}: sirf flaws par click kiya par firstTry ${done.firstTry}/${done.total} aaya`);
      else ok();
    }

    if (st.type === 'estimate') {
      const probs = st.problems || [];
      for (let i = 0; i < probs.length + 2 && !done; i++) {
        const inp = byClass(arena, 'es-input')[0];
        const go = one(arena, 'es-go');
        if (inp && go) { inp.value = String(probs[Math.min(i, probs.length - 1)].answer); go.click(); }
        const nxt = one(arena, 'es-next');
        if (nxt) nxt.click();
      }
      if (!done) fail(`${at}: SOFTLOCK — har sawaal ka THEEK jawab dene par bhi lab poora nahi hua`);
      else if (done.firstTry !== done.total)
        fail(`${at}: exact answers diye par firstTry ${done.firstTry}/${done.total} aaya — tol bahut sakht hai`);
      else ok();
    }

    if (st.type === 'tradeoff') {
      /* tradeoff DOM se solve nahi hota (slider events), solvability upar sweep se prove hui.
         Yahan sirf yeh dekho ki render ne kuch banaya bhi hai. */
      if (!findAll(arena).length) fail(`${at}: render ne kuch banaya hi nahi`); else ok();
    }
  });

  console.log(`  ${labStages.length} labs render hue aur solvability prove hui`);
}

/* =====================================================================
   5. DOCKER LABS — har project mein package.json, docker-compose.yml,
      README.md, Dockerfile aur launcher hona chahiye.
   ===================================================================== */
function dockerLabs() {
  console.log('\n🐳 DOCKER LABS (project files)');
  const root = path.join(DIR, 'docker-labs');
  if (!fs.existsSync(root)) return warn('docker-labs/ folder abhi nahi hai');
  const used = new Set(labStages.filter(x => x.st.type === 'docker').map(x => x.st.project));
  fs.readdirSync(root).filter(d => fs.statSync(path.join(root, d)).isDirectory()).forEach(d => {
    const p = path.join(root, d);
    ['package.json', 'docker-compose.yml', 'README.md', 'Dockerfile', 'start.js'].forEach(f => {
      if (!fs.existsSync(path.join(p, f))) fail(`docker-labs/${d}: ${f} missing`); else ok();
    });
    if (!used.has(d)) warn(`docker-labs/${d}: kisi level ka docker stage isse use nahi karta`);
  });
  console.log(`  ${used.size} projects levels se jude hain`);
}

/* =====================================================================
   RUN
   ===================================================================== */
if (!ONLY) structure();
missions();
if (!ONLY) labs();
if (!ONLY) render();
if (!ONLY) dockerLabs();

const stageCount = allLevels.reduce((a, x) => a + allStages(x.level).length, 0);
const cardCount = allLevels.reduce((a, x) => a + (x.level.cards || []).length, 0);
const ivCount = allLevels.reduce((a, x) => a + ((x.level.interview && x.level.interview.questions) || []).length, 0);
console.log(`\n📊 ${SD.tracks.length} tracks · ${allLevels.length} levels · ${stageCount} stages · ` +
  `${ivCount} interview Qs · ${cardCount} flashcards · ${Object.keys(VISUALS).length} diagrams · ` +
  `${labStages.length} interactive labs`);
SD.tracks.forEach(t => console.log(`   ${t.icon} ${t.id.padEnd(6)} ${(SD.levelSets[t.id] || []).map(l => l.id).join(' → ')}`));

if (errors) { console.log(`\n❌ ${errors} error · ${warns} warning · ${checks} checks pass\n`); process.exit(1); }
console.log(`\n✅ Koi problem nahi. ${checks} checks pass${warns ? ` · ${warns} warning` : ''}.\n`);
