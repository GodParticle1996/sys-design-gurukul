#!/usr/bin/env node
'use strict';
/* Review sheet for the Phase 3 language rewrite (dev/REVIEW.md, decision 1).

     node dev/rewrite/sheet.js <levelId> [levelId…] [--old DIR]

   Prints every multiple-choice item of the given levels with what a rewrite needs:
   the step text before a dry-run question (to keep names after the lesson),
   the current options/explanation/reasons (they carry the 2026-10-23 audit's fact fixes),
   and the pre-audit options (natural wording) when --old points at an extracted copy of
   commit ce2f297 that has dev/load-app.js in it:
     git archive ce2f297 | tar -x -C /tmp/old && mkdir -p /tmp/old/dev && cp dev/load-app.js /tmp/old/dev/ */
const path = require('path');
const { loadApp } = require('../load-app');

const args = process.argv.slice(2);
const oldAt = args.indexOf('--old');
const oldDir = oldAt > -1 ? args.splice(oldAt, 2)[1] : null;
const ids = args;
if (!ids.length) { console.error('usage: node dev/rewrite/sheet.js <levelId>… [--old DIR]'); process.exit(1); }

const strip = s => String(s == null ? '' : s).replace(/<br\s*\/?>/gi, ' / ').replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const levelsOf = app => new Map(app.levels.map(({ track, level }) => [level.id, { track, level }]));
const now = levelsOf(loadApp());
const old = oldDir ? levelsOf(require(path.resolve(oldDir, 'dev/load-app.js')).loadApp()) : new Map();

function at(obj, p) { return p.split(/\.|\[|\]/).filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), obj); }

/* Every object with string choices + an answer index, plus incident choices and design options. */
function items(level) {
  const out = [];
  function walk(o, p, ctx) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach((v, i) => walk(v, `${p}[${i}]`, ctx)); return; }
    if (Array.isArray(o.choices) && Number.isInteger(o.answer) && o.choices.every(c => typeof c === 'string')) out.push({ kind: 'mcq', path: p, o, ctx });
    else if (Array.isArray(o.choices) && o.choices.some(c => c && typeof c === 'object' && 'good' in c)) out.push({ kind: 'incident', path: p, o, ctx });
    else if (Array.isArray(o.options) && o.options.some(c => c && typeof c.score === 'number')) out.push({ kind: 'design', path: p, o, ctx });
    Object.entries(o).forEach(([k, v]) => { if (k !== 'choices' && k !== 'options' && v && typeof v === 'object') walk(v, p ? `${p}.${k}` : k, k === 'steps' ? ctx : ctx); });
  }
  (level.stages || []).forEach((st, i) => {
    if (st.type === 'dryrun' || st.type === 'cards') (st.steps || []).forEach((step, j) => {
      if (step.ask) out.push({ kind: 'mcq', path: `stages[${i}].steps[${j}].ask`, o: step.ask, ctx: { stage: st, step } });
    });
    else walk(st, `stages[${i}]`, { stage: st });
  });
  if (level.interview) walk(level.interview, 'interview', { stage: { type: 'interview', title: 'Interview' } });
  return out;
}

for (const id of ids) {
  const cur = now.get(id);
  if (!cur) { console.log(`== ${id}: level nahi mila`); continue; }
  const { track, level } = cur;
  const prev = old.get(id);
  console.log(`\n== ${id} (${track.id}) — ${strip(level.title)}`);
  console.log(`OBJECTIVES: ${(level.objectives || []).map(strip).join(' | ')}`);
  items(level).forEach((it, n) => {
    const o = it.o, was = prev ? at(prev.level, it.path) : null;
    const st = it.ctx.stage || {};
    console.log(`\n[${n + 1}] ${it.path}   (${st.type}${st.title ? ': ' + strip(st.title) : ''})`);
    if (it.ctx.step) console.log(`  SAY: ${strip(it.ctx.step.say).slice(0, 320)}`);
    if (it.kind === 'mcq') {
      console.log(`  Q: ${strip(o.q)}   ANSWER: ${o.answer}${o.hint ? '   HINT: ' + strip(o.hint) : ''}`);
      if (was && Array.isArray(was.choices)) console.log(`  OLD: ${was.choices.map((c, i) => `${i}${i === was.answer ? '✔' : ''} ${strip(c)}`).join('  |  ')}`);
      console.log(`  NOW: ${o.choices.map((c, i) => `${i}${i === o.answer ? '✔' : ''} ${strip(c)}`).join('  |  ')}`);
      console.log(`  EXPLAIN: ${strip(o.explain)}`);
      if (was && was.explain && strip(was.explain) !== strip(o.explain)) console.log(`  OLD EXPLAIN: ${strip(was.explain)}`);
      (o.choiceExplanations || []).forEach((r, i) => { if (i !== o.answer) console.log(`  WHY-NOT ${i}: ${strip(r)}`); });
    } else if (it.kind === 'incident') {
      console.log(`  NODE: ${strip(o.text)}`);
      o.choices.forEach((c, i) => console.log(`  ${i}${c.good ? '✔' : ' '} ${strip(c.t)}  →  ${strip(c.explain)}`));
    } else {
      console.log(`  SLOT: ${strip(o.label)}`);
      o.options.forEach(op => console.log(`  [${op.score}] ${op.id}: ${strip(op.label)}  →  ${strip(op.why)}`));
    }
  });
}
