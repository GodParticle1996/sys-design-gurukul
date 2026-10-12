/* "Internet" ka ek server (jaise koi SSH / game server). Har TCP connection = ek session.
   Connection toota → session khatam → naya session count 0 se shuru. */
const net = require('net');
const crypto = require('crypto');
const PORT = +process.env.PORT || 4891;
let sessions = 0;
net.createServer(sock => {
  const id = crypto.randomBytes(2).toString('hex'); let count = 0; sessions++;
  let buf = '';
  sock.on('data', d => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      const m = line.match(/^PING (\d+)/); if (m) sock.write(`PONG ${m[1]} session=${id} count=${++count}\n`);
    }
  });
  sock.on('error', () => {});
}).listen(PORT, () => console.log(`[server] :${PORT} — har TCP connection ek session`));
