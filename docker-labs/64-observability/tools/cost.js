'use strict';
// ex2 — what logs, metrics and traces cost (arithmetic on stated assumptions + a seeded sampling model).
const C = require('../lib/cost');
const n = x => x.toLocaleString('en-IN');

console.log('ex2 — kaunsa signal kitna mehenga (hisaab, maane hue numbers ke saath; sampling ek seeded model)\n');
const logs = C.logBytesPerDay({ reqPerMin: 1e6, bytesPerReq: 1000 });
const met = C.metricBytesPerDay({ series: 300 });
console.log('1) Ek din ka data — 10 lakh requests/minute (video ka "millions per minute"), har request ke logs ~1 KB (maana):');
console.log(`   logs:    ${(logs / 1e12).toFixed(2)} TB/din  (30 din rakho toh ${(logs * 30 / 1e12).toFixed(1)} TB)`);
console.log(`   metrics: kul 300 series × har 15 s ek sample × ~2 byte (Prometheus docs: disk par compressed 1–2 byte/sample) = ${(met / 1e6).toFixed(1)} MB/din`);
console.log('            (sirf samples ka disk; index, WAL aur RAM mein chalti series ka hisaab alag — RAM ka kharcha series ki ginti se badhta hai)');
console.log(`   → in maanyataon par ~${n(Math.round(logs / met / 1e5))} lakh× ka farq (logs ka compression nahi joda; 10× dabaane par bhi ~${n(Math.round(logs / met / 10 / 1000))} hazaar×).`);
console.log('     Video ka "saalon ke metrics memory mein" — disk par sasta, RAM ka kharcha active series par tika.');
console.log('     Metric sasta isliye ki metric ginti hai, kahani nahi.\n');

const base = { method: 3, route: 20, status: 5 };
console.log('2) Metric tab tak sasta jab tak labels ki ginti chhoti hai (har label-combination = ek alag series):');
console.log(`   http_requests_total{method, route, status}            → zyada se zyada ${n(C.seriesUpperBound(base))} series`);
console.log(`   + user_id label (10 lakh users)                        → zyada se zyada ${n(C.seriesUpperBound({ ...base, user: 1e6 }))} series (30 crore)`);
console.log('   → "metric sasta hai" tabhi tak sach hai. Prometheus docs: user ID jaise anginat values label mein mat daalo.');
console.log('     "Kis user ka fail hua" — sawaal logs/traces ka hai.\n');

const s = C.sampling();
console.log('3) Traces: 1,00,000 requests, 0.1% error, 1% dheemi; dono ka sikka 1% (seeded model):');
console.log('   tareeka                                    rakhe     errors rakhe     dheemi rakhe');
console.log(`   sab                                        ${n(s.all.n).padStart(8)}   ${String(s.all.err).padStart(12)}   ${n(s.all.slow).padStart(12)}`);
console.log(`   head (shuru mein sikka uchhaalo, 1%)       ${n(s.head.n).padStart(8)}   ${String(s.head.err).padStart(12)}   ${n(s.head.slow).padStart(12)}`);
console.log(`   tail (khatam hone par: saare error/dheeme  ${n(s.tail.n).padStart(8)}   ${String(s.tail.err).padStart(12)}   ${n(s.tail.slow).padStart(12)}`);
console.log('         + baaki ka 1%)');
const seeds = [1, 2, 3].map(x => C.sampling({ seed: x })).map(r => `${r.head.err} / ${r.all.err}`);
console.log(`   head, 3 aur seeds par (errors rakhe / kul errors): ${seeds.join(' · ')}`);
console.log('   → head sampling sasta hai par talaash wali request (error, dheemi) aksar phenk deta hai.');
console.log('     Tail sampling (is aadarsh model mein) har error rakhta hai — shart: poora trace samay par collector tak pahunche;');
console.log('     der se aaya error span pehle liye faisle ko nahi badal sakta. Faisle se pehle saare spans bhejne aur rakhne ka kharcha bhi lagta hai.');
console.log('     Keemat: ek trace ke saare spans ek hi collector tak aane chahiye, aur collector faisle tak (OpenTelemetry default 30 s)');
console.log('     poora trace memory mein rakhta hai.');
