/* Load balancer ka rotation-niyam: traffic kise milega?
   services/lb.js aur slow motion tools yahi chalate hain.
   Do cheezein instance ko rotation se bahar karti hain:
     health check — 2 baar fail → bahar, 1 pass → wapas
     eject        — N asli requests LAGATAAR fail → ejectMs
                    ke liye bahar, /health ✓ ho tab bhi
   Ek cheez request ko bachati hai:
     retry        — pehla fail → agle par ek baar */

const HEALTH_FAILS = 2;

const filled = (n, v) => new Array(n).fill(v);

function newRotation(n) {
  return {
    n,
    last: -1,               // pichhla chuna hua instance
    fails: filled(n, 0),    // health: lagataar fail
    out: filled(n, false),  // health ne bahar kiya?
    streak: filled(n, 0),   // requests: lagataar fail
    until: filled(n, 0),    // eject: is waqt tak bahar
  };
}

// abhi kaun-kaun rotation mein hai (instance ke number)
function members(r, now) {
  const list = [];
  for (let i = 0; i < r.n; i++) {
    if (!r.out[i] && now >= r.until[i]) list.push(i);
  }
  return list;
}

// is request ke liye kaun-kaun try hoga, kis order mein
function choose(r, now, retry) {
  const list = members(r, now);
  if (list.length === 0) {
    // sab bahar? phir bhi sab mein se kisi ko try karo
    for (let i = 0; i < r.n; i++) list.push(i);
  }
  // pichhle ke baad wala pehla (ghoom ke shuru se)
  let first = list.findIndex(i => i > r.last);
  if (first === -1) first = 0;
  r.last = list[first];
  const order = [];
  for (let k = 0; k < list.length; k++) {
    order.push(list[(first + k) % list.length]);
  }
  return order.slice(0, retry ? 2 : 1);
}

// health check ka nateeja → null | 'out' | 'in'
function onHealth(r, i, ok) {
  if (ok) {
    r.fails[i] = 0;
    if (!r.out[i]) return null;
    r.out[i] = false;
    return 'in';
  }
  r.fails[i]++;
  if (r.fails[i] < HEALTH_FAILS || r.out[i]) return null;
  r.out[i] = true;
  return 'out';
}

// asli request ka nateeja → null | 'ejected'
function onRequest(r, i, ok, now, eject, ejectMs) {
  if (now < r.until[i]) return null;   // pehle se bahar
  if (ok) {
    r.streak[i] = 0;
    return null;
  }
  r.streak[i]++;
  if (!eject || r.streak[i] < eject) return null;
  r.streak[i] = 0;
  r.until[i] = now + ejectMs;
  return 'ejected';
}

module.exports = {
  HEALTH_FAILS, newRotation, members, choose,
  onHealth, onRequest,
};
