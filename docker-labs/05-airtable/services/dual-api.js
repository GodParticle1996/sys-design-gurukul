/* ex3 — do engines: legacy aur next. PRIMARY jawab deta hai, SHADOW saath mein chalta hai,
   aur COMPARE=on dono ke jawab milata hai. next engine mein do jaan-boojh kar bugs hain. */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 4503);
let primary = process.env.PRIMARY || 'legacy';
const COMPARE = process.env.COMPARE !== 'off';
let FIX_ROUNDING = process.env.FIX_ROUNDING === '1';
let FIX_EMPTY = process.env.FIX_EMPTY === '1';

const legacy = {
  avg: xs => { const c = (xs.reduce((a, b) => a + b, 0) / xs.length) * 100; return Math.round(c + 1e-9) / 100; },   /* round half up */
  sum: xs => xs.reduce((a, b) => a + (b == null ? 0 : b), 0),                               /* empty = 0 */
};
const next = {
  /* bug: "banker's rounding" (half → even) — sirf .xx5 wale cases mein legacy se alag */
  avg: xs => {
    const v = xs.reduce((a, b) => a + b, 0) / xs.length;
    if (FIX_ROUNDING) return Math.round(v * 100 + 1e-9) / 100;
    const c = v * 100, f = Math.floor(c), frac = c - f;
    if (Math.abs(frac - 0.5) < 1e-7) return (f % 2 === 0 ? f : f + 1) / 100;
    return Math.round(c) / 100;
  },
  sum: xs => (!FIX_EMPTY && xs.some(x => x == null)) ? null : xs.reduce((a, b) => a + (b == null ? 0 : b), 0),
};
const engines = { legacy, next };
let ops = 0, mismatches = 0;
const kinds = {};

function evaluate(engine, op) {
  const e = engines[engine];
  return op.fn === 'avg' ? e.avg(op.xs) : e.sum(op.xs);
}

serve(PORT, {
  'POST /op': (req, res, url, p, op) => {
    ops++;
    const shadowName = primary === 'legacy' ? 'next' : 'legacy';
    const a = evaluate(primary, op);
    if (COMPARE) {
      const b = evaluate(shadowName, op);
      if (a !== b) {
        mismatches++;
        const key = `${op.fn}: ${primary}=${a} ${shadowName}=${b}`;
        const k2 = op.fn === 'avg' ? 'rollup(avg) rounding' : 'empty-cell in sum()';
        kinds[k2] = kinds[k2] || { n: 0, example: key };
        kinds[k2].n++;
      }
    }
    return { value: a, engine: primary };
  },
  'GET /report': () => ({ primary, ops, mismatches, kinds }),
  'POST /reset': () => { ops = 0; mismatches = 0; for (const k of Object.keys(kinds)) delete kinds[k]; return { ok: true }; },
  'POST /admin/fix': () => { FIX_ROUNDING = true; FIX_EMPTY = true; return { fixed: true }; },
  'POST /admin/primary/:name': (req, res, url, p) => { primary = p.name; return { primary }; },
}, () => console.log(`  dual-api → http://localhost:${PORT}  (PRIMARY=${primary} · SHADOW=${primary === 'legacy' ? 'next' : 'legacy'} · COMPARE=${COMPARE ? 'on' : 'off'})`));
