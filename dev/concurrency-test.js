#!/usr/bin/env node
'use strict';
// Independently compile/run Java and compare actual stdout, saved captures, README and UI data.
// Also verify the new runtime note and raw Java source through the real renderers.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { load, render, fixtures } = require('../tools/replay-exercises');
const root = path.resolve(__dirname, '..');
const project = path.join(root, 'docker-labs/46-concurrency');
let checks = 0;
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks++; }
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', text => { stdout += text; });
    child.stderr.on('data', text => { stderr += text; });
    const timer = setTimeout(() => child.kill('SIGKILL'), 20000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${command}: ${code ?? signal}\n${stderr}\n${stdout}`));
      else resolve(stdout);
    });
  });
}
(async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sdg-concurrency-check-'));
  try {
    const sources = fs.readdirSync(path.join(project, 'src')).filter(f => f.endsWith('.java')).map(f => path.join(project, 'src', f));
    await run('javac', ['--release', '21', '-d', out, ...sources]);
    const readme = fs.readFileSync(path.join(project, 'README.md'), 'utf8');
    for (const exercise of ['ex0-basics', 'ex1-race', 'ex2-queue', 'ex3-pool', 'ex4-deadlock', 'ex5-workers', 'test']) {
      const expected = fs.readFileSync(path.join(project, 'captures', exercise + '.txt'), 'utf8');
      equal(await run('java', ['-cp', out, 'LabRunner', exercise]), expected, exercise + ': real Java output agrees with capture');
      equal(readme.includes('```text\n' + expected + '```'), true, exercise + ': README contains exact measured stdout');
    }
    const env = load();
    for (const level of env.levels.values()) for (let stageIndex = 0; stageIndex < level.stages.length; stageIndex++) {
      const stage = level.stages[stageIndex];
      if (stage.project !== '46-concurrency') continue;
      const expected = fs.readFileSync(path.join(project, 'captures', stage.exercise + '.txt'), 'utf8');
      equal(stage.steps[1].expect, expected, level.id + ': UI has exact lab stdout');
      equal(stage.steps[2].expect, fs.readFileSync(path.join(project, 'captures/test.txt'), 'utf8'), level.id + ': UI has exact test stdout');
      const walk = render(env, fixtures.find(record => record.level === level.id && record.stage === stageIndex));
      equal(walk.arena.querySelector('.dk-note').textContent.includes('JDK 21+'), true, level.id + ': Java prerequisite visible');
      equal(walk.arena.querySelector('.dk-note').textContent.includes('Node.js 18+'), true, level.id + ': launcher prerequisite visible');
    }
    const legacy = fixtures.find(record => record.type === 'docker' && !record.level.startsWith('cc-'));
    equal(render(env, legacy).arena.querySelector('.dk-note').textContent.includes('Node.js 18+'), true, 'Existing lab setup fallback preserved');
    const workers = render(env, fixtures.find(record => record.level === 'cc-workers' && record.stage === 0));
    equal(workers.arena.querySelector('.dr-codebox').innerHTML.includes('&lt;Runnable&gt;'), true, 'Raw Java generics escaped in rendered code');
    equal(workers.arena.querySelector('.dr-code').textContent.includes('BlockingQueue<Runnable>'), true, 'Java generic remains visible source text');
    equal(workers.arena.querySelector('runnable'), null, 'Java generic did not become an HTML element');
    console.log(`${checks} concurrency capture, prerequisite and code-rendering checks pass (real Java plus real renderers)`);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
