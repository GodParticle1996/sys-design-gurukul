/* Root: ek query → 100 shards par ek saath (scatter), sabka jawab aane tak ruko (gather).
   mode=single → har shard ka ek replica.
   mode=hedged → replica 0 ko bhejo; HEDGE_MS (≈ p95) tak jawab nahi → replica 1 ko bhi. Jo pehle aaye.
   mode=double → dono replicas ko shuru se hi (sabse tez, par load dugna). */
const http = require('http');
const { serve, host } = require('../lib/util');
const PORT = +process.env.PORT || 5022, LEAF = host('leaf'), HEDGE_MS = +(process.env.HEDGE_MS || 10);
const agent = new http.Agent({ keepAlive: true, maxSockets: 1000 });
let sent = 0;
function ask(shard, replica) {
  let rq; const p = new Promise(resolve => {
    sent++;
    rq = http.get({ host: LEAF, port: 5021, path: `/search?shard=${shard}&replica=${replica}`, agent }, r => { r.resume(); r.on('end', resolve); });
    rq.on('error', () => {});
  });
  return { p, cancel: () => rq.destroy() };
}
function one(shard, mode) {
  if (mode === 'single') return ask(shard, 0).p;
  if (mode === 'double') { const a = ask(shard, 0), b = ask(shard, 1); return Promise.race([a.p, b.p]); }
  return new Promise(resolve => {                                     // hedged
    const a = ask(shard, 0); let b = null, done = false;
    const t = setTimeout(() => { if (!done) { b = ask(shard, 1); b.p.then(() => { if (!done) { done = true; resolve(); } }); } }, HEDGE_MS);
    a.p.then(() => { if (!done) { done = true; clearTimeout(t); resolve(); } });
  });
}
serve(PORT, {
  'GET /query': async (req, res, url) => {
    const mode = url.searchParams.get('mode') || 'single', shards = +(url.searchParams.get('shards') || 100);
    const t = process.hrtime.bigint();
    await Promise.all(Array.from({ length: shards }, (_, i) => one(i, mode)));
    return { mode, shards, ms: Number(process.hrtime.bigint() - t) / 1e6 };
  },
  'GET /stats': () => ({ sent }),
  'POST /reset': () => { sent = 0; return { ok: true }; },
}, () => console.log(`[root] :${PORT} hedge after ${HEDGE_MS} ms`));
