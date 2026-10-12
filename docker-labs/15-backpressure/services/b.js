/* Service B — beech wala (API). Har request C ko aage bhejta hai.
   PROPAGATE=0 : C ne 503 diya → B bhi 503 lauta deta hai (A turant dobara bhejta hai)
   PROPAGATE=1 : B jaanta hai C ek saath kitna sambhal sakta hai (4 kaam + 40 ki line = 44). Itni requests pehle se C par hon
                → nayi request C ko chhue bina A ko 429 + Retry-After (250 ms) lauta deta hai
   RETRY_AFTER_MS=250 : 429 ke saath kitna rukne ko bolein. 0 = kuch nahi bolte (khaali 429).
   Chalte hue badalna ho: GET /config?propagate=1&retryAfterMs=1000   (tools/hint.js yahi karta hai) */
const http = require('http');
const PORT = +process.env.PORT || 4852, C = { host: process.env.C_HOST || 'localhost', port: 4853 };
let PROP = process.env.PROPAGATE === '1';
let RETRY_AFTER = process.env.RETRY_AFTER_MS === undefined ? 250 : +process.env.RETRY_AFTER_MS;
const agent = new http.Agent({ keepAlive: true, maxSockets: 200 });
let inflight = 0, last503 = 0; const st = { forwarded: 0, cRejected: 0, shed429: 0 };
http.createServer((req, res) => {
  if (req.url === '/stats') return res.end(JSON.stringify(st));
  if (req.url === '/reset') { Object.keys(st).forEach(k => (st[k] = 0)); return res.end('{}'); }
  if (req.url.startsWith('/config')) {
    const q = new URL(req.url, 'http://x').searchParams;
    if (q.has('propagate')) PROP = q.get('propagate') === '1';
    if (q.has('retryAfterMs')) RETRY_AFTER = +q.get('retryAfterMs');
    return res.end(JSON.stringify({ propagate: PROP, retryAfterMs: RETRY_AFTER }));
  }
  if (PROP && inflight >= 44) {
    st.shed429++;
    res.writeHead(429, RETRY_AFTER ? { 'retry-after': String(Math.ceil(RETRY_AFTER / 1000)), 'retry-after-ms': String(RETRY_AFTER) } : {});
    return res.end('{"error":"slow down"}');
  }
  inflight++; st.forwarded++;
  const r = http.request({ ...C, path: '/work', agent }, cr => {
    let b = ''; cr.on('data', d => (b += d)); cr.on('end', () => {
      inflight--;
      if (cr.statusCode === 503) { st.cRejected++; last503 = Date.now(); res.writeHead(503); return res.end(b); }
      res.writeHead(200); res.end(b);
    });
  });
  r.on('error', () => { inflight--; res.writeHead(502); res.end('{}'); });
  r.end();
}).listen(PORT, () => console.log(`B → :${PORT}  (PROPAGATE=${PROP ? 1 : 0})`));
