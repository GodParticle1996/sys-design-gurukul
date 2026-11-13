'use strict';
const test = require('node:test');
const assert = require('node:assert');
const c = require('../lib/crdt');
const { rng } = require('../lib/rng');
const bank = require('../lib/bank');
const lad = require('../lib/session');
const con = require('../lib/conflicts');
const sb = require('../lib/splitbrain');
const pac = require('../lib/pacelc');

test('CRDT merges: order and repeats do not change the result (G-Counter, OR-Set); version vectors spot concurrency', () => {
  const r = rng(1);
  for (let k = 0; k < 50; k++) {
    const reps = ['A', 'B', 'C'].map(n => { const g = c.gcounter(); c.gInc(g, n, 1 + Math.floor(r() * 9)); return g; });
    const [a, b, x] = reps, v = s => c.gValue(s);
    assert.strictEqual(v(c.gMerge(a, b)), v(c.gMerge(b, a)));
    assert.strictEqual(v(c.gMerge(c.gMerge(a, b), x)), v(c.gMerge(a, c.gMerge(b, x))));
    assert.strictEqual(v(c.gMerge(a, a)), v(a));
  }
  const base = c.orset(); c.orAdd(base, 'apple', 'X');
  const A = c.orMerge(base, c.orset()), B = c.orMerge(base, c.orset());
  c.orRemove(A, 'apple'); c.orAdd(B, 'apple', 'B');                     // concurrent remove and re-add: add wins
  assert.deepStrictEqual(c.orValue(c.orMerge(A, B)), ['apple']);
  assert.deepStrictEqual(c.orValue(c.orMerge(A, B)), c.orValue(c.orMerge(B, A)));
  const seen = c.orMerge(A, B); c.orRemove(seen, 'apple');             // a remove that has SEEN every tag removes it
  assert.deepStrictEqual(c.orValue(seen), []);
  assert.strictEqual(c.vvCompare({ A: 1 }, { A: 2 }), 'before');
  assert.strictEqual(c.vvCompare({ A: 2, B: 1 }, { A: 1, B: 1 }), 'after');
  assert.strictEqual(c.vvCompare({ A: 2 }, { A: 1, B: 1 }), 'concurrent');
  assert.strictEqual(c.vvCompare({ A: 1 }, { A: 1 }), 'same');
  const odd = c.orset();                                                // names that live on Object.prototype are plain keys here
  for (const k of ['constructor', 'toString', '__proto__']) c.orAdd(odd, k, 'A');
  c.orRemove(odd, 'toString');
  assert.deepStrictEqual(c.orValue(c.orMerge(odd, c.orset())), ['__proto__', 'constructor']);
  assert.strictEqual(c.gValue(c.gMerge(c.gInc(c.gcounter(), 'constructor', 2), c.gInc(c.gcounter(), '__proto__', 3))), 5);
  assert.strictEqual(c.vvCompare(c.vvBump({}, 'toString'), c.vvBump({}, '__proto__')), 'concurrent');
});

test('bank split: CP refuses the small side and never overpays; LWW loses withdrawals from the books; offline limit bounds the loss', () => {
  const cp = bank.run('CP quorum'), lww = bank.run('AP + LWW'), led = bank.run('AP + ledger'), lim = bank.run('AP + offline ₹20');
  assert.strictEqual(cp.served.min, 0); assert.strictEqual(cp.beyond, 0); assert.strictEqual(cp.overdrawn, 0);
  assert.strictEqual(cp.served.maj, 1000);
  assert.ok(cp.readErr.min > 600 && cp.readErr.min < 1000, `${cp.readErr.min}`);   // ~40% of 2,000 balance checks
  for (const ap of [lww, led, lim]) assert.strictEqual(ap.readErr.min, 0);
  assert.strictEqual(lww.paid, led.paid); assert.ok(lww.unrecorded > 0); assert.strictEqual(led.unrecorded, 0);
  assert.ok(led.overdrawn > 0 && led.beyond === lww.beyond);
  assert.ok(lim.beyond <= 20 * lim.overdrawn && lim.beyond > 0);
});

test('lag model: replicas apply in order; read-your-writes misses match the lag ranges; fixes remove the anomalies', () => {
  const r = rng(2);
  for (let k = 0; k < 200; k++) for (const rep of lad.shard([0, 100, 200, 5000], r)) for (let i = 1; i < rep.length; i++) assert.ok(rep[i] >= rep[i - 1]);
  const a = lad.ryw('none', 20000, rng(3)).bad / 20000;                // expected (0 + 0.7 + 0.94) / 3 = 0.5467
  assert.ok(Math.abs(a - 0.5467) < 0.02, `${a}`);
  const none = lad.ryw('none', 3000, rng(9)), token = lad.ryw('token', 3000, rng(9)), sticky = lad.ryw('sticky', 3000, rng(9));
  assert.strictEqual(token.fromPrimary, none.bad, 'the token sends exactly the stale cases to the primary');
  assert.strictEqual(sticky.fromPrimary, 3000);
  assert.strictEqual(token.bad, 0); assert.strictEqual(sticky.bad, 0);
  assert.strictEqual(lad.causal('deps', 5000, rng(6)).hidden, lad.causal('none', 5000, rng(6)).bad, 'every unsafe answer is held back');
  assert.strictEqual(lad.monotonic('sticky', 2000, rng(4)).bad, 0);
  assert.strictEqual(lad.monotonic('token', 2000, rng(4)).bad, 0);
  assert.ok(lad.monotonic('none', 2000, rng(4)).bad > 0);
  assert.ok(lad.causal('none', 5000, rng(5)).bad > 0);
  assert.strictEqual(lad.causal('deps', 5000, rng(5)).bad, 0);
});

test('conflicts: LWW loses likes and cart adds; the union brings back a removed item; CRDTs keep the intent', () => {
  const l = con.likes(); assert.strictEqual(l.crdt, l.truth); assert.ok(l.lww < l.truth);
  const n = con.names(4000, 5000, 7); assert.strictEqual(n.conflicts, 4000);
  assert.ok(Math.abs(n.wrong / 4000 - 0.0799) < 0.02, `${n.wrong}`);   // P(skewed LWW keeps the earlier write) = s/T − s²/2T²
  const k = con.carts(200);
  assert.strictEqual(k.lww.lostAdd, 200); assert.strictEqual(k.union.back, 200);
  assert.deepStrictEqual(k.orset, { lostAdd: 0, back: 0 });
});

test('split brain: without a quorum the small side\'s acked writes are lost; fencing stops a woken old leader', () => {
  const nq = sb.election('no quorum'), q = sb.election('majority quorum');
  assert.ok(nq.lostOnHeal > 0); assert.strictEqual(q.lostOnHeal, 0); assert.strictEqual(q.refused, nq.lostOnHeal);
  assert.strictEqual(sb.zombie(false).staleWins, true);
  const f = sb.zombie(true); assert.strictEqual(f.staleWins, false); assert.strictEqual(f.rejected, 50);
  assert.ok(Math.abs(sb.downtime(99.999) - 315.576) < 0.001);           // 5 min 15.6 s
});

test('PACELC: sync writes are on at least one replica when acked; async can lose acked writes in flight', async () => {
  for (const mode of ['sync-any-1', 'sync-all']) {
    const cl = pac.cluster(), seenAtAck = [];
    await Promise.all(Array.from({ length: 20 }, (_, i) => cl.write(i, mode).then(() => seenAtAck.push(cl.reps.filter(r => r.applied.has(i)).length))));
    assert.ok(seenAtAck.every(n => n >= (mode === 'sync-all' ? 2 : 1)), `${mode}: ${seenAtAck}`);
  }
  // sync-all: both replicas have the write at ~30 ms, the primary dies before the far ack returns (~60 ms): no "done"
  const mid = pac.cluster(); let said = false;
  mid.write(7, 'sync-all').then(() => { said = true; });
  await new Promise(r => setTimeout(r, 40)); mid.kill(); await new Promise(r => setTimeout(r, 60));
  assert.ok(mid.reps.every(r => r.applied.has(7)) && !said, 'a dead primary must not report success');
  const cl = pac.cluster(); let ok = false;
  cl.write(1, 'async').then(() => { ok = true; }); await Promise.resolve(); cl.kill();
  await new Promise(r => setTimeout(r, 70));
  assert.ok(ok && cl.reps.every(r => !r.applied.has(1)), 'async said done, then the primary died with the packet in flight');
});
