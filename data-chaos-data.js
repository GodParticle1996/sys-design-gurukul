/* 🎲 Chaos deck 'data' — boss-data (model deck; engine: chaos.js)
   Swasth base: merchant dashboard GET p99 ~146ms (50 rows, ix_user_created) · order page load 300 rps → ρ 0.60.
   Har card EK badlaav — sab perfsim par chala ke dekhe (2026-11-25):
     idx-filter  index sirf user_id → Index Scan + Sort, 24 lakh rows, p99 1.72s
     idx-dropped dashboard index gayab → Seq Scan + Sort, 2.4 crore rows, p99 17s
     count-on    rows 50 par "+ COUNT(*) 272 ms" → p99 514ms
     pool-shrunk pool 5 → effective pool 5, ρ 6.0 SATURATED
     long-tx     45 connection atke → "effective pool 5 (50 mein se 45 atke hue!)", ρ 6.0
     cpu-debug   rows 50, COUNT nahi, trace: "app handler (CPU) 300 ms (70%)" → p99 544ms */
(function () {
  const IX_PK = { name: 'transactions_pkey', cols: ['id'], unique: true };
  const IX_GOOD = { name: 'ix_user_created', cols: ['user_id', 'created_at', 'id'] };
  const hasGood = s => ((s.sys.db.tables.transactions || {}).indexes || []).some(ix => ix.cols[0] === 'user_id' && ix.cols[1] === 'created_at');
  const dashOk = r => r.kind === 'http' && /user_id=7\b/.test(r.path || '') && r.status === 200 && r.rowsExamined === 50 && r.p99 < 200;
  const peakOk = r => r.kind === 'load' && r.pattern === 'detail' && r.rps >= 300 && !r.saturated;
  const H1 = 'Pehle dono probe chalao: GET /transactions?user_id=7 aur load --pattern detail --rps 300. Kaunsa raasta toota hai? Usi par dhyaan do.';

  SD.chaos.addDeck({
    id: 'data', title: 'Data deck',
    sys: {
      name: 'merchant-api',
      deps: { ledger: { p50: 60, p99: 100, errorRate: 0 } },
      api: { countTotal: false },
      db: { tables: { transactions: { rows: 24286450, rowBytes: 220, pk: 'id', cols: ['id', 'user_id', 'amount', 'status', 'merchant', 'created_at'], indexes: [IX_PK, IX_GOOD] } } },
    },
    alert: '<b>📟 01:40 — merchants ki shikayat:</b> kuch dheema hai. Kal raat ek deploy hua tha (config cleanup + naya report job). Sirf <b>EK</b> cheez galat badli hai — kaunsi, tumhe dhoondhni hai. Shuru: <code>runbook</code>.',
    placeholder: 'runbook   (phir: GET /transactions?user_id=7)',
    runbook: `# Merchant API runbook — "kal raat deploy ke baad dheema"
Do probe (pehle yahi chalao, phir socho):
  GET /transactions?user_id=7          merchant dashboard  (SLO: p99 < 200ms)
  load --pattern detail --rps 300      order page ka peak  (saturated nahi hona chahiye)
Waqt kahan gaya:  EXPLAIN SELECT … · trace GET /transactions?user_id=7 · metrics
Config dekho:     sim status (saari settings) · show indexes on transactions
Badlo:            sim set <path> <value> · sim scale pool N · CREATE INDEX …
Niyam:            ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'idx-filter', title: 'Index sirf user_id par bacha — sort ke liye created_at nahi',
        sys: { db: { tables: { transactions: { indexes: [IX_PK, { name: 'ix_user', cols: ['user_id'] }] } } } },
        fixed: hasGood, verify: dashOk, verifyText: 'dashboard ka GET dobara (50 rows, p99 < 200ms)',
        hints: [H1, '"Index Scan + Sort" aur ~24 lakh rows padhi, chahiye sirf 50. show indexes on transactions — index user_id par hai, par created_at ka kram nahi deta.',
          'CREATE INDEX ix_user_created ON transactions(user_id, created_at, id), phir GET /transactions?user_id=7 dobara.'],
        solution: ['runbook', 'GET /transactions?user_id=7', 'show indexes on transactions', 'CREATE INDEX ix_user_created ON transactions(user_id, created_at, id)', 'GET /transactions?user_id=7'],
        why: 'Cleanup ne composite index ko "sirf user_id" wale index se badal diya. Filter toh index se hua, par <b>sort</b> ke liye saare ~24 lakh matches padh kar sort karne pade. Composite index <code>(user_id, created_at, id)</code> filter + sort dono deta hai → 50 rows.' },
      { id: 'idx-dropped', title: 'Dashboard ka index hi cleanup mein gira diya gaya',
        sys: { db: { tables: { transactions: { indexes: [IX_PK] } } } },
        fixed: hasGood, verify: dashOk, verifyText: 'dashboard ka GET dobara (50 rows, p99 < 200ms)',
        hints: [H1, '"Seq Scan + Sort" — poori 2.4 crore rows ki table padhi gayi. show indexes on transactions — sirf primary key bachi hai.',
          'CREATE INDEX ix_user_created ON transactions(user_id, created_at, id), phir GET /transactions?user_id=7 dobara.'],
        solution: ['runbook', 'GET /transactions?user_id=7', 'show indexes on transactions', 'CREATE INDEX ix_user_created ON transactions(user_id, created_at, id)', 'GET /transactions?user_id=7'],
        why: '"Unused lagta hai" soch kar index gira diya gaya — par dashboard usi par chalta tha. Ab <b>Seq Scan</b>: har request 2.4 crore rows. Index girane se pehle query logs dekho; wapas lao toh <code>(user_id, created_at, id)</code>.' },
      { id: 'count-on', title: 'List har request par poori ginti (COUNT) kar rahi hai',
        sys: { api: { countTotal: true } },
        fixed: s => !s.sys.api.countTotal, verify: dashOk, verifyText: 'dashboard ka GET dobara (p99 < 200ms)',
        hints: [H1, 'Rows sirf 50 aur plan theek — phir bhi 381ms. QUERY PLAN ki har line padho: "+ COUNT(*)" kis cheez ki keemat hai?',
          'sim set api.countTotal false, phir GET /transactions?user_id=7 dobara.'],
        solution: ['runbook', 'GET /transactions?user_id=7', 'sim set api.countTotal false', 'GET /transactions?user_id=7'],
        why: 'Plan aur index sahi the; waqt <b>COUNT(*)</b> mein ja raha tha — har page par "total kitne?" ginna. Index se 50 rows sasti hain, par ginti poore set ki hoti hai. Total hata do (ya cursor + "aur hai?") aur list wapas tez.' },
      { id: 'pool-shrunk', title: 'DB pool 50 se ghata kar 5 kar diya gaya',
        sys: { pool: { size: 5 } },
        fixed: s => s.sys.pool.size >= 40, verify: peakOk, verifyText: 'order page ka load dobara (saturated nahi)',
        hints: [H1, 'Load SATURATED, ρ 6.0, "effective pool 5". Dashboard ka GET theek hai — toh query nahi, connections kam hain. sim status mein db pool kitna hai?',
          'sim scale pool 50, phir load --pattern detail --rps 300 dobara.'],
        solution: ['runbook', 'load --pattern detail --rps 300', 'sim status', 'sim scale pool 50', 'load --pattern detail --rps 300'],
        why: 'Cleanup mein pool 50 → 5. Har request ~100ms connection pakadti hai, toh capacity = 5 × (1000 ÷ 100) = 50 rps, aur aaye 300. <b>Little\'s Law</b>: pool hi capacity hai. CPU kam dikhega — kaam ko connection hi nahi mil raha.' },
      { id: 'long-tx', title: 'Naye report job ki khuli transaction ne 45 connection pakde',
        sys: { db: { longTxHolding: 45 } },
        fixed: s => !s.sys.db.longTxHolding, verify: peakOk, verifyText: 'order page ka load dobara (saturated nahi)',
        hints: [H1, '"effective pool 5 (50 mein se 45 atke hue!)" — pool ka size 50 hi hai, par 45 connection koi aur pakde baitha hai. sim status kya kehta hai?',
          'Atki transaction khatam karo (asli mein pg_terminate_backend): sim set db.longTxHolding 0, phir load --pattern detail --rps 300 dobara.'],
        solution: ['runbook', 'load --pattern detail --rps 300', 'sim status', 'sim set db.longTxHolding 0', 'load --pattern detail --rps 300'],
        why: 'Pool 50 ka tha, par naya report job transaction khuli chhod deta hai — 45 connection usi mein atke. <b>Health check green, CPU kam</b>, phir bhi sab intezaar mein. Pool size badhane se nahi, atki transaction khatam karne (aur job theek karne) se.' },
      { id: 'cpu-debug', title: 'Har request par 300ms CPU — debug logging on reh gayi',
        sys: { app: { cpuMsPerReq: 300 } },
        fixed: s => s.sys.app.cpuMsPerReq <= 20, verify: dashOk, verifyText: 'dashboard ka GET dobara (p99 < 200ms)',
        hints: [H1, 'Rows 50, COUNT nahi, plan theek — phir bhi 403ms. Waqt DB mein nahi gaya. trace GET /transactions?user_id=7 — sabse mehenga span kaunsa?',
          'trace mein "app handler (CPU) 300 ms". sim status mein app cpu/request dekho, phir sim set app.cpuMsPerReq 5 aur GET dobara.'],
        solution: ['runbook', 'GET /transactions?user_id=7', 'trace GET /transactions?user_id=7', 'sim status', 'sim set app.cpuMsPerReq 5', 'GET /transactions?user_id=7'],
        why: 'DB ke saare numbers theek the — waqt <b>app ke andar</b> gaya (trace: CPU 70%). Debug logging har request par bhaari kaam karti hai. Sabak: p99 dekh kar index mat dhoondho; <b>trace</b> batata hai waqt kahan gaya.' },
    ],
  });

  SD.addLab('boss-data', {
    type: 'chaos', id: 'chaos-data', deck: 'data', title: '🎲 Chaos round: kal raat ki deploy',
    instructions: 'Ek chhupi galti. Probe chalao, lakshan padho, EK badlaav se theek karo, pakka karo — phir batao kya toota tha.',
  });
})();
