function checkLimit(limit) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw Error('positive integer limit chahiye');
  }
}
async function sequential(keys, get) {
  const values = [];
  for (const key of keys) {
    values.push(await get(key));
  }
  return values;
}
async function batched(keys, getMany, size = 4) {
  checkLimit(size);
  const values = [];
  for (let i = 0; i < keys.length; i += size) {
    const part = keys.slice(i, i + size);
    values.push(...await getMany(part));
  }
  return values;
}
module.exports = { sequential, batched, checkLimit };
