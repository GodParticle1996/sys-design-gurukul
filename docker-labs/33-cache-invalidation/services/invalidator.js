/* CDC invalidator: DB ka change log padhta rehta hai (har 50 ms). Kuch badla → shared cache se DEL + "badla" event publish.
   ENABLED=0 → band (tab sirf TTL ke bharose). */
const { serve, get, post, host, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 5115, DB = `http://${host('db')}:5111`, C = `http://${host('cache')}:5112`;
let enabled = process.env.ENABLED !== '0', since = 0, done = 0;
(async () => {
  for (;;) {
    await sleep(50);
    try {
      const { changes } = await get(DB + '/changes?since=' + since);
      for (const ch of changes) { since = ch.seq; if (!enabled) continue; await post(C + '/del', { k: ch.k }); await post(C + '/publish', { k: ch.k }); done++; }
    } catch (e) {}
  }
})();
serve(PORT, { 'POST /config': (req, res, url, p, b) => { enabled = !!b.enabled; return { enabled }; }, 'GET /stats': () => ({ enabled, invalidated: done }) },
  () => console.log(`[invalidator] :${PORT} enabled=${enabled}`));
