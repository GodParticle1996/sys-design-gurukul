/* Video ka "listener service": handler jo event bheje, wahi read model mein lagao. Store ko khud nahi padhta. */
const { serve } = require('../lib/http');
const { open } = require('../lib/store');
const { tx, applyToReadModel } = require('../lib/projector');
const db = open(process.env.DB);
serve(+process.env.PORT, async (method, route, body, q) => {
  if (route === '/health') return { ok: true };
  if (method === 'POST' && route === '/event') { tx(db, () => applyToReadModel(db, body)); return { applied: body.pos }; }
  if (route === '/balance') return db.prepare('SELECT balance FROM balances WHERE account = ?').get(q.get('account'));
  throw Error('unknown route');
});
