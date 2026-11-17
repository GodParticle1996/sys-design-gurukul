'use strict';
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventStore } = require('./store.cjs');

function frame(event, row) {
  return `id: ${row.seq}\nevent: ${event}\ndata: ${JSON.stringify(row)}\n\n`;
}
function createLab(store) {
  store.create('order-41');
  const clients = new Set();
  const send = (res, event, row) => { if (!res.write(frame(event, row))) res.destroy(); };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(__dirname, 'client.html')));
    }
    if (req.method === 'GET' && url.pathname === '/events') {
      if (clients.size >= 64) { res.writeHead(503); return res.end('Lab connection limit'); }
      const raw = req.headers['last-event-id'];
      if (raw !== undefined && !/^(0|[1-9]\d*)$/.test(raw)) { res.writeHead(400); return res.end('Invalid cursor'); }
      let batch;
      try { batch = store.resume('order-41', raw === undefined ? null : Number(raw)); }
      catch { res.writeHead(400); return res.end('Invalid cursor'); }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
      res.write('retry: 1500\n\n');
      for (const row of batch.rows) send(res, batch.mode === 'replay' ? 'update' : batch.mode, row);
      // Replay and registration share one synchronous turn; no writer can interleave.
      if (!res.destroyed) clients.add(res);
      res.on('close', () => clients.delete(res));
      return;
    }
    if (req.method === 'POST' && req.headers['x-lab'] === '1' && url.pathname === '/advance') {
      const states = ['accepted', 'cooking', 'ready', 'delivered'];
      const row = store.append('order-41', states[(store.head('order-41').head + 1) % states.length]);
      for (const client of clients) send(client, 'update', row);
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(row));
    }
    if (req.method === 'POST' && req.headers['x-lab'] === '1' && url.pathname === '/disconnect') {
      for (const client of clients) client.destroy();
      clients.clear(); res.writeHead(204); return res.end();
    }
    res.writeHead(404); res.end('Not found');
  });
  const heartbeat = setInterval(() => { for (const client of clients) if (!client.write(': heartbeat\n\n')) client.destroy(); }, 10000);
  heartbeat.unref();
  return { server, stop() { clearInterval(heartbeat); for (const client of clients) client.destroy(); server.close(); } };
}
if (require.main === module) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gurukul-live-updates-'));
  const store = new EventStore(path.join(directory, 'events.sqlite'));
  const lab = createLab(store);
  lab.server.on('error', error => { console.error(error.message); store.close(); fs.rmSync(directory, { recursive: true }); process.exitCode = 1; });
  lab.server.listen(0, '127.0.0.1', () => console.log(`Open http://127.0.0.1:${lab.server.address().port}\nDemo data: ${directory}\nCtrl+C stops the lab and removes only this temporary directory.`));
  const stop = () => { lab.stop(); store.close(); fs.rmSync(directory, { recursive: true }); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
module.exports = { createLab, frame };
