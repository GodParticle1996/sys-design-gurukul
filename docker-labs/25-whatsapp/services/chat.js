/* Chat server — ek process, ek event loop, laakhon idle connections ka sapna.
   TCP line protocol: "HELLO <user>" | "SEND <to> <text>" | ping.  Connection band → user offline.
   Offline user ka message REGISTRY ke offline queue mein jaata hai; wapas aate hi deliver ho jaata hai (store and forward). */
const net = require('net');
const onLines = require('../lib/line');
const { serve, post, get, host } = require('../lib/util');
const PORT = +process.env.PORT || 5011, NAME = process.env.NAME || 'chat1';
const REG = `http://${host('registry')}:5013`;
const online = new Map(); let delivered = 0, queued = 0, conns = 0;
net.createServer(sock => {
  sock.setNoDelay(true); let me = null; conns++;
  onLines(sock, async l => {
    const [cmd, ...rest] = l.split(' ');
    if (cmd === 'HELLO') {
      me = rest[0]; online.set(me, sock);
      await post(REG + '/online', { user: me, server: NAME, addr: `${host(NAME)}:${PORT + 100}` });
      const { messages } = await post(REG + '/drain', { user: me });    // jo peeche pade the
      messages.forEach(m => { sock.write(`MSG ${m.from} ${m.text}\n`); delivered++; });
      sock.write(`READY ${messages.length}\n`);
    } else if (cmd === 'SEND') {
      const to = rest[0], text = rest.slice(1).join(' ');
      const s = online.get(to);
      if (s) { s.write(`MSG ${me} ${text}\n`); delivered++; sock.write('OK live\n'); }
      else {
        const r = await post(REG + '/route', { to, from: me, text });
        if (r.queued) { queued++; sock.write('OK queued\n'); }
        else { await post(`http://${r.addr}/deliver`, { to, from: me, text }); sock.write(`OK via ${r.server}\n`); }   // dusre server par online
      }
    }
  });
  sock.on('close', async () => { conns--; if (me) { online.delete(me); await post(REG + '/offline', { user: me }); } });
  sock.on('error', () => {});
}).listen(PORT, () => console.log(`[${NAME}] :${PORT}`));
serve(PORT + 100, {
  'GET /stats': () => ({ name: NAME, conns, online: online.size, delivered, queued, rssMB: Math.round(process.memoryUsage().rss / 1048576) }),
  'POST /deliver': (req, res, url, p, b) => { const s = online.get(b.to); if (!s) return { ok: false }; s.write(`MSG ${b.from} ${b.text}\n`); delivered++; return { ok: true }; },
});
