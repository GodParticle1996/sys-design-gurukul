'use strict';
// ex2-serialize: 1,00,000 orders as JSON and as a Protobuf-wire encoding. Bytes, gzip bytes, elapsed time and CPU time.
// Equal boundaries: both formats start from objects and end at wire bytes (JSON includes its UTF-8 step both ways).
const zlib = require('node:zlib');
const { makeOrders } = require('../lib/orders');
const proto = require('../lib/proto');

const N = 100000, REPEAT = 5;
const orders = makeOrders(53, N);
const json = JSON.stringify(orders);
const jsonBuf = Buffer.from(json);
const pb = proto.encodeList(orders);
const jsonGz = zlib.gzipSync(jsonBuf), pbGz = zlib.gzipSync(pb);
if (JSON.stringify(proto.decodeList(pb)) !== json) throw new Error('round trip failed');

// Every operation gets the same untimed warm-up, then REPEAT rounds in rotating order; median elapsed and median
// process CPU (user + system, all threads) per operation.
const ops = {
  jEnc: () => Buffer.from(JSON.stringify(orders), 'utf8'),
  jDec: () => JSON.parse(jsonBuf.toString('utf8')),
  pEnc: () => proto.encodeList(orders),
  pDec: () => proto.decodeList(pb),
  gzJ: () => zlib.gzipSync(jsonBuf),
  gunJ: () => zlib.gunzipSync(jsonGz),
};
const mb = n => (n / 1e6).toFixed(2) + ' MB';

const names = Object.keys(ops), wall = {}, cpu = {};
for (const k of names) { ops[k](); ops[k](); wall[k] = []; cpu[k] = []; }      // equal warm-up
for (let r = 0; r < REPEAT; r++) {
  for (let i = 0; i < names.length; i++) {
    const k = names[(i + r) % names.length];                                  // rotate the order each round
    const c0 = process.cpuUsage(), t0 = process.hrtime.bigint();
    ops[k]();
    const dt = Number(process.hrtime.bigint() - t0) / 1e6, dc = process.cpuUsage(c0);
    wall[k].push(dt); cpu[k].push((dc.user + dc.system) / 1000);
  }
}
const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const T = k => `${med(wall[k]).toFixed(0)}/${med(cpu[k]).toFixed(0)}`;

console.log(`REAL RUN: Node ${process.version}; ${N.toLocaleString('en-IN')} seeded orders; each time = median of ${REPEAT}; timings change run to run`);
console.log('protobuf = hand-written Protobuf wire format (varint + length-delimited) in plain JavaScript, no library');
console.log('round trip: decode(encode(orders)) equals the original for both formats');
console.log('');
console.log('one order, JSON :', JSON.stringify(orders[0]));
console.log(`one order bytes: JSON ${Buffer.byteLength(JSON.stringify(orders[0]))}, protobuf ${proto.encodeOrder(orders[0]).length}`);
console.log('');
console.log('times = elapsed/CPU ms (CPU = user + system of the whole process); objects ↔ wire bytes for both formats');
console.log('format     bytes      gzip bytes   encode     decode');
console.log(`JSON       ${mb(jsonBuf.length).padStart(9)}  ${mb(jsonGz.length).padStart(10)}  ${(T('jEnc') + ' ms').padStart(9)}  ${(T('jDec') + ' ms').padStart(9)}`);
console.log(`protobuf   ${mb(pb.length).padStart(9)}  ${mb(pbGz.length).padStart(10)}  ${(T('pEnc') + ' ms').padStart(9)}  ${(T('pDec') + ' ms').padStart(9)}`);
console.log('');
console.log(`protobuf ÷ JSON bytes: ${(pb.length / jsonBuf.length * 100).toFixed(0)}%; after gzip: ${(pbGz.length / jsonGz.length * 100).toFixed(0)}%`);
console.log(`gzip of the JSON: ${T('gzJ')} ms to compress, ${T('gunJ')} ms to decompress (elapsed/CPU)`);
console.log('');
console.log('gzip depends on how much goes in ONE compressed response (bytes, same seeded orders):');
console.log('orders per response   JSON gzip   protobuf gzip   protobuf ÷ JSON');
for (const n of [1, 10, 100, 1000, N]) {
  const part = orders.slice(0, n);
  const jg = zlib.gzipSync(Buffer.from(JSON.stringify(part), 'utf8')).length, pg = zlib.gzipSync(proto.encodeList(part)).length;
  console.log(`${n.toLocaleString('en-IN').padStart(19)}   ${jg.toLocaleString('en-IN').padStart(9)}   ${pg.toLocaleString('en-IN').padStart(13)}   ${(pg / jg * 100).toFixed(0).padStart(14)}%`);
}
