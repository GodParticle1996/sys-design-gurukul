/* Agent har kadam se pehle snapshot leta hai (taaki galti ho toh wapas ja sake). 10 kadam, har kadam 3 files badalta hai.
   full copy vs copy-on-write blocks — time aur disk. Chhota project (1 MB) aur bhaari project (200 MB, node_modules jaisa).
   node tools/snapshots.js */
const { post, get, host } = require('../lib/util');
const W = `http://${host('workspace')}:5071`;
const mb = b => (b / 1048576).toFixed(1) + ' MB';
(async () => {
  console.log('project   mode   pehla snapshot   10 snapshots ke baad disk   baad ke snapshots (avg)   rollback: time, files likhi, tooti files');
  for (const sizeMB of [1, 200]) for (const mode of ['full', 'cow']) {
    await post(W + '/project', { sizeMB, files: 200 });
    const first = await post(W + '/snapshot', { mode }); let tot = 0;
    for (let step = 2; step <= 10; step++) { await post(W + '/edit', { files: 3 }); tot += (await post(W + '/snapshot', { mode })).ms; }
    await post(W + '/edit', { files: 5, break: true });               // 11va kadam: agent ne project tod diya
    const brokenBefore = (await get(W + '/stats')).broken;
    const rb = await post(W + '/rollback', { id: 's10' });
    const st = await get(W + '/stats');
    console.log(`${String(sizeMB).padStart(4)} MB  ${mode.padEnd(5)}  ${String(first.ms).padStart(7)} ms      ${mb(mode === 'full' ? st.fullSnapBytes : st.cowBytes).padStart(9)}              ${(tot / 9).toFixed(1).padStart(7)} ms              ${String(rb.ms).padStart(6)} ms, ${String(rb.filesRewritten).padStart(3)} files, ${brokenBefore} → ${rb.brokenFiles}`);
  }
  await post(W + '/project', { sizeMB: 0.01, files: 2 });           // disk saaf
  console.log('\nFull copy: har snapshot poora project dobara — 200 MB × 10 = 2 GB, aur har baar poora copy karne ka time.');
  console.log('CoW: pehla snapshot poora, uske baad sirf badle hue blocks. Snapshot sasta = agent HAR kadam se pehle le sakta hai.');
})();
