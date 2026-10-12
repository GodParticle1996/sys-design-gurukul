/* Forkable database (copy-on-write overlay): agent ko production DB ki "copy" do — asli copy kiye bina.
   Fork sirf apne badlaav (writes + tombstones) rakhta hai; padhte waqt pehle overlay, phir parent.
   node tools/forkdb.js */
class Table {
  constructor(parent) { this.parent = parent; this.rows = new Map(); this.dead = new Set(); this.dropped = false; }
  get(id) { if (this.dropped || this.dead.has(id)) return undefined; return this.rows.has(id) ? this.rows.get(id) : this.parent ? this.parent.get(id) : undefined; }
  set(id, v) { this.rows.set(id, v); this.dead.delete(id); }
  del(id) { this.rows.delete(id); this.dead.add(id); }
  drop() { this.dropped = true; this.rows.clear(); }
  count() { if (this.dropped) return 0; const base = this.parent ? this.parent.ids() : []; const all = new Set([...base, ...this.rows.keys()]); for (const d of this.dead) all.delete(d); return all.size; }
  ids() { return this.dropped ? [] : [...new Set([...(this.parent ? this.parent.ids() : []), ...this.rows.keys()])].filter(i => !this.dead.has(i)); }
  overlaySize() { return this.rows.size + this.dead.size; }
}
const prod = new Table(null);
const t0 = Date.now();
for (let i = 0; i < 500000; i++) prod.set(i, { name: 'user' + i, plan: i % 10 ? 'free' : 'pro' });
console.log(`production users table: ${prod.count().toLocaleString('en-US')} rows (banane mein ${Date.now() - t0} ms)\n`);
let t = process.hrtime.bigint(); const fork = new Table(prod); const forkMs = Number(process.hrtime.bigint() - t) / 1e6;
console.log(`fork banaya: ${forkMs.toFixed(3)} ms, overlay mein ${fork.overlaySize()} rows (kuch copy nahi hua)`);
fork.set(7, { name: 'user7', plan: 'pro' }); fork.del(8); fork.set(999999, { name: 'test-user', plan: 'free' });
console.log(`agent ne fork mein 3 badlaav kiye → overlay ${fork.overlaySize()} rows | fork: user 7 = ${fork.get(7).plan}, user 8 = ${fork.get(8)}, prod: user 7 = ${prod.get(7).plan}, user 8 = ${prod.get(8).name}`);
console.log('\nAb agent galti se: "DROP TABLE users" (fork mein)');
fork.drop();
console.log(`  fork mein users: ${fork.count()}      production mein users: ${prod.count().toLocaleString('en-US')}  ✅ asli data ko haath bhi nahi laga`);
console.log('\nFork discard karo → kuch nahi hua. Fork achha nikla → uske chhote overlay ko hi prod par lagao (review ke baad).');
console.log('Isi liye agent ko prod ka read-write access dene ki jagah har kaam ek fork mein — aur fork banana muft.');
