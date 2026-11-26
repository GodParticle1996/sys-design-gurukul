/* 🎲 Chaos deck 'builds' — adclick
   Base: late clicks ke liye 30s, event time, 12 partitions aur 12 consumers, hot ad ki key ke 8 hisse, raw stream log.
   clicks run → sab late clicks mile, click 08:59 mein, sab workers kaam par, busiest partition 1,00,000/s.
   stream replay --from 0 → 42 lakh events dobara padhe.
   watermark-off     window band hone par 40,000 late clicks chhoote
   processing-clock  campaign ka aakhri click 09:00 ki window mein gaya
   consumers-extra   8 workers khaali
   salt-gone         ek partition par 4,50,000 clicks/s
   stream-queue      purane events ka replay band */
(function () {
  const H1 = 'Window ki chaar lines padho. Phir dekho ki raw clicks dobara padh sakte ho ya nahi.';
  const windowRun = r => r.kind === 'clicks' && r.op === 'run';

  SD.chaos.addDeck({
    id: 'builds', title: 'AdClick ka bill',
    sys: { name: 'ad-ingest', streamKind: 'log' },
    alert: '<b>📟 09:05 — AdClick.</b> Kal raat billing pipeline nayi settings ke saath chali. Subah advertiser ke bill par sign karne se pehle team ne purani window ki rehearsal maangi hai. Ek check fail ho raha hai. Shuru karo <code>runbook</code> se.',
    placeholder: 'runbook',
    runbook: `# AdClick billing rehearsal
1. clicks run → late clicks sab milein, campaign ka aakhri click 08:59 mein ginein, koi worker khaali na ho aur hot ad ka load banta rahe.
2. stream replay --from 0 → naya consumer purane raw clicks padh sake.
Settings: clicks status · sim status. Replay ki line padho: events dobara mile ya consume hote hi delete ho gaye?
Badlo: clicks set watermark <sec> · clicks set clock event · clicks set consumers <N> · clicks set salts <N> · sim set streamKind log
Niyam: ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'watermark-off', title: 'Late clicks ka intezaar band hai',
        sys: { clicks: { watermarkSec: 0 } }, fixed: s => s.sys.clicks.watermarkSec >= 30 && s.sys.clicks.watermarkSec <= 60,
        verify: r => windowRun(r) && r.dropped === 0,
        verifyText: 'clicks run — saare late clicks gine',
        hints: [H1, 'Late clicks ki line mein kitne chhoote? Window kitni der aur khuli rehti hai?', 'clicks set watermark 30, phir clicks run.'],
        solution: ['runbook', 'clicks run', 'clicks status', 'clicks set watermark 30', 'clicks run'],
        why: 'Window jaldi band hui toh der se pahunche clicks ginti se baahar rahe. <b>Grace period</b> unhe sahi window mein jodne ka waqt deta hai.' },
      { id: 'processing-clock', title: 'Click aane ke waqt se minute chuna gaya',
        sys: { clicks: { clock: 'processing' } }, fixed: s => s.sys.clicks.clock === 'event',
        verify: r => windowRun(r) && !r.wrongMinute,
        verifyText: 'clicks run — click campaign ke minute mein',
        hints: [H1, 'Click campaign khatam hone se pehle hua. Kis ghadi ne use agle minute mein daala?', 'clicks set clock event, phir clicks run.'],
        solution: ['runbook', 'clicks run', 'clicks status', 'clicks set clock event', 'clicks run'],
        why: 'Processor ne click milne ka waqt liya, isliye bill ka minute badal gaya. <b>Event time</b> se wahi minute milta hai jab user ne click kiya.' },
      { id: 'consumers-extra', title: 'Partitions se zyada workers laga diye',
        sys: { clicks: { consumers: 20 } }, fixed: s => s.sys.clicks.consumers >= 1 && s.sys.clicks.consumers <= s.sys.clicks.partitions,
        verify: r => windowRun(r) && r.active > 0 && r.idle === 0,
        verifyText: 'clicks run — koi worker khaali nahi',
        hints: [H1, 'Kuch consumers ko ek bhi partition nahi mila. Dono ginti milao.', 'clicks set consumers 12, phir clicks run.'],
        solution: ['runbook', 'clicks run', 'clicks status', 'clicks set consumers 12', 'clicks run'],
        why: 'Ek group mein ek partition ek waqt par ek worker padhta hai. <b>Consumer count</b> ko partitions ki hadd mein laane se khaali workers ka kharcha bachta hai.' },
      { id: 'salt-gone', title: 'Viral ad ki key ka bantwara hat gaya',
        sys: { clicks: { salts: 1 } }, fixed: s => s.sys.clicks.salts >= 4 && s.sys.clicks.salts <= 12,
        verify: r => windowRun(r) && !r.hotSkewed,
        verifyText: 'clicks run — hot ad ka load banta',
        hints: [H1, 'Workers ko kaam mila, par sabse bhaari partition ka rate ausat se kitna upar hai?', 'clicks set salts 8, phir clicks run.'],
        solution: ['runbook', 'clicks run', 'clicks status', 'clicks set salts 8', 'clicks run'],
        why: 'Viral ad ki ek key ne ek partition bhar diya. <b>Key salting</b> us ad ke clicks kai keys par baantti hai. Dashboard unki ginti jodta hai.' },
      { id: 'stream-queue', title: 'Raw log ki jagah delete-on-consume queue lag gayi',
        sys: { streamKind: 'queue' }, fixed: s => s.sys.streamKind === 'log',
        verify: r => r.kind === 'stream' && r.op === 'replay' && r.from === '0' && r.ok,
        verifyText: 'stream replay --from 0 — purane events dobara mile',
        hints: [H1, 'Window ki ginti theek hai. Replay par consumed message kahan gaya?', 'sim set streamKind log, phir stream replay --from 0.'],
        solution: ['runbook', 'stream replay --from 0', 'sim status', 'sim set streamKind log', 'stream replay --from 0'],
        why: 'Queue padhte hi message hata deti hai. <b>Retained log</b> mein raw events bache rehte hain, isliye doosra consumer apne offset se hisaab dobara bana sakta hai.' },
    ],
  });

  SD.addLab('adclick', {
    type: 'chaos', id: 'chaos-builds', deck: 'builds', title: '🎲 Chaos round: AdClick ka bill',
    instructions: 'Click ki ginti, workers aur replay jaancho. Ek setting theek karo aur usi window ya replay ka jawab dobara dekho.',
  });
})();
