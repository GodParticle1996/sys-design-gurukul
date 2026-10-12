/* 2,000 app servers ke connections. Sab ek naya viral video khol rahe hain → same query:
   "SELECT title, views FROM videos WHERE id = 42". Har client 5 baar poochhta hai.
   Phir ek intern ki galti: "SELECT * FROM comments WHERE video_id = 42" (bina LIMIT).
   node tools/clients.js --via direct|vttablet [--clients 2000] */
const net = require('net');
const args = require('./args')();
const onLines = require('../lib/line');
const { get, post, host, pct } = require('../lib/util');
const VIA = args.via || 'vttablet', N = +(args.clients || 2000);
const target = VIA === 'direct' ? { h: host('db'), p: 4971 } : { h: host('vttablet'), p: 4972 };
const dbStats = `http://${host('db')}:4976/stats`, vtStats = `http://${host('vttablet')}:4977/stats`;
/* App servers connection pehle se khol ke rakhte hain (persistent) — pehle sab connect, phir queries. */
function open() {
  return new Promise(resolve => {
    const s = net.connect(target.p, target.h); s.setNoDelay(true); s.lines = [];
    onLines(s, l => { const f = s.lines.shift(); if (f) f(l); else s.early = l; });
    s.on('connect', () => setTimeout(() => resolve(s), 150));          // DB "Too many connections" bol ke band kar sakta hai
    s.on('error', () => {}); s.on('close', () => { s.dead = true; resolve(s); });
  });
}
function ask(s, sql) {
  return new Promise(resolve => {
    if (s.dead || s.early) return resolve({ ok: false, line: s.early || 'E connection band', ms: 0 });
    const t = Date.now(); s.lines.push(l => resolve({ ok: l.startsWith('R'), line: l, ms: Date.now() - t })); s.write('Q ' + sql + '\n');
    s.once('close', () => resolve({ ok: false, line: 'E connection band', ms: Date.now() - t }));
  });
}
async function client(s, sqls) {
  const res = { ok: 0, err: 0, lat: [], errors: [] };
  for (const q of sqls) { const r = await ask(s, q); if (r.ok) { res.ok++; res.lat.push(r.ms); } else { res.err++; res.errors.push(r.line); } }
  return res;
}
(async () => {
  await post(dbStats.replace('stats', 'reset')); try { await post(vtStats.replace('stats', 'reset')); } catch (e) {}
  const hot = 'SELECT title, views FROM videos WHERE id = 42 LIMIT 1';
  const socks = await Promise.all(Array.from({ length: N }, open));
  const t0 = Date.now();
  const rs = await Promise.all(socks.map(s => client(s, [hot, hot, hot, hot, hot])));
  const secs = (Date.now() - t0) / 1000;
  const lat = [].concat(...rs.map(r => r.lat)); const ok = rs.reduce((s, r) => s + r.ok, 0), err = rs.reduce((s, r) => s + r.err, 0);
  const d = await get(dbStats);
  console.log(`via=${VIA}  ${N} clients × 5 same SELECT = ${N * 5} queries  (${secs.toFixed(1)} s)`);
  console.log(`  app ko jawab: ${ok} ok, ${err} error ${err ? '(' + [...new Set([].concat(...rs.map(r => r.errors)))].slice(0, 1).join('') + ')' : ''}   latency p50 ${pct(lat, 50)} ms p99 ${pct(lat, 99)} ms`);
  console.log(`  DB: peak connections ${d.peakConns}, refused ${d.refused}, queries chali ${d.queries}, RSS ${d.rssMB} MB`);
  if (VIA === 'vttablet') { const v = await get(vtStats); console.log(`  vttablet: consolidated ${v.consolidated} (DB tak gaye hi nahi), pool ${v.pool}`); }
  const bad = await client(socks.find(x => !x.dead && !x.early), ['SELECT * FROM comments WHERE video_id = 42']);
  socks.forEach(x => x.destroy());
  const d2 = await get(dbStats);
  console.log(`  intern ki query (bina LIMIT): ${bad.ok ? 'jawab mila' : 'error'} in ${bad.lat[0] || '-'} ms  → DB par slow queries ${d2.slowQueries}${VIA === 'vttablet' ? ` (vttablet ne LIMIT 10000 joda: ${(await get(vtStats)).rewritten})` : ''}`);
})();
