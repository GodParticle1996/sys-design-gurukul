/* 📟 On-call shift 'rehearsal' — boss-obs (engine: oncall.js; cost/capacity: perfsim-pro.js)
     1 CheckoutSlowHealthGreen  /health 200, CPU kam; load: "effective pool 5 (45 atke hue)", ρ 6.0; trace: pool.acquire() 98%
                                → sim set db.longTxHolding 0 (atki transaction khatam) → ρ 0.60
     2 CloudBillDoubled         ₹18 → ₹36 lakh, untagged 100% → cost tag on → Statement PDF ₹8 lakh → cost fix … → ₹0.120 → ₹0.100 / payment
     3 NoSpareCapacity          capacity fail --servers 6 … → 5 par 120% overload → capacity plan … --spare 1 → 11 → fail test 60% ✅
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const after = (s, i, pred) => s.records.slice(s.oc.incs[i].firedRec || 0).some(pred);   // alert i aane ke baad ke records
  const INC = [
    { id: 'CheckoutSlowHealthGreen', sev: '🔴 SEV1', text: 'Diwali rehearsal (300 rps): checkout p99 10s+, par /health 200 aur CPU 12%. Dashboard sab hara dikhata hai.',
      fixed: s => !s.sys.db.longTxHolding,
      verify: r => r.kind === 'load' && r.rps >= 300 && !r.saturated,
      verifyText: 'rehearsal ka load dobara (load --pattern detail --rps 300) — saturated nahi',
      hints: [
        'load --pattern detail --rps 300 chalao, phir trace GET /transactions/1 — waqt kis span mein gaya?',
        '"pool.acquire()" 98% aur "effective pool 5 (50 mein se 45 atke hue!)". CPU aur health hare hain kyunki kaam ko connection hi nahi mil raha. sim status: kaun pakde baitha hai?',
        'Ek lambi transaction 45 connection pakde hai. Use khatam karo (asli mein pg_terminate_backend): sim set db.longTxHolding 0, phir load dobara.',
      ] },
    { id: 'CloudBillDoubled', sev: '🟠 SEV2', text: 'Cloud budget alert: is mahine ka bill ₹18 lakh se ₹36 lakh. Payments sirf 20% badhe. Finance subah 9 baje jawab maangega.',
      fixed: s => !!(s.sys.cost && s.sys.cost.tags && Object.keys(s.sys.cost.fixed || {}).length),
      verify: r => r.kind === 'cost-unit' && r.perUnit < 0.12,
      verifyText: 'har payment ka kharcha dobara (cost unit) — ₹0.120 se kam',
      hints: [
        'cost show — kharcha kis cheez par hai? Kaun sa feature kitna kha raha hai, pata chal raha hai?',
        'Bill sirf resource (compute, DB, network) dikhata hai — feature ka naam nahi. Pehle tags lagao, phir sabse bada NAYA kharcha dhoondho, aur cost unit se har payment ki keemat naapo.',
        'cost tag on, cost show (Statement PDF ₹8 lakh — har download par dobara banta hai), cost unit, cost fix statement-pdf --lever cache, phir cost unit dobara.',
      ] },
    { id: 'NoSpareCapacity', sev: '🟠 SEV2', text: 'Rehearsal ka chaos step: 6 mein se 1 server hataya → baaki 5 par 120% (ek server 400 rps tak tested). Kal asli Diwali, peak 2,400 rps.',
      fixed: s => after(s, 2, r => r.kind === 'capacity' && r.op === 'plan' && r.spare >= 1 && r.peak >= 2400),
      verify: r => r.kind === 'capacity' && r.op === 'fail' && r.survived && r.peak >= 2400,
      verifyText: 'naye fleet par ek server gira ke dekho (capacity fail …) — jhel jaana chahiye',
      hints: [
        'capacity fail --servers 6 --peak 2400 --per-server 400 — ek server gira toh baaki par kitna load?',
        'Plan average par bana tha, N-1 par nahi. Fleet aisi chahiye ki ek server jaane par bhi baaki target ke andar rahein: target utilisation + spare.',
        'capacity plan --peak 2400 --per-server 400 --target 60 --spare 1 (11 servers), phir capacity fail --servers 11 --peak 2400 --per-server 400.',
      ] },
  ];

  SD.oncall.add({
    id: 'rehearsal', start: 2 * 60 + 55, INC,
    build: ({ risky }) => ({
      sys: { name: 'chaipay-checkout', deps: { ledger: { p50: 60, p99: 100, errorRate: 0 } }, db: { longTxHolding: 45 } },
      goal: '<b>ChaiPay, 02:55 — Diwali ki rehearsal.</b> Dashboard hara hai, par pager kuch aur keh raha hai. Har alert theek karo, phir <b>pakka</b> karo. Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: load --pattern detail --rps 300)',
      runbook: `# ChaiPay on-call runbook — Diwali rehearsal
Waqt kahan gaya:  load --pattern detail --rps 300 · trace GET /transactions/1 · metrics · sim status
Dhyaan:           /health aur CPU hare hon tab bhi users dukhi ho sakte hain — user ka p99 dekho.
Kharcha:          cost show · cost tag on · cost unit · cost fix <feature> --lever cache|rightsize|cdn
Capacity:         capacity plan --peak P --per-server S --target T --spare K
                  capacity fail --servers N --peak P --per-server S   (ek server gira ke dekho)
Mat chhuna:       pool 50 se upar (DB max 60) · sim reset · sim inject`,
      responses: [
        risky(/^sim scale pool\s+(5[1-9]|[6-9]\d|\d{3,})\b/i, 'Pool 50 se upar mana — DB max_connections 60 hai. Aur pool bada karne se atki transaction nahi chhootegi.'),
      ],
      successText: `<b>Raat ki kahani:</b> dashboard hara tha (health 200, CPU 12%) par checkout 10s — <b>trace</b> ne dikhaya waqt pool.acquire() mein, ek lambi transaction 45 connection pakde thi (1) →
        budget alert: bill dugna, par resource-wise bill se pata nahi kaun — <b>tags</b> se Statement PDF mila, har payment ₹0.120 → ₹0.100 (2) →
        chaos step ne dikhaya ki fleet N-1 nahi jhel sakti — 11 servers (60% target + 1 spare) (3).<br>
        <b>Seekh:</b> observability = "kya toota" nahi, "<b>kahan</b>" — user ka p99, trace ke spans, feature-wise bill, aur ek server kam hone par kya hoga.<br>
        <b>Postmortem action items:</b> pool wait par alert (health check ke bharose nahi) · lambi transaction ka timeout · har resource par feature tag · capacity plan N-1 par.`,
      solution: [
        'runbook', 'load --pattern detail --rps 300', 'trace GET /transactions/1', 'sim status', 'sim set db.longTxHolding 0', 'load --pattern detail --rps 300',
        'cost show', 'cost tag on', 'cost show', 'cost unit', 'cost fix statement-pdf --lever cache', 'cost unit',
        'capacity fail --servers 6 --peak 2400 --per-server 400', 'capacity plan --peak 2400 --per-server 400 --target 60 --spare 1', 'capacity fail --servers 11 --peak 2400 --per-server 400',
      ],
    }),
  });

  SD.addLab('boss-obs', {
    type: 'oncall', id: 'oncall-obs', shift: 'rehearsal', title: '📟 On-call shift: Diwali ki rehearsal',
    instructions: 'Dashboard hara, pager laal. Har command = 1 minute. Waqt kahan gaya — dhoondho, theek karo, pakka karo.',
  });
})();
