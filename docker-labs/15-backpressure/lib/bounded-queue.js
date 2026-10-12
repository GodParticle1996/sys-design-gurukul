/* Hadd wali line (bounded queue) — lab ke tools (queue.js, slowmo.js, mini.js) yahi chalate hain.
   Sawaal ek hi hai: line BHARI ho aur naya kaam aaye, tab kya? Jawab `policy` deti hai:
     'block'        bhejne wale ko roko jab tak jagah na bane        (yahi backpressure hai)
     'error'        bhejne wale ko "na" bolo — aage ka faisla uska
     'drop-new'     naya kaam chupchaap gira do
     'drop-oldest'  line ka sabse purana kaam gira do, naya le lo
   cap = Infinity → bina hadd ki line: bharti hi nahi, toh koi policy kabhi chalti hi nahi. */
class BoundedQueue {
  constructor({ cap = Infinity, policy = 'block' } = {}) {
    this.cap = cap;            // line mein kitni jagah
    this.policy = policy;      // bhar gayi toh kya
    this.items = [];           // line
    this.dropped = 0;          // kitne kaam chupchaap gire
    this.refused = 0;          // kitni baar bhejne wale ko "na" bola
    this.waiting = [];         // ruke hue bhejne wale (unhe jagane wale functions)
  }

  get full() { return this.items.length >= this.cap; }

  /* Bhejne wale ka darwaza — bina ruke. true = "le liya" · false = "nahi liya" */
  offer(item) {
    if (!this.full) { this.items.push(item); return true; }             // jagah hai → line mein
    if (this.policy === 'drop-new') { this.dropped++; return true; }    // naya gira — par jawab "le liya"
    if (this.policy === 'drop-oldest') {
      this.items.shift(); this.dropped++;                               // sabse purana gira
      this.items.push(item); return true;                               // naya andar — jawab "le liya"
    }
    this.refused++; return false;                                       // 'error' / 'block': sach bolo
  }

  /* Bhejne wale ka darwaza — ruk ke. Line bhari hai → yahin ruko jab tak jagah na bane */
  async put(item) {
    while (this.full) await new Promise(wake => this.waiting.push(wake));
    this.items.push(item);
  }

  /* Kaam karne wale ka darwaza. Ek kaam nikla = ek jagah bani → ek ruke hue ko jagao */
  take() {
    const item = this.items.shift();
    const wake = this.waiting.shift();
    if (wake) wake();
    return item;
  }
}

module.exports = { BoundedQueue };
