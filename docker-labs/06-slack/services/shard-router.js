/* ex3 — 8 MySQL-jaise shards (har ek ki concurrency seemit) + ek router.
   ROUTING=code  : shard = hash(workspace) % SHARDS  (application code mein formula)
   ROUTING=layer : mapping table (Vitess jaisa) — ek workspace ko channel-range se kai shards mein baanta ja sakta hai */
const { serve, sleep } = require('../lib/util');
const PORT = +(process.env.PORT || 4607);
const ROUTING = process.env.ROUTING || 'code';
const SHARDS = +(process.env.SHARDS || 8);
const SHARD_CONC = 4, QUERY_MS = 5;

const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const workspaces = Array.from({ length: 200 }, (_, i) => 'ws-' + i).concat(['monster']);
const rowsOf = ws => (ws === 'monster' ? 330000 : 1500);
/* mapping table: workspace → [{from, to, shard}] channel ranges */
const mapping = {};
workspaces.forEach(ws => (mapping[ws] = [{ from: 0, to: 100, shard: hash(ws) % SHARDS }]));
/* monster ko jaan-boojh kar ek aise shard par rakho jahan kuch chhote tenants bhi hain */
mapping.monster = [{ from: 0, to: 100, shard: 3 }];

const shards = Array.from({ length: SHARDS }, () => ({ busy: 0, served: 0 }));
function shardFor(ws, channel) {
  if (ROUTING === 'code') return ws === 'monster' ? 3 : hash(ws) % SHARDS;
  return mapping[ws].find(r => channel >= r.from && channel < r.to).shard;
}
async function query(ws, channel) {
  const sh = shards[shardFor(ws, channel)];
  while (sh.busy >= SHARD_CONC) await sleep(1);
  sh.busy++;
  try { await sleep(QUERY_MS); sh.served++; } finally { sh.busy--; }
}

serve(PORT, {
  'GET /q/:ws/:channel': async (req, res, url, p) => { await query(p.ws, +p.channel); return { ok: true }; },
  'GET /stats': () => ({ routing: ROUTING, perShard: shards.map(s => s.served) }),
  'POST /reset': () => { shards.forEach(s => (s.served = 0)); return { ok: true }; },
  'POST /admin/split/:ws/:into': (req, res, url, p) => {
    if (ROUTING !== 'layer') return { error: 'code routing mein split ke liye application code badalna padega' };
    const n = +p.into, width = 100 / n;
    const targets = [3, 5, 6, 7].slice(0, n);
    const before = mapping[p.ws];
    mapping[p.ws] = targets.map((sh, i) => ({ from: Math.round(i * width), to: Math.round((i + 1) * width), shard: sh }));
    const movedRows = Math.round(rowsOf(p.ws) * (1 - 1 / n));
    return { ws: p.ws, before, after: mapping[p.ws], rowsMoved: movedRows, appCodeChanged: 0 };
  },
  'GET /rehash/:from/:to': (req, res, url, p) => {
    let moved = 0, total = 0;
    for (const ws of workspaces) { const r = rowsOf(ws); total += r; if (hash(ws) % +p.from !== hash(ws) % +p.to) moved += r; }
    return { from: +p.from, to: +p.to, movedPct: Math.round((moved / total) * 100) };
  },
}, () => console.log(`  shard-router → http://localhost:${PORT}  (ROUTING=${ROUTING} · ${SHARDS} shards)`));
