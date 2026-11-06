const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createConsumer } = require('../lib/consumer');
const { createBus } = require('../lib/bus');
const { event, seed, bytes } = require('../lib/events');

test('version guard is per order, ignores equal version and isolates snapshot copies', async () => {
  const c = createConsumer({ name: 'delivery', mode: 'fat' });
  const row = { ...seed(), version: 2 }, e = event('fat', row);
  await c.accept(e);
  e.state.address = 'mutated by caller';
  await c.accept(event('fat', row));
  await c.accept(event('fat', { ...seed(43), version: 1 }));
  const state = c.state();
  state.copies[0].address = 'mutated by reader';
  assert.equal(c.state().copies[0].address, row.address);
  assert.deepEqual([c.state().completed, c.state().skipped, c.state().copies.length], [2, 1, 2]);
});
test('failed or behind-owner gap repair keeps the old copy; newer snapshot subsumes late deltas', async () => {
  let answer = 'offline';
  const c = createConsumer({ name: 'delivery', mode: 'delta', load: async () => {
    if (answer === 'offline') throw Error('offline');
    return structuredClone(answer);
  } });
  await c.accept(event('delta', { id: 42, version: 1 }, seed()));
  const third = event('delta', { id: 42, version: 3 }, { phone: '+1-555-0199' });
  await assert.rejects(c.accept(third), /offline/);
  answer = { ...seed(), version: 2 };
  await assert.rejects(c.accept(third), /behind/);
  assert.equal(c.state().copies[0].version, 1);
  answer = { ...seed(), address: '99 Mango Lane', version: 4 };
  await c.accept(third);
  assert.equal(c.state().copies[0].version, 4);
  assert.equal((await c.accept(event('delta', answer, { address: 'stale duplicate' }))).status, 'ignored');
  assert.equal(c.state().copies[0].address, '99 Mango Lane');
});
test('a first delta above v1 requires bootstrap fetch', async () => {
  let reads = 0;
  const snapshot = { ...seed(), version: 3 };
  const c = createConsumer({ name: 'kitchen', mode: 'delta', load: async () => { reads++; return snapshot; } });
  await c.accept(event('delta', snapshot, { phone: '+1-555-0199' }));
  assert.deepEqual([reads, c.state().resyncs], [1, 1]);
  assert.deepEqual(c.state().seen[0].items, seed().items);
});
test('read retains a queue entry; failed thin callback can retry that same entry after recovery', async () => {
  const bus = createBus();
  let online = false;
  const c = createConsumer({ name: 'delivery', mode: 'thin', load: async () => {
    if (!online) throw Error('owner down');
    return { ...seed(), version: 1 };
  } });
  bus.publish(event('thin', { id: 42, version: 1 }));
  const first = bus.read('delivery');
  await assert.rejects(c.accept(first.event), /owner down/);
  assert.deepEqual(bus.read('delivery'), first);
  assert.equal(c.state().completed, 0);
  online = true;
  await c.accept(bus.read('delivery').event);
  bus.ack('delivery', first.receipt);
  assert.deepEqual(bus.state(), { delivery: 0, notify: 1, kitchen: 1 });
  assert.equal(c.state().completed, 1);
  assert.throws(() => bus.ack('notify', first.receipt), /wrong receipt/);
});
test('byte count is UTF8, including non-ASCII values', () => {
  assert.equal(bytes({ label: 'दाल' }), Buffer.byteLength(JSON.stringify({ label: 'दाल' }), 'utf8'));
  assert.ok(bytes({ label: 'दाल' }) > JSON.stringify({ label: 'दाल' }).length);
});
