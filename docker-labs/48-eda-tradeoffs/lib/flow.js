/* Nakli ghadi. Har tick: naye messages aate hain, phir workers apni
   raftaar (perWorker per tick) se nikaalte hain. Queue nahi ho toh
   capacity se upar ke messages usi tick mein reject (503). */
const { createQueue } = require('./queue');
function simulate({ arrivals, workers = 1, perWorker, ticks, tickMs = 1000,
  queue = true, ttlMs, dlq, down = () => false }) {
  const q = createQueue({ ttlMs, dlq });
  const rows = [];
  let arrived = 0, done = 0, rejected = 0, maxWaitMs = 0;
  for (let i = 0; i < ticks; i++) {
    const now = i * tickMs, cap = down(i) ? 0 : workers * perWorker;
    const n = arrivals(i);
    arrived += n;
    if (!queue) {
      done += Math.min(n, cap);
      rejected += Math.max(0, n - cap);
    } else {
      for (let k = 0; k < n; k++) q.publish({ i }, now);
      for (let k = 0; k < cap; k++) {
        const m = q.take(now);
        if (!m) break;
        done++;
        maxWaitMs = Math.max(maxWaitMs, m.waitedMs);
      }
    }
    rows.push({ tick: i, arrived, done, rejected, maxWaitMs, ...q.stats(now) });
  }
  return rows;
}
module.exports = { simulate };
