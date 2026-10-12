/* Baari-baari wali line (fair queue) — services/shared.js, tools/slowmo.js aur tools/mini.js yahi chalate hain.
   Har tenant ki apni line. Agla kaam: baari ke kram mein pehla tenant jiski line mein kuch hai — us tenant ka EK kaam.
   Jis tenant ki baari ho gayi, woh kram mein sabse peeche chala jaata hai. (Is tareeke ka naam: round robin.) */
class FairQueue {
  constructor({ perTenant = Infinity } = {}) {
    this.perTenant = perTenant;   // ek tenant ki line mein kitni jagah
    this.lines = new Map();       // tenant → us tenant ki line
    this.turn = [];               // baari ka kram
  }

  /* Naya kaam, apne tenant ki line mein. false = us tenant ki line bhari hai (baaki tenants par koi asar nahi) */
  push(tenant, job) {
    if (!this.lines.has(tenant)) { this.lines.set(tenant, []); this.turn.push(tenant); }
    const line = this.lines.get(tenant);
    if (line.length >= this.perTenant) return false;
    line.push(job);
    return true;
  }

  /* Agla kaam kiska? Baari ke kram mein chalo; jiski line khaali hai use chhod do */
  next() {
    for (let i = 0; i < this.turn.length; i++) {
      const tenant = this.turn.shift();
      this.turn.push(tenant);                 // baari ho gayi → kram mein sabse peeche
      const line = this.lines.get(tenant);
      if (line.length) return line.shift();
    }
    return null;                              // sab lines khaali
  }

  get waiting() {
    let n = 0;
    for (const line of this.lines.values()) n += line.length;
    return n;
  }
}

module.exports = { FairQueue };
