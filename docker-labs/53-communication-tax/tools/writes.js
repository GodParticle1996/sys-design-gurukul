'use strict';
// ex3-writes: 8 MB over loopback TCP, sent three ways. Kernel (system) CPU time shows the per-call tax.
const net = require('node:net');

const TOTAL = 8 * 1024 * 1024, SMALL = 100, REPEAT = 3, PORT = 6321;
const payload = Buffer.alloc(TOTAL, 0x61);

function receiver() {
  return new Promise(resolve => {
    const server = net.createServer(sock => {
      let got = 0;
      sock.on('data', d => { got += d.length; if (got >= TOTAL) sock.end('ok'); });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

const write = (sock, buf) => new Promise((resolve, reject) => sock.write(buf, e => e ? reject(e) : resolve()));

async function send(mode) {
  const sock = net.connect(PORT, '127.0.0.1');
  sock.setNoDelay(true);
  await new Promise(r => sock.once('connect', r));
  const done = new Promise(r => sock.once('data', r));
  const cpu0 = process.cpuUsage(), t0 = process.hrtime.bigint();
  let calls = 0;
  if (mode === 'one') { await write(sock, payload); calls = 1; }
  else {
    for (let off = 0; off < TOTAL; off += SMALL) {
      const chunk = payload.subarray(off, Math.min(off + SMALL, TOTAL));
      calls++;
      if (mode === 'small-wait') await write(sock, chunk);
      else sock.write(chunk);
    }
  }
  await done;
  const wall = Number(process.hrtime.bigint() - t0) / 1e6, cpu = process.cpuUsage(cpu0);
  sock.destroy();
  return { wall, user: cpu.user / 1000, sys: cpu.system / 1000, calls };
}

(async () => {
  const server = await receiver();
  console.log(`REAL RUN: Node ${process.version}; 8 MB from one process to a receiver in the same process over loopback TCP`);
  console.log('client CPU = user + kernel (system) time of this whole process, so the receiver is included; median of 3 runs');
  console.log('');
  console.log('way                                  write() calls   wall      user + kernel CPU');
  const rows = [['100-byte writes, wait for each', 'small-wait'], ['100-byte writes, no waiting', 'small'], ['one 8 MB write', 'one']];
  for (const [label, mode] of rows) {
    await send(mode);                                    // warm-up, not counted
    const runs = [];
    for (let i = 0; i < REPEAT; i++) runs.push(await send(mode));
    runs.sort((a, b) => a.wall - b.wall);
    const r = runs[Math.floor(REPEAT / 2)];
    console.log(`${label.padEnd(35)}  ${String(r.calls).padStart(13)}  ${(r.wall.toFixed(1) + ' ms').padStart(8)}  ${(r.user.toFixed(0) + ' + ' + r.sys.toFixed(0) + ' ms').padStart(17)}`);
  }
  server.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
