'use strict';
const test = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const http = require('node:http');
const path = require('node:path');
const { fork } = require('node:child_process');
const proto = require('../lib/proto');
const { makeOrders } = require('../lib/orders');
const { delayProxy } = require('../lib/delay');
const { km, rtt } = require('../lib/geo');

test('varint matches the Protobuf spec example: field 1 = 150 → 08 96 01', () => {
  const buf = Buffer.alloc(4);
  buf[0] = (1 << 3) | 0;
  const end = proto.writeVarint(buf, 1, 150);
  assert.strictEqual(buf.subarray(0, end).toString('hex'), '089601');
});

test('varint round trip at the edges; bad numbers refused', () => {
  for (const n of [0, 1, 127, 128, 300, 16383, 16384, 2 ** 31, Number.MAX_SAFE_INTEGER]) {
    const buf = Buffer.alloc(10);
    const end = proto.writeVarint(buf, 0, n);
    assert.strictEqual(end, proto.varintSize(n));
    assert.deepStrictEqual(proto.readVarint(buf, 0), [n, end]);
  }
  for (const bad of [-1, 1.5, 2 ** 53, NaN, Infinity]) {
    assert.throws(() => proto.writeVarint(Buffer.alloc(12), 0, bad));
    assert.throws(() => proto.varintSize(bad));
  }
  assert.throws(() => proto.readVarint(Buffer.from([0x96]), 0));
});

test('encoder refuses bad numbers before sizing (an Infinity id used to loop forever)', () => {
  // Run in a VM with a time limit so a regression fails instead of hanging the suite.
  const vm = require('node:vm'), fs = require('node:fs');
  const ctx = { module: { exports: {} }, require, Buffer };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../lib/proto.js'), 'utf8'), ctx);
  for (const bad of ['Infinity', 'NaN', '1.5', '-1', '2 ** 53']) {
    const o = `({ id: ${bad}, userId: 1, amountPaise: 1, city: 'x', items: [], paid: false })`;
    assert.throws(() => vm.runInContext(`module.exports.encodeOrder(${o})`, ctx, { timeout: 500 }), /safe integer/, bad);
    assert.throws(() => vm.runInContext(`module.exports.encodeList([${o}])`, ctx, { timeout: 500 }), /safe integer/, bad);
  }
});

test('decoder refuses malformed input: nested lengths, long varints, bad keys, bad UTF-8', () => {
  const bad = {
    'Order longer than the list buffer': '0a04220261',
    'Order varint crosses into the next Order': '0a01080a00',
    'varint for 2^53 + 1 (not representable)': '8180808080808010',
    'varint longer than 8 bytes': '808080808080808080808000',
  };
  for (const [what, hex] of Object.entries(bad)) assert.throws(() => proto.decodeList(Buffer.from(hex, 'hex')), what);
  assert.throws(() => proto.readVarint(Buffer.from('8180808080808010', 'hex'), 0), /2\^53/);
  assert.throws(() => proto.decodeOrder(Buffer.from('888080801001', 'hex')), /32 bits/);    // key above 2^32 used to wrap to field 1
  assert.throws(() => proto.decodeOrder(Buffer.from('0001', 'hex')), /field number 0/);
  for (const hex of ['2201ff', '2a01ff', '2202c0af', '2201e2'])                              // bad byte, overlong, cut-off sequence
    assert.throws(() => proto.decodeOrder(Buffer.from(hex, 'hex')), /UTF-8/, hex);
  // a key with field number 16 takes two bytes (80 01); an unknown varint field is skipped
  assert.deepStrictEqual(proto.decodeOrder(Buffer.from('800105', 'hex')).id, 0);
});

test('order round trip, multi-byte text, false bool not written', () => {
  const o = { id: 7, userId: 300, amountPaise: 12345, city: 'Bengaluru 🍛', items: ['dosa', 'chai ☕'], paid: false };
  const buf = proto.encodeOrder(o);
  assert.deepStrictEqual(proto.decodeOrder(buf), o);
  assert.ok(!buf.includes(Buffer.from([(6 << 3) | 0])), 'proto3 leaves out a false bool');
});

test('decoder skips an unknown length-delimited field and refuses a truncated one', () => {
  const o = makeOrders(53, 1)[0];
  const extra = Buffer.from([(9 << 3) | 2, 3, 0x61, 0x62, 0x63]);   // field 9, "abc": a newer schema's field
  assert.deepStrictEqual(proto.decodeOrder(Buffer.concat([proto.encodeOrder(o), extra])), o);
  const enc = proto.encodeOrder(o);
  assert.throws(() => proto.decodeOrder(enc.subarray(0, enc.length - 3)));
});

test('1,000 orders: list round trip equals JSON, and protobuf is smaller', () => {
  const orders = makeOrders(53, 1000);
  const pb = proto.encodeList(orders), json = JSON.stringify(orders);
  assert.strictEqual(JSON.stringify(proto.decodeList(pb)), json);
  assert.ok(pb.length < Buffer.byteLength(json) * 0.6, `${pb.length} vs ${Buffer.byteLength(json)}`);
});

test('geo model: San Francisco → London ≈ 8,616 km, RTT = 2 × distance ÷ 200,000 km/s', () => {
  const d = km('San Francisco', 'London');
  assert.ok(Math.abs(d - 8616) < 2, String(d));
  assert.strictEqual(rtt(100000), 1000);
});

const listen = (srv, port) => new Promise(r => srv.listen(port, '127.0.0.1', r));
const within = (ms, p, what) => {             // rejects after ms, and always clears its own timer
  let timer;
  return Promise.race([p, new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(what + ': no result in ' + ms + ' ms')), ms); })])
    .finally(() => clearTimeout(timer));
};

test('delay proxy keeps distinct chunks in order and adds the modelled delays', async () => {
  const echo = net.createServer(s => s.pipe(s));
  await listen(echo, 6391);
  // The hooks prove what the test needs: 8 separate client chunks were queued while the first was still held for the
  // modelled handshake (accept + 1 RTT + rtt/2 = 60 ms), and none left before that.
  const queuedUp = [];
  let queuedAtFirstSend = -1, nextArrival = null;
  const p = await delayProxy({ listenPort: 6392, targetPort: 6391, rttMs: 40, hooks: {
    queued: (dir, chunk) => { if (dir === 'up' && chunk) { queuedUp.push(String(chunk)); if (nextArrival) nextArrival(); } },
    sent: (dir) => { if (dir === 'up' && queuedAtFirstSend < 0) queuedAtFirstSend = queuedUp.length; },
  } });
  let sock;
  try {
    sock = net.connect(6392, '127.0.0.1');
    await new Promise(r => sock.once('connect', r));
    const want = Array.from({ length: 8 }, (_, i) => `<${i}>`).join('');
    let got = '', gotAll;
    const all = new Promise(r => { gotAll = r; });
    const t0 = Date.now();
    let firstMs = -1;
    sock.on('data', d => { if (firstMs < 0) firstMs = Date.now() - t0; got += d; if (got.length >= want.length) gotAll(); });
    for (let i = 0; i < 8; i++) {                // arrival barrier: write the next chunk only after the proxy queued this one
      const arrived = new Promise(r => { nextArrival = r; });
      sock.write(`<${i}>`);
      await within(1000, arrived, `chunk ${i} reaching the proxy`);
    }
    nextArrival = null;
    assert.deepStrictEqual(queuedUp, Array.from({ length: 8 }, (_, i) => `<${i}>`), 'each chunk arrived on its own');
    await within(2000, all, 'all chunks echoed');
    assert.strictEqual(queuedAtFirstSend, 8, 'all 8 chunks were queued before the first one left');
    assert.strictEqual(got, want);
    assert.ok(firstMs >= 75, `new connection: handshake RTT + one RTT, got ${firstMs} ms`);
    const t1 = Date.now();
    const again = new Promise(r => sock.once('data', () => r(Date.now() - t1)));
    sock.write('x');
    const warmMs = await within(2000, again, 'warm echo');
    assert.ok(warmMs >= 38 && warmMs < 75, `warm connection: one RTT, got ${warmMs} ms`);
  } finally { sock?.destroy(); await p.close(); echo.close(); }
});

test('delay proxy: a client that sends and closes at once still gets its whole reply', async () => {
  const echo = net.createServer(s => s.pipe(s));
  await listen(echo, 6395);
  const p = await delayProxy({ listenPort: 6396, targetPort: 6395, rttMs: 100 });
  let sock;
  try {
    sock = net.connect(6396, '127.0.0.1');
    await new Promise(r => sock.once('connect', r));
    let got = '';
    sock.on('data', d => { got += d; });
    const ended = new Promise(r => sock.once('end', r));     // listener-driven: no polling timer
    sock.end('hello');                          // data and FIN leave together, long before the 150 ms handshake hold
    await within(3000, ended, 'reply end');
    assert.strictEqual(got, 'hello');
  } finally { sock?.destroy(); await p.close(); echo.close(); }
});

test('server counts connections: 3 requests without keep-alive = 3 new, with keep-alive = 0 new', async () => {
  const srv = fork(path.join(__dirname, '../services/server.js'), ['6393', '6394']);
  await new Promise(r => srv.once('message', r));
  const get = (p, agent) => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: 6393, path: p, agent }, res => {
      let b = ''; res.on('data', d => { b += d; }); res.on('end', () => resolve(b));
    }).on('error', reject);
  });
  try {
    await get('/reset', false);
    for (let i = 0; i < 3; i++) await get(`/order/${i}`, false);
    assert.strictEqual(JSON.parse(await get('/stats', false)).connections, 4);   // 3 + the /stats call itself
    const keep = new http.Agent({ keepAlive: true, maxSockets: 1 });
    await get('/reset', keep);
    for (let i = 0; i < 3; i++) await get(`/order/${i}`, keep);
    // the keep-alive socket opened before /reset zeroed the counter; the 3 orders and /stats reuse it
    assert.strictEqual(JSON.parse(await get('/stats', keep)).connections, 0);
    keep.destroy();
  } finally { srv.kill(); }
});
