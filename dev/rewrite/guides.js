#!/usr/bin/env node
'use strict';
/* Rewrite the decision guides (data-guidance.js) as short end-of-level recaps (dev/REVIEW.md, decision 2).

     node dev/rewrite/guides.js new.json [--dry]

   new.json maps a topic id to its new body:
     { title, misaal, asli, points: [2–4 strings], use, avoid, mistake,
       compare: [2–3 × { choice, when, tradeoff }], followup, sources: ['key', …] }
   Topics missing from new.json keep their current body; the level lists never change.
   The six Concurrency guides live in data-v2-concurrency.js as guide('cc-…', {…}, [keys]);
   address them as 'concurrency-cc-…', with keys from that file's `docs`.
   Checks: every field present and short, Latin script, no pronoun stand-ins, no clipped
   English, known source keys. Then the file must parse and the app must reload; on any
   failure the old file is put back. --dry only checks. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const STAND_IN = require('./standin-re');
const { clipped } = require('./scan');

const ROOT = path.resolve(__dirname, '..', '..');
const [patchFile, flag] = process.argv.slice(2);
if (!patchFile) { console.error('usage: node dev/rewrite/guides.js new.json [--dry]'); process.exit(1); }
const bodies = JSON.parse(fs.readFileSync(patchFile, 'utf8'));

const NON_LATIN = /[Ѐ-ӿऀ-ॿ؀-ۿ]/;
/* ADHD rule: a recap is read in one breath. Limits are visible characters, tags excluded. */
const LIMIT = { title: 70, misaal: 240, asli: 110, point: 120, use: 130, avoid: 130, mistake: 130, followup: 140, cell: 100 };
const FILES = [
  { name: 'data-guidance.js', keys: /^ {4}(\w+): \{ title:/gm,
    block: /^ {2}add\('([\w-]+)', '([^']*)', \{\n[\s\S]*?\n {2}\}\);\n/gm, id: m => m[1],
    wrap: (m, fields, keys) => `  add('${m[1]}', '${m[2]}', {\n${fields}    sources: [${keys}],\n  });\n` },
  { name: 'data-v2-concurrency.js', keys: /^ {4}(\w+): 'https:/gm,
    block: /^ {2}guide\('([\w-]+)', \{\n[\s\S]*?\n {2}\}, \[[^\]]*\]\);\n/gm, id: m => 'concurrency-' + m[1],
    wrap: (m, fields, keys) => `  guide('${m[1]}', {\n${fields}  }, [${keys}]);\n` },
];
const blocks = new Map();
FILES.forEach(f => {
  f.path = path.join(ROOT, f.name);
  f.src = f.text = fs.readFileSync(f.path, 'utf8');
  f.sourceKeys = new Set([...f.src.matchAll(f.keys)].map(m => m[1]));
  [...f.src.matchAll(f.block)].forEach(m => blocks.set(f.id(m), { file: f, m }));
});
const problems = [];

const q = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const visible = s => String(s).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '&');

function checkText(where, s, limit) {
  if (typeof s !== 'string' || !s.trim()) return problems.push(`${where}: khaali`);
  const v = visible(s);
  if (v.length > limit) problems.push(`${where}: ${v.length} akshar, hadd ${limit}`);
  if (NON_LATIN.test(s)) problems.push(`${where}: non-Latin akshar`);
  const m = v.match(STAND_IN);
  if (m) problems.push(`${where}: stand-in "${m[0]}" — noun ka naam lo`);
  if (clipped(v)) problems.push(`${where}: clipped English lagta hai — "${v.slice(0, 70)}"`);
}

function check(id, g) {
  if (!blocks.has(id)) return problems.push(`${id}: data-guidance.js mein yeh topic nahi`);
  ['title', 'misaal', 'asli', 'use', 'avoid', 'mistake', 'followup'].forEach(k => checkText(`${id}.${k}`, g[k], LIMIT[k]));
  if (!Array.isArray(g.points) || g.points.length < 2 || g.points.length > 4) problems.push(`${id}.points: 2–4 chahiye`);
  else g.points.forEach((p, i) => checkText(`${id}.points[${i}]`, p, LIMIT.point));
  if (!Array.isArray(g.compare) || g.compare.length < 2 || g.compare.length > 3) problems.push(`${id}.compare: 2–3 rows chahiye`);
  else g.compare.forEach((r, i) => ['choice', 'when', 'tradeoff'].forEach(k => checkText(`${id}.compare[${i}].${k}`, r[k], LIMIT.cell)));
  if (!Array.isArray(g.sources) || !g.sources.length) problems.push(`${id}.sources: kam se kam ek`);
  else g.sources.filter(k => !blocks.get(id).file.sourceKeys.has(k)).forEach(k => problems.push(`${id}.sources: "${k}" ${blocks.get(id).file.name} ki sources list mein nahi`));
}

function body({ file, m }, g) {
  const rows = g.compare.map(r => `      { choice: ${q(r.choice)}, when: ${q(r.when)}, tradeoff: ${q(r.tradeoff)} },`);
  return file.wrap(m, `    title: ${q(g.title)},\n`
    + `    misaal: ${q(g.misaal)},\n`
    + `    asli: ${q(g.asli)},\n`
    + `    points: [\n${g.points.map(p => `      ${q(p)},`).join('\n')}\n    ],\n`
    + `    use: ${q(g.use)},\n`
    + `    avoid: ${q(g.avoid)},\n`
    + `    mistake: ${q(g.mistake)},\n`
    + `    compare: [\n${rows.join('\n')}\n    ],\n`
    + `    followup: ${q(g.followup)},\n`, g.sources.map(q).join(', '));
}

Object.entries(bodies).forEach(([id, g]) => check(id, g));
if (problems.length) { console.error(problems.map(p => '✗ ' + p).join('\n')); process.exit(1); }

Object.entries(bodies).forEach(([id, g]) => { const b = blocks.get(id); b.file.text = b.file.text.replace(b.m[0], () => body(b, g)); });
const left = [...blocks.keys()].filter(id => !bodies[id] && !/\n {4}misaal: /.test(blocks.get(id).m[0]));
if (flag === '--dry') {
  console.log(`dry run ok: ${Object.keys(bodies).length} guides; purane format mein baaki: ${left.length}`);
  process.exit(0);
}

const changed = FILES.filter(f => f.text !== f.src);
changed.forEach(f => fs.writeFileSync(f.path, f.text));
try {
  changed.forEach(f => execFileSync(process.execPath, ['--check', f.path], { stdio: 'pipe' }));
  execFileSync(process.execPath, ['-e', `const a = require(${JSON.stringify(path.join(ROOT, 'dev/load-app.js'))}).loadApp();
    if (a.issues.length) { console.error(a.issues.join('\\n')); process.exit(1); }`], { stdio: 'pipe' });
} catch (e) {
  changed.forEach(f => fs.writeFileSync(f.path, f.src));
  console.error('✗ reload fail, purani files wapas rakhi:\n' + String(e.stderr || e.message));
  process.exit(1);
}
console.log(`written: ${Object.keys(bodies).length} guides; purane format mein baaki: ${left.length}`);
