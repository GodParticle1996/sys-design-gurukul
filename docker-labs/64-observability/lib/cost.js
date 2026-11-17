'use strict';
// ex2 — what each signal costs. Arithmetic on stated assumptions, plus a seeded sampling model.
const { rng } = require('./rng');

// Logs: every request writes bytesPerReq (all its lines together).
const logBytesPerDay = ({ reqPerMin, bytesPerReq }) => reqPerMin * 1440 * bytesPerReq;
// Metrics: each series stores one sample every scrapeS seconds; Prometheus docs say ~1–2 bytes per sample on disk.
const metricBytesPerDay = ({ series, scrapeS = 15, bytesPerSample = 2 }) => series * (86400 / scrapeS) * bytesPerSample;
// Upper bound on series: every combination of label values (real systems see a subset).
const seriesUpperBound = labels => Object.values(labels).reduce((a, b) => a * b, 1);

// Sampling: n traces, each an error with errP and slow with slowP (independent).
// head: keep a random keepP share, decided when the request starts (outcome unknown).
// tail: wait for the trace to finish, keep every error and every slow trace, plus keepP of the rest.
function sampling({ n = 100000, errP = 0.001, slowP = 0.01, keepP = 0.01, seed = 11 } = {}) {
  const r = rng(seed), z = () => ({ n: 0, err: 0, slow: 0, normal: 0 }), res = { all: z(), head: z(), tail: z() };
  const add = (k, e, s) => { res[k].n++; if (e) res[k].err++; if (s) res[k].slow++; if (!e && !s) res[k].normal++; };
  for (let i = 0; i < n; i++) {
    const e = r() < errP, s = r() < slowP, coin = r() < keepP;
    add('all', e, s);
    if (coin) add('head', e, s);
    if (e || s || coin) add('tail', e, s);
  }
  return res;
}
module.exports = { logBytesPerDay, metricBytesPerDay, seriesUpperBound, sampling };
