/* Tools ke liye: apne child processes chalao, ready ka intezaar, crash par dobara chalao, aakhir mein band. */
const { spawn } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { call, sleep } = require('../lib/http');
const { open } = require('../lib/store');
const BROKER = 'http://localhost:5800';
function start(file, env) {
  const kid = spawn(process.execPath, [path.join(__dirname, '..', 'services', file + '.js')],
    { env: { ...process.env, BROKER, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((ok, fail) => {
    kid.stdout.on('data', d => { if (String(d).includes('ready')) ok(kid); });
    kid.once('exit', code => fail(Error(`${file} ${env.PORT} exit ${code} before ready`)));
  });
}
async function withStack(work) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab49-')), db = path.join(dir, 'lab.db');
  open(db).close();                                         // schema ek baar, consumers se pehle
  const kids = new Set(), crashes = { count: 0 };
  let stopping = false;
  async function consumer(env, supervise = false) {
    const kid = await start('consumer', { DB: db, ...env });
    kids.add(kid);
    kid.once('exit', () => {
      kids.delete(kid);
      if (stopping || !supervise) return;
      crashes.count++;
      consumer(env, supervise).catch(e => console.error(`restart fail: ${e.message}`));   // supervisor: band hua toh dobara chalao
    });
    return kid;
  }
  try {
    kids.add(await start('broker', { PORT: '5800' }));
    return await work({ db, consumer, crashes, call: (r, b) => call(BROKER, r, b) });
  } finally {
    stopping = true;
    for (const k of [...kids].reverse()) k.kill();          // pehle consumers, broker aakhir mein
    await sleep(100);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
async function drain(call, limitMs = 20000) {
  const t0 = Date.now();
  for (;;) {
    const { pending } = await call('/state');
    if (pending === 0) return;
    if (Date.now() - t0 > limitMs)
      throw Error(`Exercise poora nahi hua: ${limitMs / 1000} s baad bhi ${pending} messages pending. Adhura DB state result nahi maana.`);
    await sleep(10);
  }
}
module.exports = { withStack, drain, sleep };
