/* Asli sach — products ki price. Har read 30 ms (stampede test mein 400 ms: product page + reviews ka bhaari query). Har write change log mein (CDC ke liye, jaise binlog/WAL). */
const { serve, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 5111;
const data = new Map([['iphone', 79999], ['pixel', 64999], ['oneplus', 42999]]);
const log = []; let reads = 0, readMs = 30, peak = 0, active = 0;
serve(PORT, {
  'GET /get/:k': async (req, res, url, p) => { reads++; active++; peak = Math.max(peak, active); await sleep(readMs); active--; return { k: p.k, v: data.get(p.k), at: Date.now() }; },
  'POST /set': (req, res, url, p, b) => { data.set(b.k, b.v); log.push({ seq: log.length + 1, k: b.k, v: b.v, at: Date.now() }); return { ok: true, seq: log.length }; },
  'GET /changes': (req, res, url) => { const since = +(url.searchParams.get('since') || 0); return { changes: log.filter(c => c.seq > since) }; },
  'GET /stats': () => ({ reads, peakConcurrent: peak }),
  'POST /reset': (req, res, url, p, b) => { reads = 0; peak = 0; if (b && b.readMs) readMs = +b.readMs; return { ok: true, readMs }; },
}, () => console.log(`[db] :${PORT}`));
