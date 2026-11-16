'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { run: meta, amplification } = require('../lib/metastable');
const { run: jit, average, STRATEGIES } = require('../lib/jitter');
const { run: chain } = require('../lib/deadline');
const { payments, users, balance } = require('../lib/idem');
const { dlqLoss, availability } = require('../lib/dlq');
const { rng } = require('../lib/rng');

test('metastable: short backoff and immediate retries stay stuck; long backoff and a token bucket recover; accounting holds', () => {
  assert.strictEqual(meta({ policy: 'none' }).recoveredAt, 0);
  const imm = meta({ policy: 'immediate' }), back = meta({ policy: 'backoff' }), bud = meta({ policy: 'budget' });
  assert.strictEqual(imm.recoveredAt, null); assert.ok(imm.amp > 2.5, `amp ${imm.amp}`);
  assert.strictEqual(back.recoveredAt, null);
  assert.ok(meta({ policy: 'backoff', backoffS: 16 }).recoveredAt !== null, 'long backoff windows recover');
  assert.ok(bud.recoveredAt !== null && bud.recoveredAt <= 1); assert.ok(bud.amp < 1.1); assert.ok(bud.retriesSent > 0, 'budget still retries');
  for (const x of bud.timeline.filter(r => r.t >= 25)) assert.ok(x.load - x.arrive <= 0.1 * x.arrive + 1e-6, `t=${x.t}`);   // ≤ 10% once the bucket is drained
  assert.ok(meta({ policy: 'immediate', base: 600 }).recoveredAt !== null, 'more headroom: recovers');
  for (const p of ['none', 'immediate', 'backoff', 'budget']) { const r = meta({ policy: p }); assert.ok(Math.abs(r.ok + r.gaveUp + r.outstanding - r.fresh) < 1e-6, p); }
  // backoff really spreads retries: with immediate retries the second after the spike carries far more retries
  assert.ok(back.timeline[20].load < imm.timeline[20].load);
  assert.ok(Math.abs(amplification(0.1, 4) - 1.111) < 1e-9); assert.strictEqual(amplification(1, 4), 4);
});

test('jitter: with zero network variance no-jitter needs N(N+1)/2 calls; jittered strategies need far fewer calls and less time', () => {
  assert.strictEqual(jit({ strategy: 'none', clients: 100, netMs: 0 }).calls, 5050);
  const none = average({ strategy: 'none', clients: 100 }, 5), full = average({ strategy: 'full', clients: 100 }, 5);
  assert.ok(full.calls * 1.5 < none.calls && full.ms * 5 < none.ms, `none ${none.calls}/${none.ms} full ${full.calls}/${full.ms}`);
  const r = rng(3);
  for (let i = 0; i < 1000; i++) { const v = 100, e = STRATEGIES.equal(v, r), f = STRATEGIES.full(v, r), s = STRATEGIES.small(v, r);
    assert.ok(e >= 50 && e <= 100); assert.ok(f >= 0 && f <= 100); assert.ok(s >= 80 && s <= 120); }
});

test('deadline: retries without cancellation keep slow work running after the user left; propagation alone is not enough', () => {
  assert.strictEqual(chain({ policy: 'naive' }).afterUser.C, 10000);
  const t = chain({ policy: 'timeouts' }); assert.strictEqual(t.calls.C, 9); assert.strictEqual(t.afterUser.C, 127800); assert.strictEqual(t.held.A, 9200);
  const nc = chain({ policy: 'no-cancel' }); assert.strictEqual(nc.afterUser.C, 127800);
  const d = chain({ policy: 'deadline' }); assert.strictEqual(d.afterUser.A + d.afterUser.B + d.afterUser.C, 0); assert.strictEqual(d.calls.C, 9);
  assert.strictEqual(chain({ policy: 'deadline', attempts: 1 }).held.A, 3000, 'one try = one 3 s timeout');
  assert.strictEqual(chain({ policy: 'deadline', userMs: 100000 }).held.A, 9200, 'a long user deadline does not stretch A');
  for (const p of ['naive', 'timeouts', 'no-cancel', 'deadline']) assert.strictEqual(chain({ policy: p, cMs: 100 }).userGotAnswer, true);
});

test('idempotency: key + in-flight lock + parameter check; snapshots; ownership tokens; expiry; delete; add vs set', () => {
  const a = payments({ useKeys: false }); a.charge(null, { amount: 100 }, 0); a.charge(null, { amount: 100 }, 1); assert.strictEqual(a.charges(), 2);
  const b = payments(); const r1 = b.charge('k', { amount: 100 }, 0), r2 = b.charge('k', { amount: 100 }, 1);
  assert.strictEqual(b.charges(), 1); assert.deepStrictEqual(r2.body, r1.body); assert.strictEqual(r2.replay, true);
  r2.body.amount = 999; assert.strictEqual(b.charge('k', { amount: 100 }, 2).body.amount, 100, 'replay is a copy');
  assert.strictEqual(b.charge('k', { amount: 999 }, 2).status, 422);
  const o = payments(); const p = { amount: 100, currency: 'inr' }; o.charge('k', p, 0); p.amount = 200;
  assert.strictEqual(o.charge('k', { amount: 200, currency: 'inr' }, 1).status, 422, 'params were snapshotted');
  assert.strictEqual(o.charge('k', { currency: 'inr', amount: 100 }, 2).status, 200, 'key order does not matter');
  const c = payments(); c.begin('k', { amount: 1 }, 0); assert.strictEqual(c.begin('k', { amount: 1 }, 1).status, 409);
  const c2 = payments({ lockInFlight: false, ownership: false }); const f1 = c2.begin('k', { amount: 1 }, 0), f2 = c2.begin('k', { amount: 1 }, 1);
  c2.finish('k', { amount: 1 }, f1.token); c2.finish('k', { amount: 1 }, f2.token); assert.strictEqual(c2.charges(), 2);
  const l = payments({ leaseMs: 10 }); const old = l.begin('k', { amount: 1 }, 0), neu = l.begin('k', { amount: 1 }, 11);
  assert.strictEqual(l.finish('k', { amount: 1 }, neu.token, 12).status, 200);
  assert.strictEqual(l.finish('k', { amount: 1 }, old.token, 13).status, 409); assert.strictEqual(l.finish('k', { amount: 1 }, neu.token, 14).status, 409);
  assert.strictEqual(l.charges(), 1);
  const d = payments(); d.charge('k', { amount: 1 }, 0); d.charge('k', { amount: 1 }, 25 * 3600e3); assert.strictEqual(d.charges(), 2);
  const u = users(); const id = u.create('A'); const v = u.get(id).v; u.del(id, v); u.create('B');
  assert.strictEqual(u.del(10, v), 412); assert.ok(u.get(10)); assert.strictEqual(u.del(10), 204);
  const x = balance(500); x.add(100); x.add(100); assert.strictEqual(x.get().b, 700);
  const y = balance(500); y.set(600, 0); assert.strictEqual(y.set(600, 0).status, 412); assert.strictEqual(y.get().b, 600);
});

test('DLQ retention (standard: from first send; FIFO: reset); availability = MTBF / (MTBF + MTTR)', () => {
  const rows = [[96, 48, true, 1 / 3], [96, 12, true, 0], [336, 48, true, 0], [336, 300, true, 0.5], [96, 48, false, 0]];
  for (const [r, look, keep, want] of rows) assert.ok(Math.abs(dlqLoss({ dlqRetentionH: r, lookAfterH: look, keepsOriginalTime: keep }) - want) < 0.01, `${r}/${look}/${keep}`);
  assert.throws(() => dlqLoss({ sourceRetentionH: 24, failWindowH: 72 }));
  assert.ok(Math.abs(availability(365 * 24, 24) - 0.99727) < 1e-5);
  assert.ok(availability(24, 0.1 / 3600) > 0.99999);
});
