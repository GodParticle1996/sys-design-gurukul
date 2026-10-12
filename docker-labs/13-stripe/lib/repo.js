/* Ek nakli "monolith" — 3,000 functions, 1,500 tests. Seeded, har baar same.
   calls[f]  = f jin functions ko STATIC call karta hai (Sorbet jaisa tool inhe dekh sakta hai)
   dynamic   = kuch calls jo code mein string se bante hain (Ruby ka send / method_missing) — static analysis ko nahi dikhte
   tests[t]  = test ka entry function; test woh sab chalata hai jo entry se pahunch-ne layak hai (static + dynamic) */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function build(opts = {}) {
  const N = opts.fns || 3000, T = opts.tests || 1500, r = rng(opts.seed || 42);
  const calls = Array.from({ length: N }, () => []);
  // modules of 30 functions; most calls stay inside the module, some go to shared "core" functions (0..99)
  for (let f = 100; f < N; f++) {
    const mod = Math.floor(f / 30) * 30;
    const k = 1 + Math.floor(r() * 3);
    for (let i = 0; i < k; i++) {
      const target = r() < 0.8 ? mod + Math.floor(r() * 30) : Math.floor(r() * 100);
      if (target !== f && target < N) calls[f].push(target);
    }
  }
  for (let f = 0; f < 100; f++) if (r() < 0.5) calls[f].push(Math.floor(r() * 100));
  const dynamic = Array.from({ length: N }, () => []);
  for (let i = 0; i < (opts.dynamicEdges ?? 60); i++) {
    const from = 100 + Math.floor(r() * (N - 100)), to = 100 + Math.floor(r() * (N - 100));
    dynamic[from].push(to);
  }
  const tests = Array.from({ length: T }, (_, t) => ({ id: t, entry: 100 + Math.floor(r() * (N - 100)) }));
  return { N, calls, dynamic, tests };
}

function reach(repo, from, withDynamic) {
  const seen = new Set([from]), q = [from];
  while (q.length) {
    const f = q.pop();
    const next = repo.calls[f].concat(withDynamic ? repo.dynamic[f] : []);
    for (const g of next) if (!seen.has(g)) { seen.add(g); q.push(g); }
  }
  return seen;
}

module.exports = { build, reach };
