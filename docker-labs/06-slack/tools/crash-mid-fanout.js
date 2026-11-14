/* Fan-out ke beech channel server maro, restart karo, dekho message kho gaya ya nahi */
const { spawn } = require('child_process');
const path = require('path');
const { get, post, sleep } = require('../lib/util');
const dir = path.join(__dirname, '..');
const edge = 'http://localhost:4604';
const run = env => spawn(process.execPath, [path.join(dir, 'services/channel-server.js')], { env: Object.assign({}, process.env, { PORT: '4603', FANOUT: 'subs', EDGE: '1' }, env), stdio: 'inherit' });

(async () => {
  /* edge-sim (4604) chahiye; channel-server (4603) yeh tool khud chalata hai — do baar, crash se pehle aur baad.
     `npm start ex2-fanout-presence` dono chalata hai, isliye uske channel-server ko pehle hatne ko bolo,
     warna port 4603 par EADDRINUSE aata hai aur "crash" kabhi dikhta hi nahi. */
  if (!await get(edge + '/stats').then(() => true, () => false)) {
    console.log('edge-sim nahi chal raha. Pehle doosre terminal mein: npm start ex2-fanout-presence');
    process.exit(1);
  }
  if (await post('http://localhost:4603/admin/exit', {}).then(() => true, () => false)) {
    console.log('  (npm start wala channel-server band kiya — crash wala version usi port 4603 par chalega)');
    await sleep(400);
  }
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
  console.log('  (channel-server ab band hai. fanout.js dobara chalana ho toh Terminal 1 mein Ctrl+C, phir npm start ex2-fanout-presence)');
  process.exit(0);
})();
