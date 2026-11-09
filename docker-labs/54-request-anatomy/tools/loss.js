'use strict';
// ex2-loss: REAL UDP. The resolver drops a share of incoming questions (seeded MODEL of lost packets on the way to it).
// Your stub waits TIMEOUT_MS, then asks again (2 tries, like resolv.conf "attempts:2"). The answer is already cached,
// so every lookup that is not lost takes ~7 ms.
const { startZones, resolver, ask } = require('../lib/dns');
const { TYPE } = require('../lib/dnswire');
const { percentile } = require('../lib/stats');

const N = 2000, PARALLEL = 20, TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 1000);

async function run(lossRate) {
  const res = await resolver({ port: 6512, clientRttMs: 5, lossRate, seed: 54 });
  await res.resolve('api.khanakart.com', TYPE.A);           // warm the cache first
  const times = [];
  let retried = 0, answeredAfterRetry = 0, failed = 0, next = 0;
  const worker = async () => {
    while (next < N) {
      next++;
      const t0 = process.hrtime.bigint();
      try {
        const { tries } = await ask('127.0.0.1', 6512, 'api.khanakart.com', TYPE.A, { timeoutMs: TIMEOUT_MS, attempts: 2 });
        if (tries > 1) { retried++; answeredAfterRetry++; }
      } catch (e) { if (!/after 2 tries/.test(e.message)) throw e; retried++; failed++; }
      times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  const dropped = res.stats.dropped;
  await res.close();
  return { lossRate, times, retried, answeredAfterRetry, failed, dropped };
}

(async () => {
  const zones = await startZones();
  try {
    console.log(`REAL RUN: Node ${process.version}; ${N.toLocaleString('en-IN')} lookups of a cached name, ${PARALLEL} at a time; stub timeout ${TIMEOUT_MS} ms, 2 tries`);
    console.log('MODEL: the resolver drops this share of incoming questions (seeded); timings change run to run');
    console.log('');
    console.log('loss   dropped   retried   answered after retry   failed     mean     p50      p95      p99    p99.9      max');
    for (const loss of [0, 0.01, 0.05]) {
      const r = await run(loss);
      const f = p => (percentile(r.times, p).toFixed(0) + ' ms').padStart(8);
      const mean = ((r.times.reduce((a, b) => a + b, 0) / r.times.length).toFixed(1) + ' ms').padStart(8);
      console.log(`${(loss * 100 + '%').padEnd(5)}  ${String(r.dropped).padStart(7)}   ${String(r.retried).padStart(7)}   ${String(r.answeredAfterRetry).padStart(20)}   ${String(r.failed).padStart(6)}  ${mean} ${f(50)} ${f(95)} ${f(99)} ${f(99.9)} ${(Math.max(...r.times).toFixed(0) + ' ms').padStart(8)}`);
    }
    console.log('');
    console.log('percentiles include failed lookups at their full wait: the ~2,000 ms samples failed after two timeouts');
    console.log('glibc resolv.conf defaults are timeout:5 and attempts:2; the actual wait per lost query depends on the nameserver list and resolver code, not a fixed 5 s');
  } finally { await zones.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
