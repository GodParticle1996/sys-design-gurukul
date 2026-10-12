/* ex2 · pehle "ho gaya" ya pehle copy? — asli raftaar. Region B ka DB chalu hai (pilot-jaisa). 50 orders/second seedhe region A ko.
   Region A 2.5 s par khatam. Chaar row (lib/replicator.js ke do mode × B theek / B unreachable):
     async               "ho gaya" turant; jama orders har 300 ms par B ko
     sync                har order B ka jawab aane ke BAAD "ho gaya"
     async-b-down        async, par B 1.0 s se 3.0 s tak (2 s) unreachable
     sync-b-down         sync, par B 1.0 s se 3.0 s tak (2 s) unreachable
   A se B tak copy ke raaste mein nakli cross-region round trip: RTT = 40 ms (region.js mein sleep; async mein bhi wahi raasta,
   bas koi uska intezaar nahi karta). B "unreachable" = B ke /replicate ko jawab hi nahi milta; A 500 ms dekh ke thak jaata hai.
   Dekho: time per order · "ho gaya" mila par B mein nahi (RPO) · B unreachable ke dauraan kitne order fail · waiting list kitni badi.
   time per order = order bhejne se A ka jawab (201 ya 503) aane tak. Jo order A ke jaane par atak gaye, unka jawab hi nahi aaya — woh nahi gine.
   node tools/syncrepl.js [--row async|sync|async-b-down|sync-b-down] */
const { get, post, sleep, pct, host } = require('../lib/util');
const args = require('./args')();
const A = `http://${host('region-a')}:5191`, B = `http://${host('region-b')}:5192`;
const RATE = 50, RTT = 40, EVERY = 300, KILL_AT = 2500, SEND_UNTIL = 2800, DOWN_AT = 1000, DOWN_MS = 2000;
const ROWS = {
  async:          { name: 'async (copy har 300 ms)', mode: 'async', down: false },
  sync:           { name: 'sync (B ka jawab, phir "ho gaya")', mode: 'sync', down: false },
  'async-b-down': { name: 'async + B 2 s unreachable', mode: 'async', down: true },
  'sync-b-down':  { name: 'sync + B 2 s unreachable', mode: 'sync', down: true },
};

async function run(key) {
  const row = ROWS[key];
  await post(A + '/config', { strategy: 'pilot', mode: row.mode, everyMs: EVERY, rttMs: RTT });
  await post(B + '/config', { strategy: 'pilot' });
  const t0 = performance.now(), jobs = [], gap = 1000 / RATE;
  let killed = false, downed = false;
  for (let i = 0; i * gap <= SEND_UNTIL; i++) {
    const at = i * gap;
    await sleep(Math.max(0, t0 + at - performance.now()));
    if (row.down && !downed && at >= DOWN_AT) { downed = true; post(B + '/blackout', { ms: DOWN_MS }).catch(() => {}); }
    if (!killed && at >= KILL_AT) { killed = true; post(A + '/kill').catch(() => {}); }
    const id = i + 1, sent = performance.now();
    const done = status => ({ id, at, ms: performance.now() - sent, status });
    jobs.push(fetch(A + '/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) })
      .then(r => done(r.status)).catch(() => done(0)));              // status 0 = connection toota (A gaya)
  }
  const res = await Promise.all(jobs);
  await sleep(300);                                                    // raaste mein bachi copy baith jaye
  const answered = res.filter(r => r.at < KILL_AT && r.status !== 0).map(r => r.ms);
  const acked = res.filter(r => r.status === 201).map(r => r.id);
  const inB = new Set((await get(B + '/orders')).ids);
  const st = await get(A + '/stats');
  const sentInWindow = res.filter(r => r.at >= DOWN_AT && r.at < KILL_AT);
  return {
    med: pct(answered, 50), p99: pct(answered, 99), acked: acked.length, lost: acked.filter(id => !inB.has(id)).length,
    failed: row.down ? sentInWindow.filter(r => r.status !== 201).length : null, inWindow: sentInWindow.length,
    maxWaiting: st.maxWaiting, atKill: st.waiting,
  };
}

(async () => {
  const list = args.row ? [args.row] : Object.keys(ROWS);
  console.log(`${RATE} orders/s · A se B tak nakli round trip ${RTT} ms · region A ${KILL_AT / 1000} s par khatam · B-down rows: B ${DOWN_AT / 1000} s se ${(DOWN_AT + DOWN_MS) / 1000} s tak unreachable\n`);
  console.log('setup                              median     p99   "ho gaya" par kho gaye   B unreachable mein fail   sabse badi waiting list   kill par waiting list');
  for (const k of list) {
    if (!ROWS[k]) { console.log(`\n--row ${k}? Yeh chalte hain: ${Object.keys(ROWS).join(' | ')}`); process.exit(1); }
    const r = await run(k);
    const failed = r.failed == null ? '—' : `${r.failed} / ${r.inWindow}`;
    console.log(`${ROWS[k].name.padEnd(34)} ${String(r.med + ' ms').padStart(7)} ${String(r.p99 + ' ms').padStart(7)}   ${String(r.lost + ' / ' + r.acked).padStart(14)}          ${failed.padStart(11)}                  ${String(r.maxWaiting).padStart(8)}                 ${String(r.atKill).padStart(8)}`);
    await sleep(500);
  }
})();
