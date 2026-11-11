'use strict';
// Commit-latency arithmetic for ex6. A schedule says what a commit waits for, in which order:
//   serial(a, b, …)   — one after the other (sum)
//   parallel(a, b, …) — at the same time (the slowest)
// Durations are milliseconds. Nothing here is measured; the inputs are assumptions.
const serial = (...xs) => xs.reduce((a, b) => a + b, 0);
const parallel = (...xs) => Math.max(...xs);
module.exports = { serial, parallel };
