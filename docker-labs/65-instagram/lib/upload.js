'use strict';
// ex1 — direct upload with a presigned URL. Two real HTTP servers on 127.0.0.1 (random ports):
// a tiny "object store" and an "app server". The clock is simulated so hours can pass instantly.
const http = require('node:http');
const crypto = require('node:crypto');

function sign(secret, method, key, expires) {
  return crypto.createHmac('sha256', secret).update(`${method}\n/o/${key}\n${expires}`).digest('hex');
}
const listen = srv => new Promise(ok => srv.listen(0, '127.0.0.1', () => ok(srv.address().port)));
function body(req) { return new Promise(ok => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); }); }

async function start({ secret = 'lab-secret', urlTtlMs = 15 * 60e3 } = {}) {
  const clock = { now: 0 };
  // ---- object store: verifies the signature and expiry, appends chunks at an offset (resumable), keeps tags
  const objects = new Map(), storeStats = { bytesIn: 0, rejected: 0 };
  const store = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://local'), key = u.pathname.slice(3), exp = Number(u.searchParams.get('expires'));
    const ok = u.searchParams.get('sig') === sign(secret, req.method === 'HEAD' ? 'PUT' : req.method, key, exp) && clock.now <= exp;
    if (!ok) { storeStats.rejected++; await body(req); res.statusCode = 403; return res.end(); }
    const obj = objects.get(key) || { bytes: Buffer.alloc(0), tags: { status: 'pending' }, created: clock.now };
    // This lab's own protocol: a PUT signature also allows HEAD (to read the offset). A real S3 presigned URL is method-specific.
    if (req.method === 'HEAD') { res.setHeader('x-offset', String(obj.bytes.length)); return res.end(); }
    const data = await body(req), offset = Number(u.searchParams.get('offset') || 0);
    if (obj.tags.status === 'final') { res.statusCode = 409; return res.end(); }   // published: bytes are frozen (app rule)
    if (offset !== obj.bytes.length) { res.statusCode = 409; res.setHeader('x-offset', String(obj.bytes.length)); return res.end(); }
    obj.bytes = Buffer.concat([obj.bytes, data]); storeStats.bytesIn += data.length; objects.set(key, obj);
    res.setHeader('x-offset', String(obj.bytes.length)); res.end();
  });
  // ---- app server: small JSON only. Issues presigned URLs, remembers each upload session (expected size + SHA-256),
  // and writes the metadata row only for a complete, matching object. A repeated commit returns the same photo id.
  const rows = [], sessions = new Map(), appStats = { bytesIn: 0 };
  const urlFor = key => { const expires = clock.now + urlTtlMs; return `http://127.0.0.1:${ports.store}/o/${key}?expires=${expires}&sig=${sign(secret, 'PUT', key, expires)}`; };
  const reply = (res, code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  const app = http.createServer(async (req, res) => {
    const data = await body(req); appStats.bytesIn += data.length;
    res.setHeader('content-type', 'application/json');
    const msg = data.length ? JSON.parse(data) : {};
    if (req.url === '/uploads') {                     // start a session: the client says how big the photo is and its hash
      const key = 'p-' + crypto.randomBytes(6).toString('hex');
      sessions.set(key, { size: msg.size, sha256: msg.sha256, photoId: null });
      return reply(res, 200, { key, url: urlFor(key) });
    }
    if (req.url === '/uploads/renew') {               // URL expired mid-upload: same key, fresh signature
      const ses = sessions.get(msg.key);
      if (!ses || ses.photoId) return reply(res, 409, { error: 'no open session' });
      return reply(res, 200, { key: msg.key, url: urlFor(msg.key) });
    }
    if (req.url === '/photos') {
      const ses = sessions.get(msg.key), obj = objects.get(msg.key);
      if (!ses || !obj) return reply(res, 404, { error: 'unknown upload' });
      if (ses.photoId) return reply(res, 200, { id: ses.photoId, repeat: true });       // retry of a lost reply: same row
      const hash = crypto.createHash('sha256').update(obj.bytes).digest('hex');
      if (obj.bytes.length !== ses.size || hash !== ses.sha256) return reply(res, 409, { error: 'incomplete', have: obj.bytes.length });
      rows.push({ id: rows.length + 1, key: msg.key, caption: msg.caption, bytes: obj.bytes.length });
      ses.photoId = rows.length; obj.tags.status = 'final';   // commit: frozen, and no longer a lifecycle candidate
      return reply(res, 200, { id: ses.photoId });
    }
    res.statusCode = 404; res.end('{}');
  });
  const ports = { store: await listen(store), app: await listen(app) };
  // Lifecycle rule: expire objects tagged status=pending once they are older than ageMs (the rule matches a tag).
  const sweep = ageMs => { let n = 0; for (const [k, o] of objects) if (o.tags.status === 'pending' && clock.now - o.created > ageMs) { objects.delete(k); n++; } return n; };
  return { clock, ports, objects, rows, sessions, storeStats, appStats, sweep, close: () => { store.close(); app.close(); } };
}

function request(method, url, data, headers = {}) {
  return new Promise((ok, fail) => {
    const r = http.request(url, { method, headers: { 'content-length': data ? data.length : 0, ...headers } }, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body: Buffer.concat(c).toString() }));
    });
    r.on('error', fail); if (data) r.write(data); r.end();
  });
}
const postJSON = (port, path, obj) => request('POST', `http://127.0.0.1:${port}${path}`, Buffer.from(JSON.stringify(obj)), { 'content-type': 'application/json' });

const sha = b => crypto.createHash('sha256').update(b).digest('hex');
// Read a server offset; anything that is not a finite number between `min` and `max` is an error, never "0".
function offsetOf(r, min, max) {
  const o = Number(r.headers['x-offset']);
  if (r.status !== 200 || !Number.isFinite(o) || o < min || o > max) throw new Error(`upload stopped: HTTP ${r.status}, offset ${r.headers['x-offset']}`);
  return o;
}
async function commit(lab, key, caption) {
  const r = await postJSON(lab.ports.app, '/photos', { key, caption });
  return { status: r.status, ...JSON.parse(r.body) };
}
// Client: start a session, PUT the photo in chunks, optionally stop after `stopAfter` chunks.
async function upload(lab, photo, { chunk = 500e3, stopAfter = Infinity, commit: doCommit = true, caption = 'croissant' } = {}) {
  const { key, url } = JSON.parse((await postJSON(lab.ports.app, '/uploads', { size: photo.length, sha256: sha(photo) })).body);
  let sent = 0, offset = 0, chunks = 0;
  while (offset < photo.length && chunks < stopAfter) {
    const part = photo.subarray(offset, offset + chunk);
    const r = await request('PUT', `${url}&offset=${offset}`, part); sent += part.length; chunks++;
    if (r.status !== 200) return { key, url, sent, offset, done: false, status: r.status };
    offset = offsetOf(r, offset + 1, photo.length);
  }
  const done = offset >= photo.length;
  const committed = done && doCommit ? await commit(lab, key, caption) : null;
  return { key, url, sent, offset, done, status: 200, committed };
}
// Resume: ask the store how much arrived (HEAD). If the URL expired, get a fresh one for the SAME key first.
async function resume(lab, up, photo, { chunk = 500e3 } = {}) {
  let url = up.url, renewed = false, h = await request('HEAD', url);
  if (h.status === 403) {
    const r = await postJSON(lab.ports.app, '/uploads/renew', { key: up.key });
    if (r.status !== 200) throw new Error('could not renew the upload URL');
    url = JSON.parse(r.body).url; renewed = true; h = await request('HEAD', url);
  }
  let offset = offsetOf(h, 0, photo.length); const from = offset; let sent = 0;
  while (offset < photo.length) {
    const part = photo.subarray(offset, offset + chunk);
    const r = await request('PUT', `${url}&offset=${offset}`, part); sent += part.length;
    offset = offsetOf(r, offset + 1, photo.length);
  }
  return { resumedFrom: from, sent, renewed, committed: await commit(lab, up.key, 'resumed') };
}
module.exports = { start, upload, resume, commit, request, sign, sha };
