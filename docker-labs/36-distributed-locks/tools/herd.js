/* 100 workers ek hi lock ka intezaar. Lock 100 baar haath badalta hai.
   all   → lock chhoota → SAB waiters jaagte hain, ek jeetta, 99 phir so jaate hain (thundering herd)
   queue → sirf line mein agla jaagta hai (ZooKeeper ke sequential nodes: har koi sirf apne se pehle wale ko dekhta hai)
   node tools/herd.js */
const { post, get, host } = require('../lib/util');
const L = `http://${host('lockd1')}:5151`;
async function worker(id, style, done) {
  for (;;) {
    const r = await post(L + '/acquire', { key: 'report-job', owner: 'w' + id, ttlMs: 5000 });
    if (r.ok) { await post(L + '/release', { key: 'report-job', owner: 'w' + id }); done.n++; return; }
    await post(L + '/wait', { key: 'report-job', style });
  }
}
(async () => {
  console.log('style    lock handoffs   total wake-ups   bekaar jaagna (jaage par lock nahi mila)');
  for (const style of ['all', 'queue']) {
    await post(L + '/reset');
    await post(L + '/acquire', { key: 'report-job', owner: 'boss', ttlMs: 5000 });       // pehle sab line mein lag jaayein
    const done = { n: 0 };
    const ws = Array.from({ length: 100 }, (_, i) => worker(i, style, done));
    await new Promise(r => setTimeout(r, 300));
    await post(L + '/release', { key: 'report-job', owner: 'boss' });
    await Promise.all(ws);
    const s = await get(L + '/stats');
    console.log(`${style.padEnd(8)} ${String(done.n).padStart(8)}        ${String(s.wakeups).padStart(8)}          ${s.wakeups - done.n}`);
  }
  console.log('\n"all": har release par poori bheed lock server par toot padti hai — N workers = ~N²/2 wake-ups.');
  console.log('"queue": har release par ek hi jaagta hai — N workers = N wake-ups.');
})();
