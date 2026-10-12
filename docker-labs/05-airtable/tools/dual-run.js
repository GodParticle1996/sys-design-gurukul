/* N operations dono engines par — mismatch report */
const { get, post, pct } = require('../lib/util');
const a = require('./args')();
const N = +(a.ops || 5000);
const base = 'http://localhost:' + (process.env.PORT || 4503);
function rnd(seed) { let x = seed; return () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648; }
(async () => {
  if (a.fix) await post(base + '/admin/fix', {});
  await post(base + '/reset', {});
  const r = rnd(42);
  const times = [];
  for (let i = 0; i < N; i++) {
    const fn = r() < 0.5 ? 'avg' : 'sum';
    const len = 3 + Math.floor(r() * 5);
    const xs = Array.from({ length: len }, () => (fn === 'sum' && r() < 0.01) ? null : Math.round(r() * 5000) / 100);
    const t = Date.now();
    await post(base + '/op', { fn, xs });
    times.push(Date.now() - t);
  }
  const rep = await get(base + '/report');
  console.log(`primary=${rep.primary}   ops: ${rep.ops}   mismatches: ${rep.mismatches}   (${((rep.mismatches / rep.ops) * 100).toFixed(2)}%)   p99: ${pct(times, 99)} ms` + (rep.mismatches ? '' : '   ✅ dono engines ka jawab same'));
  for (const [k, v] of Object.entries(rep.kinds)) console.log(`  ${k.padEnd(22)} ×${v.n}   e.g. ${v.example}`);
})();
