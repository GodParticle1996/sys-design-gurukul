/* ex1-order: 3 orders × 5 haalatein pehle line mein, phir do consumers ek saath (A tez 5 ms, B dheema 40 ms), asli HTTP + SQLite.
   modes: shared (koi bhi consumer koi bhi message) | keyed (ek order ek waqt ek consumer) |
          buffer (agla seq hi likho) | buffer-gap (o2 ka seq 3 kabhi publish nahi hota) */
const { open } = require('../lib/store');
const { withStack, drain } = require('./stack');
const STEPS = ['placed', 'paid', 'packed', 'shipped', 'delivered'];
async function run(mode) {
  return withStack(async ({ db, consumer, call }) => {
    await call('/reset', { leaseMs: 2000, keyed: mode === 'keyed' });
    const MODE = mode.startsWith('buffer') ? 'buffer' : 'plain';
    for (const order of ['o1', 'o2', 'o3']) for (let seq = 1; seq <= 5; seq++) {   // pehle saare 15 line mein, order-wise
      if (mode === 'buffer-gap' && order === 'o2' && seq === 3) continue;
      await call('/publish', { key: order, body: { order, seq, status: STEPS[seq - 1] } });
    }
    await Promise.all([consumer({ PORT: '5801', NAME: 'A', ROLE: 'order', MODE, DELAY_MS: '5' }),
      consumer({ PORT: '5802', NAME: 'B', ROLE: 'order', MODE, DELAY_MS: '40' })]);
    await drain(call);
    const d = open(db), rows = d.prepare('SELECT id, seq, who FROM applied ORDER BY n').all();
    const best = {}, late = [];
    for (const r of rows) {
      if (r.seq < (best[r.id] || 0)) late.push(`${r.id}#${r.seq}(${r.who})`);
      best[r.id] = Math.max(best[r.id] || 0, r.seq);
    }
    const final = d.prepare('SELECT id, status, seq FROM orders ORDER BY id').all();
    return { mode, applied: rows.length, outOfOrder: late.length, late,
      wrongFinal: final.filter(o => o.seq !== 5).map(o => `${o.id}=${o.status}`),
      stuckInBuffer: d.prepare('SELECT count(*) c FROM buffer').get().c,
      byConsumer: { A: rows.filter(r => r.who === 'A').length, B: rows.filter(r => r.who === 'B').length } };
  });
}
(async () => {
  const modes = process.argv[2] ? [process.argv[2]] : ['shared', 'keyed', 'buffer', 'buffer-gap'];
  for (const m of modes) {
    const r = await run(m);
    console.log(`${r.mode.padEnd(10)} likhe=${r.applied} ulte-kram=${r.outOfOrder}${r.late.length ? ' [' + r.late.join(' ') + ']' : ''}` +
      ` galat-aakhri=${r.wrongFinal.length ? r.wrongFinal.join(',') : 0} buffer-mein-atke=${r.stuckInBuffer} A/B=${r.byConsumer.A}/${r.byConsumer.B}`);
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
