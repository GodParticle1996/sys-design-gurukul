'use strict';
// Slow motion (arithmetic, no network): what a packet carries, and the bill of a cold DNS lookup.
const { km, rtt } = require('../lib/geo');
const part = process.argv[2] || 'all';
const MTU = 1500, IP = 20, TCP = 20, ETH = 14, MSS = MTU - IP - TCP;

if (part === 'all' || part === 'packet') {
  console.log(`== packet: Ethernet MTU ${MTU} bytes; IPv4 header ${IP} + TCP header ${TCP} (no options) → ${MSS} bytes of data per segment ==`);
  for (const bytes of [200, 10000, 1000000]) {
    const segs = Math.ceil(bytes / MSS), hdr = segs * (IP + TCP + ETH);
    console.log(`  ${bytes.toLocaleString('en-IN').padStart(9)} bytes of data → ${String(segs).padStart(3)} segment${segs === 1 ? " " : "s"}; headers ${hdr.toLocaleString('en-IN').padStart(6)} bytes (IP + TCP + Ethernet ${IP + TCP + ETH} each) = ${(hdr / (bytes + hdr) * 100).toFixed(1)}% of what is sent`);
  }
  console.log(`  with the common TCP timestamps option (+12 bytes) a segment carries ${MSS - 12} bytes; Ethernet also adds a 4-byte checksum`);
  console.log('');
}
if (part === 'all' || part === 'dns') {
  const hops = [['you → resolver (ISP / 1.1.1.1), and its answer back', 5], ['resolver → root (.): "ask .com"', 20], ['resolver → TLD (.com): "ask ns1.khanakart.com"', 30], ['resolver → authoritative: "10.0.0.12, TTL 300"', 40]];
  console.log('== cold DNS lookup of api.khanakart.com (MODEL round trips; resolver cache empty) ==');
  let t = 0;
  for (const [what, ms] of hops) { t += ms; console.log(`  ${what.padEnd(52)} +${String(ms).padStart(3)} ms   total ${String(t).padStart(3)} ms`); }
  console.log('  same name again, resolver cache warm:                 5 ms   (only you ↔ resolver)');
  console.log('  img.khanakart.com, .com and khanakart.com referrals cached: 5 + 40 = 45 ms');
  console.log('  only after this does the TCP handshake (video 3) start');
}
if (part === 'all' || part === 'edge') {
  const far = rtt(km('Sydney', 'Ashburn (US-East)')), near = 3;
  console.log('');
  console.log(`== edge: user in Sydney, origin in Ashburn (great-circle fiber RTT ${far.toFixed(1)} ms, a lower bound); TCP + TLS 1.3, cache miss ==`);
  console.log(`  direct to origin: TCP 1 + TLS 1 + request 1 = 3 × ${far.toFixed(1)} = ${(3 * far).toFixed(0)} ms to first byte`);
  console.log(`  TLS ends at a Sydney edge (RTT ${near} ms), edge keeps a warm connection to origin: 2 × ${near} + ${near} + ${far.toFixed(1)} = ${(3 * near + far).toFixed(0)} ms`);
  console.log(`  cache hit at the edge: 3 × ${near} = ${3 * near} ms`);
}
