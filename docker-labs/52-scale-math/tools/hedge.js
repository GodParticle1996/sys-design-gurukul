'use strict';
// ex5-hedge: two servers. After the p95 wait, send a spare copy to the other server and take whichever answers first.
const { hedgeRun } = require('../lib/sim');
const { summary, ms } = require('../lib/stats');

const N = 100000;
const mode = process.argv[2] === 'heavy' ? 'heavy' : 'independent';
console.log('MODEL: seeded simulation (seed 52), two servers, one worker and one FIFO line each, 1,00,000 requests per row');
console.log('normal work: random, avg 8 ms');
console.log(mode === 'independent'
  ? 'stragglers: 1% of copies hit a 200 ms pause on that server only (independent)'
  : 'stragglers: 1% of requests are heavy and take 200 ms on either server (same request, same slowness)');
console.log('hedge wait = p95 of the no-hedge row at the same load; budget = at most 5% of requests get a spare copy');
console.log('cancel = a spare copy still waiting in line is dropped once the other copy answers (a running copy is not stopped)');
console.log('copies sent = spare copies sent; copies run = spare copies that started; extra ms = service time of extra copies ÷ first copies');
console.log('');
console.log('load  policy                 hedge wait  p50       p99       p99.9     copies sent  copies run  extra ms  busy');
for (const rho of [0.3, 0.6, 0.85]) {
  const base = hedgeRun(52, N, { rho, policy: 'none', stragglers: mode });
  const d = summary(base.resp).p95;
  const rows = [
    ['no hedge', base],
    ['hedge', hedgeRun(52, N, { rho, policy: 'hedge', hedgeAfter: d, stragglers: mode })],
    ['hedge + budget', hedgeRun(52, N, { rho, policy: 'hedge', hedgeAfter: d, stragglers: mode, budget: 0.05 })],
    ['hedge + budget + cancel', hedgeRun(52, N, { rho, policy: 'hedge-cancel', hedgeAfter: d, stragglers: mode, budget: 0.05 })],
  ];
  for (const [name, r] of rows) {
    const s = summary(r.resp);
    console.log(`${(rho * 100).toFixed(0).padStart(3)}%  ${name.padEnd(23)}  ${(name === 'no hedge' ? '—' : ms(d)).padStart(9)}  ` +
      `${ms(s.p50).padStart(8)}  ${ms(s.p99).padStart(8)}  ${ms(s.p999).padStart(8)}  ` +
      `${(r.hedgedShare * 100).toFixed(1).padStart(10)}%  ${(r.extraStartedShare * 100).toFixed(1).padStart(9)}%  ${(r.extraWorkShare * 100).toFixed(1).padStart(7)}%  ${(r.busyShare * 100).toFixed(1)}%`);
  }
}
