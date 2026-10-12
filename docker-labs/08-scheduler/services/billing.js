/* Billing sink — har charge ginta hai. IDEMP=1: (job, window) par unique constraint (ON CONFLICT DO NOTHING) */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 4802);
const IDEMP = process.env.IDEMP === '1';
const seen = new Set();
const perWindow = new Map();
let charges = 0, dropped = 0;
serve(PORT, {
  'POST /charge': (req, res, url, p, body) => {
    const key = body.job + '@' + body.window;
    if (IDEMP && seen.has(key)) { dropped++; return { ok: true, duplicate: true }; }
    seen.add(key);
    charges++;
    perWindow.set(key, (perWindow.get(key) || 0) + 1);
    return { ok: true };
  },
  'GET /stats': () => {
    let dupWindows = 0, extra = 0;
    for (const n of perWindow.values()) if (n > 1) { dupWindows++; extra += n - 1; }
    return { idemp: IDEMP, windows: perWindow.size, charges, doubleCharged: extra, dupWindows, droppedByKey: dropped };
  },
}, () => console.log(`  billing     → http://localhost:${PORT}  (IDEMP=${IDEMP ? 1 : 0})`));
