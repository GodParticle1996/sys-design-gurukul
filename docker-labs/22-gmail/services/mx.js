/* Doosre mail server ka MX (jaise Gmail → kisi company ka server).
   SMTP ki haqeeqat: mail mil gaya, par ACK raaste mein kho sakta hai → bhejne wala dobara bhejega.
   IDEMPOTENT=1 → Message-ID dekh ke "ye toh pehle hi aa chuka" (mailbox mein dobara nahi).
   LOSE_ACK = kitne % ACK kho jaate hain (default 20%). */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 4984;
let IDEMPOTENT = process.env.IDEMPOTENT === '1', LOSE = +(process.env.LOSE_ACK || 0.2);
const mailbox = []; const seen = new Set(); let received = 0, ackLost = 0, dupSuppressed = 0;
serve(PORT, {
  'POST /smtp': (req, res, url, p, b) => {
    received++;
    if (IDEMPOTENT && seen.has(b.messageId)) dupSuppressed++;                 // pehle hi aa chuka — mailbox mein dobara nahi
    else { mailbox.push(b); seen.add(b.messageId); }
    if (Math.random() < LOSE) { ackLost++; res.destroy(); return; }            // mail toh andar hai, par "250 OK" gum
    return { ok: true, queued: true };
  },
  'GET /stats': () => ({ idempotent: IDEMPOTENT, inbox: mailbox.length, unique: seen.size, received, ackLost, dupSuppressed }),
  'POST /mode': (req, res, url, p, b) => { IDEMPOTENT = !!b.idempotent; if (b.lose != null) LOSE = +b.lose; mailbox.length = 0; seen.clear(); received = 0; ackLost = 0; dupSuppressed = 0; return { IDEMPOTENT, LOSE }; },
}, () => console.log(`[mx] :${PORT} idempotent=${IDEMPOTENT} lose_ack=${LOSE}`));
