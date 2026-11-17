'use strict';
// ASLI ginti: "buy 1 item" (operation id "op1") = stock − 1 AND create an order. Each protocol is a list of steps.
// We crash after every step, restart, and run recovery; recovery itself may crash once and run again.
// After every step a reader looks at the COMMITTED state of both databases. Counted per protocol:
//   wrongEnd — after recovery finishes, stock taken and orders created disagree for op1 (or both are not final yet)
//   seenMid  — some reader saw stock already taken but no order yet (or the reverse)
//   blocked  — at the crash, a participant held a prepared transaction (locks) without knowing commit/abort
// Participants keep receipts keyed by the operation id, so repeated steps are idempotent (FP11/FP12 lesson).
const OP = 'op1';
const fresh = () => ({
  inv: { stock: 10, applied: new Map(), prepared: null, knows: null, txn: null },
  ord: { orders: 0, created: new Set(), prepared: null, knows: null },
  log: [], decision: null, memory: [],
});
const S = {
  // one database, one ACID transaction (both tables in it)
  begin: w => { w.inv.txn = { stock: w.inv.stock, orders: w.ord.orders }; },
  'txn stock-1': w => { w.inv.txn.stock--; },
  'txn order+': (w, o) => { if (o.orderFails) throw new Error('order failed'); w.inv.txn.orders++; },
  commit: w => { w.inv.stock = w.inv.txn.stock; w.ord.orders = w.inv.txn.orders; w.inv.txn = null; },
  // saga participants (each step commits in its own database, idempotent by receipt)
  'inv reserve': w => { if (!w.inv.applied.has(OP)) { w.inv.stock--; w.inv.applied.set(OP, 'reserved'); } },
  'ord create': (w, o) => { if (o.orderFails) throw new Error('order failed'); if (!w.ord.created.has(OP)) { w.ord.orders++; w.ord.created.add(OP); } },
  'inv compensate': w => { if (w.inv.applied.get(OP) === 'reserved') { w.inv.stock++; w.inv.applied.set(OP, 'compensated'); } },
  'log start': w => w.log.push('start'), 'log stock done': w => w.log.push('stock done'), 'log done': w => w.log.push('done'),
  'mem stock done': w => w.memory.push('stock done'),
  // two-phase commit
  'prep inv': w => { w.inv.prepared = OP; },
  'prep ord': (w, o) => { if (o.orderFails) throw new Error('order failed'); w.ord.prepared = OP; },
  'coord log commit': w => { w.decision = 'commit'; },
  'send commit inv': w => { if (w.inv.prepared) { w.inv.stock--; w.inv.prepared = null; } w.inv.knows = 'commit'; },
  'send commit ord': w => { if (w.ord.prepared) { w.ord.orders++; w.ord.prepared = null; } w.ord.knows = 'commit'; },
  'send abort': w => { w.inv.prepared = w.ord.prepared = null; w.inv.knows = w.ord.knows = 'abort'; },
};
const PROTOCOLS = {
  'ek DB, ek transaction': ['begin', 'txn stock-1', 'txn order+', 'commit'],
  'saga, progress sirf memory mein': ['inv reserve', 'mem stock done', 'ord create'],
  'saga + durable saga log': ['log start', 'inv reserve', 'log stock done', 'ord create', 'log done'],
  '2PC (do-phase commit)': ['prep inv', 'prep ord', 'coord log commit', 'send commit inv', 'send commit ord'],
};
// what the app/coordinator does when a step throws "order failed" while it is still alive
const ON_FAIL = {
  'ek DB, ek transaction': [],                                  // the open transaction is simply rolled back
  'saga, progress sirf memory mein': ['inv compensate'],
  'saga + durable saga log': ['inv compensate', 'log done'],
  '2PC (do-phase commit)': ['send abort'],
};
// recovery after a restart (built from what survived)
function recoverySteps(name, w, o) {
  if (name === 'ek DB, ek transaction') return [];             // open transaction rolled back by the database
  if (name === 'saga, progress sirf memory mein') return [];   // memory is gone: nobody knows op1 was in flight
  if (name === 'saga + durable saga log') {
    if (!w.log.includes('start') || w.log.includes('done')) return [];
    return o.orderFails ? ['inv compensate', 'log done'] : ['inv reserve', 'ord create', 'log done'];   // idempotent steps
  }
  if (w.decision === 'commit') return ['send commit inv', 'send commit ord'];   // logged decision: finish it
  return (w.inv.prepared || w.ord.prepared) ? ['send abort'] : [];             // no COMMIT in the log: presumed abort
}
function simulate(name, crashAfter, { orderFails = false, recoveryCrashAfter = null } = {}) {
  const o = { orderFails }, w = fresh();
  let seenMid = false;
  const look = () => {                                          // a reader sees committed state only
    const taken = 10 - w.inv.stock, made = w.ord.orders;
    if (taken !== made) seenMid = true;
  };
  const run = (steps, crashAt) => {
    for (let i = 0; i < steps.length; i++) {
      try { S[steps[i]](w, o); } catch (e) {
        for (const f of ON_FAIL[name]) { S[f](w, o); look(); }
        if (name === 'ek DB, ek transaction') w.inv.txn = null;
        return 'failed';
      }
      look();
      if (crashAt !== null && i === crashAt) return 'crashed';
    }
    return 'ok';
  };
  const first = run(PROTOCOLS[name], crashAfter);
  let blocked = false;
  if (first === 'crashed') {
    w.inv.txn = null; w.memory = [];                           // restart: open transaction rolled back, memory lost
    blocked = Boolean((w.inv.prepared && !w.inv.knows) || (w.ord.prepared && !w.ord.knows));
    const r1 = recoverySteps(name, w, o);
    if (run(r1, recoveryCrashAfter) === 'crashed') { w.memory = []; run(recoverySteps(name, w, o), null); }   // recovery crashed: run it again
  }
  const taken = 10 - w.inv.stock, made = w.ord.orders, pending = Boolean(w.inv.prepared || w.ord.prepared);
  const wrongEnd = taken !== made || pending;
  return { wrongEnd, seenMid, blocked, stock: w.inv.stock, orders: made, outcome: first };
}
function summary(name, opts = {}) {
  const n = PROTOCOLS[name].length, cases = [null, ...Array.from({ length: n - 1 }, (_, i) => i)];
  const r = cases.map(c => simulate(name, c, opts));
  return { cases: r.length, wrongEnd: r.filter(x => x.wrongEnd).length, seenMid: r.filter(x => x.seenMid).length, blocked: r.filter(x => x.blocked).length };
}
// Every crash point, and for each a crash at every recovery step, then a second recovery. Any wrong end?
function recoveryCrashes(name, opts = {}) {
  let worst = 0, runs = 0;
  for (let c = 0; c < PROTOCOLS[name].length - 1; c++) for (let r = 0; r < 3; r++) {
    runs++; if (simulate(name, c, { ...opts, recoveryCrashAfter: r }).wrongEnd) worst++;
  }
  return { runs, wrongEnd: worst };
}
module.exports = { PROTOCOLS, simulate, summary, recoveryCrashes };
