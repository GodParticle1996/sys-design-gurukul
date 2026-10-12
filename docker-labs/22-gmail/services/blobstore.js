/* Attachment store. DEDUP=1 → content ka SHA-256 hi uska naam; same file dobara aayi toh sirf refcount++.
   delete = refcount--; 0 hone par hi bytes chhootte hain. */
const crypto = require('crypto');
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 4985;
let DEDUP = process.env.DEDUP !== '0';
let blobs = new Map(), copies = [], bytes = 0;
serve(PORT, {
  'POST /put': (req, res, url, p, b) => {
    const size = +b.size, hash = b.sha256;
    if (!DEDUP) { copies.push({ hash, size }); bytes += size; return { stored: true, bytes }; }
    const e = blobs.get(hash);
    if (e) { e.ref++; return { stored: false, dedup: true, ref: e.ref, bytes }; }
    blobs.set(hash, { size, ref: 1 }); bytes += size; return { stored: true, ref: 1, bytes };
  },
  'POST /delete': (req, res, url, p, b) => {
    const before = bytes;
    if (!DEDUP) { const i = copies.findIndex(c => c.hash === b.sha256); if (i >= 0) { bytes -= copies[i].size; copies.splice(i, 1); } }
    else { const e = blobs.get(b.sha256); if (e && --e.ref <= 0) { bytes -= e.size; blobs.delete(b.sha256); } }
    return { freed: before - bytes, bytes };
  },
  'GET /stats': () => ({ dedup: DEDUP, objects: DEDUP ? blobs.size : copies.length, bytes, refs: DEDUP ? [...blobs.values()].map(b => b.ref) : [] }),
  'POST /mode': (req, res, url, p, b) => { DEDUP = !!b.dedup; blobs = new Map(); copies = []; bytes = 0; return { DEDUP }; },
}, () => console.log(`[blobstore] :${PORT} dedup=${DEDUP}`));
