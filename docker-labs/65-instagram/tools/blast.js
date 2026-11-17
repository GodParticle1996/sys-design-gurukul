'use strict';
// ex5 — blast radius with cells (arithmetic) and crypto-shredding (real AES-256-GCM, node:crypto).
const S = require('../lib/shred');
const n = x => x.toLocaleString('en-IN');

console.log('ex5 — galti ka daayra aur bhoolne ka haq (cells: seedha hisaab; crypto: asli AES-256-GCM)\n');
console.log('1) 100 cells × 1 crore users. Ek galat config — kitne users par pade? (waves 1 → 5 → 25 → 100 cells, har wave ke baad 30 min intezaar)');
console.log('   galti kab pakdi gayi             ek saath sab cells (global)     waves mein');
for (const d of [10, 45, 75, 100]) {
  const w = S.blast({ detectMin: d }), g = S.blast({ detectMin: d, waves: [100] });
  console.log(`   ${String(d).padStart(3)} min baad                       ${(n(g.usersHit / 1e7) + ' crore (' + g.share * 100 + '%)').padEnd(28)}    ${n(w.usersHit / 1e7)} crore (${w.share * 100}%)`);
}
console.log('   → cells tabhi bachaate hain jab cells sach mein alag hon: alag config, alag database, alag control plane. Saanjha DNS,');
console.log('     login ya config service sab cells ko saath gira sakta hai. User → cell ka naksha ek patli routing layer rakhti hai;');
console.log('     DNS (jaise Route 53) user ID nahi dekhta — video ka "Route 53 user ID ko cell 42 par bhejta hai" seedha aise nahi hota.\n');

const v = S.vault(), users = ['u1', 'u2', 'u3'], emails = { u1: 'asha@example.com', u2: 'priya@example.com', u3: 'ravi@example.com' };
users.forEach(u => v.addUser(u));
const copies = { db: {}, kafka: {}, backup: {}, cache: {} };
for (const u of users) for (const place of Object.keys(copies)) copies[place][u] = v.encrypt(u, emails[u]);
const debugLog = [`2024-05-01 login ok user=u2 email=${emails.u2}`];       // ek galti: kisi ne plaintext log kar diya
console.log('2) Crypto-shredding: har user ki apni data key (DEK), DEK master key (KEK) se band. Email 4 jagah encrypted copy mein:');
console.log(`   db, kafka log, backup tape, cache — u2 ki copy padhi: "${v.decrypt('u2', copies.backup.u2)}"`);
const before = v.keys(); v.shred('u2');
let readable = 0; for (const place of Object.keys(copies)) { try { v.decrypt('u2', copies[place].u2); readable++; } catch { /* key gayi */ } }
console.log(`   u2 ne "account delete" dabaya → sirf u2 ki DEK mitayi (keys ${before} → ${v.keys()}). Ab u2 ki 4 copies mein se padhne layak: ${readable}`);
console.log(`   1,000 random 256-bit keys aazmaayi: kaam aayi ${S.guess(copies.kafka.u2)} (AES-GCM ka tag har galat key pakad leta hai)`);
console.log(`   u1 abhi bhi theek: "${v.decrypt('u1', copies.kafka.u1)}"`);
console.log(`   par debug log mein plaintext: ${debugLog.filter(l => l.includes('priya')).length} line abhi bhi "priya@example.com" dikhati hai.`);
console.log('   → ek key mitao, har encrypted copy bekaar — logs, backups, caches chhue bina. Shart: data kahin plaintext mein na gaya ho');
console.log('     (debug logs, analytics exports, search index), aur DEK khud kisi backup mein na bachi ho. GDPR (Art. 12, 17): jawab');
console.log('     "bina der kiye, ek mahine ke andar" — video ka "30 din" lagbhag; crypto-shredding ko sab regulators poora mitaana');
console.log('     maanenge, pakka nahi — legal team se poochho.');
