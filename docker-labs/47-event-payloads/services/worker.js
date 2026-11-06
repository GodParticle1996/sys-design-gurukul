const { serve, call } = require('../lib/http');
const { createConsumer } = require('../lib/consumer');
function workerHandler({ name, owner, broker, request = call }) {
let worker = createConsumer({ name, owner, mode: 'thin', load: id => request(owner, `/orders/${id}`) });
let stepping = false;
return async (method, url, body) => {
  if (url.pathname === '/health') return { ok: true };
  if (method === 'POST' && url.pathname === '/configure') {
    if (!['thin', 'fat', 'delta'].includes(body.mode) || stepping) throw Error('invalid configuration');
    worker = createConsumer({ name, owner, mode: body.mode, guard: body.guard ?? true,
      load: id => request(owner, `/orders/${id}`) });
    return { configured: true };
  }
  if (url.pathname === '/state') return worker.state();
  if (method === 'POST' && url.pathname === '/step') {
    if (stepping) throw Error('one step at a time');
    stepping = true;
    try {
      const { entry } = await request(broker, `/read?name=${name}`);
      if (!entry) return { status: 'empty' };
      try {
        const result = await worker.accept(entry.event);
        await request(broker, '/ack', { name, receipt: entry.receipt });
        return result;
      } catch {
        worker.fail();
        return { status: 'stuck', id: entry.event.id, eventVersion: entry.event.version };
      }
    } finally { stepping = false; }
  }
  throw Error('unknown route');
};
}
if (require.main === module) serve(Number(process.env.PORT || 5602), workerHandler({
  name: process.env.NAME || 'delivery', owner: process.env.OWNER || 'http://127.0.0.1:5601',
  broker: process.env.BROKER || 'http://127.0.0.1:5600',
}));
module.exports = { workerHandler };
