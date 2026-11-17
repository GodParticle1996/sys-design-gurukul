'use strict';
// Executes existing lab implementations. RAM only; clock values are chosen.
const assert = require('node:assert/strict');
const { createBroker } = require('../../docker-labs/49-eda-races/lib/broker');
const { createBus } = require('../../docker-labs/44-event-driven/lib/bus');
const events = [1, 2, 3].map(id => ({ id: `o${id}`, type: 'OrderPlaced' }));
let checks = 0;
const pass = text => console.log(`PASS ${++checks}: ${text}`);
const fill = broker => events.forEach(event => broker.publish(event, event.id));
const complete = (broker, delivery) => assert.equal(broker.ack(delivery.id, delivery.attempt), true);

// Wrong topology: unrelated business handlers compete for three orders.
const shared = createBroker(); fill(shared);
const wrong = Object.fromEntries(['inventory', 'payment', 'notify'].map(name => {
  const delivery = shared.receive(0); complete(shared, delivery);
  return [name, delivery.body.id];
}));
assert.deepEqual(wrong, { inventory: 'o1', payment: 'o2', notify: 'o3' });
assert.equal(shared.pending(), 0);
pass('shared queue: inventory=o1, payment=o2, notify=o3; every order did NOT reach every handler');

// Each subscription has independent pending state. Copies are published by
// this script; this loop is not a transactional distributed fanout service.
const subscriptions = Object.fromEntries(['inventory', 'payment', 'notify'].map(name => [name, createBroker()]));
for (const broker of Object.values(subscriptions)) fill(broker);
assert.deepEqual(Object.values(subscriptions).map(b => b.pending()), [3, 3, 3]);
pass('three events x three subscriptions = nine pending copies');

const payment = subscriptions.payment;
const a = payment.receive(0), b = payment.receive(0);
assert.equal(a.body.id, 'o1'); assert.equal(b.body.id, 'o2');
const finished = [];
complete(payment, b); finished.push(b.body.id);
complete(payment, a); finished.push(a.body.id);
assert.deepEqual(finished, ['o2', 'o1']);
assert.equal(payment.pending(), 1);
pass('two payment workers share work; receive o1,o2 but finish o2,o1');

const c = payment.receive(0); complete(payment, c);
assert.deepEqual(Object.values(subscriptions).map(b => b.pending()), [3, 0, 3]);
pass('payment ack affects payment only; inventory=3, payment=0, offline notify=3');

// No consumer calls while offline. The broker object stays alive; no TTL here.
const late = subscriptions.notify.receive(90000);
assert.equal(late.body.id, 'o1');
const freshBroker = createBroker();
assert.equal(freshBroker.pending(), 0);
pass('offline reader gets retained o1; a fresh RAM broker has zero copies (object reset, not process-crash proof)');

const retry = createBroker({ leaseMs: 100 });
retry.publish({ id: 'p1' }, 'p1');
const first = retry.receive(0), attempts = [first.body.id];
assert.equal(retry.receive(50), null);
const second = retry.receive(100); attempts.push(second.body.id);
assert.equal(second.id, first.id); assert.equal(second.attempt, 2);
assert.equal(retry.ack(first.id, first.attempt), false);
complete(retry, second);
assert.deepEqual(attempts, ['p1', 'p1']);
pass('work before lost ack: p1 attempted twice; stale ack rejected after redelivery');

// Reuse Lab 44's deliberately coupled capacity policy, not a provider claim.
const capped = createBus(['payment', 'notify'], 1);
capped.publish(events[0]); capped.ack('payment', 'o1');
assert.throws(() => capped.publish(events[1]), /queue full/);
assert.equal(capped.pending('payment'), 0); assert.equal(capped.pending('notify'), 1);
pass('full notify subscription rejects next publication in Lab 44; payment receives no partial copy');
console.log(`${checks} checks passed. No cloud broker, network, payment or disk durability tested.`);
