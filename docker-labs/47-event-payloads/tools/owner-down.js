const assert = require('node:assert/strict');
const { call } = require('./stack');
const { event, seed } = require('../lib/events');
const { withStack, reset, save, publish, drain, states, main } = require('./stack');
async function run() {
  const results = [];
  for (const mode of ['thin', 'fat']) await withStack(async ({ urls, stop, transport }) => {
    await reset(urls, mode);
    for (let id = 42; id < 46; id++) {
      const changes = seed(id), row = await save(urls, id, changes);
      await publish(urls, event(mode, row, changes));
    }
    const queued = Object.values(await call(urls.broker, '/state')).reduce((a, b) => a + b, 0);
    await stop('orders'); // HTTP: await owned PID exit. Explicit model: remove owner route.
    await assert.rejects(call(urls.orders, '/health'));
    for (let round = 0; round < 2; round++) await drain(urls);
    const consumers = Object.values(await states(urls));
    results.push({ mode, queuedBeforeStop: queued, ownerProcessExited: transport === 'http',
      ownerUnavailableVerified: true, retryRounds: 2,
      completed: consumers.reduce((n, c) => n + c.completed, 0),
      failedAttempts: consumers.reduce((n, c) => n + c.failures, 0),
      stuck: Object.values(await call(urls.broker, '/state')).reduce((a, b) => a + b, 0) });
  });
  return results;
}
if (require.main === module) main(run);
module.exports = { run };
