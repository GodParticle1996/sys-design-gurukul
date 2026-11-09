'use strict';
// ex3-ttl: MODEL (seeded, no network). 10,000 resolvers worldwide each cache api.khanakart.com for the TTL.
// KhanaKart moves to a new IP at t = 0. Each resolver's cached copy has a random age, so it keeps the old IP until that
// copy expires. Also: how many queries per hour reach KhanaKart's authoritative server.
const { rng } = require('../lib/dns');
const R = 10000, rand = rng(54);
const fmt = s => s >= 3600 ? (s / 3600).toFixed(s % 3600 ? 1 : 0) + ' h' : s >= 60 ? (s / 60).toFixed(s % 60 ? 1 : 0) + ' min' : s + ' s';
console.log(`MODEL: ${R.toLocaleString('en-IN')} busy resolvers (each re-asks as soon as its copy expires); cache ages uniform; resolvers that ignore or clamp the TTL are not modelled`);
console.log('');
console.log('                                   share still on the OLD IP after');
console.log('TTL      queries/hour to you      1 min    5 min      1 h   worst case');
for (const ttl of [60, 300, 3600, 86400]) {
  const ages = Array.from({ length: R }, () => rand() * ttl);              // seconds the copy has already lived
  const left = ages.map(a => ttl - a);                                     // seconds until it expires
  const still = t => (left.filter(x => x > t).length / R * 100).toFixed(1).padStart(5) + '%';
  console.log(`${fmt(ttl).padEnd(7)}  ${Math.round(R * 3600 / ttl).toLocaleString('en-IN').padStart(15)}     ${still(60)}   ${still(300)}   ${still(3600)}   ${fmt(ttl).padStart(10)}`);
}
console.log('');
console.log('lower TTL = faster move away from a dead IP, but more lookups (and more cold-lookup waits for users)');
