/* Consumer process: PaymentCaptured events padhta hai. MODE strict | tolerant (lib/reader.js). Mana kiya event = 422. */
const { serve } = require('../lib/http');
const { parse } = require('../lib/reader');
const st = { ok: 0, rejected: 0, sum: 0 };
serve(+process.env.PORT, async (method, route, body) => {
  if (route === '/health') return { ok: true };
  if (route === '/state') return st;
  if (method === 'POST' && route === '/event') {
    const r = parse(process.env.MODE, body);
    if (!r.ok) { st.rejected++; return { code: 422, body: { error: r.reason } }; }
    st.ok++; st.sum += r.amount;
    return { ok: true };
  }
  throw Error('unknown route');
});
