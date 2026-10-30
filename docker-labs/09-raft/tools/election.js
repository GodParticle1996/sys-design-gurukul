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
    if (!leader) { console.log('  15 s tak koi leader nahi bana — votes baar-baar bant rahe hain'); break; }   // SAME_TIMEOUT mein pehla leader kabhi-kabhi sanyog se ban jaata hai
    const before = leader.term;
    await post(url(leader.id) + '/admin/stop', {});
    const t = await waitLeader([leader.id]);
    results.push({ killed: leader.id, ok: !!t.leader, newLeader: t.leader && t.leader.id, ms: t.ms, terms: t.leader ? t.leader.term - before : '?' });
    await post(url(leader.id) + '/admin/start', {});
    await sleep(1200);
  }
  if (!results.length) process.exit(0);
  results.forEach(r => console.log(r.ok
    ? `  node ${r.killed} maara → node ${r.newLeader} leader  ${r.ms} ms mein   (term +${r.terms})`
    : `  node ${r.killed} maara → 15 s tak naya leader nahi mila`));
  const done = results.filter(r => r.ok);   // timeout ko "failover ka samay" mat gino
  const mode = process.env.SAME_TIMEOUT === '1' ? 'SAME timeouts' : 'RANDOM timeouts';
  if (!done.length) return console.log(`${mode} → koi failover poora nahi hua; average nahi nikala`);
  const avg = Math.round(done.reduce((a, r) => a + r.ms, 0) / done.length);
  console.log(`${mode} → average failover: ${avg} ms${done.length < results.length ? ` (${results.length} mein se ${done.length} poore)` : ''}`);
})();
