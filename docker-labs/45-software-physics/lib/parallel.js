const { checkLimit } = require('./lookups');
async function parallel(keys, get, limit = 2) {
  checkLimit(limit);
  const values = new Array(keys.length);
  let next = 0;
  async function worker() {
    while (next < keys.length) {
      const i = next++;
      values[i] = await get(keys[i]);
    }
  }
  const n = Math.min(limit, keys.length);
  await Promise.all(Array.from({ length: n }, worker));
  return values;
}
module.exports = { parallel };
