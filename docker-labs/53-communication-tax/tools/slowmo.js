'use strict';
// Slow motion: one HTTPS call's bill, item by item, then chatty vs chunky. Used by the dry runs.
const RTT = 40, WORK = 5;   // ms: one round trip to the server; server work per call

const part = process.argv[2] || 'all';
if (part === 'all' || part === 'bill') {
  console.log(`== bill: one call to a server ${RTT} ms away (round trip), new connection, DNS cached ==`);
  const rows = [['TCP handshake (SYN, SYN-ACK, ACK)', RTT], ['TLS 1.3 handshake', RTT], ['request goes, response comes', RTT], ['server work', WORK]];
  let t = 0;
  for (const [what, ms] of rows) { t += ms; console.log(`  ${what.padEnd(34)} +${String(ms).padStart(3)} ms   total ${String(t).padStart(3)} ms`); }
  console.log(`  same call on a reused connection:  ${RTT} + ${WORK} = ${RTT + WORK} ms (no handshakes)`);
  console.log('');
}
if (part === 'all' || part === 'chatty') {
  console.log(`== chatty vs chunky: home screen needs name, avatar, bio, orders, offers (reused connection, ${RTT} ms RTT) ==`);
  const calls = ['name', 'avatar', 'bio', 'orders', 'offers'];
  let t = 0;
  calls.forEach((c, i) => { t += RTT + WORK; console.log(`  chatty call ${i + 1} (${c.padEnd(6)}) after ${String(t).padStart(3)} ms`); });
  console.log(`  chunky: one call, server gathers all 5 next to its data: ${RTT} + ${calls.length * WORK} = ${RTT + calls.length * WORK} ms`);
  console.log(`  chatty but parallel (5 calls at once): about ${RTT + WORK} ms, but 5 requests of server work (and 5 connections for an HTTP/1.1 client that does not pipeline)`);
}
