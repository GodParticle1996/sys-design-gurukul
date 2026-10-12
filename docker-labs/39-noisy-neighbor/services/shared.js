/* Ek shared multi-tenant service: WORKERS ek saath (har request WORK ms) — 4 × 50 = 200 requests/second ki chhat.
   Request kis tenant ki: GET /work?t=A
   Kaun pehle chalega (POST /config {policy}):
     fifo   — sab tenants ek hi line mein (line QMAX se lambi → 503)
     quota  — ek hi line, par har tenant ka token bucket (QUOTA req/s); zyada → 429 turant
     fair   — har tenant ki apni line; workers baari-baari har tenant se ek uthate hain (round robin).
              Har tenant ki line alag bhar sakti hai (TENANT_QMAX) — shor karne wala sirf apni line bharta hai
   autoscale: 3 s tak 80% se zyada busy → 5 s mein naye 4 workers boot hote hain (sirf ek baar)
   Batch job (cleanup cron): POST /batch {chunks, parallel, chunkMs, priority: 'same'|'low'} — har chunk ek worker chunkMs (100) leta hai,
     `parallel` chunks ek saath line mein. same = users ki line mein hi · low = sirf tab jab users ki line khaali ho
   GET /stats   POST /reset
   Baari-baari wali line: lib/fair-queue.js · token wali baalti: lib/token-bucket.js (wahi jo tools/slowmo.js aur tools/mini.js chalate hain) */
const { serve, json } = require('../lib/util');
const { FairQueue } = require('../lib/fair-queue');
const { TokenBucket } = require('../lib/token-bucket');
const PORT = +process.env.PORT || 5181;
const WORK = 20, QMAX = 200, TENANT_QMAX = 100, QUOTA = 80;
let cfg = { policy: 'fifo', autoscale: false };
let workers = 4, busy = 0, fifo = [], fair = new FairQueue({ perTenant: TENANT_QMAX }), batchQ = [], buckets = new Map();
let hotSince = 0, bootAt = 0, scaledAt = 0, t0 = Date.now(), rejected = { 503: 0, 429: 0 }, batchDone = 0, batchStart = 0, batchEnd = 0, batchGen = 0;

function allow(t) {                                                         // quota: har tenant ki apni token wali baalti
  if (!buckets.has(t)) buckets.set(t, new TokenBucket({ rate: QUOTA }));
  return buckets.get(t).take();
}
function next() {
  if (cfg.policy === 'fair') { const j = fair.next(); if (j) return j; }     // baari-baari: har tenant ki line se ek
  else if (fifo.length) return fifo.shift();
  return batchQ.length ? batchQ.shift() : null;                             // batch 'low': sirf jab users ki line khaali
}
function pump() {
  while (busy < workers) {
    const j = next(); if (!j) return;
    busy++;
    setTimeout(() => { busy--; j.done(); pump(); }, j.work || WORK);
  }
}
setInterval(() => {                                                         // autoscaler
  if (!cfg.autoscale || bootAt || scaledAt) return;
  if (busy / workers >= 0.8) { if (!hotSince) hotSince = Date.now(); if (Date.now() - hotSince >= 3000) { bootAt = Date.now(); setTimeout(() => { workers += 4; scaledAt = Date.now() - t0; pump(); }, 5000); } }
  else hotSince = 0;
}, 250);

serve(PORT, {
  'GET /work': (req, res, url) => {
    const t = url.searchParams.get('t') || '?';
    if (cfg.policy === 'quota' && !allow(t)) { rejected[429]++; return json(res, 429, { error: 'tenant quota khatam' }); }
    return new Promise(resolve => {
      const job = { t, done: () => resolve({ ok: true }) };
      if (cfg.policy === 'fair') {
        if (!fair.push(t, job)) { rejected[503]++; return resolve(json(res, 503, { error: 'tumhari line bhari' })); }
      } else {
        if (fifo.length >= QMAX) { rejected[503]++; return resolve(json(res, 503, { error: 'line bhari' })); }
        fifo.push(job);
      }
      pump();
    });
  },
  /* cron job: `parallel` chunks hamesha line mein (jaise 2 background threads), ek khatam → agla */
  'POST /batch': (req, res, url, p, b) => {
    const total = b.chunks || 300, parallel = b.parallel || 2, work = b.chunkMs || 100;   // cleanup ka ek chunk: 100 ms DB kaam
    let issued = 0, finished = 0;
    const gen = ++batchGen;                                                 // reset ya naya job → purana job ruk jaaye
    batchStart = Date.now(); batchEnd = 0; batchDone = 0;
    const issue = () => {
      if (gen !== batchGen || issued >= total) return;
      issued++;
      const job = { t: 'batch', work, done: () => { if (gen !== batchGen) return; batchDone++; if (++finished === total) batchEnd = Date.now(); else issue(); } };
      if (b.priority === 'low') batchQ.push(job);
      else if (cfg.policy === 'fair') fair.push('batch', job);
      else fifo.push(job);
      pump();
    };
    for (let i = 0; i < parallel; i++) issue();
    return { chunks: total, parallel };
  },
  'POST /config': (req, res, url, p, b) => { cfg = Object.assign(cfg, b || {}); return cfg; },
  'GET /stats': () => ({ workers, busy, queued: fifo.length, rejected, scaledAtMs: scaledAt || null, batchDone, batchMs: batchEnd ? batchEnd - batchStart : null }),
  'POST /reset': () => {
    batchGen++; workers = 4; fifo = []; fair = new FairQueue({ perTenant: TENANT_QMAX }); batchQ = []; buckets = new Map(); hotSince = 0; bootAt = 0; scaledAt = 0;
    t0 = Date.now(); rejected = { 503: 0, 429: 0 }; batchDone = 0; batchStart = 0; batchEnd = 0; cfg = { policy: 'fifo', autoscale: false };
    return { ok: true };
  },
}, () => console.log(`[shared] :${PORT} · ${workers} workers × ${WORK} ms`));
