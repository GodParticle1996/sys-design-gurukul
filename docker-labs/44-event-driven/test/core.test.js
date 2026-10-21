const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBus } = require('../lib/bus');
const { viaEvent, direct } = require('../lib/order');
const event = id => ({ id, type: 'OrderPlaced', data: { item: 'thali' } });
test('each subscription owns a copy, and read needs an ack', () => {
  const bus=createBus(['kitchen','notify']);const e=event('1');bus.publish(e);
  e.data.item='changed';const first=bus.read('kitchen');first.data.item='changed-again';
  assert.equal(bus.read('kitchen').data.item,'thali');
  assert.equal(bus.read('notify').data.item,'thali');
  assert.equal(bus.pending('kitchen'),1);
  assert.equal(bus.ack('kitchen','wrong-id'),false);
  assert.equal(bus.pending('kitchen'),1);
  assert.equal(bus.ack('kitchen','1'),true);
  assert.equal(bus.pending('kitchen'),0);assert.equal(bus.pending('notify'),1);
});
test('full slow subscription rejects fanout before any other queue changes', () => {
  const bus=createBus(['fast','slow'],1);bus.publish(event('1'));bus.ack('fast','1');
  assert.throws(()=>bus.publish(event('2')),/full/);
  assert.equal(bus.pending('fast'),0);assert.equal(bus.pending('slow'),1);
});
test('a publish failure leaves a saved order: lab deliberately exposes dual-write gap', async () => {
  let saved=0;const bus=createBus(['notify'],1);bus.publish(event('1'));
  await assert.rejects(viaEvent({id:2},{save:async()=>saved++,publish:async e=>bus.publish(e)}),/full/);
  assert.equal(saved,1);assert.equal(bus.pending('notify'),1);
});
test('direct notification failure propagates after save and kitchen effect', async () => {
  const effects=[];
  await assert.rejects(direct({id:1},{save:async()=>effects.push('save'),kitchen:async()=>effects.push('kitchen'),notify:async()=>{throw Error('offline');}}),/offline/);
  assert.deepEqual(effects,['save','kitchen']);
});
test('invalid event or unknown subscription fails explicitly', () => {
  const bus=createBus(['notify']);assert.throws(()=>bus.publish({id:'1'}));
  assert.throws(()=>bus.read('unknown'),/unknown/);assert.equal(bus.pending('notify'),0);
});
