/* ex2 — "edge + clients": har client ka inbox. Message id se dedupe karta hai. */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 4604);
const CLIENTS = +(process.env.CLIENTS || 2000);
const inbox = Array.from({ length: CLIENTS }, () => new Set());
let received = 0, duplicates = 0, posts = 0;

serve(PORT, {
  'POST /deliver': (req, res, url, p, body) => {
    posts++;
    for (const c of body.clients) {
      if (inbox[c].has(body.msgId)) duplicates++;
      else { inbox[c].add(body.msgId); received++; }
    }
    return { ok: true };
  },
  'GET /stats': () => ({ received, duplicates, posts }),
  'GET /count/:msg': (req, res, url, p) => ({ msgId: p.msg, have: inbox.filter(s => s.has(p.msg)).length }),
  'POST /reset': () => { inbox.forEach(s => s.clear()); received = duplicates = posts = 0; return { ok: true }; },
}, () => console.log(`  edge-sim       → http://localhost:${PORT}  (${CLIENTS} clients · 3 regions)`));
