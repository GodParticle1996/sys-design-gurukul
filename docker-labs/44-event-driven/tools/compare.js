const { call, sleep } = require('../lib/http');
const base = 'http://localhost:';
const broker = base + '5400', app = base + '5401';
const workers = [base + '5402', base + '5403'];
async function until(fn) {
  const end = Date.now() + 5000;
  while (!(await fn())) {
    if (Date.now() > end) throw Error('wait timed out');
    await sleep(10);
  }
}
async function reset() {
  for (const w of workers) await call(w, '/config', { poll: false });
  await call(broker, '/reset', {}); await call(app, '/reset', {});
  for (const w of workers) await call(w, '/reset', {});
  await call(workers[0], '/config', { online: true, delayMs: 40 });
  await call(workers[1], '/config', { online: false, delayMs: 200 });
}
(async () => {
  for (const mode of ['direct', 'events']) {
    await reset();
    if (mode === 'events') for (const w of workers) await call(w, '/config', { poll: true });
    const times = [], codes = [];
    for (let id = 1; id <= 4; id++) {
      const t = performance.now();
      const r = await fetch(app + '/orders', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, mode }), signal: AbortSignal.timeout(5000),
      });
      await r.json(); codes.push(r.status); times.push(performance.now() - t);
    }
    if (mode === 'events') await until(async () => (await call(workers[0], '/state')).done.length === 4);
    const a = await call(app, '/state'), k = await call(workers[0], '/state');
    const n = await call(workers[1], '/state'), pending = await call(broker, '/state');
    times.sort((a,b) => a-b);
    console.log(`${mode}: HTTP ${codes.join('/')} · median ${Math.round((times[1]+times[2])/2)} ms`);
    console.log(`  saved ${a.saved} · kitchen ${k.done.length} · notify ${n.done.length} · notify pending ${pending.notify}`);
    if (mode === 'events') {
      await call(workers[1], '/config', { online: true });
      await until(async () => (await call(workers[1], '/state')).done.length === 4);
      console.log(`  notify wapas: ${(await call(workers[1], '/state')).done.length} · pending ${(await call(broker, '/state')).notify}`);
    }
  }
  for (const w of workers) await call(w, '/config', { poll: false });
})().catch(e => { console.error(e); process.exitCode=1; });
