'use strict';
const { copies } = require('../lib/arith');
const n = x => x.toLocaleString('en-IN');
console.log('Arithmetic: monolith ko copies se scale karo. Har copy mein 0.5 GB ka code jo zyadatar idle (video ka "user profile"),');
console.log('aur har copy ka apna DB connection pool (max 20). Postgres ka max_connections aam taur par 100 (kuch slots reserved).\n');
console.log('copies   idle RAM (sab copies)   max DB connections (har pool bhar jaaye toh)   Postgres default (100) ke mukable');
for (const c of [2, 10, 50, 100]) {
  const x = copies({ n: c });
  console.log(`${String(c).padStart(6)}   ${(x.idleGB + ' GB').padStart(16)}                        ${n(x.dbConns).padStart(10)}                   ${(x.dbConns / 100).toFixed(1).padStart(5)}×`);
}
const img = copies({ n: 100, pool: 0 }), rest = copies({ n: 4 });
console.log(`\nSplit karke: image service ki 100 copies (DB nahi chahiye) + baaki app ki 4 copies → max DB connections ${n(img.dbConns + rest.dbConns)}.`);
console.log('\n→ Video sahi: idle RAM aksar sasta hai (100 copies × 0.5 GB = 50 GB). Par copies sirf RAM nahi, DB connections bhi guna');
console.log('  karti hain: busy samay mein har pool bhar sakta hai — 100 × 20 = 2,000, default se 20 guna (pool khaali shuru hote hain,');
console.log('  zaroorat par bharte hain). Ilaaj monolith mein bhi hai: chhota pool, PgBouncer jaisa');
console.log('  connection pooler, ya bhaari kaam (image) ko alag worker process mein — poori microservice ki zaroorat nahi. Lab 16 ex2 asli');
console.log('  monolith copies dikhata hai.');
