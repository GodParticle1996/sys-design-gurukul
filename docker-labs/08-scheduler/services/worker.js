/* Worker: job claim → kaam (heartbeat ke saath) → complete. CRASH_AFTER=n: apne n-th job ke BEECH mein mar jaata hai.
   Poison job (id 7) har baar worker ko atka deta hai (heartbeat band) — watchdog use dead letter tak le jaata hai. */
const { post, sleep } = require('../lib/util');
const NAME = process.env.NAME || 'w1';
const DB = 'http://localhost:' + (process.env.DB_PORT || 4803);
const JOB_MS = +(process.env.JOB_MS || 300), HB_MS = +(process.env.HB_MS || 500);
const CRASH_AFTER = +(process.env.CRASH_AFTER || 0);
let taken = 0;
(async () => {
  console.log(`  worker-${NAME} chalu`);
  while (true) {
    let r;
    try { r = await post(`${DB}/claim/${NAME}`, {}); } catch (e) { await sleep(300); continue; }
    if (!r.job) { await sleep(200); continue; }
    const j = r.job;
    taken++;
    if (CRASH_AFTER && taken === CRASH_AFTER) { await sleep(150); console.log(`  💥 worker-${NAME} job ${j.id} ke beech mara (heartbeat band)`); process.exit(1); }
    if (j.poison) { await sleep(8000); continue; }            /* atak gaya, heartbeat nahi */
    const end = Date.now() + JOB_MS;
    while (Date.now() < end) { await post(`${DB}/heartbeat/${j.id}`, {}).catch(() => {}); await sleep(Math.max(1, Math.min(HB_MS, end - Date.now()))); }
    await post(`${DB}/complete/${j.id}`, {}).catch(() => {});
  }
})();
