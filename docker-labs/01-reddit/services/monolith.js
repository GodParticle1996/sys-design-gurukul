/* ex4 — purana monolith: sach ka source */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 4105);
serve(PORT, {
  'GET /post/:id': (req, res, url, p) => ({ id: p.id, score: 100 + (Number(p.id.slice(1)) % 37), karma: 4200, from: 'monolith' }),
}, () => console.log(`  monolith       → http://localhost:${PORT}`));
