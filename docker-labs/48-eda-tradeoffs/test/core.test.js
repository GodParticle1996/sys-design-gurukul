const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { createQueue } = require('../lib/queue');
const { simulate } = require('../lib/flow');
const { createStep } = require('../lib/step');
const P = require('../tools/profiles');
const last = rows => rows.at(-1);

test('queue: FIFO, aur ttl ke baad phenko ya dead-letter', () => {
  const drop = createQueue({ ttlMs: 10 }), dead = createQueue({ ttlMs: 10, dlq: true });
  for (const q of [drop, dead]) { q.publish('a', 0); q.publish('b', 5); }
  assert.deepEqual(drop.take(5), { msg: 'a', waitedMs: 5 });
  assert.equal(drop.take(16), null, 'b 11 ms purana: retention ke bahar');
  assert.deepEqual(drop.stats(16), { depth: 0, oldestMs: 0, expired: 1, deadLettered: 0 });
  assert.equal(dead.take(16), null);
  assert.deepEqual(dead.stats(16), { depth: 0, oldestMs: 0, expired: 0, deadLettered: 2 });
});

test('burst: queue reject ko intezaar mein badalti hai', () => {
  const direct = last(simulate({ ...P.burst, queue: false }));
  assert.equal(direct.rejected, 400);
  assert.equal(direct.done, 700);
  const rows = simulate(P.burst);
  assert.equal(last(rows).rejected, 0);
  assert.equal(last(rows).done, 1100);
  assert.equal(Math.max(...rows.map(r => r.depth)), 400);
  assert.equal(last(rows).maxWaitMs, 20000);
  assert.equal(rows.findIndex((r, i) => i > 0 && r.depth === 0) + 1, 50);
  assert.equal(last(simulate({ ...P.burst, workers: 2 })).maxWaitMs, 5000);
});

test('sustained: aane ki raftaar zyada ho toh line kabhi khaali nahi', () => {
  const rows = simulate(P.sustained);
  rows.forEach((r, i) => assert.equal(r.depth, 9800 * (i + 1)));
  assert.equal(last(simulate({ ...P.sustained, workers: 50 })).depth, 0);
});

test('offline: retention se purane messages kho jaate (ya dead-letter)', () => {
  const drop = last(simulate({ ...P.offline, ttlMs: 3600000 }));
  const dead = last(simulate({ ...P.offline, ttlMs: 3600000, dlq: true }));
  const long = last(simulate({ ...P.offline, ttlMs: 4 * 86400000 }));
  assert.deepEqual([drop.done, drop.expired, drop.deadLettered], [3400, 600, 0]);
  assert.deepEqual([dead.done, dead.expired, dead.deadLettered], [3400, 0, 600]);
  assert.deepEqual([long.done, long.expired, long.maxWaitMs], [4000, 0, 90 * 60000]);
});

test('step: failure ya toh chup, ya OrderFailed khabar', async () => {
  const s = createStep({ name: 'stock', workMs: 0, failItem: 'gulab-jamun' });
  await assert.rejects(s.direct({ id: '4', item: 'gulab-jamun' }), /stock: gulab-jamun khatam/);
  const sent = [];
  const pub = async (topic, e) => sent.push([topic, e.type]);
  const ev = { data: { id: '4', item: 'gulab-jamun' } };
  assert.deepEqual(await s.onEvent(ev, pub, false), { ok: false, reason: 'stock: gulab-jamun khatam' });
  assert.deepEqual(sent, []);
  await s.onEvent(ev, pub, true);
  assert.deepEqual(sent, [['failed', 'OrderFailed']]);
  await s.onEvent({ data: { id: '5', item: 'thali' } }, pub, true);
  assert.deepEqual(sent.at(-1), [null, 'stockDone']);
});

test('chain: asli HTTP par teeno raaste', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'chain.js')],
    { encoding: 'utf8', timeout: 60000 });
  assert.match(out, /#104 gulab-jamun .*\| error \(stock: gulab-jamun khatam\)/);
  assert.match(out, /#204 gulab-jamun .*\| pending \(1500 ms tak\)/);
  assert.match(out, /#304 gulab-jamun .*\| failed \(stock: gulab-jamun khatam\)/);
  assert.equal((out.match(/\| confirmed/g) || []).length, 12);
});
