const http = require('node:http');
const { sleep } = require('../lib/util');
const delayMs = Number(process.env.DELAY_MS ?? 40);
if (!Number.isFinite(delayMs) || delayMs < 0) throw Error('delay');
const store = new Map(Array.from({ length: 12 }, (_, i) =>
  ['dish-' + (i + 1), { id: i + 1, price: 100 + i }]));
let active = 0, calls = 0, peak = 0, items = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const reply = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  if (req.method !== 'GET') return reply(405, {error:'GET chahiye'});
  if (url.pathname === '/health') return reply(200, {ready:true});
  if (url.pathname === '/stats') return reply(200, {calls,peak,items,active});
  if (url.pathname === '/reset') {
    if (active) return reply(409, {error:'busy'});
    calls = peak = items = 0;
    return reply(200, {reset:true});
  }
  if (!['/one','/many'].includes(url.pathname)) return reply(404, {error:'route'});
  const keys = url.pathname === '/one'
    ? [url.searchParams.get('key')]
    : (url.searchParams.get('keys') || '').split(',');
  if (!keys.length || keys.length > 4 || keys.some(k => !store.has(k))) {
    return reply(400, {error:'1..4 valid dish keys chahiye'});
  }
  calls++; active++; items += keys.length;
  peak = Math.max(peak, active);
  try {
    // Har HTTP request par artificial fixed wait; real WAN nahi.
    await sleep(delayMs);
    const values = keys.map(key => store.get(key));
    active--;
    reply(200, url.pathname === '/one' ? values[0] : values);
  } catch (error) {
    active--;
    reply(500, {error:error.message});
  }
});
server.listen(Number(process.env.PORT ?? 5500), '0.0.0.0', () => {
  const port = server.address().port;
  if (process.send) process.send({port});
  else console.log(`cache ready :${port}; artificial wait ${delayMs} ms/request`);
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 1500).unref();
});
