/* Har kuch second stored listing ko live ranking se compare karta hai — bina koi vote bheje */
const { get, sleep } = require('../lib/util');
const a = require('./args')();
const FOR = +(a.for || 20), EVERY = +(a.every || 4);
const base = 'http://localhost:' + (process.env.PORT || 4102);

(async () => {
  let checks = 0, wrong = 0, worstDiff = 0;
  const t0 = Date.now();
  while ((Date.now() - t0) / 1000 < FOR) {
    const [stored, truth] = await Promise.all([get(base + '/listing'), get(base + '/truth')]);
    checks++;
    let diff = 0;
    for (let i = 0; i < stored.items.length; i++) if (stored.items[i] !== truth.items[i]) diff++;
    if (diff > 0) wrong++;
    worstDiff = Math.max(worstDiff, diff);
    await sleep(EVERY * 1000);
  }
  const s = await get(base + '/stats');
  console.log(`CLOCK=${String(s.clock).padEnd(9)} drift checks: ${checks}   listings wrong: ${wrong}   ` +
    `worst positions wrong (top 25): ${worstDiff}   rebuilds needed: ${wrong}`);
})();
