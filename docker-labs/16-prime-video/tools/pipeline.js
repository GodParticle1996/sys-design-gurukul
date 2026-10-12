#!/usr/bin/env node
/* Video Quality Analysis — ek "second" video = 12 frames × 40 KB. Har second par: converter decode → 3 detectors
   (block corruption, freeze, A/V sync) har frame dekhte hain.
   --mode micro : converter frames STORE mein PUT karta hai, har detector GET karta hai; har kadam orchestrator par ek
                  transition (decode, 3 detect = 4 per second of video, video jaisa). 429 aaya toh thoda ruk ke dobara.
   --mode mono  : sab ek process mein — frame ek pointer hai, koi network nahi.
   --streams N (default 20)  --secs 10   → har stream ko real-time rehna hai: 1 second video per 1 second.        */
const http = require('http');
const crypto = require('crypto');
const args = require('./args')();
const { burn } = require('../lib/util');
const MODE = args.mode || 'micro', STREAMS = +(args.streams || 20), SECS = +(args.secs || 10);
const FRAMES = 12, FRAME_KB = 40;
const H = process.env.STORE_HOST || 'localhost', OH = process.env.ORCH_HOST || 'localhost';
const agent = new http.Agent({ keepAlive: true, maxSockets: 64 });
const req = (host, port, method, path, body) => new Promise((res, rej) => {
  const r = http.request({ host, port, method, path, agent }, rr => { const b = []; rr.on('data', d => b.push(d)); rr.on('end', () => res({ code: rr.statusCode, body: Buffer.concat(b) })); });
  r.on('error', rej); if (body) r.write(body); r.end();
});
async function transition() { for (;;) { const r = await req(OH, 4862, 'POST', '/t'); if (r.code === 200) return; await new Promise(z => setTimeout(z, 20)); } }
const detect = frame => burn(0.15);                      // har detector har frame par ~0.15 ms CPU (asli kaam sasta hai)
const decode = () => Array.from({ length: FRAMES }, () => crypto.randomBytes(FRAME_KB * 1024));

async function oneSecond(stream, sec) {
  const frames = decode();
  if (MODE === 'mono') { for (let d = 0; d < 3; d++) for (const f of frames) detect(f); return; }
  await transition();                                              // decode step
  await Promise.all(frames.map((f, i) => req(H, 4861, 'PUT', `/s${stream}/${sec}/${i}`, f)));
  for (let d = 0; d < 3; d++) {                                    // har detector: transition + saare frames GET
    await transition();
    const got = await Promise.all(frames.map((f, i) => req(H, 4861, 'GET', `/s${stream}/${sec}/${i}`)));
    got.forEach(g => detect(g.body));
  }
}

(async () => {
  if (MODE === 'micro') { await req(H, 4861, 'GET', '/reset'); await req(OH, 4862, 'GET', '/reset'); }
  const t0 = Date.now(), end = t0 + SECS * 1000; let done = 0;
  await Promise.all(Array.from({ length: STREAMS }, async (_, s) => {
    let sec = 0;
    while (Date.now() < end) { await oneSecond(s, sec++); done++; }
  }));
  const wall = (Date.now() - t0) / 1000;
  const rt = done / STREAMS / wall;       // har stream ne ek wall-second mein kitne video-seconds kiye
  console.log(`mode=${MODE.padEnd(5)} streams=${STREAMS}: ${done} video-seconds in ${wall.toFixed(1)} s → har stream ${rt.toFixed(2)}× real-time ${rt >= 1 ? '✅' : '❌ peeche chhoot raha hai'}`);
  if (MODE === 'micro') {
    const s = JSON.parse((await req(H, 4861, 'GET', '/stats')).body), o = JSON.parse((await req(OH, 4862, 'GET', '/stats')).body);
    const perHour = x => x / done * 3600;          // ek ghante ki ek stream
    const cost = perHour(o.transitions) / 1e6 * 25 + perHour(s.puts) / 1e6 * 5 + perHour(s.gets) / 1e6 * 0.4;
    console.log(`   network par ${(s.bytesIn / 1048576).toFixed(0)} MB likha + ${(s.bytesOut / 1048576).toFixed(0)} MB padha · transitions ${o.transitions} (throttled ${o.throttled}) · PUT ${s.puts} GET ${s.gets}`);
    console.log(`   ek stream ka ek ghanta ≈ ${Math.round(perHour(o.transitions))} transitions + ${Math.round(perHour(s.puts))} PUT + ${Math.round(perHour(s.gets))} GET ≈ $${cost.toFixed(2)} (list prices, sirf yeh do services)`);
  }
})().catch(e => { console.error('store/orchestrator chal rahe hain? npm start ex1-boundary-tax —', e.message); process.exit(1); });
