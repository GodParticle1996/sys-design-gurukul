const { isDeepStrictEqual } = require('node:util');
const { event, seed } = require('../lib/events');
const { withStack, reset, save, publish, drain, states, main } = require('./stack');
async function run() {
  return withStack(async ({ urls }) => {
    const results = [];
    for (const guard of [false, true]) {
      await reset(urls, 'fat', guard);
      const authoritative = [];
      for (let id = 42; id < 46; id++) {
        const v1 = await save(urls, id, seed(id));
        const v2 = await save(urls, id, { address: '99 Mango Lane' });
        authoritative.push(v2);
        for (const row of [v2, v1, v1]) await publish(urls, event('fat', row));
      }
      await drain(urls);
      const consumers = Object.values(await states(urls));
      results.push({ guard, orders: 4, consumers: 3, deliveryVersionsPerOrder: [2, 1, 1],
        wrongFinalCopies: consumers.reduce((n, c) => n + c.copies.filter(row =>
          !isDeepStrictEqual(row, authoritative.find(a => a.id === row.id))).length, 0),
        completed: consumers.reduce((n, c) => n + c.completed, 0),
        ignored: consumers.reduce((n, c) => n + c.skipped, 0),
        exampleFinalCopy: consumers[0].copies[0] });
    }
    return results;
  });
}
if (require.main === module) main(run);
module.exports = { run };
