'use strict';
// ASLI ginti: run a flow, crash after step k (for every k), then redeliver and run it again in full.
// Also every interleaving of two workers that got the same message at once.
// Consumer flows charge ₹100 for one message. State is "durable" except an open DB transaction (lost on crash).
const consumers = {
  'koi idempotency nahi': [
    s => { s.charges++; },                                              // charge ₹100, then ack
  ],
  'check → charge → record (video)': [
    s => { s.seen = s.ids.has('m1'); },                                 // 1. check: "pehle kiya?"
    s => { if (!s.seen) s.charges++; },                                 // 2. charge ₹100
    s => { if (!s.seen) s.ids.add('m1'); },                             // 3. record the message id
  ],
  'ek DB transaction: id insert (UNIQUE) + charge': [
    s => { if (!s.ids.has('m1')) { s.ids.add('m1'); s.charges++; } },  // BEGIN; INSERT id; charge; COMMIT — all or nothing
  ],
  'provider ko Idempotency-Key = message id': [
    s => { if (!s.keys.has('m1')) { s.keys.add('m1'); s.charges++; } },  // the provider remembers the key, charges once
  ],
};
const fresh = () => ({ charges: 0, ids: new Set(), keys: new Set() });
function crashPoints(steps) {                       // crash after step k (k = 0 … steps.length - 1), then a full redelivery
  const out = [];
  for (let k = 0; k < steps.length; k++) {
    const s = fresh();
    for (let i = 0; i <= k; i++) steps[i](s);       // ran up to step k, then crashed before ack → message comes back
    s.seen = undefined;
    for (const f of steps) f(s);
    out.push(s.charges);
  }
  return out;
}
function interleavings(steps) {                     // two workers, same message, every order of their steps
  const n = steps.length, res = [];
  const go = (a, b, order) => {
    if (a === n && b === n) {
      const s = fresh(), local = [{}, {}];
      for (const w of order) { const st = local[w]; const saved = s.seen; s.seen = st.seen; steps[st.i = (st.i ?? -1) + 1](s); st.seen = s.seen; s.seen = saved; }
      res.push(s.charges); return;
    }
    if (a < n) go(a + 1, b, [...order, 0]);
    if (b < n) go(a, b + 1, [...order, 1]);
  };
  go(0, 0, []);
  return res;
}
// Producer side: signup must save the user AND tell the queue. Crash after any step; or the DB write fails.
const producers = {
  'DB save → queue publish': ['db', 'pub'],
  'queue publish → DB save': ['pub', 'db'],
  'outbox: ek transaction (user + outbox row) → relay publish → relay "sent"': ['db+outbox', 'relay-pub', 'relay-mark'],
};
function producerOutcomes(steps) {
  const res = { ok: 0, lost: 0, phantom: 0, duplicate: 0 }, cases = [];
  for (let k = -1; k < steps.length; k++) cases.push({ crashAfter: k, dbFails: false });
  cases.push({ crashAfter: -1, dbFails: true });
  for (const c of cases) {
    let user = false, events = 0, outbox = false, sent = false, crashed = false;
    const doStep = st => {
      if (st === 'db') { if (c.dbFails) throw new Error('db'); user = true; }
      if (st === 'pub') events++;
      if (st === 'db+outbox') { if (c.dbFails) throw new Error('db'); user = true; outbox = true; }
      if (st === 'relay-pub') events++;
      if (st === 'relay-mark') sent = true;
    };
    try { steps.forEach((st, i) => { if (crashed) return; doStep(st); if (i === c.crashAfter) crashed = true; }); } catch { /* request failed */ }
    if (outbox && !sent) { events++; sent = true; }   // the relay restarts and publishes every unsent outbox row (at-least-once)
    if (user && events === 0) res.lost++;
    else if (!user && events > 0) res.phantom++;
    else if (events > 1) res.duplicate++;
    else res.ok++;
  }
  return { ...res, cases: cases.length };
}
module.exports = { consumers, crashPoints, interleavings, producers, producerOutcomes };
