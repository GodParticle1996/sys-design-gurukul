/* ex2 — central config service (CONFIG=central mein har request isse poochhti hai) */
const { serve, sleep } = require('../lib/util');
const PORT = +(process.env.PORT || 4210);
const RTT_MS = +(process.env.RTT_MS || 2);          /* network hop ka kharcha */
let up = true, lookups = 0;
const cfg = {};
for (let i = 0; i < 2000; i++) cfg['site-' + i] = { cert: 'cert-' + i, origin: 'origin-' + (i % 50), waf: i % 3 === 0, cache: i % 2 === 0 };

serve(PORT, {
  'GET /cfg/:site/:key': async (req, res, url, p) => {
    if (!up) { res.writeHead(503); return res.end('{"error":"config service down"}'); }
    lookups++;
    await sleep(RTT_MS);
    const c = cfg[p.site] || cfg['site-0'];
    return { value: c[p.key] };
  },
  'GET /dump': () => ({ cfg }),                       /* local copy banane ke liye */
  'POST /admin/stop': () => { up = false; return { up }; },
  'POST /admin/start': () => { up = true; return { up }; },
  'GET /stats': () => ({ up, lookups }),
}, () => console.log(`  config-service → http://localhost:${PORT}`));
