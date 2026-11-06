/* ex3-chain: payment → stock → confirm, asli HTTP par, teen tarah:
   direct (har kadam agle ka intezaar), events (failure par chup), events + failure event.
   Apne paanch child processes chalata hai (5700–5704) aur aakhir mein band karta hai. */
const { spawn } = require('node:child_process');
const path = require('node:path');
const { call, sleep } = require('../lib/http');
const B = 'http://localhost:', broker = B + 5701;
const specs = [
  ['broker', { PORT: '5701' }],
  ['api', { PORT: '5700', BROKER: broker, PAYMENT: B + 5702 }],
  ['step', { PORT: '5702', NAME: 'payment', WORK_MS: '30', NEXT: B + 5703, IN: 'placed', OUT: 'paid', BROKER: broker }],
  ['step', { PORT: '5703', NAME: 'stock', WORK_MS: '20', FAIL_ITEM: 'gulab-jamun', NEXT: B + 5704, IN: 'paid', OUT: 'reserved', BROKER: broker }],
  ['step', { PORT: '5704', NAME: 'confirm', WORK_MS: '10', IN: 'reserved', OUT: 'done', BROKER: broker }],
];
const steps = [5702, 5703, 5704].map(p => B + p);
function start([file, env]) {
  const kid = spawn(process.execPath, [path.join(__dirname, '..', 'services', file + '.js')],
    { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((ok, fail) => {
    kid.stdout.on('data', d => { if (String(d).includes('ready')) ok(kid); });
    kid.on('exit', code => fail(Error(`${file} ${env.PORT} exit ${code}`)));
  });
}
const ms = t => Math.round(performance.now() - t);
async function order(mode, id, item) {
  const t0 = performance.now();
  try {
    const r = await call(B + 5700, '/orders', { id: String(id), item, mode });
    const reply = ms(t0);
    if (mode === 'direct') return { id, item, reply, done: reply, status: r.status };
    while (ms(t0) < 1500) {
      const s = await call(B + 5700, '/orders/' + id);
      if (s.status !== 'pending') return { id, item, reply, done: ms(t0), status: s.status, reason: s.reason };
      await sleep(5);
    }
    return { id, item, reply, done: null, status: 'pending (1500 ms tak)' };
  } catch (e) {
    const t = ms(t0);
    return { id, item, reply: t, done: t, status: 'error', reason: e.message };
  }
}
const median = xs => {
  const s = [...xs].sort((a, b) => a - b), mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
(async () => {
  const kids = [];
  try {
    for (const s of specs) kids.push(await start(s));
    const runs = [['direct', false], ['events', false], ['events', true]];
    for (const [k, [mode, failEvents]] of runs.entries()) {
      for (const u of steps) await call(u, '/config', { poll: mode === 'events', failEvents });
      const label = mode === 'direct' ? 'direct' : failEvents ? 'events + OrderFailed' : 'events (failure par chup)';
      console.log(`\n== ${label}`);
      const rows = [];
      for (let i = 1; i <= 5; i++) rows.push(await order(mode, (k + 1) * 100 + i, i === 4 ? 'gulab-jamun' : 'thali'));
      for (const r of rows) console.log(`  #${r.id} ${r.item.padEnd(11)} jawab ${String(r.reply).padStart(3)} ms` +
        ` | aakhri haalat ${r.done == null ? '   —' : String(r.done).padStart(4) + ' ms'} | ${r.status}${r.reason ? ' (' + r.reason + ')' : ''}`);
      const ok = rows.filter(r => r.status === 'confirmed');
      console.log(`  median jawab (paanchon) ${median(rows.map(r => r.reply))} ms · median confirmed (${ok.length} safal) ${median(ok.map(r => r.done))} ms`);
    }
  } finally {
    kids.forEach(k => k.kill());
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
