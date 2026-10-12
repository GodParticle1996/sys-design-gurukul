/* Ek game instance (ek chhota server, ek session). Game state — position, score — SIRF isi process ki memory mein.
   Process mara = game state gaya. Yahi sahi hai: match 10 minute ka hai, use bachane ka kharcha bekaar. */
const { serve, post, host } = require('../lib/util');
const PORT = +process.env.PORT, PLATFORM = `http://${host('platform')}:5032`;
const score = new Map();
serve(PORT, {
  'POST /join': (req, res, url, p, b) => { score.set(b.player, 0); return { ok: true, instance: PORT }; },
  'POST /play': async (req, res, url, p, b) => {                       // ek round: score +10, kabhi-kabhi ek hat mile
    score.set(b.player, (score.get(b.player) || 0) + 10);
    if (b.earnHat) await post(PLATFORM + '/grant', { player: b.player, item: 'hat-' + PORT + '-' + score.get(b.player) });
    return { score: score.get(b.player) };
  },
  'GET /score/:player': (req, res, url, p) => ({ score: score.get(p.player) ?? null }),
  'GET /stats': () => ({ port: PORT, players: score.size }),
}, () => console.log(`[instance :${PORT}] up`));
