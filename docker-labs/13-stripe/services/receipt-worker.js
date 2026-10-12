/* Background worker — receipt email + analytics. Alag process (Stripe mein yeh kaam Ruby request path se bahar,
   alag systems par jaata hai). Jobs line mein lagti hain, ek-ek karke 8 ms CPU. */
const { serve, burn } = require('../lib/util');
const PORT = +process.env.PORT || 4823;
const q = []; let done = 0;
setInterval(() => { const end = Date.now() + 40; while (q.length && Date.now() < end) { q.shift(); burn(8); done++; } }, 50);
serve(PORT, {
  'POST /job': () => { q.push(1); return { queued: q.length }; },
  'GET /stats': () => ({ queued: q.length, done }),
}, () => console.log(`receipt-worker → http://localhost:${PORT}`));
