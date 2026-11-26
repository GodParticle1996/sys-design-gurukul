/* 🎲 Chaos deck 'pro-iv' — pro-iv track, level iv-feed (engine: chaos.js; fanout plugin: perfsim-pro.js)
   iv-feed design canvas ke chunav (data-pro-iv-1.js): hybrid fanout · inbox mein ~500 post ids · post cache + ek batch read ·
   6 mahine se gayab users ko push nahi. (200 mein se 50 dost gayab — is example ka maana hua hissa.)
   Swasth base: hybrid (≥ 1,00,000 followers = pull) · entry id · hydrate batch · skip-inactive ON.
   Probe (base par): fanout run → 150 crore copies/din · feed p99 60 ms · celebrity post turant · edit ek jagah ·
   cold feed 1 batch read · 50 crore copies/din bachi.
   Har card EK badlaav (perfsim par chala ke dekha, 2026-11-26):
     mode-read       feed p99 800 ms (SLO 200)
     threshold-high  threshold 1 crore → celebrities bhi push: 1,150 crore copies/din, celebrity post 2 min late
     entry-full      caption badla → 150 inbox copies mein purana
     hydrate-each    cold feed: 500 ids = 500 alag queries (N+1)
     inactive-push   50 crore copies/din 6 mahine se gayab doston ko */
(function () {
  const F = s => s.sys.feed;
  const run = f => r => r.kind === 'fanout' && r.op === 'run' && f(r);
  const hybridOk = s => F(s).mode === 'hybrid' && F(s).threshold <= 5000000;
  const H1 = 'fanout run chalao — kaunsi line laal hai: copies, feed p99, celebrity post, post edit, cold feed ya gayab dost? Phir fanout status — us hisse ki setting padho.';

  SD.chaos.addDeck({
    id: 'pro-iv', title: 'News feed deck',
    sys: { name: 'dostfeed', feed: { mode: 'hybrid', threshold: 100000, entry: 'id', hydrate: 'batch', skipInactive: true } },
    alert: '<b>📟 11:00 — DostFeed.</b> Kal raat feed service ka config naye template se bana — fanout, inbox, hydration sab ek file mein. Aaj design review ki checklist mein ek line laal hai. <b>Ek</b> setting galat hai. Shuru: <code>runbook</code>.',
    placeholder: 'runbook   (phir: fanout run)',
    runbook: `# DostFeed — ek din ka hisaab (5 crore daily users · 200 dost · 100 celebrities × 50 lakh followers)
Probe:     fanout run   → copies sau crore ke aas-paas · feed p99 ≤ 200 ms · celebrity post turant ·
                          edit ek jagah · cold feed 1 batch read · gayab doston ko push nahi
Settings:  fanout status · fanout use hybrid --celeb-threshold <N> · fanout entry id|full
           fanout hydrate batch|each · fanout skip-inactive on|off
Niyam:     ek baar mein EK badlaav, phir fanout run dobara.`,
    cards: [
      { id: 'mode-read', title: 'Production feed poora pull (read mode) par chala gaya',
        sys: { feed: { mode: 'read' } },
        fixed: hybridOk, verify: run(r => r.feedMs <= 200 && r.celebLagMin === 0), verifyText: 'fanout run — feed p99 ≤ 200 ms',
        hints: [H1, 'fanout run: feed p99 800 ms, SLO 200 ms. fanout status: production kis mode par hai?', 'fanout use hybrid --celeb-threshold 100000, phir fanout run.'],
        solution: ['runbook', 'fanout run', 'fanout status', 'fanout use hybrid --celeb-threshold 100000', 'fanout run'],
        why: 'Pull mein likhna sasta, par har feed kholne par 200 doston ke posts jodo — p99 800 ms. <b>Hybrid</b>: aam users push, celebrities pull — dono ka sasta hissa.' },
      { id: 'threshold-high', title: 'Celebrity threshold 1 lakh se 1 crore followers ho gaya',
        sys: { feed: { threshold: 10000000 } },
        fixed: hybridOk, verify: run(r => r.celebLagMin === 0 && r.inboxCopies <= 3e9), verifyText: 'fanout run — celebrity post turant, copies kam',
        hints: [H1, 'fanout run: 1,150 crore copies/din aur celebrity post 2 min late. fanout status: threshold kitna hai — celebrities ke 50 lakh followers se upar ya neeche?', 'fanout use hybrid --celeb-threshold 100000, phir fanout run.'],
        solution: ['runbook', 'fanout run', 'fanout status', 'fanout use hybrid --celeb-threshold 100000', 'fanout run'],
        why: 'Threshold 1 crore, celebrities ke followers 50 lakh — toh celebrities bhi push: ek post = 50 lakh writes, 2 min late. Threshold <b>celebrities ke followers se neeche</b> rakho.' },
      { id: 'entry-full', title: 'Inbox mein post id ki jagah poora post copy ho raha hai',
        sys: { feed: { entry: 'full' } },
        fixed: s => F(s).entry === 'id', verify: run(r => r.staleCopies === 0), verifyText: 'fanout run — edit sab feeds mein naya',
        hints: [H1, 'fanout run: Riya ne caption badla, par 150 inbox copies mein purana dikh raha hai. fanout status: inbox mein kya rakha jaata hai?', 'fanout entry id, phir fanout run.'],
        solution: ['runbook', 'fanout run', 'fanout status', 'fanout entry id', 'fanout run'],
        why: 'Inbox mein poora post = har copy bhaari, aur edit ya delete par har copy alag badlo — warna purana dikhe. <b>Sirf post id</b> rakho (~500 ids ki list); data post cache se — badlaav ek jagah.' },
      { id: 'hydrate-each', title: 'Feed ke har post ke liye alag DB query',
        sys: { feed: { hydrate: 'each' } },
        fixed: s => F(s).hydrate === 'batch', verify: run(r => r.coldQueries === 1), verifyText: 'fanout run — cold feed 1 batch read',
        hints: [H1, 'fanout run: cold feed par 500 ids = 500 alag queries. fanout status: ids se post ka data kaise aata hai?', 'fanout hydrate batch, phir fanout run.'],
        solution: ['runbook', 'fanout run', 'fanout status', 'fanout hydrate batch', 'fanout run'],
        why: '500 ids ke liye ek-ek query = <b>N+1</b>: 500 round trips ek feed ke liye. Post cache, aur miss wale saare ids ek batch read mein — popular posts cache mein garam rehte hain.' },
      { id: 'inactive-push', title: '6 mahine se gayab users ko bhi har post push ho rahi hai',
        sys: { feed: { skipInactive: false } },
        fixed: s => !!F(s).skipInactive, verify: run(r => r.dormantCopies === 0), verifyText: 'fanout run — gayab doston ko push nahi',
        hints: [H1, 'fanout run: 50 crore copies/din aise doston ko jo 6 mahine se aaye hi nahi. fanout status: gayab users ke saath kya hota hai?', 'fanout skip-inactive on, phir fanout run.'],
        solution: ['runbook', 'fanout run', 'fanout status', 'fanout skip-inactive on', 'fanout run'],
        why: 'Jo 6 mahine se nahi aaya, uski inbox koi nahi padhega — 50 crore bekaar writes har din. <b>Push mat karo</b>; user laute toh ek baar pull se uski feed banao.' },
    ],
  });

  SD.addLab('iv-feed', {
    type: 'chaos', id: 'chaos-pro-iv', deck: 'pro-iv', title: '🎲 Chaos round: feed ka naya template',
    instructions: 'Ek probe, chhe lines, ek laal. Dhoondho, EK badlaav se theek karo, pakka karo — phir batao kya toota tha.',
  });
})();
