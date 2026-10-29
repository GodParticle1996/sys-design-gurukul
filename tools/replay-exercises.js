#!/usr/bin/env node
'use strict';

/* Static intended actions drive the real renderer callbacks. No expected
   answers are derived here. The negative walk also exercises every available
   wrong MCQ option, invalid estimates, missing decisions and repeat actions. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const { environment } = require('./mini-dom');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'exercise-solutions.json'), 'utf8'));

function load() {
  const env = environment(), context = vm.createContext(env.sandbox);
  const scripts = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"]+)"/g)].map(x => x[1]);
  for (const file of scripts) {
    if (file === 'app.js') vm.runInContext('SD.addXP = () => {}; SD.noteMistake = () => {};', context);
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }
  const SD = vm.runInContext('SD', context);
  const levels = new Map(Object.values(SD.levelSets).flat().map(level => [level.id, level]));
  env.flush();
  const terminal = SD.renderers.terminal;
  SD.renderers.terminal = function (...args) { const handle = terminal(...args); SD._testTerminal = handle; return handle; };
  return { ...env, SD, levels };
}

const need = (root, selector) => {
  const node = root.querySelector(selector);
  assert(node, `Missing control: ${selector}`);
  return node;
};
const opts = (arena, type) => arena.querySelectorAll(type === 'docker' ? '.dk-opt' : type === 'dryrun' || type === 'cards' ? '.dr-opt' : type === 'replay' || type === 'tradeoff' ? '.rp-opt' : '.choice');
const select = (arena, type, option) => {
  const button = opts(arena, type).find(b => Number(b.dataset.i) === option);
  assert(button, `Missing ${type} original option ${option}`);
  button.click();
};
const controls = { quiz: '.arena-next', incident: '.arena-next', design: '.dsn-next', estimate: '.es-next', tradeoff: '.td-next', archdiff: '.ad-done', replay: '.rp-done', dryrun: '.dr-next', dryrunDone: '.dr-done', docker: '.dk-done', interview: '.iv-next' };

function stageFor(env, record) {
  const level = env.levels.get(record.level);
  assert(level, `Unknown level ${record.level}`);
  const stage = record.stage === 'interview' ? { type: 'interview', ...level.interview } : level.stages[record.stage];
  assert(stage && stage.type === record.type, 'Fixture no longer matches stage type');
  return stage;
}

function render(env, record) {
  env.clearTimers(); env.SD.state = env.SD.defaultState(); env.SD.session = null;
  delete env.SD._testTerminal;
  const stage = stageFor(env, record), arena = env.document.createElement('div');
  env.document.getElementById('app').replaceChildren(arena);
  let completions = 0, stats;
  const renderer = stage.type === 'interview' ? env.SD.ui.renderInterview : env.SD.renderers[stage.type];
  renderer(stage, arena, value => { completions++; stats = value; });
  env.flush();
  assert.equal(completions, 0, 'Fresh exercise must not be complete');
  return { env, stage, arena, count: () => completions, stats: () => stats };
}

function inputAction(node, key = 'Enter') { node.dispatchEvent({ type: 'keydown', key, bubbles: true }); }
function activate(node, keyboard) { if (keyboard && node.tabIndex === 0) inputAction(node); else node.click(); }

function perform(walk, action, keyboard = false) {
  const { env, stage, arena } = walk;
  switch (action.action) {
    case 'bin': {
      const chip = arena.querySelectorAll('.pool .chip').find(c => c._item === stage.items[action.item]);
      assert(chip, 'Classification item missing'); if (!chip.classList.contains('selected')) activate(chip, keyboard);
      activate(need(arena, `[data-bin="${action.bin}"]`), keyboard); break;
    }
    case 'fill': {
      const chip = arena.querySelectorAll('.pool .chip').find(c => c._tok === action.token);
      assert(chip, `Token missing: ${action.token}`); activate(chip, keyboard);
      activate(need(arena, `[data-blank="${action.blank}"]`), keyboard); break;
    }
    case 'order': {
      const chip = arena.querySelectorAll('.pool .chip').find(c => c._step.idx === action.step);
      assert(chip, 'Sequence step missing'); activate(chip, keyboard); break;
    }
    case 'match': activate(need(arena, `.mcard.left[data-idx="${action.pair}"]`), keyboard); activate(need(arena, `.mcard.right[data-idx="${action.pair}"]`), keyboard); break;
    case 'choose': select(arena, stage.type, action.option); break;
    case 'hotspot': activate(need(arena, `[data-hs="${action.target}"]`), keyboard); break;
    case 'incident': select(arena, stage.type, action.option); break;
    case 'design': need(arena, `.dsn-opt[data-slot="${action.slot}"][data-option="${action.option}"]`).click(); break;
    case 'review': need(arena, '.dsn-review').click(); break;
    case 'estimate': need(arena, '.es-input').value = action.value; need(arena, '.es-go').click(); break;
    case 'knob': {
      const index = stage.knobs.findIndex(k => k.id === action.id); assert(index >= 0, 'Knob fixture does not exist');
      const slider = arena.querySelectorAll('.td-slider')[index]; slider.value = String(action.value); slider.dispatchEvent({ type: 'input' }); break;
    }
    case 'classify': need(need(arena, `.ad-node[data-id="${action.node}"]`), action.flaw ? '.ad-flaw-btn' : '.ad-safe-btn').click(); break;
    case 'replayFrame': {
      assert.equal(need(arena, '.rp-clock').textContent, stage.frames[action.frame].t, 'Replay skipped a frame');
      if (action.option != null) { select(arena, 'replay', action.option); need(arena, '.rp-go').click(); }
      else need(arena, '.rp-step, .rp-play').click(); break;
    }
    case 'confirmStep': arena.querySelectorAll('.dk-tick')[action.step].click(); break;
    case 'terminal': {
      const mission = stage.questions[action.question].terminal, handle = env.SD._testTerminal;
      assert(handle && handle.sim.stage === mission && arena.querySelector('.terminal'), 'Embedded terminal question is not active');
      assert(mission.solution && mission.solution.length, 'Embedded terminal has no solution commands');
      mission.solution.forEach((command, i) => {
        assert(!handle.sim.done, 'Embedded terminal won before final command');
        handle.run(command); env.flush();
        assert(!handle.sim.lastError, `Embedded terminal error: ${handle.sim.lastError}`);
        assert.equal(handle.sim.done, i === mission.solution.length - 1, 'Embedded terminal must win on final command only');
      }); break;
    }
    case 'continue': need(arena, controls[action.control]).click(); break;
    default: throw Error(`Unknown action ${action.action}`);
  }
  env.flush();
}

function wrongBefore(walk, action) {
  const { env, stage, arena } = walk;
  const before = walk.count();
  if (action.action === 'choose' || action.action === 'incident' || action.action === 'replayFrame' && action.option != null) {
    const type = action.action === 'replayFrame' ? 'replay' : stage.type;
    for (const button of opts(arena, type)) if (Number(button.dataset.i) !== action.option) {
      button.click(); env.flush(); assert.equal(walk.count(), before, 'Wrong option completed exercise');
      assert(button.classList.contains('wrong'), 'Wrong option must give visible feedback');
    }
  } else if (action.action === 'bin') {
    const chip = arena.querySelectorAll('.pool .chip').find(c => c._item === stage.items[action.item]);
    const wrong = stage.bins.find(b => b.id !== action.bin); chip.click(); need(arena, `[data-bin="${wrong.id}"]`).click();
  } else if (action.action === 'order') {
    const wrong = arena.querySelectorAll('.pool .chip').find(c => c._step.idx !== action.step); if (wrong) wrong.click();
  } else if (action.action === 'match') {
    const right = arena.querySelectorAll('.mcard.right:not(.done)').find(c => Number(c.dataset.idx) !== action.pair);
    if (right) { need(arena, `.mcard.left[data-idx="${action.pair}"]`).click(); right.click(); }
  } else if (action.action === 'fill') {
    const chip = arena.querySelectorAll('.pool .chip').find(c => c._tok !== action.token);
    if (chip) { chip.click(); need(arena, `[data-blank="${action.blank}"]`).click(); }
  } else if (action.action === 'hotspot') {
    const wrong = arena.querySelectorAll('[data-hs]').find(c => c.dataset.hs !== action.target); if (wrong) wrong.click();
  } else if (action.action === 'estimate') {
    for (const garbage of ['', '-1', '0', 'NaN', 'Infinity', '1e999', action.value + 'garbage', String(Number(action.value) * 1e9)]) {
      need(arena, '.es-input').value = garbage; need(arena, '.es-go').click(); env.flush();
      assert(!arena.querySelector('.es-next'), 'Invalid/wrong estimate must not unlock Next');
    }
  } else if (action.action === 'classify') {
    need(need(arena, `.ad-node[data-id="${action.node}"]`), action.flaw ? '.ad-safe-btn' : '.ad-flaw-btn').click();
  }
  env.flush(); assert.equal(walk.count(), before, 'Incorrect action completed exercise');
}

function cheats(env, record) {
  if (record.type === 'design') {
    const stage = stageFor(env, record);
    const bad = render(env, record);
    stage.slots.forEach(slot => perform(bad, { action: 'design', slot: slot.id, option: slot.options.reduce((a, b) => a.score < b.score ? a : b).id }));
    perform(bad, { action: 'review' }); assert(!bad.arena.querySelector('.dsn-next'), 'Failed design must not offer completion'); assert.equal(bad.count(), 0);
    const partial = render(env, record); record.solution.filter(a => a.action === 'design').slice(1).forEach(a => perform(partial, a));
    const review = need(partial.arena, '.dsn-review'); assert(review.disabled); review.onclick(); assert.equal(partial.count(), 0, 'Missing decision cannot pass');
    for (const slot of stage.slots) for (const option of slot.options.filter(o => o.score <= 0)) {
      const test = render(env, record);
      record.solution.filter(a => a.action === 'design').forEach(a => perform(test, a.slot === slot.id ? { ...a, option: option.id } : a));
      perform(test, { action: 'review' }); assert(!test.arena.querySelector('.dsn-next'), 'Good choices must not cancel a requirement-breaking design choice');
    }
  } else if (record.type === 'docker') {
    /* Without a laptop the observation question finishes the stage, and the lab stays pending. */
    const stage = stageFor(env, record);
    env.SD.state.labsDone = [];
    const skipped = render(env, record); need(skipped.arena, '.dk-skip').click();
    perform(skipped, record.solution.find(a => a.action === 'choose'));
    const next = need(skipped.arena, '.dk-done'); assert(!next.disabled, 'Answering the question must finish the stage without the lab');
    next.onclick(); assert.equal(skipped.count(), 1);
    assert(!env.SD.labDone(stage), 'A skipped lab must not be recorded as done');
    /* Ticks alone never finish the stage, but they do record the lab. */
    const ticksOnly = render(env, record);
    record.solution.filter(a => a.action === 'confirmStep').forEach(a => perform(ticksOnly, a));
    assert(!ticksOnly.arena.querySelector('.dk-done'), 'Ticks without the answer must not offer completion'); assert.equal(ticksOnly.count(), 0);
    assert(env.SD.labDone(stage), 'Ticking every step must record the lab as done');
  } else if (record.type === 'bins') {
    const test = render(env, record), first = record.solution[0]; perform(test, first);
    const placed = need(test.arena, '.placed');
    for (let i = 0; i < record.solution.length + 2; i++) { placed.click(); need(test.arena, `[data-bin="${first.bin}"]`).click(); env.flush(); }
    assert.equal(test.count(), 0, 'Repeated placement of one item must not complete other items');
  } else if (record.type === 'archdiff') {
    const test = render(env, record); test.arena.querySelectorAll('.ad-flaw-btn').forEach(b => b.click()); env.flush();
    assert.equal(test.count(), 0, 'Blindly marking every component flawed must not win'); assert(!test.arena.querySelector('.ad-done'));
  } else if (record.type === 'hotspot') {
    const test = render(env, record), action = record.solution[0], target = need(test.arena, `[data-hs="${action.target}"]`);
    target.click(); target.click(); target.click();
    assert.equal(test.count(), 0, 'Repeated clicks must wait for current feedback'); env.flush();
    if (record.solution.length > 1) assert.equal(need(test.arena, '.quiz-progress').textContent, `Sawal 2 / ${record.solution.length}`, 'Rapid click skipped a question');
  }
}

function omittedSteps(env, record) {
  const original = JSON.stringify(stageFor(env, record));
  let attempts = 0;
  for (let skip = 0; skip < record.solution.length; skip++) {
    if (record.solution[skip].optional) continue;
    attempts++;
    const walk = render(env, record);
    try {
      record.solution.forEach((action, i) => { if (i !== skip) perform(walk, action); });
    } catch (error) {
      // A skipped answer can leave Next absent, keep the previous question's
      // options visible, or hold a replay on its unanswered frame. These are
      // expected refusals; parser/renderer exceptions must still fail the run.
      const blockedControl = error.code === 'ERR_ASSERTION' &&
        /^(Missing control: |Missing (?:quiz|incident|tradeoff|replay|dryrun|cards|docker|interview) original option |Replay skipped a frame|Embedded terminal question is not active)/.test(error.message);
      if (!blockedControl) throw error;
    }
    assert.equal(walk.count(), 0, `Omitting action ${skip + 1}/${record.solution.length} must not complete exercise`);
    assert.equal(JSON.stringify(stageFor(env, record)), original, 'Omitted action mutated shared lesson data');
  }
  return attempts;
}

function main() {
  const env = load(), only = process.argv[2], records = fixture.exercises.filter(r => !only || r.level === only || r.type === only);
  assert(records.length, 'No fixtures matched filter');
  let actions = 0, omissions = 0, pass = 0, fails = 0;
  const expected = [...env.levels.values()].reduce((sum, level) => sum + level.stages.filter(s => s.type !== 'terminal').length + (level.interview ? 1 : 0), 0);
  if (!only) assert.equal(fixture.exercises.length, expected, 'Every nonterminal stage and interview needs a static solution');
  const keys = fixture.exercises.map(r => `${r.level}/${r.stage}`); assert.equal(new Set(keys).size, keys.length, 'Duplicate solution fixture');
  for (const record of records) {
    try {
      assert(record.solution.length, 'Empty intended solution');
      for (const negative of [false, true]) {
        const walk = render(env, record), before = JSON.stringify(stageFor(env, record));
        record.solution.forEach((action, i) => {
          if (negative) wrongBefore(walk, action);
          perform(walk, action, negative); actions++;
          assert.equal(walk.count(), i === record.solution.length - 1 ? 1 : 0, `Completion must occur only after final action (${i + 1}/${record.solution.length})`);
        });
        assert.equal(JSON.stringify(stageFor(env, record)), before, 'Renderer mutated shared lesson data');
        if (!negative) assert.equal(walk.stats().firstTry, walk.stats().total, 'Intended solution must earn full first-try score');
      }
      cheats(env, record); omissions += omittedSteps(env, record); pass++;
    } catch (error) { fails++; console.error(`FAIL ${record.level}/${record.stage} (${record.type}): ${error.message}`); }
  }
  console.log(`Exercise replays: pass ${pass}, fail ${fails}, fixtures ${records.length}, intended actions ${actions}, omitted-step attempts ${omissions}; each fixture also checked after wrong actions.`);
  if (fails) process.exitCode = 1;
}
if (require.main === module) main();
module.exports = { load, render, perform, wrongBefore, cheats, omittedSteps, fixtures: fixture.exercises };
