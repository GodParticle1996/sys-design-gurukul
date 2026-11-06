const { serve } = require('../lib/http');
const { createOrders } = require('../lib/orders');
function ordersHandler() {
 let orders = createOrders();
 return (method, url, body) => {
  if (url.pathname === '/health') return { ok: true };
  if (method === 'POST' && url.pathname === '/reset') {
    orders = createOrders();
    return { reset: true };
  }
  if (url.pathname === '/stats') return orders.stats();
  if (method === 'POST' && url.pathname === '/orders') return orders.save(body.id, body.changes);
  if (method === 'GET' && /^\/orders\/\d+$/.test(url.pathname)) {
    return orders.read(Number(url.pathname.split('/')[2]));
  }
  throw Error('unknown route');
 };
}
if (require.main === module) serve(Number(process.env.PORT || 5601), ordersHandler());
module.exports = { ordersHandler };
