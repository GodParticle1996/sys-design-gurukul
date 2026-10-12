/* Ek email store (ek site / ek replica). Mail ek STATE MACHINE hai: har mail ki apni state + labels.
   Labels sirf metadata hain — "Inbox" koi folder nahi, ek QUERY hai: label 'inbox' wale mails.
   POST /write {id, from, subject, labels}  → mail rakho (WAL mein likha, bytes ginte hain)
   POST /label {id, add, remove}            → sirf label badla (kitne bytes likhe, ginte hain)
   GET /q?label=inbox                       → query
   Crash simulate: POST /crash (sab kuch bhool jao jo ABHI tak durable nahi tha) */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 4981, SITE = process.env.SITE || 'site-a';
let mails = new Map(), bytesWritten = 0, rowsWritten = 0, unflushed = [];
serve(PORT, {
  'POST /write': (req, res, url, p, b) => {
    const size = JSON.stringify(b).length + (b.body_bytes || 2048);     // poora record (headers + body) likha ja raha hai
    bytesWritten += size; rowsWritten++;
    mails.set(b.id, { id: b.id, from: b.from, subject: b.subject, labels: new Set(b.labels || ['inbox']), body_bytes: b.body_bytes || 2048 });
    return { ok: true, bytes: size };
  },
  'POST /label': (req, res, url, p, b) => {                          // archive = 'inbox' label hataana. Mail kahin nahi hilta.
    const m = mails.get(b.id); if (!m) return { ok: false };
    (b.add || []).forEach(l => m.labels.add(l)); (b.remove || []).forEach(l => m.labels.delete(l));
    const size = JSON.stringify({ id: b.id, add: b.add, remove: b.remove }).length; bytesWritten += size; rowsWritten++;
    return { ok: true, bytes: size };
  },
  'GET /q': (req, res, url) => {
    const label = url.searchParams.get('label');
    const out = [...mails.values()].filter(m => !label || m.labels.has(label));
    return { count: out.length, sample: out.slice(0, 3).map(m => ({ id: m.id, subject: m.subject, labels: [...m.labels] })) };
  },
  'GET /has/:id': (req, res, url, p) => ({ present: mails.has(p.id) }),
  'GET /stats': () => ({ site: SITE, mails: mails.size, rowsWritten, bytesWritten }),
  'POST /reset': () => { mails = new Map(); bytesWritten = 0; rowsWritten = 0; return { ok: true }; },
}, () => console.log(`[store ${SITE}] :${PORT}`));
