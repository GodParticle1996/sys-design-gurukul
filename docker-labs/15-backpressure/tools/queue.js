#!/usr/bin/env node
/* ex1 — producer 10,000/s, consumer 2,000/s, 30 second (asli time, ek process mein).
   --policy unbounded | block | drop-new | drop-oldest | error      --cap 20000      [--secs 30] [--every 10]
   Har event ~1 KB object hai — unbounded queue mein asli memory (RSS) badhti dikhegi.
   Line ka code: lib/bounded-queue.js (wahi jo slowmo.js aur mini.js chalate hain). */
const { BoundedQueue } = require('../lib/bounded-queue');
const args = require('./args')();
const POLICY = args.policy || 'unbounded', CAP = +(args.cap || 20000), SECS = +(args.secs || 30), EVERY = +(args.every || 10);
const PROD = 10000, CONS = 2000;
const q = new BoundedQueue({ cap: POLICY === 'unbounded' ? Infinity : CAP, policy: POLICY });
let produced = 0, consumed = 0, maxAge = 0;
const mk = i => ({ id: i, at: Date.now(), payload: 'x'.repeat(1000) });
const rss = () => Math.round(process.memoryUsage().rss / 1048576);
const t0 = Date.now();
const tick = setInterval(() => {
  const now = Date.now();
  // producer: 100 events per 10 ms
  for (let i = 0; i < PROD / 100; i++) {
    if (POLICY === 'block' && q.full) break;                 // producer ruka — jagah banne tak kuch nahi bhejta
    produced++;
    const refused = q.full && (POLICY === 'drop-new' || POLICY === 'error');   // yeh kaam line mein jaayega hi nahi → 1 KB ka event banao bhi mat
    q.offer(refused ? null : mk(produced));                  // bhari ho toh kya hoga, yeh line ki policy tay karti hai
  }
  // consumer: 20 events per 10 ms
  for (let i = 0; i < CONS / 100 && q.items.length; i++) { const e = q.take(); consumed++; maxAge = Math.max(maxAge, now - e.at); }
}, 10);
const report = setInterval(() => {
  const s = Math.round((Date.now() - t0) / 1000);
  if (s % EVERY === 0 || s >= SECS) console.log(`t=${String(s).padStart(2)}s  queue=${String(q.items.length).padStart(7)}  rss=${String(rss()).padStart(4)} MB  consumed=${consumed}`);
  if (s >= SECS) {
    clearInterval(tick); clearInterval(report);
    const lastAge = q.items.length ? Math.round((Date.now() - q.items[0].at) / 1000) : 0;
    const secs = (Date.now() - t0) / 1000;
    console.log(`policy=${POLICY}${POLICY === 'unbounded' ? '' : ' cap=' + CAP}: producer ki asli raftaar ${Math.round(produced / secs)}/s, queue mein ${q.items.length}, dropped ${q.dropped}, errors (producer ko bataya) ${q.refused}, sabse purana event ${lastAge} s purana`);
  }
}, 1000);
