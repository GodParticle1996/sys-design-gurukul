/* ex3 · Client → A → B → C. Har layer "3 koshish" wala retry laga de toh C par kya guzarti hai?
   Pehle C poori tarah band (100% 503), phir C thoda bimaar (30% 503 — chhoti gadbad).
   node tools/layers.js */
const { postRaw, get, post, host } = require('../lib/util');
const A = `http://${host('hop-a')}:5162`, B = `http://${host('hop-b')}:5163`, C = `http://${host('hop-c')}:5164`;
const USERS = 100;

const SETUPS = [
  ['har layer 3 koshish (client, A, B)', { client: 3, a: 3, b: 3 }],
  ['sirf edge par 3 koshish (client)',   { client: 3, a: 1, b: 1 }],
  ['koi retry nahi',                     { client: 1, a: 1, b: 1 }],
];

async function run(setup, failRate) {
  for (const u of [A, B, C]) await post(u + '/reset');
  await post(A + '/config', { attempts: setup.a });
  await post(B + '/config', { attempts: setup.b });
  await post(C + '/config', { failRate });
  let ok = 0;
  for (let i = 0; i < USERS; i++) {
    for (let t = 0; t < setup.client; t++) { if ((await postRaw(A + '/work', {})).ok) { ok++; break; } }
  }
  const [a, b, c] = await Promise.all([A, B, C].map(u => get(u + '/stats')));
  return { ok, a: a.calls, b: b.calls, c: c.calls };
}

(async () => {
  console.log(`=== C poori tarah band (100% 503) · ${USERS} user requests ===`);
  console.log('tareeka                              A par calls   B par calls   C par calls   C par / user request');
  for (const [name, s] of SETUPS) {
    const r = await run(s, 1);
    console.log(`${name.padEnd(36)} ${String(r.a).padStart(8)}      ${String(r.b).padStart(8)}      ${String(r.c).padStart(8)}          ${(r.c / USERS).toFixed(0).padStart(4)}×`);
  }
  console.log(`\n=== C thoda bimaar (30% requests par 503) · ${USERS} user requests ===`);
  console.log('tareeka                              user ko jawab mila   C par calls   C par / user request');
  for (const [name, s] of SETUPS) {
    const r = await run(s, 0.3);
    console.log(`${name.padEnd(36)} ${String(r.ok).padStart(8)}/${USERS}       ${String(r.c).padStart(8)}          ${(r.c / USERS).toFixed(2).padStart(5)}×`);
  }
  console.log('\nRetry EK layer par (sabse bahar, jahan user hai) — andar ki har layer par nahi. 3 × 3 × 3 = 27 guna bojh usi service par jo pehle se bimaar hai.');
})();
