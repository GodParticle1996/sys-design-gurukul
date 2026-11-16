'use strict';
// MODEL (fluid, 1 s steps): signups arrive at `normal`/s, a spike of `spike`/s lasts `spikeSec`.
// Sync: every request holds a web thread for `holdSec` (side effects inline) → capacity = threads / holdSec per second.
// Async: the web thread only enqueues; a consumer drains `consumer`/s in FIFO order.
function sync({ normal = 10, spike = 1000, spikeSec = 60, threads = 100, holdSec = 2 } = {}) {
  const cap = threads / holdSec, inSpike = spike * spikeSec, served = Math.min(spike, cap) * spikeSec;
  return { cap, offered: inSpike, served, rejected: inSpike - served };
}
function async({ normal = 10, spike = 1000, spikeSec = 60, consumer = 10, horizon = 7 * 86400 } = {}) {
  let backlog = 0, maxWait = 0, drainedAt = null;
  for (let t = 0; t < horizon; t++) {
    const arrive = t < spikeSec ? spike : normal;
    backlog = Math.max(0, backlog + arrive - consumer);
    maxWait = Math.max(maxWait, backlog / consumer);            // FIFO: a new message waits for everything ahead of it
    if (t >= spikeSec && drainedAt === null && backlog === 0) drainedAt = t;
  }
  const atSpikeEnd = Math.max(0, (spike - consumer) * spikeSec);
  return { atSpikeEnd, maxWaitSec: maxWait, drainedAtSec: drainedAt, backlogAfter: backlog };
}
// Spike length that makes the last spike message wait `waitSec` when the consumer has no spare capacity.
const spikeForWait = ({ spike = 1000, consumer = 10, waitSec = 600 } = {}) => waitSec * consumer / (spike - consumer);
module.exports = { sync, async, spikeForWait };
