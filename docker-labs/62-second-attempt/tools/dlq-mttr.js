'use strict';
const { dlqLoss, availability } = require('../lib/dlq');
const pct = x => `${(x * 100).toFixed(0)}%`;
console.log('A. Arithmetic (SQS STANDARD queue): message DLQ mein jaakar bhi apna PEHLA bheja-gaya samay rakhta hai, isliye DLQ ki');
console.log('   retention pehli baar bheje jaane se ginti hai. Maana: messages pehle 72 ghante mein barabar faile hue samay par DLQ mein');
console.log('   aate hain, aur har message ko DLQ mein aane ke itne ghante baad koi dekhta hai. Source retention 4 din.\n');
console.log('queue      DLQ retention   koi dekhta hai (DLQ mein aane ke baad)   jaanch se pehle mit gaye');
for (const [kind, r, look, keep] of [['standard', 96, 48, true], ['standard', 96, 12, true], ['standard', 336, 48, true], ['standard', 336, 300, true], ['FIFO', 96, 48, false]])
  console.log(`${kind.padEnd(10)} ${String(r / 24).padStart(4)} din        ${String(look).padStart(4)} ghante baad                          ${pct(dlqLoss({ dlqRetentionH: r, lookAfterH: look, keepsOriginalTime: keep })).padStart(5)}`);
console.log(`\n→ Video: "DLQ mein koi data kabhi nahi khota". DLQ ki bhi retention hai (1 minute se 14 din). Standard queue mein source jitni`);
console.log(`  retention (4 din) aur 2 din baad jaanch: in maanyataon par ${pct(dlqLoss({ dlqRetentionH: 96, lookAfterH: 48 }))} messages pehle hi mit gaye. FIFO queue mein samay`);
console.log('  DLQ mein dobara shuru hota hai. AWS docs: DLQ ki retention source se lambi rakho; DLQ ki depth aur umar par alert lagao.\n');
console.log('B. Arithmetic: availability ≈ MTBF ÷ (MTBF + MTTR)  (MTBF = do girawaton ke beech ausat samay, MTTR = theek hone ka samay)\n');
const rows = [['saal mein ek baar gira, 24 ghante mein theek', 365 * 24, 24], ['roz gira, 100 ms mein khud theek', 24, 0.1 / 3600], ['mahine mein ek baar, 1 ghanta', 30 * 24, 1], ['hafte mein ek baar, 5 minute', 7 * 24, 5 / 60]];
for (const [name, mtbf, mttr] of rows) { const a = availability(mtbf, mttr); console.log(`${name.padEnd(48)} ${(a * 100).toFixed(5).padStart(10)}%   saal mein band: ${((1 - a) * 365 * 24 * 60).toFixed(1).padStart(8)} min`); }
console.log('\n→ Video ka hisaab sahi: roz 100 ms ki girawat saal ke 24 ghante se bahut behtar. Par dono (MTBF aur MTTR) ginti mein hain;');
console.log('  aur "100 ms mein khud theek" tabhi jab girawat chhoti aur alag-alag ho — retries ka loop (ex0) MTTR ko ghanton tak le jaata hai.');
