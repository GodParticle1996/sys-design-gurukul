#!/usr/bin/env node
'use strict';
// Drive real renderer callbacks and the real pending-XP/replay guard.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { environment } = require('../tools/mini-dom');
const { render, perform, wrongBefore, fixtures } = require('../tools/replay-exercises');
const root = path.resolve(__dirname, '..'), env = environment(), context = vm.createContext(env.sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"]+)"/g)) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
env.SD = vm.runInContext('SD', context);
env.levels = new Map(Object.values(env.SD.levelSets).flat().map(l => [l.id, l]));
const SD = env.SD;
let checks = 0;
function check(value, expected, message) { assert.equal(value, expected, message); checks++; }
const types = ['design', 'replay', 'tradeoff', 'estimate', 'archdiff', 'dryrun', 'cards', 'docker',
  'quiz', 'bins', 'order', 'match', 'fill', 'hotspot', 'incident', 'interview'];
function start(record, replay) {
  const walk = render(env, record);
  SD.session = { level: env.levels.get(record.level), pendingXP: 0, replay };
  if (replay) SD.state.completed.push(record.level);
  return walk;
}
function answerControl(walk, action) {
  const { arena } = walk;
  if (action.action === 'choose' || action.action === 'incident' || action.action === 'replayFrame' && action.option != null) {
    return arena.querySelectorAll('[data-i]').find(b => Number(b.dataset.i) === action.option);
  }
  if (action.action === 'estimate') return arena.querySelector('.es-go');
  if (action.action === 'review') return arena.querySelector('.dsn-review');
  if (action.action === 'classify') return arena.querySelector(`[data-id="${action.node}"]`).querySelector(action.flaw ? '.ad-flaw-btn' : '.ad-safe-btn');
  return null;
}
for (const type of types) {
  const record = fixtures.find(r => r.type === type && (type !== 'tradeoff' || env.levels.get(r.level).stages[r.stage].quiz) &&
    (type !== 'interview' || !env.levels.get(r.level).interview.questions.some(q => q.terminal)));
  assert(record, `Missing ${type} fixture`);
  for (const replay of [false, true]) for (const negative of [false, true]) {
    const walk = start(record, replay);
    if (negative && type === 'design') {
      // First review is deliberately wrong; later correction must not earn XP.
      walk.stage.slots.forEach(slot => perform(walk, { action: 'design', slot: slot.id,
        option: slot.options.reduce((a, b) => a.score < b.score ? a : b).id }));
      perform(walk, { action: 'review' });
      const retry = walk.arena.querySelector('.btnrow button'); assert(retry);
      retry.click(); env.flush();
    }
    for (const action of record.solution) {
      if (negative && type !== 'design') wrongBefore(walk, action);
      const button = answerControl(walk, action);
      perform(walk, action);
      const before = SD.session.pendingXP;
      // Retain the old answer control, including after the next question renders.
      if (button && button.onclick) { button.onclick(); button.onclick(); env.flush(); }
      check(SD.session.pendingXP, before, `${type}: repeated answer callback gives no extra XP`);
    }
    check(walk.count(), 1, `${type}: completed`);
    const stats = walk.stats();
    check(SD.session.pendingXP, replay ? 0 : stats.firstTry * SD.XP_PER_ITEM,
      `${type}: ${negative ? 'corrected' : 'first-try'} answers, replay=${replay}`);
    if (!negative) check(stats.firstTry, stats.total, `${type}: perfect score preserved`);
    if (negative && type !== 'tradeoff') check(stats.firstTry < stats.total, true, `${type}: wrong answers lose first-try credit`);
    if (negative && type === 'tradeoff') check(stats.firstTry, 1, 'tradeoff: exploration earns goal XP, wrong quiz earns none');
    check(SD.state.xp, 0, `${type}: XP stays pending`);
  }
}
// Existing terminal rules stay at 30 XP minus hint costs; bad commands do not
// change that contract. Completion still awards once, and replay earns zero.
const missionLevel = [...env.levels.values()].find(l => l.stages.some(s => s.type === 'terminal'));
const mission = missionLevel.stages.find(s => s.type === 'terminal');
for (const replay of [false, true]) for (const hinted of [false, true]) {
  env.clearTimers(); SD.state = SD.defaultState();
  SD.session = { level: missionLevel, pendingXP: 0, replay };
  if (replay) SD.state.completed.push(missionLevel.id);
  const arena = env.document.createElement('div');
  let completions = 0;
  const handle = SD.renderers.terminal(mission, arena, () => completions++);
  if (hinted) arena.querySelectorAll('button').find(b => b.textContent.includes('Hint')).click();
  handle.run('unknown'); env.flush();
  check(SD.session.pendingXP, 0, 'terminal: bad command gives no XP');
  mission.solution.forEach(command => { handle.run(command); env.flush(); });
  check(completions, 1, 'terminal: completed once');
  const expected = replay ? 0 : SD.TERMINAL_XP - (hinted ? SD.HINT_COST : 0);
  check(SD.session.pendingXP, expected, 'terminal: original no-hint/hinted/replay XP');
  handle.run('help'); env.flush();
  check(SD.session.pendingXP, expected, 'terminal: post-win command gives no extra XP');
}
// The observation question earns the same XP with or without self-reported lab steps.
const docker = fixtures.find(r => r.type === 'docker');
for (const replay of [false, true]) for (const negative of [false, true]) {
  const walk = start(docker, replay);
  walk.arena.querySelector('.dk-skip').click();
  const answer = docker.solution.find(a => a.action === 'choose');
  if (negative) wrongBefore(walk, answer);
  perform(walk, answer); perform(walk, answer);
  check(SD.session.pendingXP, replay || negative ? 0 : SD.XP_PER_ITEM, 'docker: skipped lab observation XP');
  walk.arena.querySelector('.dk-done').click();
  check(walk.stats().verification, 'skipped', 'docker: lab remains skipped');
}
// Dry-run navigation must not re-award an already answered question.
for (const type of ['dryrun', 'cards']) {
  const record = fixtures.find(r => r.type === type);
  const walk = start(record, false);
  record.solution.forEach(a => perform(walk, a));
  const before = SD.session.pendingXP;
  const prev = walk.arena.querySelector('.dr-prev');
  while (!prev.disabled) prev.click();
  check(SD.session.pendingXP, before, `${type}: revisiting answers earns no XP`);
}
// A mixed first design review earns only its good slots, even after retry.
{
  const slot = id => ({ id, label: id, options: [{ id: 'bad', label: 'bad', score: -1 }, { id: 'good', label: 'good', score: 2 }] });
  const stage = { type: 'design', slots: [slot('a'), slot('b')], pass: 4 };
  const arena = env.document.createElement('div');
  SD.state = SD.defaultState(); SD.session = { pendingXP: 0, replay: false };
  let stats;
  SD.renderers.design(stage, arena, value => { stats = value; });
  const walk = { env, stage, arena };
  perform(walk, { action: 'design', slot: 'a', option: 'good' });
  perform(walk, { action: 'design', slot: 'b', option: 'bad' });
  perform(walk, { action: 'review' });
  check(SD.session.pendingXP, 10, 'design: good slot on failed first review earns XP');
  arena.querySelector('.btnrow button').click();
  for (const slot of stage.slots) perform(walk, { action: 'design', slot: slot.id, option: 'good' });
  perform(walk, { action: 'review' }); arena.querySelector('.dsn-next').click();
  check(SD.session.pendingXP, 10, 'design: retry gives no extra slot XP');
  check(stats.firstTry, 1, 'design: original first-review star score preserved');
}
// Preserve the original rank thresholds/names and dynamically expose new ranks in the UI.
const ranks = vm.runInContext('RANKS', context);
const legacy = [[0,'Request Shishya'],[250,'Flow Pathik'],[600,'Contract Karigar'],[1050,'Cursor Kushal'],
  [1550,'Index Nipun'],[2100,'Cache Chatur'],[2700,'Timeout Tapasvi'],[3400,'Breaker Bhairav'],
  [4200,'Backpressure Balwan'],[5100,'Saga Sutradhar'],[6100,'Consistency Chintak'],[7200,'Scale Shilpi'],
  [8400,'System Sthapati'],[9800,'Pattern Parakhi'],[11000,'Migration Marmagya'],[12200,'Protocol Pandit'],
  [13600,'Nirmata'],[14300,'Incident Insaan'],[15600,'Napkin Nawab'],[17200,'Architect Mahaguru']];
legacy.forEach(([xp, name], i) => { check(ranks[i].xp, xp, 'legacy threshold'); check(ranks[i].name, name, 'legacy name'); });
check(new Set(ranks.map(r => r.icon)).size, ranks.length, 'unique rank icons');
ranks.forEach((rank, i) => {
  if (i) check(rank.xp > ranks[i - 1].xp, true, 'strictly increasing thresholds');
  SD.state.xp = rank.xp;
  check(SD.currentRank().name, rank.name, 'rank lookup at threshold');
  check(SD.nextRank()?.name, ranks[i + 1]?.name, 'next rank dynamically follows ladder');
});
SD.ui.renderTopbar();
check(env.document.getElementById('topbar').textContent.includes('System Samrat'), true, 'topbar shows new top rank');
// Recompute the finite first-completion economy from current course data.
function items(s) {
  switch (s.type) {
    case 'quiz': case 'hotspot': return s.questions.length;
    case 'bins': return s.items.length;
    case 'order': return s.steps.length;
    case 'match': return s.pairs.length;
    case 'fill': return s.blanks.length;
    case 'design': return s.slots.length;
    case 'estimate': return s.problems.length;
    case 'archdiff': return s.nodes.length;
    case 'tradeoff': return 1 + (s.quiz ? 1 : 0);
    case 'docker': return 1;
    case 'replay': return s.frames.filter(f => f.ask).length;
    case 'dryrun': case 'cards': return s.steps.filter(f => f.ask).length;
    case 'incident': {
      let n = 0, id = s.start; const seen = new Set();
      while (id && s.nodes[id] && !s.nodes[id].end && !seen.has(id)) {
        seen.add(id); n++; id = s.nodes[id].choices.find(c => c.good)?.next;
      }
      return n;
    }
    default: return 0;
  }
}
let maximum = 0;
for (const level of env.levels.values()) {
  for (const stage of level.stages) {
    const n = items(stage);
    maximum += stage.type === 'terminal' ? SD.TERMINAL_XP + SD.PERFECT_BONUS : n * SD.XP_PER_ITEM + (n ? SD.PERFECT_BONUS : 0);
  }
  if (level.interview) maximum += SD.PERFECT_BONUS + level.interview.questions.reduce((sum, q) => sum + (q.terminal ? SD.TERMINAL_XP : SD.XP_PER_ITEM), 0);
}
const fraction = ranks.at(-1).xp / maximum;
check(fraction >= 0.90 && fraction <= 0.95, true, `top rank near completion (${maximum} XP maximum)`);
console.log(`${checks} XP, replay and rank regression checks pass (${types.length + 1} renderer types plus Docker skip path; maximum ${maximum} XP)`);
