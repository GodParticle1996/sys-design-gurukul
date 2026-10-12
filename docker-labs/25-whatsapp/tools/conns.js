/* 20,000 idle connections ek event loop par (phone app khula hai, par kuch bhej nahi raha). Kitni RAM?
   node tools/conns.js [--conns 20000] */
const net = require('net');
const args = require('./args')();
const { get, sleep, host } = require('../lib/util');
const H = host('chat1'), N = +(args.conns || 20000), BATCH = 500;
(async () => {
  const before = await get(`http://${H}:5111/stats`);
  const socks = [], t0 = Date.now();
  for (let i = 0; i < N; i += BATCH) {
    await Promise.all(Array.from({ length: Math.min(BATCH, N - i) }, () => new Promise(r => {
      const s = net.connect(5011, H, r); s.on('error', r); socks.push(s);
    })));
    if ((i + BATCH) % 5000 === 0) { await sleep(200); const st = await get(`http://${H}:5111/stats`); console.log(`  ${String(st.conns).padStart(6)} connections → server RSS ${st.rssMB} MB`); }
  }
  await sleep(800);
  const after = await get(`http://${H}:5111/stats`);
  console.log(`\n${after.conns} idle connections, ek process, ek event loop:`);
  console.log(`  server RSS ${before.rssMB} MB → ${after.rssMB} MB  = ${((after.rssMB - before.rssMB) * 1024 / after.conns).toFixed(1)} KB per connection   (jodne mein ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  socks.forEach(s => s.destroy());
  process.exit(0);
})();
