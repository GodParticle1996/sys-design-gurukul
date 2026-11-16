'use strict';
// Average latency and DB load for a cache-aside read path.
// hit: cache only; miss: cache lookup + DB read (+ cache fill, ignored).
const avgMs = (rate, hitMs, dbMs) => rate * hitMs + (1 - rate) * (hitMs + dbMs);
const dbQps = (rate, qps) => (1 - rate) * qps;
module.exports = { avgMs, dbQps };
