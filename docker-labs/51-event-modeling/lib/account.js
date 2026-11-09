/* Ek din ke account ke kaam, do tareeke se events:
   state : BalanceUpdated { balance, previous } — lab ka control: business ka type jaan-boojh ke hataya. (Video ka
           sujhaav business fact ke saath amount aur balances dena hai — wahi facts roop hai.)
   facts : jo hua wahi naam — SalaryCredited, CashWithdrawn (ATM), FeeCharged, FeeReversed, UpiPaid, InterestCredited */
const DAY = [
  { fact: 'SalaryCredited', amount: 5000 }, { fact: 'CashWithdrawn', amount: 2500, atm: 'ATM-17' },
  { fact: 'FeeCharged', amount: 500, reason: 'card annual fee' }, { fact: 'CashWithdrawn', amount: 3000, atm: 'ATM-04' },
  { fact: 'FeeReversed', amount: 500, reason: 'card annual fee' }, { fact: 'UpiPaid', amount: 2200, to: 'kirana' },
  { fact: 'InterestCredited', amount: 40 },
];
const CREDIT = new Set(['SalaryCredited', 'FeeReversed', 'InterestCredited']);
function toEvents(mode, start = 10000) {
  let bal = start;
  return DAY.map(({ fact, ...data }) => {
    const prev = bal;
    bal += CREDIT.has(fact) ? data.amount : -data.amount;
    return mode === 'state' ? { type: 'BalanceUpdated', data: { balance: bal, previous: prev } } : { type: fact, data };
  });
}
/* Teen consumers ke sawaal. state events par sirf balance ka badlaav (delta) dikhta hai. */
function answer(events) {
  if (events[0].type === 'BalanceUpdated') {
    const deltas = events.map(e => e.data.balance - e.data.previous);
    return { atmOver2000: deltas.filter(d => d < -2000).length,        // bada debit = ATM maan liya
             feeNet: null,                                             // fee aur baaki debit mein farq nahi
             why500: `pata nahi (sirf ${events[2].data.previous} → ${events[2].data.balance})` };
  }
  const sum = t => events.filter(e => e.type === t).reduce((a, e) => a + e.data.amount, 0);
  return { atmOver2000: events.filter(e => e.type === 'CashWithdrawn' && e.data.amount > 2000).length,
           feeNet: sum('FeeCharged') - sum('FeeReversed'),
           why500: `${events[2].type} (${events[2].data.reason})` };
}
module.exports = { DAY, toEvents, answer };
