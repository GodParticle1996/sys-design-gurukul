'use strict';
// node services/lb.js backend <name> <port> | l4 <port> <backendPortA> <backendPortB> | l7 <port> <backendPortA> <backendPortB>
// backend: tiny HTTP API that says who answered. l4: TCP proxy — picks a backend per CONNECTION (round robin) and copies
// bytes; never reads HTTP. l7: HTTP proxy — parses each REQUEST and routes by path (/img → B, rest → A).
// Every process answers { cmd: 'cpu' } over IPC with its own CPU time, and sends 'ready' once listening.
const http = require('node:http');
const net = require('node:net');
const [mode, ...args] = process.argv.slice(2);
const ready = server => server.on('listening', () => process.send && process.send('ready'));
process.on('message', m => { if (m && m.cmd === 'cpu') { const c = process.cpuUsage(); process.send({ cpu: (c.user + c.system) / 1000 }); } });

if (mode === 'backend') {
  const [name, port] = args;
  ready(http.createServer((req, res) => {
    const body = JSON.stringify({ backend: name, path: req.url });
    res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
    res.end(body);
  }).listen(Number(port), '127.0.0.1'));
} else if (mode === 'l4') {
  const [port, a, b] = args.map(Number);
  let turn = 0;
  ready(net.createServer(client => {
    const target = [a, b][turn++ % 2];
    const up = net.connect(target, '127.0.0.1');
    client.pipe(up); up.pipe(client);
    const kill = () => { client.destroy(); up.destroy(); };
    client.on('error', kill); up.on('error', kill);
  }).listen(port, '127.0.0.1'));
} else if (mode === 'l7') {
  const [port, a, b] = args.map(Number);
  const agent = new http.Agent({ keepAlive: true, maxSockets: 64 });
  ready(http.createServer((req, res) => {
    const target = req.url.startsWith('/img/') ? b : a;
    const up = http.request({ host: '127.0.0.1', port: target, path: req.url, method: req.method, headers: req.headers, agent }, r => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    up.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(up);
  }).listen(port, '127.0.0.1'));
} else {
  console.error('usage: lb.js backend <name> <port> | l4|l7 <port> <a> <b>');
  process.exitCode = 1;
}
