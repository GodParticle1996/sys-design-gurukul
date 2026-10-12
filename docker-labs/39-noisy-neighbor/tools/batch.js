/* ex3 · Raat wala cleanup job (fraud users hatao) din mein chal gaya. 300 chunks, 4 ek saath, har chunk 100 ms ka DB kaam.
   Users: A 50 + B 30 + C 30 = 110 req/s (chhat 200). Job t=2s par shuru.
   Chaar tareeke: peak par users ki line mein · peak par low priority · low priority + sirf 1 worker · off-peak (users 20 req/s)
   node tools/batch.js [--setup same|low|low1|offpeak] */
const { get, post, pct, sleep, host } = require('../lib/util');
const args = require('./args')();
const load = require('./load');
const SVC = `http://${host('shared')}:5181`;
const SETUPS = {
  same:    ['peak par, users ki line mein', 'same', [50, 30, 30], 4],
  low:     ['peak par, low priority', 'low', [50, 30, 30], 4],
  low1:    ['peak par, low priority + max 1 worker', 'low', [50, 30, 30], 1],
  offpeak: ['off-peak par (users 20 req/s)', 'same', [10, 5, 5], 4],
};

(async () => {
  const keys = args.setup ? [args.setup] : Object.keys(SETUPS);
  console.log('Service 200 req/s · cleanup: 300 chunks × 100 ms, t=2s se · 12 s\n');
  console.log('job kab / kaise                          users p50 (job ke dauraan)   users p99   users error   job khatam hone mein');
  for (const k of keys) {
    const [name, priority, [ra, rb, rc], parallel] = SETUPS[k];
    await post(SVC + '/reset'); await post(SVC + '/config', { policy: 'fifo' });
    setTimeout(() => post(SVC + '/batch', { chunks: 300, parallel, chunkMs: 100, priority }), 2000);
    const rs = await load(SVC, 12, [{ t: 'A', rate: () => ra }, { t: 'B', rate: () => rb }, { t: 'C', rate: () => rc }]);
    const s = await get(SVC + '/stats');
    const end = s.batchMs ? 2000 + s.batchMs : 12000;
    const during = rs.filter(r => r.at >= 2000 && r.at < end);
    const ok = during.filter(r => r.status === 200).map(r => r.ms);
    console.log(`${name.padEnd(40)} ${String(pct(ok, 50) + ' ms').padStart(10)}               ${String(pct(ok, 99) + ' ms').padStart(8)}     ${String(during.filter(r => r.status !== 200).length).padStart(4)}/${String(during.length).padEnd(5)}   ${s.batchMs ? (s.batchMs / 1000).toFixed(1) + ' s' : `10 s mein ${s.batchDone}/300`}`);
    await sleep(500);
  }
})();
