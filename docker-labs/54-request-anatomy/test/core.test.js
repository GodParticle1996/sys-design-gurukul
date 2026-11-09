'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const dgram = require('node:dgram');
const path = require('node:path');
const { fork } = require('node:child_process');
const { Resolver } = require('node:dns').promises;
const wire = require('../lib/dnswire');
const { startZones, resolver, ask, answer, ZONES, authServer, PORT } = require('../lib/dns');
const { rules, scan } = require('../lib/waf');
const { best, covers } = require('../lib/bgp');
const { km } = require('../lib/geo');
const { percentile } = require('../lib/stats');
const { TYPE, FLAG, RCODE } = wire;

const header = (id, flags, qd, an, ns, ar) => { const b = Buffer.alloc(12); [id, flags, qd, an, ns, ar].forEach((v, i) => b.writeUInt16BE(v, i * 2)); return b; };
const udp = (ip, port) => new Promise((resolve, reject) => { const s = dgram.createSocket('udp4'); s.once('error', reject); s.bind(port, ip, () => resolve(s)); });

test('DNS wire format: round trip of a reply with answer, referral and glue', () => {
  const msg = { id: 4242, flags: FLAG.QR | FLAG.AA, question: { name: 'api.khanakart.com', type: TYPE.A },
    answers: [{ name: 'api.khanakart.com', type: TYPE.A, ttl: 300, data: '10.0.0.12' }],
    authority: [{ name: 'khanakart.com', type: TYPE.NS, ttl: 172800, data: 'ns1.khanakart.com' }],
    additional: [{ name: 'ns1.khanakart.com', type: TYPE.A, ttl: 172800, data: '127.0.0.4' }] };
  const back = wire.decode(wire.encode(msg));
  assert.strictEqual(back.id, 4242);
  assert.deepStrictEqual(back.question, { name: 'api.khanakart.com.', type: TYPE.A, class: 1 });
  assert.deepStrictEqual(back.answers.map(a => a.data), ['10.0.0.12']);
  assert.deepStrictEqual(back.authority.map(a => a.data), ['ns1.khanakart.com.']);
  assert.deepStrictEqual(back.additional.map(a => [a.name, a.data]), [['ns1.khanakart.com.', '127.0.0.4']]);
});

test('DNS names: pointers followed; overlong, aliased or invalid names refused', () => {
  const base = wire.nameBytes('khanakart.com');
  const buf = Buffer.concat([base, Buffer.from([3, 0x61, 0x70, 0x69, 0xc0, 0x00])]);
  assert.deepStrictEqual(wire.readName(buf, base.length), ['api.khanakart.com.', buf.length]);
  assert.throws(() => wire.readName(Buffer.from([0xc0, 0x05, 0, 0, 0, 0]), 0), /backwards/);
  const label63 = Buffer.concat([Buffer.from([63]), Buffer.alloc(63, 0x61)]);
  const five = Buffer.concat([label63, label63, label63, label63, label63, Buffer.from([0])]);          // 321 bytes
  assert.throws(() => wire.readName(five, 0), /255/);
  const three = Buffer.concat([label63, label63, label63, Buffer.from([0])]);                          // 193 bytes, fine
  const viaPointer = Buffer.concat([three, label63, Buffer.from([0xc0, 0x00])]);                       // 64 + 193 = 257
  assert.throws(() => wire.readName(viaPointer, three.length), /255/, 'compression cannot build an overlong name');
  assert.throws(() => wire.nameBytes('api..khanakart.com'), /bad label/);
  assert.throws(() => wire.nameBytes('a'.repeat(64) + '.com'), /bad label/);
  assert.throws(() => wire.readName(Buffer.from([1, 0xe1, 0]), 0), /hostname subset/, 'high-bit byte is not silently changed');
  assert.throws(() => wire.readName(Buffer.from([3, 0x61, 0x2e, 0x62, 0]), 0), /hostname subset/, 'a dot inside a label is not two labels');
  assert.deepStrictEqual(wire.readName(Buffer.from([0]), 0), ['.', 1]);
});

test('DNS records: A and NS data lengths, class, IPv4 text are checked', () => {
  const ok = wire.encode({ id: 1, flags: FLAG.QR, question: { name: 'a.com', type: TYPE.NS },
    answers: [{ name: 'a.com', type: TYPE.NS, ttl: 1, data: 'b.com' }, { name: 'b.com', type: TYPE.A, ttl: 1, data: '1.2.3.4' }] });
  assert.strictEqual(wire.decode(ok).answers.length, 2);
  const nsLen = 12 + 7 + 4 + 7 + 8;            // header, question, then NS record: name(7) type class ttl → RDLENGTH here
  const shortNs = Buffer.from(ok); shortNs.writeUInt16BE(1, nsLen);
  assert.throws(() => wire.decode(shortNs), /NS name|past the end|runs past|extra/);
  const aLen = nsLen + 2 + 7 + 7 + 8;           // after NS RDATA (b.com = 7 bytes): A record's RDLENGTH
  const shortA = Buffer.from(ok); shortA.writeUInt16BE(3, aLen);
  assert.throws(() => wire.decode(shortA), /4 bytes|extra|past/);
  const chaos = Buffer.from(ok); chaos.writeUInt16BE(3, 12 + 7 + 2);   // question class CH
  assert.throws(() => wire.decode(chaos), /class IN/);
  for (const bad of ['300.0.0.1', '-1.0.0.1', 'abc.0.0.1', '1.2.3']) {
    assert.throws(() => wire.encode({ id: 1, answers: [{ name: 'a.com', type: TYPE.A, ttl: 1, data: bad }] }), /IPv4/, bad);
  }
});

test('authoritative logic: referral before data, NODATA vs NXDOMAIN, parent never answers for the child', () => {
  const tldNs = answer(ZONES.tld, 'khanakart.com', TYPE.NS);
  assert.ok(!tldNs.aa && !tldNs.answers && tldNs.authority.length === 1 && tldNs.additional.length === 1, 'parent refers');
  const apex = answer(ZONES.auth, 'khanakart.com', TYPE.NS);
  assert.ok(apex.aa && apex.answers[0].data === 'ns1.khanakart.com.', 'child answers its own NS');
  const nodata = answer(ZONES.auth, 'api.khanakart.com', TYPE.NS);
  assert.ok(nodata.aa && !nodata.rcode && nodata.answers.length === 0, 'name exists, type does not: NOERROR, empty');
  assert.strictEqual(answer(ZONES.auth, 'nope.khanakart.com', TYPE.A).rcode, RCODE.NXDOMAIN);
  assert.strictEqual(answer(ZONES.auth, 'example.org', TYPE.A).rcode, RCODE.REFUSED);
});

test('a malformed or overlong query does not crash a server; normal queries still work', async () => {
  const srv = await authServer({ ...ZONES.auth, ip: '127.0.0.5', delayMs: 0 });
  const raw = await udp('127.0.0.1', 0);
  try {
    const label63 = Buffer.concat([Buffer.from([63]), Buffer.alloc(63, 0x61)]);
    raw.send(Buffer.concat([header(9, 0, 1, 0, 0, 0), label63, label63, label63, label63, label63, Buffer.from([0, 0, 1, 0, 1])]), PORT, '127.0.0.5');
    raw.send(Buffer.from([1, 2, 3]), PORT, '127.0.0.5');
    await new Promise(r => setTimeout(r, 50));
    const { reply } = await ask('127.0.0.5', PORT, 'api.khanakart.com', TYPE.A, { timeoutMs: 500 });
    assert.strictEqual(reply.answers[0].data, '10.0.0.12');
  } finally { raw.close(); await srv.close(); }
});

test('ask() accepts only the real reply: right source, QR, ID, name and type', async () => {
  const fake = await udp('127.0.0.1', 6589), other = await udp('127.0.0.1', 6588);
  fake.on('message', (buf, from) => {
    const q = wire.decode(buf);
    const ans = data => [{ name: q.question.name, type: TYPE.A, ttl: 60, data }];
    const reply = (over) => wire.encode({ id: q.id, flags: FLAG.QR, question: q.question, answers: ans('10.9.9.9'), ...over });
    other.send(reply({ answers: ans('6.6.6.1') }), from.port, from.address);                                   // wrong source port
    fake.send(reply({ flags: 0, answers: ans('6.6.6.2') }), from.port, from.address);                          // not a response
    fake.send(reply({ id: (q.id + 1) % 65536, answers: ans('6.6.6.3') }), from.port, from.address);            // wrong ID
    fake.send(reply({ question: { name: q.question.name, type: TYPE.NS }, answers: [] }), from.port, from.address);   // wrong type
    fake.send(reply({ question: { name: 'evil.example', type: TYPE.A }, answers: [{ name: 'evil.example', type: TYPE.A, ttl: 60, data: '6.6.6.5' }] }), from.port, from.address);
    setTimeout(() => fake.send(reply({}), from.port, from.address), 20);                                       // the real one
  });
  try {
    const { reply } = await ask('127.0.0.1', 6589, 'api.khanakart.com', TYPE.A, { timeoutMs: 1000 });
    assert.deepStrictEqual(reply.answers.map(a => a.data), ['10.9.9.9']);
  } finally { fake.close(); other.close(); }
});

test('resolver trusts only relevant records: unrelated answers and extra glue are not cached', async () => {
  const zones = await startZones();
  const fakeRoot = await udp('127.0.0.6', PORT);
  let mode = 'unrelated-answer';
  fakeRoot.on('message', (buf, from) => {
    const q = wire.decode(buf);
    const base = { id: q.id, flags: FLAG.QR, question: q.question };
    const msg = mode === 'unrelated-answer'
      ? { ...base, answers: [{ name: 'unrelated.example', type: TYPE.A, ttl: 60, data: '6.6.6.6' }] }
      : { ...base, authority: ZONES.root.delegations, additional: [...ZONES.root.glue, { name: 'bank.example', type: TYPE.A, ttl: 86400, data: '6.6.6.6' }] };
    fakeRoot.send(wire.encode(msg), from.port, from.address);
  });
  const res = await resolver({ port: 6587, rootIp: '127.0.0.6' });
  try {
    const first = await res.resolve('api.khanakart.com');
    assert.strictEqual(first.rcode, RCODE.SERVFAIL, 'an answer for another name is not success');
    assert.ok(![...res.cache.keys()].some(k => k.startsWith('unrelated.example')));
    mode = 'referral-with-extra';
    const second = await res.resolve('api.khanakart.com');
    assert.strictEqual(second.answers[0].data, '10.0.0.12', 'the real referral is still followed');
    assert.ok(![...res.cache.keys()].some(k => k.startsWith('bank.example')), 'unrelated additional record was not cached');
  } finally { await res.close(); fakeRoot.close(); await zones.close(); }
});

test('real UDP chain: cold walks root → TLD → authoritative, warm is cached, NXDOMAIN, NODATA, c-ares agrees', async () => {
  const zones = await startZones();
  const res = await resolver({ port: 6591 });
  try {
    const cold = await res.resolve('api.khanakart.com');
    assert.deepStrictEqual(cold.trace.map(t => t.server), ['root (.)', 'TLD (.com)', 'authoritative (khanakart.com)']);
    assert.strictEqual(cold.answers[0].data, '10.0.0.12');
    assert.strictEqual((await res.resolve('api.khanakart.com')).fromCache, true);
    const sibling = await res.resolve('img.khanakart.com');
    assert.deepStrictEqual(sibling.trace.map(t => t.server), ['authoritative (khanakart.com)'], 'referrals were cached');
    assert.strictEqual((await res.resolve('nope.khanakart.com')).rcode, RCODE.NXDOMAIN);
    const nodata = await res.resolve('api.khanakart.com', TYPE.NS);
    assert.ok(nodata.rcode === RCODE.NOERROR && nodata.answers.length === 0, 'NODATA stays NOERROR');
    const node = new Resolver();
    node.setServers(['127.0.0.1:6591']);
    assert.deepStrictEqual(await node.resolve4('img.khanakart.com'), ['10.0.0.13']);
  } finally { await res.close(); await zones.close(); }
});

test('TTL: the cached answer counts down and expires; then the resolver asks again', async () => {
  const zones = await startZones();
  let t = 1_000_000;
  const res = await resolver({ port: 6592, now: () => t });
  try {
    await res.resolve('api.khanakart.com');
    t += 120_000;
    const mid = await res.resolve('api.khanakart.com');
    assert.strictEqual(mid.fromCache, true);
    assert.strictEqual(mid.answers[0].ttl, 180, '300 s TTL minus 120 s');
    t += 181_000;
    const again = await res.resolve('api.khanakart.com');
    assert.ok(!again.fromCache);
    assert.deepStrictEqual(again.trace.map(x => x.server), ['authoritative (khanakart.com)'], 'NS referrals (2-day TTL) still cached');
  } finally { await res.close(); await zones.close(); }
});

test('UDP loss: a retried lookup waits the timeout; total loss fails after the last try', async () => {
  const zones = await startZones();
  const lossy = await resolver({ port: 6593, lossRate: 0.5, seed: 3 });
  const dead = await resolver({ port: 6594, lossRate: 1 });
  try {
    await lossy.resolve('api.khanakart.com');
    const retried = [];
    for (let i = 0; i < 12; i++) {
      let r = null;
      try { r = await ask('127.0.0.1', 6593, 'api.khanakart.com', TYPE.A, { timeoutMs: 100, attempts: 3 }); } catch (e) { if (!/after 3 tries/.test(e.message)) throw e; }
      if (r && r.tries > 1) retried.push(r);
    }
    assert.ok(retried.length > 0, 'some lookups needed a retry');
    for (const r of retried) assert.ok(r.ms >= 95 * (r.tries - 1), `${r.tries} tries must wait ${r.tries - 1} timeouts, got ${r.ms} ms`);
    const t0 = Date.now();
    await assert.rejects(ask('127.0.0.1', 6594, 'api.khanakart.com', TYPE.A, { timeoutMs: 100, attempts: 2 }), /after 2 tries/);
    assert.ok(Date.now() - t0 >= 195, 'two full timeouts');
  } finally { await lossy.close(); await dead.close(); await zones.close(); }
});

test('L4 proxy is path-blind (one connection → one backend); L7 routes each request by path', async () => {
  const svc = path.join(__dirname, '../services/lb.js');
  const procs = [];
  const start = argv => new Promise((resolve, reject) => {     // rejects if the child dies or never says ready
    const p = fork(svc, argv);
    procs.push(p);
    const timer = setTimeout(() => reject(new Error(argv.join(' ') + ': no ready in 5 s')), 5000);
    p.once('message', m => { clearTimeout(timer); m === 'ready' ? resolve(p) : reject(new Error('bad start')); });
    p.once('error', e => { clearTimeout(timer); reject(e); });
    p.once('exit', c => { clearTimeout(timer); reject(new Error(argv.join(' ') + ' exited ' + c)); });
  });
  const get = (port, p, agent) => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: p, agent }, res => { let b = ''; res.on('data', d => { b += d; }); res.on('end', () => resolve(JSON.parse(b).backend)); }).on('error', reject);
  });
  try {
    await start(['backend', 'A', '6595']); await start(['backend', 'B', '6596']);
    await start(['l4', '6597', '6595', '6596']); await start(['l7', '6598', '6595', '6596']);
    const keep4 = new http.Agent({ keepAlive: true, maxSockets: 1 }), keep7 = new http.Agent({ keepAlive: true, maxSockets: 1 });
    const l4 = [await get(6597, '/api/1', keep4), await get(6597, '/img/1', keep4), await get(6597, '/img/2', keep4)];
    const l7 = [await get(6598, '/api/1', keep7), await get(6598, '/img/1', keep7), await get(6598, '/img/2', keep7)];
    keep4.destroy(); keep7.destroy();
    assert.ok(l4.every(b => b === l4[0]), `one kept-alive connection through L4 always reaches one backend: ${l4}`);
    assert.deepStrictEqual(l7, ['A', 'B', 'B']);
    const fresh = [await get(6597, '/api/x', false), await get(6597, '/api/y', false)];
    assert.notStrictEqual(fresh[0], fresh[1], 'new connections alternate backends, whatever the path');
  } finally { for (const p of procs) p.kill(); }
});

test('WAF: an attack is caught by its rule; a clean body passes all 2,000 rules', () => {
  const rs = rules(2000);
  assert.strictEqual(rs.length, 2000);
  assert.strictEqual(scan(rs, '{"q":"1 UNION SELECT password FROM users"}'), 0);
  assert.strictEqual(scan(rs, '<img src=x onerror=alert(1)>'), 5);
  assert.strictEqual(scan(rs, JSON.stringify({ id: 1, city: 'Pune', items: ['masala dosa'] })), -1);
});

test('BGP model: per-prefix choice by LOCAL_PREF then AS path; forwarding by longest prefix; helpers', () => {
  assert.ok(covers('203.0.112.0/22', '203.0.113.10') && !covers('203.0.113.0/24', '203.0.112.10'));
  const routes = [
    { to: 'peer', prefix: '203.0.112.0/22', localPref: 100, asPath: [1, 2] },
    { to: 'cheap', prefix: '203.0.112.0/22', localPref: 150, asPath: [1, 2, 3] },
    { to: 'leak', prefix: '203.0.113.0/24', localPref: 50, asPath: [1, 2, 3, 4] },
  ];
  assert.strictEqual(best(routes.slice(0, 2), '203.0.113.10').to, 'cheap');
  assert.strictEqual(best(routes, '203.0.113.10').to, 'leak');
  assert.strictEqual(best(routes, '203.0.112.10').to, 'cheap');
  assert.ok(Math.abs(km('Mumbai', 'Singapore') - 3904) < 3);
  assert.strictEqual(percentile([5, 1, 3, 2, 4], 50), 3);
});
