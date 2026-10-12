/* Quorum test: 0, 2, 3 followers band karke write karo */
const { NODES, url, waitLeader, post, sleep } = require('./lib');
async function write(leaderId, cmd) {
  const r = await post(url(leaderId) + '/write', { cmd });
  return r.committed ? `committed ✅ (${r.ms} ms)` : `COMMIT NAHI ❌ — ${r.reason}`;
}
(async () => {
  const { leader } = await waitLeader();
  const L = leader.id;
  const followers = NODES.filter(i => i !== L);
  console.log(`leader: node ${L} (term ${leader.term})`);
  console.log(`  5/5 zinda      → x=1: ${await write(L, 'x=1')}`);
  await post(url(followers[0]) + '/admin/stop', {}); await post(url(followers[1]) + '/admin/stop', {});
  console.log(`  2 followers band (3/5 zinda) → x=2: ${await write(L, 'x=2')}`);
  await post(url(followers[2]) + '/admin/stop', {});
  console.log(`  3 followers band (2/5 zinda) → x=3: ${await write(L, 'x=3')}`);
  for (const f of followers) await post(url(f) + '/admin/start', {});
})();
