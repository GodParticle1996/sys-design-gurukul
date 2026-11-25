/* 📟 On-call shift 'tixnow' — builds track, level ticketmaster (engine: oncall.js)
   Level ka terminal booking modes shuru se sikhata hai; yeh shift sale ki raat ka LIVE hissa:
     1 SaleOpenCrush        400 rps × 2.5 refresh = 1000 offered, capacity ~500 → admission (waiting room) 250–480
     2 HoldsExpireAtPayment app ka default hold 5s, payment 2–10 min → confirm reject → sim set booking.holdTtl 600 → confirm ok
     3 DoubleSoldAfterHotfix (onFire: kisi ne "speed ke liye" booking.mode none kiya) → 2 log ek seat → locking wapas → sold 1
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const B = s => s.sys.booking || {};
  const INC = [
    { id: 'SaleOpenCrush', sev: '🔴 SEV1', text: 'Concert sale khuli! 400 rps aur log refresh daba rahe hain. Seat page p99 har second badh raha.',
      onFire: s => { s.sys.retryAmp = 2.5; },
      fixed: s => { const a = s.sys.api.admission; return !!a && a.maxRps >= 250 && a.maxRps <= 480; },
      verify: r => r.kind === 'load' && r.rps >= 400 && !r.saturated,
      verifyText: 'sale ka load dobara (load --pattern detail --rps 400) — saturated nahi',
      hints: [
        'load --pattern detail --rps 400 chalao. CAPACITY panel: offered load kitna, capacity kitni, ρ kitna?',
        '400 × 2.5 = 1000 offered, capacity ~500. Seats seemit hain — sabko ek saath andar lene se kisi ko seat nahi milegi. Waiting room: utne hi andar jitne sambhal sako.',
        'sim add admission --max-rps 400 --queue 8 (capacity ~500 se neeche, 250 se upar), phir load --pattern detail --rps 400 dobara.',
      ] },
    { id: 'HoldsExpireAtPayment', sev: '🟠 SEV2', text: 'Support: "payment page tak pahunche, wapas aaye toh seat chali gayi!" Payment mein 2–10 minute lagte hain.',
      fixed: s => +B(s).holdTtl >= 300,
      verify: r => r.kind === 'book' && r.op === 'confirm' && r.ok,
      verifyText: 'naya hold lo, thoda ruko (sim advance), phir confirm — safal hona chahiye',
      hints: [
        'book status — app ka default hold kitne second ka hai? Phir khud dekho: book hold A2 --owner riya, sim advance 6, book confirm A2 --owner riya.',
        'Hold 5 second ka hai, payment minutes ka. Hold itna lamba ho ki payment ho jaaye — par itna nahi ki chhodi hui seat ghanton atki rahe.',
        'sim set booking.holdTtl 600, phir book hold A3 --owner riya, sim advance 6, book confirm A3 --owner riya.',
      ] },
    { id: 'DoubleSoldAfterHotfix', sev: '🔴 SEV1', text: 'Ek dev ne "checkout tez karne ke liye" hotfix mein locking band kar di. Ab ek hi seat ke do-do ticket bik rahe hain!',
      onFire: s => { B(s).mode = 'none'; },
      fixed: s => ['optimistic', 'pessimistic', 'reservation'].includes(B(s).mode),
      verify: r => r.kind === 'book' && r.op === 'seat' && r.concurrent >= 2 && !r.doubleBooked && r.sold === 1,
      verifyText: 'do log ek saath ek nayi seat lein (book seat … --concurrent 2) — sirf ek bike',
      hints: [
        'book status, phir book seat B1 --concurrent 2 — kitne bike?',
        'Dono ne "seat khaali hai?" ek saath poochha aur dono ne khareed li. Check aur write ek saath (atomic) hone chahiye — wahi locking jo hotfix ne hata di.',
        'sim set booking.mode reservation (holds wapas), phir book seat B2 --concurrent 2 — sirf ek bikna chahiye.',
      ] },
  ];

  SD.oncall.add({
    id: 'tixnow', start: 20 * 60, INC,
    build: ({ risky }) => ({
      sys: { name: 'tixnow-api', deps: { ledger: { p50: 60, p99: 100, errorRate: 0 } }, booking: { mode: 'reservation', holdTtl: 5, seats: {}, holds: {} } },
      goal: '<b>TixNow, 20:00.</b> Concert ki sale abhi khuli — 50,000 log, 8,000 seats. Pager tumhare paas hai. Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: load --pattern detail --rps 400)',
      runbook: `# TixNow on-call runbook — sale ki raat
Traffic:      load --pattern detail --rps 400   (seat page; refresh ×2.5 gina hua)
Waiting room: sim add admission --max-rps N --queue S
Booking:      book status · book seat <S> --concurrent 2 · book hold <S> --owner <naam> · book confirm <S> --owner <naam>
Settings:     sim set booking.mode none|optimistic|pessimistic|reservation · sim set booking.holdTtl <seconds>
Ghadi:        perfsim ki apni ghadi (seconds): sim advance <N>
Mat chhuna:   booking.mode none · pool 50 se upar (DB max 60) · sim reset · sim inject`,
      responses: [
        risky(/^sim set booking\.mode\s+none\b/i, 'Locking band karna mana — ek seat ke do ticket bikenge. Tez checkout ki keemat double refund hai.'),
        risky(/^sim scale pool\s+(5[1-9]|[6-9]\d|\d{3,})\b/i, 'Pool 50 se upar mana — DB max_connections 60. Bheed ko waiting room mein rakho, DB mein nahi.'),
      ],
      successText: `<b>Raat ki kahani:</b> sale khulte hi 1000 offered vs ~500 capacity — waiting room ne andar utne hi liye jitne sambhal sakte the (1) →
        andar aaye log payment par seat kho rahe the, hold 5 second ka tha (2) → 10 minute ka hold →
        tabhi ek "speed" hotfix ne locking hata di aur ek seat do baar biki (3) → locking wapas.<br>
        <b>Seekh:</b> ticketing mein teen cheezein saath chahiye — <b>bheed ka darwaza</b> (admission), <b>seat ka hold</b> (payment jitna lamba), aur <b>atomic claim</b>. Ek bhi hata toh ya site girti hai ya seat do baar bikti hai.<br>
        <b>Postmortem action items:</b> booking.mode ko hotfix se badalna band (config review) · hold TTL payment ke p99 se tay · sale se pehle waiting room on.`,
      solution: [
        'runbook', 'load --pattern detail --rps 400', 'sim add admission --max-rps 400 --queue 8', 'load --pattern detail --rps 400',
        'book status', 'book hold A2 --owner riya', 'sim advance 6', 'book confirm A2 --owner riya', 'sim set booking.holdTtl 600', 'book hold A3 --owner riya', 'sim advance 6', 'book confirm A3 --owner riya',
        'book seat B1 --concurrent 2', 'sim set booking.mode reservation', 'book seat B2 --concurrent 2',
      ],
    }),
  });

  SD.addLab('ticketmaster', {
    type: 'oncall', id: 'oncall-builds', shift: 'tixnow', title: '📟 On-call shift: sale ki raat',
    instructions: 'Concert sale live hai. Har command = 1 minute. Theek karo, phir pakka karo — khatarnaak commands gine jaate hain.',
  });
})();
