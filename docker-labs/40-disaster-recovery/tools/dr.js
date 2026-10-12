/* ex1 · 50 orders/second. t=4s par region A khatam (datacenter gaya). Chaar DR strategies.
   Dekho: kitni der orders fail hue (RTO), kitne "ho gaya ✅" wale orders kho gaye (RPO), aur aam din region B mein kya
   chalta rehta hai (kharcha).
   Region ki copy lib/replicator.js karta hai aur router ka failover lib/failover.js — wahi jo ex0-slowmo mein ek-ek event karke dikhte hain.
   node tools/dr.js [--strategy backup|pilot|warm|active] */
const { get, post, sleep, host } = require('../lib/util');
const args = require('./args')();
const ROUTER = `http://${host('router')}:5190`, A = `http://${host('region-a')}:5191`, B = `http://${host('region-b')}:5192`, S3 = `http://${host('router')}:5193`;
const RATE = 50, KILL_AT = 4000, MAX_SECS = 40;
const S = {
  backup: ['backup & restore', 'sirf S3 snapshots (har 3 s)'],
  pilot:  ['pilot light', 'DB (replica) chalu, app band'],
  warm:   ['warm standby', 'DB + chhota app (25%)'],
  active: ['multi-site active-active', 'poora region, aadha traffic'],
};

async function run(strategy) {
  await post(S3 + '/reset');
  for (const u of [A, B]) await post(u + '/config', { strategy });
  await post(ROUTER + '/config', { strategy });
  const t0 = Date.now(), jobs = [];
  let killed = false, id = 0;
  while (Date.now() - t0 < MAX_SECS * 1000) {
    const now = Date.now() - t0;
    if (!killed && now >= KILL_AT) { killed = true; post(A + '/kill').catch(() => {}); }
    const oid = ++id, at = now;
    jobs.push(fetch(ROUTER + '/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: oid }) })
      .then(r => ({ id: oid, at, ok: r.status === 201 })).catch(() => ({ id: oid, at, ok: false })));
    if (killed && now > KILL_AT + 3000 && jobs.length > 100) {                // theek hone ke 2 s baad ruk jao
      const recent = await Promise.all(jobs.slice(-100));
      if (recent.every(r => r.ok)) break;
    }
    await sleep(1000 / RATE);
  }
  const rs = await Promise.all(jobs);
  const after = rs.filter(r => r.at >= KILL_AT);
  const lastFail = after.filter(r => !r.ok).map(r => r.at).sort((x, y) => y - x)[0];
  const rto = lastFail == null ? 0 : (lastFail - KILL_AT) / 1000;
  const acked = rs.filter(r => r.ok).map(r => r.id);
  const inB = new Set((await get(B + '/orders')).ids);
  const lost = acked.filter(x => !inB.has(x)).length;
  return { rto, failed: after.filter(r => !r.ok).length, lost, acked: acked.length };
}

(async () => {
  const list = args.strategy ? [args.strategy] : Object.keys(S);
  console.log(`${RATE} orders/s · t=${KILL_AT / 1000}s par region A khatam · health check 500 ms × 3 = 1.5 s mein pata chalta hai\n`);
  console.log('strategy                    aam din B mein chalu               fail hote rahe (RTO)   fail orders   "ho gaya" par kho gaye (RPO)');
  for (const k of list) {
    const r = await run(k);
    console.log(`${S[k][0].padEnd(27)} ${S[k][1].padEnd(34)} ${String(r.rto.toFixed(1) + ' s').padStart(10)}          ${String(r.failed).padStart(6)}        ${String(r.lost).padStart(6)} / ${r.acked}`);
    await sleep(500);
  }
})();
