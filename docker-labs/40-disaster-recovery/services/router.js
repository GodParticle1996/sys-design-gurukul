/* Route 53 jaisa router + S3 jaisa bucket (doosre region mein).
   Router: har 500 ms region A ka health check (300 ms timeout). "Lagataar 3 fail → failover" ka niyam lib/failover.js
   ka hai. Failover = B ko /activate, saara traffic B par. `active` strategy mein aam din aadha traffic A, aadha B (geo routing).
   POST /order → region    POST /config {strategy}    GET /stats
   S3 (alag port par — alag "region" ka storage):
     POST /batch {changes}  — ek aur batch jama karo (purane batch rakhe rehte hain, koi overwrite nahi)
     GET /restore           — ab tak jama sab badlav, jis kram mein aaye
     POST /reset            — bucket khaali */
const { serve, json } = require('../lib/util');
const { createDetector } = require('../lib/failover');
const PORT = +process.env.PORT || 5190, S3_PORT = +process.env.S3_PORT || 5193;
const A = process.env.A_URL || 'http://localhost:5191', B = process.env.B_URL || 'http://localhost:5192';
const THRESHOLD = 3;
let strategy = 'backup', failedOver = false, failoverAt = 0, rr = 0;
let detector = createDetector({ threshold: THRESHOLD });

async function forward(target, body) {
  try {
    const r = await fetch(target + '/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(1000) });
    return { status: r.status, body: await r.json().catch(() => null) };
  } catch (e) { return { status: 502, body: { error: 'region tak nahi pahuncha' } }; }
}
setInterval(async () => {
  if (failedOver) return;
  let ok = false;
  try { ok = (await fetch(A + '/health', { signal: AbortSignal.timeout(300) })).ok; } catch (e) {}
  if (detector.result(ok)) {                                             // THRESHOLD lagataar fail: ab B par chalo
    failedOver = true; failoverAt = Date.now();
    fetch(B + '/activate', { method: 'POST' }).catch(() => {});
  }
}, 500);

serve(PORT, {
  'POST /order': async (req, res, url, p, b) => {
    const target = failedOver ? B : (strategy === 'active' ? (rr++ % 2 ? B : A) : A);
    const r = await forward(target, b);
    return json(res, r.status, r.body);
  },
  'POST /config': (req, res, url, p, b) => { strategy = b.strategy; failedOver = false; detector = createDetector({ threshold: THRESHOLD }); failoverAt = 0; rr = 0; return { strategy }; },
  'GET /stats': () => ({ strategy, failedOver, failoverAt, fails: detector.fails() }),
}, () => console.log(`[router] :${PORT} → A ${A} · B ${B}`));

let batches = [];
serve(S3_PORT, {
  'POST /batch': (req, res, url, p, b) => { batches.push({ at: Date.now(), changes: b.changes || [] }); return { ok: true, n: (b.changes || []).length }; },
  'GET /restore': () => ({ batches: batches.length, changes: [].concat(...batches.map(x => x.changes)) }),
  'POST /reset': () => { batches = []; return { ok: true }; },
}, () => console.log(`[s3] :${S3_PORT}`));
