/* Platform layer (core DC) — account, inventory, Robux. Yeh KABHI nahi khona chahiye.
   Instance kabhi inventory apne paas nahi rakhta; har baar yahan se poochhta/likhta hai. */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 5032;
const inv = new Map();
serve(PORT, {
  'POST /grant': (req, res, url, p, b) => { const x = inv.get(b.player) || []; x.push(b.item); inv.set(b.player, x); return { ok: true, items: x.length }; },
  'GET /inventory/:player': (req, res, url, p) => ({ player: p.player, items: inv.get(p.player) || [] }),
  'GET /stats': () => ({ players: inv.size, items: [...inv.values()].reduce((a, x) => a + x.length, 0) }),
  'POST /reset': () => { inv.clear(); return { ok: true }; },
}, () => console.log(`[platform] :${PORT} — inventory, hamesha ke liye`));
