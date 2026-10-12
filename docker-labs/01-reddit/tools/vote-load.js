/* Votes ek sthir rate par + saath mein readers. Har request ka apna waqt naapte hain. */
const { get, post, pct, sleep } = require('../lib/util');
const a = require('./args')();
const VOTES = +(a.votes || 200), RATE = +(a.rate || 25), READERS = +(a.readers || 10);
const base = 'http://localhost:' + (process.env.PORT || 4101);

(async () => {
  const voteMs = [], readMs = [];
  let stop = false;
  const readLoop = (async () => {
    while (!stop) {
      const t = Date.now();
      try { await get(base + '/listing'); readMs.push(Date.now() - t); } catch (e) {}
      await sleep(Math.round(1000 / READERS));
    }
  })();
  const gap = Math.round(1000 / RATE);
  const inflight = [];
  for (let i = 0; i < VOTES; i++) {
    inflight.push((async () => {
      const t = Date.now();
      try { await post(base + '/vote', { postId: 'p' + (i % 7) }); voteMs.push(Date.now() - t); } catch (e) {}
    })());
    await sleep(gap);
  }
  await Promise.all(inflight);
  stop = true; await readLoop;

  /* worker ko drain hone do (max 20 s) */
  const t0 = Date.now();
  let s = await get(base + '/stats');
  while (s.queueDepth > 0 && Date.now() - t0 < 20000) { await sleep(200); s = await get(base + '/stats'); }
  const drainMs = Date.now() - t0;

  console.log(`MODE=${String(s.mode).padEnd(6)} vote p99: ${pct(voteMs, 99)} ms   vote p50: ${pct(voteMs, 50)} ms   ` +
    `read p99: ${pct(readMs, 99)} ms   answers repaired: ${s.repaired}   queue peak: ${s.queuePeak}` +
    (s.mode === 'async' ? `   drain: ${(drainMs / 1000).toFixed(1)} s` : ''));
})();
