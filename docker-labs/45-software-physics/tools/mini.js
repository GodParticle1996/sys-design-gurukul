const { batched } = require('../lib/lookups');
const { parallel } = require('../lib/parallel');
const keys = ['thali', 'chai', 'roti', 'dal', 'lassi'];
const store = new Map(keys.map((key, i) => [key, i + 1]));
let calls = 0;
async function getMany(part) {
  calls++;
  return part.map(key => store.get(key));
}
(async () => {
  const values = await batched(keys, getMany, 2);
  console.log('batch2: ' + values.join(',') +
    ' calls=' + calls);
  calls = 0;
  const one = async key => (await getMany([key]))[0];
  const parallelValues = await parallel(keys, one, 2);
  console.log('parallel2: ' + parallelValues.join(',') +
    ' calls=' + calls);
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
