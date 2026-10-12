/* 6 asli cache nodes, 1 lakh keys. Ek node mara → kitni keys ki "jagah" badli (= cache miss = DB par query)?
   Ek node joda → kitni keys hilin? Aur load kitna barabar? node tools/rehash.js */
const { post, get, host } = require('../lib/util');
const { make } = require('../lib/router');
const ALL = [5121, 5122, 5123, 5124, 5125, 5126].map(p => `${host('node' + (p - 5120))}:${p}`), NEW = `${host('node7')}:5127`;
const KEYS = Array.from({ length: 100000 }, (_, i) => 'user:' + i);
const byNode = (route, keys) => { const m = new Map(); for (const k of keys) { const n = route(k); if (!m.has(n)) m.set(n, []); m.get(n).push(k); } return m; };
async function fill(route) { for (const n of [...ALL, NEW]) await post(`http://${n}/flush`); for (const [n, ks] of byNode(route, KEYS)) for (let i = 0; i < ks.length; i += 5000) await post(`http://${n}/mset`, { pairs: ks.slice(i, i + 5000).map(k => [k, 1]) }); }
async function readAll(route) { let miss = 0; for (const [n, ks] of byNode(route, KEYS)) for (let i = 0; i < ks.length; i += 5000) { try { miss += (await post(`http://${n}/mget`, { keys: ks.slice(i, i + 5000) })).miss; } catch (e) { miss += Math.min(5000, ks.length - i); } } return miss; }
(async () => {
  const weights = { [ALL[0]]: 2 };                                       // node1 dugni RAM wala
  console.log('mode       load (sabse zyada / sabse kam keys)   node3 mara → cache miss (DB queries)   node7 joda → keys hilin');
  for (const mode of ['modulo', 'ring', 'vnodes', 'weighted']) {
    const route = make(mode, ALL, weights);
    await fill(route);
    const counts = await Promise.all(ALL.map(async n => (await get(`http://${n}/stats`)).keys));
    const without3 = make(mode, ALL.filter(n => !n.endsWith(':5123')), weights);
    const miss = await readAll(without3);
    await fill(route);
    const with7 = make(mode, [...ALL, NEW], weights);
    const moved = KEYS.filter(k => with7(k) !== route(k)).length;
    const note = mode === 'weighted' ? ` (node1 weight 2 → ${counts[0]})` : '';
    console.log(`${mode.padEnd(10)} ${String(Math.max(...counts)).padStart(6)} / ${String(Math.min(...counts)).padEnd(6)} = ${(Math.max(...counts) / Math.min(...counts)).toFixed(1).padStart(5)}x${note.padEnd(24)} ${String(miss).padStart(6)} (${(miss / 1000).toFixed(1)}%)                      ${String(moved).padStart(6)} (${(moved / 1000).toFixed(1)}%)`);
  }
  console.log('\nIdeal: node mara → sirf USKI keys (~16.7%) miss. Node joda → sirf ~14.3% (1/7) hilen.');
  console.log('Modulo: N badla toh lagbhag SAB keys ki jagah badli → poora cache ek saath thanda → DB par toofan.');
  console.log('Ring: sirf padosi ki keys hilti hain, par ek jagah per node = load bahut tedha. Vnodes: barabar load + kam hilna.');
})();
