/* PaymentCaptured padhne ke do tareeke.
   strict   : data ka har key pehchaana hua ho; anjaana field aaya toh event mana
   tolerant : sirf jo chahiye (orderId, amount) padho, baaki chhod do (Fowler: Tolerant Reader) */
const KNOWN = ['orderId', 'amount'];
function parse(mode, e) {
  const d = (e && e.data) || {};
  if (mode === 'strict') {
    const extra = Object.keys(d).filter(k => !KNOWN.includes(k));
    if (extra.length) return { ok: false, reason: `anjaana field ${extra.join(',')}` };
  }
  if (typeof d.orderId !== 'string') return { ok: false, reason: 'orderId nahi' };
  if (!Number.isFinite(d.amount)) return { ok: false, reason: 'amount nahi' };
  return { ok: true, orderId: d.orderId, amount: d.amount };
}
module.exports = { parse, KNOWN };
