'use strict';
// ex6-bgp: MODEL (no network). For each prefix, BGP picks among its alternatives by policy (LOCAL_PREF), then AS-path
// length — not by measured speed or distance. Forwarding then uses the longest matching installed prefix. Three small worlds: policy over speed, anycast catchment, and a route leak.
const { best } = require('../lib/bgp');
const { km, rtt } = require('../lib/geo');
const ms = x => x.toFixed(0) + ' ms';

console.log('MODEL: per prefix, BGP picks the route with the highest LOCAL_PREF (policy), then the shortest AS path;');
console.log('       sending a packet then uses the longest matching installed prefix. Other BGP checks and tie-breakers are left out.');
console.log('');
console.log('A) DelhiNet ISP → KhanaKart 203.0.113.0/24: two routes it learned');
const a = [
  { via: 'PeerFast (peer)', prefix: '203.0.113.0/24', localPref: 100, asPath: ['PeerFast', 'KhanaKart'], measured: 50 },
  { via: 'TransitCheap (cheap contract)', prefix: '203.0.113.0/24', localPref: 150, asPath: ['TransitCheap', 'Carrier9', 'KhanaKart'], measured: 200 },
];
const pickA = best(a, '203.0.113.10');
for (const r of a) console.log(`   ${r.via.padEnd(30)} LOCAL_PREF ${r.localPref}  AS path ${r.asPath.length}  measured RTT ${ms(r.measured).padStart(6)}  ${r === pickA ? '← chosen' : ''}`);
console.log('   BGP never saw the 50 ms vs 200 ms: policy (LOCAL_PREF) decides before path length, and speed is not an input.');

console.log('');
console.log('B) anycast: KhanaKart announces 198.51.100.0/24 from Mumbai, Singapore and Frankfurt PoPs');
const pops = ['Mumbai', 'Singapore', 'Frankfurt'];
const isp = {   // what each user's ISP learned: per PoP, the LOCAL_PREF its contracts give and the AS-path length
  Delhi: { Mumbai: [100, 2], Singapore: [50, 3], Frankfurt: [50, 3] },
  Chennai: { Mumbai: [50, 3], Singapore: [100, 2], Frankfurt: [50, 4] },
  Dubai: { Mumbai: [50, 3], Singapore: [50, 4], Frankfurt: [50, 2] },
  London: { Mumbai: [50, 4], Singapore: [50, 4], Frankfurt: [100, 2] },
  Sydney: { Mumbai: [50, 4], Singapore: [50, 3], Frankfurt: [50, 5] },
};
console.log('   user       BGP sends to   distance   RTT (min)   nearest PoP   distance   RTT (min)');
for (const [user, seen] of Object.entries(isp)) {
  const routes = pops.map(p => ({ pop: p, prefix: '198.51.100.0/24', localPref: seen[p][0], asPath: Array(seen[p][1]).fill('AS') }));
  const got = best(routes, '198.51.100.7').pop;
  const near = pops.reduce((x, y) => km(user, x) <= km(user, y) ? x : y);
  const d = p => (Math.round(km(user, p)).toLocaleString('en-IN') + ' km').padStart(9);
  const flag = got === near ? '' : '   ← not the nearest';
  console.log(`   ${user.padEnd(9)}  ${got.padEnd(13)}  ${d(got)}   ${ms(rtt(km(user, got))).padStart(9)}   ${near.padEnd(12)}  ${d(near)}   ${ms(rtt(km(user, near))).padStart(9)}${flag}`);
}
console.log('   anycast lands each user where its ISP\'s policy and AS path point — usually near, not always the nearest.');

console.log('');
console.log('C) route leak: KhanaKart announces 203.0.112.0/22; LeakyNet wrongly announces 203.0.113.0/24 inside it (like YouTube, 2008)');
console.log('   ASSUMED: KhanaKart has a valid covering ROA and SafeNet rejects RPKI-Invalid routes; LeakyNet is not an authorized origin');
const real = { prefix: '203.0.112.0/22', localPref: 100, asPath: ['Transit', 'KhanaKart'], to: 'KhanaKart (real)' };
const leak = { prefix: '203.0.113.0/24', localPref: 50, asPath: ['Transit', 'Carrier9', 'LeakyNet'], to: 'LeakyNet (leak)' };
const isps = [['DelhiNet', false], ['MumbaiFiber', false], ['ChennaiNet', false], ['SafeNet (RPKI filter)', true]];
console.log('   ISP                      203.0.113.10 before → after          203.0.112.10 after');
for (const [name, filters] of isps) {
  const after = filters ? [real] : [real, leak];
  console.log(`   ${name.padEnd(23)}  ${best([real], '203.0.113.10').to} → ${best(after, '203.0.113.10').to.padEnd(17)}  ${best(after, '203.0.112.10').to}`);
}
console.log('   both routes are installed; the /24 is the longer match, so 203.0.113.x follows it despite worse policy and a longer path.');
console.log('   without a covering ROA the leak is NotFound, not Invalid; a leak that keeps an authorized origin passes origin checks.');
