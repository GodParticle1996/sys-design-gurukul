/* Control plane — 2,000 nodes ise "main zinda hoon" batate hain. Ek registration = 50 ms, ek saath 60.
   Line 300 se badi → turant 503. Line mein 2 sec se zyada → timeout 503.
   Har koshish — reject hone wali bhi — 0.5 ms CPU khaati hai (TLS handshake, auth, parsing). Yahi thundering herd ka asli dard hai. */
const { serve, sleep, burn } = require('../lib/util');
const PORT = +process.env.PORT || 4994, SLOTS = +(process.env.SLOTS || 60), WORK_MS = 50, QMAX = 300;
let busy = 0, line = [], registered = new Set(), attempts = 0, rejected = 0, peakLine = 0;
function acquire() {
  if (busy < SLOTS) { busy++; return Promise.resolve(true); }
  if (line.length >= QMAX) return Promise.resolve(false);
  return new Promise(resolve => { const w = { resolve, t: setTimeout(() => { line.splice(line.indexOf(w), 1); resolve(false); }, 2000) }; line.push(w); peakLine = Math.max(peakLine, line.length); });
}
function release() { const w = line.shift(); if (w) { clearTimeout(w.t); w.resolve(true); } else busy--; }
serve(PORT, {
  'POST /register': async (req, res, url, p, b) => {
    attempts++; burn(0.5);                                            // har koshish ka apna kharcha, chahe jawab 503 ho
    if (!(await acquire())) { rejected++; res.writeHead(503); return res.end('{"ok":false}'); }
    await sleep(WORK_MS); release(); registered.add(b.node); return { ok: true };
  },
  'GET /stats': () => ({ registered: registered.size, attempts, rejected, peakLine, busy }),
  'POST /reset': () => { registered = new Set(); attempts = 0; rejected = 0; peakLine = 0; return { ok: true }; },
}, () => console.log(`[control-plane] :${PORT} slots=${SLOTS} (~${Math.round(1000 / WORK_MS * SLOTS)} registrations/sec)`));
