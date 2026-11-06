/* Tools ke liye: services chalao, ready ka intezaar, crash par dobara chalao, aakhir mein band karo. DB ek temp folder mein. */
const { spawn } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { open } = require('../lib/store');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function start(file, env) {
  const kid = spawn(process.execPath, [path.join(__dirname, '..', 'services', file + '.js')],
    { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((ok, fail) => {
    kid.stdout.on('data', d => { if (String(d).includes('ready')) ok(kid); });
    kid.once('exit', code => fail(Error(`${file} ${env.PORT} exit ${code} before ready`)));
  });
}
async function withStack(work) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab50-')), db = path.join(dir, 'lab.db');
  open(db).close();                                   // schema ek baar, services se pehle
  const kids = new Set(), crashes = { count: 0 };
  let stopping = false;
  async function service(file, env, supervise = false) {
    const kid = await start(file, { DB: db, CRASH_FLAG: path.join(dir, `crash-${env.PORT}`), ...env });
    kids.add(kid);
    kid.once('exit', () => {
      kids.delete(kid);
      if (stopping || !supervise) return;
      crashes.count++;
      service(file, env, supervise).catch(e => console.error(`restart fail: ${e.message}`));   // supervisor: dobara chalao
    });
    return kid;
  }
  try {
    return await work({ db, dir, service, crashes });
  } finally {
    stopping = true;
    for (const k of [...kids].reverse()) k.kill();
    await sleep(100);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
async function waitFor(check, what, limitMs = 10000) {   // shart poori na ho toh adhura result nahi — error
  const t0 = Date.now();
  while (!(await check())) {
    if (Date.now() - t0 > limitMs) throw Error(`Exercise poora nahi hua: ${limitMs / 1000} s baad bhi ${what}.`);
    await sleep(10);
  }
}
module.exports = { withStack, waitFor, sleep };
