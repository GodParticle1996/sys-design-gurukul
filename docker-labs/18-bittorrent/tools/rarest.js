/* Seeder jaldi chala gaya — kaunsi piece-picking policy bachati hai?
   200 peers, 128 pieces, origin 8 pieces/sec. Origin ko har piece EK baar bhejne mein 16 sec lagte hain.
   node tools/rarest.js [--leave 10,16,20,30] */
const args = require('./args')();
const { run, summary } = require('../lib/swarm');
const leaves = (args.leave || '10,16,20,30').split(',').map(Number);
console.log('policy       seeder gaya   pieces jo swarm se GAAYAB   peers jo poore hue   last done');
for (const policy of ['sequential', 'rarest']) for (const L of leaves) {
  const r = run({ peers: 200, pieces: 128, originUp: 8, peerUp: 2, peerDown: 8, policy, seederLeavesAt: L, maxTicks: 400 });
  const any = new Set(); r.peers.forEach(p => p.have.forEach(i => any.add(i)));
  const s = summary(r);
  console.log(`${policy.padEnd(12)} t=${String(L).padEnd(10)} ${String(128 - any.size).padStart(4)} / 128               ${String(s.finished).padStart(3)} / 200          ${s.max === '-' ? '—' : 't=' + s.max}`);
}
console.log('\nsequential: sab log piece 0,1,2... maangte hain → origin ke jaane tak aage ke pieces kisi ke paas nahi.');
console.log('rarest-first: jo piece sabse kam logon ke paas hai wo pehle → origin har piece ki ek copy jaldi bahar nikal deta hai.');
