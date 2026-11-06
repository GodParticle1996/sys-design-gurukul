const { call, serve, sleep } = require('../lib/http');
const { createStep } = require('../lib/step');
const env = process.env, broker = env.BROKER || 'http://localhost:5701';
const step = createStep({ name: env.NAME, workMs: +env.WORK_MS || 20,
  failItem: env.FAIL_ITEM, next: env.NEXT });
let poll = false, failEvents = false;
const log = [];
serve(+env.PORT, async (method, route, body) => {
  if (route === '/health') return { ok: true };
  if (route === '/log') return { log };
  if (method === 'POST' && route === '/config') {
    if ('poll' in body) poll = body.poll;
    if ('failEvents' in body) failEvents = body.failEvents;
    return { poll, failEvents };
  }
  if (method === 'POST' && route === '/do') return step.direct(body);
  throw Error('unknown route');
});
(async function loop() {
  while (true) {
    await sleep(10);
    if (!poll) continue;
    try {
      const { event } = await call(broker, '/read?topic=' + env.IN);
      if (!event) continue;
      const publish = (topic, e) => call(broker, '/publish', { topic: topic || env.OUT,
        event: { ...e, id: `${e.type}-${event.data.id}`, data: event.data } });
      const out = await step.onEvent(event, publish, failEvents);
      log.push({ order: event.data.id, ...out });
      await call(broker, '/ack', { topic: env.IN, id: event.id });
    } catch (_) { /* agle chakkar mein phir koshish */ }
  }
})();
