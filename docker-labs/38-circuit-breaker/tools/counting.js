/* ex2 · Breaker KYA ginta hai aur KISKE liye hai — do galtiyan jo breaker ko hi outage bana deti hain.
   (a) Purane app version ki kharab requests par B 400 deta hai (70% traffic). B bilkul theek hai.
       4xx ko bhi "failure" gina toh?
   (b) B ka /recs band (503), /price theek. Poore B ka EK breaker, ya har endpoint ka alag?
   node tools/counting.js */
const { get, post, sleep, host } = require('../lib/util');
const A = `http://${host('a')}:5171`, B = `http://${host('b')}:5172`;
const SECS = 6;

async function load(pick) {
  const t0 = Date.now(), jobs = [];
  for (let i = 0; Date.now() - t0 < SECS * 1000; i++) {
    const { path, tag } = pick(i);
    jobs.push(fetch(A + path).then(async r => ({ tag, status: r.status, body: await r.json().catch(() => null) })).catch(() => ({ tag, status: 0 })));
    await sleep(Math.max(0, t0 + (i + 1) * 20 - Date.now()));             // 50 requests/second
  }
  return Promise.all(jobs);
}
const count = (rs, tag) => {
  const x = rs.filter(r => r.tag === tag);
  return { n: x.length, ok: x.filter(r => r.status === 200).length, blocked: x.filter(r => r.body && r.body.error === 'breaker open').length };
};

(async () => {
  console.log(`=== (a) purana app version (70% traffic) B par 400 khata hai — B khud theek hai · 50 req/s /price · ${SECS} s ===`);
  console.log('breaker kya ginta hai               naye app ki price requests   safal   breaker ne roki   breaker khula (baar)');
  for (const [name, count4xx] of [['4xx bhi failure', true], ['sirf 5xx + timeout', false]]) {
    await post(B + '/reset'); await post(A + '/reset');
    await post(B + '/config', { badApp: true });
    await post(A + '/config', { protect: 'breaker', perEndpoint: true, count4xx, halfOpen: 'trials', pool: 50 });
    const rs = await load(i => (i % 10 < 7 ? { path: '/price?v=old', tag: 'old' } : { path: '/price?v=new', tag: 'new' }));
    const c = count(rs, 'new'), a = await get(A + '/stats');
    console.log(`${name.padEnd(34)} ${String(c.n).padStart(14)}           ${String(c.ok).padStart(5)}   ${String(c.blocked).padStart(10)}        ${String(a.opens).padStart(8)}`);
  }

  console.log(`\n=== (b) B ka /recs band (503), /price bilkul theek · 25 req/s /home + 25 req/s /price · ${SECS} s ===`);
  console.log('breaker kiske liye                  price requests   safal   breaker ne roki   /home: cache se');
  for (const [name, perEndpoint] of [['poore B ka ek breaker', false], ['har endpoint ka alag breaker', true]]) {
    await post(B + '/reset'); await post(A + '/reset');
    await post(A + '/config', { protect: 'breaker', perEndpoint, count4xx: false, halfOpen: 'trials', pool: 50 });
    await fetch(A + '/home');                                               // ek accha jawab cache mein (fallback ke liye)
    await post(B + '/config', { recs: 'down' });
    const rs = await load(i => (i % 2 ? { path: '/price?v=new', tag: 'price' } : { path: '/home', tag: 'home' }));
    const c = count(rs, 'price'), cache = rs.filter(r => r.tag === 'home' && r.body && r.body.source === 'cache').length;
    console.log(`${name.padEnd(34)} ${String(c.n).padStart(10)}      ${String(c.ok).padStart(5)}   ${String(c.blocked).padStart(10)}        ${String(cache).padStart(6)}`);
  }
})();
