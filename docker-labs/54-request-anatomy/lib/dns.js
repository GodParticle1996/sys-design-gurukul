'use strict';
// Real UDP DNS on loopback: authoritative servers (root, .com, khanakart.com) on their own loopback addresses, a recursive
// resolver with a TTL cache, and a stub client. MODEL: loopback is instant, so every server waits its modelled round trip
// (delayMs) before replying, and may drop a share of incoming queries (lossRate, seeded) to model lost UDP packets.
const dgram = require('node:dgram');
const { TYPE, FLAG, RCODE, canon, encode, decode } = require('./dnswire');

const PORT = 6510;                             // every DNS server listens on this port, like real servers on 53
// Each server: the zone it is authoritative for, its own records, the child zones it delegates (NS) and their glue (A).
const ZONES = {
  root: { ip: '127.0.0.2', label: 'root (.)', delayMs: 20, zone: '.', records: [],
    delegations: [{ name: 'com.', type: TYPE.NS, ttl: 172800, data: 'a.gtld-servers.net.' }],
    glue: [{ name: 'a.gtld-servers.net.', type: TYPE.A, ttl: 172800, data: '127.0.0.3' }] },
  tld: { ip: '127.0.0.3', label: 'TLD (.com)', delayMs: 30, zone: 'com.', records: [],
    delegations: [{ name: 'khanakart.com.', type: TYPE.NS, ttl: 172800, data: 'ns1.khanakart.com.' }],
    glue: [{ name: 'ns1.khanakart.com.', type: TYPE.A, ttl: 172800, data: '127.0.0.4' }] },
  auth: { ip: '127.0.0.4', label: 'authoritative (khanakart.com)', delayMs: 40, zone: 'khanakart.com.', delegations: [], glue: [],
    records: [
      { name: 'khanakart.com.', type: TYPE.NS, ttl: 172800, data: 'ns1.khanakart.com.' },
      { name: 'khanakart.com.', type: TYPE.A, ttl: 300, data: '10.0.0.10' },
      { name: 'api.khanakart.com.', type: TYPE.A, ttl: 300, data: '10.0.0.12' },
      { name: 'img.khanakart.com.', type: TYPE.A, ttl: 300, data: '10.0.0.13' },
      { name: 'ns1.khanakart.com.', type: TYPE.A, ttl: 172800, data: '127.0.0.4' },
    ] },
};

function rng(seed) {                           // mulberry32: seeded, so the same packets drop every run
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const isUnder = (name, zone) => zone === '.' || name === zone || name.endsWith('.' + zone);
const sendSafely = (sock, msg, port, address, fallback) => {   // a reply that cannot be encoded becomes SERVFAIL, never a crash
  let bytes;
  try { bytes = encode(msg); } catch { try { bytes = encode(fallback); } catch { return; } }
  sock.send(bytes, port, address);
};

// Authoritative logic (RFC 1034 §4.3.2, simplified): a child zone cut first (referral, AA clear); then this zone's own
// data — answer (AA), NODATA (name exists, type does not: NOERROR, empty, AA) or NXDOMAIN (name does not exist).
function answer(z, qname, qtype) {
  const name = canon(qname);
  if (!isUnder(name, z.zone)) return { rcode: RCODE.REFUSED };
  const cut = z.delegations.filter(r => isUnder(name, r.name)).sort((x, y) => y.name.length - x.name.length)[0];
  if (cut) {
    const authority = z.delegations.filter(r => r.name === cut.name);
    return { authority, additional: z.glue.filter(g => authority.some(ns => ns.data === g.name)) };
  }
  const owner = z.records.filter(r => r.name === name);
  if (!owner.length) return { aa: true, rcode: RCODE.NXDOMAIN };
  return { aa: true, answers: owner.filter(r => r.type === qtype) };
}

function authServer({ ip, delayMs = 0, lossRate = 0, seed = 1, ...z }) {
  const sock = dgram.createSocket('udp4');
  const drop = rng(seed);
  const stats = { queries: 0, dropped: 0 };
  sock.on('message', (buf, from) => {
    let q;
    try { q = decode(buf); } catch { return; }           // malformed: ignore
    if (!q.question || (q.flags & FLAG.QR) || q.opcode !== 0) return;
    stats.queries++;
    if (lossRate && drop() < lossRate) { stats.dropped++; return; }
    const a = answer(z, q.question.name, q.question.type);
    const reply = { id: q.id, flags: FLAG.QR | (q.flags & FLAG.RD) | (a.aa ? FLAG.AA : 0), rcode: a.rcode || 0,
      question: q.question, answers: a.answers || [], authority: a.authority || [], additional: a.additional || [] };
    const fail = { id: q.id, flags: FLAG.QR, rcode: RCODE.SERVFAIL, question: null };
    setTimeout(() => sendSafely(sock, reply, from.port, from.address, fail), delayMs);
  });
  return new Promise((resolve, reject) => {
    sock.once('error', reject);
    sock.bind(PORT, ip, () => resolve({ stats, close: () => new Promise(r => sock.close(r)) }));
  });
}

// One UDP question to one server, with a timeout and retries. A reply counts only if it comes from that server's
// address and port, is a response (QR) to a standard query, and repeats our ID, name and type (class IN is enforced
// by the decoder). The socket's port is random (bind 0) and the ID is random — both make forged replies harder.
function ask(server, port, name, type, { timeoutMs = 1000, attempts = 2, bindIp = '127.0.0.1' } = {}) {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket('udp4');
    const id = Math.floor(Math.random() * 65536);
    const want = canon(name);
    const t0 = process.hrtime.bigint();
    let tries = 0, timer = null, done = false;
    const finish = (err, val) => { if (done) return; done = true; clearTimeout(timer); sock.close(); err ? reject(err) : resolve(val); };
    const send = () => {
      tries++;
      sock.send(encode({ id, flags: FLAG.RD, question: { name, type } }), port, server);
      timer = setTimeout(() => tries < attempts ? send() : finish(Object.assign(new Error(`no answer from ${server} after ${tries} tries`), { tries })), timeoutMs);
    };
    sock.on('message', (buf, from) => {
      if (from.address !== server || from.port !== port) return;
      let reply;
      try { reply = decode(buf); } catch { return; }
      if (!(reply.flags & FLAG.QR) || reply.opcode !== 0 || reply.id !== id || !reply.question) return;
      if (reply.question.name !== want || reply.question.type !== type) return;
      finish(null, { reply, ms: Number(process.hrtime.bigint() - t0) / 1e6, tries });
    });
    sock.on('error', e => finish(e));
    sock.bind(0, bindIp, send);
  });
}

// Recursive resolver: answers stubs from its cache, or walks root → TLD → authoritative. It trusts only answers for the
// exact name and type it asked, and only NS records that move the delegation closer to that name, with their glue.
function resolver({ ip = '127.0.0.1', port = 6511, rootIp = ZONES.root.ip, clientRttMs = 0, lossRate = 0, seed = 7,
  timeoutMs = 1000, attempts = 2, now = () => Date.now() } = {}) {
  const cache = new Map();                     // "name|type" → { records, expiresAt }
  const stats = { queries: 0, dropped: 0, upstream: 0, cacheHits: 0 };
  const drop = rng(seed);
  const put = (records) => {
    const groups = new Map();
    for (const r of records) {
      const key = canon(r.name) + '|' + r.type;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    for (const [key, rs] of groups) cache.set(key, { records: rs, expiresAt: now() + Math.min(...rs.map(r => r.ttl)) * 1000 });
  };
  const get = (name, type) => {
    const key = canon(name) + '|' + type, e = cache.get(key);
    if (!e) return null;
    if (now() >= e.expiresAt) { cache.delete(key); return null; }
    const left = Math.ceil((e.expiresAt - now()) / 1000);
    return e.records.map(r => ({ ...r, ttl: left }));     // remaining TTL, as real resolvers report
  };
  const closest = (name) => {                  // deepest cached delegation with a cached glue address
    const labels = canon(name).split('.').filter(Boolean);
    for (let i = 0; i < labels.length; i++) {
      const zone = labels.slice(i).join('.') + '.';
      const ns = get(zone, TYPE.NS);
      if (!ns) continue;
      for (const n of ns) { const a = get(n.data, TYPE.A); if (a) return { ip: a[0].data, zone }; }
    }
    return { ip: rootIp, zone: '.' };
  };
  async function resolve(qname, type = TYPE.A) {
    const name = canon(qname), trace = [];
    const hit = get(name, type);
    if (hit) { stats.cacheHits++; return { answers: hit, rcode: RCODE.NOERROR, trace, fromCache: true }; }
    let server = closest(name);
    for (let hop = 0; hop < 8; hop++) {
      const label = Object.values(ZONES).find(z => z.ip === server.ip)?.label || server.ip;
      stats.upstream++;
      const { reply, ms, tries } = await ask(server.ip, PORT, name, type, { timeoutMs, attempts, bindIp: ip });
      trace.push({ server: label, ms, tries });
      if (reply.rcode === RCODE.NXDOMAIN) return { answers: [], rcode: RCODE.NXDOMAIN, trace };
      if (reply.rcode !== RCODE.NOERROR) return { answers: [], rcode: RCODE.SERVFAIL, trace };
      const answers = reply.answers.filter(r => r.name === name && r.type === type && r.data);
      if (answers.length) { put(answers); return { answers: get(name, type) || answers, rcode: RCODE.NOERROR, trace }; }
      // a referral must point to a zone that contains the name and is deeper than the server we just asked
      const ns = reply.authority.filter(r => r.type === TYPE.NS && r.data && isUnder(name, r.name)
        && r.name !== server.zone && isUnder(r.name, server.zone));
      if (!ns.length) {                         // NODATA: the name exists, the type does not (or an unusable reply)
        return { answers: [], rcode: (reply.flags & FLAG.AA) && !reply.authority.length ? RCODE.NOERROR : RCODE.SERVFAIL, trace };
      }
      const zone = ns[0].name, nsSet = ns.filter(r => r.name === zone);
      const glue = reply.additional.filter(a => a.type === TYPE.A && a.data && nsSet.some(n => n.data === a.name)
        && isUnder(a.name, server.zone));      // only glue for these NS names, within what the asked server may speak for
      if (!glue.length) return { answers: [], rcode: RCODE.SERVFAIL, trace };   // this lab does not chase glue-less referrals
      put(nsSet); put(glue);
      server = { ip: glue[0].data, zone };
    }
    return { answers: [], rcode: RCODE.SERVFAIL, trace };
  }
  const sock = dgram.createSocket('udp4');
  sock.on('message', async (buf, from) => {
    let q;
    try { q = decode(buf); } catch { return; }
    if (!q.question || (q.flags & FLAG.QR) || q.opcode !== 0) return;
    stats.queries++;
    if (lossRate && drop() < lossRate) { stats.dropped++; return; }
    let out;
    try { out = await resolve(q.question.name, q.question.type); } catch { out = { answers: [], rcode: RCODE.SERVFAIL }; }
    const reply = { id: q.id, flags: FLAG.QR | FLAG.RA | (q.flags & FLAG.RD), rcode: out.rcode, question: q.question, answers: out.answers };
    const fail = { id: q.id, flags: FLAG.QR | FLAG.RA, rcode: RCODE.SERVFAIL, question: null };
    setTimeout(() => sendSafely(sock, reply, from.port, from.address, fail), clientRttMs);
  });
  return new Promise((ok, failStart) => {
    sock.once('error', failStart);
    sock.bind(port, ip, () => ok({ resolve, stats, cache, close: () => new Promise(r => sock.close(r)) }));
  });
}

async function startZones(opts = {}) {
  const servers = {};
  try {
    for (const [k, z] of Object.entries(ZONES)) servers[k] = await authServer({ ...z, ...(opts[k] || {}) });
  } catch (e) { await Promise.all(Object.values(servers).map(s => s.close())); throw e; }
  return { servers, close: () => Promise.all(Object.values(servers).map(s => s.close())) };
}

module.exports = { PORT, ZONES, rng, answer, authServer, resolver, ask, startZones };
