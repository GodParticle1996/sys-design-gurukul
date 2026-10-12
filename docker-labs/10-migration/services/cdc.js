/* CDC: pehle snapshot (log position yaad rakh kar), phir usi position se log tail.
   MODE=state (poori row, idempotent) ya MODE=delta. REDELIVER=0.05 → kuch batches dobara bhejo (Kafka at-least-once). */
const fs = require('fs'); const path = require('path');
const { get, post, sleep } = require('../lib/util');
const SRC = 'http://localhost:5001', TGT = 'http://localhost:5002';
const MODE = process.env.MODE || 'state', REDELIVER = +(process.env.REDELIVER || 0.05);
const OFF = path.join(__dirname, '..', 'data', 'cdc-offset.json');
(async () => {
  let offset;
  if (fs.existsSync(OFF)) { offset = JSON.parse(fs.readFileSync(OFF, 'utf8')).offset; console.log(`  cdc → restart, offset ${offset} se`); }
  else {
    const { lsn } = await get(SRC + '/lsn');                    /* 1. snapshot shuru hote waqt ki log position */
    const { rows } = await get(SRC + '/count');
    console.log(`  cdc → snapshot shuru (log position ${lsn}), ${rows} rows`);
    for (let f = 0; f < rows; f += 5000) {                      /* 2. snapshot chunk by chunk */
      const s = await get(`${SRC}/snapshot/${f}/${f + 5000}`);
      await post(TGT + '/apply', { rows: s.rows });
    }
    offset = lsn;                                               /* 3. log usi position se */
    console.log(`  cdc → snapshot done, ab log tail offset ${offset} se`);
  }
  while (true) {
    const r = await get(`${SRC}/log/${offset}`).catch(() => ({ entries: [] }));
    if (r.entries.length) {
      const send = async () => {
        if (MODE === 'state') await post(TGT + '/apply', { rows: r.entries.map(e => ({ id: e.id, balance: e.balance, ver: e.ver })) });
        else for (const e of r.entries) await post(TGT + '/apply-delta', { id: e.id, delta: e.delta });   /* sirf delta — idempotent nahi */
      };
      await send();
      if (Math.random() < REDELIVER) await send();                /* at-least-once: wahi batch dobara */
      offset += r.entries.length;
      fs.writeFileSync(OFF, JSON.stringify({ offset }));
    } else await sleep(50);
  }
})();
