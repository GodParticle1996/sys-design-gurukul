const http = require('node:http');
async function call(base, route, body) {
  const res = await fetch(base + route, {
    signal: AbortSignal.timeout(1500),
    ...(body === undefined ? {} : { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const value = await res.json();
  if (!res.ok) throw Error(value.error || `HTTP ${res.status}`);
  return value;
}
function serve(port, handle) {
  const server = http.createServer(async (req, res) => {
    try {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 65536) throw Error('lab body cap');
      }
      const value = await handle(req.method, new URL(req.url, 'http://lab'),
        raw ? JSON.parse(raw) : {});
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(value));
    } catch (error) {
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
  server.listen(port, '0.0.0.0', () => {
    if (process.send) process.send('ready');
    else console.log(`ready :${port}`);
  });
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  return server;
}
module.exports = { call, serve };
