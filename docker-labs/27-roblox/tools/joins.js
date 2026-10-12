/* 20,000 players "Play" dabate hain — 6 regions se. 40% dosto ke group (2–5) mein aate hain, thode-thode second ke faasle par.
   node tools/joins.js */
const { post, get, host } = require('../lib/util');
const M = `http://${host('matchmaker')}:5031`;
const REG = ['india', 'india', 'sea', 'europe', 'us-east', 'us-west', 'brazil'];
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function arrivals() {                                                  // same arrival order har policy ke liye
  const r = rng(3), list = []; let id = 0, g = 0;
  while (list.length < 20000) {
    const region = REG[Math.floor(r() * REG.length)];
    if (r() < 0.4) { const size = 2 + Math.floor(r() * 4), gid = g++; for (let k = 0; k < size; k++) list.push({ id: id++, region, group: gid, groupSize: size, delay: k * 3 + Math.floor(r() * 6) }); }
    else list.push({ id: id++, region, group: null, delay: 0 });
  }
  const t = list.map((p, i) => ({ ...p, at: i + p.delay * 7 }));      // dost thodi der baad aate hain — beech mein dusre log
  return t.sort((a, b) => a.at - b.at).slice(0, 20000);
}
(async () => {
  const list = arrivals();
  console.log('policy       instances   avg fill   avg ping   dost ek saath (groups)');
  for (const policy of ['fill-first', 'nearest', 'smart']) {
    await post(M + '/policy', { policy });
    for (const p of list) await post(M + '/join', { id: p.id, region: p.region, group: p.group, groupSize: p.groupSize });
    const s = await get(M + '/stats');
    console.log(`${policy.padEnd(12)} ${String(s.instances).padStart(6)}     ${String(s.avgFill).padStart(5)}%    ${String(s.avgPing).padStart(5)} ms   ${s.groupsTogether}/${s.groups} (${Math.round(100 * s.groupsTogether / s.groups)}%)`);
  }
})();
