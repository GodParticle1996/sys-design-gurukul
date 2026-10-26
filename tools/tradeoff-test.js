#!/usr/bin/env node
'use strict';

/* Metric contracts and demand-reduction cheats, independent of UI completion.
   Static intended actions remain in exercise-solutions.json. */
const assert = require('node:assert/strict');
const { loadApp } = require('../dev/load-app');
const fixtures = require('../exercise-solutions.json').exercises;
const { SD, levels } = loadApp();
const stages = new Map(levels.flatMap(({ level }) => level.stages
  .filter(s => s.type === 'tradeoff').map(s => [level.id, s])));
let checks = 0, sampled = 0, workloadCheats = 0;
function expect(condition, message) { assert(condition, message); checks++; }
function values(id, patch = {}) {
  const stage = stages.get(id);
  const result = Object.fromEntries(stage.knobs.map(k => [k.id, k.value]));
  const fixture = fixtures.find(r => r.level === id && r.type === 'tradeoff');
  fixture.solution.filter(a => a.action === 'knob').forEach(a => { result[a.id] = a.value; });
  return Object.assign(result, patch);
}
function wins(id, patch = {}) { return SD.tradeoffStatus(stages.get(id), values(id, patch)).ok; }

expect(stages.size === 32, 'All authored knob labs must be covered');
let seed = 0x7175616c;
for (const [id, stage] of stages) {
  expect(wins(id), `${id}: intended static configuration must satisfy the live goal`);
  expect(!SD.tradeoffStatus(stage, Object.fromEntries(stage.knobs.map(k => [k.id, k.value]))).ok,
    `${id}: initial incident must need a fix`);
  for (const knob of stage.knobs) {
    for (const invalid of [null, undefined, '', '1', NaN, Infinity, -Infinity, knob.min - 1, knob.max + 1]) {
      expect(!wins(id, { [knob.id]: invalid }), `${id}/${knob.id}: invalid state must not win`);
    }
    const minimum = (stage.workload || {})[knob.id];
    if (minimum != null && minimum > knob.min) {
      const verdict = SD.tradeoffStatus(stage, values(id, { [knob.id]: minimum - (knob.step || 1) }));
      expect(!verdict.ok && /Demand|mission/.test(verdict.text), `${id}: lowering required demand is not a fix`);
      workloadCheats++;
    }
  }
  /* A reproducible cross-section includes all knob bounds. It catches an
     authored green message disagreeing with its actual numeric win predicate. */
  for (let i = 0; i < 1000; i++) {
    const k = Object.fromEntries(stage.knobs.map(knob => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const step = knob.step || 1, count = Math.floor((knob.max - knob.min) / step) + 1;
      return [knob.id, knob.min + (i === 0 ? 0 : i === 1 ? count - 1 : Math.floor(seed / 2 ** 32 * count)) * step];
    }));
    expect(Boolean(stage.check(k)) === Boolean(stage.verdict(k).ok), `${id}: numeric predicate and feedback disagree at ${JSON.stringify(k)}`);
    sampled++;
  }
}

/* Golden cases for previously plausible but wrong wins. */
expect(!wins('multiregion', { regions: 2, write: 2 }), 'Two equal home regions leave only half the users writing');
expect(!wins('multiregion', { regions: 2, write: 1, read: 1 }), 'Two-region quorum cannot lose either voting region');
expect(wins('multiregion', { regions: 3, write: 2 }), 'Three home regions retain a majority of users');
expect(!wins('migrations', { parts: 25, cons: 25 }), '100% utilization cannot drain a CDC burst');
expect(wins('migrations', { parts: 32, cons: 32 }), 'Headroom drains the modeled CDC burst');
expect(!wins('st-jira-tenant', { cap: 100, monster: 3 }), 'Shrinking the noisy tenant is not isolation');
expect(!wins('st-discord-model', { skew: 25, key: 0 }), 'Shrinking traffic skew is not partitioning');
expect(!wins('st-snow-warehouse', { steal: 0, slow: 1 }), 'Removing the slow worker is not straggler recovery');
expect(!wins('st-insta-postgres', { nodes: 4, logical: 4096, style: 1 }), 'Many logical shards do not erase the new node data copy');
expect(wins('st-insta-postgres', { nodes: 8, logical: 256, style: 1 }), 'Enough nodes and fine placement meet the bounded copy budget');
console.log(`Tradeoff contracts: ${stages.size} labs, ${sampled} sampled states, ${workloadCheats} workload-reduction cheats, ${checks} checks pass.`);
