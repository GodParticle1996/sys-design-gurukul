/* Ek scenario chalao (source + target pehle se chal rahe hon):
     node tools/scenario.js dual         — backfill + app dual writes (2% fail, 1% retry-duplicate)
     node tools/scenario.js cdc-state    — snapshot + log tail, poori row ki state, 10% redelivery
     node tools/scenario.js cdc-delta    — snapshot + log tail, sirf delta, 10% redelivery */
const { spawn } = require('child_process');
const path = require('path'); const fs = require('fs');
const { post, sleep } = require('../lib/util');
const dir = path.join(__dirname, '..');
const mode = process.argv[2] || 'dual';
const run = (file, env, wait) => new Promise(r => { const c = spawn(process.execPath, [path.join(dir, file)], { env: Object.assign({}, process.env, env), stdio: 'inherit' }); if (wait) c.on('exit', r); else r(c); });
(async () => {
  await post('http://localhost:5002/reset', {});
  try { fs.unlinkSync(path.join(dir, 'data', 'cdc-offset.json')); } catch (e) {}
  console.log(`== scenario: ${mode}`);
  let cdc = null;
  if (mode === 'dual') {
    await run('tools/copy-snapshot.js', {}, true);
    await run('services/writer.js', { DUAL: '1', DURATION: '8' }, true);
  } else {
    cdc = await run('services/cdc.js', { MODE: mode === 'cdc-delta' ? 'delta' : 'state', REDELIVER: '0.1' });
    await sleep(1500);
    await run('services/writer.js', { DURATION: '8' }, true);
  }
  await run('tools/compare.js', { }, true);
  if (cdc) cdc.kill('SIGKILL');
  process.exit(0);
})();
