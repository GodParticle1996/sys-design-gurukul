/* "Object storage" — data yahan rehta hai, compute mein nahi */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 4400);
const ROWS = +(process.env.ROWS || 5000000);
serve(PORT, {
  'GET /rows': () => ({ rows: ROWS }),
  'GET /scan/:n': (req, res, url, p) => ({ rows: Math.min(ROWS, +p.n) }),
}, () => console.log(`  storage → http://localhost:${PORT}  (${ROWS.toLocaleString('en-IN')} rows — compute se alag)`));
