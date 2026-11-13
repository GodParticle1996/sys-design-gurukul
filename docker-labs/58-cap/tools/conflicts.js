'use strict';
// ex4-conflicts — seeded: replicas A aur B 60 s ke liye alag, dono writes lete rahe; phir jude aur merge hua.
const { likes, names, carts } = require('../lib/conflicts');
const f = n => n.toLocaleString('en-IN');
const l = likes();
console.log('a) Likes counter — pehle 1,000; split mein A par 300, B par 200 (sach: 1,500)');
console.log(`   LWW (har taraf ne GINTI likhi, baad wali jeeti)   ${f(l.lww)}  → ${f(l.truth - l.lww)} likes gayab`);
console.log(`   G-Counter CRDT (har replica ka apna khaana)        ${f(l.crdt)}`);
const nm = names();
console.log(`\nb) Naam — ${f(nm.users)} users, har user ka naam dono taraf badla; B ki ghadi 5 s peeche`);
console.log(`   LWW                     har user ka ek write chupchaap gaya (${f(nm.lwwDropped)});  ${f(nm.wrong)} baar (${(100 * nm.wrong / nm.users).toFixed(1)}%) asal mein PEHLE wala write jeeta`);
console.log(`   version vectors         ${f(nm.conflicts)} conflicts pakde — dono versions rakhe, app/user tay kare`);
const ct = carts();
console.log(`\nc) Cart — ${f(ct.n)} carts {apple, bread}; split mein A ne apple hataya + chai joda, B ne dal joda. Iraada: {bread, chai, dal}`);
for (const [k, name] of [['lww', 'LWW (poora cart, baad wala jeeta)'], ['union', 'dono versions ka union (Dynamo jaisa)'], ['orset', 'OR-Set CRDT (add jeetta hai)']])
  console.log(`   ${name.padEnd(38)}  joda hua item gayab: ${String(ct[k].lostAdd).padStart(3)}   hataya apple wapas: ${String(ct[k].back).padStart(3)}`);
