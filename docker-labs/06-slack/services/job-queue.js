/* ex4 — 2016 ka jam, chhote paimane par.
   In-memory queue ki seema MEM_LIMIT jobs hai.
   DEQUEUE_COST=1 : job nikaalne ke liye bhi 1 "memory slot" chahiye (bhari queue se nikal hi nahi sakte)
   DEQUEUE_ON=1   : nikaalna O(n) — queue jitni lambi, utna dheema
   DURABLE=1      : queue ke AAGE ek disk-backed log (Kafka jaisa) — bridge tabhi aage deta hai jab jagah ho */
const fs = require('fs');
const path = require('path');
const { serve, sleep, burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4608);
const MEM_LIMIT = +(process.env.MEM_LIMIT || 4000);
const DEQUEUE_COST = process.env.DEQUEUE_COST !== '0';
const DEQUEUE_ON = process.env.DEQUEUE_ON !== '0';
const DURABLE = process.env.DURABLE === '1';
const WORKERS = +(process.env.WORKERS || 4);
const LOG = path.join(__dirname, '..', 'data', 'job-log.ndjson');

let queue = [];                 /* in-memory (Redis jaisa) */
let dbSlowFactor = 1;
let accepted = 0, rejected = 0, done = 0, jammedPops = 0;
let logBacklog = 0, logOffset = 0;
if (DURABLE) fs.writeFileSync(LOG, '');
const memUsed = () => queue.length + (DEQUEUE_COST ? 1 : 0);

function enqueueMemory(job) {
  if (queue.length >= MEM_LIMIT) { rejected++; return false; }
  queue.push(job); accepted++; return true;
}
function pop() {
  if (DEQUEUE_COST && memUsed() > MEM_LIMIT) { jammedPops++; return null; }   /* nikaalne ke liye jagah hi nahi */
  if (!queue.length) return null;
  if (DEQUEUE_ON) burn(Math.min(3, queue.length / 8000));                   /* O(n) scan */
  return queue.shift();
}

/* workers — DB slow ho toh dheeme */
for (let w = 0; w < WORKERS; w++) {
  (async function loop() {
    while (true) {
      const job = pop();
      if (!job) { await sleep(5); continue; }
      await sleep(8 * dbSlowFactor);
      done++;
    }
  })();
}

/* bridge: durable log → in-memory queue, sirf tab jab queue mein jagah ho (bounded) */
if (DURABLE) {
  (async function bridge() {
    while (true) {
      if (logBacklog > 0 && queue.length < Math.min(2000, MEM_LIMIT)) {
        const n = Math.min(logBacklog, 200);
        for (let i = 0; i < n; i++) { queue.push({ id: 'log-' + (logOffset++) }); }
        logBacklog -= n;                    /* log mein "done" tabhi jab queue mein pahunch gaya */
      }
      await sleep(5);
    }
  })();
}

serve(PORT, {
  'POST /job': () => {
    if (DURABLE) { fs.appendFileSync(LOG, '{"j":1}\n'); logBacklog++; accepted++; return { ok: true, where: 'log' }; }
    const ok = enqueueMemory({ id: accepted });
    return ok ? { ok: true } : { ok: false, rejected: true };
  },
  'POST /db/slow/:f': (req, res, url, p) => { dbSlowFactor = +p.f; return { dbSlowFactor }; },
  'GET /stats': () => ({ durable: DURABLE, dequeueCost: DEQUEUE_COST, dequeueON: DEQUEUE_ON, memLimit: MEM_LIMIT, queue: queue.length, logBacklog, accepted, rejected, done, jammedPops }),
}, () => console.log(`  job-queue → http://localhost:${PORT}  (MEM_LIMIT=${MEM_LIMIT} jobs · DEQUEUE_COST=${DEQUEUE_COST ? 1 : 0} · DEQUEUE_ON=${DEQUEUE_ON ? 1 : 0} · DURABLE=${DURABLE ? 1 : 0})`));
