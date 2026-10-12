/* 1,500 volumes, 3 AZs (A, B, C — har ek mein 500). Normal din: har volume har 2 sec ek query (attach, snapshot, describe)
   → 750 queries/sec, DB capacity ~1,200/sec (62% busy).
   t=3 sec: AZ-A mein network change → 300 volumes ke replicas chhoot gaye → RE-MIRROR: naya replica dhoondho.
   Re-mirror = "naye replica ke liye jagah do" query. AZ-A mein sirf 30 nayi jagah/sec → baaki ko "jagah nahi" →
   20 ms baad phir try (jaise EBS 2011 mein — sab volumes ek saath jagah dhoondh rahe the, aur har try DB par ek query).
   node tools/remirror.js --mode shared|cells   (bina flag: dono) */
const http = require('http');
const args = require('./args')();
const { post, sleep, host } = require('../lib/util');
const M = host('meta'), agent = new http.Agent({ keepAlive: true, maxSockets: 400 });
const q = (vol, kind) => new Promise(resolve => {
  const rq = http.get({ host: M, port: 4951, path: '/q?vol=' + vol + (kind ? '&kind=' + kind : ''), agent }, r => {
    let b = ''; r.on('data', d => (b += d)); r.on('end', () => { let j = {}; try { j = JSON.parse(b); } catch (e) {} resolve(r.statusCode === 200 ? (kind ? !!j.placed : true) : false); });
  });
  rq.on('error', () => resolve(false));
});
async function day(mode) {
  await post(`http://${M}:4951/mode`, { mode });
  const per = { A: [], B: [], C: [] }, done = [], t0 = Date.now(); let running = true, sec = 0;
  const bucket = () => ({ ok: 0, all: 0 });
  const secs = []; for (let s = 0; s < 16; s++) secs.push({ A: bucket(), B: bucket(), C: bucket(), remirrorDone: 0 });
  const az = v => 'ABC'[v % 3];
  for (let v = 0; v < 1500; v++) (async () => {                           // normal traffic: har volume har 2 sec
    await sleep(Math.random() * 2000);
    while (running) {
      const s = Math.floor((Date.now() - t0) / 1000); const ok = await q(v);
      if (secs[s]) { secs[s][az(v)].all++; if (ok) secs[s][az(v)].ok++; }
      await sleep(2000);
    }
  })();
  await sleep(3000);
  const storm = []; for (let v = 0; v < 1500 && storm.length < 300; v++) if (az(v) === 'A' && Math.random() < 0.7) storm.push(v);
  let doneCount = 0; const doneAt = [];
  storm.forEach(v => (async () => {
    let placed = false;
    while (running && !placed) { if (await q(v, 'remirror')) placed = true; else await sleep(20); }
    if (placed) { doneCount++; doneAt.push(Date.now() - t0 - 3000); const s = Math.floor((Date.now() - t0) / 1000); if (secs[s]) secs[s].remirrorDone++; }
  })());
  await sleep(13000); running = false; await sleep(600);
  const pct = b => b.all ? Math.round(100 * b.ok / b.all) + '%' : '-';
  console.log(`\nmode=${mode}   (normal queries safal % per AZ, har second)`);
  console.log(' sec   AZ-A   AZ-B   AZ-C   re-mirror poore');
  secs.forEach((s, i) => console.log(`${String(i + 1).padStart(4)}   ${pct(s.A).padStart(4)}   ${pct(s.B).padStart(4)}   ${pct(s.C).padStart(4)}   ${String(s.remirrorDone).padStart(3)}${i === 3 ? '   ← storm (t=3)' : ''}`));
  doneAt.sort((a, b) => a - b);
  const sum = k => secs.slice(3, 13).reduce((a, s) => ({ ok: a.ok + s[k].ok, all: a.all + s[k].all }), { ok: 0, all: 0 });
  console.log(`storm ke dauraan (sec 4–13): AZ-A ${pct(sum('A'))}, AZ-B ${pct(sum('B'))}, AZ-C ${pct(sum('C'))}  |  re-mirror ${doneCount}/${storm.length} poore, aakhri ${doneAt.length ? (doneAt[doneAt.length - 1] / 1000).toFixed(1) + ' s' : '-'} mein`);
}
(async () => { for (const m of args.mode ? [args.mode] : ['shared', 'cells']) await day(m); })();
