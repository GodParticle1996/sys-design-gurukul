#!/usr/bin/env node
'use strict';
/* Rewrite the short labels of incident decisions and design options (dev/REVIEW.md, decision 1).

     node dev/rewrite/labels.js patch.json [--dry]

   patch.json is a list of {level, path, labels: [...]}. path points at an incident node
   (choices: [{t, good, …}]) or a design slot (options: [{label, score, …}]); labels replace t / label
   in order, same count. apply.js handles the string-choice questions; this file handles these two.
   Same safety net as apply.js: the good (or best-score) option must not stand out by length, no pronoun
   stand-ins, no non-Latin script; then node --check and a reload check, files restored on any failure. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const { loadApp } = require('../load-app');
const { lengthBias, text: visible } = require('../../tools/quiz-quality');

const NON_LATIN = /[Ѐ-ӿऀ-ॿ؀-ۿ]/;
const STAND_IN = require('./standin-re');
const [patchFile, flag] = process.argv.slice(2);
if (!patchFile) { console.error('usage: node dev/rewrite/labels.js patch.json [--dry]'); process.exit(1); }
const patches = JSON.parse(fs.readFileSync(patchFile, 'utf8'));

const app = loadApp();
const levels = new Map(app.levels.map(({ level }) => [level.id, level]));
const src = new Map(app.files.filter(f => /^data-/.test(f)).map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
const at = (obj, p) => p.split(/\.|\[|\]/).filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), obj);
const single = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";

/* The labels of an incident node or a design slot, and which of them count as "right". */
function slot(o) {
  if (o && Array.isArray(o.choices) && o.choices.every(c => c && typeof c === 'object')) return { list: o.choices, key: 't', good: o.choices.map(c => !!c.good) };
  if (o && Array.isArray(o.options) && o.options.some(c => typeof c.score === 'number')) {
    const best = Math.max(...o.options.map(c => c.score));
    return { list: o.options, key: 'label', good: o.options.map(c => c.score === best) };
  }
  return null;
}

/* Where an incident node's / design slot's labels sit in the ORIGINAL source: every old label as a `key: '…'`
   literal, in order, inside one short window. A node is found by its whole label sequence, so a label that
   repeats elsewhere (even in the same level) cannot pull the edit to the wrong node. */
const orig = new Map(src);
function findNode(key, olds) {
  const forms = s => [JSON.stringify(s), single(s)].map(q => ({ needle: `${key}: ${q}`, q }));
  const found = [];
  for (const [f, t] of orig) for (const first of forms(olds[0])) {
    for (let k = t.indexOf(first.needle); k > -1; k = t.indexOf(first.needle, k + 1)) {
      const spans = [{ k, ...first }];
      let at = k + first.needle.length, ok = true;
      for (const o of olds.slice(1)) {
        const next = forms(o).map(x => ({ ...x, k: t.indexOf(x.needle, at) })).filter(x => x.k > -1 && x.k - at < 4000).sort((a, b) => a.k - b.k)[0];
        if (!next) { ok = false; break; }
        spans.push(next); at = next.k + next.needle.length;
      }
      if (ok) found.push({ f, spans });
    }
  }
  return found;
}

const problems = [];
const touched = new Set();
const edits = new Map();                       // file → [{k, len, text}] against the original source
for (const p of patches) {
  const where = `${p.level} ${p.path}`;
  const s = slot(at(levels.get(p.level), p.path));
  if (!s) { problems.push(`${where}: incident node ya design slot nahi mila`); continue; }
  if (!Array.isArray(p.labels) || p.labels.length !== s.list.length) { problems.push(`${where}: ${s.list.length} labels chahiye`); continue; }
  p.labels.forEach(x => {
    if (NON_LATIN.test(x)) problems.push(`${where}: non-Latin akshar: ${x}`);
    else if (STAND_IN.test(visible(x))) problems.push(`${where}: pronoun stand-in "${visible(x).match(STAND_IN)[0]}" — naam dobara likho: ${x}`);
  });
  const wrong = p.labels.filter((_, i) => !s.good[i]);
  p.labels.filter((_, i) => s.good[i]).forEach(g => {
    const bias = wrong.length && lengthBias([g, ...wrong], 0);
    if (bias) problems.push(`${where}: length hint — sahi option sabse ${bias === 'long' ? 'lamba' : 'chhota'} hai (${[g, ...wrong].map(x => [...visible(x)].length).join('/')})`);
  });
  const nodes = findNode(s.key, s.list.map(c => c[s.key]));
  if (nodes.length !== 1) { problems.push(`${where}: labels ka kram source mein ${nodes.length} jagah mila — node pakka nahi`); continue; }
  const { f, spans } = nodes[0];
  spans.forEach((sp, i) => {
    if (s.list[i][s.key] === p.labels[i]) return;
    const lit = sp.q.startsWith('"') ? JSON.stringify(p.labels[i]) : single(p.labels[i]);
    if (!edits.has(f)) edits.set(f, []);
    edits.get(f).push({ k: sp.k, len: sp.needle.length, text: `${s.key}: ${lit}` });
  });
}
// Apply against the original text from the end backwards, so no edit shifts or re-targets another.
for (const [f, list] of edits) {
  list.sort((a, b) => b.k - a.k);
  list.forEach((e, i) => { if (i && e.k + e.len > list[i - 1].k) problems.push(`${f}: do labels ki jagah overlap karti hai`); });
  let t = orig.get(f);
  list.forEach(e => { t = t.slice(0, e.k) + e.text + t.slice(e.k + e.len); });
  src.set(f, t);
  touched.add(f);
}
if (problems.length) { problems.forEach(x => console.log('✗ ' + x)); process.exit(1); }
if (flag === '--dry') { console.log(`dry run ok: ${patches.length} items, files: ${[...touched].join(' ')}`); process.exit(0); }

const backup = new Map([...touched].map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
touched.forEach(f => fs.writeFileSync(path.join(ROOT, f), src.get(f)));
const check = `const { loadApp } = require(${JSON.stringify(path.join(ROOT, 'dev/load-app.js'))});
const L = new Map(loadApp().levels.map(({ level }) => [level.id, level]));
const at = (o, p) => p.split(/\\.|\\[|\\]/).filter(Boolean).reduce((x, k) => (x == null ? x : x[k]), o);
const bad = []; for (const p of ${JSON.stringify(patches)}) { const o = at(L.get(p.level), p.path);
  const got = o && (o.choices || o.options || []).map(c => c.t || c.label);
  if (JSON.stringify(got) !== JSON.stringify(p.labels)) bad.push(p.level + ' ' + p.path); }
if (bad.length) { console.log(bad.join('\\n')); process.exit(1); }`;
try {
  touched.forEach(f => execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' }));
  execFileSync(process.execPath, ['-e', check], { cwd: ROOT, stdio: 'pipe' });
} catch (e) {
  backup.forEach((t, f) => fs.writeFileSync(path.join(ROOT, f), t));
  console.log('✗ reload check failed, files restored:\n' + String(e.stdout || '') + String(e.stderr || '') + (e.stdout || e.stderr ? '' : e.message));
  process.exit(1);
}
console.log(`✓ ${patches.length} items applied and verified · ${[...touched].join(' ')}`);
