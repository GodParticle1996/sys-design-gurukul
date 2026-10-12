/* Physics pehle: roshni khali jagah (vacuum) mein ~3 lakh km/s, glass fiber mein ~2 lakh km/s.
   Space wale raaste ko upar-neeche jaana padta hai (550 km × 2) aur orbit ki height par raasta ~10% lamba — ASSUMPTION.
   node tools/latency.js [--route 1.0]   (route = fiber seedhi line se kitna lamba bichha hai; 1.0 = best case) */
const args = require('./args')();
const C = 299792, GLASS = 200000, LEO = 550, GEO = 35786, ROUTE = +(args.route || 1.0), SPACE_STRETCH = 1.1;
const oneWay = { fiber: d => d * ROUTE / GLASS * 1000, space: d => (2 * LEO + d * SPACE_STRETCH) / C * 1000 };
console.log('Sirf dish → satellite → zameen (ek taraf) ka physics:');
console.log(`  GEO 35,786 km: ${(2 * GEO / C * 1000).toFixed(0)} ms ek taraf  → round trip ${(4 * GEO / C * 1000).toFixed(0)} ms (asli mein ~600 ms)`);
console.log(`  LEO    550 km: ${(2 * LEO / C * 1000).toFixed(1)} ms ek taraf  → round trip ${(4 * LEO / C * 1000).toFixed(1)} ms (asli 20–40 ms, zyada zameen ka network)\n`);
const routes = [['Mumbai → Pune', 120], ['Mumbai → Delhi', 1150], ['Mumbai → Singapore', 3900], ['London → New York', 5570],
  ['Mumbai → London', 7200], ['London → Singapore', 10880], ['New York → Tokyo', 10850]];
console.log(`raasta                  doori km   fiber (route ${ROUTE}x)   space lasers   kaun jeeta`);
for (const [name, d] of routes) {
  const f = oneWay.fiber(d), s = oneWay.space(d);
  console.log(`${name.padEnd(22)} ${String(d).padStart(7)}   ${f.toFixed(1).padStart(8)} ms      ${s.toFixed(1).padStart(8)} ms    ${s < f ? 'space by ' + (f - s).toFixed(1) + ' ms' : 'fiber by ' + (s - f).toFixed(1) + ' ms'}`);
}
const be = (2 * LEO / C) / (ROUTE / GLASS - SPACE_STRETCH / C);
console.log(`\nBreak-even: ~${Math.round(be)} km se lambe raaste par space jeetta hai (ek taraf ka time, route factor ${ROUTE}).`);
