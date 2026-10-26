#!/usr/bin/env node
'use strict';
/* Audit the questions actually loaded by index.html. No npm dependency or server. */
const { loadApp } = require('../dev/load-app');

function text(value) {
  return String(value == null ? '' : value).replace(/<[^>]*>/g, ' ')
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, ' ').replace(/\s+/g, ' ').trim();
}

function lengthBias(choices, answer) {
  const lengths = choices.map(c => [...text(c)].length);
  const wrong = lengths.filter((_, i) => i !== answer);
  if (!wrong.length || !Number.isInteger(answer) || answer < 0 || answer >= lengths.length) return null;
  return lengths[answer] >= 1.15 * Math.max(...wrong) ? 'long'
    : lengths[answer] <= 0.85 * Math.min(...wrong) ? 'short' : null;
}

function collect(levels) {
  const questions = [], decisions = [], designs = [];
  function walk(obj, path, meta) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach((v, i) => walk(v, `${path}[${i}]`, meta)); return; }
    if (Array.isArray(obj.choices) && Number.isInteger(obj.answer) && obj.choices.every(c => typeof c === 'string')) {
      const labels = obj.choices.map(text);
      const duplicate = labels.some((v, i) => labels.slice(0, i).some(p => p.toLowerCase() === v.toLowerCase()));
      questions.push({ ...meta, path, q: text(obj.q), choices: labels, answer: obj.answer,
        explain: text(obj.explain), choiceExplanations: (obj.choiceExplanations || []).map(text),
        lengthBias: lengthBias(labels, obj.answer), duplicate,
        missingFeedback: !Array.isArray(obj.choiceExplanations) || obj.choiceExplanations.length !== labels.length || obj.choiceExplanations.some(v => !text(v)),
        giveaway: labels.map((v, i) => /\b(always|never|hamesha|kabhi nahi|all of the above|none of the above)\b/i.test(v) ? i : -1).filter(i => i >= 0),
      });
    }
    if (Array.isArray(obj.choices) && obj.choices.some(c => c && c.good === true)) {
      obj.choices.filter(c => c.good).forEach((good, i) => {
        const wrong = obj.choices.filter(c => !c.good);
        decisions.push({ ...meta, path: `${path}.good[${i}]`, q: text(obj.text), choices: [text(good.t || good.text), ...wrong.map(c => text(c.t || c.text))],
          lengthBias: wrong.length ? lengthBias([good.t || good.text, ...wrong.map(c => c.t || c.text)], 0) : null,
          missingFeedback: obj.choices.some(c => !text(c.explain)),
        });
      });
    }
    if (Array.isArray(obj.options) && obj.options.some(c => typeof c.score === 'number')) {
      const best = Math.max(...obj.options.map(c => c.score));
      obj.options.filter(c => c.score === best).forEach((good, i) => {
        const wrong = obj.options.filter(c => c.score < best);
        designs.push({ ...meta, path: `${path}.best[${i}]`, q: text(obj.label), choices: [text(good.label), ...wrong.map(c => text(c.label))],
          lengthBias: wrong.length ? lengthBias([good.label, ...wrong.map(c => c.label)], 0) : null,
          missingFeedback: obj.options.some(c => !text(c.why)),
        });
      });
    }
    Object.entries(obj).forEach(([key, value]) => { if (value && typeof value === 'object') walk(value, `${path}.${key}`, meta); });
  }
  levels.forEach(({ track, level }) => {
    (level.stages || []).forEach((stage, i) => walk(stage, `${track.id}/${level.id}.stages[${i}]`, { track: track.id, level: level.id, kind: stage.type }));
    if (level.interview) walk(level.interview, `${track.id}/${level.id}.interview`, { track: track.id, level: level.id, kind: 'interview' });
  });
  return { questions, decisions, designs };
}

function summary(records) {
  return { count: records.length, flagged: records.filter(q => q.lengthBias).length,
    percent: records.length ? +(100 * records.filter(q => q.lengthBias).length / records.length).toFixed(2) : 0,
    long: records.filter(q => q.lengthBias === 'long').length, short: records.filter(q => q.lengthBias === 'short').length,
    missingFeedback: records.filter(q => q.missingFeedback).length,
    duplicate: records.filter(q => q.duplicate).length };
}

function audit() {
  const app = loadApp();
  const records = collect(app.levels);
  const byKind = {}, byTrack = {}, authoredPositions = {};
  records.questions.forEach(q => {
    (byKind[q.kind] || (byKind[q.kind] = [])).push(q);
    (byTrack[q.track] || (byTrack[q.track] = [])).push(q);
    authoredPositions[q.answer] = (authoredPositions[q.answer] || 0) + 1;
  });
  Object.keys(byKind).forEach(k => { byKind[k] = summary(byKind[k]); });
  Object.keys(byTrack).forEach(k => { byTrack[k] = summary(byTrack[k]); });
  /* Reproducible test of the shared shuffle, separately from authored indexes.
     Authored answer=0 is valid only when each renderer shuffles the options. */
  let seed = 0x61756469;
  app.context.Math = Object.create(Math);
  app.context.Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  const presentedPositions = {};
  [...new Set(records.questions.map(q => q.choices.length))].sort().forEach(count => {
    const buckets = Array(count).fill(0), trials = 12000;
    for (let i = 0; i < trials; i++) buckets[app.SD.shuffle(Array.from({ length: count }, (_, j) => j)).indexOf(0)]++;
    presentedPositions[count] = { trials, counts: buckets, maxDeviationPercent: +(100 * Math.max(...buckets.map(n => Math.abs(n - trials / count))) / (trials / count)).toFixed(2) };
  });
  return { totals: { mcq: summary(records.questions), incident: summary(records.decisions), design: summary(records.designs) },
    byKind, byTrack, authoredPositions, presentedPositions, ...records };
}

if (require.main === module) {
  const result = audit();
  const args = process.argv.slice(2);
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log('Quiz quality: visible text; long >= 1.15 x every distractor, short <= 0.85 x every distractor.');
    Object.entries(result.totals).forEach(([name, s]) => console.log(`${name}: ${s.count}; length flags ${s.flagged} (${s.percent}%); missing option feedback ${s.missingFeedback}; duplicate choices ${s.duplicate}`));
    Object.entries(result.byKind).forEach(([name, s]) => console.log(`  ${name}: ${s.count}; length flags ${s.flagged} (${s.percent}%)`));
    console.log('Authored answer indexes:', JSON.stringify(result.authoredPositions));
    console.log('Seeded shared-shuffle positions (renderers must use it):', JSON.stringify(result.presentedPositions));
    if (args.includes('--list')) [...result.questions, ...result.decisions, ...result.designs].filter(q => q.lengthBias || q.missingFeedback || q.duplicate).forEach(q => console.log(`${q.path}: ${q.lengthBias || '-'}${q.missingFeedback ? ', missing option feedback' : ''}${q.duplicate ? ', duplicate' : ''} — ${q.q}`));
  }
  if (args.includes('--check')) {
    const invalid = result.questions.some(q => q.duplicate || q.missingFeedback)
      || Object.values(result.totals).some(s => s.percent >= 5 || s.missingFeedback)
      || Object.values(result.presentedPositions).some(s => s.maxDeviationPercent > 10);
    if (invalid) process.exitCode = 1;
  }
}
module.exports = { audit, collect, lengthBias, summary, text };
