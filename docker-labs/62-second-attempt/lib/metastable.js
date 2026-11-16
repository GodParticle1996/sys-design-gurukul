'use strict';
// MODEL (1 s steps). A server does `cap` requests/sec of useful work. Above that it is overloaded: it starts every request,
// but time spent on requests that will time out is wasted, so goodput falls (an assumed congestion-collapse curve):
// good = cap × cap / load. Fresh requests arrive at `base`/s; a spike raises that to `spike`/s for `spikeSec`.
// Failed requests are retried by the policy; a request is tried at most `attempts` times in all.
//   immediate: retry next second.
//   backoff:   retry after a random 1 … backoffS × 2^a seconds (exponential backoff with full jitter).
//   budget:    immediate retries, but each retry SENT spends one token from a bucket. Every fresh request adds `budget`
//              tokens (10% → 0.1); the bucket holds at most `bucketMax`. No token → the retry is dropped (request fails).
function run({ policy = 'none', base = 800, spike = 1500, spikeFrom = 10, spikeSec = 10, cap = 1000, seconds = 120,
               attempts = 4, budget = 0.1, bucketMax = 100, backoffS = 1 } = {}) {
  let pending = new Array(attempts + 1).fill(0);            // pending[a] = requests that will make attempt a this second
  const later = [];                                          // backoff: later[t][a] = attempts due at second t
  const timeline = [];
  let ok = 0, gaveUp = 0, fresh = 0, calls = 0, retriesSent = 0, tokens = bucketMax;
  for (let t = 0; t < seconds; t++) {
    const arrive = t >= spikeFrom && t < spikeFrom + spikeSec ? spike : base;
    fresh += arrive;
    if (later[t]) for (let a = 2; a <= attempts; a++) pending[a] += later[t][a];
    if (policy === 'budget') {                               // spend tokens on retries actually sent this second
      tokens = Math.min(bucketMax, tokens + budget * arrive);
      const want = pending.slice(2).reduce((x, y) => x + y, 0);
      const send = Math.min(want, tokens), keep = want ? send / want : 1;
      tokens -= send;
      for (let a = 2; a <= attempts; a++) { gaveUp += pending[a] * (1 - keep); pending[a] *= keep; }
    }
    pending[1] += arrive;
    const load = pending.reduce((x, y) => x + y, 0);
    calls += load; retriesSent += load - arrive;
    const good = load <= cap ? load : cap * cap / load;     // useful completions this second
    const pSucc = load ? good / load : 1;
    const next = new Array(attempts + 1).fill(0);
    for (let a = 1; a <= attempts; a++) {
      const succ = pending[a] * pSucc, fail = pending[a] - succ;
      ok += succ;
      if (policy === 'none' || a === attempts) { gaveUp += fail; continue; }
      if (policy === 'backoff') {                            // spread uniformly over the next 1 … span seconds
        const span = Math.max(1, Math.round(backoffS * Math.pow(2, a)));
        for (let d = 1; d <= span; d++) { const at = t + d; later[at] = later[at] || new Array(attempts + 1).fill(0); later[at][a + 1] += fail / span; }
      } else next[a + 1] += fail;
    }
    pending = next;
    timeline.push({ t, arrive, load, good });
  }
  let outstanding = pending.reduce((x, y) => x + y, 0);
  for (const row of later.slice(seconds)) if (row) outstanding += row.reduce((x, y) => x + y, 0);
  // recovered = first second after the spike from which load stays ≤ cap for at least 10 s (within the run)
  const after = spikeFrom + spikeSec;
  let recoveredAt = null;
  for (let t = after; t + 10 <= seconds; t++) if (timeline.slice(t, t + 10).every(x => x.load <= cap)) { recoveredAt = t - after; break; }
  return { ok, gaveUp, outstanding, fresh, calls, retriesSent, amp: calls / fresh, recoveredAt, timeline };
}
// Load amplification with a constant failure fraction f and up to k attempts: 1 + f + f² + … + f^(k−1)
const amplification = (f, k) => { let s = 0; for (let i = 0; i < k; i++) s += Math.pow(f, i); return s; };
module.exports = { run, amplification };
