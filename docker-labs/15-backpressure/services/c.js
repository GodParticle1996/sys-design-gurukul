/* Service C — asli kaam karne wala (payment processor). Ek waqt mein 4 kaam, har kaam 20 ms CPU → ~200/s.
   Andar ki line (queue) max 40. Line bhari → 503 (overloaded). */
const http = require('http');
const { burn } = require('../lib/util');
const PORT = +process.env.PORT || 4853, WORKERS = 4, MAXQ = 40, WORK_MS = 20;
let busy = 0; const q = []; const st = { ok: 0, rejected: 0 };
function next() { while (busy < WORKERS && q.length) { const res = q.shift(); busy++; setImmediate(() => { burn(WORK_MS / WORKERS); st.ok++; res.end('{"ok":1}'); busy--; next(); }); } }
http.createServer((req, res) => {
  if (req.url === '/stats') return res.end(JSON.stringify(st));
  if (req.url === '/reset') { st.ok = st.rejected = 0; return res.end('{}'); }
  if (q.length >= MAXQ) { st.rejected++; res.writeHead(503); return res.end('{"error":"overloaded"}'); }
  q.push(res); next();
}).listen(PORT, () => console.log(`C → :${PORT}  (~200 kaam/s, line max ${MAXQ})`));
