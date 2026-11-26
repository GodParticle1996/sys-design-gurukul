/* 🎲 Chaos deck 'feed' — rollout
   Base: file generator aur validation chalu, staged rollout, bahar se probes; canary 5%, bake 15 min, rollback automatic.
   fleet run 10 → dono files aayin, badi file reject, sab regions chalte rahe.
   canary run → 6.7 min mein farak pakda, 5% traffic tak asar, 1 min mein rollback.
   validate-off       badi file Mumbai tak pahunchi, ek region mein proxy giri
   generator-paused   koi nayi file nahi aayi
   canary-wide        kharab version 20% traffic par
   bake-short         1,20,000 samples par andha PASS, rollout 100% par
   rollback-manual    pakadne ke baad bhi rollback mein 20 min, lagbhag 320 extra failed requests */
(function () {
  const H1 = 'Edge file aur version rollout ki jaanch alag chalao. File pahunchi aur jaanchi gayi? Naya version kitne users tak gaya aur kab hata?';
  const fleetOk = r => r.kind === 'fleet' && r.op === 'run' && r.minutes === 10 &&
    r.pushes >= 2 && r.rejected > 0 && r.maxDown === 0;
  const canaryOk = r => r.kind === 'canary' && r.op === 'run' && r.detected &&
    r.blastPct <= 5 && r.detectMin <= 15 && r.mitigationMin <= 1;

  SD.chaos.addDeck({
    id: 'feed', title: 'EdgePost ki release',
    sys: { name: 'edgepost', fleet: { cur: 60, lkg: 60, down: 0, slot: 0, generator: true, validate: true, staged: true, probes: 'external', log: [] } },
    alert: '<b>📟 10:20 — EdgePost.</b> Kal raat edge team ne file bhejne aur version release karne ki settings ek jagah shift ki. Subah rehearsal mein ek check laal hai. Release ki dono reports dekho. Shuru karo <code>runbook</code> se.',
    placeholder: 'runbook',
    runbook: `# EdgePost release rehearsal
1. fleet run 10 → nayi files aayen, badi file reject ho, koi region na gire.
2. canary run → error ka farak 15 min ke andar pakde, asar 5% traffic tak rahe, rollback ek minute mein ho.
Settings: fleet status · canary status
Badlo: fleet validate on · fleet generator resume · canary set traffic <pct> · canary set bake <min> · canary rollback auto
Niyam: ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'validate-off', title: 'Nayi file ki jaanch band hai',
        sys: { fleet: { validate: false } }, fixed: s => s.sys.fleet.validate,
        verify: r => fleetOk(r),
        verifyText: 'fleet run 10 — file proxy se pehle ruki',
        hints: [H1, 'File aayi aur Mumbai ki proxy gir gayi. Kya badi file install hone se pehle jaanchi gayi?', 'fleet validate on, phir fleet run 10.'],
        solution: ['runbook', 'fleet run 10', 'fleet status', 'fleet validate on', 'fleet run 10'],
        why: 'Badi file proxy tak pahunchi aur pehla region gira. <b>File validation</b> kharab file rok deti hai aur proxy purani file par chalti hai.' },
      { id: 'generator-paused', title: 'File generator pause par reh gaya',
        sys: { fleet: { generator: false } }, fixed: s => s.sys.fleet.generator,
        verify: r => fleetOk(r),
        verifyText: 'fleet run 10 — nayi files phir pahunchin',
        hints: [H1, 'Regions chal rahe hain, par kya ek bhi nayi file bani? Generator ka haal dekho.', 'fleet generator resume, phir fleet run 10.'],
        solution: ['runbook', 'fleet run 10', 'fleet status', 'fleet generator resume', 'fleet run 10'],
        why: 'Proxy purani file chala rahi thi kyunki nayi file bani hi nahi. <b>Generator resume</b> karne par nayi files phir aati hain aur validation unhe jaanchti hai.' },
      { id: 'canary-wide', title: 'Pehli release mein bahut zyada traffic gaya',
        sys: { canary: { trafficPct: 20 } }, fixed: s => s.sys.canary.trafficPct >= 1 && s.sys.canary.trafficPct <= 5,
        verify: r => canaryOk(r),
        verifyText: 'canary run — asar budget ke andar',
        hints: [H1, 'Gate ne galti pakdi. Tab tak kitne traffic par naya version lag chuka tha?', 'canary set traffic 5, phir canary run.'],
        solution: ['runbook', 'canary run', 'canary status', 'canary set traffic 5', 'canary run'],
        why: 'Gate sahi chala par pehla group bada tha. <b>Canary traffic</b> ghataane se kharabi kam users tak rehti hai. Dobara dekhna ki samples bhi poore mile.' },
      { id: 'bake-short', title: 'Gate ne bahut jaldi rollout khol diya',
        sys: { canary: { bakeMin: 2 } }, fixed: s => SD.canaryModel(s.sys.canary).detected,
        verify: r => canaryOk(r),
        verifyText: 'canary run — samples se farak pakda',
        hints: [H1, 'Gate khulne tak kitne samples mile? Chahiye kitne the?', 'canary set bake 15, phir canary run.'],
        solution: ['runbook', 'canary run', 'canary status', 'canary set bake 15', 'canary run'],
        why: 'Samples poore hone se pehle gate ne PASS diya aur kharab version sabko mila. <b>Bake time</b> badhaane se gate ko farak pakadne ka waqt milta hai.' },
      { id: 'rollback-manual', title: 'Rollback pager par insaan ka intezaar karta hai',
        sys: { canary: { autoRollback: false } }, fixed: s => s.sys.canary.autoRollback,
        verify: r => canaryOk(r),
        verifyText: 'canary run — pakadne ke baad jaldi rollback',
        hints: [H1, 'Gate ne farak waqt par pakda. Uske baad version hataane mein kitna waqt gaya?', 'canary rollback auto, phir canary run.'],
        solution: ['runbook', 'canary run', 'canary status', 'canary rollback auto', 'canary run'],
        why: 'Alert aa gaya par kharab version insaan ke aane tak chalta raha. <b>Automatic rollback</b> se gate turant version hataana shuru karta hai.' },
    ],
  });

  SD.addLab('rollout', {
    type: 'chaos', id: 'chaos-feed', deck: 'feed', title: '🎲 Chaos round: EdgePost ki release',
    instructions: 'File aur release ka rehearsal chalao. Galti pakdo, ek setting badlo aur wahi rehearsal dobara chalao.',
  });
})();
