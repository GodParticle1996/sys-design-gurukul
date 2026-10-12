/* Origin tak connections: har worker ka apna pool vs ek shared pool */
const http = require('http');
const { get, post } = require('../lib/util');
const a = require('./args')();
const WORKERS = +(a.workers || 4), REQUESTS = +(a.requests || 2000);
const ORIGIN = +(process.env.ORIGIN_PORT || 4231);

async function run(mode) {
  await fetch(`http://localhost:${ORIGIN}/reset`);
  const PER = +(process.env.SOCKETS || 8);
  const agents = mode === 'shared'
    ? [new http.Agent({ keepAlive: true, maxSockets: PER })]                       /* ek hi pool, sab threads use karte hain */
    : Array.from({ length: WORKERS }, () => new http.Agent({ keepAlive: true, maxSockets: PER }));  /* har worker ka apna pool */
  const hit = i => new Promise(resolve => {
    const agent = agents[i % agents.length];
    const req = http.get({ host: 'localhost', port: ORIGIN, path: '/api', agent }, res => { res.resume(); res.on('end', resolve); });
    req.on('error', resolve);
  });
  /* concurrency ke saath — tabhi pools ka farq dikhta hai */
  const batch = 32;
  for (let i = 0; i < REQUESTS; i += batch) {
    await Promise.all(Array.from({ length: Math.min(batch, REQUESTS - i) }, (_, j) => hit(i + j)));
  }
  const s = await get(`http://localhost:${ORIGIN}/stats`);
  console.log(`${mode === 'shared' ? 'shared pool     ' : 'per-worker pools'} → tcp connects: ${s.connects}   handshake time: ${s.handshakeMs} ms   requests: ${s.requests}   reused: ${s.requests - s.connects}`);
}
(async () => { await run('per-worker'); await run('shared'); })();
