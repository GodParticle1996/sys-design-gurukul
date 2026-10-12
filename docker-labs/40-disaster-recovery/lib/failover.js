/* Router ka faisla: "region A gaya, B par chalein?"
   services/router.js aur tools/slowmo*.js yahi chalate
   hain.
     threshold  lagataar kitne health check fail hon, tab
                maana jaye ki region sach mein gaya */

function createDetector({ threshold = 3 } = {}) {
  let fails = 0;        // lagataar kitne check fail hue
  let done = false;     // failover ho chuka?

  return {
    // har health check ke baad bulao. true = B par chalo
    result(ok) {
      if (done) return false;
      fails = ok ? 0 : fails + 1;   // ek pass = ginti zero
      if (fails < threshold) return false;
      done = true;
      return true;      // sirf ek baar. Wapas nahi aata
    },
    fails: () => fails,
  };
}

module.exports = { createDetector };
