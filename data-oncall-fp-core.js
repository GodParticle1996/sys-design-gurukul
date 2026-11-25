/* 📟 On-call shift 'results' — fp-core, level fp-cache-kab (engine: oncall.js)
   Cache ke teen first-principles sabak, ek raat mein (ranker 200ms, pool 50 → capacity ~250 rps, aaye 500):
     1 EveryRefreshHitsRanker  har refresh ranker tak, ρ 2.0 → sim add cache … → doosra GET HIT (DB tak gaya hi nahi)
     2 TtlFiveSecondsSpikes    (onFire: product ne TTL 5s, jitter 0 deploy kiya) saari keys ek saath expire → ρ 2.01
                               → sim add cache --ttl 5 --jitter 40 → ρ 0.73, p99 104ms
     3 TopperPageHerd          ek hi key expire → 100 requests ek saath ranker par (dbQueries 100) → cache coalesce → 1
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const C = s => s.sys.api.cache || null;
  const HOT = 'GET /transactions/1 -n 100';
  const INC = [
    { id: 'EveryRefreshHitsRanker', sev: '🔴 SEV1', text: 'Results aa gaye! Har refresh ranker tak ja raha hai (200ms). 500 rps par site saturated.',
      fixed: s => !!C(s),
      verify: r => r.kind === 'http' && r.cache === 'HIT',
      verifyText: 'GET /transactions do baar — doosra cache HIT',
      hints: [
        'GET /transactions do baar chalao — dono baar ranker tak gaya? Phir load --rps 500 --duration 8: ρ kitna?',
        'Result ek baar bana toh badalta nahi — har refresh par dobara kyun banana? Bana hua jawab yaad rakho (cache), thodi der ke liye.',
        'sim add cache --ttl 60 --jitter 20, phir GET /transactions do baar — doosra HIT.',
      ] },
    { id: 'TtlFiveSecondsSpikes', sev: '🔴 SEV1', text: 'Product ne "live results" ke liye cache TTL 5 second deploy karwaya. Ab har 5 second par ranker par dhamaka — site phir saturated.',
      onFire: s => { const c = C(s); if (c) { c.ttlSec = 5; c.jitterPct = 0; c.entries = {}; c.singleFlight = false; } },
      fixed: s => { const c = C(s); return !!c && c.ttlSec <= 10 && c.jitterPct >= 20; },
      verify: r => r.kind === 'load' && r.rps >= 500 && !r.saturated,
      verifyText: 'load --rps 500 --duration 8 dobara — saturated nahi',
      hints: [
        'sim status (cache ki TTL aur jitter), phir load --rps 500 --duration 8 — ρ kitna, aur expiry kab ho rahi hai?',
        'TTL 5s product ki shart hai — use mat badlo. Dikkat yeh hai ki saari keys EK saath expire hoti hain, toh sab ek saath ranker par. Expiry ko bikhero: har key ki TTL thodi alag (jitter).',
        'sim add cache --ttl 5 --jitter 40, phir load --rps 500 --duration 8: ρ ~0.73.',
      ] },
    { id: 'TopperPageHerd', sev: '🟠 SEV2', text: 'Topper ka result page viral: woh EK key expire hote hi 100 requests ek saath ranker par.',
      fixed: s => !!(C(s) && C(s).singleFlight),
      verify: r => r.kind === 'http' && r.repeat >= 100 && r.cache === 'MISS' && r.dbQueries === 1,
      verifyText: `key expire hone do (sim advance 10), phir ${HOT} — sirf 1 DB query`,
      hints: [
        `${HOT} chalao — cache MISS par kitni DB queries gayi?`,
        'Jitter alag-alag keys ko bikherta hai — par EK key ki expiry ek hi pal hoti hai. Pehli request ranker se laaye, baaki usi jawab ka intezaar karein (single-flight / coalescing).',
        `cache coalesce --misses 100 --on, sim advance 10 (key expire), phir ${HOT}: dbQueries 1.`,
      ] },
  ];

  SD.oncall.add({
    id: 'results', start: 23 * 60 + 58, INC,
    build: ({ risky }) => ({
      sys: { name: 'results-api', api: { countTotal: false }, deps: { ranker: { p50: 150, p99: 200, errorRate: 0 } },
        db: { tables: { transactions: { rows: 24286450, rowBytes: 220, pk: 'id', cols: ['id', 'user_id', 'amount', 'status', 'merchant', 'created_at'],
          indexes: [{ name: 'transactions_pkey', cols: ['id'], unique: true }, { name: 'ix_created', cols: ['created_at', 'id'] }] } } } },
      goal: '<b>Board results, 23:58.</b> 12 lakh students raat 12 baje refresh dabayenge. Ranker (result banane wali service) 200ms leta hai. Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: GET /transactions)',
      runbook: `# Results night on-call runbook
Page:         GET /transactions          (results list — ranker se banti hai, ~200ms)
Load:         load --rps 500 --duration 8
Hot page:     ${HOT}   (ek hi key par 100 requests)
Cache:        sim add cache --ttl S --jitter P   (dobara add = purani entries aur coalescing saaf)
              cache coalesce --misses N --on     (single-flight)
Ghadi:        sim advance <seconds>   (TTL perfsim ki ghadi se chalti hai)
Shart:        product ko TTL ≤ 5–10s chahiye ("live results")
Mat chhuna:   pool 50 se upar · sim reset · sim inject`,
      responses: [
        risky(/^sim scale pool\s+(5[1-9]|[6-9]\d|\d{3,})\b/i, 'Pool 50 se upar mana — DB max_connections 60. Ranker ka kaam bachao, connections nahi badhao.'),
      ],
      successText: `<b>Raat ki kahani:</b> har refresh ranker tak — 500 rps par 250 ki capacity (1) → cache ne bana hua jawab yaad rakha →
        product ki 5s TTL se saari keys ek saath expire, har 5 second dhamaka (2) → jitter ne expiry bikheri →
        par topper ki EK key ek hi pal expire hoti hai, 100 requests saath (3) → coalescing: ek laaye, sab paaye.<br>
        <b>Seekh:</b> cache ke teen first principles — <b>reuse</b> (cache), <b>bikherna</b> (jitter), <b>sametna</b> (coalescing). Ek ki jagah doosra kaam nahi karta.<br>
        <b>Postmortem action items:</b> TTL hamesha jitter ke saath · hot keys par single-flight default · freshness ki shart ke saath load test.`,
      solution: [
        'runbook', 'GET /transactions', 'load --rps 500 --duration 8', 'sim add cache --ttl 60 --jitter 20', 'GET /transactions', 'GET /transactions',
        'sim status', 'load --rps 500 --duration 8', 'sim add cache --ttl 5 --jitter 40', 'load --rps 500 --duration 8',
        HOT, 'cache coalesce --misses 100 --on', 'sim advance 10', HOT,
      ],
    }),
  });

  SD.addLab('fp-cache-kab', {
    type: 'oncall', id: 'oncall-fp-core', shift: 'results', title: '📟 On-call shift: results ki raat',
    instructions: 'Ek mehenga ranker, 12 lakh refresh. Har command = 1 minute. Cache ke teen sabak live — theek karo, phir pakka karo.',
  });
})();
