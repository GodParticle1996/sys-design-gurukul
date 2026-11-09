'use strict';
// ex4-lb: REAL processes on loopback. Two backends (A on 6521, B on 6522), an L4 proxy (6523) and an L7 proxy (6524).
// The client sends requests one after another, each to /api/… or /img/… by a seeded coin toss (so the path cannot line
// up with the L4 proxy's round robin); it reports latency, which backend
// answered, and the proxy process's own CPU time.
const http = require('node:http');
const path = require('node:path');
const { fork } = require('node:child_process');
const { percentile } = require('../lib/stats');
const { rng } = require('../lib/dns');

const N = 4000, WARM = 300, ROUNDS = 3, A = 6521, B = 6522, L4 = 6523, L7 = 6524;
const svc = path.join(__dirname, '../services/lb.js');
const procs = [];                            // every child, tracked at once, so a failed start still cleans up all
const start = argv => new Promise((resolve, reject) => {
  const p = fork(svc, argv);
  procs.push(p);
  const timer = setTimeout(() => reject(new Error(argv.join(' ') + ': no ready in 5 s')), 5000);
  p.once('message', m => { clearTimeout(timer); m === 'ready' ? resolve(p) : reject(new Error('bad start')); });
  p.once('error', e => { clearTimeout(timer); reject(e); });
  p.once('exit', c => { clearTimeout(timer); reject(new Error(argv.join(' ') + ' exited ' + c)); });
});
const cpu = p => new Promise(r => { p.once('message', m => r(m.cpu)); p.send({ cmd: 'cpu' }); });
const get = (port, p, agent) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path: p, agent }, res => {
    let b = ''; res.setEncoding('utf8'); res.on('data', d => { b += d; });
    res.on('end', () => res.statusCode === 200 ? resolve(JSON.parse(b)) : reject(new Error('HTTP ' + res.statusCode)));
  }).on('error', reject);
});
const med = xs => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];

async function measure(port, proxy, keepAlive) {
  const agent = keepAlive ? new http.Agent({ keepAlive: true, maxSockets: 1 }) : false;
  const times = [], hits = { A: { api: 0, img: 0 }, B: { api: 0, img: 0 } }, coin = rng(54);
  const c0 = proxy ? await cpu(proxy) : 0;
  for (let i = 0; i < N; i++) {
    const kind = coin() < 0.5 ? 'img' : 'api';
    const t0 = process.hrtime.bigint();
    const r = await get(port, `/${kind}/${i}`, agent);
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    hits[r.backend][kind]++;
  }
  const c1 = proxy ? await cpu(proxy) : 0;
  if (agent) agent.destroy();
  return { p50: percentile(times, 50), p99: percentile(times, 99), cpu: c1 - c0, hits };
}

(async () => {
  try {
    await start(['backend', 'A', String(A)]); await start(['backend', 'B', String(B)]);
    const l4 = await start(['l4', String(L4), String(A), String(B)]);
    const l7 = await start(['l7', String(L7), String(A), String(B)]);
    console.log(`REAL RUN: Node ${process.version}; separate processes on 127.0.0.1; ${N.toLocaleString('en-IN')} requests one after another, each /api or /img by a seeded coin toss`);
    console.log(`L4 = TCP proxy, picks a backend per connection (round robin), never reads HTTP; L7 = HTTP proxy, routes each request by path`);
    console.log(`every way warmed up (${WARM} untimed requests), then ${ROUNDS} rounds in rotating order; numbers = median of the rounds`);
    const ways = [['direct to backend A', A, null], ['through L4 proxy', L4, l4], ['through L7 proxy', L7, l7]];
    for (const keep of [true, false]) {
      console.log('');
      console.log(keep ? 'A) client keeps ONE connection open (keep-alive)' : 'B) client opens a NEW connection per request');
      console.log('   way                    p50       p99    proxy CPU / 1,000 req    /api went to     /img went to');
      for (const [, port] of ways) for (let i = 0; i < WARM; i++) await get(port, `/${i % 2 ? 'img' : 'api'}/w`, false);
      const runs = new Map(ways.map(w => [w[0], []]));
      for (let r = 0; r < ROUNDS; r++) for (let i = 0; i < ways.length; i++) {
        const [label, port, proxy] = ways[(i + r) % ways.length];
        runs.get(label).push(await measure(port, proxy, keep));
      }
      for (const [label] of ways) {
        const rs = runs.get(label), last = rs[rs.length - 1];
        const share = k => { const n = last.hits.A[k] + last.hits.B[k]; return `A ${Math.round(last.hits.A[k] / n * 100)}% · B ${Math.round(last.hits.B[k] / n * 100)}%`; };
        const c = label.startsWith('direct') ? '—' : (med(rs.map(x => x.cpu)) / N * 1000).toFixed(0) + ' ms';
        console.log(`   ${label.padEnd(20)} ${(med(rs.map(x => x.p50)).toFixed(2) + ' ms').padStart(9)} ${(med(rs.map(x => x.p99)).toFixed(2) + ' ms').padStart(9)}    ${c.padStart(13)}            ${share('api').padEnd(15)}  ${share('img')}`);
      }
    }
  } finally { for (const p of procs) p.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
