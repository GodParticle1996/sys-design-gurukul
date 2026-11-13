'use strict';
// ex0-moves — ASLI ginti: 10 lakh keys, `hash % N` vs ring (150 vnodes per shard). Ek shard joda ya hataya → kitni keys ka shard badla?
const { h32 } = require('../lib/hash');
const { ring } = require('../lib/ring');
const KEYS = Number(process.argv[2] || 1e6);
const hashes = new Uint32Array(KEYS);
for (let i = 0; i < KEYS; i++) hashes[i] = h32(`user:${i}`);
const pct = x => (100 * x).toFixed(1).padStart(5) + '%';
function moved(from, to) {
  let mod = 0, rg = 0;
  const a = ring(from), b = ring(to);
  for (let i = 0; i < KEYS; i++) {
    const h = hashes[i];
    if (h % from !== h % to) mod++;
    if (a.at(h) !== b.at(h)) rg++;
  }
  return [mod / KEYS, rg / KEYS];
}
console.log(`${KEYS.toLocaleString('en-IN')} keys (user:0 … user:${KEYS - 1}), hash = MD5 ke pehle 4 bytes\n`);
console.log(`${'badlaav'.padEnd(20)}${'hash % N'.padEnd(14)}${'formula'.padEnd(22)}${'ring+vnodes'.padEnd(17)}ideal (sirf zaroori)`);
for (const [from, to] of [[4, 5], [5, 6], [100, 101], [5, 4], [100, 99]]) {
  const [m, r] = moved(from, to), add = to > from;
  const f = add ? `N/(N+1) = ${pct(from / to)}` : `(N-1)/N = ${pct(to / from)}`;
  const ideal = add ? `1/${to} = ${pct(1 / to)}` : `1/${from} = ${pct(1 / from)}`;
  console.log(`${String(from).padStart(3)} → ${String(to).padEnd(3)} ${(add ? 'joda' : 'hataya').padEnd(6)}   ${pct(m).padEnd(14)}${f.padEnd(22)}${pct(r).padEnd(17)}${ideal}`);
}
console.log('\nN = pehle kitne shards the. Jodne par hash % N mein N/(N+1) keys hilti hain; hatane par (N-1)/N.');
console.log('Ring par sirf naye shard ka hissa (jodna) ya mare shard ka hissa (hatana) hilta hai — baaki keys apni jagah.');
