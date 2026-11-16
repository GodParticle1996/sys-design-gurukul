'use strict';
const { payments, users, balance } = require('../lib/idem');
const H = 3600e3;
const rows = [];
const add = (name, bad, good) => rows.push([name, bad, good]);

// A. lost response: server charged, the reply never arrived, client retries
{ const x = payments({ useKeys: false }); x.charge(null, { amount: 100 }, 0); x.charge(null, { amount: 100 }, 1000);
  const y = payments(); y.charge('k1', { amount: 100 }, 0); y.charge('k1', { amount: 100 }, 1000);
  add('jawab khoya, client ne retry kiya', `${x.charges()} charge`, `${y.charges()} charge (same jawab dobara)`); }
// B. double click: second request while the first is still running
{ const x = payments({ lockInFlight: false, ownership: false }); const f = x.begin('k2', { amount: 100 }, 0); const s = x.begin('k2', { amount: 100 }, 10);
  x.finish('k2', { amount: 100 }, f.token, 20); if (s.status === 'started') x.finish('k2', { amount: 100 }, s.token, 30);
  const y = payments(); const g = y.begin('k2', { amount: 100 }, 0); const t = y.begin('k2', { amount: 100 }, 10); y.finish('k2', { amount: 100 }, g.token, 20);
  add('double click: pehla abhi chal raha, doosra aaya', `${x.charges()} charge (key thi, lock/token nahi)`, `${y.charges()} charge, doosre ko ${t.status}`); }
// C. same key reused with a different amount (bug)
{ const y = payments(); y.charge('k3', { amount: 100 }, 0); const r = y.charge('k3', { amount: 250 }, 1000);
  add('same key, alag amount (bug)', '—', `${r.status}: ${r.body}`); }
// D. retry after the key expired (Stripe: keys can be removed after 24 h)
{ const y = payments(); y.charge('k4', { amount: 100 }, 0); y.charge('k4', { amount: 100 }, 25 * H);
  add('25 ghante baad retry (DLQ se redrive)', '—', `${y.charges()} charge — key mit chuki thi`); }
// D2. the first worker hangs past its lease; another request takes over; the old worker finally finishes
{ const y = payments({ leaseMs: 60e3 }); const a = y.begin('k5', { amount: 100 }, 0); const b = y.begin('k5', { amount: 100 }, 61e3);
  y.finish('k5', { amount: 100 }, b.token, 62e3); const late = y.finish('k5', { amount: 100 }, a.token, 90e3);
  add('pehla worker 90 s atka, 60 s lease ke baad doosre ne liya', '—', `${y.charges()} charge; purane ko ${late.status} (token purana)`); }
// E. DELETE retried after the id was reused
{ const u = users({ reuseIds: true }); const a = u.create('Asha'); u.del(a); const b = u.create('Bilal'); const again = u.del(10);
  const w = users({ reuseIds: true }); const a2 = w.create('Asha'); const v = w.get(a2).v; w.del(a2, v); w.create('Bilal'); const again2 = w.del(10, v);
  add('DELETE /users/10 retry, beech mein id 10 naye user ko mili', `${again === 204 ? 'naya user Bilal mit gaya' : again}`, `${again2} — version alag, kuch nahi mita`); }
// F. increment vs set
{ const x = balance(500); x.add(100); x.add(100);
  const y = balance(500); const v0 = y.get().v; y.set(600, v0); const r2 = y.set(600, v0);
  add('"balance +100" retry vs "balance = 600 (agar version 0)"', `${x.get().b} (₹100 zyada)`, `${y.get().b}, retry ko ${r2.status}`); }

console.log('ASLI code (lib/idem.js, memory mein): sirf success-path, Stripe API v1 ke idempotency niyamon se prerit. Har row ek scenario.');
console.log('Lab ke chune hue niyam: key theek 24 ghante par mitti, alag parameters par 422.\n');
console.log('scenario                                                   bina suraksha                        suraksha ke saath');
for (const [a, b, c] of rows) console.log(`${a.padEnd(58)} ${b.padEnd(36)} ${c}`);
console.log('\n→ Idempotency key: khoye jawab par retry safe. Par key ke saath "chal raha hai" ka lock (409) bhi chahiye, warna double click');
console.log('  par do charge. Alag parameters par same key = bug, server mana kare (Stripe bhi error deta hai).');
console.log('→ Key hamesha nahi rehti: Stripe v1 key ko 24 ghante ke baad kabhi bhi hata sakta hai — tab din baad ka redrive naya charge bana');
console.log('  sakta hai. Apna durable record ("is order ka payment hua?") aur reconciliation rakho.');
console.log('→ Video: "delete idempotent hai". Asar same, par jawab badalta hai (204 phir 404), aur id dobara mile toh purana retry naya row');
console.log('  mita deta hai. Version wali shart (If-Match) ya kabhi dobara na milne wali id (UUID) bachaati hai.');
console.log('→ "+100" retry par do baar judta hai; "= 600 agar version 0" ek hi baar lagta hai (doosre ko 412).');
