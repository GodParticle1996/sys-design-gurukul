/* Dual-write mode ke liye: purana data ek baar target mein copy (backfill) */
const { get, post } = require('../lib/util');
(async () => {
  const { rows } = await get('http://localhost:5001/count');
  for (let f = 0; f < rows; f += 5000) { const s = await get(`http://localhost:5001/snapshot/${f}/${f + 5000}`); await post('http://localhost:5002/apply', { rows: s.rows }); }
  console.log(`backfill: ${rows} rows target mein`);
})();
