/* TCP (ek raasta, order mein) vs SRD (64 raaston par packets bikher do, order ki parwah nahi) — data center ke andar.
   1,000 flows × 1 MB (128 packets × 8 KB). NIC 100 Gbps → 1 packet ≈ 0.66 µs. Ek taraf ka latency 5 µs.
   64 raaston mein se EK kharab: (a) 1% loss  (b) 20 ms ke liye bilkul dead (routing ko theek hone mein time).
   TCP: flow ka raasta hash se tay (ECMP) → 1/64 flows kharab raaste par. Loss = RTO (ms) tak ruko; aage ke packets bhi ruke (order).
   SRD: har flow ke packets saare 64 raaston par → kharab raaste par sirf 2 packets; khoya → 20 µs baad kisi DUSRE raaste se.
   node tools/srd.js [--rto-ms 1]   (RTO: Linux default min 200 ms; DC-tuned ~1 ms — ASSUMPTION) */
const args = require('./args')();
const PKTS = 128, SER = 8192 * 8 / 100e9 * 1e6, BASE = 5, PATHS = 64, RTO = +(args['rto-ms'] || 1) * 1000, SRD_RTO = 20, FLOWS = 1000;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const fmt = us => us >= 1000 ? (us / 1000).toFixed(2) + ' ms' : us.toFixed(0) + ' µs';

function tcp(bad, r) {
  const path = Math.floor(r() * PATHS);
  let t = BASE + PKTS * SER;
  if (path !== 0) return t;                                             // raasta 0 kharab hai
  if (bad === 'loss') { for (let i = 0; i < PKTS; i++) if (r() < 0.01) t += RTO; return t; }   // har loss par poora flow ruka (order)
  if (bad === 'dead') { let wait = 0, rto = RTO; while (wait < 20000) { wait += rto; rto *= 2; } return t + wait; }   // backoff: 1,2,4,8,16 ms…
  return t;
}
function srd(bad, r) {
  let t = BASE + PKTS * SER, extra = 0;
  for (let i = 0; i < PKTS; i++) {
    if (i % PATHS !== 0) continue;                                     // sirf raasta 0 wale packets
    const lost = bad === 'dead' || (bad === 'loss' && r() < 0.01);
    if (lost) extra = Math.max(extra, SRD_RTO + SER);                   // dusre raaste se dobara, µs mein
  }
  return t + extra;
}
console.log(`1 flow = 1 MB, ${FLOWS} flows, 64 raaste, raasta #0 kharab.  TCP RTO ${fmt(RTO)}, SRD retransmit ${SRD_RTO} µs\n`);
console.log('kharabi             protocol    p50        p99        max        flows jo 1 ms se zyada ruke');
for (const bad of ['none', 'loss', 'dead']) for (const [name, f] of [['TCP', tcp], ['SRD', srd]]) {
  const r = rng(11), a = []; for (let i = 0; i < FLOWS; i++) a.push(f(bad, r));
  const label = { none: 'sab theek', loss: '1 raasta 1% loss', dead: '1 raasta dead 20ms' }[bad];
  console.log(`${label.padEnd(20)}${name.padEnd(12)}${fmt(q(a, 0.5)).padEnd(11)}${fmt(q(a, 0.99)).padEnd(11)}${fmt(Math.max(...a)).padEnd(11)}${a.filter(x => x > 1000).length}`);
}
console.log('\nTCP: jo flows kharab raaste par hash hue, wo RTO × backoff tak ruke — baaki bilkul theek. Tail (p99/max) kharab.');
console.log('SRD: har flow ka thoda hissa kharab raaste par — sab ~20 µs dheere, par koi ms tak nahi ruka.');
