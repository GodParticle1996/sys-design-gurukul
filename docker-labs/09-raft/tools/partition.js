/* Partition 2 | 3 — purana leader minority mein. Dono taraf likho, phir heal. */
const { NODES, url, states, waitLeader, post, sleep } = require('./lib');
(async () => {
  const { leader } = await waitLeader();
  const L = leader.id;
  const buddy = NODES.find(i => i !== L);
  const minority = [L, buddy], majority = NODES.filter(i => !minority.includes(i));
  console.log(`leader: node ${L} (term ${leader.term})   partition → {${minority}} | {${majority}}`);
  for (const a of minority) await post(url(a) + '/admin/block', { peers: majority });
  for (const b of majority) await post(url(b) + '/admin/block', { peers: minority });

  const r1 = await post(url(L) + '/write', { cmd: 'y=20' });
  console.log(`  minority: node ${L} par y=20 → ${r1.committed ? 'committed' : 'COMMIT NAHI ❌ (' + r1.reason + ')'}`);
  const t = await waitLeader([L, buddy]);
  console.log(`  majority: naya leader node ${t.leader.id} (term ${t.leader.term}) ${t.ms} ms mein`);
  const r2 = await post(url(t.leader.id) + '/write', { cmd: 'y=30' });
  console.log(`  majority: node ${t.leader.id} par y=30 → ${r2.committed ? 'committed ✅' : 'nahi'}`);
  const pre = await states();
  const leadersNow = pre.filter(s => s.role === 'leader').map(s => `node ${s.id} (term ${s.term})`);
  console.log(`  partition ke dauraan khud ko leader maanne wale: ${leadersNow.join(', ')}`);

  for (const n of NODES) await post(url(n) + '/admin/block', { peers: [] });
  await sleep(1500);
  const st = await states();
  console.log('heal ke baad har node ka log (sirf commands):');
  st.forEach(s => console.log(`  node ${s.id} [${s.role}, term ${s.term}]: ${s.log.map(e => e.cmd + (e.committed ? '' : '*')).join(', ')}`));
  console.log('  (* = uncommitted)');
})();
