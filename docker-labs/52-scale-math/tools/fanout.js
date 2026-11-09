'use strict';
// ex2-fanout: a page calls N services in parallel and waits for all. Each call is slow (1 s) 1% of the time.
const { fanout } = require('../lib/sim');
const { summary, ms } = require('../lib/stats');

const PAGES = 20000;
console.log('MODEL: seeded simulation (seed 52), 20,000 pages per row; no real services');
console.log('one call: 10 ms + random (avg 5 ms); slow call: ~1 s, chance 1%');
console.log('independent = every call slow on its own; shared = one hiccup slows every call of that page');
console.log('');
console.log('calls  mode         slow calls  slow pages  formula 1−0.99^N  page p50   page p99');
for (const calls of [1, 10, 50, 100]) {
  for (const mode of ['independent', 'shared']) {
    const r = fanout(52, PAGES, calls, 0.01, mode);
    const s = summary(r.page);
    const slowPages = r.page.filter(t => t >= 1000).length / PAGES;
    const formula = mode === 'independent' ? `${((1 - 0.99 ** calls) * 100).toFixed(1)}%` : '—';
    console.log(`${String(calls).padStart(5)}  ${mode.padEnd(11)}  ${(r.slowCallShare * 100).toFixed(2).padStart(9)}%  ` +
      `${(slowPages * 100).toFixed(1).padStart(9)}%  ${formula.padStart(16)}  ${ms(s.p50).padStart(8)}  ${ms(s.p99).padStart(8)}`);
  }
}
