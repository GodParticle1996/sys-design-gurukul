const { serve } = require('../lib/http');
const { createTopics } = require('../lib/topics');
const topics = createTopics();
serve(+process.env.PORT || 5701, async (method, route, body, q) => {
  if (route === '/health') return { ok: true };
  if (method === 'POST' && route === '/publish') {
    topics.publish(body.topic, body.event);
    return { published: body.event.id };
  }
  if (route === '/read') return { event: topics.read(q.get('topic')) };
  if (method === 'POST' && route === '/ack') return { acked: topics.ack(body.topic, body.id) };
  throw Error('unknown route');
});
