/* Notion jaisa block store. Har cheez ek BLOCK: {id, type, parent, workspace, content, share?}. Page = block jiske children blocks.
   Permission kahin ek jagah nahi likhi — block ke ANCESTORS (parent → parent → … → workspace) mein se jahan pehli "share" mile.
   Har block padhna = ek "DB lookup" (yahan 20 µs ka asli wait) — ginti hoti hai.
   32 shards: SHARD_BY=workspace (Notion yahi karta hai) ya block (block id ka hash). */
const { serve, burn } = require('../lib/util');
const PORT = +process.env.PORT || 5091, SHARDS = 32;
const blocks = new Map(); let lookups = 0, touched = new Set(), SHARD_BY = 'workspace';
const shardOf = b => { const key = SHARD_BY === 'workspace' ? b.workspace : b.id; let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % SHARDS; };
function read(id) { lookups++; burn(0.02); const b = blocks.get(id); if (b) touched.add(shardOf(b)); return b; }
function build() {
  blocks.clear();
  const add = (id, parent, extra) => blocks.set(id, Object.assign({ id, parent, workspace: 'ws-acme', type: 'text', content: 'lorem', children: [] }, extra));
  add('ws-acme', null, { type: 'workspace', share: { 'riya': 'edit', 'aman': 'edit', 'intern': 'none' } });
  add('team-wiki', 'ws-acme', { type: 'page' }); blocks.get('ws-acme').children.push('team-wiki');
  add('hr', 'ws-acme', { type: 'page', share: { 'riya': 'edit', 'aman': 'none' } }); blocks.get('ws-acme').children.push('hr');
  add('salaries', 'hr', { type: 'page' }); blocks.get('hr').children.push('salaries');
  let n = 0; const grow = (parent, depth) => {                        // ~2,000 blocks, 6 level gehra nesting (toggles, lists, columns)
    for (let i = 0; i < (depth < 3 ? 6 : 4) && n < 2000; i++) { const id = `${parent}-b${i}`; add(id, parent); blocks.get(parent).children.push(id); n++; if (depth < 5) grow(id, depth + 1); }
  };
  grow('team-wiki', 0); n = 0; grow('salaries', 0);
}
build();
function canView(user, id, memo) {                                     // ancestors ki taraf chalo, pehli share wali jagah jawab
  const path = [];
  for (let cur = id; cur; ) {
    if (memo && memo.has(cur)) { const v = memo.get(cur); path.forEach(p => memo.set(p, v)); return v; }
    const b = read(cur); path.push(cur);
    if (b.share && b.share[user]) { const v = b.share[user] !== 'none'; if (memo) path.forEach(p => memo.set(p, v)); return v; }
    cur = b.parent;
  }
  return false;
}
serve(PORT, {
  'GET /page/:id': (req, res, url, p) => {
    const user = url.searchParams.get('user'), memo = url.searchParams.get('check') === 'memo' ? new Map() : null;
    SHARD_BY = url.searchParams.get('shard') || SHARD_BY;
    lookups = 0; touched = new Set(); const t = process.hrtime.bigint();
    const out = []; const q = [p.id];
    while (q.length) { const id = q.shift(); const b = read(id); if (canView(user, id, memo)) out.push(id); q.push(...b.children); }
    return { page: p.id, user, visible: out.length, lookups, shardsTouched: touched.size, ms: +(Number(process.hrtime.bigint() - t) / 1e6).toFixed(1) };
  },
  'POST /move': (req, res, url, p, b) => {                             // block ko naye parent ke neeche le jaao
    const blk = blocks.get(b.id), old = blocks.get(blk.parent), nw = blocks.get(b.to);
    old.children = old.children.filter(c => c !== b.id); nw.children.push(b.id); blk.parent = b.to;
    return { moved: b.id, from: old.id, to: nw.id };
  },
  'POST /reset': () => { build(); return { ok: true, blocks: blocks.size }; },
  'GET /stats': () => ({ blocks: blocks.size, shards: SHARDS }),
}, () => console.log(`[blocks] :${PORT} — ${blocks.size} blocks`));
