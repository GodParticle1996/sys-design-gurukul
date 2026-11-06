/* Ek RAM queue. Har message ke saath uske aane ka waqt (at).
   ttlMs se purana message nikaalte waqt hat jaata hai:
   dlq: true ho toh dead queue mein, warna gin ke phenka jaata hai. */
function createQueue({ ttlMs = Infinity, dlq = false } = {}) {
  const items = [], dead = [];
  let expired = 0;
  function sweep(now) {
    while (items.length && now - items[0].at > ttlMs) {
      const old = items.shift();
      if (dlq) dead.push(old); else expired++;
    }
  }
  return {
    publish(msg, now) { items.push({ msg, at: now }); },
    take(now) {
      sweep(now);
      const head = items.shift();
      return head ? { msg: head.msg, waitedMs: now - head.at } : null;
    },
    stats(now) {
      sweep(now);
      return { depth: items.length, oldestMs: items.length ? now - items[0].at : 0,
        expired, deadLettered: dead.length };
    },
  };
}
module.exports = { createQueue };
