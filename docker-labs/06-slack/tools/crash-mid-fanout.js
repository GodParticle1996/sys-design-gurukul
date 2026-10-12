/* Fan-out ke beech channel server maro, restart karo, dekho message kho gaya ya nahi */
const { spawn } = require('child_process');
const path = require('path');
const { get, post, sleep } = require('../lib/util');
const dir = path.join(__dirname, '..');
const edge = 'http://localhost:4604';
const run = env => spawn(process.execPath, [path.join(dir, 'services/channel-server.js')], { env: Object.assign({}, process.env, { PORT: '4603', FANOUT: 'subs', EDGE: '1' }, env), stdio: 'inherit' });

(async () => {
  await post(edge + '/reset', {}).catch(() => {});
  try { require('fs').writeFileSync(path.join(dir, 'data', 'pending.json'), '[]'); } catch (e) {}
  const c1 = run({ CRASH_AFTER: '112' });
  await sleep(700);
  post('http://localhost:4603/send', { id: 'crash-msg', channel: 'general' }).catch(() => {});
  await new Promise(r => c1.on('exit', r));
  const mid = await get(edge + '/count/crash-msg');
  console.log(`  crash ke waqt tak pahunche: ${mid.have}/300`);
  const c2 = run({});
  await sleep(1500);
  const fin = await get(edge + '/count/crash-msg');
  const e = await get(edge + '/stats');
  console.log(`final delivered: ${fin.have}/300   lost: ${300 - fin.have}   duplicate deliveries (client ne dedupe kiye): ${e.duplicates}`);
  c2.kill('SIGKILL');
  process.exit(0);
})();
