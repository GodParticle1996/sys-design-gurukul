'use strict';
// MODEL (fluid, 1 s steps). Signups 200/s, then a spike of 1,000/s for 60 s. The queue holds `cap` messages.
// overflow: what the producer does when the queue is full — 'drop' (ack, then throw away), 'block' (web thread waits,
// user times out), 'reject' (answer 429 "baad mein", nothing acked is lost).
// scale: workers fixed, 'auto' (grow with the backlog up to 1,000/s) or 'db' (grow only up to the DB's capacity).
// Workers write to a DB that does `db`/s; attempts above that time out and the message goes back (receive count + 1).
// A message that has failed `maxReceive` times moves to the dead-letter queue (DLQ).
function run({ overflow = 'drop', scale = 'fixed', cap = 10000, workers = 300, db = 400, seconds = 600, spike = 1000, normal = 200, spikeSec = 60, maxReceive = 5 } = {}) {
  const q = new Array(maxReceive).fill(0);               // q[k] = messages that already failed k times
  let ackedLost = 0, rejected = 0, userErrors = 0, blockedSec = 0, wasted = 0, dlq = 0, done = 0, maxWait = 0;
  const total = () => q.reduce((a, b) => a + b, 0);
  for (let t = 0; t < seconds; t++) {
    const backlog = total();
    const rate = scale === 'auto' ? Math.max(workers, Math.min(1000, backlog)) : scale === 'db' ? Math.max(workers, Math.min(db, backlog)) : workers;
    const attempt = Math.min(backlog, rate), ok = Math.min(attempt, db), p = attempt ? (attempt - ok) / attempt : 0;
    done += ok; wasted += attempt - ok;
    if (attempt) {
      const share = attempt / backlog;
      for (let k = maxReceive - 1; k >= 0; k--) {
        const tried = q[k] * share, failed = tried * p;
        q[k] -= tried;
        if (k + 1 === maxReceive) dlq += failed; else q[k + 1] += failed;
      }
    }
    const space = cap - total(), arrive = t < spikeSec ? spike : normal;
    if (arrive <= space) q[0] += arrive;
    else {
      const extra = arrive - space; q[0] += space;
      if (overflow === 'drop') ackedLost += extra;
      else if (overflow === 'reject') rejected += extra;
      else { userErrors += extra; blockedSec++; }
    }
    maxWait = Math.max(maxWait, total() / Math.max(1, Math.min(rate, db)));
  }
  const r = Math.round;
  return { done: r(done), ackedLost: r(ackedLost), rejected: r(rejected), userErrors: r(userErrors), blockedSec, wasted: r(wasted), dlq: r(dlq), maxWait, pending: r(total()) };
}
// Poison message in an ordered (FIFO) group: it fails every time. Without a DLQ the group is stuck forever.
const poison = ({ visibility = 30, maxReceive = 5 } = {}) => ({ stuckSec: visibility * maxReceive });
module.exports = { run, poison };
