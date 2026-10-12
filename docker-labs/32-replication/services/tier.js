/* Ek generic tier (LB / app / DB) — request aayi, aage wale tier ko bhejo, jawab lautao.
   POST /config {next: ["host:port", ...], mode}
     mode=single        → sirf pehla (koi replica nahi)
     mode=active-passive → pehla primary; health check har 500 ms, lagataar 3 fail → standby par switch (takeover)
     mode=active-active  → dono ko baari-baari; ek fail → turant dusre par retry
   POST /kill → ye process "mar" jaata hai (har request par connection todta hai). POST /revive → wapas. */
const http = require('http');
const { serve } = require('../lib/util');
const PORT = +process.env.PORT, NAME = process.env.NAME || 'tier' + PORT;
let next = [], mode = 'single', dead = false, primary = 0, fails = 0, rr = 0, switches = 0;
const agent = new http.Agent({ keepAlive: false });
function call(addr, path) {
  return new Promise(resolve => {
    const [h, p] = addr.split(':');
    const rq = http.get({ host: h, port: +p, path, agent, timeout: 300 }, r => { let b = ''; r.on('data', d => (b += d)); r.on('end', () => resolve(r.statusCode === 200 ? JSON.parse(b) : null)); });
    rq.on('timeout', () => rq.destroy()); rq.on('error', () => resolve(null));
  });
}
setInterval(async () => {                                              // active-passive ka health check
  if (mode !== 'active-passive' || next.length < 2) return;
  const ok = await call(next[primary], '/health');
  if (ok) fails = 0; else if (++fails >= 3) { primary = 1 - primary; fails = 0; switches++; console.log(`[${NAME}] takeover → ${next[primary]}`); }
}, 500);
const server = serve(PORT, {
  'GET /health': (req, res) => { if (dead) return req.socket.destroy(); return { ok: true }; },
  'GET /req': async (req, res) => {
    if (dead) return req.socket.destroy();
    if (!next.length) return { path: [NAME] };
    let order;
    if (mode === 'active-passive') order = [next[primary]];              // standby ko tab tak nahi chhoote jab tak takeover na ho
    else if (mode === 'active-active') { rr = (rr + 1) % next.length; order = [...next.slice(rr), ...next.slice(0, rr)]; }
    else order = [next[0]];
    for (const addr of order) { const r = await call(addr, '/req'); if (r) return { path: [NAME, ...r.path] }; }
    res.writeHead(503); res.end('{"error":"downstream down"}');
  },
  'POST /config': (req, res, url, p, b) => { next = b.next || []; mode = b.mode || 'single'; primary = 0; fails = 0; switches = 0; return { NAME, next, mode }; },
  'POST /kill': () => { dead = true; return { NAME, dead }; },
  'POST /revive': () => { dead = false; return { NAME, dead }; },
  'GET /stats': () => ({ NAME, mode, next, primary: next[primary], switches, dead }),
}, () => console.log(`[${NAME}] :${PORT}`));
