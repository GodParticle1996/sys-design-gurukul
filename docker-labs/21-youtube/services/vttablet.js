/* vttablet jaisa proxy — har MySQL ke saath baitha. App ke hazaron connections yahan (sasta: koi 1 MB buffer nahi).
   (a) POOL: DB tak sirf POOL (default 20) asli connections.
   (b) CONSOLIDATION: same SELECT pehle se chal raha hai → naya DB query mat bhejo, usi ke jawab ka intezaar.
   (c) SAFETY: bina LIMIT wala SELECT → LIMIT 10000 jod do; 1 sec se lambi query → kill (error). */
const net = require('net');
const onLines = require('../lib/line');
const { serve, host } = require('../lib/util');
const PORT = +process.env.PORT || 4972, POOL = +(process.env.POOL || 20);
const CONSOLIDATE = process.env.CONSOLIDATE !== '0', GUARD = process.env.GUARD !== '0';
const DB = { host: host('db'), port: 4971 };
const idle = [], waiting = []; let appConns = 0, dbQueries = 0, consolidated = 0, rewritten = 0, killed = 0;
function dbConn() {
  const s = net.connect(DB.port, DB.host); s.setNoDelay(true); s.cb = null;
  onLines(s, l => { const cb = s.cb; s.cb = null; release(s); cb && cb(l); });
  s.on('error', () => {}); return s;
}
for (let i = 0; i < POOL; i++) idle.push(dbConn());
function release(s) { const w = waiting.shift(); if (w) run(s, w.sql, w.cb); else idle.push(s); }
function run(s, sql, cb) {
  dbQueries++; let done = false;
  const t = setTimeout(() => { if (done) return; done = true; killed++; s.cb = null; s.destroy(); idle.push(dbConn()); cb('E query 1000 ms se lambi — vttablet ne kill ki'); }, 1000);
  s.cb = l => { if (done) return; done = true; clearTimeout(t); cb(l); };
  s.write('Q ' + sql + '\n');
}
function exec(sql, cb) { const s = idle.pop(); if (s) run(s, sql, cb); else waiting.push({ sql, cb }); }
const inflight = new Map();                                             // sql -> [callbacks]
function query(sql, cb) {
  if (GUARD && /^SELECT/i.test(sql) && !/LIMIT/i.test(sql)) { sql += ' LIMIT 10000'; rewritten++; }
  if (CONSOLIDATE && /^SELECT/i.test(sql)) {
    if (inflight.has(sql)) { consolidated++; return inflight.get(sql).push(cb); }
    inflight.set(sql, [cb]);
    return exec(sql, l => { const cbs = inflight.get(sql); inflight.delete(sql); cbs.forEach(f => f(l)); });
  }
  exec(sql, cb);
}
net.createServer(app => {
  appConns++; app.setNoDelay(true);
  onLines(app, l => query(l.slice(2), r => { if (!app.destroyed) app.write(r + '\n'); }));
  app.on('close', () => appConns--); app.on('error', () => {});
}).listen(PORT, () => console.log(`[vttablet] :${PORT} pool=${POOL} consolidate=${CONSOLIDATE} guard=${GUARD}`));
serve(PORT + 5, {
  'GET /stats': () => ({ appConns, pool: POOL, dbQueries, consolidated, rewritten, killed }),
  'POST /reset': () => { dbQueries = 0; consolidated = 0; rewritten = 0; killed = 0; return { ok: true }; },
});
