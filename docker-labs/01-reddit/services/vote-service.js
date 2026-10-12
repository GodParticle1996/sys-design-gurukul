/* ex1 — vote likhna: MODE=sync (sab answers turant repair) vs MODE=async (queue + worker) */
const { serve, json, sleep, burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4101);
const MODE = process.env.MODE || 'sync';
const FANOUT = +(process.env.FANOUT || 20);     /* ek vote se kitne answers bigadte hain */
const REPAIR_MS = +(process.env.REPAIR_MS || 0.6);

const facts = [];                /* votes (facts) */
const answers = { listing: [], karma: {}, caches: 0 };
const queue = [];
let repaired = 0, queuePeak = 0;

function repairOne(postId) {
  burn(REPAIR_MS);               /* ek answer theek karna = thoda asli CPU kaam */
  answers.karma[postId] = (answers.karma[postId] || 0) + 1;
  repaired++;
}

/* background worker — sirf async mode mein kaam karta hai */
setInterval(() => {
  if (MODE !== 'async') return;
  let budget = 8;
  while (queue.length && budget-- > 0) repairOne(queue.shift());
}, 5).unref?.();

serve(PORT, {
  'POST /vote': (req, res, url, p, body) => {
    const postId = (body && body.postId) || 'p1';
    facts.push({ postId, t: Date.now() });                 /* FACT — hamesha turant */
    if (MODE === 'sync') {
      for (let i = 0; i < FANOUT; i++) repairOne(postId);  /* user ke saamne poora kaam */
    } else {
      for (let i = 0; i < FANOUT; i++) queue.push(postId); /* record now, repair later */
      queuePeak = Math.max(queuePeak, queue.length);
    }
    return { ok: true, mode: MODE, queued: MODE === 'async' ? FANOUT : 0 };
  },
  'GET /listing': () => ({ ok: true, items: 25, karma: Object.keys(answers.karma).length }),
  'GET /stats': () => ({ mode: MODE, votes: facts.length, repaired, queueDepth: queue.length, queuePeak }),
}, () => console.log(`  vote-service   → http://localhost:${PORT}  (MODE=${MODE})`));
