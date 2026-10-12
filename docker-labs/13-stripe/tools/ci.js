#!/usr/bin/env node
/* node tools/ci.js --changed 1234            → dono modes, ek hi change
   node tools/ci.js --blindspots               → woh changes jahan selective runner test chhod deta hai
   node tools/ci.js --sample 300               → 300 random changes ka average */
const args = require('./args')();
const { post, get } = require('../lib/util');
const C = `http://${process.env.CI_HOST || 'localhost'}:4821`;
(async () => {
  const repo = await get(C + '/repo');
  if (args.sample) {
    const r = await get(C + '/sample?n=' + args.sample);
    console.log(`${r.changes} random changes | selective avg ${r.avgSelectedPct}% of suite | changes jahan failing test chhoota: ${r.changesWithMiss} (${r.missedTests} tests)   [dynamic edges: ${repo.dynamicEdges}]`);
    return;
  }
  if (args.blindspots) {
    const b = await get(C + '/blindspots');
    console.log(`dynamic edges: ${repo.dynamicEdges}`);
    b.forEach(x => console.log(`  change fn ${x.fn}: ${x.shouldFail} tests fail hone chahiye, selective sirf ${x.selectiveCatches} pakadta hai`));
    if (!b.length) console.log('  koi blind spot nahi — static graph poora sach bata raha hai');
    return;
  }
  const ch = args.changed || 1234;
  for (const mode of ['all', 'selective']) {
    const r = await post(C + '/ci', { changed: ch, mode });
    console.log(`change fn ${r.changed} | ${mode.padEnd(9)} | tests ${String(r.testsRun).padStart(4)} (${(r.testsRun / repo.tests * 100).toFixed(1)}%) | ${String(r.ms).padStart(5)} ms | failed ${r.failed}/${r.shouldFail} | missed ${r.missed}`);
  }
})().catch(e => { console.error('ci chal raha hai? npm start ex1-selective-tests —', e.message); process.exit(1); });
