/* Dish (user terminal). User ka app isse TCP par judta hai (:4893).
   DISH_MODE=direct     → har user connection seedha satellite se server tak. Satellite gaya = connection gaya.
   DISH_MODE=reactive   → PoP tak tunnel. Tunnel chup? heartbeat DEAD_MS tak nahi aaya → tab satellite dhoondho.
   DISH_MODE=scheduled  → PoP tak tunnel + ephemeris: agla satellite kab aayega pata hai → boundary par pehle hi naya tunnel
                          (make-before-break). Achaanak maut ke liye reactive fallback bhi. */
const net = require('net');
const onLines = require('../lib/line');
const { serve, get, host } = require('../lib/util');
const MODE = process.env.DISH_MODE || 'scheduled';
const PORT = +process.env.PORT || 4893;
const SKY = host('sky'), SKY_URL = `http://${SKY}:4892`;
const POP = `${process.env.POP_HOST || '127.0.0.1'}:4894`, SERVER = `${process.env.SERVER_HOST || '127.0.0.1'}:4891`;
const HB_MS = 200, DEAD_MS = +process.env.DEAD_MS || 1000;
let sched = null;
const stats = { switches_scheduled: 0, switches_reactive: 0, search_tries: 0, resent: 0 };

function viaSat(sat, target) {                     // satellite se jud ke target tak raasta. resolve(sock) ya reject
  return new Promise((resolve, reject) => {
    const s = net.connect(sched.sat_base + sat, SKY); s.setNoDelay(true);
    let ok = false;
    const t = setTimeout(() => { s.destroy(); reject(new Error('no answer')); }, 300);
    s.once('data', d => { if (String(d).startsWith('OK')) { ok = true; clearTimeout(t); s.write(`CONNECT ${target}\n`); resolve(s); } });
    s.on('error', () => {}); s.on('close', () => { clearTimeout(t); if (!ok) reject(new Error('not visible')); });
  });
}
async function search(target) {                    // reactive: pata nahi kaun dikh raha → ek ek karke try
  for (let k = 0; k < 3; k++) for (let sat = 0; sat < sched.sats; sat++) {
    stats.search_tries++;
    try { return { sock: await viaSat(sat, target), sat }; } catch (e) {}
  }
  throw new Error('koi satellite nahi mila');
}
const epochNow = () => Math.floor((Date.now() - sched.t0) / sched.epoch_ms);

function tunnelUser(user) {
  let seq = 0, tun = null, lastHb = Date.now(), switching = false;
  const pending = new Map();         // seq -> line  (jawab abhi aaya nahi)
  const out = { onLine: null, close() { closed = true; if (tun) tun.sock.destroy(); clearInterval(hb); clearTimeout(timer); } };
  let closed = false, timer = null;
  async function open(sat, why) {
    const r = sat == null ? await search(POP) : { sock: await viaSat(sat, POP), sat };
    const t = { sock: r.sock, sat: r.sat };
    onLines(t.sock, l => {
      if (tun !== t) return;
      let m; try { m = JSON.parse(l); } catch (e) { return; }
      if (m.t === 'hb') lastHb = Date.now();
      if (m.t === 'data' && pending.has(m.ack)) { pending.delete(m.ack); out.onLine && out.onLine(m.line); }
    });
    t.sock.write(JSON.stringify({ t: 'hello', user }) + '\n');
    const old = tun; tun = t; lastHb = Date.now();
    for (const [s, line] of pending) { stats.resent++; t.sock.write(JSON.stringify({ t: 'data', seq: s, line }) + '\n'); }   // jo raaste mein kho gaye
    if (old) setTimeout(() => old.sock.destroy(), 100);
    if (why === 'scheduled') stats.switches_scheduled++; else if (why === 'reactive') stats.switches_reactive++;
  }
  async function reactive() {
    if (switching || closed) return; switching = true;
    try { await open(null, 'reactive'); } catch (e) {} finally { switching = false; }
  }
  const hb = setInterval(() => {
    if (!tun || closed) return;
    tun.sock.write(JSON.stringify({ t: 'hb', n: Date.now() }) + '\n');
    if (Date.now() - lastHb > DEAD_MS) reactive();                        // dead interval — ab jaake pata chala
  }, HB_MS);
  function planNext() {                                                   // ephemeris: agla handover kab hai
    const next = sched.t0 + (epochNow() + 1) * sched.epoch_ms;
    timer = setTimeout(async () => {
      if (closed) return;
      if (!switching) { switching = true; try { await open((epochNow()) % sched.sats, 'scheduled'); } catch (e) {} finally { switching = false; } }
      planNext();
    }, Math.max(0, next - Date.now() + 30));                             // naya sat dikhne ke 30 ms baad, purana abhi overlap mein hai
  }
  out.ready = (async () => { await open(epochNow() % sched.sats, 'first').catch(() => open(null, 'first')); if (MODE === 'scheduled') planNext(); })();
  out.send = line => { const s = ++seq; pending.set(s, line); if (tun) tun.sock.write(JSON.stringify({ t: 'data', seq: s, line }) + '\n'); };
  return out;
}

(async () => {
  for (;;) { try { sched = await get(SKY_URL + '/schedule'); break; } catch (e) { await new Promise(r => setTimeout(r, 300)); } }
  const skew = Date.now() - sched.now; sched.t0 += skew;                   // ghadi milao
  let users = 0;
  net.createServer(async app => {
    app.setNoDelay(true); const user = 'u' + (++users);
    if (MODE === 'direct') {
      try {
        const { sock } = await search(SERVER);
        app.pipe(sock); sock.pipe(app);
        sock.on('close', () => app.destroy()); app.on('close', () => sock.destroy()); sock.on('error', () => {}); app.on('error', () => {});
      } catch (e) { app.destroy(); }
      return;
    }
    const t = tunnelUser(user); await t.ready.catch(() => {});
    t.onLine = l => app.write(l + '\n');
    onLines(app, l => t.send(l));
    app.on('close', () => t.close()); app.on('error', () => {});
  }).listen(PORT, () => console.log(`[dish] :${PORT} mode=${MODE} (epoch ${sched.epoch_ms} ms, dead-interval ${DEAD_MS} ms)`));
  serve(+process.env.STATS_PORT || 4895, { 'GET /stats': () => Object.assign({ mode: MODE }, stats) });
})();
