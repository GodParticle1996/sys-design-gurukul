#!/usr/bin/env node
'use strict';
/* Apply a Phase 3 language patch (dev/REVIEW.md, decision 1) to the data files.

     node dev/rewrite/apply.js patch.json [--dry]

   patch.json: [{ level, path, choices?, choiceExplanations?, explain?, q?, hint? }]
     a reason written as '=explain' is replaced by the (new or current) explanation, HTML included
     path   — object inside the level, as dev/rewrite/sheet.js prints it (stages[0].steps[2].ask, interview.questions[1] …)
   The answer index and the number of options never change (exercise fixtures use the original indexes).
   Every new text is checked before anything is written; after writing, a fresh process reloads the app and
   compares every patched field. Any failure restores the original files. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const { loadApp } = require('../load-app');
const { lengthBias, text: visible } = require('../../tools/quiz-quality');

const [patchFile, flag] = process.argv.slice(2);
if (!patchFile) { console.error('usage: node dev/rewrite/apply.js patch.json [--dry]'); process.exit(1); }
const patches = JSON.parse(fs.readFileSync(patchFile, 'utf8'));

const NON_LATIN = /[Ѐ-ӿऀ-ॿ؀-ۿ]/;
/* ADHD writing rule (labs.js header): name the thing again instead of pointing back with a pronoun. */
const STAND_IN = /\b(woh|yeh|isse|usse|uska|uski|uske|iska|iski|iske|wahan|unhe|inhe|unka|unki|unke|unko|inko)\b/i;
const app = loadApp();
const levels = new Map(app.levels.map(({ level }) => [level.id, level]));
const dataFiles = app.files.filter(f => /^data-/.test(f));
const src = new Map(dataFiles.map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
const at = (obj, p) => p.split(/\.|\[|\]/).filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), obj);
const problems = [];

const single = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const literal = (s, jsonKeys) => jsonKeys ? JSON.stringify(s) : single(s);

/* Find exactly one `key: <current value>` in the data files, in any of the quote styles the files use. */
function locate(key, value, only) {                       // only = [file, text]: search that (already edited) text
  const forms = [];
  const vals = Array.isArray(value) ? [JSON.stringify(value)] : [JSON.stringify(value), single(value), '`' + value + '`'];
  for (const v of vals) { forms.push({ needle: `${key}: ${v}`, jsonKeys: false }); forms.push({ needle: `"${key}": ${v}`, jsonKeys: true }); }
  const hits = [];
  for (const [file, text] of only ? [only] : src) for (const f of forms) {
    let i = text.indexOf(f.needle);
    while (i > -1) { hits.push({ file, index: i, ...f }); i = text.indexOf(f.needle, i + 1); }
  }
  return hits;
}
/* An array value in either form: one JSON line (as the audit left it) or one literal per line (as arrayText writes
   it). The second form is what a second review round has to patch. */
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function findArray(text, key, arr) {
  const hits = [];
  for (const jsonKeys of [false, true]) {
    const k = jsonKeys ? `"${key}"` : key;
    const oneLine = `${k}: ${JSON.stringify(arr)}`;
    for (let i = text.indexOf(oneLine); i > -1; i = text.indexOf(oneLine, i + 1)) hits.push({ index: i, length: oneLine.length, jsonKeys, oneLine: true });
    const items = arr.map(v => `(?:${reEsc(JSON.stringify(v))}|${reEsc(single(v))})`).join('\\s*,\\s*');
    const re = new RegExp(`${reEsc(k)}: \\[\\s*${items}\\s*,?\\s*\\]`, 'g');
    for (let m = re.exec(text); m; m = re.exec(text)) if (!hits.some(h => h.index === m.index)) hits.push({ index: m.index, length: m[0].length, jsonKeys, oneLine: false });
  }
  return hits;
}
/* Some data files build an MCQ with a helper — ask(q, choices, reasons, hint), where explain is reasons[0]
   (data-v2-concurrency.js). Find that call by its current question and rewrite the whole call. */
function closeParen(text, open) {                          // index of the ')' that closes text[open] === '('
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') { for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c) && --depth === 0) return c === ')' ? i : -1;
  }
  return -1;
}
function findAsk(text, q) {
  const hits = [];
  for (let i = text.indexOf('ask('); i > -1; i = text.indexOf('ask(', i + 1)) {
    if (/[\w$.]/.test(text[i - 1] || '')) continue;      // not task( or x.ask(
    const end = closeParen(text, i + 3);
    if (end < 0) continue;
    let args; try { args = vm.runInNewContext('[' + text.slice(i + 4, end) + ']'); } catch (e) { continue; }   // the definition itself fails here
    if (args[0] === q) hits.push({ index: i, length: end + 1 - i, args });
  }
  return hits;
}
function askText(q, choices, reasons, hint, indent) {
  const list = arr => `[\n${arr.map(s => `${indent}    ${JSON.stringify(s)},`).join('\n')}\n${indent}  ]`;
  return `ask(${JSON.stringify(q)},\n${indent}  ${list(choices)},\n${indent}  ${list(reasons)}` +
    (hint != null ? `,\n${indent}  ${JSON.stringify(hint)})` : ')');
}
const lineIndent = (text, i) => { const start = text.lastIndexOf('\n', i - 1) + 1; return text.slice(start).match(/^[ \t]*/)[0]; };

function arrayText(key, arr, jsonKeys, indent) {
  const k = jsonKeys ? `"${key}"` : key;
  return `${k}: [\n${arr.map(s => `${indent}  ${literal(s, jsonKeys)},`).join('\n')}\n${indent}]`;
}

const plan = [];
for (const p of patches) {
  const where = `${p.level} ${p.path}`;
  const level = levels.get(p.level);
  const obj = level && at(level, p.path);
  if (!obj) { problems.push(`${where}: object nahi mila`); continue; }
  if (!Array.isArray(obj.choices)) { problems.push(`${where}: yahan MCQ nahi hai (choices nahi mile) — path dobara dekho`); continue; }
  /* '=explain' in a reason list means "the explanation itself", exact HTML included */
  if (p.choiceExplanations) p.choiceExplanations = p.choiceExplanations.map(r => r === '=explain' ? (p.explain != null ? p.explain : obj.explain) : r);
  const choices = p.choices || obj.choices;
  if (p.choices && p.choices.length !== obj.choices.length) problems.push(`${where}: options ki ginti badli (${obj.choices.length} → ${p.choices.length})`);
  if (p.choiceExplanations && p.choiceExplanations.length !== choices.length) problems.push(`${where}: har option ka ek reason chahiye`);
  /* Yes/no giveaway: the right option alone says "Nahi" (or alone says "Haan") — learners pass on polarity alone. */
  if (p.choices) {
    const neg = s => /^(nahi|zaroori nahi|abhi nahi)\b/i.test(visible(s)), pos = s => /^haan\b/i.test(visible(s));
    const right = p.choices[obj.answer], wrong = p.choices.filter((_, i) => i !== obj.answer);
    if ((neg(right) && wrong.every(pos)) || (pos(right) && wrong.every(neg))) problems.push(`${where}: sirf sahi option "Nahi/Haan" se shuru hota hai — polarity se jawab mil jaata hai; prefix hatao ya mix karo`);
  }
  if (p.choices && lengthBias(p.choices.map(visible), obj.answer)) problems.push(`${where}: length hint — sahi option ${lengthBias(p.choices.map(visible), obj.answer) === 'long' ? 'sabse lamba' : 'sabse chhota'} hai (${p.choices.map(c => [...visible(c)].length).join('/')}, sahi #${obj.answer})`);
  for (const [k, v] of Object.entries(p)) {
    if (['level', 'path'].includes(k)) continue;
    for (const s of [].concat(v)) {
      if (typeof s !== 'string' || !s.trim()) problems.push(`${where}: ${k} khaali hai`);
      else if (NON_LATIN.test(s)) problems.push(`${where}: ${k} mein non-Latin akshar`);
      else if (STAND_IN.test(visible(s))) problems.push(`${where}: ${k} mein pronoun stand-in "${visible(s).match(STAND_IN)[0]}" — naam dobara likho: ${visible(s).slice(0, 80)}`);
    }
  }
  plan.push({ p, obj, where });
}
if (problems.length) { problems.forEach(x => console.log('✗ ' + x)); process.exit(1); }

const touched = new Set();
for (const { p, obj, where } of plan) {
  const anchor = [];
  for (const [f, t] of src) findArray(t, 'choices', obj.choices).forEach(h => anchor.push({ file: f, ...h }));
  if (anchor.length === 0) {
    const asks = [];
    for (const [f, t] of src) findAsk(t, obj.q).forEach(h => asks.push({ file: f, ...h }));
    if (asks.length === 1) {
      const { file, index, length, args } = asks[0];
      const reasons = p.choiceExplanations || args[2].slice();
      if (p.explain != null && !p.choiceExplanations) reasons[0] = p.explain;
      if (p.explain != null && reasons[0] !== p.explain) { problems.push(`${where}: ask() mein explain = reason 0 hona chahiye`); continue; }
      const text = src.get(file);
      src.set(file, text.slice(0, index) + askText(p.q != null ? p.q : args[0], p.choices || args[1], reasons,
        p.hint != null ? p.hint : args[3], lineIndent(text, index)) + text.slice(index + length));
      touched.add(file); continue;
    }
  }
  if (anchor.length !== 1) { problems.push(`${where}: choices source mein ${anchor.length} baar mile`); continue; }
  const { file, jsonKeys } = anchor[0];
  let text = src.get(file);
  const indent = lineIndent(text, anchor[0].index);
  for (const key of ['q', 'explain', 'hint']) {
    if (p[key] == null || p[key] === obj[key]) continue;
    const hits = locate(key, obj[key], [file, text]);     // positions in the text as edited so far, not the original
    if (hits.length !== 1) { problems.push(`${where}: ${key} source mein ${hits.length} baar mila — haath se badlo`); continue; }
    text = text.slice(0, hits[0].index) + (hits[0].jsonKeys ? `"${key}"` : key) + ': ' + literal(p[key], hits[0].jsonKeys) + text.slice(hits[0].index + hits[0].needle.length);
  }
  if (p.choices) {
    const [h] = findArray(text, 'choices', obj.choices);
    text = text.slice(0, h.index) + arrayText('choices', p.choices, jsonKeys, indent) + text.slice(h.index + h.length);
  }
  if (p.choiceExplanations && obj.choiceExplanations) {
    const found = findArray(text, 'choiceExplanations', obj.choiceExplanations);
    if (found.length !== 1) { problems.push(`${where}: choiceExplanations source mein ${found.length} baar mile`); continue; }
    if (!found[0].oneLine) {                               // already clean (an earlier round): swap the array in place
      const h = found[0];
      text = text.slice(0, h.index) + arrayText('choiceExplanations', p.choiceExplanations, jsonKeys, lineIndent(text, h.index)) + text.slice(h.index + h.length);
      src.set(file, text); touched.add(file); continue;
    }
    let i = found[0].index;
    const needle = text.slice(i, i + found[0].length);
    /* The audit glued this array on: either "\n   , choiceExplanations: […]" or "…] }," — rebuild the line properly. */
    const lineStart = text.lastIndexOf('\n', i - 1) + 1;
    const pre = text.slice(lineStart, i);
    let head = lineStart, prefix = indent;
    if (/^\s*,\s*$/.test(pre)) {
      const prevEnd = lineStart - 1;                       // the '\n' before this line
      if (!/,\s*$/.test(text.slice(0, prevEnd))) { text = text.slice(0, prevEnd) + ',' + text.slice(prevEnd); head++; i++; }
    } else if (!/^\s*$/.test(pre)) { head = i; prefix = ''; }
    let end = i + needle.length, tail = '';
    const after = text.slice(end).match(/^ \}(,?)/);
    if (after) { tail = `,\n${indent.slice(2)}}${after[1]}`; end += after[0].length; }
    text = text.slice(0, head) + prefix + arrayText('choiceExplanations', p.choiceExplanations, jsonKeys, indent) + tail + text.slice(end);
  }
  src.set(file, text);
  touched.add(file);
}
if (problems.length) { problems.forEach(x => console.log('✗ ' + x)); process.exit(1); }
if (flag === '--dry') { console.log(`dry run ok: ${plan.length} items, files: ${[...touched].join(' ')}`); process.exit(0); }

const backup = new Map([...touched].map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
touched.forEach(f => fs.writeFileSync(path.join(ROOT, f), src.get(f)));
const check = `const { loadApp } = require(${JSON.stringify(path.join(ROOT, 'dev/load-app.js'))});
const app = loadApp(); const L = new Map(app.levels.map(({ level }) => [level.id, level]));
const at = (o, p) => p.split(/\\.|\\[|\\]/).filter(Boolean).reduce((x, k) => (x == null ? x : x[k]), o);
const bad = []; for (const p of ${JSON.stringify(patches)}) { const o = at(L.get(p.level), p.path);
  for (const [k, v] of Object.entries(p)) if (!['level', 'path'].includes(k) && JSON.stringify(o && o[k]) !== JSON.stringify(v)) bad.push(p.level + ' ' + p.path + ' ' + k); }
if (bad.length) { console.log(bad.join('\\n')); process.exit(1); }`;
try {
  touched.forEach(f => execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' }));   // names the broken file and line
  execFileSync(process.execPath, ['-e', check], { cwd: ROOT, stdio: 'pipe' });
}
catch (e) {
  backup.forEach((t, f) => fs.writeFileSync(path.join(ROOT, f), t));
  console.log('✗ reload check failed, files restored:\n' + String(e.stdout || '') + String(e.stderr || '') + (e.stdout || e.stderr ? '' : e.message));
  process.exit(1);
}
console.log(`✓ ${plan.length} items applied and verified · ${[...touched].join(' ')}`);
