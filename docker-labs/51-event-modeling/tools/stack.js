/* Tools ke liye: services chalao, ready ka intezaar, aakhir mein band karo. */
const { spawn } = require('node:child_process');
const path = require('node:path');
function start(file, env) {
  const kid = spawn(process.execPath, [path.join(__dirname, '..', 'services', file + '.js')],
    { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((ok, fail) => {
    kid.stdout.on('data', d => { if (String(d).includes('ready')) ok(kid); });
    kid.once('exit', code => fail(Error(`${file} ${env.PORT} exit ${code} before ready`)));
  });
}
async function withServices(list, work) {
  const kids = [];
  try {
    for (const [file, env] of list) kids.push(await start(file, env));
    return await work();
  } finally {
    for (const k of kids.reverse()) k.kill();
    await new Promise(r => setTimeout(r, 100));
  }
}
module.exports = { withServices };
