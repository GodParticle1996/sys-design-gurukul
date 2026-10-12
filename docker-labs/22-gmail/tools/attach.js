/* HR ne 10,000 logon ko same 5 MB PDF bheja. Kitni storage? Ek banda delete kare toh kitna chhoota?
   node tools/attach.js */
const crypto = require('crypto');
const { post, get, host } = require('../lib/util');
const B = `http://${host('blobstore')}:4985`, N = 10000, SIZE = 5 * 1048576;
const sha = crypto.createHash('sha256').update('diwali-policy-2026.pdf-content').digest('hex');
const gb = b => b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(0) + ' MB';
(async () => {
  console.log('dedup    10,000 logon ke baad storage   objects            1 banda delete → chhoota   baaki 9,999 delete → chhoota');
  for (const dedup of [false, true]) {
    await post(B + '/mode', { dedup });
    for (let i = 0; i < N; i++) await post(B + '/put', { sha256: sha, size: SIZE });
    const after = await get(B + '/stats');
    const one = await post(B + '/delete', { sha256: sha });
    let freed = 0; for (let i = 1; i < N; i++) freed += (await post(B + '/delete', { sha256: sha })).freed;
    console.log(`${(dedup ? 'haan' : 'nahi').padEnd(9)}${gb(after.bytes).padStart(12)}   ${(after.objects + ' object(s)').padEnd(16)}   ${gb(one.freed).padStart(8)}        ${gb(freed).padStart(8)}`);
  }
  console.log('\nDedup ke bina 10,000 copies = 48.83 GB. Dedup ke saath ek hi 5 MB object + refcount 10,000.');
  console.log('Isi liye delete karne par kuch "chhoota" nahi dikhta — aakhri reference jaane par hi bytes free hote hain.');
})();
