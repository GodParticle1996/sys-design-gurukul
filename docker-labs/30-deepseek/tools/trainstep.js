/* Ek training step = 8 micro-batches. Har micro-batch: compute (asli CPU, alag thread mein) → gradients dusre GPU ko bhejo.
   BF16 = 2 bytes per number, FP8 = 1 byte. Gradient chunk: 16 MB (BF16) / 8 MB (FP8).
   sequential: compute → bhejo → ACK ka intezaar → agla compute.
   overlapped: micro i bhej rahe ho TAB micro i+1 compute ho raha hai (DeepSeek ka "chips kabhi khaali nahi").
   node tools/trainstep.js */
const net = require('net');
const { Worker } = require('worker_threads');
const { host } = require('../lib/util');
const MICRO = 8, COMPUTE_MS = 60;
const worker = new Worker(`
  const { parentPort } = require('worker_threads');
  parentPort.on('message', ms => { const end = process.hrtime.bigint() + BigInt(ms * 1e6); let x = 0; while (process.hrtime.bigint() < end) x += Math.sqrt(x + 1); parentPort.postMessage(x); });
`, { eval: true });
const compute = () => new Promise(r => { worker.once('message', r); worker.postMessage(COMPUTE_MS); });
function link() {
  return new Promise(resolve => {
    const s = net.connect(5081, host('peer'), () => resolve(s)); s.setNoDelay(true); s.waiters = []; let buf = '';
    s.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { buf = buf.slice(i + 1); const w = s.waiters.shift(); if (w) w(); } });
  });
}
const send = (s, bytes) => new Promise(r => { s.waiters.push(r); const h = Buffer.alloc(4); h.writeUInt32BE(bytes.length); s.write(h); s.write(bytes); });
(async () => {
  const s = await link();
  const grads = { BF16: Buffer.alloc(16 * 1048576, 1), FP8: Buffer.alloc(8 * 1048576, 1) };
  console.log(`8 micro-batches, compute ${COMPUTE_MS} ms each, link ~200 MB/s (throttled)\n`);
  console.log('precision  schedule      step time    GPU compute ka hissa');
  for (const prec of ['BF16', 'FP8']) for (const mode of ['sequential', 'overlapped']) {
    const g = grads[prec], t0 = Date.now();
    if (mode === 'sequential') for (let i = 0; i < MICRO; i++) { await compute(); await send(s, g); }
    else { let inflight = Promise.resolve(); for (let i = 0; i < MICRO; i++) { await compute(); await inflight; inflight = send(s, g); } await inflight; }
    const ms = Date.now() - t0;
    console.log(`${prec.padEnd(10)} ${mode.padEnd(12)} ${String(ms).padStart(6)} ms    ${Math.round(100 * MICRO * COMPUTE_MS / ms)}%`);
  }
  console.log('\nSequential: GPU gradients bhejte waqt khaali baitha rehta hai. Overlap: bhejna aur agla compute ek saath.');
  console.log('FP8: aadhe bytes → throttled link par aadha waqt. Dono milke: wahi hardware, step lagbhag aadha.');
  s.destroy(); worker.terminate();
})();
