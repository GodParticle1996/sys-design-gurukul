/* Planet par order kaise tay karein? 3 data centers (Mumbai, Virginia, Frankfurt).
   Kahani: Riya T1 = "ex ko meri photos ki list (ACL) se hatao" (DC-X). Commit hua. Phir Riya T2 = "nayi photo post" (DC-Y).
   Sach mein T1 pehle hua. Par agar ts(T2) <= ts(T1) → kisi snapshot mein photo dikhe par ex abhi bhi ACL mein = VIOLATION.
   node tools/truetime.js [--pairs 10000] */
const args = require('./args')();
const PAIRS = +(args.pairs || 10000);
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const DCS = ['Mumbai', 'Virginia', 'Frankfurt'];
function trial(name, clockErr, eps, commitWait, seed) {
  const r = rng(seed); let bad = 0, waitSum = 0, example = null;
  for (let i = 0; i < PAIRS; i++) {
    const off = DCS.map(() => (r() * 2 - 1) * clockErr);               // har DC ki ghadi kitni aage/peeche (ms)
    const x = Math.floor(r() * 3), y = (x + 1 + Math.floor(r() * 2)) % 3;
    const r1 = 1000 + r() * 1000;                                        // T1 ka asli (real) time
    let ts1 = r1 + off[x];                                               // local ghadi ka timestamp
    let done1 = r1;
    if (commitWait) {
      ts1 = r1 + off[x] + eps;                                           // TT.now().latest
      // commit wait: tab tak ruko jab tak TT.now().earliest > ts1  →  local(t) - eps > ts1
      const until = ts1 + eps - off[x];                                  // asli time jab ye sach ho jaata hai
      waitSum += until - r1; done1 = until;
    }
    const gap = 1 + r() * 20;                                            // Riya ko "done" dikha, 1–20 ms baad T2
    const r2 = done1 + gap;
    const ts2 = r2 + off[y] + (commitWait ? eps : 0);
    if (ts2 <= ts1) { bad++; if (!example) example = { x: DCS[x], y: DCS[y], ts1, ts2, realGap: r2 - r1 }; }
  }
  return { name, bad, wait: commitWait ? waitSum / PAIRS : 0, example };
}
const rows = [
  trial('NTP ghadi, seedha timestamp', 50, 0, false, 1),
  trial('NTP ghadi, chhoti skew (±10 ms)', 10, 0, false, 2),
  trial('TrueTime (±7 ms) + commit wait', 7, 7, true, 3),
  trial('NTP-size ε (±50 ms) + commit wait', 50, 50, true, 4),
];
console.log(`${PAIRS} jode (T1 phir T2, alag DCs)\n`);
console.log('tareeka                                  order ulta (violations)   har write par extra wait');
for (const x of rows) console.log(`${x.name.padEnd(40)} ${String(x.bad).padStart(6)} (${(100 * x.bad / PAIRS).toFixed(1)}%)            ${x.wait ? x.wait.toFixed(1) + ' ms' : '0'}`);
const e = rows[0].example;
if (e) console.log(`\nMisaal: T1 (${e.x}) ts=${e.ts1.toFixed(1)}, T2 (${e.y}) ts=${e.ts2.toFixed(1)} — asli mein T2 ${e.realGap.toFixed(1)} ms BAAD hua,\n        par timestamp kehta hai PEHLE. Snapshot ts=${((e.ts1 + e.ts2) / 2).toFixed(1)} par: photo dikhi, ex abhi bhi ACL mein.`);
console.log('\nCommit wait = uncertainty (2ε) ka intezaar. Chhoti ε (atomic clock + GPS) → sasta. Badi ε (NTP) → har write 100 ms mehenga.');
