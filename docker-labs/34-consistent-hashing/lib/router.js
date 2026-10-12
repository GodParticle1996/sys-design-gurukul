/* Client-side router: key → kaunsa node.
   modulo  → hash(key) % N  (sabse seedha)
   ring    → har node ring par EK jagah; key ke baad clockwise pehla node
   vnodes  → har node ring par 150 jagah (virtual nodes) → load barabar
   weighted→ vnodes, par bade node ko zyada vnodes (weight ke hisaab se) */
const crypto = require('crypto');
const h32 = s => crypto.createHash('md5').update(s).digest().readUInt32BE(0);
function make(mode, nodes, weights = {}) {
  if (mode === 'modulo') return key => nodes[h32(key) % nodes.length];
  const per = mode === 'ring' ? 1 : 150, ring = [];
  for (const n of nodes) { const count = mode === 'weighted' ? Math.round(per * (weights[n] || 1)) : per; for (let v = 0; v < count; v++) ring.push([h32(n + '#' + v), n]); }
  ring.sort((a, b) => a[0] - b[0]);
  const pos = ring.map(x => x[0]);
  return key => { const h = h32(key); let lo = 0, hi = pos.length; while (lo < hi) { const m = (lo + hi) >> 1; if (pos[m] < h) lo = m + 1; else hi = m; } return ring[lo % ring.length][1]; };
}
module.exports = { make };
