/* ex3 — message store (old ya new). old-store DUAL=on par har naya write new-store ko bhi bhejta hai. */
const { serve, post } = require('../lib/util');
const PORT = +(process.env.PORT || 4721);
const NAME = process.env.NAME || 'old-store';
const SEED = +(process.env.SEED || 0);
const NEW_URL = 'http://localhost:' + (process.env.NEW_PORT || 4722);
let dual = false, primary = NAME === 'old-store';
const msgs = new Map();
for (let i = 0; i < SEED; i++) msgs.set(i, { id: i, ch: i % 500, text: 'history-' + i });
let nextId = SEED;

serve(PORT, {
  'POST /write': async (req, res, url, p, body) => {
    const id = body && body.id != null ? body.id : nextId++;
    const m = { id, ch: (body && body.ch) || id % 500, text: (body && body.text) || 'live-' + id };
    msgs.set(id, m);
    if (dual) await post(NEW_URL + '/bulk', { rows: [m] }).catch(() => {});
    return { ok: true, id };
  },
  'POST /bulk': (req, res, url, p, body) => { for (const m of body.rows) msgs.set(m.id, m); return { ok: true, n: body.rows.length }; },
  'GET /range/:from/:to': (req, res, url, p) => {
    const rows = [];
    for (let i = +p.from; i < +p.to; i++) { const m = msgs.get(i); if (m) rows.push(m); }
    return { rows };
  },
  'GET /count': () => ({ name: NAME, count: msgs.size, maxId: nextId - 1 }),
  'GET /ids': () => ({ ids: [...msgs.keys()] }),
  'GET /recent/:since': (req, res, url, p) => ({ ids: [...msgs.keys()].filter(i => i >= +p.since) }),
  'POST /admin/dual/:state': (req, res, url, p) => { dual = p.state === 'on'; return { dual }; },
  'POST /admin/promote': () => { primary = true; return { primary: NAME }; },
  'GET /seed': () => ({ seed: SEED }),
}, () => console.log(`  ${NAME.padEnd(9)} → http://localhost:${PORT}  (${SEED ? SEED.toLocaleString('en-IN') + ' historical messages' : 'khaali'})`));
