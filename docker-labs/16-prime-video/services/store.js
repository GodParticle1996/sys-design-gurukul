/* "S3" — frames ki object store. Har PUT/GET gina jaata hai (bytes + requests) taaki bill ban sake. */
const http = require('http');
const PORT = +process.env.PORT || 4861;
const objs = new Map(); const st = { puts: 0, gets: 0, bytesIn: 0, bytesOut: 0 };
http.createServer((req, res) => {
  const key = req.url.slice(1);
  if (req.url === '/stats') return res.end(JSON.stringify(Object.assign({ objects: objs.size }, st)));
  if (req.url === '/reset') { objs.clear(); Object.keys(st).forEach(k => (st[k] = 0)); return res.end('{}'); }
  if (req.method === 'PUT') { const bufs = []; req.on('data', d => bufs.push(d)); req.on('end', () => { const b = Buffer.concat(bufs); objs.set(key, b); st.puts++; st.bytesIn += b.length; res.end('{}'); }); return; }
  const b = objs.get(key); if (!b) { res.writeHead(404); return res.end(); }
  st.gets++; st.bytesOut += b.length; res.end(b);
}).listen(PORT, () => console.log(`store → :${PORT}`));
