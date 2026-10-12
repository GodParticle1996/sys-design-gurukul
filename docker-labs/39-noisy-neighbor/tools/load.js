/* Har tenant ke liye open-loop load: rate(tMs) jitni requests/second, jawab ka intezaar kiye bina (jaise asli users).
   Wapas: har request ka { t, at, ms, status } */
const { sleep } = require('../lib/util');
module.exports = async function load(url, secs, tenants) {
  const t0 = Date.now(), jobs = [], acc = new Map();
  while (Date.now() - t0 < secs * 1000) {
    const now = Date.now() - t0;
    for (const { t, rate } of tenants) {
      acc.set(t, (acc.get(t) || 0) + rate(now) / 100);                  // har 10 ms ka hissa
      while (acc.get(t) >= 1) {
        acc.set(t, acc.get(t) - 1);
        const at = Date.now();
        jobs.push(fetch(`${url}/work?t=${t}`).then(r => ({ t, at: at - t0, ms: Date.now() - at, status: r.status }))
          .catch(() => ({ t, at: at - t0, ms: Date.now() - at, status: 0 })));
      }
    }
    await sleep(10);
  }
  return Promise.all(jobs);
};
