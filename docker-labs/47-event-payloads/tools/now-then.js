const { call } = require('./stack');
const { event, seed } = require('../lib/events');
const { withStack, reset, save, publish, drain, states, main } = require('./stack');
async function run() {
  return withStack(async ({ urls }) => {
    const results = [];
    for (const mode of ['thin', 'fat']) {
      await reset(urls, mode);
      const first = seed(), v1 = await save(urls, 42, first);
      await publish(urls, event(mode, v1, first));
      const changes = { address: '99 Mango Lane', phone: '+1-555-0199', items: ['idli'] };
      const v2 = await save(urls, 42, changes);
      await publish(urls, event(mode, v2, changes));
      // Both owner writes and publications finish before any consumer fetches.
      await drain(urls);
      const consumers = await states(urls);
      results.push({ mode, ownerVersionBeforeConsumption: 2,
        reads: (await call(urls.orders, '/stats')).reads,
        observations: Object.fromEntries(Object.entries(consumers).map(([n, c]) => [n, c.seen])) });
    }
    return results;
  });
}
if (require.main === module) main(run);
module.exports = { run };
