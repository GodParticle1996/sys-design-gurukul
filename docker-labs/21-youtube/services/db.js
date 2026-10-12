/* "MySQL" ki nakal — TCP, line protocol: "Q <sql>" → "R <rows>" | "E <error>".
   Har connection ek thread + buffers = asli memory (yahan 1 MB ka Buffer per connection, RSS mein dikhta hai).
   max_connections = 500 → uske baad "Too many connections".  Query: 20 ms. Bina LIMIT wali "SELECT * FROM comments" = 2,000 ms. */
const net = require('net');
const onLines = require('../lib/line');
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 4971, MAX = +(process.env.MAX_CONN || 500);
let conns = 0, refused = 0, queries = 0, peakConns = 0, slow = 0;
net.createServer(sock => {
  if (conns >= MAX) { refused++; sock.end('E Too many connections\n'); return; }
  conns++; peakConns = Math.max(peakConns, conns);
  sock.mem = Buffer.alloc(1024 * 1024, 1);                                    // per-connection memory
  onLines(sock, line => {
    const sql = line.slice(2); queries++;
    const heavy = /FROM comments/i.test(sql) && !/LIMIT/i.test(sql);
    if (heavy) slow++;
    setTimeout(() => { if (!sock.destroyed) sock.write(`R ${heavy ? '9000000 rows' : '1 row'} :: ${sql}\n`); }, heavy ? 2000 : 20);
  });
  sock.on('close', () => { conns--; sock.mem = null; }); sock.on('error', () => {});
}).listen(PORT, () => console.log(`[db] :${PORT} max_connections=${MAX}`));
serve(PORT + 5, {
  'GET /stats': () => ({ conns, peakConns, refused, queries, slowQueries: slow, rssMB: Math.round(process.memoryUsage().rss / 1048576) }),
  'POST /reset': () => { refused = 0; queries = 0; peakConns = conns; slow = 0; if (global.gc) global.gc(); return { ok: true }; },
});
