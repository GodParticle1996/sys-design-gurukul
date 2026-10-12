/* ex2 — edge server: CONFIG=central (har request par 20 lookups) ya CONFIG=local (poori copy paas mein) */
const { serve, get, sleep } = require('../lib/util');
const PORT = +(process.env.PORT || 4211);
const NAME = process.env.NAME || 'edge-1';
const MODE = process.env.CONFIG || 'central';
const CFG = 'http://localhost:' + (process.env.CONFIG_PORT || 4210);
const LOOKUPS = +(process.env.LOOKUPS || 20);        /* ek request ko kitne config sawaal chahiye */

let local = null, errors = 0, served = 0, remoteCalls = 0;

async function loadLocal() {                          /* "Quicksilver" — poora dataset yahin */
  try { const d = await get(CFG + '/dump'); local = d.cfg; console.log(`  ${NAME}: local copy ready (${Object.keys(local).length} sites)`); }
  catch (e) { setTimeout(loadLocal, 500); }
}
if (MODE === 'local') loadLocal();

serve(PORT, {
  'GET /page/:site': async (req, res, url, p) => {
    try {
      if (MODE === 'local') {
        if (!local) throw new Error('local copy abhi taiyar nahi');
        for (let i = 0; i < LOOKUPS; i++) { const c = local[p.site] || local['site-0']; if (!c) throw new Error('missing'); }
      } else {
        for (let i = 0; i < LOOKUPS; i++) { remoteCalls++; await get(`${CFG}/cfg/${p.site}/cert`); }
      }
      served++;
      return { ok: true, edge: NAME, mode: MODE };
    } catch (e) { errors++; res.writeHead(503); return res.end('{"ok":false}'); }
  },
  'GET /stats': () => ({ edge: NAME, mode: MODE, served, errors, remoteCalls }),
  'POST /reset': () => { served = errors = remoteCalls = 0; return { ok: true }; },
}, () => console.log(`  ${NAME.padEnd(7)}        → http://localhost:${PORT}  (CONFIG=${MODE})`));
