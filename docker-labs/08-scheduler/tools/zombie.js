/* Leader ko 9 s ka "GC pause" do. TTL 6 s hai — lock expire hoga, naya leader banega.
   Jab purana jaagega, kya woh abhi bhi fire karega? */
const { get, post, sleep } = require('../lib/util');
const ports = { a: 4811, b: 4812, c: 4813 };
(async () => {
  await sleep(1500);
  const h = await get('http://localhost:4801/holder');
  await post(`http://localhost:${ports[h.holder]}/admin/pause/9000`, {});
  console.log(`scheduler-${h.holder} ko 9 s ka pause (TTL 6 s)`);
  await sleep(16000);
  const b = await get('http://localhost:4802/stats');
  const st = await Promise.all(Object.values(ports).map(p => get(`http://localhost:${p}/status`).catch(() => null)));
  const leaders = st.filter(s => s && s.leader).map(s => s.name);
  console.log(`khud ko leader maanne wale: ${leaders.join(', ')}   lock holder: ${(await get('http://localhost:4801/holder')).holder}`);
  console.log(`billing (IDEMP=${b.idemp ? 1 : 0}): windows ${b.windows}   double-charged: ${b.doubleCharged}   idempotency key ne roke: ${b.droppedByKey}`);
})();
