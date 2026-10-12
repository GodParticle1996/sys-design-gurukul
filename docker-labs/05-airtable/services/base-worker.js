/* ex2 — live views: VIEWS=rerun (har write par har view ki query dobara)
                     VIEWS=diff  (sirf badla hua hissa har view ko)
   Saath mein ek chhota dependency graph: qty → line_total → order_total → customer_spend */
const { serve, burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4502);
const VIEWS = process.env.VIEWS || 'rerun';
const ROWS = +(process.env.ROWS || 20000);

const rows = [];
for (let i = 0; i < ROWS; i++) rows.push({ id: i, owner: i % 50, status: i % 4 === 0 ? 'open' : 'done', qty: i % 9 + 1, price: (i % 30) + 5 });
const views = new Map();                 /* viewerId → { filter, sort } */
let queriesRun = 0, rowsSent = 0, diffsSent = 0, recomputed = 0;

function viewRows(v) { queriesRun++; return rows.filter(r => r.status === v.status && r.owner % v.mod === 0); }
function matches(v, row) { return row.status === v.status && row.owner % v.mod === 0; }

serve(PORT, {
  'POST /view/:id': (req, res, url, p, body) => {
    views.set(p.id, { status: (body && body.status) || 'open', mod: (body && body.mod) || 3 });
    const initial = viewRows(views.get(p.id));
    rowsSent += initial.length;
    return { ok: true, rows: initial.length };
  },
  'POST /write': (req, res, url, p, body) => {
    const id = (body && body.id) != null ? body.id : Math.floor(Math.random() * ROWS);
    const row = rows[id];
    row.qty = ((row.qty + 1) % 9) + 1;
    /* dependency graph: line_total → order_total → customer_spend */
    recomputed += 3;
    burn(0.05);
    let sent = 0, diffs = 0;
    for (const [, v] of views) {
      if (VIEWS === 'rerun') { const rs = viewRows(v); sent += rs.length; }
      else if (matches(v, row)) { diffs++; sent += 1; }
    }
    rowsSent += sent; diffsSent += diffs;
    return { ok: true, id };
  },
  'GET /stats': () => ({ views: VIEWS, viewers: views.size, queriesRun, rowsSent, diffsSent, recomputed }),
  'POST /reset': () => { views.clear(); queriesRun = rowsSent = diffsSent = recomputed = 0; return { ok: true }; },
}, () => console.log(`  base-worker → http://localhost:${PORT}  (VIEWS=${VIEWS} · ${ROWS.toLocaleString('en-IN')} rows)`));
