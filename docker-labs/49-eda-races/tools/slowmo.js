/* ex0-slowmo: nakli ghadi par wahi broker (lib/broker.js) aur wahi apply code (lib/apply.js), RAM SQLite mein.
   --story order  --mode shared|keyed   : ek order ki 5 haalatein, A har message 5 ms, B 40 ms
   --story phantom --mode none|paymentId : p1 likha, ack se pehle crash, 300 ms lease ke baad dobara
   Saare ms lab ke tay kiye hue hain. --json bhi. */
const { createBroker } = require('../lib/broker');
const { open } = require('../lib/store');
const A = require('../lib/apply');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const story = arg('--story', 'order'), mode = arg('--mode', story === 'order' ? 'shared' : 'none');
const rows = [], log = (t, say, state) => rows.push({ t, say, ...state });
const STEPS = ['placed', 'paid', 'packed', 'shipped', 'delivered'];
function order() {
  const b = createBroker({ leaseMs: 1000, keyed: mode === 'keyed' }), db = open(':memory:');
  STEPS.forEach((status, i) => b.publish({ order: 'o1', seq: i + 1, status }, 'o1'));
  const st = () => ({ db: db.prepare('SELECT status FROM orders').get()?.status || '—', pending: b.pending() });
  log(0, 'o1 ki 5 haalatein line mein (placed → delivered)', st());
  const workers = [{ name: 'A', ms: 5, free: 0 }, { name: 'B', ms: 40, free: 0 }];
  for (let t = 0; t <= 60 && b.pending(); t += 5) for (const w of workers) {
    if (w.job && t >= w.free) {
      A.setStatus(db, w.job.body, w.name); b.ack(w.job.id, w.job.attempt);
      log(t, `${w.name} ne #${w.job.body.seq} (${w.job.body.status}) likha`, st()); w.job = null;
    }
    if (!w.job) {
      const m = b.receive(t);
      if (m) { w.job = m; w.free = t + w.ms; log(t, `${w.name} ne #${m.body.seq} uthaya`, st()); }
    }
  }
}
function phantom() {
  const b = createBroker({ leaseMs: 300 }), db = open(':memory:');
  const st = () => ({ charges: db.prepare('SELECT payment FROM charges ORDER BY n').all().map(r => r.payment).join(',') || '—',
    pending: b.pending() });
  b.publish({ id: 'p1', user: 'u1', amount: 100 }, 'u1');
  log(0, 'p1 (u1, ₹100) line mein', st());
  let m = b.receive(10);
  log(10, `consumer ne p1 uthaya (attempt ${m.attempt})`, st());
  A.charge(db, m.body, mode);
  log(20, 'charge DB mein likha', st());
  log(21, 'ack se pehle consumer crash — broker ko ack nahi mila', st());
  log(300, 'consumer dobara chalu; p1 abhi lease par', st());
  m = b.receive(310);
  log(310, `lease khatam: p1 dobara mila (attempt ${m.attempt})`, st());
  const out = A.charge(db, m.body, mode);
  b.ack(m.id, m.attempt);
  log(320, out === 'duplicate' ? 'paymentId pehle se hai: charge nahi, sirf ack' : 'phir se charge likha, ack', st());
}
({ order, phantom })[story]();
if (process.argv.includes('--json')) console.log(JSON.stringify({ story, mode, rows }, null, 2));
else {
  console.log(`story=${story} mode=${mode} | nakli ghadi; lab ke tay ms`);
  for (const r of rows) console.log(`${String(r.t).padStart(3)} ms  ${r.say} | ${story === 'order' ? `o1=${r.db}` : `charges=${r.charges}`} line=${r.pending}`);
}
