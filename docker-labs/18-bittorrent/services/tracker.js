/* Tracker — sirf "kaun kaun is file ko share kar raha hai" ki list rakhta hai. File ka ek byte bhi yahan se nahi jaata. */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 4881;
const swarms = new Map();            // info_hash -> Map(peer_id -> {addr, left, seen})
let announces = 0;

serve(PORT, {
  'POST /announce': (req, res, url, p, b) => {
    announces++;
    const sw = swarms.get(b.info_hash) || new Map(); swarms.set(b.info_hash, sw);
    sw.set(b.peer_id, { addr: b.addr, left: b.left, seen: Date.now() });
    const others = [...sw.entries()].filter(([id]) => id !== b.peer_id).map(([id, v]) => ({ peer_id: id, addr: v.addr }));
    others.sort(() => Math.random() - 0.5);
    return { interval_ms: 1000, peers: others.slice(0, 30) };          // asli tracker bhi ~50 random peers deta hai
  },
  'GET /stats': () => ({ announces, swarms: [...swarms.entries()].map(([h, m]) => ({ info_hash: h, peers: m.size, seeders: [...m.values()].filter(v => v.left === 0).length })) }),
  'POST /reset': () => { swarms.clear(); announces = 0; return { ok: true }; },
}, () => console.log(`[tracker] :${PORT} — sirf peers ki list, file nahi`));
