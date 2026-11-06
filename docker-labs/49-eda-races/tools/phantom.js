/* ex3-phantom: do payments, dono user u1 ke ₹100 (p2 asli doosri khareed). Consumer p1 ka charge likh ke,
   ack se pehle sach mein crash (process exit). Supervisor dobara chalata hai; lease (300 ms) ke baad p1 dobara aata hai.
   modes = duplicate pakadne ki key: none | userAmount | arrival | paymentId. Sahi nateeja: p1 aur p2, dono ek-ek baar. */
const { open } = require('../lib/store');
const { withStack, drain, sleep } = require('./stack');
async function run(mode) {
  return withStack(async ({ db, consumer, crashes, call }) => {
    await call('/reset', { leaseMs: 300 });
    await call('/publish', { key: 'u1', body: { id: 'p1', user: 'u1', amount: 100 } });
    await call('/publish', { key: 'u1', body: { id: 'p2', user: 'u1', amount: 100 } });
    await consumer({ PORT: '5821', NAME: 'pay', ROLE: 'pay', MODE: mode, CRASH_ON: 'p1' }, true);
    await drain(call);
    await sleep(50);
    const charges = open(db).prepare('SELECT payment FROM charges ORDER BY n').all().map(r => r.payment);
    return { mode, crashes: crashes.count, charges, ok: charges.join() === 'p1,p2' };
  });
}
(async () => {
  const modes = process.argv[2] ? [process.argv[2]] : ['none', 'userAmount', 'arrival', 'paymentId'];
  for (const m of modes) {
    const r = await run(m);
    console.log(`${r.mode.padEnd(10)} crash=${r.crashes} charges=${r.charges.length} [${r.charges.join(',')}] ${r.ok ? 'sahi' : 'GALAT (sahi: p1,p2)'}`);
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
