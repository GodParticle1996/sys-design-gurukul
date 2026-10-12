/* Health-check service — 10,000 checks ka SACH (1 = healthy, 0 = down).
   SYNC=delta    → har badlaav ek message bankar har DNS server ko jaata hai (DROP = kitne % message raaste mein kho jaate hain)
   SYNC=constant → har 1 sec poori state (10,000 bytes, fixed size) ek "S3 file" mein likho. DNS servers khud poori file le jaate hain.
   Chup-chaap har sec 10 checks badalte hain; POST /storm {n} = ek saath n badlaav (bura din). */
const http = require('http');
const { serve, host } = require('../lib/util');
const PORT = +process.env.PORT || 4921, N = 10000;
let SYNC = process.env.SYNC || 'delta', DROP = +(process.env.DROP || 0.01);
const DNS = (process.env.DNS_PORTS || '4922,4923,4924').split(',').map((p, i) => ({ host: host('dns' + (i + 1)), port: +p }));
const truth = new Uint8Array(N).fill(1);
let s3 = Buffer.from(truth), s3Version = 0, sent = 0, dropped = 0, changesThisSec = 0;
const agent = new http.Agent({ keepAlive: true, maxSockets: 64 });

function push(dns, id, val) {                        // ek badlaav = ek message
  if (Math.random() < DROP) { dropped++; return; }    // raaste mein kho gaya — koi dobara nahi bhejega
  sent++;
  const body = JSON.stringify({ id, val });
  const rq = http.request({ host: dns.host, port: dns.port, path: '/delta', method: 'POST', agent, headers: { 'content-type': 'application/json', 'content-length': body.length } }, r => r.resume());
  rq.on('error', () => {}); rq.end(body);
}
function change(id, val) {
  if (truth[id] === val) return; truth[id] = val; changesThisSec++;
  if (SYNC === 'delta') DNS.forEach(d => push(d, id, val));
}
setInterval(() => { for (let k = 0; k < 10; k++) { const id = Math.floor(Math.random() * N); change(id, truth[id] ^ 1); } }, 1000);
setInterval(() => { s3 = Buffer.from(truth); s3Version++; }, 1000);               // constant work: hamesha poori file, chahe 0 badle ya 10,000

serve(PORT, {
  'GET /truth': (req, res) => { res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end(Buffer.from(truth)); },
  'GET /s3/state': (req, res) => { res.writeHead(200, { 'content-type': 'application/octet-stream', 'x-version': s3Version }); res.end(s3); },
  'POST /storm': (req, res, url, p, b) => {
    const n = +(b && b.n || 10000); const ids = [...Array(N).keys()].sort(() => Math.random() - 0.5).slice(0, n);
    ids.forEach(id => change(id, truth[id] ^ 1)); return { changed: n };
  },
  'GET /mode': () => ({ SYNC, DROP }),
  'POST /mode': (req, res, url, p, b) => { if (b.sync) SYNC = b.sync; if (b.drop != null) DROP = +b.drop; return { SYNC, DROP }; },
  'GET /stats': () => { const c = changesThisSec; changesThisSec = 0; return { SYNC, DROP, sent, dropped, changes_since_last: c }; },
}, () => console.log(`[checks] :${PORT} — ${N} health checks, SYNC=${SYNC}, DROP=${DROP}`));
