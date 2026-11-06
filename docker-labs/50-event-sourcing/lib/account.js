/* Account ki haalat = uske events ko kram se jodna (fold). Koi "balance" column sach ka source nahi.
   upcast(): schema 1 ke purane events ko padhte waqt naye roop mein badlo; DB mein event jaisa tha waisa rehta hai. */
function upcast(e) {
  if (e.type === 'MoneyAdded' && e.schema === 1) return { ...e, type: 'Deposited', schema: 2, data: { amount: e.data.amt, source: 'purana' } };
  return e;
}
function apply(state, e) {
  switch (e.type) {
    case 'Opened': return { ...state, open: true };
    case 'Deposited': return { ...state, balance: state.balance + e.data.amount };
    case 'Withdrawn': return { ...state, balance: state.balance - e.data.amount };
    default: return state;                           // anjaana type chhoot jaata hai — upcaster ke bina yahi galti
  }
}
const EMPTY = { open: false, balance: 0, version: 0 };
function fold(events, start = EMPTY, { upcasting = true } = {}) {
  return events.reduce((s, e) => ({ ...apply(s, upcasting ? upcast(e) : e), version: e.version }), start);
}
module.exports = { upcast, apply, fold, EMPTY };
