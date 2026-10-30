#!/usr/bin/env node
'use strict';
/* Turn small review fixes into a full apply.js patch (dev/REVIEW.md, decision 1).

     node dev/rewrite/merge.js fixes.json > patch.json

   fixes.json is a list of {level, path, q?, hint?, explain?, choice?: {i: text}, reason?: {i: text}}.
   Every field you leave out is copied from the current data, so a fix that changes one reason
   still sends apply.js the full choices + choiceExplanations it expects. A reason equal to the
   explanation is written as "=explain", the way apply.js reads it. */
const fs = require('fs');
const { loadApp } = require('../load-app');

const fixes = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const levels = new Map(loadApp().levels.map(({ level }) => [level.id, level]));
const at = (obj, p) => p.split(/\.|\[|\]/).filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), obj);

const out = fixes.map(f => {
  const level = levels.get(f.level);
  if (!level) throw new Error(`level nahi mila: ${f.level}`);
  const item = at(level, f.path);
  if (!item || !Array.isArray(item.choices)) throw new Error(`${f.level} ${f.path}: sawaal nahi mila`);
  const explain = f.explain != null ? f.explain : item.explain;
  const choices = item.choices.slice();
  Object.entries(f.choice || {}).forEach(([i, t]) => { choices[+i] = t; });
  const reasons = (item.choiceExplanations || []).map(r => (r === item.explain ? '=explain' : r));
  Object.entries(f.reason || {}).forEach(([i, t]) => { reasons[+i] = t; });
  const patch = { level: f.level, path: f.path, choices, choiceExplanations: reasons };
  ['q', 'hint', 'explain'].forEach(k => { if (f[k] != null) patch[k] = f[k]; });
  if (patch.explain == null && f.reason && '0' in f.reason) patch.explain = explain;
  return patch;
});
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
