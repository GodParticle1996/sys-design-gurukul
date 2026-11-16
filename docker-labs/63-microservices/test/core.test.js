'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { checkStock, fnCall, serve, httpCalls } = require('../lib/callcost');
const { run: fan, theoryTouched } = require('../lib/fanout');
const { percentile } = require('../lib/stats');
const { PROTOCOLS, simulate, summary, recoveryCrashes } = require('../lib/twodb');
const { copies, paths, withinTeams, renameDeploys } = require('../lib/arith');

test('call cost: same answer over HTTP; a function call is far cheaper; a new connection costs more than keep-alive', async () => {
  assert.strictEqual(checkStock('sku-42'), 14); assert.strictEqual(checkStock('nope'), 0);
  const f = fnCall(), srv = await serve();
  const keep = await httpCalls(srv, 300, true), fresh = await httpCalls(srv, 150, false);
  srv.close();
  assert.deepStrictEqual(keep.last, { status: 200, available: 14 }, 'HTTP gives the same answer as the function');
  assert.ok(keep.p50 * 1000 > 100 * f, `fn ${f} ns, http ${keep.p50} µs`);
  assert.ok(fresh.p50 > keep.p50, `fresh ${fresh.p50} vs keep ${keep.p50}`);
});

test('fan-out: sequential adds latency, parallel waits for the slowest; exposure 1 − 0.99^n only when hiccups are independent', () => {
  const s = fan({ calls: 10, mode: 'sequential', requests: 20000 }), p = fan({ calls: 10, mode: 'parallel', requests: 20000 });
  assert.ok(s.p50 > 15 && s.p50 < 25, `seq p50 ${s.p50}`); assert.ok(p.p50 < 3.5, `par p50 ${p.p50}`);
  assert.ok(Math.abs(s.touched - theoryTouched(10)) < 0.01); assert.strictEqual(p.p99, 50);
  assert.ok(Math.abs(theoryTouched(10) - 0.0956) < 0.001);
  const none = fan({ calls: 10, mode: 'parallel', requests: 5000, slowP: 0 }); assert.ok(none.p99 <= 3, `no hiccups: p99 ${none.p99}`);
  const sh = fan({ calls: 10, mode: 'parallel', requests: 50000, shared: true }); assert.ok(Math.abs(sh.touched - 0.01) < 0.003, `shared ${sh.touched}`);
  assert.strictEqual(percentile([1, 2, 3, 4], 50), 2); assert.strictEqual(percentile([1, 2, 3, 4], 99), 4);
});

test('two databases: final states; saga recovery is idempotent even if recovery crashes; 2PC readers can see the middle; prepared participants block', () => {
  for (const k of Object.keys(PROTOCOLS)) {
    if (k.startsWith('saga, progress')) continue;
    assert.deepStrictEqual([simulate(k, null).stock, simulate(k, null).orders], [9, 1], `${k} success`);
    assert.deepStrictEqual([simulate(k, null, { orderFails: true }).stock, simulate(k, null, { orderFails: true }).orders], [10, 0], `${k} abort`);
  }
  assert.deepStrictEqual(summary('ek DB, ek transaction'), { cases: 4, wrongEnd: 0, seenMid: 0, blocked: 0 });
  assert.strictEqual(simulate('saga, progress sirf memory mein', 0).wrongEnd, true);
  const d = summary('saga + durable saga log');
  assert.strictEqual(d.wrongEnd, 0); assert.ok(d.seenMid > 0);
  for (const o of [{}, { orderFails: true }]) assert.strictEqual(recoveryCrashes('saga + durable saga log', o).wrongEnd, 0, 'recovery may crash and rerun');
  const t = summary('2PC (do-phase commit)'); assert.strictEqual(t.wrongEnd, 0); assert.strictEqual(t.blocked, 4); assert.ok(t.seenMid > 0);
  assert.strictEqual(simulate('2PC (do-phase commit)', 2).blocked, true, 'COMMIT logged but not delivered: still blocked');
  assert.strictEqual(summary('2PC (do-phase commit)', { orderFails: true }).blocked, 1);
  for (const c of [0, 1, 2, 3]) { const r = simulate('2PC (do-phase commit)', c); assert.ok([9, 10].includes(r.stock) && r.wrongEnd === false); }
});

test('arithmetic: copies multiply max DB connections; Brooks paths; within-team totals; rename deploys', () => {
  assert.deepStrictEqual(copies({ n: 100 }), { idleGB: 50, dbConns: 2000 });
  assert.strictEqual(paths(20), 190); assert.strictEqual(paths(5000), 12497500);
  assert.deepStrictEqual([20, 100, 5000].map(n => withinTeams(n)), [62, 342, 17500]);
  assert.deepStrictEqual([1, 2, 3, 5].map(renameDeploys), [1, 3, 4, 6]);
});
