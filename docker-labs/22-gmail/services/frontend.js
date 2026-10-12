/* Gmail ka front end. Mail aaya → do site (A aur B) par likhna hai.
   ACK=before → site A par likha, user ko turant "Sent/Delivered" bol diya, B ko background mein bhejenge.
   ACK=after  → dono sites par likhne ke BAAD hi "delivered" (yahi Gmail karta hai — ek site gir jaaye toh bhi mail zinda).
   CRASH_AFTER=n → n mails ke baad site A "gir jaati hai" (jo background mein pending tha, woh gaya). */
const { serve, post, get, host, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 4983;
const A = `http://${host('store-a')}:4981`, B = `http://${host('store-b')}:4982`;
let MODE = process.env.ACK || 'after', crashAfter = +(process.env.CRASH_AFTER || 0);
let n = 0, acked = 0, pending = 0, crashed = false;
serve(PORT, {
  'POST /deliver': async (req, res, url, p, b) => {
    n++;
    if (crashed) return { ok: false, error: 'site A down' };
    await post(A + '/write', b);
    if (MODE === 'after') { await post(B + '/write', b); acked++; }
    else {
      acked++; pending++;
      (async () => { await sleep(80); if (!crashed) { await post(B + '/write', b); pending--; } })();   // background replication
    }
    if (crashAfter && n >= crashAfter && !crashed) { crashed = true; console.log(`[frontend] 💥 site A gir gayi (${pending} mails abhi tak sirf A par the)`); }
    return { ok: true, acked: true, replicated: MODE === 'after' };
  },
  'POST /mode': (req, res, url, p, b) => { MODE = b.ack; crashAfter = +(b.crashAfter || 0); crashed = false; n = 0; acked = 0; pending = 0; return { MODE, crashAfter }; },
  'GET /stats': () => ({ MODE, acked, crashed, stillOnlyOnA: pending }),
}, () => console.log(`[frontend] :${PORT} ACK=${MODE}`));
