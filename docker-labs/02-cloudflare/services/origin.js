/* ex4 — origin server: har NAYI connection par "TLS handshake" ka kharcha lagta hai */
const http = require('http');
const { burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4231);
let connects = 0, handshakeMs = 0, requests = 0;

const server = http.createServer((req, res) => {
  if (req.url === '/stats') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ connects, handshakeMs: Math.round(handshakeMs), requests })); }
  if (req.url === '/reset') { connects = requests = 0; handshakeMs = 0; return res.end('{"ok":true}'); }
  requests++;
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end('{"ok":true}');
});
server.on('connection', () => { connects++; const t = Date.now(); burn(3); handshakeMs += Date.now() - t; });
server.listen(PORT, () => console.log(`  origin          → http://localhost:${PORT}  (har nayi connection par ~3 ms handshake)`));
