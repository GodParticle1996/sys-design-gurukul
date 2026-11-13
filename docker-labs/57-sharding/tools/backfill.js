'use strict';
// ex5-backfill — ASLI SQLite (memory mein), seeded order: purana DB → 4 naye shards. Backfill 500 ids ka chunk padhta hai,
// phir 150 live writes hote hain, phir wahi (ab purana) chunk naye shards mein likhta hai. 4 tareeke se likhna.
const { run, MODES, chanceNone } = require('../lib/backfill');
const fmt = n => n.toLocaleString('en-IN');
const bad = x => x.missing + x.stale + x.resurrected;
const cells = x => `${String(x.missing).padStart(4)}  ${String(x.stale).padStart(5)}  ${String(x.resurrected).padStart(6)}`;
for (const failRate of [0, 0.01]) {
  const res = MODES.map(mode => run({ mode, failRate }));
  const st = res[0].stat;
  console.log(`\n${failRate ? 'B' : 'A'}. ${failRate ? `Race + dual write ${failRate * 100}% baar fail (log hua, dobara nahi bheja)` : 'Sirf race (dual write kabhi fail nahi)'}`);
  console.log(`   20,000 rows · backfill ke dauraan live: ${fmt(st.updates)} update, ${fmt(st.deletes)} delete, ${fmt(st.inserts)} naye${failRate ? ` · dual write fail: ${st.dualFailed}` : ''}`);
  console.log('   backfill kaise likhta hai     backfill ke baad: gayab  purani  zinda-hui    1000 ka sample   dobara backfill     + ulta sweep');
  for (const x of res) {
    const p0 = chanceNone(x.after.missing + x.after.stale, x.oldCount, x.sample);   // sample sees only rows that old has
    console.log(`   ${x.mode.padEnd(28)}             ${cells(x.after)}       ${String(x.sampled).padStart(2)} pakde (${(100 * p0).toFixed(0).padStart(2)}%: 0)   ${String(bad(x.rerun)).padStart(3)} galat          ${String(bad(x.swept)).padStart(3)} galat`);
  }
}
console.log(`
gayab = purane mein hai, naye mein nahi · purani = naye mein purana version · zinda-hui = purane se delete, naye mein zinda
"(x%: 0)" = itne % chance ki 1000 ka random sample ek bhi galti na pakde (gayab + purani rows ke hisaab se)
sample sirf PURANE DB ke ids se chunta hai, isliye sample ko "zinda-hui" rows kabhi nahi dikhti. Zinda-hui rows ke liye ulta sweep chahiye.`);
