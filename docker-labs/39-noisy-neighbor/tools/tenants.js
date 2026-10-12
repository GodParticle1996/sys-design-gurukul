/* ex1 · Tenant A (shor karne wala) t=2s se t=7s tak 400 req/s — service ki chhat (200) ka dugna.
   Tenant B aur C (shaant) — 30 req/s har ek, poore 10 s. Teen niyam: fifo · quota (har tenant 80 req/s) · fair.
   node tools/tenants.js [--policy fifo|quota|fair]
   Doosra scene — koi shor nahi karta, par jod chhat se upar:  node tools/tenants.js --scenario average
     A, B, C teeno 80 req/s (kul 240, chhat 200), poore 10 s. Wahi teen niyam. */
const { get, post, pct, sleep, host } = require('../lib/util');
const args = require('./args')();
const load = require('./load');
const SVC = `http://${host('shared')}:5181`;
const NAMES = { fifo: 'ek line (FIFO)', quota: 'har tenant quota 80/s', fair: 'fair queuing (baari-baari)' };

async function burst(pols) {
  console.log('Service: 4 workers × 20 ms = 200 req/s · A: 50 req/s, t=2–7s par 400 req/s · B, C: 30 req/s har ek · 10 s\n');
  console.log('niyam                         B+C (shaant) p50   p99       error      A: safal / 429 / 503');
  for (const p of pols) {
    await post(SVC + '/reset'); await post(SVC + '/config', { policy: p });
    const rs = await load(SVC, 10, [
      { t: 'A', rate: ms => (ms >= 2000 && ms < 7000 ? 400 : 50) },
      { t: 'B', rate: () => 30 }, { t: 'C', rate: () => 30 },
    ]);
    const quiet = rs.filter(r => r.t !== 'A'), a = rs.filter(r => r.t === 'A');
    const okq = quiet.filter(r => r.status === 200).map(r => r.ms);
    console.log(`${NAMES[p].padEnd(29)} ${String(pct(okq, 50) + ' ms').padStart(8)}  ${String(pct(okq, 99) + ' ms').padStart(8)}   ${String(quiet.filter(r => r.status !== 200).length).padStart(4)}/${quiet.length}     ${String(a.filter(r => r.status === 200).length).padStart(5)} / ${String(a.filter(r => r.status === 429).length).padStart(4)} / ${a.filter(r => r.status === 503).length}   (A ne bheje ${a.length})`);
    await sleep(500);
  }
}

/* teen "ausat" tenants: har ek chhat ke neeche, par jod chhat ke upar */
async function average(pols) {
  console.log('Service: 4 workers × 20 ms = 200 req/s · A, B, C: teeno 80 req/s (kul 240) · 10 s\n');
  console.log('niyam                         A: fail / bheje      B: fail / bheje      C: fail / bheje      safal p50      p99');
  for (const p of pols) {
    await post(SVC + '/reset'); await post(SVC + '/config', { policy: p });
    const rs = await load(SVC, 10, ['A', 'B', 'C'].map(t => ({ t, rate: () => 80 })));
    const cell = t => { const x = rs.filter(r => r.t === t), bad = x.filter(r => r.status !== 200).length; return `${String(bad).padStart(4)} / ${String(x.length).padEnd(4)} (${String(Math.round(bad / x.length * 100)).padStart(2)}%)`; };
    const ok = rs.filter(r => r.status === 200).map(r => r.ms);
    console.log(`${NAMES[p].padEnd(29)} ${cell('A')}    ${cell('B')}    ${cell('C')}   ${String(pct(ok, 50) + ' ms').padStart(8)}  ${String(pct(ok, 99) + ' ms').padStart(8)}`);
    await sleep(500);
  }
}

(async () => {
  const pols = args.policy ? [args.policy] : ['fifo', 'quota', 'fair'];
  if (args.scenario === 'average') await average(pols); else await burst(pols);
})();
