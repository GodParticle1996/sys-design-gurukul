'use strict';
// ex1-tail: 1,00,000 requests. 1.5% are very slow. What do mean, p50 and p99 show?
const { tailSample } = require('../lib/sim');
const { summary, ms, inr } = require('../lib/stats');

const N = 100000;
const { times, slow } = tailSample(52, N, 0.015);
const s = summary(times);
const near = times.filter(t => Math.abs(t - s.mean) <= 0.2 * s.mean).length;
const fast = summary(times.filter(t => t < 2000));

console.log('MODEL: seeded simulation (seed 52), 1,00,000 requests; no real server');
console.log('fast requests: 30 ms + random (avg 15 ms); slow requests: 2–8 s, chance 1.5%');
console.log('');
console.log(`slow requests      : ${inr(slow)} of ${inr(N)}`);
console.log(`mean (average)     : ${ms(s.mean)}`);
console.log(`p50 (median)       : ${ms(s.p50)}`);
console.log(`p95                : ${ms(s.p95)}`);
console.log(`p99                : ${ms(s.p99)}`);
console.log(`p99.9              : ${ms(s.p999)}`);
console.log(`max                : ${ms(s.max)}`);
console.log('');
console.log(`requests within ±20% of the mean : ${inr(near)} (${(near / N * 100).toFixed(1)}%)`);
console.log(`mean of the fast requests only   : ${ms(fast.mean)}`);
console.log(`p99 ÷ mean                        : ${(s.p99 / s.mean).toFixed(1)}×`);
console.log('');
console.log(`1.5% of 10 lakh requests a day   : ${inr(1000000 * 0.015)} slow requests every day`);
