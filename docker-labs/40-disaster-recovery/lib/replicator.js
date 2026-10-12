/* Copy ka niyam: RPO yahin paida hota hai.
   services/region.js, tools/slowmo*.js aur tools/mini.js
   yahi chalate hain.
     ship     doosre region tak badlav pahunchane wala
              function (asli app mein HTTP POST). Fail
              ho toh throw kare.
     mode     'async' = yahan rakho, "ho gaya", phir copy
              'sync'  = wahan, phir yahan, phir "ho gaya"
     everyMs  async mein: jama badlav kitni der baad jayein
   (yahan = yeh region, wahan = doosra region)
   badlav (change) = ek order { id }
                     ya { type: 'delete-all' }
   waiting = jo badlav sirf YAHAN hain, doosre region mein
   abhi nahi. Region gaya toh yahi kho jate hain. */

function createReplicator(opts) {
  const { ship, mode = 'async', everyMs = 300 } = opts;
  const orders = new Map();   // is region ka DB
  let waiting = [];           // sirf yahan, wahan nahi
  let busy = false;           // ek waqt mein ek hi copy
  let timer = null;

  // DB mein badlav lagao (dono taraf yahi chalta hai)
  function apply(change) {
    if (change.type === 'delete-all') orders.clear();
    else orders.set(change.id, change);
  }

  async function tick() {
    if (busy || waiting.length === 0) return;
    busy = true;
    const batch = waiting.slice();   // jitne abhi hain
    try {
      await ship(batch);             // wahan pahunch gaye?
      waiting = waiting.slice(batch.length);   // toh hatao
    } catch (e) {
      // nahi pahunche: list waisi hi, agli baar phir
    }
    busy = false;
  }

  async function write(change) {
    if (mode === 'sync') {
      await ship([change]);   // pehle wahan, fail = throw
      apply(change);          // phir yahan
      return;                 // ab caller "ho gaya" bole
    }
    apply(change);            // pehle yahan rakho
    waiting.push(change);     // copy baad mein
  }

  return {
    orders, apply, write, tick,
    pending: () => waiting.length,
    start: () => { timer = setInterval(tick, everyMs); },
    stop: () => clearInterval(timer),
  };
}

module.exports = { createReplicator };
