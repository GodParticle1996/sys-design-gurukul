/* ex2 — issue store + ek alag "search index" jo drift karta hai.
   DROP_RATE se index writes girti hain; RECONCILE on karke drift theek hoti hai. */
const { serve, sleep } = require('../lib/util');
const PORT = +(process.env.PORT || 4310);
const DROP_RATE = +(process.env.DROP_RATE || 0.1);
let RECONCILE = process.env.RECONCILE === 'on';

const db = new Map();              /* id → { id, text, version }  (sach) */
const expected = new Map();        /* id → version  (checklist — DB mein likha jaata hai) */
const index = new Map();           /* id → { id, text, version }  (copy) */
let repaired = 0, passes = 0, fields = [];

function writeIssue(id, text) {
  const cur = db.get(id);
  const version = (cur ? cur.version : 0) + 1;
  const row = { id, text, version };
  db.set(id, row);
  expected.set(id, version);                     /* checklist hamesha DB ke saath */
  if (Math.random() >= DROP_RATE) index.set(id, { ...row });   /* index write kabhi-kabhi gir jaati hai */
  return row;
}

/* reconciliation loop: "jo documents hone chahiye woh hain? sahi version par?" */
setInterval(() => {
  if (!RECONCILE) return;
  passes++;
  let n = 0;
  for (const [id, v] of expected) {
    const doc = index.get(id);
    if (!doc || doc.version !== v) { index.set(id, { ...db.get(id) }); n++; repaired++; }
    if (n > 5000) break;
  }
}, 700).unref?.();

function drift() {
  let missing = 0, stale = 0;
  for (const [id, v] of expected) {
    const doc = index.get(id);
    if (!doc) missing++;
    else if (doc.version !== v) stale++;
  }
  return { missing, stale };
}

serve(PORT, {
  'POST /issue': (req, res, url, p, body) => writeIssue((body && body.id) || 'i' + db.size, (body && body.text) || 'ticket'),
  'GET /drift': () => ({ db: db.size, index: index.size, ...drift(), repaired, passes, reconcile: RECONCILE }),
  'POST /admin/reconcile/:state': (req, res, url, p) => { RECONCILE = p.state === 'on'; return { reconcile: RECONCILE }; },
  /* "chauda change": naya field har document par laagu hota hai */
  'POST /admin/add-field/:name': (req, res, url, p) => {
    fields.push(p.name);
    for (const [id, row] of db) { row.version++; expected.set(id, row.version); }
    return { field: p.name, affected: db.size };
  },
  'GET /export': () => ({ rows: [...db.values()] }),
  'POST /admin/wipe-index': () => { index.clear(); return { ok: true }; },

  /* search — sirf index se (jaise asli search hoti hai) */
  'GET /search': (req, res, url) => {
    const q = url.searchParams.get('q') || '';
    const hits = [...index.values()].filter(d => d.text.includes(q)).length;
    const shouldBe = [...db.values()].filter(d => d.text.includes(q)).length;
    return { hits, shouldBe, correct: hits === shouldBe };
  },

  /* reindex — do tareeke */
  'POST /admin/reindex/:mode': async (req, res, url, p) => {
    const t0 = Date.now();
    if (p.mode === 'swap') {
      const shadow = new Map();                       /* naya index ALAG banao */
      let n = 0;
      for (const [id, row] of db) { shadow.set(id, { ...row }); if (++n % 50 === 0) await sleep(10); }
      let replayed = 0;                               /* build ke dauraan hue changes */
      for (const [id, v] of expected) { const d = shadow.get(id); if (!d || d.version !== v) { shadow.set(id, { ...db.get(id) }); replayed++; } }
      index.clear();                                  /* atomic switch (ek hi step) */
      for (const [id, doc] of shadow) index.set(id, doc);
      return { mode: 'swap', ms: Date.now() - t0, docs: shadow.size, replayed };
    }
    /* in-place — live index ko hi khaali karke bharo */
    index.clear();
    let n = 0;
    for (const [id, row] of db) { index.set(id, { ...row }); if (++n % 50 === 0) await sleep(10); }
    return { mode: 'in-place', ms: Date.now() - t0, docs: index.size };
  },
  'GET /stats': () => ({ db: db.size, index: index.size, fields, repaired }),
}, () => console.log(`  index-api → http://localhost:${PORT}  (DROP_RATE=${DROP_RATE} RECONCILE=${RECONCILE ? 'on' : 'off'})`));
