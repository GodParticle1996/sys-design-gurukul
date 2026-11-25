/* 🎲 Chaos deck 'flow' — flow track, level syncasync (engine: chaos.js; jobs plugin: perfsim-pro.js)
   Swasth base (notifications): OTP ki alag lane · campaign cap 800/s · DLQ on · dedup on · user cap 3.
   Ek kharab job (poison) campaign lane mein pada hai — DLQ use park kar deta hai.
   Probe: jobs run 60 → base par OTP 1s, 429 0, campaign 800/s, 1 parked, duplicates 0, offers 3/din.
   Har card EK setting bigaadta hai, aur usi probe ki EK line badalti hai (perfsim par chala ke dekha, 2026-11-25):
     lanes-shared  OTP age ~1.7 ghante · cap-off  429 540/s · dlq-off  campaign 0, poison 48,000 retries
     dedup-off     120 duplicates · usercap-off  15 offers/din */
(function () {
  const J = s => s.sys.jobs;
  const run = pred => r => r.kind === 'jobs' && r.op === 'run' && pred(r);
  const H1 = 'jobs run 60 chalao aur har line padho: OTP age, 429, campaign, poison, duplicates, offers. Kaunsi line galat hai? Phir jobs status.';
  const SOL = fix => ['runbook', 'jobs run 60', 'jobs status', fix, 'jobs run 60'];

  SD.chaos.addDeck({
    id: 'flow', title: 'Notification flow deck',
    sys: { name: 'chaipay-notify', jobs: { lanes: 'split', capCampaign: 800, dlq: true, dedup: true, userCap: 3, dupRate: 0.05, offersPerUser: 15, poison: true } },
    alert: '<b>📟 19:30 — notifications team.</b> Kal raat notification service ka naya deploy hua (config defaults "saaf" kiye gaye). Aaj shikayatein aa rahi hain — ek setting galat gayi. Shuru: <code>runbook</code>.',
    placeholder: 'runbook   (phir: jobs run 60)',
    runbook: `# Notifications runbook — swasth haal (jobs run 60)
OTP age < 30s · provider 429 = 0 · campaign chal raha · kharab job DLQ mein · duplicates 0 · offers ≤ 3/user/din
Settings:   jobs status · jobs split priority · jobs lanes shared · jobs cap campaign <rps>
            jobs dlq on|off · jobs dedup on|off · jobs usercap <N>
Niyam:      ek baar mein EK badlaav, phir jobs run 60 dobara.`,
    cards: [
      { id: 'lanes-shared', title: 'OTP ki alag lane hat gayi — sab ek FIFO mein',
        sys: { jobs: { lanes: 'shared' } },
        fixed: s => J(s).lanes === 'split', verify: run(r => r.otpAgeSec <= 30), verifyText: 'jobs run 60 — OTP age 30s ke andar',
        hints: [H1, 'OTP age ghanton mein — OTP kiske peeche khada hai? jobs status: lanes?', 'jobs split priority, phir jobs run 60.'],
        solution: SOL('jobs split priority'),
        why: 'OTP aur campaign ek line mein = OTP lakhon offers ke peeche. Zaroori kaam ki <b>apni lane</b> chahiye — async ka matlab "baad mein" hai, "kabhi bhi" nahi.' },
      { id: 'cap-off', title: 'Campaign ki rate cap hat gayi — workers poori raftaar par',
        sys: { jobs: { capCampaign: 0 } },
        fixed: s => J(s).capCampaign >= 200 && J(s).otpRps + J(s).capCampaign <= 0.95 * J(s).providerRps,
        verify: run(r => r.throttledRps === 0), verifyText: 'jobs run 60 — 429 zero',
        hints: [H1, 'Provider 429 de raha hai (540/s), OTP bhi pehli koshish mein 429. Workers kitni koshish kar rahe? jobs status: campaign cap?', 'jobs cap campaign 800, phir jobs run 60.'],
        solution: SOL('jobs cap campaign 800'),
        why: 'Lane alag hai, par provider ka budget (1,000/s) <b>saajha</b>. Workers 1,500/s maarein toh 429 sab par — OTP par bhi. Campaign ko hadd se neeche baandho, OTP ke liye headroom.' },
      { id: 'dlq-off', title: 'DLQ band ho gaya — kharab job hamesha retry',
        sys: { jobs: { dlq: false } },
        fixed: s => !!J(s).dlq, verify: run(r => r.campaignRps > 0 && r.poisonRetries === 0), verifyText: 'jobs run 60 — campaign chal raha, poison retry 0',
        hints: [H1, 'Campaign 0/s, aur ek hi job 48,000 baar retry. jobs status: DLQ?', 'jobs dlq on, phir jobs run 60.'],
        solution: SOL('jobs dlq on'),
        why: 'Ek permanent fail job (kharab token) bina hadd ke retry = poori lane ruki (<b>poison message</b>). Kuch koshish, phir DLQ — jahan insaan dekhe, aur lane chalti rahe.' },
      { id: 'dedup-off', title: 'Dedup band ho gaya — retries do-do notification',
        sys: { jobs: { dedup: false } },
        fixed: s => !!J(s).dedup, verify: run(r => r.dupSent === 0), verifyText: 'jobs run 60 — duplicates 0',
        hints: [H1, '"duplicates" line: 120 do baar gaye. Producer timeout par retry karta hai — rokna kaun karega? jobs status: dedup?', 'jobs dedup on, phir jobs run 60.'],
        solution: SOL('jobs dedup on'),
        why: 'Producer ka retry normal hai; consumer ko ek delivery pehchaanni hai — <b>event_id + user + channel</b> ki key, retry window tak yaad.' },
      { id: 'usercap-off', title: 'Har user ki offer hadd hat gayi',
        sys: { jobs: { userCap: 0 } },
        fixed: s => J(s).userCap >= 1 && J(s).userCap <= 5, verify: run(r => r.offersPerUser >= 1 && r.offersPerUser <= 5), verifyText: 'jobs run 60 — offers 5/user/din se kam',
        hints: [H1, '"offers per user" 15/din — provider ki hadd toh theek hai. Kiski hadd chhooti? jobs status: user cap?', 'jobs usercap 3, phir jobs run 60.'],
        solution: SOL('jobs usercap 3'),
        why: 'Global rate limit <b>provider</b> ko bachata hai, <b>user</b> ko nahi. Marketing ke liye har user ki apni hadd (OTP par kabhi nahi) — warna uninstall.' },
    ],
  });

  SD.addLab('syncasync', {
    type: 'chaos', id: 'chaos-flow', deck: 'flow', title: '🎲 Chaos round: notification defaults',
    instructions: 'Ek probe, chhe lines, ek galat setting. Dhoondho, EK badlaav se theek karo, pakka karo — phir batao kya toota tha.',
  });
})();
