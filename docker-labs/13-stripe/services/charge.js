/* Charge API — har request ~12 ms CPU (fraud score, auth, authorize, ledger ka hisaab).
   Node ek process mein ek hi thread par JavaScript chalata hai — bilkul Ruby ke GIL jaisa: 16 cores ho, ek process
   ek waqt mein ek hi core par code chalata hai.
   WORKERS=1  → ek process
   WORKERS=N  → N processes (cluster), OS unke beech connections baant-ta hai — Stripe ka "parallelism process level par"
   EXTRAS=sync  → receipt email + analytics (8 ms) request ke andar hi
   EXTRAS=queue → woh kaam ALAG process (services/receipt-worker.js) ko job bana ke — request ke bahar */
const cluster = require('cluster');
const http = require('http');
const os = require('os');
const { burn } = require('../lib/util');
const PORT = +process.env.PORT || 4822;
const WORKERS = Math.max(1, +(process.env.WORKERS || 1));
const EXTRAS = process.env.EXTRAS || 'queue';

if (cluster.isPrimary && WORKERS > 1) {
  console.log(`charge → http://localhost:${PORT}   (${WORKERS} processes, ${os.cpus().length} CPU cores, EXTRAS=${EXTRAS})`);
  for (let i = 0; i < WORKERS; i++) cluster.fork();
} else {
  const agent = new http.Agent({ keepAlive: true, maxSockets: 4 });
  const WORKER = { host: process.env.WORKER_HOST || 'localhost', port: 4823 };
  const enqueue = () => {
    const r = http.request({ ...WORKER, path: '/job', method: 'POST', agent }, res => res.resume());
    r.on('error', () => {}); r.end();
  };
  http.createServer((req, res) => {
    if (req.url !== '/charge') { res.writeHead(404); return res.end(); }
    burn(12);                                            // fraud + auth + authorize + ledger
    if (EXTRAS === 'sync') burn(8); else enqueue();      // receipt + analytics
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  }).listen(PORT, () => { if (WORKERS === 1) console.log(`charge → http://localhost:${PORT}   (1 process, EXTRAS=${EXTRAS})`); });
}
