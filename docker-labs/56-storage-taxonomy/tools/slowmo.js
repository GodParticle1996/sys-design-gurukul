'use strict';
// ex0-slowmo: MODEL. Asha (user 42) moves from Pune 411004 to Pune 411038. Her address lives in one row (relational),
// or is copied into her profile document and 5 order documents (document store). The app crashes after 3 writes.
const NEW = '411038', OLD = '411004';
console.log('== MODEL: relational — the address is one row; orders point at it by id ==');
console.log('step 1  UPDATE addresses SET pincode = 411038 WHERE id = 42      → 1 row changed');
console.log('step 2  profile page: users ⋈ addresses                          → 411038');
console.log('        order #5 page (still pending): orders ⋈ users ⋈ addresses  → 411038 (same row, read through the join)');
console.log('');
console.log('== MODEL: documents — the address is copied into 6 documents ==');
const docs = ['profile', 'order #1', 'order #2', 'order #3', 'order #4', 'order #5'].map(name => ({ name, pin: OLD }));   // all 5 orders still pending
const crashAfter = 3;
docs.forEach((d, i) => {
  if (i < crashAfter) { d.pin = NEW; console.log(`step ${i + 1}  rewrite ${d.name.padEnd(9)} → ${NEW}`); }
  else if (i === crashAfter) console.log(`step ${i + 1}  💥 app crashes before rewriting ${d.name} (no transaction around the 6 writes)`);
});
console.log('');
console.log('after the crash, what each page shows:');
for (const d of docs) console.log(`  ${d.name.padEnd(9)} ${d.pin}${d.pin === OLD ? '   ← old address; a courier would go here' : ''}`);
const newCount = docs.filter(d => d.pin === NEW).length;
console.log(`${newCount} documents say ${NEW}, ${docs.length - newCount} say ${OLD}. Nothing in the database says which is true.`);
console.log('');
console.log('Fixes: one transaction around all 6 writes (all or nothing), or keep the address in one place and look it up.');
