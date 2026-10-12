/* Wahi "har tenant kitna bhej sakta hai", asli library se: express-rate-limit (Express ka middleware).
   Pehle (isi folder mein):  npm install express express-rate-limit        phir:  node tools/express-rate-limit.js
   Yeh tool apna chhota Express server khud chalata hai (koi `npm start` nahi chahiye). A aur B dono isi machine se
   bhejte hain, isliye server ko dono ka IP ek hi dikhta hai — jaise ek hi office / Wi-Fi ke peeche ke log,
   ya load balancer ke peeche ki har request. Tenant ki pehchaan header mein hai: x-api-key: A ya B. */
const fs = require('fs'), path = require('path');
let express, rateLimit;
try { express = require('express'); ({ rateLimit } = require('express-rate-limit')); }
catch (e) { console.log('Yeh tool do npm libraries maangta hai. Pehle is folder mein:  npm install express express-rate-limit'); process.exit(1); }
const { TokenBucket } = require('../lib/token-bucket');
const { sleep } = require('../lib/util');

/* ek chhota server: /work par limiter laga hai */
function server(limiterOptions) {
  return new Promise(ready => {
    const app = express();
    app.use(rateLimit(limiterOptions));                    // har request pehle limiter se guzarti hai
    app.get('/work', (req, res) => res.json({ ok: true }));
    const s = app.listen(0, () => ready({ url: `http://127.0.0.1:${s.address().port}/work`, close: () => new Promise(r => s.close(r)) }));
  });
}

/* do limiter: hadd wahi (ek second mein 4), bas "ginti kiski" alag */
const BY_IP = { windowMs: 1000, limit: 4 };                // ginti kiski, yeh likha hi nahi → library ka default: IP ki
const BY_TENANT = {
  windowMs: 1000, limit: 4,
  keyGenerator: req => req.get('x-api-key'),               // ginti: har tenant ki apni
};
const call = async (url, key) => {
  const r = await fetch(url, { headers: { 'x-api-key': key } });
  await r.text();
  return { status: r.status, left: r.headers.get('x-ratelimit-remaining'), retry: r.headers.get('retry-after') };
};
const tally = rs => { const ok = rs.filter(r => r.status === 200).length; return `${ok} × 200${rs.length - ok ? `, ${rs.length - ok} × 429` : ''}`; };
const one = r => (r.status === 200 ? `200 (is second mein bache: ${r.left})` : `429 · Retry-After: ${r.retry}`);

/* B ek request, phir A ka 12 ka burst, phir B dobara, phir agle second mein B */
async function story(title, options) {
  const s = await server(options);
  const t0 = Date.now(), at = () => ((Date.now() - t0) / 1000).toFixed(1) + ' s';
  const until = ms => sleep(Math.max(0, t0 + ms - Date.now()));
  console.log(`\n=== ${title} ===`);
  console.log(`   ${at()}  B#1 → ${one(await call(s.url, 'B'))}`);
  await until(200);
  const burst = []; for (let i = 0; i < 12; i++) burst.push(await call(s.url, 'A'));
  console.log(`   0.2 s  A ke 12 requests → ${tally(burst)}`);
  await until(400);
  const b2 = await call(s.url, 'B');
  console.log(`   0.4 s  B#2 → ${one(b2)}${b2.status === 429 ? '   ← B ne sirf 2 requests bheji thi' : ''}`);
  await until(1200);
  console.log(`   1.2 s  B#3 → ${one(await call(s.url, 'B'))}   (naya second)`);
  await s.close();
}

(async () => {
  const version = name => {                                        // library ka version: uske apne package.json se
    let dir = path.dirname(require.resolve(name));
    while (!fs.existsSync(path.join(dir, 'package.json'))) dir = path.dirname(dir);
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
  };
  console.log(`express-rate-limit ${version('express-rate-limit')} · Express ${version('express')} · A aur B dono ka IP: 127.0.0.1`);

  await story('1. limit: 4 requests / second — ginti kiski? library ka default: IP ki', BY_IP);
  await story('2. wahi limit — ginti x-api-key ki (har tenant ki apni)', BY_TENANT);

  /* ---- 3. kuch na likho toh ---- */
  console.log('\n=== 3. rateLimit() — koi setting nahi ===');
  const d = await server({});
  const six = []; for (let i = 0; i < 6; i++) six.push(await call(d.url, i % 2 ? 'A' : 'B'));
  console.log(`   6 requests (A aur B ki mili-juli) → ${tally(six)} · chhathi par: ${one(six[5])}`);
  console.log('   default: ek IP se 1 minute mein 5 requests (windowMs 60000 · limit 5 · key = IP)');
  await d.close();

  /* ---- 4. wahi 8 requests, do hisaab: library ki "khidki" banaam token wali baalti ---- */
  console.log('\n=== 4. wahi 8 requests: 0.0 s par 1 · 0.9 s par 3 · 1.1 s par 4 (limit 4/second) ===');
  const w = await server(BY_IP);
  const bucket = new TokenBucket({ rate: 4 });
  const t0 = Date.now(), until = ms => sleep(Math.max(0, t0 + ms - Date.now()));
  const lib = [], ours = [];
  for (const [at, n] of [[0, 1], [900, 3], [1100, 4]]) {
    await until(at);
    for (let i = 0; i < n; i++) { lib.push((await call(w.url, 'A')).status === 200); ours.push(bucket.take()); }
  }
  const show = a => `${a.slice(0, 1).filter(Boolean).length} + ${a.slice(1, 4).filter(Boolean).length} + ${a.slice(4).filter(Boolean).length} = ${a.filter(Boolean).length} andar`;
  console.log(`   express-rate-limit (har second nayi ginti):  ${show(lib)}   ← 0.9 s se 1.1 s ke beech 7 andar`);
  console.log(`   lib/token-bucket.js (tapakte tokens):        ${show(ours)}`);
  await w.close();
  process.exit(0);
})();
