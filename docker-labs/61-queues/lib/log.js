'use strict';
// An append-only log like one Kafka partition: reads do not delete; each consumer group keeps its own offset.
// Retention deletes whole old records by age (Kafka default log.retention.hours = 168, i.e. 7 days).
function log({ retention = 7 * 86400 } = {}) {
  const recs = [];                                     // { offset, ts, body }
  let start = 0;                                       // first offset still on disk
  const offsets = new Map();
  return {
    append(body, ts) { recs.push({ offset: recs.length, ts, body }); },
    trim(now) { while (start < recs.length && now - recs[start].ts > retention) start++; },
    poll(group, max = Infinity) {
      let o = Math.max(offsets.get(group) ?? 0, start);
      const out = [];
      while (o < recs.length && out.length < max) out.push(recs[o++]);
      offsets.set(group, o);
      return out;
    },
    seekToTime(group, ts) { let o = start; while (o < recs.length && recs[o].ts < ts) o++; offsets.set(group, o); return o; },
    start: () => start, end: () => recs.length,
  };
}
module.exports = { log };
