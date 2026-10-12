/* App ke clients, DB tak seedha ya pooler ke through.
   --load idle   : 1,000 clients, zyada waqt idle (0–2 sec), phir transaction BEGIN → 3 × (query + 5 ms app ka kaam) → COMMIT.
   --load busy   : 200 clients, bina ruke transactions (pgbench jaisa closed loop) — pool size sweep ke liye.
   node tools/clients.js --via db|pooler [--mode transaction|session] [--pool 16] [--load idle|busy] [--secs 8] */
const net = require('net');
const args = require('./args')();
const onLines = require('../lib/line');
const { get, post, sleep, host, pct } = require('../lib/util');
const VIA = args.via || 'pooler', LOAD = args.load || 'idle', SECS = +(args.secs || 8);
const N = +(args.clients || (LOAD === 'busy' ? 200 : 1000));
const T = VIA === 'db' ? { h: host('db'), p: 5131 } : { h: host('pooler'), p: 5132 };
function client(until, stats) {
  return new Promise(resolve => {
    const s = net.connect(T.p, T.h); s.setNoDelay(true); const waits = []; let closed = false, served = false;
    onLines(s, l => { const w = waits.shift(); if (w) w(l); else if (l.startsWith('E')) closed = true; });
    const say = line => closed ? Promise.resolve('E closed') : new Promise(r => { waits.push(r); s.write(line + '\n'); });
    s.on('error', () => {}); s.on('close', () => { closed = true; waits.splice(0).forEach(w => w('E closed')); resolve(); });
    s.on('connect', async () => {
      while (Date.now() < until) {
        if (LOAD === 'idle') await sleep(Math.random() * 2000);
        const t = Date.now(); let ok = true;
        for (const step of ['BEGIN', 'Q', 'Q', 'Q', 'COMMIT']) { const r = await say(step); if (!r.startsWith('OK')) { ok = false; break; } if (step === 'Q' && LOAD === 'idle') await sleep(5); }
        if (!ok) { stats.errors++; break; }
        if (Date.now() <= until) { stats.tx++; stats.lat.push(Date.now() - t); if (!served) { served = true; stats.served++; } }
      }
      s.destroy();
    });
  });
}
(async () => {
  if (VIA === 'pooler') await post(`http://${host('pooler')}:5142/config`, { mode: args.mode || 'transaction', pool: +(args.pool || 16) });
  await post(`http://${host('db')}:5141/reset`);
  const stats = { tx: 0, errors: 0, served: 0, lat: [] }, until = Date.now() + SECS * 1000;
  await Promise.all(Array.from({ length: N }, () => client(until, stats)));
  const d = await get(`http://${host('db')}:5141/stats`);
  const label = VIA === 'db' ? 'seedha DB' : `pooler ${args.mode || 'transaction'} pool=${args.pool || 16}`;
  console.log(`${label.padEnd(28)} tx/sec ${String(Math.round(stats.tx / SECS)).padStart(5)}   p50 ${String(pct(stats.lat, 50)).padStart(5)} ms  p99 ${String(pct(stats.lat, 99)).padStart(5)} ms   clients served ${String(stats.served).padStart(4)}/${N} (refused/fail ${stats.errors})   DB conns ${String(d.peak).padStart(3)} (≈${d.peak * 2} MB), ek saath queries ${d.peakActive}`);
})();
