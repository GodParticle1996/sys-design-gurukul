/* Leader maaro, naya leader banne ka waqt aur election rounds naapo (3 baar) */
const { url, states, waitLeader, post, sleep } = require('./lib');
(async () => {
  const first = await waitLeader([], 10000);
  if (!first.leader) {
    const st = await states();
    const maxTerm = Math.max(...st.map(x => x.term || 0));
    const el = st.reduce((a, x) => a + (x.elections || 0), 0);
    console.log(`10 s mein KOI leader nahi bana — term ${maxTerm} tak pahunch gaye, kul ${el} elections (har baar vote bant gaye)`);
    console.log('SAME timeouts → sab ek saath candidate, sab khud ko vote, kisi ko majority nahi ❌');
    process.exit(0);
  }
  console.log(`pehla leader: node ${first.leader.id} (term ${first.leader.term})`);
  const results = [];
  for (let round = 0; round < 3; round++) {
    const { leader } = await waitLeader();
    const before = leader.term;
    await post(url(leader.id) + '/admin/stop', {});
    const t = await waitLeader([leader.id]);
    results.push({ killed: leader.id, newLeader: t.leader ? t.leader.id : 'KOI NAHI', ms: t.ms, terms: t.leader ? t.leader.term - before : '?' });
    await post(url(leader.id) + '/admin/start', {});
    await sleep(1200);
  }
  results.forEach(r => console.log(`  node ${r.killed} maara → node ${r.newLeader} leader  ${r.ms} ms mein   (term +${r.terms})`));
  const avg = Math.round(results.reduce((a, r) => a + r.ms, 0) / results.length);
  console.log(`${process.env.SAME_TIMEOUT === '1' ? 'SAME timeouts' : 'RANDOM timeouts'} → average failover: ${avg} ms`);
})();
