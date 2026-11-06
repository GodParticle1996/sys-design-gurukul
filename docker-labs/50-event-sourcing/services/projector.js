/* Catch-up projector process: har POLL_MS store se naye events (pos > checkpoint). MODE together | split.
   CRASH_AT_POS=<pos>: us event ko apply karne ke baad, checkpoint se pehle process band (sirf ek baar: CRASH_FLAG file).
   /balance?account=a1&minPos=12: minPos diya ho toh checkpoint minPos tak pahunchne ka intezaar (2 s tak); na pahunche toh 503. */
const fs = require('node:fs');
const { serve, sleep } = require('../lib/http');
const { open } = require('../lib/store');
const { catchUp, getCheckpoint } = require('../lib/projector');
const env = process.env, db = open(env.DB), poll = +env.POLL_MS || 50;
function afterApply(e) {
  if (+env.CRASH_AT_POS === e.pos && env.CRASH_FLAG && !fs.existsSync(env.CRASH_FLAG)) {
    fs.writeFileSync(env.CRASH_FLAG, 'crashed');
    process.exit(1);
  }
}
serve(+env.PORT, async (method, route, body, q) => {
  if (route === '/health') return { ok: true };
  if (route === '/state') return { checkpoint: getCheckpoint(db, 'balances') };
  if (route === '/balance') {
    const t0 = Date.now(), minPos = +q.get('minPos') || 0;
    while (getCheckpoint(db, 'balances') < minPos && Date.now() - t0 < 2000) await sleep(5);
    const checkpoint = getCheckpoint(db, 'balances');
    if (checkpoint < minPos) return { code: 503, body: { error: 'read model abhi taiyaar nahi', minPos, checkpoint } };   // purana balance safal jawab nahi
    const row = db.prepare('SELECT balance FROM balances WHERE account = ?').get(q.get('account'));
    return { balance: row?.balance, waitedMs: Date.now() - t0, checkpoint: getCheckpoint(db, 'balances') };
  }
  throw Error('unknown route');
});
(async function loop() {
  for (;;) {
    try { if (!catchUp(db, 'balances', { mode: env.MODE, afterApply })) await sleep(poll); }
    catch (e) { console.error(`projector: ${e.message}`); await sleep(poll); }
  }
})();
