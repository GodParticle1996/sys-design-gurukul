'use strict';
// Order API for ex1-reuse: one HTTP/1.1 port and one cleartext HTTP/2 (h2c) port in a single process.
// GET /order/:id → small JSON order. GET /stats → connections opened and server CPU time since the last reset.
const http = require('node:http');
const http2 = require('node:http2');
const { makeOrders } = require('../lib/orders');

const [h1Port, h2Port] = [Number(process.argv[2] || 6301), Number(process.argv[3] || 6302)];
const orders = makeOrders(53, 1000);
let conns = 0, cpu = process.cpuUsage();

function handle(path, send) {
  if (path === '/stats') {
    const c = process.cpuUsage(cpu);
    return send(200, JSON.stringify({ connections: conns, userMs: c.user / 1000, systemMs: c.system / 1000 }));
  }
  if (path === '/reset') { conns = 0; cpu = process.cpuUsage(); return send(200, '{}'); }
  const m = /^\/order\/(\d+)$/.exec(path);
  if (!m) return send(404, '{"error":"not found"}');
  send(200, JSON.stringify(orders[Number(m[1]) % orders.length]));
}

const h1 = http.createServer((req, res) => handle(req.url, (code, body) => {
  res.writeHead(code, { 'content-type': 'application/json' }); res.end(body);
}));
h1.keepAliveTimeout = 30000;
h1.on('connection', () => { conns++; });
const h2 = http2.createServer();
h2.on('session', () => { conns++; });
h2.on('stream', (stream, headers) => handle(headers[':path'], (code, body) => {
  stream.respond({ ':status': code, 'content-type': 'application/json' }); stream.end(body);
}));
h1.listen(h1Port, '127.0.0.1', () => h2.listen(h2Port, '127.0.0.1', () => process.send ? process.send('ready') : console.log('ready')));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(0));
