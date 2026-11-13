'use strict';
// ex1 core (seeded MODEL of message reachability, real arithmetic): 5 nodes, the network splits {1,2,3} | {4,5}.
// 1,000 accounts, ₹100 each. During the split every account gets one withdrawal at an ATM on each side at the same time,
// plus balance checks. Four rules decide what an ATM on each side may do.
const { rng } = require('./rng');
const POLICIES = ['CP quorum', 'AP + LWW', 'AP + ledger', 'AP + offline ₹20'];
const N = 5, MAJORITY = [1, 2, 3], MINORITY = [4, 5], QUORUM = 3;

function run(policy, { accounts = 1000, reads = 2000, seed = 8 } = {}) {
  if (!POLICIES.includes(policy)) throw new Error(`policy: ${POLICIES.join(' | ')}`);
  const r = rng(seed), amt = () => 10 * (1 + Math.floor(r() * 10));   // ₹10 … ₹100
  const s = { served: { maj: 0, min: 0 }, refused: { maj: 0, min: 0 }, readErr: { maj: 0, min: 0 }, paid: 0, recorded: 0, overdrawn: 0, beyond: 0 };
  for (let a = 0; a < accounts; a++) {
    const x = amt(), y = amt();                                         // majority ATM asks x, minority ATM asks y
    const okSide = (side, want, balanceSeen) => {
      const reach = side === 'maj' ? MAJORITY.length : MINORITY.length;
      if (policy === 'CP quorum') return reach >= QUORUM && want <= balanceSeen;   // commit needs 3 of 5 nodes
      if (policy === 'AP + offline ₹20' && side === 'min') return want <= 20 && want <= balanceSeen;   // stand-in limit
      return want <= balanceSeen;                                       // AP: each side checks only its own copy
    };
    const majOk = okSide('maj', x, 100), minOk = okSide('min', y, 100);   // both sides still see ₹100
    for (const [side, ok] of [['maj', majOk], ['min', minOk]]) ok ? s.served[side]++ : s.refused[side]++;
    const paid = (majOk ? x : 0) + (minOk ? y : 0);
    s.paid += paid;
    // after the split heals: what does the account record say?
    let balance;
    if (policy === 'AP + LWW') balance = minOk ? 100 - y : majOk ? 100 - x : 100;   // each side wrote its BALANCE; the later write (minority) wins
    else balance = 100 - paid;                                          // ledger of withdrawals: both entries kept
    s.recorded += 100 - balance;
    if (balance < 0) s.overdrawn++;
    s.beyond += Math.max(0, paid - 100);
  }
  for (let i = 0; i < reads; i++) {                                     // balance checks: 60% of users near the majority side
    const side = r() < 0.6 ? 'maj' : 'min';
    if (policy === 'CP quorum' && side === 'min') s.readErr.min++;      // a linearizable read also needs the quorum
  }
  s.unrecorded = s.paid - s.recorded;                                   // paid out but missing from the books
  return s;
}
module.exports = { run, POLICIES, N, QUORUM };
