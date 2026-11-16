'use strict';
const { fnCall, jsonRound, serve, httpCalls, order } = require('../lib/callcost');
(async () => {
  const f = fnCall(), j = jsonRound();
  const srv = await serve();
  const keep = await httpCalls(srv, 3000, true), fresh = await httpCalls(srv, 1000, false);
  srv.close();
  const us = x => x < 1 ? `${(x * 1000).toFixed(0)} ns` : x < 1000 ? `${x.toFixed(1)} µs` : `${(x / 1000).toFixed(2)} ms`;
  console.log(`ASLI: ek hi sawaal ("sku-42 kitne bache?") chaar tarah se, is machine par. Order ka JSON ${JSON.stringify(order).length} bytes.\n`);
  console.log('tareeka                                                   ek call*            p99        function call se');
  console.log(`${'function call (monolith ke andar module)'.padEnd(57)} ${us(f / 1000).padStart(10)}      ${'—'.padStart(8)}      1×`);
  console.log(`${'JSON: request + jawab banao aur padho (transport nahi)'.padEnd(57)} ${us(j / 1000).padStart(10)}      ${'—'.padStart(8)}      ${Math.round(j / f).toLocaleString('en-IN')}×`);
  console.log(`${'HTTP + JSON, isi machine par, connection reuse (keep-alive)'.padEnd(57)} ${us(keep.p50).padStart(10)}  ${us(keep.p99).padStart(10)}      ${Math.round(keep.p50 * 1000 / f).toLocaleString('en-IN')}×`);
  console.log(`${'HTTP + JSON, isi machine par, har call naya TCP connection'.padEnd(57)} ${us(fresh.p50).padStart(10)}  ${us(fresh.p99).padStart(10)}      ${Math.round(fresh.p50 * 1000 / f).toLocaleString('en-IN')}×`);
  const dc = 500;   // µs: an ASSUMED same-datacenter network round trip (model, not measured)
  console.log(`${'MODEL: doosri machine, same data center (+ 0.5 ms maana)'.padEnd(57)} ${us(keep.p50 + dc).padStart(10)}      ${'—'.padStart(8)}      ${Math.round((keep.p50 + dc) * 1000 / f).toLocaleString('en-IN')}×`);
  console.log('\n* Function aur JSON rows: 5 batches ke ausat mein sabse achha. HTTP rows: asli calls ka median. Function call mein V8 checkStock ko');
console.log('  loop mein inline kar deta hai — wahi in-process ka asli fayda hai, par ye "ek jump instruction" ka naap nahi.');
console.log('\n→ Video: function call ~10 ns, network call 1–2 ms, "100,000×". Is laptop par function call ~nanoseconds mein, loopback HTTP');
  console.log(`  ~dasiyon µs mein — network ke bina bhi hazaaron guna. Doosri machine ka 0.5 ms (maana hua) jodo toh ~${Math.round((keep.p50 + dc) * 1000 / f / 1000).toLocaleString('en-IN')} hazaar guna.`);
  console.log('  Ye anupaat is kaam aur is machine ke hain; doosri machine wali row 0.5 ms maan kar hai, naapi nahi.');
  console.log('→ Local function bhi fail ho sakti hai (exception, lock, anant loop, process ka marna). Network call naye failure jodti hai:');
console.log('  timeout, connection reset, aur "kaam hua ya nahi?" ka shak. Video ka "function call kabhi fail nahi hoti" bada daava hai.');
})();
