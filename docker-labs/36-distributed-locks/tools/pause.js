/* 30 orders. Har order: worker A lock leta hai (TTL 300 ms), phir "GC pause" — 600 ms ke liye jam.
   Lock khud expire → worker B lock leta hai, charge karta hai. A jaagta hai, sochta hai lock abhi bhi uska hai → charge.
   node tools/pause.js */
const { post, get, sleep, host } = require('../lib/util');
const LOCKS = [1, 2, 3, 4, 5].map(i => `http://${host('lockd' + i)}:${5150 + i}`), LEDGER = `http://${host('ledger')}:5156`;
async function acquire(mode, key, owner) {
  if (mode === 'single') { const r = await post(LOCKS[0] + '/acquire', { key, owner, ttlMs: 300 }); return r.ok ? r.token : null; }
  const rs = await Promise.all(LOCKS.map(l => post(l + '/acquire', { key, owner, ttlMs: 300 })));   // Redlock: 5 mein se majority
  return rs.filter(r => r.ok).length >= 3 ? Math.max(...rs.filter(r => r.ok).map(r => r.token)) : null;
}
async function order(mode, i, useToken) {
  const key = 'order-' + i;
  const tA = await acquire(mode, key, 'A');
  const a = (async () => { await sleep(600); return post(LEDGER + '/charge', { order: key, token: useToken ? tA : null }); })();   // GC pause, phir charge
  await sleep(350);                                                     // A ka lock expire ho chuka
  const tB = await acquire(mode, key, 'B');
  if (tB != null) await post(LEDGER + '/charge', { order: key, token: useToken ? tB : null });
  await a;
}
(async () => {
  console.log('lock                     ledger fencing check   orders   DOUBLE CHARGE   ledger ne purane token reject kiye');
  for (const [mode, fence] of [['single', false], ['redlock (5 nodes)', false], ['single + fencing token', true]]) {
    const m = mode.startsWith('redlock') ? 'redlock' : 'single';
    for (const l of LOCKS) await post(l + '/reset');
    await post(LEDGER + '/config', { fencing: fence });
    await Promise.all(Array.from({ length: 30 }, (_, i) => order(m, i, fence)));
    const s = await get(LEDGER + '/stats');
    console.log(`${mode.padEnd(24)} ${(fence ? 'haan (token)' : 'nahi').padEnd(22)} ${String(s.orders).padStart(4)}     ${String(s.doubleCharged).padStart(6)}          ${s.rejected}`);
  }
  console.log('\nLock "time" par chalta hai, process ki ghadi par nahi — pause ke baad A ko pata hi nahi ki lock gaya.');
  console.log('5 nodes ki majority (Redlock) bhi nahi bachati: problem lock server mein nahi, A ke pause mein hai.');
  console.log('Fencing token: lock ke saath badhta number; jis resource ko bachana hai WOH purana number mana kare.');
  console.log('(Redlock ke 5 nodes ke 5 alag counters hote hain — usme ek bharosemand fencing token hota hi nahi. Isliye woh row yahan nahi.)');
})();
