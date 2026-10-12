/* 30 jobs seed karo (3 critical list ke aakhir mein, ek poison), workers chalne do, report */
const { get, post, sleep } = require('../lib/util');
const DB = 'http://localhost:4803';
(async () => {
  await post(DB + '/seed/30', {});
  const t0 = Date.now();
  let s = await get(DB + '/stats');
  while ((s.pending + s.running) > 0 && Date.now() - t0 < 60000) { await sleep(500); s = await get(DB + '/stats'); }
  console.log(`QUEUE=${s.queue}   pehle 5 complete: ${s.firstFive.join(', ')}`);
  console.log(`done: ${s.done}   dead letter: ${s.dead}   watchdog ne wapas daale: ${s.requeued}   dobara chale: ${s.reran}   time: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
})();
