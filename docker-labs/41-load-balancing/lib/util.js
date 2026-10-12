/* Chhoti helpers — koi npm dependency nahi (Node 18+ ka built-in http/fetch kaafi hai) */
const http = require('http');

function host(name) { return process.env[name.toUpperCase().replace(/-/g, '_') + '_HOST'] || 'localhost'; }

function serve(port, routes, onReady) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const key = req.method + ' ' + url.pathname;
    let handler = routes[key];
    if (!handler) {
      for (const k of Object.keys(routes)) {
        const [m, p] = k.split(' ');
        if (m !== req.method || !p.includes(':')) continue;
        const pp = p.split('/'), up = url.pathname.split('/');
        if (pp.length !== up.length) continue;
        const params = {};
        let ok = true;
        for (let i = 0; i < pp.length; i++) {
          if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(up[i]);
          else if (pp[i] !== up[i]) { ok = false; break; }
        }
        if (ok) { handler = (rq, rs, u, _ignored, body) => routes[k](rq, rs, u, params, body); break; }
      }
    }
    if (!handler) { res.writeHead(404); return res.end('{"error":"not found"}'); }
    try {
      const body = await readBody(req);
      const out = await handler(req, res, url, {}, body);
      if (out !== undefined && !res.writableEnded) json(res, 200, out);
    } catch (e) {
      if (!res.writableEnded) json(res, 500, { error: String(e && e.message || e) });
    }
  });
  server.listen(port, () => onReady && onReady(server));
  return server;
}

function readBody(req) {
  return new Promise(resolve => {
    if (req.method === 'GET' || req.method === 'HEAD') return resolve(null);
    let b = '';
    req.on('data', c => (b += c));
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : null); } catch (e) { resolve(b); } });
  });
}

function json(res, code, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(s) });
  res.end(s);
}

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
/* jab status bhi chahiye ho (drop/reject gin-ne ke liye) */
async function getRaw(url) {
  const r = await fetch(url);
  let body = null;
  try { body = await r.json(); } catch (e) {}
  return { status: r.status, ok: r.ok, body };
}
/* POST jab status bhi chahiye (503 / Retry-After gin-ne ke liye). Connection toota → { status: 0 } */
async function postRaw(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
    let b = null; try { b = await r.json(); } catch (e) {}
    return { status: r.status, ok: r.ok, body: b, retryAfter: +(r.headers.get('retry-after') || 0) };
  } catch (e) { return { status: 0, ok: false, body: null, retryAfter: 0 }; }
}
async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  return r.json();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function pct(arr, p) {
  if (!arr.length) return 0;
  const a = arr.slice().sort((x, y) => x - y);
  return Math.round(a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))]);
}

/* busy-wait CPU work — "mehenga kaam" ko asli banane ke liye.
   hrtime se sub-millisecond bhi theek se chalta hai (Date.now() sirf ms deta hai). */
function burn(ms) {
  const end = process.hrtime.bigint() + BigInt(Math.round(ms * 1e6));
  let x = 0;
  while (process.hrtime.bigint() < end) x += Math.sqrt(x + 1);
  return x;
}

module.exports = { serve, json, get, getRaw, post, postRaw, sleep, pct, burn, host };
