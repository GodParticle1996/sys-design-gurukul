'use strict';
// ex0 — the video's budget sheet, recomputed (arithmetic only; inputs are the video's assumptions).
const B = require('../lib/budget');
const n = (x, d = 0) => x.toLocaleString('en-IN', { maximumFractionDigits: d });
const s = B.sheet();

console.log('ex0 — Instagram ka budget sheet (seedha hisaab; saare inputs video ke maane hue numbers)\n');
console.log('1) Traffic aur storage                     video kehta        hisaab');
const rows = [
  ['Uploads/din (50 crore DAU × 1/5)', '10 crore', n(s.uploadsDay)],
  ['Uploads/second (average)', '~1,150', n(s.uploadsS)],
  ['Uploads/second (peak, ×3)', '3,500', n(s.uploadsPeakS)],
  ['Naya storage/din (× 3 MB)', '300 TB', `${n(s.storeTBday)} TB`],
  ['Naya storage/saal', '110 PB', `${n(s.storePByear, 1)} PB`],
  ['Photo views/second (× 200/din)', '1.2 million', n(s.viewsS)],
  ['Egress (× 200 KB)', '240 GB/s, 1.9 Tbps', `${n(s.egressGBs, 1)} GB/s, ${n(s.egressTbps, 2)} Tbps`],
  ['Read : write', '1,000 : 1', `${n(s.readWrite)} : 1`],
  ['Likes/second (× 10/din), peak ×3', '57,000 · 170,000', `${n(s.likesS)} · ${n(s.likesPeakS)}`],
];
for (const [a, b, c] of rows) console.log(`   ${a.padEnd(38)} ${b.padEnd(18)} ${c}`);
console.log('   → hisaab sahi. Likes photo uploads se ~50× zyada writes: asli write load chhota sa "like" hai.\n');

console.log('2) Egress ka bill (list price $0.05/GB — maana; itne bade paimaane par asli daam contract ya apne network par tike):');
console.log(`   ${n(s.egressPBday, 1)} PB/din × $0.05/GB = $${n(s.egressUSDday)}/din. Images 30% chhoti → $${n(s.egressUSDday * 0.3)}/din bachat.`);
console.log('   → storage company nahi, delivery company. Isliye CDN aur ISP ke andar cache.\n');

console.log('3) Photo database ke andar rakho toh (Postgres):');
console.log(`   WAL mein likhna: ${n(s.uploadsS)} uploads/s × 5 MB = ${n(s.walGBsIfBlobsInDB, 1)} GB/s average (peak ×3 = ${n(s.walGBsIfBlobsInDB * 3, 1)} GB/s). Video: "6 GB/s" — sahi.`);
console.log(`   5 MB photo = ${n(B.toastChunks(5e6))} TOAST chunks (har chunk 1,996 byte, 8 KB page).`);
console.log(`   Sirf metadata (150 byte row): 1 GiB mein ${n(B.rowsPerGiB(150))} rows; Postgres ke 27 byte tuple header/pointer ke saath ~${n(B.rowsPerGiB(150, 27))}.`);
console.log('   Video ka "1 GB mein 1 crore rows" thoda zyada; mudda sahi — photo bahar (object storage), DB mein sirf URL.\n');

const st = B.storage(110);
console.log('4) 110 PB ko bachaana (lab 14 asli Reed-Solomon chalata hai):');
console.log(`   3 copies: ${n(st.replicated)} PB disk · erasure coding 10 data + 4 parity: ${n(st.erasure)} PB disk (1.4×), koi bhi 4 fragment kho sakte ho.`);
console.log(`   Keemat: ek fragment dobara banane ke liye ${st.repairReads} bache hue fragments network se padhne padte hain (copy wale mein 1).\n`);

const ow = B.fibreMs(10850);
console.log('5) New York ↔ Tokyo (~10,850 km), fibre mein roshni ~2 lakh km/s:');
console.log(`   kam se kam ${n(ow, 1)} ms ek taraf, ${n(2 * ow, 1)} ms round trip. Asli raasta lamba: ~180 ms (video, maana).`);
console.log('   Pehle byte se pehle handshakes          seedha NY (180 ms RTT)    paas ka edge POP (15 ms RTT)');
for (const [k, r] of Object.entries(B.HANDSHAKES)) console.log(`   ${k.padEnd(38)} ${String(r * 180).padStart(5)} ms                  ${String(r * 15).padStart(4)} ms`);
console.log('   → edge POP handshakes paas mein kar leta hai; data phir bhi warm connection par samundar paar jaata hai (ek round trip).');
console.log('     Video: TLS 1.2 = 2 round trip — sahi; TCP ke saath kul 3.');
