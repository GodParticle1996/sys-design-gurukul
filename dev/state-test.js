#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let checks = 0;
function boot(raw, unavailable = false) {
  const values = { 'sysdesigngurukul-v1': raw };
  const context = vm.createContext({ console, Date, Math, JSON,
    localStorage: {
      getItem(k) { if (unavailable) throw new Error('blocked'); return values[k] || null; },
      setItem(k, v) { if (unavailable) throw new Error('quota'); values[k] = v; },
    }, document: { documentElement: { dataset: {} } }, window: { matchMedia: () => ({ matches: false }) },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'core.js'), 'utf8'), context);
  return { SD: vm.runInContext('SD', context), values };
}
function check(value, message) { assert.ok(value, message); checks++; }
const old = boot(JSON.stringify({ xp: 85, completed: ['pool', 'pool', 'retired-level'], stars: { pool: 3 },
  dojo: { good: { front: 'Q', back: 'A', box: 2, due: 123 } }, streak: { count: 4, best: 6, last: '2026-10-20' } }));
check(old.SD.state.schemaVersion === 2 && old.SD.state.xp === 85, 'v1 migrates without losing XP');
check(old.SD.state.completed.length === 2 && old.SD.state.stars.pool === 3, 'unique completions and stars survive');
check(old.SD.state.dojo.good.box === 2 && old.SD.state.streak.best === 6, 'nested old records survive');
old.SD.saveState();
check(boot(old.values[old.SD.STORE_KEY]).SD.state.xp === 85, 'save/reload round trip');
for (const raw of ['{', 'null', '[]', '7', '"string"']) {
  const { SD } = boot(raw); check(SD.state.xp === 0 && SD.state.dojo && SD.state.streak, 'bad root recovers: ' + raw);
}
const invalid = boot('{"xp":-1,"completed":[1,"pool"],"stars":{"pool":8,"__proto__":3},"dojo":{"bad":null,"ok":{"front":"Q","back":"A","box":99,"due":-1}},"streak":null,"levelStarts":"oops","checkpoint":{"levelId":"pool","stageIdx":-1},"theme":"garbage"}').SD;
check(invalid.state.xp === 0 && invalid.state.completed.length === 1, 'invalid numeric and array fields recover independently');
check(!Object.prototype.hasOwnProperty.call(invalid.state.stars, '__proto__') && !invalid.state.stars.pool, 'bad star entries discarded');
check(invalid.state.dojo.ok.box === 4 && Number.isFinite(invalid.state.dojo.ok.due), 'SRS values clamped');
check(!invalid.state.checkpoint && invalid.state.theme === 'system', 'bad checkpoint and theme discarded');
const blocked = boot(null, true).SD;
blocked.state.xp = 10;
check(blocked.saveState() === false && blocked.storageError && blocked.state.xp === 10, 'blocked storage keeps in-memory progress');
const future = boot(JSON.stringify({ schemaVersion: 20, xp: 120, completed: ['pool'], streak: { count: 2 }, theme: 'light',
  checkpoint: { levelId: 'pool', stageIdx: 2, firstTry: 3, total: 4, stages: ['quiz:Review'] } })).SD;
check(future.state.xp === 120 && future.state.streak.best === 2 && future.state.theme === 'light', 'new schema fields preserve compatible progress');
check(future.state.checkpoint.stageIdx === 2 && future.state.checkpoint.firstTry === 3, 'valid checkpoint preserved');
const labBoot = boot(JSON.stringify({ xp: 5, labsDone: ['01-reddit/ex1', '01-reddit/ex1', 7, null, 'x'.repeat(300)] }));
const labs = labBoot.SD;
check(labs.state.labsDone.length === 1 && labs.state.labsDone[0] === '01-reddit/ex1', 'labsDone keeps unique short strings only');
check(Array.isArray(old.SD.state.labsDone) && old.SD.state.labsDone.length === 0, 'old saves get an empty labsDone list');
labs.markLabDone({ project: '15-backpressure', exercise: 'ex1' });
const reloaded = boot(labBoot.values[labs.STORE_KEY]).SD;
check(labs.labDone({ project: '15-backpressure', exercise: 'ex1' }) && reloaded.state.labsDone.includes('15-backpressure/ex1'), 'a ticked lab survives save and reload');
console.log(`${checks} persistence and migration checks pass`);
