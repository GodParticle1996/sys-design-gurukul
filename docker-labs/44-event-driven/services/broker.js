const { createBus } = require('../lib/bus');
const { serve } = require('../lib/http');
const names = ['kitchen', 'notify'];
let bus = createBus(names);
serve(+process.env.PORT || 5400, (method, route, body, query) => {
  if (route === '/health') return { ok: true };
  if (method === 'POST' && route === '/reset') {
    bus = createBus(names, body.cap ?? 20);
    return { reset: true };
  }
  if (method === 'POST' && route === '/publish') return { copies: bus.publish(body) };
  if (method === 'POST' && route === '/ack') return { acked: bus.ack(body.name, body.id) };
  if (route === '/read') return { event: bus.read(query.get('name')) };
  if (route === '/state') return Object.fromEntries(names.map(n => [n, bus.pending(n)]));
  throw Error('unknown route');
});
