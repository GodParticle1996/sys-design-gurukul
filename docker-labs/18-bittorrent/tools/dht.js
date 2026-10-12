/* Tracker hi band ho jaaye toh? DHT (Kademlia): har node thode se nodes jaanta hai, aur XOR distance se "paas" jaata hai.
   Asli Kademlia mein ID 160-bit hoti hai; yahan 32-bit taaki laptop pe 1 lakh nodes chal jaayein. Idea same hai.
   node tools/dht.js [--nodes 1000,10000,100000] [--lookups 300] */
const args = require('./args')();
const K = 8, ALPHA = 3;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s; }; }

function build(N, r) {
  const set = new Set(); while (set.size < N) set.add(r());
  const ids = Uint32Array.from(set).sort();
  const lower = x => { let lo = 0, hi = ids.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ids[m] < x) lo = m + 1; else hi = m; } return lo; };
  const tables = new Array(N);
  for (let n = 0; n < N; n++) {
    const me = ids[n], out = [];
    for (let b = 31; b >= 0; b--) {             // bucket b: jinka XOR distance ka sabse bada bit = b (prefix same, bit b alag)
      const prefix = b === 31 ? 0 : Math.floor(me / 2 ** (b + 1)) * 2 ** (b + 1);   // upar ke bits same
      const start = prefix + ((Math.floor(me / 2 ** b) & 1) ? 0 : 2 ** b), end = start + 2 ** b;   // bit b ulta
      const a = lower(start), z = lower(end);
      const cnt = z - a; if (cnt <= 0) continue;
      for (let j = 0; j < Math.min(K, cnt); j++) out.push(ids[a + (cnt <= K ? j : r() % cnt)]);
    }
    tables[n] = Uint32Array.from(out);
  }
  const index = new Map(); ids.forEach((id, i) => index.set(id, i));
  return { ids, tables, index };
}

function lookup(net, startIdx, target) {
  const dist = id => (id ^ target) >>> 0;
  const seen = new Set(), queried = new Set();
  let short = [...net.tables[startIdx]].sort((a, b) => dist(a) - dist(b)).slice(0, K);
  short.forEach(x => seen.add(x));
  let rounds = 0, msgs = 0;
  for (;;) {
    const todo = short.filter(x => !queried.has(x)).slice(0, ALPHA);
    if (!todo.length) break;
    rounds++;
    const bestBefore = dist(short[0]);
    for (const id of todo) {
      queried.add(id); msgs++;
      const t = net.tables[net.index.get(id)];
      const closest = [...t].sort((a, b) => dist(a) - dist(b)).slice(0, K);     // "tumhe jo K sabse paas pata hain, batao"
      for (const c of closest) if (!seen.has(c)) { seen.add(c); short.push(c); }
    }
    short.sort((a, b) => dist(a) - dist(b)); short = short.slice(0, K);
    if (dist(short[0]) >= bestBefore && short.every(x => queried.has(x))) break;
  }
  return { found: short[0], rounds, msgs };
}

const sizes = (args.nodes || '1000,10000,100000').split(',').map(Number);
const L = +(args.lookups || 300);
console.log(`nodes       har node kitne jaanta hai   avg rounds   max rounds   avg messages   sahi node mila   (${L} lookups, k=${K}, alpha=${ALPHA})`);
for (const N of sizes) {
  const r = rng(42 + N);
  const net = build(N, r);
  let rs = 0, mx = 0, ms = 0, ok = 0;
  for (let i = 0; i < L; i++) {
    const target = r();
    const res = lookup(net, r() % N, target);
    let best = net.ids[0]; for (const id of net.ids) if (((id ^ target) >>> 0) < ((best ^ target) >>> 0)) best = id;   // asli jawab (brute force)
    if (res.found === best) ok++;
    rs += res.rounds; ms += res.msgs; mx = Math.max(mx, res.rounds);
  }
  const avgTable = Math.round(net.tables.reduce((s, t) => s + t.length, 0) / N);
  console.log(`${String(N).padEnd(11)} ${String(avgTable).padStart(6)} (${(100 * avgTable / N).toFixed(2)}%)         ${(rs / L).toFixed(1).padStart(6)}       ${String(mx).padStart(6)}       ${(ms / L).toFixed(1).padStart(8)}         ${(100 * ok / L).toFixed(1)}%`);
}
console.log('\nNodes 100x bade, par rounds sirf thode se badhe — har round mein XOR distance ka ek aur bit "sahi" ho jaata hai (log N).');
