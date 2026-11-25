/* 📟 On-call shift 'passbook' — sdd-resil, level cb-kab (engine: oncall.js)
   Breaker ka poora jeevan — band → khula → aadha-khula → band:
     1 ProviderFailing   ledger 100% fail; har request provider tak → sim add breaker ledger → 4 fail ke baad OPEN, calls 1ms
     2 UsersSee504       breaker ne provider bachaya, users ko 504   → sim add fallback ledger 'cached passbook' → 200 (OPEN rehte)
     3 ProviderBack      (onFire: provider theek) users ko ab bhi purani passbook → cooldown (sim advance 31) → trial GET → CLOSED
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const L = s => (s.sys.deps || {}).ledger || {};
  const INC = [
    { id: 'ProviderFailing', sev: '🔴 SEV1', text: 'Passbook provider ki 100% calls fail. Phir bhi har request usi tak ja rahi hai — provider ki team keh rahi hai "humein saans lene do".',
      fixed: s => !!L(s).breaker,
      verify: (r, s) => r.kind === 'http' && L(s).breakerState === 'open',
      verifyText: 'GET bhejte raho jab tak breaker OPEN na ho jaaye (calls 1ms mein fail)',
      hints: [
        'GET /transactions/1 chalao — status aur "+ downstream" dekho. Phir sim status: ledger par koi guard hai?',
        'Har request ek marte hue provider ko aur dabaati hai. Kuch failures ke baad calls bhejna hi band karo — circuit breaker.',
        'sim add breaker ledger, phir GET /transactions/2, /3, /4… — 4 fail ke baad "CIRCUIT OPEN" aur calls 1ms mein fail.',
      ] },
    { id: 'UsersSee504', sev: '🟠 SEV2', text: 'Provider bach gaya, par passbook kholne wale users ko ab tez 504 mil raha hai — "kuch nahi dikh raha".',
      fixed: s => !!L(s).fallback,
      verify: (r, s) => r.kind === 'http' && r.status === 200 && L(s).breakerState === 'open',
      verifyText: 'breaker OPEN rehte GET bhejo — 200 aana chahiye',
      hints: [
        'GET /transactions/6 — breaker OPEN hai, toh user ko kya mil raha hai?',
        'Breaker sirf "tez fail" deta hai. User ko kuch kaam ka dikhana hai: passbook sirf padhne wala page hai — thodi purani copy (time ke saath) chal sakti hai.',
        "sim add fallback ledger 'cached passbook', phir GET dobara: 200 (purani copy), provider ko call nahi.",
      ] },
    { id: 'ProviderBack', sev: '🟠 SEV2', text: 'Provider team: "fix deploy ho gaya, sab theek." Par users ko ab bhi purani passbook dikh rahi hai.',
      onFire: s => { const l = L(s); l.errorRate = 0; l.down = false; },
      fixed: s => L(s).breakerState === 'closed',
      verify: (r, s) => r.kind === 'http' && r.status === 200 && L(s).breakerState === 'closed',
      verifyText: 'breaker CLOSED hone ke baad ek aur GET — taaza jawab',
      hints: [
        'GET /transactions/7 — abhi bhi fallback kyun? sim status mein breaker ki haalat dekho.',
        'OPEN breaker provider ko pukaarta hi nahi, toh use pata kaise chale ki provider theek hai? Cooldown ke baad EK trial request (half-open). perfsim ki apni ghadi hai: sim advance.',
        'sim advance 31 (cooldown 30s), phir GET /transactions/8 (trial → CLOSED), phir GET /transactions/9 — taaza jawab.',
      ] },
  ];

  SD.oncall.add({
    id: 'passbook', start: 3 * 60 + 30, INC,
    build: ({ risky }) => ({
      sys: { name: 'passbook-api', deps: { ledger: { p50: 60, p99: 100, errorRate: 1 } } },
      goal: '<b>Passbook app, 03:30.</b> Transaction history dikhane wala provider gir gaya hai. Pager tumhare paas hai — har alert theek karo, phir <b>pakka</b> karo. Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: GET /transactions/1)',
      runbook: `# Passbook on-call runbook
Page:         GET /transactions/<id>   (passbook — sirf padhta hai; provider "ledger" se history laata hai)
Haal:         sim status (ledger par guards, breaker ki haalat) · metrics
Guards:       sim add breaker ledger · sim add fallback ledger '<text>' · sim add timeout ledger <ms>
Ghadi:        perfsim ki apni ghadi hai (virtual seconds). Har GET ~1s; intezaar: sim advance <seconds>
Provider:     bahar ki team. Uski speed / recovery hamare haath mein nahi.
Mat chhuna:   retries (girte provider par bojh) · sim reset · sim inject`,
      responses: [
        risky(/^sim add retry\b/i, 'Retry mana — provider pehle se gir raha hai. Har retry uska bojh 2–3x karega aur recovery aur door.'),
      ],
      successText: `<b>Raat ki kahani:</b> provider gira tha aur har request use aur dabaa rahi thi (1) → breaker ne calls rok di, provider ko saans mili →
        par users ko tez 504 (2) → fallback ne purani passbook dikhayi → provider theek hua par breaker OPEN tha, use pata hi nahi tha (3) →
        cooldown ke baad ek trial request (half-open) ne recovery saabit ki → CLOSED.<br>
        <b>Seekh:</b> breaker ka asli maqsad <b>khud ko</b> aur provider ko bachana hai; fallback user ko; aur half-open recovery ko <b>naapne</b> ka tareeka — poora traffic ek saath wapas nahi.<br>
        <b>Postmortem action items:</b> har dependency par breaker + fallback default · cooldown aur trial calls ki tuning · fallback par "purana data" ka label.`,
      solution: [
        'runbook', 'GET /transactions/1', 'sim status', 'sim add breaker ledger', 'GET /transactions/2', 'GET /transactions/3', 'GET /transactions/4', 'GET /transactions/5',
        "sim add fallback ledger 'cached passbook'", 'GET /transactions/6',
        'GET /transactions/7', 'sim advance 31', 'GET /transactions/8', 'GET /transactions/9',
      ],
    }),
  });

  SD.addLab('cb-kab', {
    type: 'oncall', id: 'oncall-sdd-resil', shift: 'passbook', title: '📟 On-call shift: breaker ka poora chakkar',
    instructions: 'Ek gira hua provider. Breaker lagao, users ko kuch dikhao, aur recovery saabit karo. Har command = 1 minute.',
  });
})();
