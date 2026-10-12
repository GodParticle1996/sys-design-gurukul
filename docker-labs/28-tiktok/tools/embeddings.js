/* Har user aur har video ka ek embedding (ek vector — "is bande ka taste"). Crore users → table kitni badi?
   A) fixed-size hashed table: row = hash(user) % SIZE. Sasta, par do alag users ek hi row share kar sakte hain → dono ka taste mix.
   B) cuckoo hash table (Monolith paper jaisa): 2 hash functions, har key ki 2 sambhav jagah; bhari ho toh purane ko uski dusri jagah dhakelo.
      Collision-free — koi do users ek row share nahi karte.
   C) expiry: jo user 30 din se nahi aaya, uski row hatao.
   node tools/embeddings.js [--users 1000000] */
const args = require('./args')();
const U = +(args.users || 1000000), DIM = 16, BYTES = DIM * 4;
const h1 = x => { x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); return (x ^ (x >>> 16)) >>> 0; };
const h2 = x => { x = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0; };
const ids = Array.from({ length: U }, (_, i) => (i * 2654435761 + 12345) >>> 0);
const mb = rows => (rows * BYTES / 1048576).toFixed(0) + ' MB';
console.log(`${U.toLocaleString('en-US')} users, embedding = ${DIM} floats (${BYTES} bytes)\n`);
console.log('A) fixed-size hashed table');
for (const size of [U / 2, U, U * 2, U * 4]) {
  const count = new Uint32Array(size); ids.forEach(id => count[h1(id) % size]++);
  let shared = 0; for (const c of count) if (c > 1) shared += c;
  console.log(`   table ${String(size).padStart(8)} rows (${mb(size).padStart(6)}): ${(100 * shared / U).toFixed(1).padStart(5)}% users kisi aur ke saath row share karte hain`);
}
console.log('\nB) cuckoo hash table (load 50%, 2 jagah per key)');
{
  const size = U * 2, table = new Int32Array(size).fill(-1); let maxChain = 0, totalKicks = 0, fails = 0;
  for (let i = 0; i < U; i++) {
    let key = i, kicks = 0, pos = h1(ids[key]) % size;
    for (;;) {
      if (table[pos] === -1) { table[pos] = key; break; }
      const alt = h2(ids[key]) % size;                                  // doosri jagah try
      if (pos !== alt && table[alt] === -1) { table[alt] = key; break; }
      const victim = table[pos]; table[pos] = key; key = victim; kicks++;   // dhakka — purane ko nikaalo
      const a = h1(ids[key]) % size, b = h2(ids[key]) % size; pos = a === pos ? b : a;
      if (kicks > 500) { fails++; break; }
    }
    totalKicks += kicks; maxChain = Math.max(maxChain, kicks);
  }
  console.log(`   table ${size} rows (${mb(size)}): 0% sharing (har user ki apni row), avg dhakke ${(totalKicks / U).toFixed(2)}, sabse lambi chain ${maxChain}, fail ${fails}`);
}
console.log('\nC) expiry — 30 din se inactive users hatao');
{
  let s = 5; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  let active = 0; for (let i = 0; i < U; i++) { const lastSeenDays = Math.floor(Math.pow(r(), 2.5) * 365); if (lastSeenDays <= 30) active++; }
  console.log(`   ${active.toLocaleString('en-US')} / ${U.toLocaleString('en-US')} users pichhle 30 din mein aaye → table ${mb(U)} → ${mb(active)} (${Math.round(100 * (1 - active / U))}% memory bachi)`);
}
console.log('\nHashed table sasta hai par "tum aur koi anjaan" ek hi taste share karte ho → recommendations gadbad.');
console.log('Cuckoo: har user ki apni row, lookup hamesha sirf 2 jagah dekhna. Expiry se table sirf zinda users jitni.');
