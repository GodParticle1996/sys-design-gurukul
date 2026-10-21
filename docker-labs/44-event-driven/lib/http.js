const http = require('node:http');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(base, route, body) {
  const options = { signal: AbortSignal.timeout(5000) };
  if (body !== undefined) Object.assign(options, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const res = await fetch(base + route, options);
  const data = await res.json();
  if (!res.ok) throw Error(data.error || `HTTP ${res.status}`);
  return data;
}
function serve(port, handle) {
  const server = http.createServer(async (req, res) => {
    try {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 65536) throw Error('body too large');
      }
      const url = new URL(req.url, 'http://localhost');
      const out = await handle(req.method, url.pathname,
        raw ? JSON.parse(raw) : {}, url.searchParams);
      res.writeHead(out?.code || 200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out?.body ?? out));
    } catch (e) {
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
  server.listen(port, '0.0.0.0', () => console.log(`ready :${port}`));
  return server;
}
module.exports = { sleep, call, serve };
