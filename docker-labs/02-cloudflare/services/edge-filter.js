/* ex3 — "XDP wali jagah": ek TCP filter jo connection ke pehle bytes dekh kar hi traffic gira deta hai.
   Application tak baat pahunchti hi nahi — na HTTP parse, na memory, na business logic. */
const net = require('net');
const PORT = +(process.env.PORT || 4220);
const UPSTREAM = +(process.env.UPSTREAM || 4221);
const FILTER = process.env.FILTER === '1';
let dropped = 0, passed = 0;

net.createServer(client => {
  client.once('data', first => {
    const head = first.toString('latin1', 0, Math.min(first.length, 300));
    if (FILTER && head.includes('bad=1')) { dropped++; return client.destroy(); }   /* yahin mar gaya */
    passed++;
    const up = net.connect(UPSTREAM, 'localhost', () => { up.write(first); client.pipe(up); up.pipe(client); });
    up.on('error', () => client.destroy());
    client.on('error', () => up.destroy());
  });
  client.on('error', () => {});
}).listen(PORT, () => console.log(`  edge-filter     → tcp://localhost:${PORT}  (FILTER=${FILTER ? 1 : 0}) → upstream ${UPSTREAM}`));

/* stats */
require('http').createServer((req, res) => {
  if (req.url === '/reset') { dropped = passed = 0; return res.end('{"ok":true}'); }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ filter: FILTER, dropped, passed }));
}).listen(PORT + 100);
