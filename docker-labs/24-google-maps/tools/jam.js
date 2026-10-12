/* Ek ilaake mein jam. Overlay ko update karna hai: poora naksha dobara, ya sirf wo cell?
   node tools/jam.js */
const { get, post, host } = require('../lib/util');
const M = `http://${host('maps')}:5001`;
(async () => {
  const before = await get(`${M}/route?algo=overlay&from=20,150&to=160,160`);
  console.log(`jam se pehle: ETA ${before.minutes} min`);
  const j = await post(M + '/jam', { x: 157, y: 157, radius: 6, factor: 12 });
  console.log(`\nManzil ke aas-paas ke ilaake mein jam: ${j.jammedEdges} sadkein 12x dheemi (cell ${j.cell})`);
  const stale = await get(`${M}/route?algo=overlay&from=20,150&to=160,160`);
  const truth = await get(`${M}/route?algo=dijkstra&from=20,150&to=160,160`);
  console.log(`  purane overlay se ETA: ${stale.minutes} min  ← galat, shortcuts purane hain`);
  console.log(`  asli (Dijkstra, live weights): ${truth.minutes} min`);
  const cell = await post(M + '/recompute', { mode: 'cell', cell: j.cell });
  const fixed = await get(`${M}/route?algo=overlay&from=20,150&to=160,160`);
  console.log(`\n  sirf wo cell dobara: ${cell.borderNodes} border nodes, ${cell.ms} ms → ETA ${fixed.minutes} min`);
  const full = await post(M + '/recompute', { mode: 'full' });
  const fixed2 = await get(`${M}/route?algo=overlay&from=20,150&to=160,160`);
  console.log(`  poora naksha dobara: ${full.borderNodes} border nodes, ${full.ms} ms → ETA ${fixed2.minutes} min`);
  console.log(`\n  ek cell ka kaam poore naksha se ${Math.round(full.ms / Math.max(1, cell.ms))}x sasta — aur natija bilkul same.`);
  console.log('  Yahi CRP ka asli jaadu hai: naksha (topology) alag, traffic (cost) alag. Traffic har minute badalta hai, naksha nahi.');
})();
