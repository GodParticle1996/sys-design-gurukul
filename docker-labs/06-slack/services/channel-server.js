/* ex2 — channel server.
   FANOUT=broadcast : har connected client ko bhejo (chahe channel ka member ho ya nahi)
   FANOUT=subs      : sirf channel ke subscribers ko
   EDGE=0           : har client ko alag long-haul copy
   EDGE=1           : har region (edge) ko ek copy, edge aage baante
   Store-then-send: message pehle data/pending.json (durable) mein, deliver hone ke baad hatao.
   CRASH_AFTER=n    : n client deliveries ke baad process mar jaata hai (replay dikhane ke liye) */
const fs = require('fs');
const path = require('path');
const { serve, post, sleep } = require('../lib/util');
const PORT = +(process.env.PORT || 4603);
const FANOUT = process.env.FANOUT || 'broadcast';
const EDGE = process.env.EDGE === '1';
const CLIENTS = +(process.env.CLIENTS || 2000);
const CRASH_AFTER = +(process.env.CRASH_AFTER || 0);
const EDGE_URL = 'http://localhost:' + (process.env.EDGE_PORT || 4604);
const PENDING = path.join(__dirname, '..', 'data', 'pending.json');

/* channel 'general' ke 300 members; client ka region = id % 3 */
const members = { general: Array.from({ length: 300 }, (_, i) => i * 6 + 1) };
const region = c => c % 3;
let longHaul = 0, deliveredCount = 0, replayed = 0;

const readPending = () => { try { return JSON.parse(fs.readFileSync(PENDING, 'utf8')); } catch (e) { return []; } };
const writePending = list => fs.writeFileSync(PENDING, JSON.stringify(list));

async function deliver(msg) {
  const targets = FANOUT === 'subs' ? members[msg.channel] : Array.from({ length: CLIENTS }, (_, i) => i);
  if (EDGE) {
    const byRegion = [[], [], []];
    targets.forEach(c => byRegion[region(c)].push(c));
    for (const list of byRegion) {
      /* ek copy region tak, edge wahan baant-ta hai (yahan chunks mein, taaki crash beech mein ho sake) */
      longHaul++;
      for (let i = 0; i < list.length; i += 20) {
        const chunk = list.slice(i, i + 20);
        await post(EDGE_URL + '/deliver', { msgId: msg.id, clients: chunk });
        deliveredCount += chunk.length;
        if (CRASH_AFTER && deliveredCount >= CRASH_AFTER) { console.log(`  💥 channel-server crashed after ${deliveredCount}/${targets.length} deliveries`); process.exit(1); }
        await sleep(1);
      }
    }
  } else {
    for (const c of targets) {
      longHaul++;
      await post(EDGE_URL + '/deliver', { msgId: msg.id, clients: [c] });
      deliveredCount++;
      if (CRASH_AFTER && deliveredCount >= CRASH_AFTER) { console.log(`  💥 channel-server crashed after ${deliveredCount}/${targets.length} deliveries`); process.exit(1); }
    }
  }
}

async function send(msg) {
  const list = readPending(); list.push(msg); writePending(list);           /* 1. STORE (durable) */
  await deliver(msg);                                                       /* 2. SEND */
  writePending(readPending().filter(m => m.id !== msg.id));                 /* 3. done */
}

serve(PORT, {
  'POST /send': async (req, res, url, p, body) => { await send({ id: body.id, channel: body.channel || 'general' }); return { ok: true }; },
  'GET /stats': () => ({ fanout: FANOUT, edge: EDGE, longHaul, deliveredCount, replayed }),
  'POST /reset': () => { longHaul = deliveredCount = replayed = 0; writePending([]); return { ok: true }; },
}, async () => {
  console.log(`  channel-server → http://localhost:${PORT}  (FANOUT=${FANOUT} EDGE=${EDGE ? 1 : 0}${CRASH_AFTER ? ' CRASH_AFTER=' + CRASH_AFTER : ''})`);
  const pending = readPending();
  if (pending.length) {
    console.log(`  restart → ${pending.length} adhoore message(s) replay ho rahe hain`);
    for (const m of pending) { await deliver(m); replayed++; }
    writePending([]);
  }
});
