/* ex4 — gateway: SHIFT% traffic naye service par, baaki monolith par. Compare mode bhi. */
const { serve, get } = require('../lib/util');
const PORT = +(process.env.PORT || 4104);
const MONO = 'http://localhost:' + (process.env.MONO_PORT || 4105);
const NEW = 'http://localhost:' + (process.env.NEW_PORT || 4106);
let shift = +(process.env.SHIFT || 0);
let counts = { monolith: 0, new: 0, mismatch: 0, errors: 0 };

serve(PORT, {
  'GET /post/:id': async (req, res, url, p) => {
    const toNew = (Math.random() * 100) < shift;
    try {
      if (!toNew) { counts.monolith++; return await get(MONO + '/post/' + p.id); }
      counts['new']++;
      const [a, b] = await Promise.all([get(NEW + '/post/' + p.id), get(MONO + '/post/' + p.id)]);
      if (JSON.stringify({ ...a, from: 0 }) !== JSON.stringify({ ...b, from: 0 })) counts.mismatch++;
      return a;
    } catch (e) { counts.errors++; throw e; }
  },
  'POST /admin/shift/:pct': (req, res, url, p) => { shift = Number(p.pct); return { shift }; },
  'GET /stats': () => ({ shift, ...counts }),
  'POST /admin/reset': () => { counts = { monolith: 0, new: 0, mismatch: 0, errors: 0 }; return { ok: true }; },
}, () => console.log(`  gateway        → http://localhost:${PORT}  (SHIFT=${shift}%)`));
