const { serve } = require('../lib/http');
const { createBroker } = require('../lib/broker');
let broker = createBroker();
serve(+process.env.PORT || 5800, async (method, route, body) => {
  if (route === '/health') return { ok: true };
  if (method === 'POST' && route === '/reset') { broker = createBroker(body); return { reset: true }; }
  if (method === 'POST' && route === '/publish') return { id: broker.publish(body.body, body.key) };
  if (route === '/receive') return { message: broker.receive(Date.now()) };
  if (method === 'POST' && route === '/ack') return { acked: broker.ack(body.id, body.attempt) };
  if (route === '/state') return { pending: broker.pending() };
  throw Error('unknown route');
});
