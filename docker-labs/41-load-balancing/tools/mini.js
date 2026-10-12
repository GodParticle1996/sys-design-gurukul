/* Sabse chhota chalta program: lib/pick.js ke chaaron tareeke, ek hi (purani) jaankari par.
   LB ko dikh raha hai: S1 par 3 kaam, S2 par 0, S3 par 1. Agli jaankari aane tak LB ko yahi dikhta rahega.
   node tools/mini.js */
const { roundRobin, anyOne, leastLoaded, bestOfTwo } = require('../lib/pick');
const seeded = require('./seeded');                              // tay beej wala random: har run mein wahi sikke

const loads = [3, 0, 1];                                         // S1, S2, S3 — LB ko yahi dikh raha hai
const state = { next: 0 }, random = seeded(7);

const pickers = {
  'baari-baari      ': () => roundRobin(state, loads.length),
  'koi bhi ek       ': () => anyOne(loads.length, random),
  'sabse kam load   ': () => leastLoaded(loads, random),
  'do mein se behtar': () => bestOfTwo(loads, random),
};

console.log('LB ko dikh raha hai:  S1 3 · S2 0 · S3 1   (yeh jaankari agli 12 requests tak nahi badlegi)\n');
console.log('tareeka             agli 12 requests kahan gayi                       1,000 requests: S1 / S2 / S3');
for (const [name, pick] of Object.entries(pickers)) {
  const first = [];
  for (let i = 0; i < 12; i++) first.push('S' + (pick() + 1));
  const count = [0, 0, 0];
  for (let i = 0; i < 1000; i++) count[pick()]++;
  console.log(`${name}   ${first.join(' ')}   ${count.join(' / ')}`);
}
console.log('\n"Sabse kam load" ne saari requests ek hi server (S2) par bhej di — jab tak nayi jaankari na aaye.');
console.log('"Do mein se behtar" ne S1 (sabse bhara) ko kabhi nahi chuna, aur baaki do mein baant diya.');

/* ---- barabari: teeno servers khaali dikh rahe hain. "Sabse kam load wala" kise chune? ---- */
const empty = [0, 0, 0];
const alwaysFirst = l => l.indexOf(Math.min(...l));              // barabari mein hamesha pehla server
const tally = pick => { const c = [0, 0, 0]; for (let i = 0; i < 1000; i++) c[pick()]++; return c.join(' / '); };
console.log('\nLB ko dikh raha hai:  S1 0 · S2 0 · S3 0   (teeno barabar)');
console.log('barabari mein hamesha pehla server:   ' + tally(() => alwaysFirst(empty)));
console.log('barabari mein sikka (lib/pick.js):    ' + tally(() => leastLoaded(empty, random)));
