/* Ek lambi SSH jaisi session: har 100 ms "PING n", jawab ka intezaar.
   node tools/session.js [--secs 20]
   Ginte hain: kitne jawab aaye, sabse lamba ruka hua waqt (stall), aur SERVER par kitne alag sessions bane
   (session badla = SSH toot gaya, login dobara). */
const net = require('net');
const args = require('./args')();
const onLines = require('../lib/line');
const { get, host } = require('../lib/util');
const DISH = host('dish'), SECS = +(args.secs || 20);
let n = 0, ok = 0, reconnects = 0, sock = null, lastReply = Date.now(), lastSent = 0;
const sent = new Map(), sessions = [], stalls = [], rtts = [];
const t0 = Date.now();
function connect() {
  sock = net.connect(4893, DISH); sock.setNoDelay(true);
  onLines(sock, l => {
    const m = l.match(/^PONG (\d+) session=(\w+) count=(\d+)/); if (!m) return;
    const at = sent.get(+m[1]); if (at) { rtts.push(Date.now() - at); sent.delete(+m[1]); }
    const gap = Date.now() - lastReply; if (gap > 400) stalls.push({ at: ((Date.now() - t0) / 1000).toFixed(1), gap });
    lastReply = Date.now(); ok++;
    if (sessions[sessions.length - 1] !== m[2]) sessions.push(m[2]);
  });
  sock.on('error', () => {});
  sock.on('close', () => { if (Date.now() - t0 < SECS * 1000) { reconnects++; setTimeout(connect, 100); } });
}
connect();
const iv = setInterval(() => {
  if (Date.now() - t0 >= SECS * 1000) return finish();
  // app-level timeout: 1.5 sec koi jawab nahi → "connection mar gaya" → dobara connect (SSH ServerAlive jaisa)
  if (Date.now() - lastReply > 1500 && Date.now() - lastSent < 200 && sock && !sock.destroyed && sent.size > 10) { sent.clear(); sock.destroy(); }
  n++; sent.set(n, Date.now()); lastSent = Date.now(); if (sock && !sock.destroyed) sock.write(`PING ${n}\n`);
}, 100);
async function finish() {
  clearInterval(iv); sock.removeAllListeners('close'); sock.destroy();
  let d = {}; try { d = await get(`http://${DISH}:4895/stats`); } catch (e) {}
  const maxStall = stalls.reduce((m, s) => Math.max(m, s.gap), 0);
  const p = q => { const a = rtts.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(q * (a.length - 1))] : '-'; };
  console.log(`mode=${d.mode}  ${SECS}s  pings ${n}  jawab ${ok} (${Math.round(100 * ok / n)}%)  rtt p50 ${p(0.5)} ms p99 ${p(0.99)} ms`);
  console.log(`  server sessions: ${sessions.length}  (1 = SSH kabhi nahi toota)   app reconnects: ${reconnects}`);
  console.log(`  stalls >400ms: ${stalls.length}  sabse lamba: ${maxStall} ms   ${stalls.slice(0, 6).map(s => `t=${s.at}s:${s.gap}ms`).join(' ')}`);
  if (d.mode && d.mode !== 'direct') console.log(`  dish: scheduled switches ${d.switches_scheduled}, reactive ${d.switches_reactive}, satellite search tries ${d.search_tries}, resent ${d.resent}`);
  process.exit(0);
}
