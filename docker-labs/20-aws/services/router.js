/* Router: customer ki request uske workers mein se kisi ek ko. Fail hua (connection toota) → uske AGLE worker par retry.
   SHARDING (POST /mode):
     none    → har customer ke paas saare 8 workers
     shard   → 4 shards × 2 workers: customer c → shard c % 4
     shuffle → har customer ka apna 2-of-8 combination (28 combinations) */
const http = require('http');
const { serve, host } = require('../lib/util');
const PORT = +process.env.PORT || 4932, W = 8, BASE = 4940, CUSTOMERS = 100;
const WHOST = host('fleet');
let MODE = process.env.SHARDING || 'shuffle';
const combos = []; for (let a = 0; a < W; a++) for (let b = a + 1; b < W; b++) combos.push([a, b]);    // C(8,2) = 28
function hash(n) { let x = (n + 1) * 2654435761 >>> 0; x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995) >>> 0; return (x ^ (x >>> 15)) >>> 0; }
function workersOf(c) {
  if (MODE === 'none') return [...Array(W).keys()];
  if (MODE === 'shard') { const s = c % 4; return [2 * s, 2 * s + 1]; }
  return combos[hash(c) % combos.length];
}
function call(w, poison) {
  return new Promise(resolve => {
    const rq = http.get({ host: WHOST, port: BASE + w, path: '/work' + (poison ? '?poison=1' : ''), agent: false }, r => { r.resume(); resolve(r.statusCode === 200); });
    rq.on('error', () => resolve(false)); rq.setTimeout(500, () => { rq.destroy(); resolve(false); });
  });
}
serve(PORT, {
  'GET /req': async (req, res, url) => {
    const c = +url.searchParams.get('customer'), poison = url.searchParams.get('poison') === '1';
    const ws = workersOf(c); let tries = 0;
    for (const w of ws) { tries++; if (await call(w, poison)) return { ok: true, customer: c, worker: BASE + w, tries }; }   // retry = poison aage le jaata hai
    res.writeHead(503); res.end(JSON.stringify({ ok: false, customer: c, tries })); 
  },
  'GET /assign': (req, res, url) => ({ customer: +url.searchParams.get('customer'), workers: workersOf(+url.searchParams.get('customer')).map(w => BASE + w) }),
  'POST /mode': (req, res, url, p, b) => { MODE = b.sharding; return { MODE }; },
}, () => console.log(`[router] :${PORT} — SHARDING=${MODE}, ${CUSTOMERS} customers`));
