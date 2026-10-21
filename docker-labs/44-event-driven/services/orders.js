const { direct, viaEvent } = require('../lib/order');
const { serve, call } = require('../lib/http');
const broker = process.env.BROKER || 'http://localhost:5400';
const kitchen = process.env.KITCHEN || 'http://localhost:5402';
const notify = process.env.NOTIFY || 'http://localhost:5403';
let orders = [];
const io = {
  save: async order => { orders.push(order); },
  kitchen: order => call(kitchen, '/work', order),
  notify: order => call(notify, '/work', order),
  publish: event => call(broker, '/publish', event),
};
serve(+process.env.PORT || 5401, async (method, route, body) => {
  if (route === '/health') return { ok: true };
  if (route === '/state') return { saved: orders.length, orders };
  if (method === 'POST' && route === '/reset') { orders = []; return { reset: true }; }
  if (method === 'POST' && route === '/orders') {
    if (!Number.isInteger(body.id)) throw Error('integer order id chahiye');
    const flow = body.mode === 'direct' ? direct : viaEvent;
    const result = await flow({ id: body.id, item: 'thali' }, io);
    return { code: body.mode === 'direct' ? 200 : 202, body: result };
  }
  throw Error('unknown route');
});
