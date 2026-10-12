#!/usr/bin/env node
/* Service A (client) — 150 workers, har worker: request bhejo; 503 → turant dobara; 429 → Retry-After jitna ruko (±20% jitter).
   15 second, phir B aur C ke counters. Teesri line: kaam workers mein kaise banta (kisi ko bahut, kisi ko kuch nahi?).
   node tools/client.js [--secs 15] [--workers 150] */
const http = require('http');
const args = require('./args')();
const { pct } = require('../lib/util');
const B = { host: process.env.B_HOST || 'localhost', port: 4852 }, CH = process.env.C_HOST || 'localhost';
const SECS = +(args.secs || 15), N = +(args.workers || 150);
const agent = new http.Agent({ keepAlive: true, maxSockets: N });
const call = () => new Promise(res => { const s = Date.now(); const r = http.request({ ...B, path: '/x', agent }, rr => { rr.resume(); rr.on('end', () => res({ code: rr.statusCode, ms: Date.now() - s, ra: +(rr.headers['retry-after-ms'] || 0) })); }); r.on('error', () => res({ code: 0, ms: Date.now() - s })); r.end(); });
const get = (port, host, p) => new Promise(res => http.get({ host, port, path: p }, r => { let b = ''; r.on('data', d => (b += d)); r.on('end', () => res(JSON.parse(b || '{}'))); }));
(async () => {
  await get(4852, B.host, '/reset'); await get(4853, CH, '/reset');
  const end = Date.now() + SECS * 1000; let attempts = 0, ok = 0; const lat = [];
  const mine = new Array(N).fill(0), longest = new Array(N).fill(0);          // har worker: kitne kaam poore, ek kaam par sabse lamba intezaar
  await Promise.all(Array.from({ length: N }, async (_, w) => {
    while (Date.now() < end) {
      const t0 = Date.now(); let r;
      do { attempts++; r = await call(); if (r.code === 429) await new Promise(z => setTimeout(z, r.ra * (0.8 + Math.random() * 0.4))); }
      while (r.code !== 200 && Date.now() < end);
      if (r.code === 200) { ok++; mine[w]++; lat.push(Date.now() - t0); }
      longest[w] = Math.max(longest[w], Date.now() - t0);                       // adhoora reh gaya kaam bhi gino
    }
  }));
  const b = await get(4852, B.host, '/stats'), c = await get(4853, CH, '/stats');
  console.log(`A: ${attempts} requests bheje → ${ok} kaam poore (${(attempts / Math.max(1, ok)).toFixed(1)} tries per success) | p50 ${pct(lat, 50)} ms p99 ${pct(lat, 99)} ms`);
  console.log(`B: C ko ${b.forwarded} bheje, C ne ${b.cRejected} thukraye (bekaar kaam), ${b.shed429} ko 429 bina C chhue | C: ${c.ok} kiye, ${c.rejected} rejected`);
  const per = mine.slice().sort((x, y) => x - y);
  console.log(`A ke ${N} workers: ek worker ke kaam — sabse kam ${per[0]}, beech wala ${per[Math.floor(N / 2)]}, sabse zyada ${per[N - 1]} | jin workers ka ek bhi kaam poora nahi hua: ${per.filter(x => x === 0).length} | ek kaam par sabse lamba intezaar ${(Math.max(...longest) / 1000).toFixed(1)} s`);
})();
