/* Ek counter, do model:
     replicated  — 3 replicas, har ek apni copy par read-modify-write karta hai,
                   aakhir mein last-write-wins merge (eventual consistency)
     single owner — ek hi jagah, requests ek ke baad ek (durable object jaisa)
   (Yeh ek simulation hai — network ki jagah random deri, par race asli hai.) */
const a = require('./args')();
const N = +(a.clients || 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function replicated(clients) {
  const replicas = [0, 0, 0];
  await Promise.all(Array.from({ length: clients }, async (_, i) => {
    const r = i % 3;
    await sleep(i * 0.4);                          /* clients ek-ek karke aate hain */
    const cur = replicas[r];                       /* read */
    await sleep(Math.random() * 4);                /* beech mein network/processing */
    replicas[r] = cur + 1;                         /* write — jo beech mein hua woh gaya */
  }));
  return { value: Math.max(...replicas), replicas };
}

async function singleOwner(clients) {
  let value = 0;
  let queue = Promise.resolve();
  const jobs = Array.from({ length: clients }, (_, i) => {
    queue = queue.then(async () => { const cur = value; await sleep(Math.random() * 1); value = cur + 1; });
    return queue;
  });
  await Promise.all(jobs);
  return { value };
}

(async () => {
  const r = await replicated(N);
  const s = await singleOwner(N);
  console.log(`replicated (eventual) → expected ${N}, got ${r.value}   replicas: [${r.replicas}]   ${r.value === N ? 'OK' : '❌ lost updates'}`);
  console.log(`single owner          → expected ${N}, got ${s.value}   ${s.value === N ? '✅' : '❌'}`);
})();
