const { fork } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { sequential, batched } = require('../lib/lookups');
const { parallel } = require('../lib/parallel');
const { get, now } = require('../lib/util');
const keys = Array.from({length:12}, (_,i) => 'dish-' + (i+1));
let child;
async function ownServer() {
  child = fork(path.join(__dirname, '../services/cache.js'), [], {
    env:{...process.env, PORT:'0', DELAY_MS:'40'},
    stdio:['ignore','ignore','inherit','ipc'],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('ready timeout')), 5000);
    child.once('message', ({port}) => {
      clearTimeout(timer); resolve('http://127.0.0.1:' + port);
    });
    child.once('error', e => { clearTimeout(timer); reject(e); });
    child.once('exit', code => { clearTimeout(timer); reject(Error('server exit '+code)); });
  });
}
(async () => {
  try {
    const arg = process.argv.indexOf('--url');
    const url = arg >= 0 ? process.argv[arg+1] : await ownServer();
    const one = key => get(url + '/one?key=' + encodeURIComponent(key));
    const many = part => get(url + '/many?keys=' + part.join(','));
    await one(keys[0]); // Warm connection; excluded from counters/time.
    const variants = [
      ['sequential', () => sequential(keys, one), 12, 1],
      ['batch4', () => batched(keys, many, 4), 3, 1],
      ['parallel2', () => parallel(keys, one, 2), 12, 2],
    ];
    console.log('ASLI HTTP; server par artificial wait 40 ms/request; 12 items');
    for (const [name, run, calls, peak] of variants) {
      await get(url + '/reset');
      const start = now();
      const values = await run();
      const elapsed = now() - start;
      const stats = await get(url + '/stats');
      assert.deepEqual(values.map(v => v.id), keys.map((_,i) => i+1));
      assert.equal(stats.calls, calls); assert.equal(stats.items, 12);
      assert.ok(stats.peak <= peak); assert.equal(stats.active, 0);
      console.log(`${name}: calls=${stats.calls} items=${stats.items} peak=${stats.peak} elapsed=${elapsed.toFixed(1)} ms`);
    }
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const ended = once(child, 'exit');
      child.kill('SIGTERM');
      await ended;
    }
  }
})().catch(e => { console.error(e); process.exitCode=1; });
