/* 30 kadam ka agent kaam (feature banao). Har kadam p chance se kuch tod deta hai.
   Tests 80% tootne wali cheezein pakadte hain.
   no-undo      → toota toh agent aage-aage "theek" karne ki koshish: 50% theek, 50% aur bigaad
   rollback     → har kadam se pehle snapshot; test fail → wapas snapshot, wahi kadam dobara (3 try tak)
   rollback+3   → har mushkil kadam par 3 forks ek saath, jo pehle test pass kare wo lo (parallel sampling)
   node tools/agent.js */
let s = 21; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const STEPS = 30, DETECT = 0.8;
function run(mode, p) {
  let broken = 0, work = 0, rounds = 0;                               // rounds = wall-clock (ek ke baad ek kitni baar)
  for (let step = 0; step < STEPS; step++) {
    if (mode === 'no-undo') {
      work++; rounds++;
      if (r() < p) { if (r() < DETECT) { work++; rounds++; if (r() >= 0.5) broken++; } else broken++; }   // pakda → fix-forward 50/50
      continue;
    }
    const forks = mode === 'rollback+3' ? 3 : 1; let done = false;
    for (let attempt = 0; attempt < 3 && !done; attempt++) {
      rounds++; const passing = [];
      for (let f = 0; f < forks; f++) {                                // forks EK SAATH chalte hain (parallel)
        work++;
        if (r() >= p) passing.push(0);                                  // sach mein theek
        else if (r() >= DETECT) passing.push(1);                        // toota, par test ne nahi pakda
      }
      if (passing.length) { broken += passing[Math.floor(r() * passing.length)]; done = true; }   // koi bhi passing fork lo
    }
    if (!done) broken++;
  }
  return { healthy: broken === 0, work, rounds };
}
console.log('har kadam ka risk   tareeka        poore sahi bane (1000 runs)   wall-clock rounds   compute (steps chalaye)');
for (const p of [0.05, 0.15]) for (const mode of ['no-undo', 'rollback', 'rollback+3']) {
  let ok = 0, w = 0, rd = 0; for (let i = 0; i < 1000; i++) { const x = run(mode, p); if (x.healthy) ok++; w += x.work; rd += x.rounds; }
  console.log(`${(p * 100 + '%').padStart(8)}           ${mode.padEnd(14)} ${(ok / 10).toFixed(1).padStart(6)}%                      ${(rd / 1000).toFixed(1).padStart(5)}               ${(w / 1000).toFixed(1).padStart(5)}`);
}
console.log('\nNo-undo: har galti ke upar nayi galti — 30 kadam mein chhoti-chhoti kharabiyan jama.');
console.log('Rollback: test fail → wapas saaf haalat se phir try. Bache sirf wo jo tests ne pakde hi nahi (isliye tests bhi zaroori).');
console.log('3 forks: retry ka intezaar nahi (rounds kam), par compute ~3x. Chhupi galti wahi rehti hai — forks tests se behtar nahi dekh sakte.');
