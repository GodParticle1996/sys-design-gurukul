'use strict';
// ex1 — four tiny HTTP services in one process (127.0.0.1, random ports). Real HTTP, real headers, real timers.
// gateway → auth, then gateway → product → db. The db "join" for a big catalog is an injected sleep.
const http = require('node:http');
const { performance } = require('node:perf_hooks');
const { rng } = require('./rng');

// W3C Trace Context: version-traceid-parentid-flags, lowercase hex. Version ff is invalid; version 00 has exactly four
// fields; a higher version may append fields, and its first four are still read (§3.2.4). All-zero ids are invalid.
const TRACEPARENT = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})(-.*)?$/;
function parseTraceparent(h) {
  const m = TRACEPARENT.exec(h || '');
  if (!m) return null;
  const [, version, trace, parent, , rest] = m;
  if (version === 'ff' || (version === '00' && rest !== undefined)) return null;
  if (/^0+$/.test(trace) || /^0+$/.test(parent)) return null;
  return { trace, parent };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const agent = new http.Agent({ keepAlive: true });
function get(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path, headers, agent }, res => {
      let body = ''; res.on('data', d => body += d); res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

// skewMs: how far each service's wall clock is off (maana hua). dropHeaderAt: a service that forgets to forward traceparent.
async function startMesh({ seed = 7, skewMs = { product: -50 }, dropHeaderAt = null, slowJoinMs = 300 } = {}) {
  const r = rng(seed), hex = n => { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(r() * 16).toString(16); return s; };
  const spans = [], logs = [], ports = {}, servers = [];
  const clock = svc => Date.now() + (skewMs[svc] || 0);
  function service(name, work) {
    const srv = http.createServer(async (req, res) => {
      const ctx = parseTraceparent(req.headers.traceparent);        // invalid or missing → start a fresh trace
      const trace = ctx ? ctx.trace : hex(32), parent = ctx ? ctx.parent : null, span = hex(16);
      const url = new URL(req.url, 'http://local'), t0 = performance.now(), start = clock(name);
      const log = msg => logs.push({ ts: clock(name), service: name, trace_id: trace, msg });
      const call = (to, path) => get(ports[to], path, dropHeaderAt === name ? {} : { traceparent: `00-${trace}-${span}-01` });
      const out = await work({ url, log, call });
      spans.push({ trace, span, parent, service: name, op: url.pathname, start, durMs: performance.now() - t0 });
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(out));
    });
    servers.push(srv);
    return new Promise(ok => srv.listen(0, '127.0.0.1', () => { ports[name] = srv.address().port; ok(); }));
  }
  await service('db', async ({ url, log }) => {
    const sku = url.searchParams.get('sku');
    if (sku.startsWith('big')) { log(`join shuru: ${sku} (bada catalog)`); await sleep(slowJoinMs); } else await sleep(1);
    log('query khatam'); return { price: 499 };
  });
  await service('product', async ({ url, log, call }) => {
    log('price dhoondh raha'); const row = await call('db', `/query?sku=${url.searchParams.get('sku')}`); log('price mila'); return row;
  });
  await service('auth', async ({ log }) => { await sleep(2); log('token theek'); return { ok: true }; });
  await service('gateway', async ({ url, log, call }) => {
    const sku = url.searchParams.get('sku'); log(`request aaya: ${sku}`);
    await call('auth', '/check'); const p = await call('product', `/price?sku=${sku}`);
    log('jawab bheja'); return p;
  });
  return { ports, spans, logs, close: () => { agent.destroy(); for (const s of servers) s.close(); } };
}

// n requests one after another; request i asks for a big catalog when i % 50 === 37 (4 of 200).
async function runLoad(mesh, n = 200) {
  for (let i = 0; i < n; i++) await get(mesh.ports.gateway, `/checkout?sku=${i % 50 === 37 ? 'big-7' : 'sku-' + (i % 50)}`);
}

// Rebuild one trace as a tree using parent span ids (not timestamps). A local root is a span whose parent is null or
// belongs to a caller outside this lab (an incoming traceparent); the external parent id is kept on the span.
function tree(spans, traceId) {
  const mine = spans.filter(s => s.trace === traceId), ids = new Set(mine.map(s => s.span)), out = [];
  const walk = (kids, depth) => kids.forEach(s => { out.push({ ...s, depth }); walk(mine.filter(c => c.parent === s.span), depth + 1); });
  walk(mine.filter(s => s.parent === null || !ids.has(s.parent)), 0);
  return out;
}
module.exports = { startMesh, runLoad, tree, parseTraceparent, get };
