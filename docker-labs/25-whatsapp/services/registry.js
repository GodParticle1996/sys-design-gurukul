/* Registry: kaun kis server par online hai + offline logon ka queue.
   Message store sirf tab tak jab tak deliver na ho — deliver hone ke baad server par kuch nahi bachta. */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 5013;
const where = new Map(), queues = new Map(); let stored = 0, peakStored = 0, drained = 0;
const q = u => { if (!queues.has(u)) queues.set(u, []); return queues.get(u); };
serve(PORT, {
  'POST /online': (req, res, url, p, b) => { where.set(b.user, { server: b.server, addr: b.addr }); return { ok: true }; },
  'POST /offline': (req, res, url, p, b) => { where.delete(b.user); return { ok: true }; },
  'POST /route': (req, res, url, p, b) => {
    const s = where.get(b.to);
    if (s) return { queued: false, server: s.server, addr: s.addr };   // dusre chat server par online hai
    q(b.to).push({ from: b.from, text: b.text }); stored++; peakStored = Math.max(peakStored, [...queues.values()].reduce((a, x) => a + x.length, 0));
    return { queued: true };
  },
  'POST /drain': (req, res, url, p, b) => { const m = q(b.user); queues.set(b.user, []); drained += m.length; return { messages: m }; },
  'GET /stats': () => ({ online: where.size, storedNow: [...queues.values()].reduce((a, x) => a + x.length, 0), everStored: stored, peakStored, drained }),
}, () => console.log(`[registry] :${PORT}`));
