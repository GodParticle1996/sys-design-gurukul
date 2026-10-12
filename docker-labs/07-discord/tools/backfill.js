/* Historical messages old → new.
   Upper bound = backfill shuru hone ke waqt old-store ka max id (dual writes pehle se on hain,
   isliye uske baad ke messages dono jagah pahunch rahe hain — beech mein koi gap nahi).
   CKPT=1: progress data/ckpt.json mein; --kill-at N: N% par process mar jaata hai */
const fs = require('fs');
const path = require('path');
const { get, post } = require('../lib/util');
const a = require('./args')();
const CKPT = process.env.CKPT === '1';
const KILL_AT = +(a['kill-at'] || 0);
const FILE = path.join(__dirname, '..', 'data', 'ckpt.json');
const PAGE = 5000, CONC = 4;
(async () => {
  let saved = null;
  if (fs.existsSync(FILE)) saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const upto = saved ? saved.upto : (await get('http://localhost:4721/count')).maxId + 1;
  let start = 0;
  if (saved) {
    if (CKPT && saved.ckpt) { start = saved.next; console.log(`restart → resuming from ${((start / upto) * 100).toFixed(1)}%   ✅ checkpoint se`); }
    else console.log(`restart → resuming from 0.0%   ⚠️ checkpoint nahi tha — ${((saved.next / upto) * 100).toFixed(1)}% kaam DOBARA hoga`);
  }
  const t0 = Date.now(); let copied = 0;
  for (let from = start; from < upto; from += PAGE * CONC) {
    await Promise.all(Array.from({ length: CONC }, async (_, k) => {
      const f = from + k * PAGE; if (f >= upto) return;
      const r = await get(`http://localhost:4721/range/${f}/${Math.min(upto, f + PAGE)}`);
      await post('http://localhost:4722/bulk', { rows: r.rows });
      copied += r.rows.length;
    }));
    const next = Math.min(upto, from + PAGE * CONC);
    fs.writeFileSync(FILE, JSON.stringify({ next, upto, ckpt: CKPT }));
    const pctDone = (next / upto) * 100;
    if (KILL_AT && pctDone >= KILL_AT) {
      console.log(`backfill… ${pctDone.toFixed(1)}% done` + (CKPT ? ` (checkpoint saved at ${pctDone.toFixed(1)}%)` : ' (koi checkpoint nahi)') + '\nkilled');
      process.exit(1);
    }
  }
  const secs = (Date.now() - t0) / 1000;
  fs.unlinkSync(FILE);
  console.log(`backfill complete: ${copied.toLocaleString('en-IN')} rows is run mein copy hue   rate: ${Math.round(copied / secs).toLocaleString('en-IN')} rows/s`);
})();
