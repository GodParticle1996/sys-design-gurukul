const { test } = require('node:test');
const assert = require('node:assert/strict');
const { needs } = require('../lib/events');

test('callback load is N*M, full copies remove those reads (selected transport)', async () => {
  const [thin, fat] = await require('../tools/load').run();
  assert.equal(thin.reads, thin.orders * thin.consumers);
  assert.equal(fat.reads, 0);
  for (const r of [thin, fat]) {
    assert.equal(r.completed, 12);
    assert.deepEqual(Object.values(r.pending), [0, 0, 0]);
  }
});
test('owner unavailable leaves thin work queued through retry, fat finishes (selected transport)', async () => {
  const [thin, fat] = await require('../tools/owner-down').run();
  const actualExit = !require('../tools/stack').model();
  assert.equal(thin.ownerProcessExited, actualExit);
  assert.equal(fat.ownerProcessExited, actualExit);
  assert.equal(thin.ownerUnavailableVerified, true);
  assert.equal(fat.ownerUnavailableVerified, true);
  assert.deepEqual([thin.completed, thin.stuck, thin.failedAttempts], [0, 12, 6]);
  assert.deepEqual([fat.completed, fat.stuck, fat.failedAttempts], [12, 0, 0]);
});
test('delayed thin reads show v2 twice; full event snapshots preserve v1 then v2', async () => {
  const [thin, fat] = await require('../tools/now-then').run();
  for (const name of Object.keys(needs)) {
    assert.deepEqual(thin.observations[name].map(x => x.eventVersion), [1, 2]);
    assert.deepEqual(thin.observations[name].map(x => x.stateVersion), [2, 2]);
    assert.deepEqual(fat.observations[name].map(x => x.stateVersion), [1, 2]);
    assert.deepEqual(thin.observations[name][0][needs[name]], fat.observations[name][1][needs[name]]);
    assert.notDeepEqual(fat.observations[name][0][needs[name]], fat.observations[name][1][needs[name]]);
  }
  assert.deepEqual([thin.reads, fat.reads], [6, 0]);
});
test('v2/v1/duplicate v1 corrupt unguarded copies; version guard ignores all stale entries', async () => {
  const [naive, guarded] = await require('../tools/order-duplicates').run();
  assert.deepEqual([naive.wrongFinalCopies, naive.ignored, naive.completed], [12, 0, 36]);
  assert.deepEqual([guarded.wrongFinalCopies, guarded.ignored, guarded.completed], [0, 24, 12]);
  assert.equal(naive.exampleFinalCopy.version, 1);
  assert.equal(guarded.exampleFinalCopy.version, 2);
});
test('dropped delta silently keeps old address; gap detection fetches once per consumer', async () => {
  const [naive, guarded] = await require('../tools/delta').run();
  assert.deepEqual([naive.wrongFinalCopies, naive.reads], [3, 0]);
  assert.deepEqual([guarded.wrongFinalCopies, guarded.reads], [0, 3]);
  assert.deepEqual(Object.values(guarded.resyncsByConsumer), [1, 1, 1]);
  assert.equal(naive.exampleFinalCopy.version, 3);
  assert.equal(naive.exampleFinalCopy.address, '12 Neem Road');
  assert.equal(guarded.exampleFinalCopy.address, '99 Mango Lane');
});
test('UTF8 event bytes and actual consumer field exposure are counted separately', async () => {
  const [thin, fat, delta] = await require('../tools/size-spread').run();
  for (const r of [thin, fat, delta]) {
    assert.equal(r.publishedBytes, r.eventBytesByOrderAndVersion.flat().reduce((a, b) => a + b));
    assert.equal(r.fanoutBytes, r.publishedBytes * 3);
  }
  assert.ok(fat.publishedBytes > delta.publishedBytes && delta.publishedBytes > thin.publishedBytes);
  assert.deepEqual([thin.reads, fat.reads, delta.reads], [36, 0, 0]);
  assert.deepEqual([thin.unusedEventFieldDeliveries, fat.unusedEventFieldDeliveries, delta.unusedEventFieldDeliveries], [0, 72, 40]);
  assert.deepEqual([thin.kitchenUnusedEventPhoneDeliveries, fat.kitchenUnusedEventPhoneDeliveries,
    delta.kitchenUnusedEventPhoneDeliveries], [0, 12, 8]);
  assert.deepEqual([thin.unusedCallbackFieldDeliveries, thin.unusedCallbackPhoneDeliveries,
    thin.kitchenUnusedCallbackPhoneDeliveries], [72, 24, 12]);
});
test('fixed-clock model uses the same consumer rules and drains all six copies', async () => {
  const { trace } = require('../tools/slowmo');
  const thin = await trace('thin'), fat = await trace('fat');
  assert.deepEqual(thin.rows.map(x => x.atMs), [0, 10, 20, 30, 100, 110, 120, 200, 210, 220]);
  assert.equal(thin.rows.at(-1).reads, 6);
  assert.equal(fat.rows.at(-1).reads, 0);
  for (const r of [thin, fat]) assert.deepEqual(Object.values(r.rows.at(-1).pending), [0, 0, 0]);
  assert.deepEqual(thin.rows.filter(x => x.observation).map(x => x.observation.stateVersion), [2, 2, 2, 2, 2, 2]);
  assert.deepEqual(fat.rows.filter(x => x.observation).map(x => x.observation.stateVersion), [1, 1, 1, 2, 2, 2]);
});
