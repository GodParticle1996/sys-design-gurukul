const { fork } = require('node:child_process');
const path = require('node:path');
const { call: httpCall } = require('../lib/http');
let activeCall = httpCall;
const call = (...args) => activeCall(...args);
const model = () => process.env.LAB_TRANSPORT === 'model' || process.argv.includes('--model');
const names = ['delivery', 'notify', 'kitchen'];
const urls = Object.fromEntries(['broker', 'orders', ...names].map((n, i) => [n, `http://127.0.0.1:${5600 + i}`]));
async function withStack(work) {
  if (model()) {
    const stack = require('./model-stack').modelStack(urls, names);
    activeCall = stack.call;
    try { return await work({ urls, stop: stack.stop, transport: 'model' }); }
    finally { activeCall = httpCall; }
  }
  if (process.env.LAB_TRANSPORT && process.env.LAB_TRANSPORT !== 'http') throw Error('invalid transport');
  const kids = new Map();
  async function stop(name) {
    const child = kids.get(name);
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise(resolve => {
      const timer = setTimeout(() => child.kill('SIGKILL'), 1800);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      child.kill('SIGTERM');
    });
  }
  const emergency = () => { for (const k of kids.values()) k.kill('SIGTERM'); process.exit(1); };
  process.once('SIGINT', emergency);
  process.once('SIGTERM', emergency);
  try {
    for (const [i, name] of ['broker', 'orders', ...names].entries()) {
      const { NODE_TEST_CONTEXT: testContext, ...childEnv } = process.env;
      const child = fork(path.join(__dirname, '../services', i < 2 ? `${name}.js` : 'worker.js'), [], {
        silent: true, execArgv: [], env: { ...childEnv, PORT: String(5600 + i), NAME: name,
          OWNER: urls.orders, BROKER: urls.broker },
      });
      kids.set(name, child);
      await new Promise((resolve, reject) => {
        let stderr = '';
        const timer = setTimeout(() => reject(Error(`${name}: startup timeout`)), 4000);
        child.stderr.on('data', s => { stderr += s; });
        child.once('error', e => { clearTimeout(timer); reject(e); });
        child.once('close', () => { clearTimeout(timer); reject(Error(`${name}: ${stderr.trim()}`)); });
        child.once('message', message => {
          clearTimeout(timer);
          if (message === 'ready') resolve(); else reject(Error('unexpected readiness'));
        });
      });
    }
    return await work({ urls, stop, transport: 'http' });
  } finally {
    await Promise.all([...kids.keys()].map(stop));
    process.removeListener('SIGINT', emergency);
    process.removeListener('SIGTERM', emergency);
  }
}
async function reset(urls, mode, guard = true) {
  await call(urls.broker, '/reset', {});
  await call(urls.orders, '/reset', {});
  for (const name of names) await call(urls[name], '/configure', { mode, guard });
}
async function save(urls, id, changes) { return call(urls.orders, '/orders', { id, changes }); }
async function publish(urls, event) { return call(urls.broker, '/publish', event); }
async function drain(urls, limit = 100) {
  for (const name of names) {
    let finished = false;
    for (let i = 0; i < limit; i++) {
      const result = await call(urls[name], '/step', {});
      if (result.status === 'empty' || result.status === 'stuck') { finished = true; break; }
    }
    if (!finished) throw Error('drain limit exceeded');
  }
}
async function states(urls) {
  const out = {};
  for (const name of names) out[name] = await call(urls[name], '/state');
  return out;
}
/* --brief: har mode ki ek line, sirf seedhe counters (nested objects JSON output mein). */
const brief = r => Object.entries(r)
  .filter(([, v]) => v === null || typeof v !== 'object' || (Array.isArray(v) && v.every(x => typeof x !== 'object')))
  .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`).join(' ');
function main(run) { run().then(value => {
  const transport = model() ? 'IN-PROCESS MODEL; no sockets or child exit' : 'HTTP between child processes';
  if (process.argv.includes('--brief')) console.log([transport, ...value.map(brief)].join('\n'));
  else console.log(JSON.stringify({ transport, results: value }, null, 2));
}).catch(e => {
  console.error(e.message); process.exitCode = 1;
}); }
module.exports = { call, model, names, withStack, reset, save, publish, drain, states, main };
