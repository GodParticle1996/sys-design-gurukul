const { serve } = require('../lib/http');
const { createBus } = require('../lib/bus');
function brokerHandler() {
 let bus = createBus();
 return (method, url, body) => {
  if (url.pathname === '/health') return { ok: true };
  if (method === 'POST' && url.pathname === '/reset') {
    bus = createBus();
    return { reset: true };
  }
  if (method === 'POST' && url.pathname === '/publish') return bus.publish(body);
  if (method === 'POST' && url.pathname === '/ack') return bus.ack(body.name, body.receipt);
  if (url.pathname === '/read') return { entry: bus.read(url.searchParams.get('name')) };
  if (url.pathname === '/state') return bus.state();
  throw Error('unknown route');
 };
}
if (require.main === module) serve(Number(process.env.PORT || 5600), brokerHandler());
module.exports = { brokerHandler };
