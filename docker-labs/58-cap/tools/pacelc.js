'use strict';
// ex2-pacelc — ASLI timers, MODEL network: primary + 2 replicas. Paas wala replica 1 ms one-way, door wala 30 ms
// one-way (setTimeout se). Teen tareeke: async (primary turant "ho gaya"), sync-any-1 (kisi ek replica ka ack),
// sync-all (dono ka ack). A: 200 writes ek ke baad ek — latency. B: 300 writes (har 1 ms ka target); 300va write bhejte hi primary mara
// aur jo packet replica tak nahi pahuncha woh gaya; sabse aage wala replica naya primary bana.
const { percentile } = require('../lib/stats');
const { REPLICAS, MODES, cluster } = require('../lib/pacelc');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('A. Latency — 200 writes ek ke baad ek (har write ka "ho gaya" aane tak ka samay)');
  for (const mode of MODES) {
    const c = cluster(), lat = [];
    for (let i = 0; i < 200; i++) { const t0 = performance.now(); await c.write(i, mode); lat.push(performance.now() - t0); }
    console.log(`  ${mode.padEnd(11)}  median ${percentile(lat, 50).toFixed(2).padStart(6)} ms   p99 ${percentile(lat, 99).toFixed(2).padStart(6)} ms`);
  }
  console.log('\nB. Primary mara — 300 writes (har 1 ms ka target), 300va write bhejte hi crash; "ho gaya" bole gaye writes mein se kitne kho gaye?');
  console.log('   Mara primary kisi ko jawab nahi deta: crash ke baad aane wale acks ke writes ko "ho gaya" nahi milta (natija pata nahi).');
  for (const mode of MODES) {
    const c = cluster(), acked = new Set(), t0 = performance.now();
    for (let i = 0; i < 300; i++) { c.write(i, mode).then(() => acked.add(i)); if (i < 299) await sleep(1); }
    await Promise.resolve(); c.kill(); const crashAt = performance.now() - t0; await sleep(80);   // crash right after the 300th write was sent
    const best = c.reps.reduce((a, b) => (b.applied.size > a.applied.size ? b : a));
    const lost = [...acked].filter(id => !best.applied.has(id)).length;
    const lostFar = [...acked].filter(id => !c.reps[1].applied.has(id)).length;
    console.log(`  ${mode.padEnd(11)}  crash t = ${crashAt.toFixed(0)} ms   "ho gaya" bola ${String(acked.size).padStart(3)}   naya primary = ${best.name.padEnd(12)}  naye primary mein nahi: ${String(lost).padStart(2)}   (agar door wala bane: ${lostFar})`);
  }
  console.log('\nasync: tez, par crash par aakhri writes (packet raaste mein the) gaye. sync-all: latency = sabse dheema replica (~60 ms).');
  console.log('sync-any-1: latency ~ sabse tez replica; acked write kam se kam ek replica par — us replica ko primary banao.');
})().catch(e => { console.error(e); process.exitCode = 1; });
