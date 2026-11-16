'use strict';
// Run one store mode for `ms`, SIGKILL it, then count acked writes that are really in the file.
const { fork } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
function run(mode, ms = 1600, flushMs = 1000) {
  const file = path.join(os.tmpdir(), `lab60-${mode}-${process.pid}.log`);
  return new Promise(resolve => {
    const child = fork(path.join(__dirname, 'store-child.js'), [mode, file, String(flushMs)], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
    let acked = 0, t0 = null;
    child.on('message', m => { if (t0 === null) { t0 = Date.now(); setTimeout(() => child.kill('SIGKILL'), ms); } acked = Math.max(acked, m.acked); });
    child.on('exit', () => {
      const secs = (Date.now() - t0) / 1000;
      const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      const lines = text.split('\n').filter(Boolean);
      let onDisk = 0;                                             // records 1..onDisk all present, in order
      for (const l of lines) { if (Number(l) === onDisk + 1) onDisk++; else break; }
      fs.rmSync(file, { force: true });
      resolve({ mode, acked, onDisk, lost: Math.max(0, acked - onDisk), perSec: acked / secs });
    });
  });
}
module.exports = { run };
