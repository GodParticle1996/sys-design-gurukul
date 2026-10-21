const { performance } = require('node:perf_hooks');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5000),
  });
  const body = await res.json();
  if (!res.ok) throw Error(body.error || res.status);
  return body;
}
module.exports = { sleep, get, now: () => performance.now() };
