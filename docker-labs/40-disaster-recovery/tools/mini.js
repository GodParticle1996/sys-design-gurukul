/* Sabse chhota chalta program: ek app + lib/replicator.js.
   Koi service nahi chalani. Upar ka hissa (separator tak)
   wahi hai jo tum apne app mein likhoge. Neeche ka hissa
   bas dikhane ke liye hai: har 0.5 s par ek order, phir
   yeh region gaya. Doosre region mein kaun se order hain?
   node tools/mini.js          # async: pehle "ho gaya"
   node tools/mini.js --sync   # sync: pehle copy */
const { serve, json } = require('../lib/util');
const { createReplicator } = require('../lib/replicator');

const PORT = 5195;
const SYNC = process.argv.includes('--sync');

const rep = createReplicator({
  mode: SYNC ? 'sync' : 'async',
  everyMs: 2000,
  // asli app mein yahan fetch(...) hoga
  ship: batch => other.receive(batch),
});

async function order(req, res, url, params, body) {
  try {
    await rep.write(body);   // sync: yahin ruko
    return json(res, 201, { ok: true });   // ho gaya
  } catch (e) {
    return json(res, 503, { ok: false });  // copy nahi hui
  }
}

serve(PORT, { 'POST /order': order }, () => rep.start());

/* ------------------------- sirf dikhane ke liye ------------------------- */
const { sleep } = require('../lib/util');
const { ids } = require('./sim');
const T0 = Date.now();
const MODE = SYNC ? 'sync' : 'async';
const DIES = 3800, EVERY = 500, FIRST = 350, N = 7;
const s2 = ms => (ms / 1000).toFixed(2) + ' s';
const tenth = ms => (Math.round(ms / 100) / 10).toFixed(1) + ' s';   // 100 ms ke dayre mein: jhatke chhup jate hain

const other = {                          // nakli doosra region: ek Set aur 0.2 s ka raasta
  has: new Set(),
  async receive(batch) {
    await sleep(200);
    batch.forEach(c => this.has.add(c.id));
  },
};
const say = (t, cols, note) => console.log(`  ${s2(t).padStart(7)}   ${cols.padEnd(40)}${note ? ' ' + note : ''}`.trimEnd());

(async () => {
  console.log(`app :${PORT} · lib/replicator.js · mode: ${MODE}${MODE === 'async' ? ' · copy har 2 s par' : ' · har order doosre region ka jawab dekhta hai'}\n`);
  console.log('    samay   order  jawab  kitni der   A mein  doosre mein');
  const acked = [];
  const until = t => sleep(Math.max(0, T0 + t - Date.now()));
  const notes = MODE === 'async'
    ? { 1: '← "ho gaya" turant; copy abhi nahi gayi', 5: '← 2.00 s par #1–#4 ki copy gayi (pahunchi 2.20 s par)' }
    : { 1: '← pehle doosre region ka jawab (0.2 s), phir "ho gaya"', 5: '← har order mein wahi 0.2 s ka intezaar' };
  for (let id = 1; id <= N; id++) {
    const t = FIRST + (id - 1) * EVERY;
    await until(t);
    const t1 = Date.now();
    const r = await fetch(`http://localhost:${PORT}/order`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    const took = Date.now() - t1;
    if (r.status === 201) acked.push(id);
    say(t, `#${String(id).padEnd(4)} ${String(r.status).padEnd(6)} ${tenth(took).padEnd(11)} ${String(rep.orders.size).padEnd(7)} ${other.has.size}`, notes[id]);
  }
  await until(DIES);
  rep.stop();
  console.log(`\n💥 ${s2(DIES)} par yeh region gaya (jo kuch sirf yahan tha, woh gaya)\n`);
  const gone = acked.filter(id => !other.has.has(id));
  console.log(`  ${'"ho gaya" (201) mila:'.padEnd(30)}${ids(acked)} (${acked.length} order)`);
  console.log(`  ${'doosre region mein hain:'.padEnd(30)}${ids([...other.has])} (${other.has.size} order)`);
  console.log(`  ${'"ho gaya" mila, par kho gaye:'.padEnd(30)}${gone.length ? `${ids(gone)} (${gone.length} order)` : 'koi nahi (0 order)'}`);
  process.exit(0);
})();
