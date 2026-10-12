/* ex1 — 8 "nodes" wala partitioned message store.
   KEY=channel       : partition = channel (ek channel = ek node)
   KEY=channel-time  : partition = channel + time bucket (bada channel BUCKETS hisson mein)
   KEY=hash          : partition = hash(message id) (sab jagah bikhra) */
const { serve, sleep } = require('../lib/util');
const PORT = +(process.env.PORT || 4701);
const KEY = process.env.KEY || 'channel';
const BUCKETS = +(process.env.BUCKETS || 4);
const NODES = 8, NODE_CONC = 6, READ_MS = 4;

const h = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
const nodes = Array.from({ length: NODES }, () => ({ busy: 0, load: 0 }));

/* ek page (latest 50 messages) padhne ke liye kaunse nodes chhune padte hain */
function nodesForRead(channel) {
  if (KEY === 'channel') return [h('c' + channel) % NODES];
  if (KEY === 'channel-time') {
    /* latest page = sabse naya bucket (+ kabhi pichhla) → 2 partitions; par alag-alag readers alag buckets par */
    const b = Math.floor(Math.random() * BUCKETS);
    return [h('c' + channel + ':' + b) % NODES, h('c' + channel + ':' + ((b + 1) % BUCKETS)) % NODES];
  }
  return Array.from({ length: NODES }, (_, i) => i);                   /* hash: har node se merge */
}

async function readOn(n) {
  const node = nodes[n];
  while (node.busy >= NODE_CONC) await sleep(1);
  node.busy++; node.load++;
  try { await sleep(READ_MS); } finally { node.busy--; }
}

serve(PORT, {
  'GET /channel/:id/latest': async (req, res, url, p) => {
    const ns = nodesForRead(+p.id);
    await Promise.all(ns.map(readOn));
    return { ok: true, partitions: ns.length };
  },
  'GET /stats': () => ({ key: KEY, buckets: BUCKETS, load: nodes.map(n => n.load) }),
  'POST /reset': () => { nodes.forEach(n => (n.load = 0)); return { ok: true }; },
}, () => console.log(`  store → http://localhost:${PORT}  (8 nodes · 10,000 channels · KEY=${KEY}${KEY === 'channel-time' ? ' BUCKETS=' + BUCKETS : ''})`));
