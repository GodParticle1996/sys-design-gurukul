/* 120 players khel rahe hain. Ek server crash hota hai. Kya gaya, kya bacha? Aur kitne log prabhavit?
   instances: 3 chhote instances × 40 players.   shard: 1 bada server × 120 players.
   node tools/crash.js */
const { post, get, getRaw, host } = require('../lib/util');
const F = `http://${host('fleet')}:5033`, P = `http://${host('platform')}:5032`, I = host('instance');
const url = port => `http://${I}:${port}`;
async function run(model) {
  await post(F + '/reset'); await post(P + '/reset');
  const n = model === 'instances' ? 3 : 1, per = 120 / n, ports = [];
  for (let i = 0; i < n; i++) ports.push((await post(F + '/spawn')).port);
  const where = new Map();
  for (let p = 0; p < 120; p++) { const port = ports[Math.floor(p / per)]; await post(url(port) + '/join', { player: 'p' + p }); where.set('p' + p, port); }
  for (let round = 1; round <= 5; round++) for (let p = 0; p < 120; p++) await post(url(where.get('p' + p)) + '/play', { player: 'p' + p, earnHat: round === 3 });
  const victim = ports[0];
  await post(F + '/kill', { port: victim });
  let affected = 0, scoreLost = 0, hatsOk = 0;
  for (let p = 0; p < 120; p++) {
    const id = 'p' + p;
    if (where.get(id) === victim) {
      affected++;
      const r = await getRaw(url(victim) + '/score/' + id).catch(() => ({ ok: false }));
      if (!r.ok) scoreLost++;
    }
    if ((await get(P + '/inventory/' + id)).items.length === 1) hatsOk++;
  }
  const fresh = (await post(F + '/spawn')).port;                       // affected log naye instance mein
  await post(url(fresh) + '/join', { player: 'p0' });
  const s = await get(url(fresh) + '/score/p0'), inv = await get(P + '/inventory/p0');
  console.log(`${model.padEnd(10)} ${String(n).padStart(2)} server(s) × ${per} players | crash → prabhavit ${String(affected).padStart(3)} players, score gaya ${scoreLost}, hats bache ${hatsOk}/120`);
  console.log(`           p0 naye instance :${fresh} mein: score ${s.score} (naya match), inventory ${JSON.stringify(inv.items)}`);
}
(async () => { await run('instances'); await run('shard'); })();
