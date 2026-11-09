'use strict';
// A small combined model (no protocol). BGP selects among alternatives for the SAME prefix:
//   1. highest LOCAL_PREF (the ISP's business policy: customer > cheap contract > peer > expensive transit)
//   2. shortest AS_PATH
// Forwarding then uses the longest matching installed prefix (a /24 beats a /22 for an address inside both).
// This helper computes the combined result for one address.
// Real routers have more tie-breakers (origin, MED, eBGP over iBGP, IGP cost, router id); they are left out.
function prefixLen(p) { return Number(p.split('/')[1]); }
function covers(prefix, ip) {                 // IPv4 prefix contains ip?
  const [net, len] = prefix.split('/'); const n = Number(len);
  const toInt = s => s.split('.').reduce((a, o) => a * 256 + Number(o), 0);
  return Math.floor(toInt(ip) / 2 ** (32 - n)) === Math.floor(toInt(net) / 2 ** (32 - n));
}
function best(routes, ip) {
  const match = routes.filter(r => covers(r.prefix, ip));
  if (!match.length) return null;
  const longest = Math.max(...match.map(r => prefixLen(r.prefix)));
  return match.filter(r => prefixLen(r.prefix) === longest)
    .sort((a, b) => b.localPref - a.localPref || a.asPath.length - b.asPath.length)[0];
}
module.exports = { best, covers, prefixLen };
