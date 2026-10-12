/* Free-riders: 20% peers kuch upload nahi karte, sirf lete hain.
   choke=none: har uploader random logon ko deta hai.  choke=titfortat: jo mujhe deta hai, main use deta hoon (+1 optimistic slot).
   node tools/titfortat.js */
const { run } = require('../lib/swarm');
const med = a => { const d = a.map(p => p.done).filter(x => x != null).sort((x, y) => x - y); return d.length ? d[Math.floor(d.length / 2)] : '—'; };
console.log('choke        honest peers p50   free-riders p50   (sec, 200 peers, 128 pieces, 20% free-riders)');
for (const choke of ['none', 'titfortat']) {
  const r = run({ peers: 200, pieces: 128, originUp: 8, peerUp: 2, peerDown: 8, freeRiders: 0.2, choke });
  const fr = r.peers.filter(p => p.freeRider), hon = r.peers.filter(p => !p.freeRider);
  console.log(`${choke.padEnd(12)} ${String(med(hon)).padStart(8)}           ${String(med(fr)).padStart(8)}`);
}
const noOpt = run({ peers: 200, pieces: 128, originUp: 8, peerUp: 2, peerDown: 8, freeRiders: 0, choke: 'titfortat', optimistic: false, maxTicks: 400 });
console.log(`\ntitfortat BINA optimistic unchoke (koi free-rider nahi): 400 sec mein ${noOpt.peers.filter(p => p.done != null).length}/200 poore hue, p50 ${med(noOpt.peers)}`);
console.log('(naye peer ke paas dene ko kuch nahi → koi use unchoke nahi karta → optimistic slot hi naye logon ka darwaza hai)');
