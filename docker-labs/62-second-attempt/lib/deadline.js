'use strict';
// ASLI ginti (deterministic timeline): user → A → B → C. The user waits `userMs`. C's job takes `cMs` (slow case: 20 s).
// A calls B and B calls C with a per-try timeout, up to `attempts` tries, `backoffMs` between tries (only if another try runs).
// propagate: every call carries the time its caller stops waiting; a caller does not start a try after that time.
// cancel:    a callee that knows that time stops its own work there (cooperative cancellation). Without it, work runs to the end.
const POLICIES = {
  naive:       { toAB: 30000, toBC: 30000, propagate: false, cancel: false },
  timeouts:    { toAB: 3000,  toBC: 1000,  propagate: false, cancel: false },
  'no-cancel': { toAB: 3000,  toBC: 1000,  propagate: true,  cancel: false },
  deadline:    { toAB: 3000,  toBC: 1000,  propagate: true,  cancel: true },
};
function run({ policy = 'naive', userMs = 10000, cMs = 20000, attempts = 3, backoffMs = 100 } = {}) {
  const P = POLICIES[policy];
  const held = { A: 0, B: 0, C: 0 }, afterUser = { A: 0, B: 0, C: 0 }, calls = { B: 0, C: 0 };
  let cWasted = 0;                                          // C work whose answer nobody was waiting for
  const hold = (svc, from, to) => { held[svc] += to - from; afterUser[svc] += Math.max(0, to - Math.max(from, userMs)); };
  const stopAt = (start, natural, limit) => (P.propagate && P.cancel ? Math.min(natural, limit) : natural);
  const runC = (start, limit) => {                          // limit = when the caller stops waiting
    calls.C++;
    const natural = start + cMs, end = stopAt(start, natural, limit);
    hold('C', start, end);
    const ok = natural <= limit;
    if (!ok) cWasted += end - start;
    return { end: ok ? natural : end, ok };
  };
  const retryLoop = (start, limit, timeout, callee) => {   // returns { end, ok } for the caller
    const know = P.propagate ? limit : Infinity;
    let now = start;
    for (let i = 0; i < attempts; i++) {
      if (now >= know) break;                               // no time left: do not start a try
      const tryEnd = Math.min(now + timeout, know);
      const r = callee(now, tryEnd);
      if (r.ok && r.end <= tryEnd) return { end: r.end, ok: true };
      now = tryEnd;
      if (i < attempts - 1 && now + backoffMs < know) now += backoffMs; else if (i < attempts - 1 && P.propagate) break;
    }
    return { end: now, ok: false };
  };
  const runB = (start, limit) => {
    calls.B++;
    const r = retryLoop(start, limit, P.toBC, runC);
    const end = stopAt(start, r.end, limit);
    hold('B', start, end);
    return { end, ok: r.ok && r.end <= limit };
  };
  const a = retryLoop(0, userMs, P.toAB, runB);
  hold('A', 0, a.end);
  return { held, afterUser, calls, cWasted, aEnd: a.end, userGotAnswer: a.ok && a.end <= userMs };
}
module.exports = { run, POLICIES };
