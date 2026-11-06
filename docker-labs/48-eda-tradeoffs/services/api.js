const { call, serve, sleep } = require('../lib/http');
const env = process.env, broker = env.BROKER || 'http://localhost:5701';
const payment = env.PAYMENT || 'http://localhost:5702';
const orders = new Map();
serve(+env.PORT || 5700, async (method, route, body) => {
  if (route === '/health') return { ok: true };
  if (method === 'POST' && route === '/orders') {
    if (body.mode === 'direct') return call(payment, '/do', body);
    orders.set(body.id, { status: 'pending' });
    await call(broker, '/publish', { topic: 'placed',
      event: { id: `OrderPlaced-${body.id}`, type: 'OrderPlaced', data: body } });
    return { code: 202, body: { status: 'pending' } };
  }
  const m = route.match(/^\/orders\/(\w+)$/);
  if (m) return orders.get(m[1]) || { code: 404, body: { error: 'order nahi mila' } };
  throw Error('unknown route');
});
(async function loop() {
  while (true) {
    await sleep(10);
    for (const topic of ['done', 'failed']) {
      try {
        const { event } = await call(broker, '/read?topic=' + topic);
        if (!event) continue;
        orders.set(event.data.id, topic === 'done' ? { status: 'confirmed' }
          : { status: 'failed', reason: event.reason });
        await call(broker, '/ack', { topic, id: event.id });
      } catch (_) { /* agle chakkar mein */ }
    }
  }
})();
