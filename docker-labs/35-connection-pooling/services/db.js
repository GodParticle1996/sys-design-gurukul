/* Postgres jaisa DB (line protocol: BEGIN / Q / COMMIT → OK).
   Har connection = ek backend process: 2 MB memory (asli Buffer, RSS mein dikhta hai). max_connections 500.
   CPU: 8 cores. Ek query = 2 ms CPU (~4,000 queries/sec kul). 8 se zyada queries ek saath → cores baantne padte hain + locks/context-switch ka
   kharcha (har extra active query par 3%) → zyada concurrency = KAM throughput. */
const net = require('net');
const onLines = require('../lib/line');
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 5131, MAX = 500, CORES = 8, Q_MS = 2;
let conns = 0, peak = 0, refused = 0, active = 0, queries = 0, peakActive = 0;
net.createServer(s => {
  if (conns >= MAX) { refused++; s.end('E too many connections\n'); return; }
  conns++; peak = Math.max(peak, conns); s.mem = Buffer.alloc(2 * 1048576, 1); s.setNoDelay(true);
  onLines(s, l => {
    if (l !== 'Q') return s.write('OK\n');                            // BEGIN / COMMIT sasta
    active++; queries++; peakActive = Math.max(peakActive, active);
    const ms = Q_MS * Math.max(1, active / CORES) * (1 + 0.03 * Math.max(0, active - CORES));
    setTimeout(() => { active--; if (!s.destroyed) s.write('OK\n'); }, ms);
  });
  s.on('close', () => { conns--; s.mem = null; }); s.on('error', () => {});
}).listen(PORT, () => console.log(`[db] :${PORT} max_connections=${MAX} cores=${CORES}`));
serve(PORT + 10, {
  'GET /stats': () => ({ conns, peak, refused, queries, peakActive, rssMB: Math.round(process.memoryUsage().rss / 1048576) }),
  'POST /reset': () => { peak = conns; refused = 0; queries = 0; peakActive = 0; return { ok: true }; },
});
