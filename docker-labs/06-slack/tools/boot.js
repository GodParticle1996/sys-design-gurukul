/* N clients boot karte hain (storm = sab ek saath). Payload, lookups aur p99 boot time. */
const { get, post, pct } = require('../lib/util');
const a = require('./args')();
const N = +(a.clients || 1);
const base = 'http://localhost:' + (process.env.PORT || 4601);

async function bootOne() {
  const t = Date.now();
  const r = await fetch(base + '/boot');
  const txt = await r.text();
  const snap = JSON.parse(txt);
  const known = new Set(snap.users.map(u => u.id));
  const ev = await get(base + '/events');
  let lookups = 0;
  for (const e of ev.events) {
    for (const m of e.mentions) {
      if (typeof m === 'object') { known.add(m.id); continue; }        /* inject: profile saath aaya */
      if (!known.has(m)) { await get(base + '/user/' + m); known.add(m); lookups++; }   /* lazy: alag call */
    }
  }
  return { ms: Date.now() - t, bytes: txt.length, lookups };
}

(async () => {
  await post(base + '/reset', {});
  const all = await Promise.all(Array.from({ length: N }, () => bootOne().catch(() => null)));
  const results = all.filter(Boolean);
  const failed = N - results.length;
  const s = await get(base + '/stats');
  const ms = results.map(r => r.ms);
  const mb = results.length ? (results[0].bytes / 1e6).toFixed(2) : '?';
  const look = results.length ? Math.round(results.reduce((x, r) => x + r.lookups, 0) / results.length) : 0;
  console.log(`BOOT=${String(s.boot).padEnd(6)} clients: ${N}   payload/client: ${mb} MB   extra lookups/client: ${look}   ` +
    `p99 boot: ${pct(ms, 99)} ms   failed boots: ${failed}   core requests: ${s.coreRequests}   core sent: ${(s.coreBytes / 1e6).toFixed(1)} MB`);
})();
