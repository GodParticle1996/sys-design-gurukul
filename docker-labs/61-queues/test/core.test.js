'use strict';
const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os'), path = require('node:path'), fs = require('node:fs');
const { async: asyncRun, spikeForWait } = require('../lib/buffer');
const { queue } = require('../lib/queue');
const { log } = require('../lib/log');
const { prepare, run: runAppend } = require('../lib/append');
const { murmur2, partitionFor, ordering } = require('../lib/partition');
const { run: runBp } = require('../lib/backpressure');
const { consumers, crashPoints, interleavings, producers, producerOutcomes } = require('../lib/crash');

test('buffer: a worker no faster than normal traffic never drains the spike; spare capacity does', () => {
  assert.strictEqual(asyncRun({ consumer: 10 }).drainedAtSec, null);
  assert.ok(asyncRun({ consumer: 20 }).drainedAtSec !== null);
  assert.ok(Math.abs(spikeForWait() - 6.06) < 0.1);
  const a = asyncRun({ consumer: 10 });
  assert.strictEqual(a.atSpikeEnd, 59400); assert.strictEqual(a.maxWaitSec, 5940);   // FIFO wait = messages ahead ÷ worker rate
});

test('queue vs log: an undeleted message comes back; each log group reads everything; replay stops at retention', () => {
  const q = queue({ visibility: 30 });
  q.send('a', 0);
  assert.ok(q.receive(0)); assert.strictEqual(q.receive(10), null);
  const first = { receipt: '1:1' }, again = q.receive(30); assert.ok(again && again.body === 'a');
  assert.strictEqual(q.delete(first.receipt), false, 'stale receipt deletes nothing');
  assert.strictEqual(q.delete(again.receipt), true); assert.strictEqual(q.receive(100), null, 'deleted for good');
  const short = queue({ retention: 100 }); short.send('x', 0);
  assert.strictEqual(short.receive(100), null); assert.strictEqual(short.stats().expired, 1);
  const l = log();
  for (let i = 0; i < 100; i++) l.append(i, 0);
  assert.strictEqual(l.poll('x').length, 100); assert.strictEqual(l.poll('y').length, 100); assert.strictEqual(l.poll('x').length, 0);
  const replay = days => { const g = log({ retention: days * 86400 }), now = 21 * 86400;
    for (let d = 0; d < 21; d++) for (let i = 0; i < 10; i++) g.append(i, d * 86400 + i);
    g.trim(now); g.seekToTime('a', now - 14 * 86400); return g.poll('a').length; };
  assert.strictEqual(replay(14), 140); assert.strictEqual(replay(7), 70); assert.strictEqual(replay(30), 140, 'seek, not retention, sets the start');
});

test('append: real writes work; 1 MB writes beat 4 KB writes with O_DIRECT', t => {
  const f = path.join(os.tmpdir(), `lab61-test-${process.pid}.bin`);
  prepare(f, 16);
  try {
    const small = runAppend(f, { mb: 16, mode: 'seq', direct: true }), big = runAppend(f, { mb: 16, mode: 'seq', direct: true, size: 1 << 20 });
    assert.ok(small.mbps > 0 && big.mbps > 1.5 * small.mbps, `4 KB ${small.mbps} vs 1 MB ${big.mbps}`);
  } catch (e) { if (e.code === 'EINVAL') t.skip('O_DIRECT not supported here'); else throw e; } finally { fs.unlinkSync(f); }
});

test('partitions: Kafka murmur2 vectors; a key keeps order, round-robin does not; 6 → 8 moves most keys', () => {
  assert.strictEqual(murmur2(Buffer.from('21')), -973932308);
  assert.strictEqual(murmur2(Buffer.from('foobar')), -790332482);
  assert.strictEqual(murmur2(Buffer.from('a-little-bit-long-string')), -985981536);
  assert.strictEqual(partitionFor('21', 6), 0, 'negative hash: Kafka masks the sign bit, not Math.abs');
  assert.strictEqual(ordering(true), 0); assert.ok(ordering(false) > 500);
  let moved = 0; for (let i = 0; i < 10000; i++) if (partitionFor('user-' + i, 6) !== partitionFor('user-' + i, 8)) moved++;
  assert.ok(moved > 7000 && moved < 8000, String(moved));
});

test('backpressure: drop loses acked writes, reject does not; scaling past the DB wastes work and fills the DLQ', () => {
  const drop = runBp({ overflow: 'drop' }), reject = runBp({ overflow: 'reject' });
  assert.ok(drop.ackedLost > 0); assert.strictEqual(reject.ackedLost, 0); assert.strictEqual(reject.rejected, drop.ackedLost);
  const auto = runBp({ overflow: 'reject', scale: 'auto' }), capped = runBp({ overflow: 'reject', scale: 'db' });
  assert.ok(auto.wasted > 0 && auto.dlq > 0); assert.strictEqual(capped.wasted, 0); assert.ok(capped.done > auto.done);
  const block = runBp({ overflow: 'block' });
  assert.strictEqual(block.userErrors, drop.ackedLost); assert.ok(block.blockedSec > 0);
  for (const x of [drop, reject, block, auto, capped])                 // every offered signup is accounted for
    assert.ok(Math.abs(x.done + x.ackedLost + x.rejected + x.userErrors + x.dlq + x.pending - 168000) < 2, JSON.stringify(x));
  assert.strictEqual(require('../lib/backpressure').poison().stuckSec, 150);
});

test('crash points: check-then-act double charges; one transaction or a provider key never does; outbox loses nothing', () => {
  const naive = consumers['check → charge → record (video)'];
  assert.deepStrictEqual(crashPoints(naive), [1, 2, 1]);
  assert.strictEqual(interleavings(naive).filter(x => x > 1).length, 18);
  for (const k of ['ek DB transaction: id insert (UNIQUE) + charge', 'provider ko Idempotency-Key = message id']) {
    assert.ok(crashPoints(consumers[k]).every(x => x === 1)); assert.ok(interleavings(consumers[k]).every(x => x === 1));
  }
  const [dbFirst, pubFirst, outbox] = Object.values(producers).map(producerOutcomes);
  assert.strictEqual(dbFirst.lost, 1); assert.strictEqual(pubFirst.phantom, 2);
  assert.strictEqual(outbox.lost + outbox.phantom, 0); assert.strictEqual(outbox.duplicate, 1);
});
