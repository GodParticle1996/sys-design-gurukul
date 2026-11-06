const { call } = require('./stack');
const { event, seed } = require('../lib/events');
const { withStack, reset, save, publish, drain, states, main } = require('./stack');
async function run() {
  return withStack(async ({ urls }) => {
    const results = [];
    for (const mode of ['thin', 'fat']) {
      await reset(urls, mode);
      for (let id = 42; id < 46; id++) {
        const changes = seed(id), row = await save(urls, id, changes);
        await publish(urls, event(mode, row, changes));
      }
      await drain(urls);
      const copies = Object.values(await states(urls));
      results.push({ mode, orders: 4, consumers: 3, reads: (await call(urls.orders, '/stats')).reads,
        completed: copies.reduce((sum, c) => sum + c.completed, 0),
        pending: await call(urls.broker, '/state') });
    }
    return results;
  });
}
if (require.main === module) main(run);
module.exports = { run };
