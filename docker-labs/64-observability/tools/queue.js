'use strict';
// ex3 — the video's grocery store, simulated customer by customer (seeded model; checkout averages 60 s).
const Q = require('../lib/queue');
const S = 60, min = x => (x / 60).toFixed(x < 600 ? 2 : 1) + ' min', pc = x => (x * 100).toFixed(1) + '%';

console.log('ex3 — line kab phatti hai (seeded simulation, har customer gina; checkout average 1 min; "wait" = line mein, apna checkout chhod kar)\n');
console.log('1) Ek cashier, log random aate hain, checkout ka time bhi random (M/M/1), 10 lakh customers:');
console.log('   gap     busy (ρ)   formula ρ/(1−ρ)·S   simulated wait   kitne ruke   p99 wait   ghante mein nikle');
for (const gap of [120, 75, 65]) {
  const s = Q.sim({ gapS: gap, serviceS: S }), rho = S / gap;
  console.log(`   ${String(gap).padStart(3)} s   ${pc(rho).padStart(6)}     ${min(Q.mm1Wait(rho, S)).padStart(9)}           ${min(s.meanWait).padStart(9)}      ${pc(s.pWaited).padStart(6)}    ${min(s.p99Wait).padStart(8)}   ${s.perHour.toFixed(1)}`);
}
console.log('   → 50% par "koi wait nahi karta" galat: aadhe customers rukte hain, aur average wait = ek checkout (video ka apna formula).');
console.log('   → "Ghante mein nikle" aane walon ke barabar: busy hisse ke saath kaam seedha badhta hai (utilization law, U = X·S).');
console.log('     Seedha nahi badhta toh WAIT. "50% par 1000 rps toh 100% par 2000" throughput ke liye lagbhag theek; latency ke liye nahi.\n');

console.log('2) Wait ki jad randomness hai:');
for (const [label, o] of [['fixed gap, fixed checkout (D/D/1)', { arrivals: 'fixed', service: 'fixed' }], ['random gap, fixed checkout (M/D/1)', { service: 'fixed' }]]) {
  const rows = [120, 65].map(gap => { const s = Q.sim({ gapS: gap, serviceS: S, ...o }); return `${pc(S / gap)}: wait ${min(s.meanWait)}, ruke ${pc(s.pWaited)}`; });
  console.log(`   ${label.padEnd(36)} ${rows.join(' · ')}`);
}
console.log(`   M/D/1 formula 92.3% par ${min(Q.md1Wait(S / 65, S))} — M/M/1 ka aadha. Jitna kam utaar-chadhaav, utni chhoti line.\n`);

console.log('3) 99% busy: formula 99 min. Chhe seeds, 40 lakh customers har ek:');
const r99 = [4, 5, 6, 7, 8, 9].map(seed => Q.sim({ gapS: S / 0.99, serviceS: S, customers: 4000000, seed }).meanWait);
console.log(`   simulated wait: ${r99.map(min).join(' · ')}`);
console.log('   → bahut bada aur dheere tikta hai, par anant nahi. Anant (bina had) sirf 100% ya 100% se upar:');
for (const rho of [1, 1.05]) {
  const rows = [10000, 100000, 1000000].map(c => `${c.toLocaleString('en-IN')} ke baad ${min(Q.sim({ gapS: S / rho, serviceS: S, customers: c, warmup: 0 }).meanWait)}`);
  console.log(`   ${pc(rho).padStart(6)}: ${rows.join(' · ')}`);
}
console.log('   → 100% aur 105% par wait run ke saath badhta hi jaata hai — koi "average" nahi tikta.\n');

console.log('4) "70% par alert" — kitne cashier hain, us par nirbhar (85% busy dono mein, 10 lakh customers):');
for (const c of [1, 8]) {
  const s = Q.sim({ gapS: S / (0.85 * c), serviceS: S, servers: c });
  console.log(`   ${c} cashier: formula ${min(c === 1 ? Q.mm1Wait(0.85, S) : Q.mmcWait(c, 0.85, S))} · simulated ${min(s.meanWait)} · ruke ${pc(s.pWaited)}`);
}
console.log('   → bade pool (DB connections, threads, servers) ko ek line jitna jaldi dard nahi hota. 70% ek single-cashier');
console.log('     wala thumb rule hai; asli seema SLO, utaar-chadhaav aur pool ke size se nikalti hai — load test se naapo.');
