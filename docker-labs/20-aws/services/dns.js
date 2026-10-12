/* DNS server — health checks ki apni copy (view) se jawab deta hai.
   delta mode: POST /delta aata hai → apply.  constant mode: har 1 sec S3 se POORI file le aao, apni copy uss se badal do. */
const { serve, host, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 4922;
const CHECKS = `http://${host('checks')}:4921`;
let view = null, msgs = 0, bytes = 0, lastVersion = -1;

(async () => {
  for (;;) { try { view = new Uint8Array(await (await fetch(CHECKS + '/truth')).arrayBuffer()); break; } catch (e) { await sleep(200); } }
  for (;;) {                                             // pull loop — mode chahe jo ho, sirf constant mode mein file use hoti hai
    await sleep(1000);
    try {
      const st = await (await fetch(CHECKS + '/mode')).json().catch(() => null);
      if (!st || st.SYNC !== 'constant') continue;
      const r = await fetch(CHECKS + '/s3/state'); const buf = new Uint8Array(await r.arrayBuffer());
      msgs++; bytes += buf.length; view = buf; lastVersion = +r.headers.get('x-version');
    } catch (e) {}
  }
})();

serve(PORT, {
  'POST /delta': (req, res, url, p, b) => { msgs++; bytes += JSON.stringify(b).length; view[b.id] = b.val; return { ok: 1 }; },
  'GET /view': (req, res) => { res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end(Buffer.from(view || [])); },
  'GET /work': () => ({ msgs, bytes }),
}, () => console.log(`[dns] :${PORT}`));
