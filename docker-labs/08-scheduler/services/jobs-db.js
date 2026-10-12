/* ex2 — jobs table: priority lanes, atomic claim (FOR UPDATE SKIP LOCKED jaisa), heartbeat, watchdog */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 4803);
const WATCH_MS = +(process.env.WATCH_MS || 3000);        /* heartbeat itna purana → worker mara maano */
const MAX_ATTEMPTS = +(process.env.MAX_ATTEMPTS || 3);
const PRI = { critical: 0, high: 1, normal: 2, low: 3 };
let jobs = [];
let requeued = 0, deadLetter = 0;
const execCount = new Map();
const completedOrder = [];

setInterval(() => {                                     /* WATCHDOG */
  const now = Date.now();
  for (const j of jobs) {
    if (j.status === 'running' && now - j.lastHb > WATCH_MS) {
      j.attempts++;
      if (j.attempts >= MAX_ATTEMPTS) { j.status = 'dead'; deadLetter++; }
      else { j.status = 'pending'; j.worker = null; requeued++; }
    }
  }
}, 500);

serve(PORT, {
  'POST /seed/:n': (req, res, url, p) => {
    jobs = []; requeued = 0; deadLetter = 0; execCount.clear(); completedOrder.length = 0;
    const lanes = ['low', 'normal', 'high', 'critical'];
    for (let i = 0; i < +p.n; i++) {
      const pr = i < 3 ? 'critical' : lanes[i % 3];             /* 3 critical jobs, baaki mixed */
      jobs.push({ id: i, priority: pr, status: 'pending', attempts: 0, worker: null, lastHb: 0, poison: i === 7 });
    }
    /* critical jobs jaan-boojh kar list ke AAKHIR mein — flat queue mein woh sabse baad aate */
    jobs.push(...jobs.splice(0, 3));
    return { seeded: jobs.length };
  },
  /* ORDER BY priority, id ... LIMIT 1 FOR UPDATE SKIP LOCKED — Node single thread mein atomic */
  'POST /claim/:worker': (req, res, url, p) => {
    const MODE = process.env.QUEUE || 'priority';
    const pending = jobs.filter(j => j.status === 'pending');
    if (!pending.length) return { job: null };
    const j = MODE === 'priority' ? pending.sort((a, b) => PRI[a.priority] - PRI[b.priority] || a.id - b.id)[0] : pending[0];
    j.status = 'running'; j.worker = p.worker; j.lastHb = Date.now();
    execCount.set(j.id, (execCount.get(j.id) || 0) + 1);
    return { job: { id: j.id, priority: j.priority, poison: j.poison } };
  },
  'POST /heartbeat/:id': (req, res, url, p) => { const j = jobs.find(x => x.id === +p.id); if (j && j.status === 'running') j.lastHb = Date.now(); return { ok: true }; },
  'POST /complete/:id': (req, res, url, p) => {
    const j = jobs.find(x => x.id === +p.id);
    if (j && j.status === 'running') { j.status = 'done'; completedOrder.push(j.priority); }
    return { ok: true };
  },
  'GET /stats': () => {
    const c = s => jobs.filter(j => j.status === s).length;
    const reran = [...execCount.values()].filter(n => n > 1).length;
    return { queue: process.env.QUEUE || 'priority', done: c('done'), pending: c('pending'), running: c('running'), dead: c('dead'), requeued, reran, firstFive: completedOrder.slice(0, 5) };
  },
}, () => console.log(`  jobs-db     → http://localhost:${PORT}  (watchdog ${WATCH_MS} ms · max attempts ${MAX_ATTEMPTS} · QUEUE=${process.env.QUEUE || 'priority'})`));
