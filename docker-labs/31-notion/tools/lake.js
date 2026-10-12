/* Analytics team ka bada query: primary DB par chalao ya CDC se bani data lake copy par?
   Beech mein users pages khol rahe hain (live reads). Live read ka p99 dekho.  node tools/lake.js */
const http = require('http');
const { post, host, pct, sleep } = require('../lib/util');
const P = { h: host('primary'), p: 5092 }, L = { h: host('lake'), p: 5093 };
const agent = new http.Agent({ keepAlive: true, maxSockets: 20 });
const read = () => new Promise(res => { const t = Date.now(); http.get({ host: P.h, port: P.p, path: '/read', agent }, r => { r.resume(); r.on('end', () => res(Date.now() - t)); }).on('error', () => res(null)); });
async function phase(name, scanTarget) {
  const lat = []; let run = true;
  const scan = scanTarget ? post(`http://${scanTarget.h}:${scanTarget.p}/scan`).then(r => { run = false; return r; }) : sleep(3000).then(() => { run = false; });
  const readers = Array.from({ length: 10 }, async () => { while (run) { const ms = await read(); if (ms != null) lat.push(ms); await sleep(5); } });
  await Promise.all([scan, ...readers]);
  console.log(`${name.padEnd(34)} live reads ${String(lat.length).padStart(5)}   p50 ${String(pct(lat, 50)).padStart(3)} ms   p99 ${String(pct(lat, 99)).padStart(4)} ms`);
}
(async () => {
  await phase('koi analytics nahi', null);
  await phase('analytics scan PRIMARY par', P);
  await phase('analytics scan LAKE (CDC copy) par', L);
  console.log('\nPrimary par scan: users ke page loads us CPU ke liye line mein. Lake par: primary ko pata bhi nahi chala.');
  console.log('Notion ne yahi kiya — Postgres → CDC (Debezium/Kafka) → data lake; analytics wahan, live traffic primary par.');
})();
