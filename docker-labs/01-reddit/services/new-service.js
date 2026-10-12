/* ex4 — naya service: tez hai, par ek subtle bug ke saath (BUG_RATE par galat karma) */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 4106);
const BUG_RATE = +(process.env.BUG_RATE || 0.3);     /* kitne percent requests par galat jawab */
serve(PORT, {
  'GET /post/:id': (req, res, url, p) => {
    const n = Number(p.id.slice(1));
    const buggy = (n % 100) < BUG_RATE * 100;
    return { id: p.id, score: 100 + (n % 37), karma: buggy ? 0 : 4200, from: 'new-service' };
  },
}, () => console.log(`  new-service    → http://localhost:${PORT}  (BUG_RATE=${BUG_RATE})`));
