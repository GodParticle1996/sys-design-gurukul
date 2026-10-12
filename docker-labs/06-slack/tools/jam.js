/* Slow DB + tez jobs → jam. Phir DB theek karke dekho drain hota hai ya nahi. */
const http = require('http');
const { get, post, sleep } = require('../lib/util');
const a = require('./args')();
const RPS = +(a.rps || 400), FOR = +(a.for || 30), SLOW = +(a['slow-db'] || 6);
const base = 'http://localhost:' + (process.env.PORT || 4608);
const agent = new http.Agent({ keepAlive: true, maxSockets: 64 });
const hit = () => new Promise(r => { const q = http.request({ host: 'localhost', port: +(process.env.PORT || 4608), path: '/job', method: 'POST', agent }, res => { res.resume(); res.on('end', r); }); q.on('error', r); q.end(); });

(async () => {
  await post(base + '/db/slow/' + SLOW, {});
  const drainRates = [];
  let prevDone = (await get(base + '/stats')).done;
  const t0 = Date.now();
  for (let sec = 0; sec < FOR; sec++) {
    const batch = [];
    for (let i = 0; i < RPS; i++) batch.push(hit());
    await Promise.all(batch);
    await sleep(Math.max(0, 1000 - ((Date.now() - t0) - sec * 1000)));
    const s = await get(base + '/stats');
    drainRates.push(s.done - prevDone); prevDone = s.done;
  }
  const s = await get(base + '/stats');
  const first = drainRates.slice(0, 3).reduce((x, y) => x + y, 0) / 3, last = drainRates.slice(-3).reduce((x, y) => x + y, 0) / 3;
  console.log(`${s.durable ? 'DURABLE=1' : 'in-memory'}   accepted: ${s.accepted.toLocaleString('en-IN')}   REJECTED: ${s.rejected.toLocaleString('en-IN')}   ` +
    `memory queue: ${s.queue.toLocaleString('en-IN')}/${s.memLimit.toLocaleString('en-IN')}` + (s.durable ? `   log backlog (disk): ${s.logBacklog.toLocaleString('en-IN')}` : ''));
  console.log(`   drain rate: ${Math.round(first)}/s shuru mein → ${Math.round(last)}/s aakhir mein` + (s.jammedPops ? `   jammed pops: ${s.jammedPops.toLocaleString('en-IN')} (nikaalne ki jagah nahi)  ❌ dono taraf se jam` : ''));
  /* DB theek karo, dekho backlog khali hota hai ya nahi */
  await post(base + '/db/slow/1', {});
  const t1 = Date.now();
  let st = await get(base + '/stats');
  while ((st.queue + st.logBacklog) > 0 && Date.now() - t1 < 60000) { await sleep(500); st = await get(base + '/stats'); }
  console.log(`   DB theek hone ke baad: backlog ${st.queue + st.logBacklog === 0 ? 'khaali in ' + ((Date.now() - t1) / 1000).toFixed(0) + ' s' : 'abhi bhi ' + (st.queue + st.logBacklog) + ' (60 s baad)'}`);
})();
