/* Content cloud — channel files ka "fast lane". POST /publish {file, validator, rollout}
   validator: spec | contract        rollout: global | rings
   rings: ring0 = 1% (canary), ring1 = 10%, ring2 = 50%, ring3 = 100% — har ring ke baad health gate:
   pichhli ring mein koi host crash hua → rollout RUK jaata hai. */
const fs = require('fs');
const path = require('path');
const { serve, json } = require('../lib/util');
const { validate } = require('../lib/sensor');
const PORT = +process.env.PORT || 4871;
let current = { version: 'feb-2024', rule: require('../content/c291-wildcard.json').rule, ringsOpen: 4, rollout: 'global' };
let health = {};                       // fleet batati hai: ring → crashed hosts
serve(PORT, {
  'POST /publish': (req, res, url, p, b) => {
    const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', b.file), 'utf8'));
    const v = validate(c.rule, b.validator || 'spec');
    if (!v.ok) return json(res, 422, { rejected: true, why: v.why });
    current = { version: c.version, rule: c.rule, rollout: b.rollout || 'global', ringsOpen: b.rollout === 'rings' ? 1 : 4, halted: false, at: Date.now() };
    health = {};
    return { published: c.version, rollout: current.rollout };
  },
  /* host poochta hai: meri ring ke liye kaunsa content? */
  'GET /content': (req, res, url) => {
    const ring = +url.searchParams.get('ring');
    if (ring < current.ringsOpen) return { version: current.version, rule: current.rule };
    return { version: null };
  },
  'POST /health': (req, res, url, p, b) => {                 // fleet har tick bhejti hai
    health = b;
    if (current.rollout === 'rings' && !current.halted) {
      const lastRing = current.ringsOpen - 1;
      if ((health[lastRing] || 0) > 0) current.halted = true;                              // canary mara → ruko
      else if (Date.now() - current.at > 600 * current.ringsOpen && current.ringsOpen < 4) current.ringsOpen++; // gate paar
    }
    return { ringsOpen: current.ringsOpen, halted: !!current.halted };
  },
  'GET /status': () => ({ version: current.version, rollout: current.rollout, ringsOpen: current.ringsOpen, halted: !!current.halted }),
}, () => console.log(`content cloud → :${PORT}`));
