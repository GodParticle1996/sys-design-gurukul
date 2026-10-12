/* Sabse chhota chalta program: lib/bounded-queue.js + ek bhejne wala + ek kaam karne wala.
   Line mein 3 ki jagah. Bhejne wala 8 kaam jitni jaldi ho sake deta hai; kaam karne wala ek kaam par 400 ms lagata hai.
   node tools/mini.js */
const { BoundedQueue } = require('../lib/bounded-queue');
const { sleep } = require('../lib/util');

const line = new BoundedQueue({ cap: 3, policy: 'block' });

async function sender() {                    // bhejne wala: 8 kaam, jitni jaldi ho sake
  for (let k = 1; k <= 8; k++) {
    if (line.full) say(`#${k} dena hai · line bhari → RUKA`);
    await line.put('#' + k);                 // line bhari ho toh yahin rukta hai — yahi backpressure hai
    say(`#${k} line mein`);
  }
}

async function worker() {                    // kaam karne wala: ek kaam = 400 ms
  await sleep(100);
  for (let done = 0; done < 8; done++) {
    while (!line.items.length) await sleep(10);
    const job = line.take();                 // ek jagah bani → ruka hua bhejne wala jaagta hai
    say(`${job} uthaya`);
    await sleep(400);
  }
}

/* ---- neeche sirf chhapai hai ---- */
const t0 = Date.now();
function say(text) {
  const t = ((Date.now() - t0) / 1000).toFixed(1).padStart(4) + ' s';
  console.log(`${t}  ${text.padEnd(34)} line: [${line.items.join(' ')}]`);
}

(async () => {
  console.log('line mein 3 ki jagah · bhejne wala: 8 kaam, jitni jaldi ho sake · kaam karne wala: ek kaam = 400 ms\n');
  await Promise.all([sender(), worker()]);
  console.log('\nBhejne wale ne pehle 3 kaam ek saath diye. Uske baad har 400 ms par ek — kaam karne wale ki raftaar par.');
  console.log(`Line kabhi 3 se upar nahi gayi · gire: ${line.dropped} · "na" bola: ${line.refused}`);
})();
