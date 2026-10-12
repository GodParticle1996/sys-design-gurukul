/* Load balancer. Algorithm (POST /config {algo}):
     rr        — round robin: 1, 2, 3, 4, 5, 1, … (ek counter)
     random    — koi bhi ek, bina kuch dekhe
     leastconn — LB ke APNE ginti se: jis backend par abhi sabse kam requests (LB khud gin raha hai — hamesha taaza)
     resource  — backends har 500 ms apna load average bhejte hain (heartbeat) → sabse kam load wala. Jaankari 500 ms purani.
     p2c       — "power of two choices": do random backends, unme se kam load wala — wahi 500 ms purani jaankari
     p2c-live  — power of two choices, par LB ki APNI taaza ginti se (Envoy / NGINX isi tarah chalate hain)
   GET /work → ek backend   POST /config   GET /stats
   Chunne ke chaaron tareeke: lib/pick.js (wahi jo tools/slowmo.js aur tools/mini.js chalate hain).
   "resource" aur "leastconn" ek hi tareeka hain (sabse kam load wala) — farak sirf jaankari ka hai: purani ya taaza. */
const { serve, json, get, host } = require('../lib/util');
const { roundRobin, anyOne, leastLoaded, bestOfTwo } = require('../lib/pick');
const PORT = +process.env.PORT || 5201;
const BACKENDS = (process.env.BACKENDS || '5202,5203,5204,5205,5206').split(',').map((p, i) =>
  p.startsWith('http') ? p : `http://localhost:${p}`);
let algo = 'rr', inflight = BACKENDS.map(() => 0), reported = BACKENDS.map(() => 0), sent = BACKENDS.map(() => 0);
const state = { next: 0 };                                                    // round robin ki ginti

setInterval(() => BACKENDS.forEach((b, i) => get(b + '/load').then(r => { reported[i] = r.load; }).catch(() => {})), 500);   // heartbeat

function pick() {
  const n = BACKENDS.length;
  if (algo === 'rr') return roundRobin(state, n);
  if (algo === 'random') return anyOne(n, Math.random);
  if (algo === 'leastconn') return leastLoaded(inflight, Math.random);       // LB ki APNI ginti — hamesha taaza
  if (algo === 'resource') return leastLoaded(reported, Math.random);        // heartbeat se aayi jaankari — 500 ms tak purani
  return bestOfTwo(algo === 'p2c-live' ? inflight : reported, Math.random);  // do mein se behtar: purani ya taaza jaankari
}

serve(PORT, {
  'GET /work': async (req, res) => {
    const i = pick(); inflight[i]++; sent[i]++;
    try { const r = await fetch(BACKENDS[i] + '/work'); return json(res, r.status, await r.json()); }
    catch (e) { return json(res, 502, { error: 'backend' }); }
    finally { inflight[i]--; }
  },
  'POST /config': (req, res, url, p, b) => { if (b.algo) algo = b.algo; state.next = 0; sent = BACKENDS.map(() => 0); return { algo }; },
  'GET /stats': () => ({ algo, sent }),
}, () => console.log(`[lb] :${PORT} → ${BACKENDS.length} backends`));
