/* Hot key (iphone) ka cache TTL 2 sec. Steady traffic 300 req/sec (1.9 sec tak). Expire ke 50 ms baad 1,000 requests ek saath (sale shuru!).
   DB read = 400 ms (product page + reviews). Kitne DB reads, aur burst ka p99? node tools/stampede.js */
const http = require('http');
const { get, post, sleep, host, pct } = require('../lib/util');
const DB = `http://${host('db')}:5111`, C = `http://${host('cache')}:5112`, INV = `http://${host('invalidator')}:5115`;
const APPS = [[host('app1'), 5113], [host('app2'), 5114]];
const agent = new http.Agent({ keepAlive: true, maxSockets: 2000 });
const hit = i => new Promise(res => { const [h, p] = APPS[i % 2]; const t = Date.now(); http.get({ host: h, port: p, path: '/price/iphone', agent }, r => { r.resume(); r.on('end', () => res(Date.now() - t)); }).on('error', () => res(null)); });
(async () => {
  await post(INV + '/config', { enabled: false });
  console.log('strategy   DB reads (peak parallel)   burst p50   burst p99   burst mein stale jawab mile?');
  for (const s of ['none', 'mutex', 'swr', 'xfetch']) {
    for (const [h, p] of APPS) await post(`http://${h}:${p}/config`, { ttlMs: 2000, useL1: false, stampede: s, l1Pubsub: false });
    await post(C + '/flush'); await post(DB + '/reset', { readMs: 400 });
    await hit(0); const t0 = Date.now();                                   // key garam — TTL 2 s ab se
    let i = 0; const steady = setInterval(() => { for (let k = 0; k < 3; k++) hit(i++); }, 10);
    await sleep(1900 - (Date.now() - t0)); clearInterval(steady);          // expiry se thik pehle traffic ruka
    await sleep(2080 - (Date.now() - t0));
    const burst = await Promise.all(Array.from({ length: 1000 }, (_, k) => hit(k)));
    await sleep(300);
    await sleep(500);
    const st = await get(DB + '/stats'), lat = burst.filter(x => x != null);
    console.log(`${s.padEnd(10)} ${String(st.reads).padStart(6)} (ek saath ${String(st.peakConcurrent).padStart(3)})   ${String(pct(lat, 50)).padStart(5)} ms   ${String(pct(lat, 99)).padStart(5)} ms   ${s === 'swr' ? 'haan (thodi der ke liye)' : 'nahi'}`);
  }
  await post(DB + '/reset', { readMs: 30 });
  console.log('\nnone: key expire → har request khud DB ki taraf (stampede). mutex: ek jaata hai, baaki usi ka intezaar.');
  console.log('swr: purana price turant, peeche ek refresh. xfetch: expire se pehle hi koi ek (random) refresh kar deta hai → key kabhi thandi hi nahi hoti.');
})();
