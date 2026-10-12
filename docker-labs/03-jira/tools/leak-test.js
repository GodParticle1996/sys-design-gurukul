/* Ek tenant ke token se search karo — doosre tenants ka data dikha kya? */
const { get } = require('../lib/util');
const base = 'http://localhost:' + (process.env.PORT || 4301);
(async () => {
  const r = await get(base + '/search?tenant=acme&q=salary');
  const s = await get(base + '/stats');
  console.log(`TENANCY=${String(s.tenancy).padEnd(7)} /search?q=salary → ${r.rows} rows   (${r.leaked} rows DOOSRE tenants ke)   ${r.leaked ? '❌ leak' : '✅'}`);
})();
