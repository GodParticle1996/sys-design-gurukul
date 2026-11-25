/* 📟 On-call shift 'nightcart' — boss-resil (model shift; engine: oncall.js)
   Teen jude alerts, sab perfsim par saabit (2026-11-25):
     1 SearchStarved     ledger 3s + ek shared pool → search 0/100 rps   → bulkhead ledger (10) → search 100/100, p99 135ms
     2 OrderStatusSlow   order status page ledger ko pukaarta hai → 504 / 600ms+ → timeout + breaker + fallback → 200, p99 < 200ms
     3 SaleFlashCrowd    21:00 sale: 300 rps × 2.5 retry = 750 offered, capacity 495 → admission 250–480 → saturated nahi */
(function () {
  const POOL = 50;
  const ledger = s => (s.sys.deps || {}).ledger || {};
  const INC = [
    { id: 'SearchStarved', sev: '🔴 SEV1', text: 'search API: 0/100 rps serve ho rahe, p99 10s. Log products dhoondh hi nahi pa rahe.',
      fixed: s => { const b = (s.sys.app.bulkheads || {}).ledger; return b > 0 && b <= 40; },
      verify: r => r.kind === 'load' && r.pattern === 'mixed' && r.healthyServedRps >= 100,
      verifyText: 'wahi mixed load dobara chalao (load --pattern mixed --rps 100)',
      hints: [
        'load --pattern mixed --rps 100 chalao: ledger pool ke kitne connection le raha hai, search ko kitne bachte hain? Phir sim status — kaunsi dependency kitni dheemi hai?',
        'Ledger 3s le raha hai aur sab ek hi pool (50) mein hain. Dheema kaam saare connection gher leta hai, search bhookha reh jaata hai. Ledger ko apni alag hadd do — bulkhead.',
        'sim add bulkhead ledger --max 10 (chaho toh pehle sim add timeout ledger 600), phir load --pattern mixed --rps 100 dobara: search 100/100 aana chahiye.',
      ] },
    { id: 'OrderStatusSlow', sev: '🟠 SEV2', text: 'order status page p99 600ms+ (SLO 200ms), kai requests 504. Ledger abhi bhi dheema hai.',
      fixed: s => { const l = ledger(s); return !!(l.timeoutMs && l.breaker && l.fallback); },
      verify: r => r.kind === 'http' && r.status === 200 && r.p99 < 200,
      verifyText: 'order status ka GET bhejo jab tak 200 aur p99 200ms se kam na aaye',
      hints: [
        'GET /transactions/1 chalao — status kya hai, aur "+ downstream" line mein ledger kitna waqt kha raha hai? Phir sim status: ledger par kaunse guard hain?',
        'Har request ledger ka intezaar karti hai. Teen kaam: intezaar ki hadd (timeout), baar-baar pukaarna band (breaker), aur user ko purana status (fallback — yeh page sirf padhta hai, isliye theek hai).',
        "sim add timeout ledger 600 (agar nahi lagaya), sim add breaker ledger, sim add fallback ledger 'last known status'. Phir GET /transactions/2, /3, /4, /5… — 4 fail ke baad breaker khulta hai aur jawab 200, p99 200ms se kam.",
      ] },
    { id: 'SaleFlashCrowd', sev: '🔴 SEV1', text: 'Mega Sale khul gayi! Order page par 300 rps, aur log refresh daba rahe hain. p99 har second badh raha.',
      onFire: s => { s.sys.retryAmp = 2.5; },
      fixed: s => { const a = s.sys.api.admission; return !!a && a.maxRps >= 250 && a.maxRps <= 480; },
      verify: r => r.kind === 'load' && r.rps >= 300 && !r.saturated,
      verifyText: 'sale ka load dobara chalao (load --pattern detail --rps 300) — saturated nahi hona chahiye',
      hints: [
        'load --pattern detail --rps 300 chalao. CAPACITY panel mein "offered load" aur "Little\'s Law capacity" milao — ρ kitna hai?',
        '300 asli × 2.5 refresh = 750 offered, capacity 495 (pool 50 × 1000/101ms). Pool badhana mana hai (runbook). Backend ko bachao: utni hi requests andar lo jitni sambhal sakte ho, baaki waiting room mein.',
        'sim add admission --max-rps 400 --queue 8 (hadd capacity 495 se neeche, par 250 se upar — warna asli log bhi bahar), phir load --pattern detail --rps 300 dobara.',
      ] },
  ];

  const RUNBOOK = `# NightCart on-call runbook — Mega Sale ki raat
Pehle dekho, phir chhuo. Har fix ke baad PAKKA karo (wahi load / request dobara).

Haal:         sim status · metrics · slo
Load:         load --pattern mixed --rps 100     (ledger + search saath)
              load --pattern detail --rps 300    (order status page, sale ka traffic)
Ek request:   GET /transactions/<id>             (order status — ledger ko call karta hai)
Guards:       sim add timeout | breaker | fallback | bulkhead ledger …
              sim add admission --max-rps N --queue S
Ledger:       bahar ka provider (payments ledger). Uski speed hum theek nahi kar sakte.
DB pool:      50 = DB ki hadd (max_connections 60, 10 admin ke liye) — pool mat badhao.
Fallback:     sirf padhne wale pages par (order status). Payment approve par kabhi nahi.
Mat chhuna:   sim reset · sim inject · retries (ledger pehle se dheema) · DROP INDEX`;

  SD.oncall.add({
    id: 'nightcart', start: 20 * 60 + 52, INC,
    build: ({ risky }) => ({
      sys: { name: 'nightcart-api', deps: { ledger: { p50: 1800, p99: 3000, errorRate: 0 }, search: { p50: 60, p99: 100, errorRate: 0 } } },
      goal: '<b>NightCart, 20:52.</b> Raat 9 baje Mega Sale khulegi. Ledger (bahar ka payments provider) shaam se dheema hai. Pager tumhare paas hai — har alert theek karo, phir <b>pakka</b> karo. Shuru karne ke liye <code>runbook</code> padho.',
      runbook: RUNBOOK,
      placeholder: 'runbook   (phir: load --pattern mixed --rps 100)',
      responses: [
        risky(/^sim scale pool\s+(5[1-9]|[6-9]\d|\d{3,})\b/i, 'Pool 50 se upar mana — DB max_connections 60 hai (10 admin ke liye). Bada pool = DB par connection error, aur sabka nuksaan.'),
        risky(/^sim add retry\b/i, 'Retry mana — ledger pehle se dheema hai. Har retry uska load 2–3x karega (retry storm). Intezaar ki hadd lagao, koshishein nahi.'),
        risky(/^drop\s+index\b/i, 'Index mat giraao — raat ko production index girana = har query full scan.'),
      ],
      successText: `<b>Raat ki kahani (root cause chain):</b> ledger dheema (3s) + ek shared pool → ledger ne saare 50 connection gher liye, search bhookha (1) →
        bulkhead se search bacha, par order status page ab bhi ledger ka intezaar karta raha (2) → timeout + breaker + fallback se page tez aur zinda →
        9 baje sale: 300 × 2.5 = 750 offered, capacity 495 (3) → admission ne backend ko capacity ke andar rakha, baaki log waiting room mein.<br>
        <b>Seekh:</b> har guard ek alag nuksaan baandhta hai — bulkhead = <b>blast radius</b>, timeout = <b>intezaar</b>, breaker = <b>koshish</b>, fallback = <b>user ka anubhav</b>, admission = <b>kitna kaam</b>.<br>
        <b>Postmortem action items:</b> har dependency ka bulkhead default · sale se pehle load test (refresh ×2.5 ke saath) · admission ki hadd capacity se tay karo · fallback sirf read pages par.`,
      solution: [
        'runbook', 'load --pattern mixed --rps 100', 'sim status', 'sim add timeout ledger 600', 'sim add bulkhead ledger --max 10', 'load --pattern mixed --rps 100',
        'GET /transactions/1', 'sim add breaker ledger', "sim add fallback ledger 'last known status'",
        'GET /transactions/2', 'GET /transactions/3', 'GET /transactions/4', 'GET /transactions/5', 'GET /transactions/6',
        'load --pattern detail --rps 300', 'sim add admission --max-rps 400 --queue 8', 'load --pattern detail --rps 300',
      ],
    }),
  });

  SD.addLab('boss-resil', {
    type: 'oncall', id: 'oncall-resil', shift: 'nightcart', title: '📟 On-call shift: NightCart ki sale wali raat',
    instructions: 'Live system, jude hue alerts. Har command = 1 minute. Theek karo, phir pakka karo — khatarnaak commands gine jaate hain.',
    intro: '<div class="oc-intro-txt">Pehle <code>runbook</code> padho. Pager upar dikhega — har alert ke do kaam: <b>theek karo</b> aur <b>pakka karo</b>.</div>',
  });
})();
