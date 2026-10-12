/* Redis jaisa lock: SET key owner NX PX ttl · renew sirf owner kar sakta hai */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 4801);
let lock = null;           /* { owner, expires, term } */
let term = 0;
const alive = () => lock && lock.expires > Date.now();
serve(PORT, {
  'POST /acquire/:owner/:ttl': (req, res, url, p) => {
    if (alive() && lock.owner !== p.owner) return { ok: false, holder: lock.owner, term: lock.term };
    if (!alive() || lock.owner !== p.owner) term++;
    lock = { owner: p.owner, expires: Date.now() + +p.ttl, term: alive() && lock && lock.owner === p.owner ? lock.term : term };
    return { ok: true, term: lock.term };
  },
  'POST /renew/:owner/:ttl': (req, res, url, p) => {
    if (!alive() || lock.owner !== p.owner) return { ok: false };
    lock.expires = Date.now() + +p.ttl; return { ok: true, term: lock.term };
  },
  'GET /holder': () => (alive() ? { holder: lock.owner, term: lock.term } : { holder: null, term }),
}, () => console.log(`  lock-server → http://localhost:${PORT}`));
