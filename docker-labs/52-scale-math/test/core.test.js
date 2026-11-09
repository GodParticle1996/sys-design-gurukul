'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { percentile, summary, rng } = require('../lib/stats');
const { tailSample, fanout, queueRun, hedgeRun, amdahl, Heap } = require('../lib/sim');
const { pool } = require('../lib/pool');

test('percentile: nearest rank, and bad input is refused', () => {
  const sorted = [12, 14, 15, 15, 16, 18, 19, 21, 25, 900];
  assert.strictEqual(percentile(sorted, 50), 16);
  assert.strictEqual(percentile(sorted, 90), 25);
  assert.strictEqual(percentile(sorted, 100), 900);
  // rank = ceil(p% × N): rounding up is the rule
  assert.strictEqual(percentile([1, 2, 3], 50), 2);
  assert.strictEqual(percentile([1, 2, 3], 99), 3);
  assert.strictEqual(percentile([1, 2, 3], 1), 1);
  assert.throws(() => percentile([], 50));
  assert.throws(() => percentile(sorted, 0));
  assert.throws(() => summary([]));
});

test('same seed gives the same numbers; another seed differs', () => {
  const a = tailSample(52, 1000, 0.015).times, b = tailSample(52, 1000, 0.015).times, c = tailSample(53, 1000, 0.015).times;
  assert.deepStrictEqual(a, b);
  assert.notDeepStrictEqual(a, c);
  const r = rng(1);
  for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test('tail: mean lands far above the median when 1.5% are slow', () => {
  const s = summary(tailSample(52, 100000, 0.015).times);
  assert.ok(s.p50 < 50 && s.mean > 100 && s.p99 > 2000, JSON.stringify(s));
});

test('fanout: independent slowness follows 1 − 0.99^N; shared slowness stays near 1%', () => {
  for (const n of [10, 50, 100]) {
    const r = fanout(52, 20000, n, 0.01, 'independent');
    const slow = r.page.filter(t => t >= 1000).length / r.page.length;
    assert.ok(Math.abs(slow - (1 - 0.99 ** n)) < 0.02, `${n}: ${slow}`);
  }
  const shared = fanout(52, 20000, 100, 0.01, 'shared');
  const slow = shared.page.filter(t => t >= 1000).length / shared.page.length;
  assert.ok(slow < 0.02, String(slow));
  assert.ok(Math.abs(shared.slowCallShare - 0.01) < 0.003);
  assert.throws(() => fanout(52, 10, 0, 0.01, 'independent'));
  assert.throws(() => fanout(52, 10, 3, 0.01, 'other'));
});

test('knee: simulated mean matches queue theory at 50% and 80% load', () => {
  for (const rho of [0.5, 0.8]) {
    const mm1 = summary(queueRun(52, 300000, rho, 10, 'random').resp).mean;
    const md1 = summary(queueRun(52, 300000, rho, 10, 'fixed').resp).mean;
    assert.ok(Math.abs(mm1 / (10 / (1 - rho)) - 1) < 0.05, `M/M/1 ${rho}: ${mm1}`);
    assert.ok(Math.abs(md1 / (10 + rho * 10 / (2 * (1 - rho))) - 1) < 0.05, `M/D/1 ${rho}: ${md1}`);
  }
  assert.throws(() => queueRun(52, 10, 1, 10, 'random'));
});

test('hedge (seed 52 samples): helps independent stragglers at low load; not these heavy-request runs; runs away without a budget', () => {
  const p95 = r => summary(r.resp).p95, p99 = r => summary(r.resp).p99;
  const base = hedgeRun(52, 50000, { rho: 0.3, policy: 'none', stragglers: 'independent' });
  const cancel = hedgeRun(52, 50000, { rho: 0.3, policy: 'hedge-cancel', hedgeAfter: p95(base), stragglers: 'independent', budget: 0.05 });
  assert.ok(p99(cancel) < p99(base) * 0.8, `${p99(cancel)} vs ${p99(base)}`);
  assert.ok(cancel.hedgedShare <= 0.05 + 1e-9);

  const heavyBase = hedgeRun(52, 50000, { rho: 0.3, policy: 'none', stragglers: 'heavy' });
  const heavy = hedgeRun(52, 50000, { rho: 0.3, policy: 'hedge', hedgeAfter: p95(heavyBase), stragglers: 'heavy' });
  assert.ok(p99(heavy) >= p99(heavyBase), `${p99(heavy)} vs ${p99(heavyBase)}`);

  const busyBase = hedgeRun(52, 50000, { rho: 0.6, policy: 'none', stragglers: 'independent' });
  const runaway = hedgeRun(52, 50000, { rho: 0.6, policy: 'hedge', hedgeAfter: p95(busyBase), stragglers: 'independent' });
  const capped = hedgeRun(52, 50000, { rho: 0.6, policy: 'hedge', hedgeAfter: p95(busyBase), stragglers: 'independent', budget: 0.05 });
  assert.ok(runaway.hedgedShare > 0.5, String(runaway.hedgedShare));
  assert.ok(capped.hedgedShare <= 0.05 + 1e-9, String(capped.hedgedShare));
  assert.throws(() => hedgeRun(52, 10, { rho: 0.3, policy: 'hedge', stragglers: 'independent' }));
});

test('hedge budget is never exceeded, even on tiny samples', () => {
  const opts = { rho: 0.3, policy: 'hedge', stragglers: 'independent', hedgeAfter: 0.00001, budget: 0.05 };
  for (const n of [1, 19, 20, 21, 41, 1000]) {
    const r = hedgeRun(52, n, opts);
    assert.ok(Math.round(r.hedgedShare * n) <= Math.floor(0.05 * n + 1e-9), `${n}: ${r.hedgedShare * n}`);
  }
});

test('cancel drops spare copies still in line, lets running ones finish, and beats budget-only when busy', () => {
  const p95 = r => summary(r.resp).p95, p99 = r => summary(r.resp).p99;
  for (const rho of [0.3, 0.85]) {
    const d = p95(hedgeRun(52, 50000, { rho, policy: 'none', stragglers: 'independent' }));
    const plain = hedgeRun(52, 50000, { rho, policy: 'hedge', hedgeAfter: d, stragglers: 'independent', budget: 0.05 });
    const cancel = hedgeRun(52, 50000, { rho, policy: 'hedge-cancel', hedgeAfter: d, stragglers: 'independent', budget: 0.05 });
    assert.ok(Math.abs(plain.extraStartedShare - plain.hedgedShare) < 1e-12, 'without cancel every sent copy runs');
    assert.ok(cancel.extraStartedShare < cancel.hedgedShare * 0.6, `queued copies dropped at ${rho}`);
    assert.ok(cancel.extraStartedShare > 0, `some losing copies had already started at ${rho}`);
    if (rho === 0.85) assert.ok(p99(cancel) < p99(plain), `${p99(cancel)} vs ${p99(plain)}`);
  }
});

test('heavy duplicates: extra service time counts milliseconds, not copies', () => {
  const d = summary(hedgeRun(52, 50000, { rho: 0.3, policy: 'none', stragglers: 'heavy' }).resp).p95;
  const r = hedgeRun(52, 50000, { rho: 0.3, policy: 'hedge-cancel', hedgeAfter: d, stragglers: 'heavy', budget: 0.05 });
  assert.ok(r.extraWorkShare > 5 * r.extraStartedShare, `${r.extraWorkShare} vs ${r.extraStartedShare}`);
});

test('amdahl pool: the locked share is the same at every worker count', async () => {
  for (const n of [1, 5, 12]) {
    const p = pool(n);
    try {
      assert.strictEqual((await p.run(400, 20)).locked, 20);
      assert.strictEqual((await p.run(401, 5)).locked, 81);
    } finally { await p.close(); }
  }
});

test('heap pops in time order, ties by sequence', () => {
  const h = new Heap();
  [[5, 1], [1, 2], [5, 0], [3, 3]].forEach(([t, seq]) => h.push({ t, seq }));
  assert.deepStrictEqual([h.pop(), h.pop(), h.pop(), h.pop()].map(e => [e.t, e.seq]), [[1, 2], [3, 3], [5, 0], [5, 1]]);
});

test('amdahl formula: 5% serial caps the speed-up at 20×', () => {
  assert.strictEqual(amdahl(0.05, 1), 1);
  assert.ok(Math.abs(amdahl(0.05, 8) - 5.93) < 0.01);
  assert.ok(amdahl(0.05, 1e9) < 20 && amdahl(0.05, 1e9) > 19.99);
});

test('shared lock: 4 real worker threads start together; 1,00,000 unguarded increments each, final count exact', async () => {
  // Without lock()/unlock() this same run loses most increments (about 1.4–1.6 lakh of 4 lakh kept).
  const buf = new SharedArrayBuffer(12);
  const workFile = path.join(__dirname, '..', 'lib', 'work.js');
  const code = `
    const { workerData, parentPort } = require('node:worker_threads');
    const { lock, unlock } = require(${JSON.stringify(workFile)});
    const cell = new Int32Array(workerData, 0, 1), count = new Int32Array(workerData, 4, 1), go = new Int32Array(workerData, 8, 1);
    parentPort.postMessage('ready');
    Atomics.wait(go, 0, 0);
    for (let i = 0; i < 100000; i++) { lock(cell); const v = count[0]; count[0] = v + 1; unlock(cell); }
    parentPort.postMessage('done');`;
  const workers = Array.from({ length: 4 }, () => new Worker(code, { eval: true, workerData: buf }));
  const next = w => new Promise((resolve, reject) => { w.once('message', resolve); w.once('error', reject); });
  await Promise.all(workers.map(next));
  const go = new Int32Array(buf, 8, 1);
  Atomics.store(go, 0, 1);
  Atomics.notify(go, 0);
  await Promise.all(workers.map(w => next(w).then(() => w.terminate())));
  assert.strictEqual(new Int32Array(buf, 4, 1)[0], 400000);
});
