/* ex4 · Frontend backpressure: Twitch jaisa chat. 5,000 messages/second aa rahe hain. Browser ka main thread ek hi hai
   (Node ka event loop wahi hai). Ek message dikhana = 0.2 ms ka DOM kaam, har DOM update ke baad 1 ms layout.
   60 fps ke liye har frame 16.7 ms mein khatam hona chahiye. Teen tareeke:
     every  — har message ek alag kaam: aate hi DOM mein (har message ka apna layout)
     frame  — frame mein ek baar: jitne jama hue, sab ek saath (ek layout)
     cap    — frame mein ek baar, sirf naye 20 dikhao, baaki chhod do ("+N aur")
   Har 50 ms ek "click" bhi — dekho click ka jawab kitni der mein aata hai (input lag).
   node tools/chat.js [--mode every|frame|cap] */
const args = require('./args')();
const PER_MSG = 0.2, LAYOUT = 1, FRAME = 1000 / 60, RATE = 5000, SECS = 5, CAP = 20;

function burn(ms) { const end = process.hrtime.bigint() + BigInt(Math.round(ms * 1e6)); let x = 0; while (process.hrtime.bigint() < end) x += Math.sqrt(x + 1); return x; }
const p99 = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return Math.round(s[Math.floor(s.length * 0.99)]); };

function run(mode) {
  return new Promise(done => {
    const t0 = Date.now(), end = t0 + SECS * 1000;
    let arrived = 0, shown = 0, dropped = 0, frames = 0, lastFrame = t0, worstGap = 0, working = false;
    const pending = [], delays = [], lags = [];
    const show = (arr, now) => { arr.forEach(at => delays.push(now - at)); shown += arr.length; };
    const worker = () => {                                                 // 'every': ek message = ek kaam
      if (Date.now() >= end || !pending.length) { working = false; return; }
      burn(PER_MSG + LAYOUT); show([pending.shift()], Date.now());
      setImmediate(worker);
    };
    const inbox = setInterval(() => {                                      // naye messages (rukne par bhi hisaab barabar)
      const now = Date.now(); if (now >= end) return;
      const due = Math.floor((now - t0) / 1000 * RATE) - arrived;
      for (let i = 0; i < due; i++) pending.push(now);
      arrived += Math.max(0, due);
      if (mode === 'every' && !working && pending.length) { working = true; setImmediate(worker); }
    }, 10);
    const frame = () => {                                                  // requestAnimationFrame jaisa
      const now = Date.now();
      if (now >= end) return;
      worstGap = Math.max(worstGap, now - lastFrame); lastFrame = now; frames++;
      if (mode === 'frame' && pending.length) { const batch = pending.splice(0); burn(batch.length * PER_MSG + LAYOUT); show(batch, Date.now()); }
      if (mode === 'cap' && pending.length) { const batch = pending.splice(0), keep = batch.slice(-CAP); dropped += batch.length - keep.length; burn(keep.length * PER_MSG + LAYOUT); show(keep, Date.now()); }
      setTimeout(frame, FRAME);
    };
    setTimeout(frame, FRAME);
    const click = () => {                                                  // user ka click: 50 ms baad chalna chahiye tha
      const want = Date.now() + 50;
      setTimeout(() => { if (Date.now() < end) { lags.push(Date.now() - want); click(); } }, 50);
    };
    click();
    setTimeout(() => {
      clearInterval(inbox);
      done({ fps: Math.round(frames / SECS), worstGap, shown, dropped, waiting: pending.length, arrived, delayP99: p99(delays), lagP99: p99(lags) });
    }, SECS * 1000 + 100);
  });
}

(async () => {
  const modes = args.mode ? [args.mode] : ['every', 'frame', 'cap'];
  const names = { every: 'har message turant (apna layout)', frame: 'frame mein ek baar, sab', cap: `frame mein ek baar, naye ${CAP}` };
  console.log(`${RATE} messages/s · ek message 0.2 ms + har DOM update par 1 ms layout · 60 fps = 16.7 ms/frame · ${SECS} s\n`);
  console.log('tareeka                            fps   sabse lamba frame   click ki der (p99)   message kitna purana dikha (p99)   dikhaye / chhode / abhi line mein');
  for (const m of modes) {
    const r = await run(m);
    console.log(`${names[m].padEnd(34)} ${String(r.fps).padStart(3)}   ${String(r.worstGap + ' ms').padStart(10)}          ${String(r.lagP99 + ' ms').padStart(8)}             ${String(r.delayP99 + ' ms').padStart(8)}                     ${r.shown} / ${r.dropped} / ${r.waiting}`);
  }
})();
