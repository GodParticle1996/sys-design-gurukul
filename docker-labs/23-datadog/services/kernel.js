/* Linux kernel ka `ip rule` table — ek SAAJHA list jiska koi maalik nahi.
   Har rule: {selector, table, proto}. Packet aaya → pehla match → us table se route. Match nahi hua → 'main' table → pod ka packet marta hai.
   Koi bhi privileged program kisi bhi rule ko hata sakta hai. Na error, na warning, na lock, na "ye rule kisne banaya" ka record. */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 4991;
let rules = [], seq = 0, deleted = [];
const main = { table: 'main', routes: ['default via eth0'] };
serve(PORT, {
  'GET /rules': () => ({ rules }),
  'POST /rule': (req, res, url, p, b) => { const r = { id: ++seq, selector: b.selector, table: b.table, proto: b.proto || null, by: b.by }; rules.push(r); return r; },
  'POST /delete': (req, res, url, p, b) => {                         // by = kaun hata raha hai, keep = kaunse proto bachane hain
    const before = rules.length;
    const gone = rules.filter(r => !(b.keepProtos || []).includes(r.proto));
    rules = rules.filter(r => (b.keepProtos || []).includes(r.proto));
    deleted.push(...gone.map(r => ({ ...r, deletedBy: b.by })));
    return { removed: before - rules.length, by: b.by, removedRules: gone };
  },
  'POST /packet': (req, res, url, p, b) => {                         // pod ka packet: fwmark laga hua
    const hit = rules.find(r => r.selector === 'fwmark ' + b.fwmark);
    return hit ? { delivered: true, via: hit.table, rule: hit.id } : { delivered: false, via: main.table, why: 'koi rule match nahi — main table mein pod ka raasta hai hi nahi' };
  },
  'POST /boot': () => { rules = []; deleted = []; return { ok: true }; },
  'GET /deleted': () => ({ deleted }),
}, () => console.log(`[kernel] :${PORT} — shared ip rule table, koi owner nahi`));
