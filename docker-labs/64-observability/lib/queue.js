'use strict';
// ex3 — a first-come-first-served queue with `servers` cashiers, simulated customer by customer (seeded).
// arrivals/service: 'random' = exponential gaps/times (the textbook M/M/c case), 'fixed' = always the same.
const { rng } = require('./rng');

function pct(sorted, p) { return sorted[Math.max(0, Math.ceil(p / 100 * sorted.length) - 1)]; }
function sim({ gapS, serviceS, servers = 1, arrivals = 'random', service = 'random', customers = 1000000, seed = 1, warmup = 0.05 }) {
  const r = rng(seed), exp = m => -m * Math.log(1 - r());
  const free = new Float64Array(servers), skip = Math.floor(customers * warmup);
  const waits = new Float64Array(customers - skip);
  let t = 0, busy = 0, waited = 0;
  for (let i = 0; i < customers; i++) {
    t += arrivals === 'random' ? exp(gapS) : gapS;
    let k = 0; for (let j = 1; j < servers; j++) if (free[j] < free[k]) k = j;
    const start = Math.max(t, free[k]), sv = service === 'random' ? exp(serviceS) : serviceS;
    free[k] = start + sv; busy += sv;
    if (i >= skip) { const w = start - t; waits[i - skip] = w; if (w > 1e-9) waited++; }
  }
  let end = 0; for (const x of free) end = Math.max(end, x);
  const sum = waits.reduce((a, b) => a + b, 0); waits.sort();
  return { meanWait: sum / waits.length, pWaited: waited / waits.length, p99Wait: pct(waits, 99),
    utilization: busy / (servers * end), perHour: customers / end * 3600 };
}

// Textbook formulas (steady state, utilization rho < 1). S = average service time.
const mm1Wait = (rho, S) => rho / (1 - rho) * S;          // random arrivals, random service (M/M/1)
const md1Wait = (rho, S) => rho / (2 * (1 - rho)) * S;    // random arrivals, fixed service (M/D/1): half of M/M/1
function erlangC(c, a) {                                   // chance an arrival has to wait, c servers, offered load a = c·rho
  let term = 1, sum = 1; for (let k = 1; k < c; k++) { term *= a / k; sum += term; }
  const last = term * a / c / (1 - a / c); return last / (sum + last);
}
const mmcWait = (c, rho, S) => erlangC(c, c * rho) * S / (c * (1 - rho));
module.exports = { sim, mm1Wait, md1Wait, erlangC, mmcWait };
