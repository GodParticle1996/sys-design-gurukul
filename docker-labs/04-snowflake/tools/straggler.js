const { get, post } = require('../lib/util');
const a = require('./args')();
const base = 'http://localhost:' + (process.env.PORT || 4402);
(async () => {
  await post(base + `/straggler/${a.slow || 3}/${a.steal || 'off'}`, {});
  await get(base + '/query');                                        /* warm */
  const r = await get(base + '/query');
  console.log(`slow node ${a.slow || 3}×  steal=${a.steal || 'off'}  → query ${r.ms} ms`);
})();
