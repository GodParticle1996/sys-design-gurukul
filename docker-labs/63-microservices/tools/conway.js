'use strict';
const { paths, withinTeams, renameDeploys } = require('../lib/arith');
const n = x => x.toLocaleString('en-IN');
console.log('A. Arithmetic (Brooks, The Mythical Man-Month, ch. 2): agar har insaan ko har insaan se taal-mel karna pade toh n(n − 1)/2');
console.log('   sambhavit raaste. 8 ki teams sirf ek chuni hui misaal hai (aakhri team chhoti ho sakti hai).\n');
console.log('log      sab-se-sab raaste     8 ki teams: saari teams ke andar ke raaste   teams ke beech sambhavit raaste');
for (const p of [5, 20, 100, 5000]) {
  const teams = Math.ceil(p / 8);
  console.log(`${String(p).padStart(5)}   ${n(paths(p)).padStart(16)}        ${n(withinTeams(p)).padStart(12)}                              ${n(paths(teams)).padStart(12)}`);
}
console.log('\n→ Raaste log ke square ki tarah badhte hain — par ye sambhavit raaste hain, naapa hua kaam nahi. Kitna taal-mel chahiye,');
console.log('  code ki dependencies, zimmedariyon aur tools par tika hai. Raaston ka hisaab kisi headcount par "ab todo" ka faisla nahi deta.');
console.log('  Conway (1968): system ka dhaancha team ke baat-cheet ke dhaanche jaisa banta hai. Team, codebase aur deploy unit alag cheezein hain.\n');
console.log('B. Arithmetic: services ke beech ke API mein ek field ka naam badlo ("name" → "full_name") — ek TODNE wala badlaav, bina downtime.');
console.log('   Ek producer, baaki consumers alag-alag deploy hote hain. (Naya field jodna, jise purane readers ignore karein — tolerant reader —');
console.log('   bina is kram ke ship ho sakta hai. DB column ka naam badalna ho toh monolith mein bhi expand/contract chahiye.)\n');
console.log('services   deploys   kram');
for (const k of [1, 2, 3, 5]) {
  const d = renameDeploys(k);
  console.log(`${String(k).padStart(8)}   ${String(d).padStart(7)}   ${k === 1 ? 'ek codebase, ek release (monolith ke andar ka function interface)' : `producer dono naam likhe → ${k - 1} consumer naya naam padhein → producer purana band`}`);
}
console.log('\n→ Monolith ke andar ka function interface: ek release, compiler/IDE saari jagah dikhata hai. Services ke beech todne wala badlaav:');
console.log('  expand/contract (parallel change), deploys ka kram, aur galat kram par purana consumer toota (video ka "purane format" wala).');
