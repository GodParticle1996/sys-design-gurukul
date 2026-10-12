/* Ek hi raasta, chaar tareeke. "settled" = kitne junctions algorithm ne sach mein dekhe.
   node tools/route.js */
const { get, host } = require('../lib/util');
const M = `http://${host('maps')}:5001`;
const trips = [['0,0', '299,299', 'poore naksha ke aar-paar'], ['20,150', '280,160', 'sheher ke aar-paar'], ['50,50', '140,120', 'ghar se office']];
(async () => {
  const s = await get(M + '/stats');
  console.log(`graph ${s.N}x${s.N} = ${s.junctions} junctions | overlay: cell ${s.cell}x${s.cell}, ${s.borderNodes} border nodes, ${s.shortcuts} shortcuts, banne mein ${s.preprocessMs} ms\n`);
  for (const [from, to, name] of trips) {
    console.log(`${name} (${from} → ${to})`);
    for (const algo of ['dijkstra', 'astar', 'bidir', 'overlay']) {
      const r = await get(`${M}/route?algo=${algo}&from=${from}&to=${to}`);
      console.log(`  ${algo.padEnd(9)} ETA ${String(r.minutes).padStart(5)} min   junctions dekhe ${String(r.settled).padStart(6)}   edge relax ${String(r.relaxed).padStart(7)}   ${String(r.ms).padStart(5)} ms`);
    }
  }
  console.log('\nDijkstra har taraf gol daayra banata hai. A* ko pata hai manzil kis taraf hai → seedha us taraf.');
  console.log('Overlay (CRP jaisa) beech ke cells ki gallis chhuta hi nahi — sirf border-to-border shortcuts.');
  console.log('Note: is grid mein har cell ke border bahut zyada hain (96 tak), isliye overlay ke relaxations zyada dikhte hain;');
  console.log('asli sadkon mein cell ke border kam hote hain (highway do-chaar jagah se hi nikalti hai) — wahan overlay ka fayda bada hota hai.');
})();
