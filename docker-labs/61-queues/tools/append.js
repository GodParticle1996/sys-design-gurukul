'use strict';
const os = require('node:os'), path = require('node:path'), fs = require('node:fs');
const { prepare, run } = require('../lib/append');
const MB = 64, file = path.join(os.tmpdir(), `lab61-append-${process.pid}.bin`);
console.log(`ASLI: is machine ki disk par ${MB} MiB ki pehle se bani file, temp folder mein. Same bytes, alag kram aur size. Har row ke ant mein ek fsync.`);
console.log('   File pehle se poori likhi hai, isliye ye overwrite hai — asli Kafka segment ka badhna (append) ya broker nahi naapa.\n');
prepare(file, MB);
const rows = [
  ['seedha overwrite, 4 KB writes, O_DIRECT (page cache nahi)', { mode: 'seq', direct: true }],
  ['random jagah, 4 KB writes, O_DIRECT', { mode: 'rand', direct: true }],
  ['seedha overwrite, 1 MB writes, O_DIRECT (batching)', { mode: 'seq', direct: true, size: 1 << 20 }],
  ['seedha overwrite, 4 KB writes, page cache + ek fsync', { mode: 'seq', direct: false }],
  ['random jagah, 4 KB writes, page cache + ek fsync', { mode: 'rand', direct: false }],
];
console.log('tareeka                                                     MiB/sec   ek write (ausat, fsync samet)');
const out = {};
try {
  for (const [name, o] of rows) {
    const r = run(file, { mb: MB, ...o });
    out[name] = r;
    console.log(`${name.padEnd(58)} ${r.mbps.toFixed(0).padStart(7)}   ${r.perWriteUs < 1000 ? r.perWriteUs.toFixed(1) + ' µs' : (r.perWriteUs / 1000).toFixed(1) + ' ms'}`);
  }
} catch (e) { console.log(`(O_DIRECT nahi chala: ${e.code}; Docker/overlay mein aisa ho sakta hai)`); }
fs.unlinkSync(file);
const v = Object.values(out);
if (v.length === 5) {
  const ratio = v[0].mbps / v[1].mbps;
  console.log(`\n→ O_DIRECT, 4 KB: seedha ÷ random = ${ratio.toFixed(1)}×${ratio < 1.3 ? ' — is SSD par lagbhag barabar' : ''}. 1 MB writes 4 KB se ${(v[2].mbps / v[0].mbps).toFixed(0)}× tez.`);
  console.log('→ SSD par random ki saza spinning disk (head ka seek, ~5–10 ms) se bahut kam hai; batching (bade writes) ka asar bada.');
  console.log('  Page cache rows: OS writes ko RAM mein jodta hai aur fsync par disk ko bade tukdon mein bhejta hai.');
}
