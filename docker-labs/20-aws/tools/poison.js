/* Customer 7 ki ek poison request aati hai. Router retry karta hai → poison har us worker tak jaata hai jo customer 7 ka hai.
   Phir baaki 99 customers normal request bhejte hain. Kitne poore band?
   node tools/poison.js --sharding none|shard|shuffle   (bina flag: teeno) */
const args = require('./args')();
const { get, getRaw, post, sleep, host } = require('../lib/util');
const F = `http://${host('fleet')}:4931`, R = `http://${host('router')}:4932`;
const POISONER = 7;
function choose(n, k) { let r = 1n; for (let i = 0n; i < BigInt(k); i++) r = r * (BigInt(n) - i) / (i + 1n); return r; }
(async () => {
  const modes = args.sharding ? [args.sharding] : ['none', 'shard', 'shuffle'];
  console.log('sharding   poison ne kitne workers maare   customers POORE band   customers jo mare worker share karte the par bach gaye');
  for (const m of modes) {
    await post(F + '/reset'); await post(R + '/mode', { sharding: m });
    const bad = (await get(R + '/assign?customer=' + POISONER)).workers;
    await getRaw(R + `/req?customer=${POISONER}&poison=1`);
    await sleep(300);
    const dead = (await get(F + '/status')).dead;
    let down = 0, overlapSurvived = 0;
    for (let c = 0; c < 100; c++) {
      if (c === POISONER) continue;
      const mine = (await get(R + '/assign?customer=' + c)).workers;
      const r = await getRaw(R + '/req?customer=' + c);
      if (!r.ok) down++; else if (mine.some(w => dead.includes(w))) overlapSurvived++;
    }
    console.log(`${m.padEnd(10)} ${String(dead.length).padStart(3)} / 8  ${(bad.length === 8 ? '(saare 8)' : '(' + bad.join(',') + ')').padEnd(26)}${String(down).padStart(3)} / 99            ${overlapSurvived}`);
  }
  await post(F + '/reset');
  console.log(`\nCombinations: C(8,2) = ${choose(8, 2)} → kisi aur customer ka EXACT same jodi hone ka chance 1/28 (< 4%).`);
  console.log(`Route 53 jaisa: 100 workers, har customer ko 5 → C(100,5) = ${choose(100, 5).toLocaleString('en-US')} combinations.`);
  console.log(`Hardware 8 → 100 (12.5x), combinations 28 → ${Math.round(Number(choose(100, 5)) / 28).toLocaleString('en-US')}x.`);
})();
