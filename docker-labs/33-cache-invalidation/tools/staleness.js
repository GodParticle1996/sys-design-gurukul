/* iPhone ka price DB mein badla (79,999 → 74,999). Dono app servers kitni der tak PURANA price dikhate rahe?
   node tools/staleness.js */
const { get, post, sleep, host } = require('../lib/util');
const DB = `http://${host('db')}:5111`, C = `http://${host('cache')}:5112`, INV = `http://${host('invalidator')}:5115`;
const APPS = [`http://${host('app1')}:5113`, `http://${host('app2')}:5114`];
let price = 79999;
async function scenario(name, { cdc, pubsub }) {
  await post(INV + '/config', { enabled: cdc }); await post(C + '/flush');
  for (const a of APPS) await post(a + '/config', { ttlMs: 5000, l1Ms: 5000, l1Pubsub: pubsub, stampede: 'none', useL1: true });
  await post(DB + '/set', { k: 'iphone', v: price }); await sleep(200); await post(C + '/flush');
  for (const a of APPS) await get(a + '/price/iphone');                 // dono ne padh liya (L1 + cache garam)
  await sleep(1000);
  price -= 5000; await post(DB + '/set', { k: 'iphone', v: price }); const t0 = Date.now();
  const staleFor = APPS.map(() => null);
  while (staleFor.some(x => x == null) && Date.now() - t0 < 12000) {
    await Promise.all(APPS.map(async (a, i) => { if (staleFor[i] != null) return; const r = await get(a + '/price/iphone'); if (r.v === price) staleFor[i] = Date.now() - t0; }));
    await sleep(25);
  }
  console.log(`${name.padEnd(40)} app1 purana dikhaya ${String(staleFor[0]).padStart(5)} ms   app2 ${String(staleFor[1]).padStart(5)} ms`);
}
(async () => {
  console.log('tareeka                                  kitni der galat price (DB badalne ke baad)');
  await scenario('sirf TTL (cache 5 s, L1 5 s)', { cdc: false, pubsub: false });
  await scenario('CDC → shared cache DEL (L1 ko pata nahi)', { cdc: true, pubsub: false });
  await scenario('CDC + L1 ko pub/sub se khabar', { cdc: true, pubsub: true });
  console.log('\nTTL: "kabhi na kabhi sahi ho jayega" — L1 aur cache dono ke TTL jud sakte hain.');
  console.log('CDC: DB ka change log hi invalidation ka source — par har layer (L1 bhi) tak khabar pahunchni chahiye.');
})();
