/* systemd-networkd. Jab systemd ka patch lagta hai (ya machine boot hoti hai), ye apni network config dobara "reapply" karta hai —
   aur jo rules use apne config mein nahi milte, unhe SAAF kar deta hai ("foreign rules").
   MANAGE_FOREIGN=0 → dusron ke rules ko haath mat lagao (shallow fix).
   KNOWN_PROTOS → jin protocol tags ko ye pehchanta hai, unhe chhod deta hai (asli fix: ownership ek convention ban gayi). */
const { serve, post, host } = require('../lib/util');
const PORT = +process.env.PORT || 4993, K = `http://${host('kernel')}:4991`;
const MANAGE_FOREIGN = process.env.MANAGE_FOREIGN !== '0';
const KNOWN = (process.env.KNOWN_PROTOS || 'kernel,static,cilium').split(',');
let reapplies = 0, removed = 0;
serve(PORT, {
  'POST /reapply': async (req, res, url, p, b) => {                  // systemd patch install hua → config dobara lagao
    reapplies++;
    await post(K + '/rule', { selector: 'from 10.0.0.0/8', table: 'main', proto: 'static', by: 'networkd' });
    if (!MANAGE_FOREIGN) return { reapplied: true, cleaned: 0, note: 'ManageForeignRoutingPolicyRules=no' };
    const r = await post(K + '/delete', { by: 'networkd', keepProtos: KNOWN });
    removed += r.removed;
    return { reapplied: true, cleaned: r.removed, removedRules: r.removedRules };
  },
  'GET /stats': () => ({ manageForeign: MANAGE_FOREIGN, knownProtos: KNOWN, reapplies, removed }),
}, () => console.log(`[networkd] :${PORT} manageForeign=${MANAGE_FOREIGN} known=${KNOWN.join('|')}`));
