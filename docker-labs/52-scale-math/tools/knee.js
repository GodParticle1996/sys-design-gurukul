'use strict';
// ex3-knee: one worker, one line, random arrivals. Load goes up — how does the wait grow?
const { queueRun } = require('../lib/sim');
const { summary, ms } = require('../lib/stats');

const N = 500000, S = 10;
console.log('MODEL: seeded simulation (seed 52), one worker, FIFO line, random (Poisson) arrivals, 5,00,000 requests per row');
console.log('random work = exponential, avg 10 ms (M/M/1); fixed work = exactly 10 ms (M/D/1)');
console.log('theory mean time: M/M/1 = 10 ÷ (1 − load); M/D/1 = 10 + load × 10 ÷ (2 × (1 − load))');
console.log('');
console.log('load   work    mean time  theory     p99 time   busy');
for (const rho of [0.3, 0.5, 0.7, 0.8, 0.9, 0.95]) {
  for (const service of ['random', 'fixed']) {
    const r = queueRun(52, N, rho, S, service);
    const s = summary(r.resp);
    const theory = service === 'random' ? S / (1 - rho) : S + (rho * S) / (2 * (1 - rho));
    console.log(`${(rho * 100).toFixed(0).padStart(3)}%   ${service.padEnd(6)}  ${ms(s.mean).padStart(9)}  ${ms(theory).padStart(9)}  ` +
      `${ms(s.p99).padStart(9)}  ${(r.busyShare * 100).toFixed(1)}%`);
  }
}
