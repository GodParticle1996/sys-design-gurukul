/* ex3 — ek hi request ko teen jagah rok kar dekho:
   DROP=socket     — connection accept hote hi (headers padhe bina)
   DROP=middleware — route se pehle, par headers padhne ke baad
   DROP=app        — poora body parse + kaam ke baad */
const http = require('http');
const { burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4221);
const DROP = process.env.DROP || 'app';
let good = 0, blocked = 0, work = 0;
let gTimes = [];

const server = http.createServer((req, res) => {
  const t0 = Date.now();
  const bad = String(req.url).includes('bad=1');
  if (DROP === 'edge') { /* yahan tak sirf accha traffic pahunchta hai */ }

  const finish = (code, body) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(body);
    if (!bad) gTimes.push(Date.now() - t0);
  };

  if (DROP === 'middleware' && bad) { blocked++; return finish(429, '{"blocked":true}'); }

  /* "application" — request ka poora safar: body padho, parse karo, kaam karo */
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', () => {
    burn(1.2);                                   /* body parse + validation — har request par lagta hai */
    work++;
    if (bad) { blocked++; return finish(429, '{"blocked":true}'); }
    burn(0.8);                                   /* asli business kaam */
    good++;
    finish(200, '{"ok":true}');
  });
});

/* DROP=edge ka kaam yahan nahi hota — woh services/edge-filter.js karta hai,
   yaani application tak bura traffic aata hi nahi. */
server.listen(PORT, () => console.log(`  guarded-service → http://localhost:${PORT}  (DROP=${DROP})`));

/* stats ke liye ek chhota alag port */
http.createServer((req, res) => {
  if (req.url === '/reset') { good = blocked = work = 0; gTimes = []; res.end('{"ok":true}'); return; }
  const a = gTimes.slice().sort((x, y) => x - y);
  const p = q => (a.length ? a[Math.min(a.length - 1, Math.floor((q / 100) * a.length))] : 0);
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ drop: DROP, good, blocked, work, goodP50: p(50), goodP99: p(99) }));
}).listen(+(process.env.STATS_PORT || 4321), () => console.log(`  guarded-service stats → http://localhost:${process.env.STATS_PORT || 4321}/stats`));
