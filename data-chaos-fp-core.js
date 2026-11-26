/* 🎲 Chaos deck 'fp-core' — fp-core track, level fp-retry-kab (engine: chaos.js; chain plugin: perfsim-pro.js)
   Numbers lab 62 ke (docker-labs/62-second-attempt ex2-deadline, ex4-dlq-mttr; data-v2-fp-retry-4-kab.js).
   Swasth base: deadline aage · C cancel maanti hai · retries deadline dekhte hain · DLQ retention 14 din · DLQ alert ON.
   Probes (base par): chain run → C par 9 calls, bekaar kaam 8.4 s, user ke jaane ke baad 0 s ·
   chain retries → kaam ki 2, bekaar 0 · chain dlq → 0% mite.
   Har card EK badlaav (perfsim par chala ke dekha, 2026-11-26):
     cancel-off     chain run → C 180 s, user ke jaane ke baad 127.8 s · status: deadline aage, par C cancel nahi maanti
     deadline-off   chain run → wahi 180 s / 127.8 s · status: deadline hi nahi (sirf timeouts)
     retry-blind    chain retries → koshish 3 (12–15 s) aur 4 (23–26 s) user ke jaane ke baad
     dlq-short      chain dlq → 33% jaanch se pehle mite (retention 4 din, jaanch ~48 ghante)
     dlq-alert-off  chain dlq → 50% mite (retention 14 din, par jaanch ~300 ghante baad) */
(function () {
  const K = s => s.sys.chain;
  const H1 = 'runbook ke teeno probe chalao: chain run, chain retries, chain dlq. Kaunsa jawab galat hai? Phir chain status — us hisse ki setting padho.';
  const runOk = r => r.kind === 'chain' && r.op === 'run' && r.afterUser <= 1;
  const dlqOk = r => r.kind === 'chain' && r.op === 'dlq' && r.lostPct === 0;

  SD.chaos.addDeck({
    id: 'fp-core', title: 'Retries aur deadline deck',
    sys: { name: 'chaipay-orders', chain: { deadline: true, cancel: true, retryStop: true, dlqRetentionDays: 14, dlqAlert: true } },
    alert: '<b>📟 10:15 — ChaiPay orders.</b> Kal raat "resilience defaults" wali shared library ka naya version aaya — timeouts, deadline, retries aur DLQ sab ek config mein. Aaj kahin servers bina wajah busy hain, kahin failed orders gayab. <b>Ek</b> setting galat hai. Shuru: <code>runbook</code>.',
    placeholder: 'runbook   (phir: chain run)',
    runbook: `# ChaiPay orders — "naye defaults ke baad"
1. Ek request:  chain run       → user ke jaane ke baad C par bekaar kaam 0 s
2. Retries:     chain retries   → koi koshish deadline (10 s) ke baad na jaaye
3. DLQ:         chain dlq       → jaanch se pehle 0% messages mite
Settings:       chain status · chain set deadline|cancel|retry-stop|dlq-alert on|off
                chain set dlq-retention <din>
Niyam:          ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'cancel-off', title: 'Service C deadline aane par bhi kaam nahi rokti (cancel band)',
        sys: { chain: { cancel: false } },
        fixed: s => !!K(s).cancel, verify: runOk, verifyText: 'chain run — user ke jaane ke baad bekaar kaam 0 s',
        hints: [H1, 'chain run: user 10 s par gaya, par C 127.8 s aur kaam karti rahi (kul 180 s bekaar). chain status: deadline aage ja rahi hai — par C use maanti hai?', 'chain set cancel on, phir chain run.'],
        solution: ['runbook', 'chain run', 'chain status', 'chain set cancel on', 'chain run'],
        why: 'Deadline bhejna aadha kaam hai. C cancel na maane toh har retry par naya 20 s ka kaam — user ke jaane ke baad ~128 s <b>zombie kaam</b>. gRPC deadline bhejta hai; kaam rokna app ki zimmedari hai.' },
      { id: 'deadline-off', title: 'Deadline aage bhejna band (sirf timeouts)',
        sys: { chain: { deadline: false } },
        fixed: s => !!K(s).deadline, verify: runOk, verifyText: 'chain run — user ke jaane ke baad bekaar kaam 0 s',
        hints: [H1, 'chain run: C par 180 s ka kaam, 127.8 s user ke jaane ke baad. chain status: C ko pata bhi hai ki user kab tak rukega?', 'chain set deadline on, phir chain run.'],
        solution: ['runbook', 'chain run', 'chain status', 'chain set deadline on', 'chain run'],
        why: 'Timeout sirf caller ka intezaar khatam karta hai — C ko pata hi nahi. Har retry C par naya 20 s ka kaam (3 × 3 = 9 calls). <b>Deadline aage bhejo</b> ("kitna samay bacha"), tabhi C ruk sakti hai.' },
      { id: 'retry-blind', title: 'Retries deadline nahi dekhte (hamesha 4 koshish)',
        sys: { chain: { retryStop: false } },
        fixed: s => !!K(s).retryStop, verify: r => r.kind === 'chain' && r.op === 'retries' && r.wasted === 0, verifyText: 'chain retries — bekaar koshish 0',
        hints: [H1, 'chain retries: koshish 3 (12–15 s) aur 4 (23–26 s) user ke jaane ke baad. chain status: retry kab rukta hai?', 'chain set retry-stop on, phir chain retries.'],
        solution: ['runbook', 'chain retries', 'chain status', 'chain set retry-stop on', 'chain retries'],
        why: '2/4/8 s backoff aur 3 s timeout: 10 s ki deadline mein sirf 2 koshishein fit. Baaki retries bekaar kaam aur bekaar load. <b>Koshishein deadline mein fit karo</b> — samay khatam, toh ruko.' },
      { id: 'dlq-short', title: 'DLQ ki retention 14 din se 4 din ho gayi',
        sys: { chain: { dlqRetentionDays: 4 } },
        fixed: s => K(s).dlqRetentionDays > 4, verify: dlqOk, verifyText: 'chain dlq — 0% mite',
        hints: [H1, 'chain dlq: 33% failed messages jaanch se pehle hi mit gaye. Standard queue mein DLQ ka samay kab se gina jaata hai?', 'chain set dlq-retention 14, phir chain dlq.'],
        solution: ['runbook', 'chain dlq', 'chain status', 'chain set dlq-retention 14', 'chain dlq'],
        why: 'SQS standard mein message DLQ mein bhi <b>pehle bheje samay</b> se gina jaata hai. Source 4 din, DLQ bhi 4 din, jaanch ~2 din baad → 33% mit gaye. DLQ ki retention source se lambi rakho.' },
      { id: 'dlq-alert-off', title: 'DLQ ka alert hat gaya',
        sys: { chain: { dlqAlert: false } },
        fixed: s => !!K(s).dlqAlert, verify: dlqOk, verifyText: 'chain dlq — 0% mite',
        hints: [H1, 'chain dlq: retention 14 din hai, phir bhi 50% mit gaye. DLQ ko koi kab dekhta hai?', 'chain set dlq-alert on, phir chain dlq.'],
        solution: ['runbook', 'chain dlq', 'chain status', 'chain set dlq-alert on', 'chain dlq'],
        why: '"DLQ mein data kabhi nahi khota" — galat. 14 din ki retention bhi kaafi nahi agar koi <b>dekhe hi nahi</b>: ~300 ghante baad jaanch par 50% mit chuke. DLQ ki depth aur umar par alert lagao.' },
    ],
  });

  SD.addLab('fp-retry-kab', {
    type: 'chaos', id: 'chaos-fp-core', deck: 'fp-core', title: '🎲 Chaos round: naye resilience defaults',
    instructions: 'Teen probe, ek galat setting. Dhoondho, EK badlaav se theek karo, pakka karo — phir batao kya toota tha.',
  });
})();
