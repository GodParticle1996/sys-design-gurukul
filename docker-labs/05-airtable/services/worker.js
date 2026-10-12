/* ex1 — MODE=disk: har filter par "store" se rows padho (round trip + parse)
        MODE=memory: poora base ek baar memory mein, phir sab wahin
   MAX_BASE_MB se woh chhat banti hai jo product mein "record limit" ban jaati hai. */
const { serve, sleep, burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4501);
const MODE = process.env.MODE || 'disk';
const RECORDS = +(process.env.RECORDS || 100000);
const MAX_BASE_MB = +(process.env.MAX_BASE_MB || 4096);
const BYTES_PER_RECORD = 3500;                         /* fields + formulas + index + dependency graph */

const needMB = Math.round((RECORDS * BYTES_PER_RECORD) / 1e6);
if (MODE === 'memory' && needMB > MAX_BASE_MB) {
  console.log(`loading base…  ${RECORDS.toLocaleString('en-IN')} records`);
  console.log(`❌ worker refused: base ko ~${(needMB / 1024).toFixed(1)} GB chahiye, limit ${(MAX_BASE_MB / 1024).toFixed(1)} GB (MAX_BASE_MB)`);
  console.log('   → yahi woh jagah hai jahan product mein "record limit" likhni padti hai');
  process.exit(1);
}

let base = null;
function buildRecord(i) { return { id: i, name: 'row-' + i, qty: i % 97, price: (i % 40) + 1, status: i % 5 === 0 ? 'open' : 'done' }; }
if (MODE === 'memory') {
  base = new Array(RECORDS);
  for (let i = 0; i < RECORDS; i++) base[i] = buildRecord(i);
}

/* "disk" se padhna — chunks mein, taaki sab kuch memory mein na aaye (jaise asli DB cursor) */
async function scanFromStore(onRow) {
  const CHUNK = 5000;
  for (let start = 0; start < RECORDS; start += CHUNK) {
    await sleep(0.4);                                   /* round trip per chunk */
    for (let i = start; i < Math.min(RECORDS, start + CHUNK); i++) onRow(buildRecord(i));
  }
}

serve(PORT, {
  'GET /filter': async (req, res, url) => {
    let matched = 0, total = 0;
    if (MODE === 'memory') {
      for (const r of base) if (r.status === 'open') { matched++; total += r.qty * r.price; }
    } else {
      await scanFromStore(r => { if (r.status === 'open') { matched++; total += r.qty * r.price; } });
    }
    return { mode: MODE, matched, total, rss: Math.round(process.memoryUsage().rss / 1e6) };
  },
  'GET /stats': () => ({ mode: MODE, records: RECORDS, rssMB: Math.round(process.memoryUsage().rss / 1e6) }),
}, () => console.log(`  worker → http://localhost:${PORT}  (MODE=${MODE} · ${RECORDS.toLocaleString('en-IN')} records)`));
