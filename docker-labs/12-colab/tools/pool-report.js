#!/usr/bin/env node
/* node tools/pool-report.js [--gpus 150] */
const args = require('./args')();
const { get } = require('../lib/util');
const P = `http://${process.env.POOL_HOST || 'localhost'}:4812`;
(async () => {
  const g = args.gpus || 150;
  console.log(`policy | interactive 5 min mein GPU | kabhi nahi mila | avg wait | GPU time: kaam / idle pakda / miner / khaali | reclaimed`);
  for (const pol of ['none', 'idle', 'colab']) {
    const r = await get(`${P}/simulate?policy=${pol}&gpus=${g}`);
    const t = r.gpuTime;
    console.log(`${pol.padEnd(6)} | ${String(r.interactiveServedIn5min + '%').padStart(26)} | ${String(r.interactiveNeverServed).padStart(15)} | ${String(r.avgWaitMin + ' min').padStart(8)} | ` +
      `${t.usefulPct}% / ${t.idleHeldPct}% / ${t.minerPct}% / ${t.emptyPct}% | ${r.reclaimed}`);
  }
})().catch(e => { console.error('pool chal raha hai? npm start ex2-gpu-pool —', e.message); process.exit(1); });
