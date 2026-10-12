/* PoP (Point of Presence) — zameen par, fiber par. User ka public IP YAHAN rehta hai.
   Dish se aane wali tunnel (satellite ke raaste) kabhi bhi badal sakti hai; PoP → server connection NAHI badalta.
   Tunnel protocol (JSON lines): hello{user} · data{seq,line} → data{ack,line} · hb{n} → hb{n} */
const net = require('net');
const onLines = require('../lib/line');
const PORT = +process.env.PORT || 4894;
const SERVER = { host: process.env.SERVER_HOST || '127.0.0.1', port: 4891 };
const users = new Map();       // user -> { tunnel, server, lastSeq, replies: Map(seq->line), waiting: [] }
let tunnels = 0, resent = 0;

function userState(u) {
  let st = users.get(u); if (st) return st;
  st = { tunnel: null, lastSeq: 0, replies: new Map(), waiting: [] };
  st.server = net.connect(SERVER.port, SERVER.host); st.server.setNoDelay(true);
  onLines(st.server, line => {                                         // server ka jawab → jo tunnel ABHI hai us par
    const seq = st.waiting.shift(); st.replies.set(seq, line);
    if (st.replies.size > 200) st.replies.delete(st.replies.keys().next().value);
    send(st.tunnel, { t: 'data', ack: seq, line });
  });
  st.server.on('error', () => {});
  users.set(u, st); return st;
}
function send(sock, obj) { if (sock && !sock.destroyed) sock.write(JSON.stringify(obj) + '\n'); }

net.createServer(sock => {
  sock.setNoDelay(true); let st = null;
  onLines(sock, l => {
    let m; try { m = JSON.parse(l); } catch (e) { return; }
    if (m.t === 'hello') { tunnels++; st = userState(m.user); st.tunnel = sock; return send(sock, { t: 'hello-ok' }); }
    if (m.t === 'hb') return send(sock, { t: 'hb', n: m.n });
    if (m.t === 'data' && st) {
      if (m.seq <= st.lastSeq) {                                         // purani tunnel par bheja tha, dobara aaya
        resent++; const r = st.replies.get(m.seq); if (r) send(sock, { t: 'data', ack: m.seq, line: r }); return;
      }
      st.lastSeq = m.seq; st.waiting.push(m.seq); st.server.write(m.line + '\n');
    }
  });
  sock.on('error', () => {});
}).listen(PORT, () => console.log(`[pop] :${PORT} — anchor: user ka IP + server connection yahin rehta hai`));
setInterval(() => {}, 1 << 30);
process.on('SIGUSR2', () => console.log({ tunnels, resent }));
