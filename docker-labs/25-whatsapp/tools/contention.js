/* Asli threads, asli shared memory. Har operation = "is user ka session table update karo".
   one-lock    → poori table par EK taala (jaise ek global Mnesia/ETS lock)
   partitioned → 256 taale, user ke hisaab se (WhatsApp ne FreeBSD/Erlang mein aise hi hot locks tode the)
   node tools/contention.js [--ms 1500] */
const { Worker, isMainThread, workerData, parentPort } = require('worker_threads');
const args = isMainThread ? require('./args')() : {};
const KEYS = 4096, LOCKS_P = 256, PAD = 16;                     // har taala apni 64-byte cache line par
if (!isMainThread) {
  const { sab, locks, ms, id } = workerData;
  const L = new Int32Array(sab, 0, LOCKS_P * PAD), T = new Int32Array(sab, LOCKS_P * PAD * 4, KEYS * PAD);
  const lock = i => { while (Atomics.compareExchange(L, i, 0, 1) !== 0) { /* spin — taala khulne tak ghoomte raho */ } };
  const unlock = i => Atomics.store(L, i, 0);
  let x = (id + 1) * 2654435761 >>> 0, ops = 0; const end = Date.now() + ms;
  while (Date.now() < end) {
    for (let k = 0; k < 200; k++) {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
      const key = x % KEYS, li = (locks === 1 ? 0 : key % LOCKS_P) * PAD;
      lock(li);
      let v = T[key * PAD]; for (let j = 0; j < 400; j++) v = (v * 31 + j) | 0;   // session update ka kaam — taale ke andar
      T[key * PAD] = v + 1; unlock(li); ops++;
    }
  }
  parentPort.postMessage(ops);
} else {
  const ms = +(args.ms || 1500);
  const run = (threads, locks) => new Promise(resolve => {
    const sab = new SharedArrayBuffer((LOCKS_P + KEYS) * PAD * 4); let total = 0, done = 0;
    for (let i = 0; i < threads; i++) {
      const w = new Worker(__filename, { workerData: { sab, locks, ms, id: i } });
      w.on('message', n => { total += n; if (++done === threads) resolve(total / (ms / 1000)); });
    }
  });
  (async () => {
    console.log(`CPU cores: ${require('os').cpus().length}\n`);
    console.log('threads   one-lock ops/sec     partitioned (256 locks) ops/sec');
    const base = {};
    for (const t of [1, 2, 4, 8]) {
      const one = await run(t, 1), part = await run(t, LOCKS_P);
      if (t === 1) { base.one = one; base.part = part; }
      console.log(`${String(t).padStart(5)}    ${(one / 1e6).toFixed(2).padStart(6)} M  (${(one / base.one).toFixed(1)}x)        ${(part / 1e6).toFixed(2).padStart(6)} M  (${(part / base.part).toFixed(1)}x)`);
    }
    console.log('\nEk taala: threads badhao, kaam nahi badhta — sab ek hi darwaaze par line mein.');
    console.log('Taale baanto: har thread apne hisse ke taale leta hai → cores sach mein kaam aate hain.');
  })();
}
