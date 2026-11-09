'use strict';
// ex1-dns: REAL UDP DNS on loopback — root, TLD and authoritative servers on 127.0.0.2/.3/.4 port 6510, a recursive
// resolver on 127.0.0.1:6511. MODEL: each server waits its round trip (root 20, TLD 30, auth 40 ms; resolver → you 5 ms).
const { Resolver } = require('node:dns').promises;
const { startZones, resolver, ask, ZONES } = require('../lib/dns');
const { TYPE, RCODE } = require('../lib/dnswire');

(async () => {
  const zones = await startZones();
  const res = await resolver({ clientRttMs: 5 });
  try {
    console.log(`REAL RUN: Node ${process.version}; real UDP packets in DNS wire format; MODEL delays: you ↔ resolver 5 ms, root ${ZONES.root.delayMs}, TLD ${ZONES.tld.delayMs}, authoritative ${ZONES.auth.delayMs} ms`);
    console.log('');
    const look = async (name, note) => {
      const before = res.stats.upstream;
      const { reply, ms } = await ask('127.0.0.1', 6511, name, TYPE.A);
      const ans = reply.rcode === RCODE.NXDOMAIN ? 'NXDOMAIN' : reply.answers.map(a => `${a.data} (TTL ${a.ttl} s)`).join(', ');
      console.log(`  ${name.padEnd(20)} ${(ms.toFixed(0) + ' ms').padStart(7)}  resolver asked ${res.stats.upstream - before} server(s)  → ${ans}   ${note}`);
    };
    console.log('lookups through the resolver (as your laptop would):');
    await look('api.khanakart.com', 'cold: root → TLD → authoritative');
    await look('api.khanakart.com', 'warm: from the resolver cache');
    await look('img.khanakart.com', 'sibling: .com and khanakart.com referrals cached');
    await look('nope.khanakart.com', 'name does not exist (this lab does not cache NXDOMAIN)');
    console.log('');
    const before = { up: res.stats.upstream, root: zones.servers.root.stats.queries, auth: zones.servers.auth.stats.queries };
    for (let i = 0; i < 1000; i++) await ask('127.0.0.1', 6511, 'api.khanakart.com', TYPE.A);
    console.log(`1,000 more lookups of api.khanakart.com within its TTL: resolver asked ${res.stats.upstream - before.up} upstream servers (root +${zones.servers.root.stats.queries - before.root}, authoritative +${zones.servers.auth.stats.queries - before.auth})`);
    const node = new Resolver();
    node.setServers(['127.0.0.1:6511']);
    console.log(`Node's own resolver (c-ares) via this resolver: khanakart.com → ${JSON.stringify(await node.resolve4('khanakart.com', { ttl: true }))}`);
    console.log(`queries seen: root ${zones.servers.root.stats.queries}, TLD ${zones.servers.tld.stats.queries}, authoritative ${zones.servers.auth.stats.queries}`);
  } finally { await res.close(); await zones.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
