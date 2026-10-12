/* Circuit breaker — poora dimaag ek chhoti class mein. services/a.js aur tools/mini.js dono yahi class chalate hain.
   Har call se PEHLE poochho:  allow()     → "kya yeh call dependency tak jaaye?"
   Har call ke BAAD batao:     record(ok)  → "dependency ne theek jawab diya ya nahi?"                              */
class Breaker {
  constructor({ windowSize = 20, minCalls = 10, failRate = 0.5, openMs = 2000, trials = 3, now = Date.now } = {}) {
    Object.assign(this, { windowSize, minCalls, failRate, openMs, trials, now });
    this.state = 'CLOSED';   // CLOSED = calls ja rahi hain · OPEN = calls ruki hain · HALF_OPEN = sirf trial calls
    this.window = [];        // pichhli calls ka nateeja: true = theek, false = fail
    this.openUntil = 0;      // OPEN kab tak rahega
    this.trialsSent = 0;     // HALF_OPEN mein kitni trial calls bheji
    this.trialsOk = 0;       // un trial calls mein se kitni safal
  }

  allow() {
    if (this.state === 'OPEN') {
      if (this.now() < this.openUntil) return false;       // thanda hone ka waqt baaki hai: call roko
      this.state = 'HALF_OPEN';                            // waqt poora: ab trial calls
      this.trialsSent = 0; this.trialsOk = 0;
    }
    if (this.state === 'HALF_OPEN') {
      if (this.trialsSent >= this.trials) return false;    // trial calls ja chuki: baaki calls roko
      this.trialsSent++;
    }
    return true;                                           // CLOSED hai, ya trial call hai: jaane do
  }

  record(ok) {
    if (this.state === 'HALF_OPEN') {
      if (!ok) return this.open();                         // ek bhi trial fail → phir OPEN
      if (++this.trialsOk >= this.trials) this.close();    // saari trial calls safal → CLOSED
      return;
    }
    if (this.state === 'OPEN') return;                     // OPEN hone se pehle nikli purani call: mat gino
    this.window.push(ok);
    if (this.window.length > this.windowSize) this.window.shift();     // sirf pichhli N calls yaad rakho
    const fails = this.window.filter(x => !x).length;
    const enough = this.window.length >= this.minCalls;                // 2 mein se 1 fail bhi "50%" hai, par data nahi
    if (enough && fails / this.window.length >= this.failRate) this.open();
  }

  open()  { this.state = 'OPEN'; this.openUntil = this.now() + this.openMs; this.window = []; }
  close() { this.state = 'CLOSED'; this.window = []; }
}

module.exports = { Breaker };
