/* Aasmaan: 6 satellites, har ek ek TCP relay (ports 4900..4905). Ek epoch mein sirf EK satellite dish ko dikhta hai.
   Epoch k → sat k % 6.  EPOCH_MS (default 3000 — asli Starlink mein 15 sec).  Handover par OVERLAP_MS tak dono dikhte hain.
   Satellite nazar se bahar gaya → uske connections CHUP ho jaate hain (blackhole — koi FIN/RST nahi; asli radio link bhi aise hi jaata hai).
   Pehli line: "CONNECT host:port\n" → phir dono taraf bytes as-is.
   SURPRISE=1 → har 4th epoch ke beech mein satellite achaanak mar jaata hai (schedule mein nahi tha);
                tab ek spare satellite (k+3) % 6 dikhta hai — par dish ko khud dhoondhna padega. */
const net = require('net');
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 4892, SAT_BASE = +process.env.SAT_BASE || 4900, N = 6;
const EPOCH_MS = +process.env.EPOCH_MS || 3000, OVERLAP_MS = +process.env.OVERLAP_MS || 400;
const SURPRISE = process.env.SURPRISE === '1';
const t0 = Date.now();
const epochAt = t => Math.floor((t - t0) / EPOCH_MS);
const deadSat = new Set();
function visible(sat, t = Date.now()) {
  if (deadSat.has(sat)) return false;
  const e = epochAt(t), into = (t - t0) % EPOCH_MS;
  if (sat === e % N) return true;
  if (deadSat.has(e % N) && sat === (e + 3) % N) return true;        // asli aasmaan mein ek se zyada sat dikhte hain — spare
  if (sat === (e - 1 + N) % N && into < OVERLAP_MS) return true;     // purana wala thodi der aur dikhta hai
  return false;
}
const socks = Array.from({ length: N }, () => new Set());
let relayed = 0, refused = 0, blackholed = 0;

for (let s = 0; s < N; s++) {
  net.createServer(up => {
    if (!visible(s)) { refused++; return up.destroy(); }             // dikhta hi nahi → connect nahi hota
    up.setNoDelay(true); up.write('OK\n');                              // "haan, main dikh raha hoon"
    let head = '', down = null;
    const pair = { up, down: null, dead: false }; socks[s].add(pair);
    up.on('data', d => {
      if (pair.dead) return;                                          // chup — data kahin nahi jaata
      if (down) { relayed++; return down.write(d); }
      head += d; const i = head.indexOf('\n'); if (i < 0) return;
      const [h, p] = head.slice(8, i).trim().split(':'); const rest = head.slice(i + 1);
      down = pair.down = net.connect(+p, h, () => { if (rest) down.write(rest); });
      down.setNoDelay(true);
      down.on('data', x => { if (!pair.dead) { relayed++; up.write(x); } });
      down.on('error', () => up.destroy()); down.on('close', () => up.destroy());
    });
    up.on('error', () => {}); up.on('close', () => { socks[s].delete(pair); if (pair.down) pair.down.destroy(); });
  }).listen(SAT_BASE + s);
}
setInterval(() => {                                                     // jo nazar se bahar, uske links chup
  for (let s = 0; s < N; s++) if (!visible(s)) for (const pair of socks[s]) if (!pair.dead) {
    pair.dead = true; blackholed++;
    setTimeout(() => { pair.up.destroy(); if (pair.down) pair.down.destroy(); }, 8000);   // bahut baad mein TCP khud marta
  }
}, 20);
if (SURPRISE) setInterval(() => {                                       // achaanak maut — kisi schedule mein nahi
  const e = epochAt(Date.now()); if (e % 4 !== 2) return;
  const s = e % N; if (deadSat.has(s)) return;
  deadSat.add(s); console.log(`[sky] 💥 sat ${s} achaanak band (epoch ${e})`);
  setTimeout(() => deadSat.delete(s), EPOCH_MS * 2);
}, EPOCH_MS / 2).unref();

serve(PORT, {
  // Dish ke paas ephemeris hai: kaun sa satellite kab dikhega — pehle se pata
  'GET /schedule': () => ({ t0, epoch_ms: EPOCH_MS, overlap_ms: OVERLAP_MS, sats: N, sat_base: SAT_BASE, rule: 'epoch k → sat k % N', now: Date.now() }),
  'GET /stats': () => ({ epoch: epochAt(Date.now()), visible: [...Array(N).keys()].filter(s => visible(s)), relayed, refused, blackholed }),
}, () => console.log(`[sky] :${PORT} — ${N} sats :${SAT_BASE}..${SAT_BASE + N - 1}, epoch ${EPOCH_MS} ms, overlap ${OVERLAP_MS} ms${SURPRISE ? ', SURPRISE=1' : ''}`));
