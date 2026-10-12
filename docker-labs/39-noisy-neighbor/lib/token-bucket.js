/* Token wali baalti (token bucket) — "ek tenant kitna bhej sakta hai" ki hadd. services/shared.js aur tools/slowmo.js yahi chalate hain.
   Baalti mein zyada se zyada `burst` tokens. Har second `rate` naye tokens tapakte hain. Ek request = ek token.
   Token hai → request andar. Baalti khaali → mana (429). */
class TokenBucket {
  constructor({ rate, burst = rate, now = Date.now }) {
    this.rate = rate;            // har second kitne naye tokens
    this.burst = burst;          // baalti mein zyada se zyada kitne
    this.tokens = burst;         // shuru mein baalti bhari
    this.now = now;
    this.at = now();             // pichhli baar kab dekha tha
  }

  take() {
    const t = this.now();
    this.tokens = Math.min(this.burst, this.tokens + (t - this.at) / 1000 * this.rate);   // jitna samay beeta, utne tokens wapas
    this.at = t;
    if (this.tokens < 1) return false;   // baalti khaali → mana
    this.tokens -= 1;                    // ek token kharch
    return true;
  }
}

module.exports = { TokenBucket };
