/* PgBouncer jaisa pooler. App ke hazaron connections yahan (sasta), DB tak sirf POOL asli connections.
   MODE=transaction → BEGIN par server connection lo, COMMIT par wapas pool mein (connection transaction bhar ke liye).
   MODE=session     → client jab tak juda hai, server connection USI ka (idle ho tab bhi).
   POST /config {mode, pool} */
const net = require('net');
const onLines = require('../lib/line');
const { serve, host } = require('../lib/util');
const PORT = +process.env.PORT || 5132, DB = { host: host('db'), port: 5131 };
let MODE = process.env.MODE || 'transaction', POOL = +(process.env.POOL || 16);
let idle = [], total = 0; const waiters = [];
function open() { const s = net.connect(DB.port, DB.host); s.setNoDelay(true); s.cb = null; onLines(s, l => { const cb = s.cb; s.cb = null; cb && cb(l); }); s.on('error', () => {}); return s; }
function acquire() { return new Promise(res => { const s = idle.pop(); if (s) return res(s); if (total < POOL) { total++; return res(open()); } waiters.push(res); }); }
function release(s) { const w = waiters.shift(); if (w) w(s); else idle.push(s); }
const send = (s, line) => new Promise(res => { s.cb = res; s.write(line + '\n'); });
net.createServer(async c => {
  c.setNoDelay(true); let srv = null; const q = []; let busy = false;
  if (MODE === 'session') srv = await acquire();
  const pump = async () => {                                          // client ki lines order mein
    if (busy) return; busy = true;
    while (q.length) {
      const l = q.shift();
      if (MODE === 'transaction' && l === 'BEGIN') srv = await acquire();
      const r = await send(srv, l);
      if (!c.destroyed) c.write(r + '\n');
      if (MODE === 'transaction' && l === 'COMMIT') { release(srv); srv = null; }
    }
    busy = false;
  };
  onLines(c, l => { q.push(l); pump(); });
  c.on('close', () => { if (srv && MODE === 'session') release(srv); }); c.on('error', () => {});
}).listen(PORT, () => console.log(`[pooler] :${PORT} mode=${MODE} pool=${POOL}`));
serve(PORT + 10, {
  'POST /config': (req, res, url, p, b) => { MODE = b.mode || MODE; POOL = +(b.pool || POOL); idle.forEach(s => s.destroy()); idle = []; total = 0; return { MODE, POOL }; },
  'GET /stats': () => ({ MODE, POOL, serverConns: total, waiting: waiters.length }),
});
