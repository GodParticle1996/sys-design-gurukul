/* Payment ledger — asli side effect. FENCING=1 → har order ke liye ab tak ka sabse bada token yaad rakho;
   usse chhote token wala likhna aaye toh MANA (purana lock-holder jo "jaag" ke aaya). */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 5156;
let charges = new Map(), maxToken = new Map(), rejected = 0, FENCING = process.env.FENCING === '1';
serve(PORT, {
  'POST /charge': (req, res, url, p, b) => {
    if (FENCING && b.token != null && b.token < (maxToken.get(b.order) || 0)) { rejected++; return { ok: false, why: `token ${b.token} purana (latest ${maxToken.get(b.order)})` }; }
    if (b.token != null) maxToken.set(b.order, Math.max(b.token, maxToken.get(b.order) || 0));
    charges.set(b.order, (charges.get(b.order) || 0) + 1); return { ok: true };
  },
  'POST /config': (req, res, url, p, b) => { FENCING = !!b.fencing; charges = new Map(); maxToken = new Map(); rejected = 0; return { FENCING }; },
  'GET /stats': () => ({ fencing: FENCING, orders: charges.size, doubleCharged: [...charges.values()].filter(c => c > 1).length, rejected }),
}, () => console.log(`[ledger] :${PORT} fencing=${FENCING}`));
