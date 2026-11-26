/* 🎲 Chaos deck 'sdd-resil' — ch-kab
   Base: bimaar instance hatao, latency gino, 80% se neeche experiment roko, shuru se pehle staging jaancho.
   Experiment ke numbers ch-kab lab se: data-v2-chaos-4-kab.js:88–91,247–249.
   Base probes: zombie → 4 calls bimaar instance tak; slow → 36 dheemi, TOOTA; search → 0.5 s par ABORT, 17 fail;
   staging → pehle se bimaar, experiment shuru nahi hota.
   eject-off       retries user ko bachaati hain, phir bhi 133 calls bimaar instance par
   latency-blind   p99 515 ms par bhi report kehti hai sab theek
   abort-off       search par poore 6 s mein 200 fail; status mein stop rule gayab
   abort-low       wahi 200 fail; status mein hadd 50%, jabki chot mein 68% safal
   baseline-off    staging pehle se bimaar, phir bhi nayi chot shuru */
(function () {
  const H1 = 'Chaaron rehearsal dekho. Bimaar instance ko traffic, dheeme jawab, rokne ka waqt aur pehle se bimaar staging alag sanket dete hain.';
  const run = (r, scenario) => r.kind === 'experiment' && r.op === 'run' && r.scenario === scenario;
  const searchOk = r => run(r, 'search') && r.aborted && r.faultSec <= 0.5 && r.fails <= 17;

  SD.chaos.addDeck({
    id: 'sdd-resil', title: 'Game day ki report',
    sys: { name: 'chaipay-game-day' },
    alert: '<b>📟 11:10 — ChaiPay game day.</b> Kal raat payments aur search ke rehearsal ki settings ek naye template mein gayin. Aaj reviewer ne report rok di hai. Dekho experiment kaunsa signal chhod raha hai. Shuru karo <code>runbook</code> se.',
    placeholder: 'runbook',
    runbook: `# Game day: experiment khud sahi chal raha hai?
1. experiment run zombie → bimaar payments instance tak zyada se zyada 20 requests jaayen.
2. experiment run slow → dheeme jawab gin kar report TOOTA bole, bhale sabko jawab mila ho.
3. experiment run search → 0.5 s par ABORT, zyada se zyada 17 requests fail.
4. experiment run staging → pehle hi kam requests safal hain; nayi chot shuru na ho.
Settings: experiment status → payments routing, latency, abort ki hadd aur baseline check padho.
Badlo: experiment set eject on · experiment set latency on · experiment set abort <pct> · experiment set baseline on
Niyam: ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'eject-off', title: 'Asli failures dekhkar bimaar instance ko hataana band hai',
        sys: { experiment: { eject: false } }, fixed: s => s.sys.experiment.eject,
        verify: r => run(r, 'zombie') && r.toBad <= 20 && r.fails === 0,
        verifyText: 'experiment run zombie — bimaar instance ko kam traffic',
        hints: [H1, 'Users ko jawab mil raha hai. Phir bhi kitni requests pehle bimaar instance par gayin?', 'experiment set eject on, phir experiment run zombie.'],
        solution: ['runbook', 'experiment run zombie', 'experiment status', 'experiment set eject on', 'experiment run zombie'],
        why: 'Retry ne user ko jawab diya, par traffic bimaar instance ko milta raha. <b>Passive ejection</b> asli calls ki failures dekhkar use rotation se hataati hai.' },
      { id: 'latency-blind', title: 'Report ne jawab ka waqt ginna chhod diya',
        sys: { experiment: { latency: false } }, fixed: s => s.sys.experiment.latency,
        verify: r => run(r, 'slow') && r.slowReported && r.slow > 0 && r.verdict === 'toota',
        verifyText: 'experiment run slow — report mein dheeme jawab gine',
        hints: [H1, 'Payments ke p99 ko report ke faisle se milao. Success mein jawab ka waqt gina gaya?', 'experiment set latency on, phir experiment run slow.'],
        solution: ['runbook', 'experiment run slow', 'experiment status', 'experiment set latency on', 'experiment run slow'],
        why: 'Saare jawab aaye, par kuch users ko der lagi. Sirf success ginne se report hari ho gayi. <b>Latency ki shart</b> dheeme jawabon ko bhi faisle mein laati hai.' },
      { id: 'abort-off', title: 'Search ka stop rule hat gaya',
        sys: { experiment: { abortPct: 0 } }, fixed: s => s.sys.experiment.abortPct > 68,
        verify: r => searchOk(r),
        verifyText: 'experiment run search — pehli kharab window mein experiment ruka',
        hints: [H1, 'Search ka run poora chala. Status mein rokne ki koi hadd likhi bhi hai?', 'experiment set abort 80, phir experiment run search.'],
        solution: ['runbook', 'experiment run search', 'experiment status', 'experiment set abort 80', 'experiment run search'],
        why: 'Search fail hoti rahi aur chot ka waqt poora ho gaya. <b>Stop rule</b> lagaane se safal requests ka hissa girte hi experiment rukta hai.' },
      { id: 'abort-low', title: 'Stop rule ki hadd bahut neeche chali gayi',
        sys: { experiment: { abortPct: 50 } }, fixed: s => s.sys.experiment.abortPct > 68,
        verify: r => searchOk(r),
        verifyText: 'experiment run search — pehli kharab window mein experiment ruka',
        hints: [H1, 'Search poora chala. Status mein hadd lagi hai. Chot ke dauraan safal hissa us hadd se neeche gaya tha?', 'experiment set abort 80, phir experiment run search.'],
        solution: ['runbook', 'experiment run search', 'experiment status', 'experiment set abort 80', 'experiment run search'],
        why: 'Rule laga tha, par system bimaar hone par bhi safal requests uski hadd se upar thin. <b>Abort ki hadd</b> badhaane se wahi girawat agli jaanch par experiment rok deti hai.' },
      { id: 'baseline-off', title: 'Shuru karne se pehle staging jaanchna band hai',
        sys: { experiment: { baseline: false } }, fixed: s => s.sys.experiment.baseline,
        verify: r => run(r, 'staging') && !r.started,
        verifyText: 'experiment run staging — bimaar staging par nayi chot nahi lagi',
        hints: [H1, 'Pehli chot se pehle hi staging ka haal padho. Us waqt experiment ko shuru hona chahiye tha?', 'experiment set baseline on, phir experiment run staging.'],
        solution: ['runbook', 'experiment run staging', 'experiment status', 'experiment set baseline on', 'experiment run staging'],
        why: 'Staging pehle hi bimaar thi. Nayi chot dene se pehli kharabi aur experiment ka asar mil gaye. <b>Baseline check</b> aise run ko shuru hone se pehle rokta hai.' },
    ],
  });

  SD.addLab('ch-kab', {
    type: 'chaos', id: 'chaos-sdd-resil', deck: 'sdd-resil', title: '🎲 Chaos round: Game day ki report',
    instructions: 'Har rehearsal mein guard ka asar dekho. Ek setting badlo aur wahi experiment dobara chala kar report jaancho.',
  });
})();
