/* ex2 · Autoscaling ka "trigger window". A t=2s se 300 req/s (chhat 200). Autoscaler: 3 s tak 80% busy dekhe → 5 s boot
   → naye 4 workers (chhat 400). Tab tak? B, C (30 req/s har ek) ka kya?
   node tools/autoscale.js [--setup fifo-auto|fair|fair-auto] */
const { get, post, pct, sleep, host } = require('../lib/util');
const args = require('./args')();
const load = require('./load');
const SVC = `http://${host('shared')}:5181`;
const SETUPS = {
  'fifo-auto': ['ek line + autoscale', { policy: 'fifo', autoscale: true }],
  'fair':      ['fair queuing, autoscale nahi', { policy: 'fair', autoscale: false }],
  'fair-auto': ['fair queuing + autoscale', { policy: 'fair', autoscale: true }],
};

(async () => {
  const keys = args.setup ? [args.setup] : Object.keys(SETUPS);
  console.log('A: 50 req/s, t=2s se 300 req/s · B, C: 30 req/s · 16 s · chhat 200 req/s → autoscale ke baad 400\n');
  console.log('setup                          naye workers kab   B+C error (scale se pehle / baad)   B+C p99 (pehle / baad)   A safal / bheje');
  for (const k of keys) {
    const [name, cfg] = SETUPS[k];
    await post(SVC + '/reset'); await post(SVC + '/config', cfg);
    const rs = await load(SVC, 16, [
      { t: 'A', rate: ms => (ms >= 2000 ? 300 : 50) },
      { t: 'B', rate: () => 30 }, { t: 'C', rate: () => 30 },
    ]);
    const s = await get(SVC + '/stats');
    const cut = s.scaledAtMs || 1e9;
    const quiet = rs.filter(r => r.t !== 'A' && r.at >= 2000);
    const before = quiet.filter(r => r.at < cut), after = quiet.filter(r => r.at >= cut);
    const err = x => x.filter(r => r.status !== 200).length, p99 = x => pct(x.filter(r => r.status === 200).map(r => r.ms), 99);
    const a = rs.filter(r => r.t === 'A');
    const when = s.scaledAtMs ? `t=${(s.scaledAtMs / 1000).toFixed(1)}s` : 'kabhi nahi';
    console.log(`${name.padEnd(30)} ${when.padStart(10)}          ${String(err(before)).padStart(4)}/${String(before.length).padEnd(4)} / ${after.length ? String(err(after)).padStart(4) + '/' + after.length : '   -'}               ${String(p99(before) + ' ms').padStart(8)} / ${after.length ? p99(after) + ' ms' : '-'}         ${a.filter(r => r.status === 200).length} / ${a.length}`);
    await sleep(500);
  }
})();
