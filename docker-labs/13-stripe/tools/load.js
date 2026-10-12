#!/usr/bin/env node
/* node tools/load.js --concurrency 16 --requests 800 */
const args = require('./args')();
const { pct } = require('../lib/util');
const URL = `http://${process.env.CHARGE_HOST || 'localhost'}:4822/charge`;
const C = +(args.concurrency || 16), N = +(args.requests || 800);
(async () => {
  const lat = []; let next = 0;
  const t0 = Date.now();
  async function worker() { while (next < N) { next++; const s = Date.now(); await fetch(URL).then(r => r.text()); lat.push(Date.now() - s); } }
  await Promise.all(Array.from({ length: C }, worker));
  const secs = (Date.now() - t0) / 1000;
  console.log(`${N} charges, concurrency ${C}: ${Math.round(N / secs)} charges/s | p50 ${pct(lat, 50)} ms | p99 ${pct(lat, 99)} ms`);
})().catch(e => { console.error('charge chal raha hai? npm start ex2-gil —', e.message); process.exit(1); });
