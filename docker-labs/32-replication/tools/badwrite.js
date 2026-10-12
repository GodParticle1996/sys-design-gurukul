/* Replica backup nahi hai. Ek galat query (DELETE bina WHERE) — replica ne turant copy kar li.
   Backup = raat 2 baje ka snapshot + uske baad ka har write ka log (WAL archive) → kisi bhi pal tak wapas (point-in-time restore).
   node tools/badwrite.js */
class DB {
  constructor(name) { this.name = name; this.rows = new Map(); this.replicas = []; this.log = []; this.seq = 0; }
  apply(op, fromLog) {
    if (op.type === 'put') this.rows.set(op.id, op.val);
    if (op.type === 'delete-all') this.rows.clear();
    if (!fromLog) { op.seq = ++this.seq; op.at = op.at; this.log.push(op); this.replicas.forEach(r => r.apply(op, true)); }   // sync replication
  }
}
const primary = new DB('primary'), replica = new DB('replica'); primary.replicas.push(replica);
for (let i = 0; i < 10000; i++) primary.apply({ type: 'put', id: i, val: 'order-' + i, at: '01:00' });
const snapshot = new Map(primary.rows), snapSeq = primary.seq;               // raat 2 baje ka backup
console.log(`02:00 backup (snapshot): ${snapshot.size} orders, log seq ${snapSeq}`);
for (let i = 10000; i < 10500; i++) primary.apply({ type: 'put', id: i, val: 'order-' + i, at: '09:00' });
console.log(`09:00 tak: primary ${primary.rows.size}, replica ${replica.rows.size} orders (500 naye aaj subah)`);
primary.apply({ type: 'delete-all', at: '10:42' });                           // intern: DELETE FROM orders;
const badSeq = primary.seq;
console.log(`\n10:42 intern ne chalaya: DELETE FROM orders;   (WHERE bhool gaya)`);
console.log(`   primary: ${primary.rows.size} orders    replica: ${replica.rows.size} orders   ← replica ne bhi wafadaari se copy kar liya`);
console.log(`   "replica par failover karo!" → bekaar, wahan bhi 0.`);
const fromSnap = new Map(snapshot);
console.log(`\nRestore sirf snapshot se: ${fromSnap.size} orders   (subah ke 500 gaye)`);
const pitr = new Map(snapshot);
for (const op of primary.log) if (op.seq > snapSeq && op.seq < badSeq) { if (op.type === 'put') pitr.set(op.id, op.val); if (op.type === 'delete-all') pitr.clear(); }
console.log(`Restore snapshot + log (bad query se thik PEHLE tak, seq < ${badSeq}): ${pitr.size} orders  ✅ sab wapas`);
console.log('\nReplica = hardware/machine ke marne se bachaata hai (sab kuch, galtiyan bhi, turant copy).');
console.log('Backup + log = galti se bachaata hai (samay mein peeche ja sakte ho). Dono chahiye, ek dusre ki jagah nahi le sakte.');
console.log('Asli Postgres mein yahi: base backup + WAL archive → recovery_target_time. (SQL Gurukul lab 08-replication mein asli PG par.)');
