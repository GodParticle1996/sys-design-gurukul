// Explicit opt-in evidence fallback: same route handlers, no HTTP or process stop.
const { ordersHandler } = require('../services/orders');
const { brokerHandler } = require('../services/broker');
const { workerHandler } = require('../services/worker');
function modelStack(urls, names) {
  const routes = new Map([[urls.orders, ordersHandler()], [urls.broker, brokerHandler()]]);
  const clone = value => JSON.parse(JSON.stringify(value));
  async function call(base, route, body) {
    const handler = routes.get(base);
    if (!handler) throw Error('model owner unavailable; no process was killed');
    return clone(await handler(body === undefined ? 'GET' : 'POST', new URL(base + route), clone(body || {})));
  }
  for (const name of names) routes.set(urls[name], workerHandler({
    name, owner: urls.orders, broker: urls.broker, request: call,
  }));
  return { call, stop: async name => { routes.delete(urls[name]); } };
}
module.exports = { modelStack };
