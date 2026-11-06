/* ex2-offline: consumer 90 min band; retention (ttl) aur dead-letter ke saath/bina. */
const { simulate } = require('../lib/flow');
const { offline } = require('./profiles');
const cases = [
  ['retention 60 min, dead-letter nahi', { ttlMs: 60 * 60000 }],
  ['retention 60 min, dead-letter chalu', { ttlMs: 60 * 60000, dlq: true }],
  ['retention 4 din', { ttlMs: 4 * 24 * 60 * 60000 }],
];
console.log('consumer 0–90 min band · 20 msg/min aate · wapas aakar 50 msg/min (nakli ghadi)');
for (const [label, o] of cases) {
  const rows = simulate({ ...offline, ...o }), last = rows.at(-1);
  const empty = rows.find((r, i) => i >= 90 && r.depth === 0);
  console.log(`${label.padEnd(36)} aaye=${last.arrived} hue=${last.done} phenke=${last.expired}` +
    ` dead-letter=${last.deadLettered} line khaali=${empty ? empty.tick + 1 + ' min' : 'nahi'} sabse lamba intezaar=${last.maxWaitMs / 60000} min`);
}
