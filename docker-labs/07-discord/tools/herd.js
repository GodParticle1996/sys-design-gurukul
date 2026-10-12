/* Ek viral channel par N clients ek saath. ROUTE=random|hash (kaunsa data-service instance), retries timeout par. */
const { get, post, pct } = require('../lib/util');
const a = require('./args')();
const N = +(a.clients || 3000), RETRIES = +(a.retries || 0), TIMEOUT = +(a.timeout || 1500);
const ROUTE = process.env.ROUTE || 'random';
const ports = [4711, 4712, 4713];
const h = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };

async function attempt(channel) {
  const port = ROUTE === 'hash' ? ports[h(channel) % 3] : ports[Math.floor(Math.random() * 3)];
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try { const r = await fetch(`http://localhost:${port}/channel/${channel}`, { signal: ctl.signal }); return r.ok; }
  catch (e) { return false; } finally { clearTimeout(t); }
}
(async () => {
  await post('http://localhost:4714/reset', {});
  for (const p of ports) await post(`http://localhost:${p}/reset`, {});
  const times = []; let failed = 0;
  await Promise.all(Array.from({ length: N }, async () => {
    const t = Date.now();
    let ok = false;
    for (let i = 0; i <= RETRIES && !ok; i++) ok = await attempt('7');
    if (!ok) failed++;
    times.push(Date.now() - t);
  }));
  const part = await get('http://localhost:4714/stats');
  let merged = 0; const coalesce = (await get('http://localhost:4711/stats'));
  for (const p of ports) merged += (await get(`http://localhost:${p}/stats`)).merged;
  console.log(`ROUTE=${ROUTE.padEnd(6)} COALESCE=${merged > 0 ? 1 : (process.env.COALESCE || '?')}   retries: ${RETRIES}   db queries: ${part.queries.toLocaleString('en-IN')}   ` +
    `p99: ${pct(times, 99)} ms   failed: ${failed}   merged in data-service: ${merged.toLocaleString('en-IN')}`);
})();
