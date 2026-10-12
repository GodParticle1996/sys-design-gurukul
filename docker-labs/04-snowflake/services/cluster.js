/* ex2 — nodes + local cache. Query files padhti hai; jo file cache mein nahi, woh "storage" se aati hai (dheemi).
   resize: eager (turant rebalance) ya lazy (ownership pehle, data baad mein)
   straggler: ek node slow · steal on/off */
const { serve, sleep } = require('../lib/util');
const PORT = +(process.env.PORT || 4402);
const FILES = +(process.env.FILES || 1024);
const REMOTE_MS = +(process.env.REMOTE_MS || 3);      /* storage se ek file padhna */
const LOCAL_MS = +(process.env.LOCAL_MS || 0.2);      /* local SSD cache se */

let nodes = +(process.env.NODES || 4);
let steal = process.env.STEAL !== 'off';
let slowFactor = +(process.env.SLOW || 1);
const owner = new Map();                              /* file → node (consistent hashing jaisa) */
const cache = new Map();                              /* file → node jiske paas copy hai */
for (let f = 0; f < FILES; f++) owner.set(f, f % nodes);
let movedBlocks = 0;

function assign(n) { for (let f = 0; f < FILES; f++) owner.set(f, f % n); }

async function runQuery() {
  const t0 = Date.now();
  let remote = 0, local = 0;
  /* har node apne hisse ki files padhta hai; slow node ka kaam kabhi steal hota hai */
  const perNode = Array.from({ length: nodes }, () => []);
  for (let f = 0; f < FILES; f++) perNode[owner.get(f)].push(f);
  const times = perNode.map((files, n) => {
    let ms = 0;
    for (const f of files) {
      const hit = cache.get(f) === n;
      ms += (hit ? LOCAL_MS : REMOTE_MS) * (n === 0 ? slowFactor : 1);
      if (hit) local++; else { remote++; cache.set(f, n); }     /* padh liya toh cache bhi ho gaya */
    }
    return ms;
  });
  let makespan;
  if (steal) {
    const total = times.reduce((a, b) => a + b, 0);
    makespan = total / nodes;                                   /* kaam baant gaya */
  } else {
    makespan = Math.max(...times);                              /* sabse slow node ka intezaar */
  }
  await sleep(Math.min(3000, makespan));
  return { ms: Date.now() - t0, remoteReads: remote, localReads: local, nodes, cacheHit: Math.round((local / Math.max(1, local + remote)) * 100) };
}

serve(PORT, {
  'GET /query': async () => await runQuery(),
  'POST /resize/:n/:mode': async (req, res, url, p) => {
    const n = +p.n;
    const old = nodes;
    nodes = n;
    assign(n);
    if (p.mode === 'eager') {                        /* cache ko turant rebalance karo */
      let moved = 0;
      for (let f = 0; f < FILES; f++) { const o = owner.get(f); if (cache.has(f) && cache.get(f) !== o) { cache.set(f, o); moved++; } }
      movedBlocks += moved;
      await sleep(moved * 1.2);                      /* network par data ghumane ka waqt */
      return { mode: 'eager', from: old, to: n, movedUpfront: moved };
    }
    /* lazy — ownership badla, data queries ke saath khiskega */
    for (const f of [...cache.keys()]) if (cache.get(f) !== owner.get(f)) cache.delete(f);
    return { mode: 'lazy', from: old, to: n, movedUpfront: 0 };
  },
  'POST /straggler/:slow/:steal': (req, res, url, p) => { slowFactor = +p.slow; steal = p.steal === 'on'; return { slow: slowFactor, steal }; },
  'POST /reset': () => { cache.clear(); movedBlocks = 0; return { ok: true }; },
  'GET /stats': () => ({ nodes, steal, slowFactor, cached: cache.size, files: FILES, movedBlocks }),
}, () => console.log(`  cluster → http://localhost:${PORT}  (${FILES} files · ${nodes} nodes · cache khaali)`));
