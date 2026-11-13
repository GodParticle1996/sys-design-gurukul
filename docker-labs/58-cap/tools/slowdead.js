'use strict';
// ex0-slow-vs-dead — ASLI: ek worker thread har 20 ms ke ping ka jawab deta hai. Teen failure detectors (timeout 100 ms,
// 500 ms, 3000 ms) wahi jawab dekhte hain. Kahani 1: t = 500 ms par node 2 s ke liye atak jaata hai (GC pause jaisa),
// phir theek. Kahani 2: t = 500 ms par node sach mein band (worker terminate).
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const TIMEOUTS = [100, 500, 3000], PING = 20;

function story(kind, until) {
  return new Promise(resolve => {
    const w = new Worker(path.join(__dirname, '../lib/node-worker.js'));
    let t0 = 0, lastPong = 0, seq = 0, backAt = null, failAt = null, started = false;
    const now = () => performance.now() - t0;
    const alarm = Object.fromEntries(TIMEOUTS.map(t => [t, null]));
    w.on('message', m => {
      if (m.type !== 'pong') return;
      if (!started) { started = true; t0 = performance.now(); begin(); }  // the clock starts at the first answer, not at worker start-up
      if (failAt !== null && backAt === null && now() > failAt + 50) backAt = now();
      lastPong = now();
    });
    w.postMessage({ type: 'ping', seq: 0 });
    function begin() {
      const ping = setInterval(() => {
        if (failAt === null || kind === 'pause') w.postMessage({ type: 'ping', seq: ++seq });
        for (const t of TIMEOUTS) if (alarm[t] === null && now() - lastPong > t) alarm[t] = now();
      }, PING);
      setTimeout(() => {
        failAt = now();
        if (kind === 'pause') w.postMessage({ type: 'pause', ms: 2000 }); else w.terminate();
      }, 500);
      setTimeout(async () => { clearInterval(ping); await w.terminate(); resolve({ failAt, backAt, alarm }); }, until);
    }
  });
}
const ms = x => x === null ? '—' : `${Math.round(x)} ms`;
(async () => {
  const p = await story('pause', 3800), d = await story('dead', 4200);
  console.log(`Ping har ${PING} ms. Node t = ${Math.round(p.failAt)} ms par atka; wapas jawab t = ${ms(p.backAt)} par.`);
  console.log('\ntimeout    Kahani 1: 2 s ka pause (node ZINDA tha)          Kahani 2: node sach mein band');
  for (const t of TIMEOUTS) {
    const a = p.alarm[t], b = d.alarm[t];
    const one = a === null ? 'koi alarm nahi (sahi)' : `"mara" kaha t = ${ms(a)} par (JHOOTA alarm)`;
    if (a !== null && a < p.failAt || b !== null && b < d.failAt) throw new Error('alarm before the fault');
    const two = b === null ? 'pakda hi nahi' : `pakda ${ms(b - d.failAt)} baad`;
    console.log(`${String(t).padStart(5)} ms   ${one.padEnd(46)}  ${two}`);
  }
  console.log('\nBahar se dono kahaniyan pehle ek jaisi dikhti hain: pong aana band. Chhota timeout = jaldi pakdo, par zinda');
  console.log('node ko bhi "mara" bolo. Lamba timeout = jhoota alarm nahi, par sach mein mara node der se pakda.');
})().catch(e => { console.error(e); process.exitCode = 1; });
