'use strict';
// ex1 — direct upload with a presigned URL (real HTTP on 127.0.0.1; simulated clock for hours and expiry).
const crypto = require('node:crypto');
const U = require('../lib/upload');
const n = x => x.toLocaleString('en-IN');

(async () => {
  console.log('ex1 — photo seedha storage mein (asli HTTP, ek hi machine par; object store aur app server dono chhote Node servers; ghadi nakli)\n');
  const lab = await U.start();
  const photo = crypto.randomBytes(1e6);                         // 1 MB: phone ne compress kar diya (video: 5 MB → 1 MB)
  await U.upload(lab, photo);
  console.log('1) Ek photo (1 MB), 500 KB ke chunks, presigned URL se:');
  console.log(`   app server ne padhe: ${n(lab.appStats.bytesIn)} byte (sirf JSON body) · object store ne padhe: ${n(lab.storeStats.bytesIn)} byte · metadata rows: ${lab.rows.length}`);
  console.log('   → 1 MB app server ko chhoota hi nahi: app ka bandwidth, connection aur memory bachi. (Video ka "dheema upload ek worker\n');
console.log('     pakadta hai" blocking server par sahi; Node jaisa async server thread nahi rokta, par bytes ka bojh phir bhi uthata.)\n');

  const raw = crypto.randomBytes(5e6);
  const cut = await U.upload(lab, raw, { stopAfter: 9 });
  const res = await U.resume(lab, cut, raw);
  console.log('2) Tunnel: 5 MB, 500 KB ke chunks, 9 chunk (4.5 MB) ke baad connection gaya:');
  console.log(`   HEAD se pata chala store ke paas ${n(res.resumedFrom)} byte hain → baaki ${n(res.sent)} byte bheje (shuru se: ${n(raw.length)}).`);
  console.log('   Dhyan: Amazon S3 multipart mein har part kam se kam 5 MiB (aakhri chhod kar) — 500 KB ke chunks ke liye apna');
  console.log('   resumable upload (ya Google Cloud Storage jaisa resumable API, 256 KiB ke multiples) chahiye.\n');

  const orphan = await U.upload(lab, photo, { commit: false });
  const before = [...lab.objects.values()].map(o => o.tags.status);
  lab.clock.now += 25 * 3600e3;
  const swept = lab.sweep(24 * 3600e3);
  console.log('3) Phone upload ke baad, "ho gaya" bolne se pehle band ho gaya (orphan):');
  console.log(`   objects: ${before.length} (${before.filter(s => s === 'final').length} final, ${before.filter(s => s === 'pending').length} pending) → 25 ghante baad lifecycle sweep ne ${swept} hataya; bache ${lab.objects.size}, sab final.`);
  console.log(`   orphan object gaya: ${!lab.objects.has(orphan.key)} · rows: ${lab.rows.length} (orphan ki row kabhi bani hi nahi)`);
  console.log('   → rule "status=pending" tag ko pakadta hai: upload par tag pending, commit par final. S3 lifecycle filter tag/prefix se');
  console.log('     objects CHUNTA hai; "jis par tag NAHI" jaisa ulta filter nahi hota — isliye tag upload ke waqt hi lagao.\n');
console.log('     (tmp/ prefix wala rule chuno toh commit par photo ko final key par copy karo — tag badalne se prefix rule nahi rukta.)\n');

  const fresh = JSON.parse((await U.request('POST', `http://127.0.0.1:${lab.ports.app}/uploads`, Buffer.from('{}'))).body);
  const tampered = fresh.url.replace(fresh.key, 'p-hacker000000');
  const t = await U.request('PUT', tampered + '&offset=0', Buffer.from('x'));
  lab.clock.now += 16 * 60e3;
  const e = await U.request('PUT', fresh.url + '&offset=0', Buffer.from('x'));
  console.log('4) URL ke saath chhed-chhaad:');
  console.log(`   doosri file ka naam daala → HTTP ${t.status} · 16 min baad (URL 15 min ka) → HTTP ${e.status} · store ne mana kiya: ${lab.storeStats.rejected}`);
  console.log('   → signature ek file, ek method aur ek expiry ke liye hai. Server ne permission di, bytes nahi dhoye.');

  const small = crypto.randomBytes(1000), cut2 = await U.upload(lab, small, { chunk: 300, stopAfter: 3 });
  lab.clock.now += 16 * 60e3;
  const rs = await U.resume(lab, cut2, small, { chunk: 300 });
  const half = await U.upload(lab, small, { chunk: 300, stopAfter: 2, commit: false });
  const early = await U.commit(lab, half.key, 'adhoori'), again = await U.commit(lab, cut2.key, 'dobara');
  const pub = await U.upload(lab, small, { chunk: 300 }), late = await U.request('PUT', `${pub.url}&offset=1000`, Buffer.from('extra'));
  console.log('\n5) Upload ka contract (app ka apna niyam — presigned URL akela aisi guarantee nahi deta):');
  console.log(`   URL beech mein expire (900 / 1,000 byte ke baad): naya URL same key ke liye → ${rs.renewed ? 'mila' : 'nahi'}, baaki ${rs.sent} byte, photo id ${rs.committed.id}`);
  console.log(`   adhoori photo (600 / 1,000) ka commit → HTTP ${early.status}; same upload ka dobara commit (reply kho gaya tha) → same id ${again.id}`);
  console.log(`   publish ke baad same URL se bytes jodna → HTTP ${late.status}`);
  console.log('   → app server size + SHA-256 yaad rakhta hai aur poori, sahi photo par hi row banata hai. S3 ka presigned URL expiry tak');
  console.log('     dobara chal sakta hai aur same key ko badal sakta hai — isliye final object ko alag key/version par rakhna app ka kaam.');
  console.log('     Presigned URL banane ke liye S3 se poochhna zaroori nahi: app ka SDK apni credentials se local sign karta hai (jaise is lab ka sign()).');
  lab.close();
})();
