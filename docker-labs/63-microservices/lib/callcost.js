'use strict';
// ASLI: the same "check stock" question asked four ways, timed on this machine.
const http = require('node:http');
const { percentile } = require('./stats');
const stock = new Map([['sku-42', { sku: 'sku-42', count: 17, warehouse: 'BLR-1', reserved: 3 }]]);
function checkStock(sku) { const s = stock.get(sku); return s ? s.count - s.reserved : 0; }   // the "inventory module"
const order = { orderId: 'ord-1001', sku: 'sku-42', qty: 2, user: { id: 'u-77', name: 'Asha', city: 'Pune' },
  items: Array.from({ length: 8 }, (_, i) => ({ sku: `sku-${i}`, qty: 1, price: 199 + i })) };   // ~0.4 KB as JSON

function timeLoop(n, fn) {                                   // ns per call: the BEST of 5 batch averages (not a median)
  let best = Infinity;
  for (let b = 0; b < 5; b++) {
    const t = process.hrtime.bigint();
    for (let i = 0; i < n; i++) fn(i);
    best = Math.min(best, Number(process.hrtime.bigint() - t) / n);
  }
  return best;
}
let sink = 0;
// Same question every time: is sku-42 in stock? (V8 may inline checkStock into the loop — that is part of the in-process case.)
const fnCall = () => timeLoop(2e6, () => { sink += checkStock(order.sku); });
// Same work as the HTTP path minus the transport: serialize the request, parse it, answer, serialize the reply, parse it.
const jsonRound = () => timeLoop(2e4, () => {
  const req = JSON.parse(JSON.stringify(order));
  sink += JSON.parse(JSON.stringify({ sku: req.sku, available: checkStock(req.sku) })).available;
});

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let body = ''; req.on('data', d => (body += d));
      req.on('end', () => { const o = JSON.parse(body); rsp.setHeader('content-type', 'application/json'); rsp.end(JSON.stringify({ sku: o.sku, available: checkStock(o.sku) })); });
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}
async function httpCalls(srv, n, keepAlive) {               // sequential requests, one at a time; per-call µs samples
  let last = null;
  const agent = new http.Agent({ keepAlive, maxSockets: 1 });
  const port = srv.address().port, samples = [];
  const one = () => new Promise((res, rej) => {
    const t = process.hrtime.bigint();
    const body = JSON.stringify(order);                     // serialize inside the timed call, like the JSON row
    const r = http.request({ host: '127.0.0.1', port, path: '/stock', method: 'POST', agent, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, rsp => {
      let d = ''; rsp.on('data', c => (d += c)); rsp.on('end', () => { const a = JSON.parse(d).available; sink += a; last = { status: rsp.statusCode, available: a }; samples.push(Number(process.hrtime.bigint() - t) / 1000); res(); });
    });
    r.on('error', rej); r.end(body);
  });
  for (let i = 0; i < 200; i++) await one();                // warm-up
  samples.length = 0;
  for (let i = 0; i < n; i++) await one();
  agent.destroy();
  return { p50: percentile(samples, 50), p99: percentile(samples, 99), last };
}
module.exports = { checkStock, fnCall, jsonRound, serve, httpCalls, order, sinkValue: () => sink };
