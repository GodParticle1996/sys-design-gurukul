'use strict';
const assert = require('node:assert/strict');
const { makeRouter } = require('./router.cjs');
const seed = () => [
  { id: 'orders-a', service: 'orders', knownHealthy: true, actualUp: true },
  { id: 'orders-b', service: 'orders', knownHealthy: true, actualUp: true },
  { id: 'images-a', service: 'images', knownHealthy: true, actualUp: true }
];
function run(name, fn) { fn(); console.log('PASS ' + name); }
run('Service route first; instance choice second', () => {
  const router = makeRouter({ targets: seed(), limit: 10 });
  const results = ['/orders/7', '/images/logo.png', '/orders/8', '/orders/9'].map(path => router.handle({ path, principal: 'verified-alice' }));
  assert.deepEqual(results.map(r => r.target), ['orders-a', 'images-a', 'orders-b', 'orders-a']);
  console.log('  targets: ' + results.map(r => r.target).join(' → '));
  assert.equal(router.handle({ path: '/orders-backup', principal: 'verified-alice' }).status, 404);
});
run('Authentication failure stops before backend selection', () => {
  const r = makeRouter({ targets: seed() }).handle({ path: '/orders/7', principal: null });
  assert.equal(r.status, 401); assert.equal(r.target, undefined); assert.deepEqual(r.trace, []);
});
run('Actual failure precedes health observation', () => {
  const targets = seed(), router = makeRouter({ targets, limit: 10 });
  router.handle({ path: '/orders/7', principal: 'verified-alice' });
  targets[1].actualUp = false;
  const stale = router.handle({ path: '/orders/8', principal: 'verified-alice' });
  assert.equal(stale.status, 502); assert.equal(stale.target, 'orders-b');
  targets[1].knownHealthy = false;
  const after = router.handle({ path: '/orders/8', principal: 'verified-alice' });
  assert.equal(after.status, 200); assert.equal(after.target, 'orders-a');
  console.log('  stale health: 502 orders-b; observed failure: 200 orders-a');
  targets[0].knownHealthy = false;
  assert.equal(router.handle({ path: '/orders/9', principal: 'verified-alice' }).status, 503);
  assert.equal(router.handle({ path: '/images/logo.png', principal: 'verified-alice' }).target, 'images-a');
});
run('A new backend does not repair an exhausted API budget', () => {
  let clock = 0;
  const targets = seed(), router = makeRouter({ targets, now: () => clock });
  const request = () => router.handle({ path: '/orders/7', principal: 'verified-alice' });
  assert.deepEqual([request().status, request().status], [200, 200]);
  targets.push({ id: 'orders-c', service: 'orders', knownHealthy: true, actualUp: true });
  assert.equal(request().status, 429);
  clock = 10000; assert.equal(request().status, 200);
  console.log('  same budget: 200, 200, 429; next window: 200');
});
run('Two independent gateway counters double this local allowance', () => {
  const targets = seed();
  const a = makeRouter({ targets, now: () => 0 }), b = makeRouter({ targets, now: () => 0 });
  const statuses = [a, b, a, b].map(router => router.handle({ path: '/orders/7', principal: 'verified-alice' }).status);
  assert.deepEqual(statuses, [200, 200, 200, 200]);
  console.log('  two gateways: four accepted; no shared global quota');
});
console.log('Decision-model checks complete. No real proxy, DNS or network delivery was tested.');
