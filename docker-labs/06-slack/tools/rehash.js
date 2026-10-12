const { get } = require('../lib/util');
const a = require('./args')();
(async () => { const r = await get(`http://localhost:${process.env.PORT || 4607}/rehash/8/${a.to || 16}`); console.log(`hash % 8 → hash % ${r.to}: ${r.movedPct}% rows ka thikana badal gaya  (poora data migration chahiye)`); })();
