/* Team wiki page (~2,000 nested blocks) kholo. Har block par "kya ye user dekh sakta hai?" — ancestors ki taraf chalke.
   node tools/pageload.js */
const { get, post, host } = require('../lib/util');
const B = `http://${host('blocks')}:5091`;
(async () => {
  await post(B + '/reset');
  console.log('A) permission check: har block ke liye poora ancestor walk vs page-level memo');
  for (const check of ['naive', 'memo']) {
    const r = await get(`${B}/page/team-wiki?user=riya&check=${check}&shard=workspace`);
    console.log(`   ${check.padEnd(6)} dikhe ${r.visible} blocks   DB lookups ${String(r.lookups).padStart(6)}   ${r.ms} ms`);
  }
  console.log('\nB) sharding: 32 shards — page load mein kitne shards ko chhuna pada?');
  for (const shard of ['block', 'workspace']) {
    const r = await get(`${B}/page/team-wiki?user=riya&check=memo&shard=${shard}`);
    console.log(`   shard by ${shard.padEnd(9)} → ${String(r.shardsTouched).padStart(2)} / 32 shards (ek page ke liye)`);
  }
  console.log('\nC) block MOVE karna permission badal deta hai');
  const before = await get(`${B}/page/salaries?user=aman&check=memo`), wikiBefore = await get(`${B}/page/team-wiki?user=aman&check=memo`);
  console.log(`   HR → Salaries page: aman ko dikhe ${before.visible} blocks (HR page par aman = none).  Team Wiki mein aman ko: ${wikiBefore.visible}`);
  const moved = await post(B + '/move', { id: 'salaries-b0', to: 'team-wiki' });
  const after = await get(`${B}/page/team-wiki?user=aman&check=memo`);
    console.log(`   riya ne ek toggle (salaries-b0 + uske andar sab) Salaries se Team Wiki mein drag kiya`);
  console.log(`   ab aman ko Team Wiki mein ${after.visible} blocks dikhe → ${after.visible - wikiBefore.visible} salary wale blocks ab aman ko dikh rahe hain!`);
  console.log('   Content bilkul nahi badla, sirf PARENT badla → permission ancestors se aati hai → dikhne wale log badal gaye.');
  await post(B + '/reset');
})();
