/* 📟 On-call shift 'diwalipush' — boss-flow (engine: oncall.js; jobs plugin: perfsim-pro.js)
   boss-flow ka design canvas notification flow banata hai; yeh shift usi flow ki pehli raat:
     1 OtpStuckBehindCampaign  shared FIFO: OTP 50 lakh ke campaign ke peeche → age p99 83 min → jobs split priority → 8s
     2 ProviderThrottling      split ke baad bhi workers 1,500/s → FCM (1,000/s) 429: 540/s, OTP 35% → jobs cap campaign 800 → 429 0
     3 PoisonBlocksCampaign    (onFire: kharab device token wala job) campaign lane ruki → jobs dlq on → 1 parked, 800/s
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const J = s => s.sys.jobs;
  const INC = [
    { id: 'OtpStuckBehindCampaign', sev: '🔴 SEV1', text: 'Login OTP 80+ minute late! Marketing ne abhi 50 lakh users ko Diwali offer push bheja hai.',
      fixed: s => J(s).lanes === 'split',
      verify: r => r.kind === 'jobs' && r.op === 'run' && r.otpAgeSec <= 30,
      verifyText: 'jobs run 60 — OTP age 30s ke andar',
      hints: [
        'jobs status, phir jobs run 60 — OTP kitni der mein pahunch raha hai, aur uske aage kya khada hai?',
        'OTP aur offers ek hi line (FIFO) mein hain — OTP 50 lakh offers ke peeche intezaar kar raha hai. Zaroori kaam ki apni lane chahiye.',
        'jobs split priority, phir jobs run 60 — OTP age seconds mein.',
      ] },
    { id: 'ProviderThrottling', sev: '🔴 SEV1', text: 'FCM ka warning: "35% requests 429 — aise hi chala toh account throttle." OTP bhi pehli koshish mein 429 kha rahe.',
      fixed: s => { const j = J(s); return j.capCampaign >= 200 && j.otpRps + j.capCampaign <= 0.95 * j.providerRps; },
      verify: r => r.kind === 'jobs' && r.op === 'run' && r.throttledRps === 0,
      verifyText: 'jobs run 60 — provider 429 zero',
      hints: [
        'jobs run 60 — provider ki hadd kitni, aur hum har second kitni koshish kar rahe? 429 kitne?',
        'Lane alag hai par provider ka budget ek hi hai (1,000/s). Campaign workers 1,500/s maar rahe hain — 429 sab par girta hai. Campaign ko hadd ke NEECHE baandho, OTP ke liye jagah chhodo (headroom).',
        'jobs cap campaign 800 (40 OTP + 800 < 1,000), phir jobs run 60 — 429 zero.',
      ] },
    { id: 'PoisonBlocksCampaign', sev: '🟠 SEV2', text: 'Marketing ne naya batch daala. Campaign lane 60 second se 0 bhej rahi hai — ek hi job baar-baar fail (kharab device token).',
      onFire: s => { J(s).poison = true; },
      fixed: s => !!J(s).dlq,
      verify: r => r.kind === 'jobs' && r.op === 'run' && r.campaignRps > 0 && r.poisonRetries === 0,
      verifyText: 'jobs run 60 — campaign phir chal raha, poison retry zero',
      hints: [
        'jobs run 60 — campaign kitna bhej raha hai, aur "poison" line kya kehti hai? OTP lane par asar hai?',
        'Ek job kabhi safal nahi hoga (permanent error), aur bina hadd ke retry poori lane rok raha hai. Kuch koshish, phir use alag park karo jahan insaan dekhe.',
        'jobs dlq on, phir jobs run 60 — 1 job DLQ mein, campaign 800/s.',
      ] },
  ];

  SD.oncall.add({
    id: 'diwalipush', start: 1 * 60 + 10, INC,
    build: ({ risky }) => ({
      sys: { name: 'chaipay-notify' },
      goal: '<b>ChaiPay, 01:10 — Diwali offer ki raat.</b> Ek hi notification system se login OTP bhi jaate hain aur marketing ke offers bhi. FCM ki hadd 1,000/s. Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: jobs run 60)',
      runbook: `# ChaiPay notifications on-call runbook
Haal:         jobs status · jobs run 60   (60 second chala ke dekho)
Lanes:        jobs split priority (OTP ki alag lane) · jobs lanes shared
Provider:     FCM hadd 1,000/s — 429 par turant retry = aur 429 (account throttle ka khatra)
Campaign:     jobs cap campaign <rps>   (hadd se NEECHE, OTP ke liye jagah chhodo)
Kharab job:   jobs dlq on   (3 koshish, phir park)
SLO:          OTP 30 second ke andar · campaign subah 9 baje tak
Mat chhuna:   lanes wapas shared · sim reset · sim inject`,
      responses: [
        risky(/^jobs lanes\s+shared\b/i, 'Lanes wapas shared karna mana — OTP phir 50 lakh offers ke peeche lag jaayega.'),
      ],
      successText: `<b>Raat ki kahani:</b> OTP aur offers ek line mein — OTP 50 lakh ke peeche, 83 minute (1) → alag lane →
        par provider ka budget saajha tha, workers 1,500/s maar rahe the: 429 sab par (2) → campaign ko 800/s par baandha (headroom) →
        ek kharab token wala job lane rok raha tha (3) → DLQ: 3 koshish, phir park.<br>
        <b>Seekh:</b> async ka matlab "baad mein" hai, "kabhi bhi" nahi — <b>priority</b> (alag lane), <b>provider ki hadd</b> (rate budget, headroom) aur <b>kharab message</b> (DLQ) teeno ka plan pehle se.<br>
        <b>Postmortem action items:</b> OTP aur marketing alag lanes + alag provider budget · campaign rate limiter default · DLQ par alert.`,
      solution: [
        'runbook', 'jobs status', 'jobs run 60', 'jobs split priority', 'jobs run 60',
        'jobs cap campaign 800', 'jobs run 60',
        'jobs run 60', 'jobs dlq on', 'jobs run 60',
      ],
    }),
  });

  SD.addLab('boss-flow', {
    type: 'oncall', id: 'oncall-flow', shift: 'diwalipush', title: '📟 On-call shift: Diwali offer ki raat',
    instructions: 'Tumhara notification flow live hai. Har command = 1 minute. Theek karo, phir pakka karo — khatarnaak commands gine jaate hain.',
  });
})();
