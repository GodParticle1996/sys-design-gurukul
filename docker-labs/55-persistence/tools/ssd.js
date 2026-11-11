'use strict';
// ex6-ssd: MODEL of an SSD's flash translation layer: 512 blocks × 256 pages × 4 KB (512 MB), greedy garbage collection.
// The drive is filled to the given level, then the host overwrites 4× the stored data.
const { simulate } = require('../lib/ftl');
console.log('== MODEL: overwrite 4× the stored data; flash writes counted, including garbage collection copies ==');
console.log('pattern      drive full   host writes   GC copies   flash writes ÷ host writes   block erases');
for (const [pattern, fill] of [['random', 0.5], ['random', 0.75], ['random', 0.9], ['random', 0.95], ['sequential', 0.9]]) {
  const r = simulate({ fill, pattern });
  console.log(`${pattern.padEnd(11)}  ${((fill * 100) + '%').padStart(10)}   ${r.hostWrites.toLocaleString('en-IN').padStart(11)}   ${r.gcWrites.toLocaleString('en-IN').padStart(9)}   ${r.writeAmp.toFixed(2).padStart(26)}×   ${r.erases.toLocaleString('en-IN').padStart(12)}`);
}
console.log('Flash cannot overwrite a page in place; GC copies the still-live pages of a block before erasing it.');
console.log('Fuller drive → fewer stale pages per block → more copying. Sequential overwrites leave whole blocks stale: no copying.');
