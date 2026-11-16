'use strict';
const test = require('node:test');
const assert = require('node:assert');
const L = require('../lib/latency');
const { startMesh, runLoad, tree, parseTraceparent, get } = require('../lib/mesh');
const C = require('../lib/cost');
const Q = require('../lib/queue');
const B = require('../lib/budget');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('ex0: average, two p99 definitions, merged histograms', () => {
  const v = L.videoCase();
  near(v.mean, 109.9, 1e-9); assert.strictEqual(v.p99, 10); near(v.p99lin, 109.9, 1e-6); assert.strictEqual(v.max, 10000);
  assert.strictEqual(L.videoCase({ slow: 2 }).p99, 10000);
  near(L.userSees(0.01, 100), 0.634, 0.001);
  const h = new Array(L.BOUNDS.length).fill(0); h[0] = 90; h[4] = 10;         // 90 in 0–5 ms, 10 in 50–100 ms
  assert.strictEqual(L.histQuantile(h, 99), 95);                               // rank 99 = 9th of 10 inside 50–100
  assert.ok(Number.isNaN(L.histQuantile(L.histogram([]), 99)) && Number.isNaN(L.histQuantile(h, NaN)));
  assert.strictEqual(L.histQuantile(h, -1), -Infinity); assert.strictEqual(L.histQuantile(h, 101), Infinity);
  assert.strictEqual(L.histQuantile(L.histogram([20000, 20000, 20000]), 99), 10000);   // +Inf bucket: a cap, not an estimate
  near(L.histQuantile(h, 50), 50 / 90 * 5, 1e-9);
  for (const c of Object.keys(L.HOST_CASES)) {
    const h = L.hosts(c), b = L.BOUNDS.findIndex(x => h.trueP99 <= x);
    assert.ok(h.mergedHistP99 > (b ? L.BOUNDS[b - 1] : 0) && h.mergedHistP99 <= L.BOUNDS[b], `${c}: merged p99 outside the true p99's bucket`);
    assert.ok(Math.abs(h.avgOfP99 - h.trueP99) / h.trueP99 > 0.5, `${c}: average of p99s should be far off`);
  }
});

test('ex1: real HTTP mesh — tree from parent ids, skewed log order, broken propagation', async () => {
  const m = await startMesh(); await runLoad(m, 50); m.close();
  const gw = m.spans.filter(s => s.service === 'gateway'), slow = gw.reduce((a, b) => (b.durMs > a.durMs ? b : a));
  const t = tree(m.spans, slow.trace);
  assert.deepStrictEqual(t.map(s => `${s.depth}:${s.service}`), ['0:gateway', '1:auth', '1:product', '2:db']);
  assert.ok(t[3].durMs >= 290 && t[3].durMs / t[0].durMs > 0.9, 'db span should hold most of the slow request');
  const logs = m.logs.filter(l => l.trace_id === slow.trace).sort((a, b) => a.ts - b.ts);
  assert.strictEqual(logs[0].service, 'product', 'skewed product clock should sort first');
  const b = await startMesh({ dropHeaderAt: 'product' }); await runLoad(b, 50); b.close();
  const bslow = b.spans.filter(s => s.service === 'gateway').reduce((a, c) => (c.durMs > a.durMs ? c : a));
  assert.deepStrictEqual(tree(b.spans, bslow.trace).map(s => s.service), ['gateway', 'auth', 'product']);
  assert.strictEqual(b.spans.filter(s => s.service === 'db' && s.parent === null).length, 50);
});

test('ex1: traceparent parsing and continuing a caller trace', async () => {
  const T = '4bf92f3577b34da6a3ce929d0e0e4736', P = '00f067aa0ba902b7';
  assert.deepStrictEqual(parseTraceparent(`00-${T}-${P}-01`), { trace: T, parent: P });
  for (const bad of [`00-${'0'.repeat(32)}-${P}-01`, `00-${T}-${'0'.repeat(16)}-01`, `ff-${T}-${P}-01`, `00-${T.toUpperCase()}-${P}-01`,
    `00-${T}-${P}-01-extra`, `00-${T.slice(1)}-${P}-01`, 'garbage', undefined]) assert.strictEqual(parseTraceparent(bad), null, String(bad));
  assert.deepStrictEqual(parseTraceparent(`01-${T}-${P}-01-future`), { trace: T, parent: P });   // higher version: read the known fields
  const m = await startMesh();
  await get(m.ports.gateway, '/checkout?sku=sku-1', { traceparent: `00-${T}-${P}-01` });
  await get(m.ports.gateway, '/checkout?sku=sku-2', { traceparent: `00-${'0'.repeat(32)}-${P}-01` });
  m.close();
  const t = tree(m.spans, T);
  assert.deepStrictEqual(t.map(s => `${s.depth}:${s.service}`), ['0:gateway', '1:auth', '1:product', '2:db']);
  assert.strictEqual(t[0].parent, P, 'the external parent id is kept');
  assert.ok(!m.spans.some(s => /^0+$/.test(s.trace)), 'an all-zero trace id starts a fresh trace');
});

test('ex2: costs and sampling', () => {
  near(C.logBytesPerDay({ reqPerMin: 1e6, bytesPerReq: 1000 }), 1.44e12, 1);
  assert.strictEqual(C.metricBytesPerDay({ series: 300 }), 3456000);
  assert.strictEqual(C.seriesUpperBound({ a: 3, b: 20, c: 5, u: 1e6 }), 3e8);
  const s = C.sampling();
  assert.strictEqual(s.tail.err, s.all.err); assert.strictEqual(s.tail.slow, s.all.slow);
  assert.ok(s.head.err <= 3 && Math.abs(s.head.n - 1000) < 100);
  near(s.tail.normal / s.all.normal, 0.01, 0.001);                              // tail also keeps ~1% of normal traces
});

test('ex3: queue simulator matches the formulas', () => {
  const S = 60, half = Q.sim({ gapS: 120, serviceS: S, customers: 400000 });
  near(half.meanWait, Q.mm1Wait(0.5, S), 3); near(half.pWaited, 0.5, 0.01); near(half.perHour, 30, 0.3);
  assert.strictEqual(Q.sim({ gapS: 65, serviceS: S, arrivals: 'fixed', service: 'fixed', customers: 10000 }).pWaited, 0);
  near(Q.sim({ gapS: 65, serviceS: S, service: 'fixed', customers: 400000 }).meanWait, Q.md1Wait(S / 65, S), 20);
  near(Q.sim({ gapS: S / (0.85 * 8), serviceS: S, servers: 8, customers: 400000 }).meanWait, Q.mmcWait(8, 0.85, S), 3);
  near(half.p99Wait, S / 0.5 * Math.log(100 * 0.5), 25);                         // M/M/1: P(wait > t) = ρ·e^(−(1−ρ)t/S)
  near(Q.erlangC(1, 0.5), 0.5, 1e-12); near(Q.erlangC(2, 1), 1 / 3, 1e-12); near(Q.mmcWait(2, 0.5, S), 20, 1e-9);
  near(Q.sim({ gapS: S / (0.5 * 2), serviceS: S, servers: 2, customers: 400000 }).meanWait, 20, 1.5);
  const grow = [10000, 100000].map(c => Q.sim({ gapS: S / 1.05, serviceS: S, customers: c, warmup: 0 }).meanWait);
  assert.ok(grow[1] > 4 * grow[0], 'above 100% busy the wait keeps growing');
});

test('ex4: budget and alert rules', () => {
  near(B.budgetMinutes(0.999), 43.2, 1e-9);
  const r = Object.fromEntries(B.INCIDENTS.map(i => [i.id, B.run(i)]));
  assert.strictEqual(r['outage-20m'].alerts['burn-1h'].afterMin, 1);
  assert.strictEqual(r['2pct-6h'].alerts['burn-1h'].afterMin, 44);
  assert.strictEqual(r['0.3pct-7d'].alerts['burn-1h'], null);
  assert.strictEqual(r['5pct-5m'].alerts.threshold.afterMin, 1); assert.strictEqual(r['5pct-5m'].alerts['burn-1h'], null);
  assert.strictEqual(r['0.2pct-10m'].alerts.threshold.afterMin, 5);
  near(r['0.3pct-7d'].budgetPct, 70, 1e-9);
  // strict burn thresholds (Workbook uses >), the video's 1% rule, budget at detection and reset times
  assert.strictEqual(r['2pct-6h'].alerts['burn-6h'].afterMin, 109); assert.strictEqual(r['2pct-6h'].alerts['burn-3d'].afterMin, 217);
  assert.strictEqual(r['0.3pct-7d'].alerts['burn-3d'].afterMin, 1441);
  near(r['2pct-6h'].alerts['burn-1h'].budgetUsedPct, 44 * 0.02 / 43.2 * 100, 1e-9);
  assert.strictEqual(r['2pct-6h'].alerts.video.afterMin, 5); assert.strictEqual(r['0.3pct-7d'].alerts.video, null);
  assert.strictEqual(r['outage-20m'].alerts['burn-1h'].resetMin, 4); assert.strictEqual(r['outage-20m'].alerts['burn-3d'].resetMin, 359);
  const medium = B.run({ id: 'm', rate: 0.008, minutes: 720 }).alerts;          // burn 8: only the 6-hour page should fire
  assert.strictEqual(medium['burn-1h'], null); assert.ok(medium['burn-6h'] && medium['burn-6h'].afterMin === 271);
  const small = { id: 's', rate: 0.0005, minutes: 10 };                         // a second SLO changes every threshold
  assert.strictEqual(B.run(small, 0.999).alerts.threshold, null); assert.ok(B.run(small, 0.9999).alerts.threshold);
});
