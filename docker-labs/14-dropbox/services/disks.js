/* 10 "disks" ek process mein (data/disk-0 … data/disk-9). Har disk ko down/up kar sakte ho.
   Blocks base64 mein aate-jaate hain (lab ke liye kaafi). Har read/write ke bytes gine jaate hain. */
const fs = require('fs');
const path = require('path');
const { serve, json } = require('../lib/util');
const PORT = +process.env.PORT || 4841, N = 10;
const ROOT = path.resolve(__dirname, '..', 'data');
const down = new Set();
const stats = { bytesWritten: 0, bytesRead: 0 };
for (let i = 0; i < N; i++) fs.mkdirSync(path.join(ROOT, 'disk-' + i), { recursive: true });
const file = (n, key) => path.join(ROOT, 'disk-' + n, key.replace(/[^a-z0-9._-]/gi, '_'));

serve(PORT, {
  'PUT /disk/:n/:key': (req, res, url, p, body) => {
    if (down.has(+p.n)) return json(res, 503, { error: 'disk down' });
    const buf = Buffer.from(body.b64, 'base64'); fs.writeFileSync(file(p.n, p.key), buf); stats.bytesWritten += buf.length; return { ok: 1 };
  },
  'GET /disk/:n/:key': (req, res, url, p) => {
    if (down.has(+p.n)) return json(res, 503, { error: 'disk down' });
    try { const buf = fs.readFileSync(file(p.n, p.key)); stats.bytesRead += buf.length; return { b64: buf.toString('base64') }; }
    catch (e) { return json(res, 404, { error: 'missing' }); }
  },
  'POST /disk/:n/down': (req, res, url, p) => { down.add(+p.n); return { down: [...down] }; },
  'POST /disk/:n/wipe': (req, res, url, p) => { const d = path.join(ROOT, 'disk-' + p.n); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d); down.delete(+p.n); return { ok: 1 }; },
  'POST /reset': () => { down.clear(); for (let i = 0; i < N; i++) { const d = path.join(ROOT, 'disk-' + i); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d); } stats.bytesWritten = stats.bytesRead = 0; return { ok: 1 }; },
  'POST /heal': () => { down.clear(); return { ok: 1 }; },
  'GET /stats': (req, res, url) => {
    const pre = url.searchParams.get('prefix') || '';
    let used = 0; for (let i = 0; i < N; i++) for (const f of fs.readdirSync(path.join(ROOT, 'disk-' + i))) if (f.startsWith(pre)) used += fs.statSync(path.join(ROOT, 'disk-' + i, f)).size;
    return Object.assign({ used, down: [...down] }, stats);
  },
  'POST /stats/zero': () => { stats.bytesWritten = stats.bytesRead = 0; return { ok: 1 }; },
}, () => console.log(`disks → http://localhost:${PORT}   (10 disks: data/disk-0 … disk-9)`));
