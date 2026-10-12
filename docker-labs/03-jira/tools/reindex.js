/* Reindex ke DAURAAN searches chalti rehti hain — dekho kitni galat jawab deti hain */
const { get, post, sleep } = require('../lib/util');
const a = require('./args')();
const MODE = a.mode || 'swap';
const base = 'http://localhost:' + (process.env.PORT || 4310);

(async () => {
  const out = { ok: 0, wrong: 0, errors: 0 };
  let stop = false;
  const loop = (async () => {
    while (!stop) {
      try { const r = await get(base + '/search?q=ticket'); r.correct ? out.ok++ : out.wrong++; }
      catch (e) { out.errors++; }
      await sleep(4);
    }
  })();
  const r = await post(base + `/admin/reindex/${MODE}`, {});
  stop = true; await loop;
  console.log(`reindex mode=${String(MODE).padEnd(8)} time: ${r.ms} ms   docs: ${r.docs}` + (r.replayed !== undefined ? `   replayed: ${r.replayed}` : '') +
    `   searches ok: ${out.ok}   searches GALAT: ${out.wrong}   errors: ${out.errors}`);
})();
