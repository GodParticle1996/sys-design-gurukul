'use strict';
// ex3 (MODEL, seeded): the cache-aside delete race, a lost delete, and what TTL and leases do about them.
const { simulate, scripted } = require('../lib/invalidation');
console.log('A. Script (ek hi race, haath se): DB = v1, cache khaali.');
console.log('   t=1 ms   reader R: cache miss → DB se v1 padha → GC pause');
console.log('   t=5 ms   writer W: DB = v2');
console.log('   t=6 ms   writer W: cache delete (abhi cache mein kuch nahi)');
console.log('   t=105 ms reader R jaaga: cache = v1  ← purana value, DB mein v2\n');
const fmt = t => t >= 60000 ? `${t / 60000} min` : `${t / 1000} s`;
console.log('tareeka                        1 s        10 s       1 min      10 min  baad reader ko kya mila');
for (const [name, o] of [['sirf delete (koi TTL nahi)', {}], ['delete + TTL 30 s', { ttl: 30000 }], ['delete + lease + TTL 30 s', { ttl: 30000, lease: true }]]) {
  const log = scripted(o).filter(x => typeof x === 'object');
  console.log(`${name.padEnd(28)} ${log.map(x => (x.v + (x.stale ? ' ✗' : ' ✓')).padEnd(10)).join(' ')}`);
}
console.log('\n→ Bina TTL: purana v1 tab tak jab tak koi agla write delete na kare — price roz badalta hai toh poora din.');
console.log('  TTL: purani value set hone ke 30 s baad mitti. Lease (Facebook memcache, NSDI 2013, saral model): miss par cache token');
console.log('  deta hai; delete token radd karta hai; purane token wala set thukra diya jaata hai.');

console.log('\nB. MODEL, 1 ghanta, ek hot key: 1,000 reads/sec, write har ~5 s (Poisson). DB read 2 ms, write 3 ms.');
console.log('   1% readers ko DB read ke baad 200 ms ka pause. "Lambi galti" = 5 ms se lamba stale window.');
console.log('   Har tareeke par same arrivals aur writes (alag random streams). Lease: token na mile toh reader 10 ms ruk kar dobara poochta hai.\n');
console.log('tareeka                       delete message khota   stale cache hits      lambi galtiyan   sabse lambi');
const cfg = { writesPerSec: 0.2, readsPerSec: 1000, pauseMs: 200 };
for (const [name, o] of [['sirf delete', {}], ['delete + TTL 30 s', { ttl: 30000 }], ['delete + lease + TTL 30 s', { ttl: 30000, lease: true }]]) {
  for (const ld of [0, 0.01]) {
    const x = simulate({ ...cfg, ...o, lostDelete: ld });
    console.log(`${name.padEnd(29)} ${(ld ? '1%' : 'kabhi nahi').padEnd(22)} ${x.stale.toLocaleString('en-IN').padStart(7)} (${(100 * x.stale / x.reads).toFixed(3)}%)   ${String(x.longWindows).padStart(8)}         ${(x.longestMs / 1000).toFixed(1)} s`);
  }
}
console.log('\n→ Har write ke baad DB commit se delete tak (0.2 ms) thode stale reads hamesha — woh "lambi galti" mein nahi gine.');
console.log('→ TTL har entry ki umar hai, set hone ke waqt se — DB badalne ke waqt se nahi. Dheemi fill purani value der se set kare');
console.log('  toh galti TTL se lambi bhi ho sakti hai. TTL race nahi rokta; expiry par naye miss = race ke naye mauke.');
console.log('→ Lease race rokta hai; khoya hua delete lease bhi nahi rok sakta — uske liye TTL (ya change-log se invalidation, lab 33).');
console.log('→ Model ek key ka hai; bahut saari keys par chhote chance jud kar asli galtiyan bante hain.');
