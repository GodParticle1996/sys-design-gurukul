/* 🎲 Chaos deck 'stories' — notion-scale
   Base: listing pehle se taiyaar, cache misses ek saath judte hain, MegaMart quota 20%, size check aur staged rollout chalu, 150 vnodes.
   Base probes: listing aur viral load capacity mein; tenant load → dashboards 180 ms; fleet run 10 → galat rule size check se guzra, Mumbai par rollout ruka;
   ring show → sabse bhaari node 1.01x ausat.
   listing-live      listing load saturated, service time 4.15 s
   misses-apart      viral load saturated, listing wala pool sambhalta hai
   quota-lost        report doosre merchants ko rokti hai, dashboards 10 s
   rollout-global    wahi rule sabhi 6 regions mein laga, 5 minute tak 5xx (st-cf-fleet, data-st-02-cloudflare.js:482)
   ring-skew         sabse bhaari node par ausat ki 1.89 guna keys */
(function () {
  const H1 = 'Listing aur viral load chalao. Phir report, rollout aur ring dekho. Kis probe mein kaam atka ya ek jagah jama hua?';

  SD.chaos.addDeck({
    id: 'stories', title: 'ChaiChat ki release',
    sys: {
      name: 'chaichat',
      api: { precomputed: true, serviceMsOverride: 2, cache: { ttlSec: 1, jitterPct: 0, hitRate: 1, singleFlight: true } },
      tenancy: { quota: { mega: 20 } },
      fleet: { cur: 60, lkg: 60, down: 0, slot: 1, validate: true, staged: true, bug: 'rule', generator: true, probes: 'external' },
      ring: { nodes: ['node-1', 'node-2', 'node-3', 'node-4'], vnodes: 150, keys: 10000 },
    },
    alert: '<b>📟 09:15 — ChaiChat.</b> Kal raat release ki settings ek nayi file mein gayin. Subah support ka kehna hai ki kuch users ko intezaar karna pad raha hai. Release ki kaunsi setting badli? Shuru karo <code>runbook</code> se.',
    placeholder: 'runbook',
    runbook: `# ChaiChat release ki jaanch
1. Listing: load --rps 500 --duration 1 → backend capacity ke andar.
2. Viral key: load --pattern flash --rps 25000 --duration 1 → expiry par bhi backend capacity ke andar.
3. Merchant report: tenant load → report poori ho aur baaki dashboards ka p99 ek second se kam ho.
4. Test rollout: fleet run 10 → file ka size theek hai. Galat rule se Mumbai ki proxy gire toh rollout wahin ruke. Baaki regions chalte rahein aur aakhir mein Mumbai bhi theek ho.
5. Key bantwara: ring show → sabse bhaari node par ausat ka 1.1 guna ya kam.
Settings: sim status · tenant status · fleet status · ring status
Badlo: sim precompute · cache coalesce --on · tenant quota mega --cpu <pct> · fleet staged on · ring set vnodes <N>
Niyam: ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'listing-live', title: 'Listing har read par phir banti hai',
        sys: { api: { precomputed: false } }, fixed: s => s.sys.api.precomputed,
        verify: r => r.kind === 'load' && r.pattern === 'shallow' && r.rps === 500 && r.duration === 1 && !r.saturated,
        verifyText: 'load --rps 500 --duration 1 — listing capacity ke andar',
        hints: [H1, 'Aam listing par pool bhar gaya. List padhte waqt banti hai ya pehle se taiyaar hai?', 'sim precompute, phir load --rps 500 --duration 1.'],
        solution: ['runbook', 'load --rps 500 --duration 1', 'sim status', 'sim precompute', 'load --rps 500 --duration 1'],
        why: 'Reddit ka sabak. Har read par list banane se pool bhar gaya. <b>List pehle taiyaar rakho</b> taaki read par bana hua jawab mile.' },
      { id: 'misses-apart', title: 'Viral key ke misses alag-alag DB jaate hain',
        sys: { api: { cache: { singleFlight: false } } }, fixed: s => s.sys.api.cache?.singleFlight,
        verify: r => r.kind === 'load' && r.pattern === 'flash' && r.rps === 25000 && r.duration === 1 && !r.saturated && r.dbQueries <= 1,
        verifyText: 'load --pattern flash --rps 25000 --duration 1 — viral load capacity ke andar',
        hints: [H1, 'Listing chalti hai, viral key expire hote hi pool bharta hai. Kya sab readers ek jawab ka intezaar karte hain?', 'cache coalesce --on, phir load --pattern flash --rps 25000 --duration 1.'],
        solution: ['runbook', 'load --pattern flash --rps 25000 --duration 1', 'sim status', 'cache coalesce --on', 'load --pattern flash --rps 25000 --duration 1'],
        why: 'Discord ka sabak. Ek key ke sab readers DB par toot pade. <b>Request coalescing</b> mein pehla reader jawab laata hai aur baaki usi jawab ko lete hain.' },
      { id: 'quota-lost', title: 'Bade merchant ki CPU hadd hat gayi',
        sys: { tenancy: { quota: { mega: 0 } } }, fixed: s => s.sys.tenancy.quota.mega >= 10 && s.sys.tenancy.quota.mega <= 40,
        verify: r => r.kind === 'tenant-load' && r.othersP99 < 1000 && r.dtReportMin > 0,
        verifyText: 'tenant load — dashboard ek second ke andar',
        hints: [H1, 'Report jaldi poori hui par baaki dashboards atke hain. MegaMart ki quota padho.', 'tenant quota mega --cpu 20, phir tenant load.'],
        solution: ['runbook', 'tenant load', 'tenant status', 'tenant quota mega --cpu 20', 'tenant load'],
        why: 'Jira ka sabak. Badi report ne shared DB ka CPU le liya. <b>CPU quota</b> se report chalti rehti hai aur chhote merchants ke dashboards ko bhi waqt milta hai.' },
      { id: 'rollout-global', title: 'Galat rule seedha sab regions par lag gaya',
        sys: { fleet: { staged: false } }, fixed: s => s.sys.fleet.staged,
        verify: r => r.kind === 'fleet' && r.op === 'run' && r.minutes === 10 && r.pushes > 0 && r.maxDown <= 1 && r.down === 0,
        verifyText: 'fleet run 10 — rollout Mumbai par ruka, aakhir mein sab regions theek',
        hints: [H1, 'Size check PASS hua. Galat rule lagte hi kitne regions gire? Fleet status mein dekho ki nayi file pehle kahan jaati hai.', 'fleet staged on, phir fleet run 10.'],
        solution: ['runbook', 'fleet run 10', 'fleet status', 'fleet staged on', 'fleet run 10'],
        why: 'Size check ne file paas ki. Andar ka rule galat tha, aur file sab jagah ek saath lagne se saare regions gire. <b>Staged rollout</b> pehle Mumbai mein file aazmaata hai. Wahan proxy gire toh baaki regions purani file chalaate rehte hain.' },
      { id: 'ring-skew', title: 'Har node ring par ek hi jagah baith gaya',
        sys: { ring: { vnodes: 1 } }, fixed: s => s.sys.ring.vnodes >= 100,
        verify: r => r.kind === 'ring' && r.op === 'show' && r.skew <= 1.1,
        verifyText: 'ring show — keys ka hissa ausat ke paas',
        hints: [H1, 'Ring par har node ki kitni jagah hai? Sabse bhaari node ka hissa dekho.', 'ring set vnodes 150, phir ring show.'],
        solution: ['runbook', 'ring show', 'ring status', 'ring set vnodes 150', 'ring show'],
        why: 'Snowflake ke cache mein consistent hashing file ka maalik chunti hai. ChaiChat ki practice ring mein ek node par zyada keys aa gayin. <b>Virtual nodes</b> har machine ko kai chhote hisse dete hain.' },
    ],
  });

  SD.addLab('notion-scale', {
    type: 'chaos', id: 'chaos-stories', deck: 'stories', title: '🎲 Chaos round: ChaiChat ki release',
    instructions: 'Listing, viral key, report, rollout aur ring jaancho. Ek setting badlo aur wahi probe chala kar dekho ki shikayat door hui.',
  });
})();
