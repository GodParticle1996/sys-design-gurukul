const { isDeepStrictEqual } = require('node:util');
const { call } = require('./stack');
const { event, seed } = require('../lib/events');
const { withStack, reset, save, publish, drain, states, main } = require('./stack');
async function run() {
  return withStack(async ({ urls }) => {
    const results = [];
    for (const guard of [false, true]) {
      await reset(urls, 'delta', guard);
      const first = seed(), v1 = await save(urls, 42, first);
      await publish(urls, event('delta', v1, first));
      await drain(urls);
      await save(urls, 42, { address: '99 Mango Lane' }); // v2 deliberately never published.
      const changes = { phone: '+1-555-0199' }, v3 = await save(urls, 42, changes);
      await publish(urls, event('delta', v3, changes));
      await drain(urls);
      const consumers = await states(urls);
      results.push({ guard, deliveredVersions: [1, 3], droppedVersion: 2,
        wrongFinalCopies: Object.values(consumers).filter(c => !isDeepStrictEqual(c.copies[0], v3)).length,
        reads: (await call(urls.orders, '/stats')).reads,
        resyncsByConsumer: Object.fromEntries(Object.entries(consumers).map(([n, c]) => [n, c.resyncs])),
        exampleFinalCopy: consumers.delivery.copies[0],
        deliveryObservations: consumers.delivery.seen });
    }
    return results;
  });
}
if (require.main === module) main(run);
module.exports = { run };
