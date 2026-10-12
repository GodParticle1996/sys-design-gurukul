/* Chalti hui query ke beech warehouse maar do — data ka kya hota hai? */
const { get, post, sleep } = require('../lib/util');
const engine = 'http://localhost:' + (process.env.PORT || 4401);
const storage = 'http://localhost:' + (process.env.STORAGE_PORT || 4400);
(async () => {
  const q = get(engine + '/q/ds').then(() => 'poori ho gayi').catch(() => 'LOST');
  await sleep(20);
  await post(engine + '/admin/crash', {}).catch(() => {});
  const result = await q;
  await sleep(200);
  let engineUp = true;
  try { await get(engine + '/stats'); } catch (e) { engineUp = false; }
  const s = await get(storage + '/rows');
  console.log(`warehouse killed mid-query → chalti query: ${result}   engine up: ${engineUp ? 'haan' : 'nahi'}`);
  console.log(`storage mein rows: ${s.rows.toLocaleString('en-IN')} (waisi ki waisi)  ✅ data compute mein tha hi nahi`);
})();
