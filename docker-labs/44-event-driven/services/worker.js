const { call, serve, sleep } = require('../lib/http');
const name = process.env.NAME || 'kitchen';
const broker = process.env.BROKER || 'http://localhost:5400';
let poll = false, online = true, delayMs = 40, busy = false;
let done = [], errors = 0;
async function work(order) {
  await sleep(delayMs);
  if (!online) throw Error(name + ' unavailable');
  done.push(order.id);
  return { processed: order.id };
}
serve(+process.env.PORT || 5402, async (method, route, body) => {
  if (route === '/health') return { ok: true };
  if (route === '/state') return { name, done, errors, poll, online, busy };
  if (method === 'POST' && route === '/config') {
    if ('poll' in body) poll = body.poll;
    if ('online' in body) online = body.online;
    if ('delayMs' in body) delayMs = body.delayMs;
    if (!poll) while (busy) await sleep(2);
    return { poll, online, delayMs };
  }
  if (method === 'POST' && route === '/reset') {
    if (busy) throw Error('pehle polling band karo');
    done = []; errors = 0; return { reset: true };
  }
  if (method === 'POST' && route === '/work') return work(body);
  throw Error('unknown route');
});
(async function loop() {
  while (true) {
    await sleep(10);
    if (!poll || !online) continue;
    busy = true;
    try {
      const { event } = await call(broker, '/read?name=' + name);
      if (event) {
        await work(event.data);
        await call(broker, '/ack', { name, id: event.id });
      }
    } catch (_) { errors++; }
    finally { busy = false; }
  }
})();
