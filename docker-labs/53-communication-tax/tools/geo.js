'use strict';
// ex4-geo (MODEL): how many round trips before the first byte, and how long each round trip is over a distance.
const { km, rtt } = require('../lib/geo');

const STACKS = [
  ['HTTP/1.1 + TLS 1.2, new connection', 4, 'TCP 1 + TLS 2 + request 1'],
  ['HTTP/1.1 or 2 + TLS 1.3, new connection', 3, 'TCP 1 + TLS 1 + request 1'],
  ['HTTP/3 (QUIC), new connection', 2, 'QUIC+TLS together 1 + request 1'],
  ['HTTP/3 (QUIC) 0-RTT resumption', 1, 'request rides with the handshake'],
  ['any protocol, reused (warm) connection', 1, 'request 1'],
];

console.log('MODEL: great-circle distance, light in fiber 200,000 km/s, DNS already cached, server work 0 ms.');
console.log('Real fiber routes are longer than the great circle, and routers add delay: these are lower bounds.');
console.log('');
console.log('route                              distance   one RTT');
const ROUTES = [['San Francisco', 'London'], ['Mumbai', 'Singapore'], ['Mumbai', 'Frankfurt'], ['Mumbai', 'Ashburn (US-East)'], ['Delhi', 'Bengaluru']];
for (const [a, b] of ROUTES) {
  const d = km(a, b);
  console.log(`${(a + ' → ' + b).padEnd(33)}  ${(Math.round(d).toLocaleString('en-IN') + ' km').padStart(9)}  ${(rtt(d).toFixed(1) + ' ms').padStart(8)}`);
}
const sfLon = rtt(km('San Francisco', 'London'));
console.log('');
console.log(`time to first byte, San Francisco → London (one RTT ${sfLon.toFixed(1)} ms):`);
for (const [name, n, why] of STACKS) console.log(`  ${name.padEnd(40)} ${n} RTT = ${(n * sfLon).toFixed(0).padStart(3)} ms   (${why})`);
const edge = 5;
console.log('');
console.log(`with a CDN edge in San Francisco (MODEL: user ↔ edge RTT ${edge} ms; edge keeps a warm connection to London):`);
console.log(`  TLS 1.3 to the edge, cache miss      2 × ${edge} (handshakes) + ${edge} + ${sfLon.toFixed(0)} (edge → London) = ${(3 * edge + sfLon).toFixed(0)} ms`);
console.log(`  TLS 1.3 to the edge, cache hit       3 × ${edge} = ${3 * edge} ms`);
console.log(`  direct to London, TLS 1.3            3 × ${sfLon.toFixed(0)} = ${(3 * sfLon).toFixed(0)} ms`);
