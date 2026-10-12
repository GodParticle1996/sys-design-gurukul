/* CI server — ek change aata hai (ek function mein bug), aur CI tests chalata hai.
   mode=all        : saare 1,500 tests (har test ~4 ms CPU)
   mode=selective  : static call graph ulta chalo — changed function ko kaun-kaun (seedha ya ghuma ke) call karta hai —
                     sirf un tests ko chalao jinka entry us set mein hai (Stripe ka selective test execution)
   Test FAIL hota hai agar woh (asli run mein, dynamic calls samet) buggy function tak pahunchta hai. */
const { serve, burn } = require('../lib/util');
const { build, reach } = require('../lib/repo');
const PORT = +process.env.PORT || 4821;
const repo = build({ dynamicEdges: +(process.env.DYNAMIC_EDGES ?? 60) });

// har test asli mein kin functions ko chhoota hai (dynamic samet) — "sach"
const truth = repo.tests.map(t => reach(repo, t.entry, true));
// reverse STATIC graph — selective runner sirf yahi dekh sakta hai
const callers = Array.from({ length: repo.N }, () => []);
repo.calls.forEach((cs, f) => cs.forEach(g => callers[g].push(f)));

function affectedStatic(changed) {
  const seen = new Set([changed]), q = [changed];
  while (q.length) { const f = q.pop(); for (const c of callers[f]) if (!seen.has(c)) { seen.add(c); q.push(c); } }
  return seen;
}

serve(PORT, {
  'POST /ci': (req, res, url, p, b) => {
    const changed = +b.changed, mode = b.mode || 'all';
    const t0 = Date.now();
    let run = repo.tests;
    if (mode === 'selective') { const aff = affectedStatic(changed); run = repo.tests.filter(t => aff.has(t.entry)); }
    let failed = 0;
    for (const t of run) { burn(4); if (truth[t.id].has(changed)) failed++; }
    const shouldFail = repo.tests.filter(t => truth[t.id].has(changed)).length;
    return { changed, mode, testsRun: run.length, ms: Date.now() - t0, failed, shouldFail, missed: shouldFail - failed };
  },
  'GET /repo': () => ({ functions: repo.N, tests: repo.tests.length, staticEdges: repo.calls.reduce((s, c) => s + c.length, 0), dynamicEdges: repo.dynamic.reduce((s, c) => s + c.length, 0) }),
  /* 300 random changes — average kitne % tests chalte hain, aur kitne changes mein koi failing test chhoot jaata hai */
  'GET /sample': (req, res, url) => {
    const n = +(url.searchParams.get('n') || 300);
    let s = 7, sel = 0, changesWithMiss = 0, missedTests = 0;
    for (let i = 0; i < n; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const f = s % repo.N;
      const aff = affectedStatic(f);
      const run = repo.tests.filter(t => aff.has(t.entry));
      sel += run.length / repo.tests.length;
      const should = repo.tests.filter(t => truth[t.id].has(f)).length;
      const got = run.filter(t => truth[t.id].has(f)).length;
      if (should > got) { changesWithMiss++; missedTests += should - got; }
    }
    return { changes: n, avgSelectedPct: Math.round(sel / n * 1000) / 10, changesWithMiss, missedTests };
  },
  /* woh changes dhoondho jahan dynamic call ki wajah se selective runner kuch chhod deta hai */
  'GET /blindspots': () => {
    const out = [];
    for (let f = 100; f < repo.N && out.length < 5; f++) {
      const aff = affectedStatic(f);
      const should = repo.tests.filter(t => truth[t.id].has(f)).length;
      const got = repo.tests.filter(t => aff.has(t.entry) && truth[t.id].has(f)).length;
      if (should > got) out.push({ fn: f, shouldFail: should, selectiveCatches: got });
    }
    return out;
  },
}, () => console.log(`ci → http://localhost:${PORT}   (${repo.N} functions, ${repo.tests.length} tests, DYNAMIC_EDGES=${process.env.DYNAMIC_EDGES ?? 60})`));
