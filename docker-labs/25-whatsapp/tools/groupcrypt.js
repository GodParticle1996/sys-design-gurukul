/* Group message ka encryption — asli AES-256-GCM (Node crypto).
   pairwise   → har member ke liye alag key se alag encrypt (100 members = 99 encryptions, 99 copies server par)
   sender key → har member ki apni "sender key" ek baar sabko (pairwise) bheji; phir har message EK baar encrypt, ek sealed copy
   node tools/groupcrypt.js [--members 100,1000] [--messages 200] [--kb 1] */
const crypto = require('crypto');
const args = require('./args')();
const sizes = (args.members || '100,1000').split(',').map(Number), MSGS = +(args.messages || 200), KB = +(args.kb || 1);
const msg = crypto.randomBytes(KB * 1024);
const enc = key => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key, iv); const out = Buffer.concat([c.update(msg), c.final()]); return out.length + iv.length + 16; };
console.log(`${MSGS} messages × ${KB} KB, asli AES-256-GCM\n`);
console.log('members   tareeka      encryptions   bytes upload (sender)   time        join/leave par');
for (const n of sizes) {
  const peers = Array.from({ length: n - 1 }, () => crypto.randomBytes(32));
  let t = process.hrtime.bigint(), bytes = 0, encs = 0;
  for (let m = 0; m < MSGS; m++) for (const k of peers) { bytes += enc(k); encs++; }
  const pairMs = Number(process.hrtime.bigint() - t) / 1e6;
  console.log(`${String(n).padStart(6)}    pairwise   ${String(encs).padStart(10)}   ${(bytes / 1048576).toFixed(1).padStart(8)} MB            ${pairMs.toFixed(0).padStart(6)} ms   kuch nahi`);
  const senderKey = crypto.randomBytes(32);
  t = process.hrtime.bigint(); bytes = 0; encs = 0;
  for (const k of peers) { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', k, iv); c.update(senderKey); c.final(); encs++; bytes += 32 + 28; }   // sender key sabko ek baar
  const setupEncs = encs;
  for (let m = 0; m < MSGS; m++) { bytes += enc(senderKey); encs++; }
  const skMs = Number(process.hrtime.bigint() - t) / 1e6;
  console.log(`${String(n).padStart(6)}    sender key ${String(encs).padStart(10)}   ${(bytes / 1048576).toFixed(2).padStart(8)} MB            ${skMs.toFixed(0).padStart(6)} ms   ${setupEncs} naye key bhejo (rotate)`);
}
console.log('\nSender key: har message ek baar encrypt, ek copy — server fan-out karta hai (par dekh nahi sakta).');
console.log('Keemat key management mein: koi group chhode toh sabki sender keys badlo, taaki woh aage ke messages na padh sake.');
