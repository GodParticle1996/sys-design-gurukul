/* Command API process. MODE any | expected. PUBLISH=dual: store mein likhne ke baad event listener ko bhejo (video jaisa).
   CRASH_ON=<n>: n-wi kamyaab command par store mein likh ke, publish se pehle process band (sirf ek baar: CRASH_FLAG file). */
const fs = require('node:fs');
const { call, serve } = require('../lib/http');
const { open } = require('../lib/store');
const { withdraw } = require('../lib/handler');
const env = process.env, db = open(env.DB);
let done = 0;
async function barrier(account, tries) {           // sirf ex1: dono handlers padh lein, tabhi koi likhe (pehli koshish par)
  if (!env.BARRIER || tries > 1) return;
  db.prepare('INSERT INTO barrier VALUES (?, ?)').run(account, env.PORT);
  const t0 = Date.now();
  while (db.prepare('SELECT count(*) c FROM barrier WHERE account = ?').get(account).c < +env.BARRIER) {
    if (Date.now() - t0 > 5000) throw Error(`barrier: ${account} par doosra handler nahi pahuncha`);
    await new Promise(r => setTimeout(r, 2));
  }
}
serve(+env.PORT, async (method, route, body) => {
  if (route === '/health') return { ok: true };
  if (method === 'POST' && route === '/withdraw') {
    const r = await withdraw(db, body.account, body.amount, { mode: env.MODE, gapMs: +env.GAP_MS || 0, afterRead: t => barrier(body.account, t) });
    if (r.result !== 'ok') return r;
    done++;
    if (+env.CRASH_ON === done && env.CRASH_FLAG && !fs.existsSync(env.CRASH_FLAG)) {
      fs.writeFileSync(env.CRASH_FLAG, 'crashed');
      process.exit(1);                               // store mein likha ja chuka, listener tak nahi gaya
    }
    if (env.PUBLISH === 'dual') await call(env.LISTENER, '/event',
      { stream: body.account, version: r.version, pos: r.pos, type: 'Withdrawn', schema: 2, data: { amount: body.amount } });
    return r;
  }
  throw Error('unknown route');
});
