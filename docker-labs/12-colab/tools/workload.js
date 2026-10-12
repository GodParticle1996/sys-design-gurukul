#!/usr/bin/env node
/* Do tarah ka kaam, do tarah se:
     --kind compute : 200x200 matrix multiply × N — hot loop mein ek bhi syscall nahi (Colab ka ML kaam)
     --kind io      : chhoti files likho-padho-hatao — har kadam ek syscall (database / log server jaisa)
     --mode direct  : seedha OS (container jaisa)
     --mode sentry  : har file op sentry ke through (gVisor jaisa)                                         */
const fs = require('fs');
const path = require('path');
const args = require('./args')();
const kind = args.kind || 'compute', mode = args.mode || 'direct';
const net = require('net');
let sock = null, pending = null, buf = '';
function connect() {
  return new Promise((res, rej) => {
    sock = net.connect(4811, process.env.SENTRY_HOST || 'localhost', res);
    sock.setNoDelay(true);
    sock.on('error', rej);
    sock.on('data', d => { buf += d; const i = buf.indexOf('\n'); if (i >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); const p = pending; pending = null; p(JSON.parse(line)); } });
  });
}
const DATA = path.resolve(__dirname, '..', 'data');

async function sys(op, p, data) {
  if (mode === 'direct') {
    const full = path.join(DATA, p);
    if (op === 'write') return fs.writeFileSync(full, data);
    if (op === 'read') return fs.readFileSync(full, 'utf8');
    if (op === 'unlink') return fs.unlinkSync(full);
  }
  return new Promise(res => { pending = res; sock.write(JSON.stringify({ op, path: p, data }) + '\n'); });
}

function matmul(n) {
  const a = new Float64Array(n * n).fill(1.0001), b = new Float64Array(n * n).fill(0.9999), c = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const x = a[i * n + k]; for (let j = 0; j < n; j++) c[i * n + j] += x * b[k * n + j]; }
  return c[0];
}

(async () => {
  if (mode === 'sentry') await connect();
  matmul(50);                                   // JIT garam karo, taaki dono modes barabar shuru hon
  const t0 = process.hrtime.bigint();
  let ops = 0;
  if (kind === 'compute') {
    for (let r = 0; r < 40; r++) { matmul(200); if (r % 10 === 9) { await sys('write', 'ckpt.txt', 'round ' + r); ops++; } }
  } else {
    for (let i = 0; i < 2000; i++) { await sys('write', `f${i % 50}.txt`, 'x'.repeat(200)); await sys('read', `f${i % 50}.txt`); ops += 2; }
    for (let i = 0; i < 50; i++) { await sys('unlink', `f${i}.txt`); ops++; }
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`kind=${kind.padEnd(7)} mode=${mode.padEnd(6)} syscalls=${String(ops).padStart(4)}  time=${ms.toFixed(0).padStart(5)} ms`);
  if (sock) sock.end();
})().catch(e => { console.error('sentry chal raha hai? npm start ex1-syscall-tax —', e.message); process.exit(1); });
