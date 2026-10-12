/* Chhota BitTorrent swarm simulator — 1 tick = 1 second.
   File = P pieces. Har piece ke asli bytes + SHA-1 hash ("torrent" file). Receiver har piece ka hash khud check karta hai.
   opts: peers, pieces, pieceKB, originUp (pieces/tick), peerUp, peerDown, policy ('rarest'|'sequential'),
         choke ('titfortat'|'none'), optimistic (true/false), freeRiders (fraction), malicious (count),
         seederLeavesAt (tick), mode ('swarm'|'client-server'), maxTicks, seed                                    */
const crypto = require('crypto');
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function run(o) {
  const r = rng(o.seed || 7);
  const P = o.pieces || 128, N = o.peers || 100;
  const size = (o.pieceKB || 4) * 1024;
  const pieces = Array.from({ length: P }, (_, i) => crypto.createHash('sha256').update('piece' + i + (o.seed || 7)).digest().subarray(0, 32));
  const data = pieces.map(seed => { const b = Buffer.alloc(size); for (let k = 0; k < size; k += 32) seed.copy(b, k, 0, Math.min(32, size - k)); return b; });
  const hashes = data.map(b => crypto.createHash('sha1').update(b).digest('hex'));        // .torrent
  const origin = { id: 'origin', have: new Set(pieces.keys()), up: o.originUp || 8, down: 0, origin: true };
  const peers = Array.from({ length: N }, (_, i) => ({
    id: i, have: new Set(), up: o.peerUp || 2, down: o.peerDown || 8, done: null, joinAt: o.joinSpread ? Math.floor(r() * o.joinSpread) : 0,
    freeRider: i < Math.round(N * (o.freeRiders || 0)), malicious: i >= N - (o.malicious || 0), got: {}, banned: new Set(), badRecv: 0, optimistic: null,
  }));
  peers.forEach(p => { if (p.freeRider) p.up = 0; });
  const stats = { corruptSent: 0, corruptCaught: 0, corruptAccepted: 0, wastedKB: 0 };
  let originPresent = true;
  for (let t = 0; t < (o.maxTicks || 2000); t++) {
    if (o.seederLeavesAt != null && t === o.seederLeavesAt) originPresent = false;
    const active = peers.filter(p => p.joinAt <= t);
    const avail = new Array(P).fill(0); active.forEach(p => p.have.forEach(i => avail[i]++));
    const downLeft = new Map(active.map(p => [p.id, p.down]));
    const uploaders = (originPresent ? [origin] : []).concat(o.mode === 'client-server' ? [] : active.filter(p => p.up > 0 && p.have.size > 0));
    const wantOf = (up, p) => {                                 // p up se kaunsa piece maange
      const cand = [];
      for (const i of up.have) if (!p.have.has(i)) cand.push(i);
      if (!cand.length) return null;
      if (o.policy === 'sequential') return Math.min(...cand);
      if (p.have.size === 0) return cand[Math.floor(r() * cand.length)];   // pehla piece random
      let best = cand[0]; for (const i of cand) if (avail[i] < avail[best]) best = i; return best;   // rarest first
    };
    for (const up of uploaders) {
      let interested = active.filter(p => p !== up && p.done == null && !p.banned.has(up.id) && downLeft.get(p.id) > 0 && [...up.have].some(i => !p.have.has(i)));
      if (!interested.length) continue;
      let slots;
      if (up.origin || o.choke !== 'titfortat') slots = interested.sort(() => r() - 0.5).slice(0, up.origin ? up.up : 4);
      else {
        // tit-for-tat: pichhle 10 tick mein jisne mujhe sabse zyada diya, unhe 3 slots; +1 optimistic (har 3 tick nayi)
        const score = p => up.got[p.id] || 0;                    // up ko p se kitne pieces mile
        slots = interested.slice().sort((a, b) => score(b) - score(a)).filter(p => score(p) > 0).slice(0, 3);
        if (o.optimistic !== false) {
          if (t % 3 === 0 || !up.optimistic || !interested.includes(up.optimistic)) up.optimistic = interested[Math.floor(r() * interested.length)];
          if (!slots.includes(up.optimistic)) slots.push(up.optimistic);
        }
      }
      let budget = up.up;
      while (budget > 0 && slots.length) {
        for (const p of slots) {
          if (budget <= 0) break;
          if (downLeft.get(p.id) <= 0) continue;
          const i = wantOf(up, p); if (i == null) continue;
          budget--; downLeft.set(p.id, downLeft.get(p.id) - 1);
          let bytes = data[i];
          if (up.malicious) { bytes = Buffer.from(bytes); bytes[0] ^= 0xff; stats.corruptSent++; }
          const ok = crypto.createHash('sha1').update(bytes).digest('hex') === hashes[i];     // receiver ka apna check
          if (!ok) { stats.corruptCaught++; stats.wastedKB += size / 1024; p.banned.add(up.id); continue; }
          p.have.add(i); avail[i]++;
          if (!up.origin) p.got[up.id] = (p.got[up.id] || 0) + 1;      // p yaad rakhta hai: "up ne mujhe diya"
          if (p.have.size === P && p.done == null) p.done = t + 1;
        }
        slots = slots.filter(p => downLeft.get(p.id) > 0 && p.done == null && wantOf(up, p) != null);
      }
    }
    if (peers.every(p => p.done != null) && !o.keepGoing) break;
  }
  return { peers, stats, P };
}

function summary(res) {
  const d = res.peers.filter(p => p.done != null).map(p => p.done).sort((a, b) => a - b);
  const q = f => d.length ? d[Math.min(d.length - 1, Math.floor(f * d.length))] : '-';
  return { finished: d.length, total: res.peers.length, p50: q(0.5), p90: q(0.9), max: d.length ? d[d.length - 1] : '-' };
}
module.exports = { run, summary };
