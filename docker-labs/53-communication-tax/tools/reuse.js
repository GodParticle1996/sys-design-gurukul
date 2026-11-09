'use strict';
// ex1-reuse: real HTTP. New connection per request vs keep-alive vs HTTP/2 — on loopback, then through a delay proxy.
const http = require('node:http');
const http2 = require('node:http2');
const net = require('node:net');
const path = require('node:path');
const { fork } = require('node:child_process');
const { delayProxy } = require('../lib/delay');

const H1 = 6301, H2 = 6302, P1 = 6311, P2 = 6312, RTT = Number(process.env.RTT_MS || 20);
const SEQ = 2000, BURST = 50, ROUNDS = 3, WARM = 300;

function get1(port, p, agent) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: p, agent, headers: agent === false ? { connection: 'close' } : {} }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', d => { body += d; });
      res.on('end', () => res.statusCode === 200 ? resolve(body) : reject(new Error(`HTTP ${res.statusCode}`)));
    });
    req.on('error', reject);
  });
}
function get2(session, p) {
  return new Promise((resolve, reject) => {
    const s = session.request({ ':path': p });
    let body = '', status = 0;
    s.setEncoding('utf8');
    s.on('response', h => { status = h[':status']; });
    s.on('data', d => { body += d; });
    s.on('end', () => status === 200 ? resolve(body) : reject(new Error(`HTTP/2 ${status}`)));
    s.on('error', reject);
  });
}
const h2connect = port => new Promise((resolve, reject) => {
  const s = http2.connect(`http://127.0.0.1:${port}`);
  s.once('connect', () => resolve(s));
  s.once('error', reject);
});
const stats = async () => JSON.parse(await get1(H1, '/stats', false));
const ms = t0 => Number(process.hrtime.bigint() - t0) / 1e6;

async function measure(label, run) {
  await get1(H1, '/reset', false);
  const cpu0 = process.cpuUsage(), t0 = process.hrtime.bigint();
  await run();
  const wall = ms(t0), cpu = process.cpuUsage(cpu0), s = await stats();
  return { label, wall, conns: s.connections - 1, cliUser: cpu.user / 1000, cliSys: cpu.system / 1000, srvUser: s.userMs, srvSys: s.systemMs };
}

(async () => {
  const server = fork(path.join(__dirname, '../services/server.js'), [String(H1), String(H2)]);
  await new Promise((resolve, reject) => { server.once('message', resolve); server.once('error', reject); server.once('exit', c => reject(new Error('server exited ' + c))); });
  try {
    console.log(`REAL RUN: Node ${process.version}; server is a separate process on 127.0.0.1; timings change run to run`);
    console.log('');
    console.log(`A) loopback, ${SEQ} requests one after another (GET /order/:id, small JSON)`);
    console.log('   conns = TCP connections the server saw (HTTP/2: sessions); CPU in ms, user + kernel (system)');
    console.log(`   every way warmed up first (${WARM} untimed requests); then ${ROUNDS} rounds in rotating order; each column = median`);
    // Each way opens its own connection(s) inside the timed run, as a cold client would.
    const ways = [
      ['new connection each', async n => { for (let i = 0; i < n; i++) await get1(H1, `/order/${i}`, false); }],
      ['keep-alive (1 socket)', async n => {
        const keep = new http.Agent({ keepAlive: true, maxSockets: 1 });
        for (let i = 0; i < n; i++) await get1(H1, `/order/${i}`, keep);
        keep.destroy();
      }],
      ['HTTP/2 (1 connection)', async n => {
        const s = await h2connect(H2);
        for (let i = 0; i < n; i++) await get2(s, `/order/${i}`);
        s.close();
      }],
    ];
    for (const [, run] of ways) await run(WARM);          // untimed warm-up of every request path (JIT, server code)
    const runs = {};
    for (let r = 0; r < ROUNDS; r++) {
      for (let i = 0; i < ways.length; i++) {
        const [label, run] = ways[(i + r) % ways.length];  // rotate the order each round
        (runs[label] ||= []).push(await measure(label, () => run(SEQ)));
      }
    }
    const med = xs => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
    const a = ways.map(([label]) => {
      const rs = runs[label], col = k => med(rs.map(r => r[k]));
      return { label, wall: col('wall'), conns: col('conns'), cliUser: col('cliUser'), cliSys: col('cliSys'), srvUser: col('srvUser'), srvSys: col('srvSys') };
    });
    console.log('   way                     wall      conns   client user+kernel   server user+kernel');
    for (const r of a) {
      console.log(`   ${r.label.padEnd(22)}  ${(r.wall.toFixed(0) + ' ms').padStart(8)}  ${String(r.conns).padStart(5)}   ` +
        `${(r.cliUser.toFixed(0) + ' + ' + r.cliSys.toFixed(0) + ' ms').padStart(18)}   ${(r.srvUser.toFixed(0) + ' + ' + r.srvSys.toFixed(0) + ' ms').padStart(18)}`);
    }

    console.log('');
    console.log(`B) through a delay proxy: RTT ${RTT} ms; MODEL: TCP handshake = 1 extra RTT counted from accept (bytes sent at once wait for it); TLS not modelled`);
    console.log(`   ${BURST} requests needed at the same moment; "warm" = the connection was opened before the clock started`);
    console.log(`   an untimed burst of ${BURST} connects to each proxy runs first (warm-up)`);
    const p1 = await delayProxy({ listenPort: P1, targetPort: H1, rttMs: RTT });
    const p2 = await delayProxy({ listenPort: P2, targetPort: H2, rttMs: RTT });
    // Warm-up, not timed: on this machine the first burst of parallel connects to a fresh listener was ~30 ms slower.
    const burst = port => Promise.all(Array.from({ length: BURST }, () => new Promise(r => {
      const s = net.connect(port, '127.0.0.1', () => { s.destroy(); r(); });
      s.on('error', r);
    })));
    await burst(P1); await burst(P2);
    await new Promise(r => setTimeout(r, 3 * RTT));
    const b = [];
    const timeBurst = async (label, prep, fire) => {
      const ctx = await prep();
      const before = p1.connections() + p2.connections();
      const t0 = process.hrtime.bigint();
      await fire(ctx);
      b.push({ label, wall: ms(t0), conns: p1.connections() + p2.connections() - before });
      if (ctx && ctx.done) await ctx.done();
    };
    await timeBurst('HTTP/1.1, 1 warm socket', async () => {
      const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
      await get1(P1, '/order/0', agent);
      return { agent, done: async () => agent.destroy() };
    }, ({ agent }) => Promise.all(Array.from({ length: BURST }, (_, i) => get1(P1, `/order/${i}`, agent))));
    await timeBurst(`HTTP/1.1, ${BURST} new sockets`, async () => null,
      () => Promise.all(Array.from({ length: BURST }, (_, i) => get1(P1, `/order/${i}`, false))));
    await timeBurst('HTTP/2, 1 cold connection', async () => null, async () => {
      const s = await h2connect(P2);
      await Promise.all(Array.from({ length: BURST }, (_, i) => get2(s, `/order/${i}`)));
      s.close();
    });
    await timeBurst('HTTP/2, 1 warm connection', async () => {
      const s = await h2connect(P2);
      await get2(s, '/order/0');
      return { s, done: async () => s.close() };
    }, ({ s }) => Promise.all(Array.from({ length: BURST }, (_, i) => get2(s, `/order/${i}`))));
    console.log('   way                          wall      new connections');
    for (const r of b) console.log(`   ${r.label.padEnd(27)}  ${(r.wall.toFixed(0) + ' ms').padStart(8)}  ${String(r.conns).padStart(5)}`);
    await p1.close(); await p2.close();
  } finally {
    server.kill('SIGTERM');
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
