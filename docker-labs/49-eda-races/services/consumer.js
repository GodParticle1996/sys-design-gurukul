/* Ek consumer process. ROLE: order | balance | pay. MODE har role ka tareeka.
   CRASH_ON=<payment id>: pehli delivery par charge likhne ke baad, ack se pehle process band. */
const { call, serve, sleep } = require('../lib/http');
const { open } = require('../lib/store');
const A = require('../lib/apply');
const env = process.env, broker = env.BROKER || 'http://localhost:5800';
const db = open(env.DB);
const delay = +env.DELAY_MS || 0, gap = +env.GAP_MS || 0;
const stats = { handled: 0, tries: 0, results: {} };
async function handle(m) {
  const b = m.body;
  await sleep(delay);
  let out;
  if (env.ROLE === 'order') out = env.MODE === 'buffer' ? A.inOrder(db, b, env.NAME) : (A.setStatus(db, b, env.NAME), 'applied');
  else if (env.ROLE === 'balance') {
    const fn = { unsafe: A.addUnsafe, cas: A.addCas, atomic: A.addAtomic }[env.MODE];
    stats.tries += await fn(db, b.account, b.delta, gap);
    out = 'added';
  } else out = A.charge(db, b, env.MODE);
  stats.handled++;
  stats.results[out] = (stats.results[out] || 0) + 1;
  if (env.ROLE === 'pay' && b.id === env.CRASH_ON && m.attempt === 1) process.exit(1);   // likha, ack nahi
}
serve(+env.PORT, async (method, route) => {
  if (route === '/health') return { ok: true };
  if (route === '/state') return stats;
  throw Error('unknown route');
});
(async function loop() {
  while (true) {
    try {
      const { message } = await call(broker, '/receive');
      if (!message) { await sleep(5); continue; }
      await handle(message);
      await call(broker, '/ack', { id: message.id, attempt: message.attempt });
    } catch (e) {
      if (e.message !== 'fetch failed') console.error(`${env.NAME}: ${e.message}`);   // broker band ho (shutdown) toh chup; baaki error dikhao
      await sleep(5);
    }
  }
})();
