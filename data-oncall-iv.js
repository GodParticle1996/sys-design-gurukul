/* 📟 On-call shift 'designlive' — boss-iv (engine: oncall.js; jobs + fanout: perfsim-pro.js)
   Interview ke designs ab production mein — har alert ek design ka "follow-up sawaal":
     1 DuplicateReceipts  (iv-notify) payment service retry karti hai → 120 receipts/min do baar → jobs dedup on → 0
     2 OfferSpam          (iv-notify) ek user ko din mein 15 offers → jobs usercap 3 → 3
     3 CelebrityPostLag   (iv-feed)   write fanout: celebrity post 2 min late, 1,200 crore copies/din
                          → fanout use hybrid --celeb-threshold 100000 → turant, 200 crore, feed p99 60ms
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const J = s => s.sys.jobs;
  const F = s => s.sys.feed || { mode: 'write', threshold: 100000 };
  const INC = [
    { id: 'DuplicateReceipts', sev: '🟠 SEV2', text: 'Users: "payment safal" ka push do-do baar aa raha hai. Payment service timeout par event dobara bhejti hai.',
      fixed: s => !!J(s).dedup,
      verify: r => r.kind === 'jobs' && r.op === 'run' && r.dupSent === 0,
      verifyText: 'jobs run 60 — duplicates zero',
      hints: [
        'jobs status, phir jobs run 60 — "duplicates" line kya kehti hai?',
        'Producer ka retry normal hai (timeout par dobara bhejna padta hai). Rokna consumer ko hai: ek delivery ki pehchaan — event_id + user + channel — aur retry window tak yaad rakho.',
        'jobs dedup on, phir jobs run 60 — duplicates 0.',
      ] },
    { id: 'OfferSpam', sev: '🟠 SEV2', text: 'App store par 1-star reviews: "din mein 15 offer notifications!" Uninstall badh rahe hain.',
      fixed: s => J(s).userCap >= 1 && J(s).userCap <= 5,
      verify: r => r.kind === 'jobs' && r.op === 'run' && r.offersPerUser >= 1 && r.offersPerUser <= 5,
      verifyText: 'jobs run 60 — har user ko din mein 5 se kam offers',
      hints: [
        'jobs run 60 — "offers per user" kitna hai? Provider ki hadd (1,000/s) toh theek hai — phir dikkat kahan?',
        'Global rate limit provider ko bachata hai, user ko nahi. Har user ki apni hadd chahiye (marketing ke liye; OTP par nahi).',
        'jobs usercap 3, phir jobs run 60 — 3/din.',
      ] },
    { id: 'CelebrityPostLag', sev: '🟠 SEV2', text: 'Ek celebrity ka post followers tak 2 minute late pahunch raha hai. Inbox writes 1,200 crore/din — storage team pareshan.',
      fixed: s => F(s).mode === 'hybrid' && F(s).threshold <= 5000000,
      verify: r => r.kind === 'fanout' && r.prod && r.mode === 'hybrid' && r.celebLagMin === 0 && r.feedMs <= 200,
      verifyText: 'fanout status — production hybrid, celebrity lag 0, feed p99 ≤ 200ms',
      hints: [
        'fanout status — production kis mode par hai? Phir what-if: fanout --mode read aur fanout --mode hybrid — kaun SLO (200ms) aur lag dono bachata hai?',
        'Write fanout mein celebrity ka ek post = 50 lakh inbox writes. Read fanout har feed par 200 doston ka merge (800ms). Aam users push, celebrities pull — dono ka sasta hissa.',
        'fanout use hybrid --celeb-threshold 100000, phir fanout status.',
      ] },
  ];

  SD.oncall.add({
    id: 'designlive', start: 23 * 60 + 50, INC,
    build: ({ risky }) => ({
      sys: { name: 'chaipay-social', jobs: { lanes: 'split', capCampaign: 800, dupRate: 0.05, offersPerUser: 15 }, feed: { mode: 'write', threshold: 100000 } },
      goal: '<b>23:50 — interview ke designs ab production mein.</b> Notification system aur feed — dono tumne whiteboard par banaye the. Ab interviewer ke "follow-up sawaal" pager par aa rahe hain. Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: jobs run 60)',
      runbook: `# Design-live on-call runbook
Notifications: jobs status · jobs run 60 · jobs dedup on|off · jobs usercap <N>
Feed:          fanout status (production) · fanout --mode write|read|hybrid (what-if) · fanout use <mode> [--celeb-threshold N]
SLO:           feed p99 ≤ 200ms · celebrity post turant · marketing ≤ 5 offers/user/din
Mat chhuna:    dedup off · user cap hatana · sim reset · sim inject`,
      responses: [
        risky(/^jobs dedup\s+off\b/i, 'Dedup band karna mana — retries phir do-do receipts bhejenge.'),
        risky(/^jobs usercap\s+0\b/i, 'User cap hatana mana — users phir din mein 15 offers paayenge.'),
      ],
      successText: `<b>Raat ki kahani:</b> producer ke retries ne receipts do baar bheje (1) → consumer par dedup (event_id + user + channel) →
        global limit provider ko bacha rahi thi, user ko nahi — 15 offers/din (2) → per-user cap →
        write fanout mein celebrity ka ek post = 50 lakh writes, 2 min lag (3) → hybrid: aam users push, celebrities pull.<br>
        <b>Seekh:</b> interview ka har "follow-up sawaal" production ka ek asli incident hai — <b>duplicates</b>, <b>user ki hadd</b>, aur <b>ek design sab par nahi chalta</b> (hybrid).<br>
        <b>Interview mein bolne layak:</b> "retry hoga hi — dedup consumer par", "rate limit kiske liye: provider ya user?", "celebrity alag raasta".`,
      solution: [
        'runbook', 'jobs status', 'jobs run 60', 'jobs dedup on', 'jobs run 60',
        'jobs usercap 3', 'jobs run 60',
        'fanout status', 'fanout --mode hybrid --celeb-threshold 100000', 'fanout use hybrid --celeb-threshold 100000', 'fanout status',
      ],
    }),
  });

  SD.addLab('boss-iv', {
    type: 'oncall', id: 'oncall-iv', shift: 'designlive', title: '📟 On-call shift: tumhara design, production mein',
    instructions: 'Interview ke designs live hain. Har command = 1 minute. Interviewer ke follow-up ab pager par — theek karo, phir pakka karo.',
  });
})();
