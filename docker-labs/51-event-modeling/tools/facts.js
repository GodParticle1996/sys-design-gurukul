/* ex2-facts: ek din ke 7 kaam (shuru ₹10,000). Teen consumers ke sawaal:
   fraud: "₹2,000 se bade ATM withdrawals" (sahi 2) · fees: "card fee ka net" (sahi 0) · audit: "teesre event par ₹500 kyun kata?"
   modes: state | facts. --trace: har event aur consumer ko kya dikha. */
const { toEvents, answer } = require('../lib/account');
const arg = process.argv.slice(2), trace = arg.includes('--trace'), modes = arg.filter(a => !a.startsWith('--'));
for (const m of modes.length ? modes : ['state', 'facts']) {
  const evs = toEvents(m);
  if (trace) { console.log(`mode=${m}`); evs.forEach((e, i) => console.log(`  ${i + 1}. ${e.type.padEnd(16)} ${JSON.stringify(e.data)}`)); }
  const a = answer(evs);
  console.log(`${m.padEnd(6)} events=${evs.length} ATM>2000=${a.atmOver2000} (sahi 2) · fee-net=${a.feeNet ?? 'pata nahi'} (sahi 0) · ₹500 kyun: ${a.why500}`);
}
