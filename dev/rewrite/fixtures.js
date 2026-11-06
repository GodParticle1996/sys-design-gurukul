#!/usr/bin/env node
'use strict';
/* Replay fixtures for new levels: node dev/rewrite/fixtures.js es-kyun es-kaise …
   Writes each level's intended actions into exercise-solutions.json (one record per line), replacing old records
   for those levels. Convention: dryrun/cards — per step, choose the authored answer if the step asks, then continue
   then one final dryrunDone; docker — optional step ticks, then the observation answer; bins — every item to
   its bin; interview — answer and continue per question. Other stage types are refused: write those by hand. */
const fs = require('fs');
const path = require('path');
const { loadApp } = require('../load-app');
const ids = process.argv.slice(2);
if (!ids.length) { console.error('usage: node dev/rewrite/fixtures.js <level id> …'); process.exit(1); }
const { levels } = loadApp();
const FILE = path.join(__dirname, '..', '..', 'exercise-solutions.json');
function stageSolution(s) {
  if (s.type === 'dryrun' || s.type === 'cards') {
    const out = [];
    s.steps.forEach((step, i) => {
      if (step.ask) out.push({ action: 'choose', step: i, option: step.ask.answer });
      out.push({ action: 'continue', control: 'dryrun' });
    });
    return [...out, { action: 'continue', control: 'dryrunDone' }];
  }
  if (s.type === 'docker') return [...s.steps.map((_, i) => ({ action: 'confirmStep', step: i, optional: true })),
    { action: 'choose', control: 'docker', option: s.observe.answer }, { action: 'continue', control: 'docker' }];
  if (s.type === 'bins') return s.items.map((it, i) => ({ action: 'bin', item: i, bin: it.bin }));
  throw new Error(`stage type ${s.type}: fixture haath se likho`);
}
const records = [];
for (const id of ids) {
  const found = levels.find(x => x.level.id === id);
  if (!found) throw new Error(`level ${id} nahi mila`);
  const L = found.level;
  L.stages.forEach((s, i) => records.push({ level: id, stage: i, type: s.type, solution: stageSolution(s) }));
  if (L.interview) records.push({ level: id, stage: 'interview', type: 'interview',
    solution: L.interview.questions.flatMap((q, i) => [{ action: 'choose', question: i, option: q.answer }, { action: 'continue', control: 'interview' }]) });
}
const json = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const keep = json.exercises.filter(e => !ids.includes(e.level));
const all = [...keep, ...records];
const head = JSON.stringify({ schema: json.schema, note: json.note }, null, 2).replace(/\n}$/, '');
fs.writeFileSync(FILE, `${head},\n  "exercises": [\n${all.map(e => '    ' + JSON.stringify(e)).join(',\n')}\n  ]\n}\n`);
console.log(`${records.length} fixtures likhe (${ids.join(', ')}); kul ${all.length}`);
