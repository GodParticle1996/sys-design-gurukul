/* 🎲 Chaos deck 'api' — api track, level ratelimit (engine: chaos.js)
   Swasth base (API contract guards): maxLimit 100 · maxPageDepth 100 · auth header · idempotency · rate limit 5/s burst 10.
   Probes (base par): limit=5000 → 400 maxLimit · page=485728 → 400 maxDepth · user_id=8 (token u7) → 403 idor ·
   same key POST × 2 → 201 new, 200 replay · -n 30 → 429. Har card EK guard hataata hai — sirf uska probe badalta hai
   (perfsim par chala ke dekha, 2026-11-25). */
(function () {
  const tables = SD.defaultSys().db.tables;
  tables.transactions.indexes.push({ name: 'ix_user_created', cols: ['user_id', 'created_at', 'id'] }, { name: 'ix_created', cols: ['created_at', 'id'] });
  const T = "-H 'Authorization: Bearer u7'";
  const P = {
    limit: `GET /transactions?limit=5000 ${T}`,
    depth: `GET /transactions?page=485728 ${T}`,
    idor: `GET /transactions?user_id=8 ${T}`,
    pay: `POST /payments -H 'Idempotency-Key: k1' ${T}`,
    burst: `GET /transactions/1 ${T} -n 30`,
  };
  const A = s => s.sys.api;
  const H1 = 'runbook ke paanchon probe ek-ek karke chalao. Kaunsa jawab "contract" se alag hai? Phir sim status — kaunsi setting gayab hai?';

  SD.chaos.addDeck({
    id: 'api', title: 'API contract deck',
    sys: { name: 'clearpay-api', api: { auth: 'header', idempotency: true, maxLimit: 100, maxPageDepth: 100, countTotal: false, rateLimit: { rps: 5, burst: 10 } }, db: { tables } },
    alert: '<b>📟 10:30 — partner review fail.</b> Kal raat API gateway naye servers par migrate hua; settings copy hui. Partner ki test suite kehti hai "ek contract toota hai" — kaunsa, nahi bataati. Shuru: <code>runbook</code>.',
    placeholder: 'runbook',
    runbook: `# ClearPay API — contract probes (partner token u7)
1. Bada page:     ${P.limit}        → 400 (maxLimit) aana chahiye
2. Gehra page:    ${P.depth}       → 400 (maxDepth)
3. Doosre ka data: ${P.idor}         → 403
4. Retry:         ${P.pay}  (do baar) → 201, phir 200 replay
5. Burst:         ${P.burst}       → kuch 429
Settings:         sim status · sim set api.<setting> <value> · sim add ratelimit --rps N --burst B
Niyam:            ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'no-maxlimit', title: 'Page size ki hadd (maxLimit) copy nahi hui',
        sys: { api: { maxLimit: null } },
        fixed: s => A(s).maxLimit > 0 && A(s).maxLimit <= 500, verify: r => r.kind === 'http' && r.guard === 'maxLimit' && r.status === 400,
        verifyText: 'probe 1 dobara — 400 (maxLimit)',
        hints: [H1, 'limit=5000 ko 200 mila — client jitni rows maange, server de deta hai. Ek request poore DB ko kitna kaam de sakti hai?', 'sim set api.maxLimit 100, phir probe 1 dobara.'],
        solution: ['runbook', P.limit, 'sim status', 'sim set api.maxLimit 100', P.limit],
        why: 'Contract mein <b>max limit</b> na ho toh ek client limit=5000 maang kar DB aur network dono par bojh daalta hai. Hadd server tay kare — client ki maang par bharosa nahi.' },
      { id: 'no-maxdepth', title: 'Page ki gehraai ki hadd (maxPageDepth) copy nahi hui',
        sys: { api: { maxPageDepth: null } },
        fixed: s => A(s).maxPageDepth > 0 && A(s).maxPageDepth <= 1000, verify: r => r.kind === 'http' && r.guard === 'maxDepth' && r.status === 400,
        verifyText: 'probe 2 dobara — 400 (maxDepth)',
        hints: [H1, 'page=485728 ko 200 mila — aur dheema. Offset paging mein gehra page = pehle ki saari rows chalni padti hain. Kitni gehraai tak allow hai?', 'sim set api.maxPageDepth 100, phir probe 2 dobara.'],
        solution: ['runbook', P.depth, 'sim status', 'sim set api.maxPageDepth 100', P.depth],
        why: 'Gehra offset page DB ko lakhon rows chalne par majboor karta hai. <b>maxPageDepth</b> contract ki hadd hai; gehra scan chahiye toh cursor paging.' },
      { id: 'auth-body', title: 'Identity token ki jagah request se li ja rahi hai (auth = body)',
        sys: { api: { auth: 'body' } },
        fixed: s => A(s).auth === 'header', verify: r => r.kind === 'http' && r.status === 403 && r.denied === 'idor',
        verifyText: 'probe 3 dobara — 403',
        hints: [H1, 'Token u7 ka, maanga user 8 ka — aur 200 mila! Server identity kahan se le raha hai? sim status mein auth dekho.', 'sim set api.auth header, phir probe 3 dobara.'],
        solution: ['runbook', P.idor, 'sim status', 'sim set api.auth header', P.idor],
        why: 'Naye gateway par auth mode "body" — server ne request mein likhi identity maan li. Yeh <b>IDOR</b> hai: koi bhi kisi ka data. Identity sirf verified token se.' },
      { id: 'idem-off', title: 'Idempotency (retry ka pichhla jawab) band ho gayi',
        sys: { api: { idempotency: false } },
        fixed: s => A(s).idempotency === true, verify: r => r.kind === 'http' && r.method === 'POST' && r.idem === 'replay',
        verifyText: 'probe 4 do baar — doosra 200 replay',
        hints: [H1, 'Same key se do POST — dono 201 (idem: ignored). Partner ka retry = doosra charge.', 'sim set api.idempotency true, phir probe 4 do baar.'],
        solution: ['runbook', P.pay, P.pay, 'sim status', 'sim set api.idempotency true', P.pay, P.pay],
        why: 'Idempotency band = server key ko dekhta hi nahi; har retry naya payment. Network timeouts par retry hoga hi — key se doosri koshish ko <b>pichhla jawab</b> milna chahiye.' },
      { id: 'no-ratelimit', title: 'Rate limit copy nahi hui',
        sys: { api: { rateLimit: null } },
        fixed: s => !!A(s).rateLimit, verify: r => r.kind === 'http' && r.rateLimited && r.blocked > 0,
        verifyText: 'probe 5 dobara — kuch 429',
        hints: [H1, 'Burst ke saare 30 guzar gaye, ek bhi 429 nahi. Ek client sabka hissa kha sakta hai.', 'sim add ratelimit --rps 5 --burst 10, phir probe 5 dobara.'],
        solution: ['runbook', P.burst, 'sim status', 'sim add ratelimit --rps 5 --burst 10', P.burst],
        why: 'Rate limit ke bina ek partner ka script poore API ka hissa le leta hai. Token bucket: har second N, thoda burst, baaki <b>429 + Retry-After</b>.' },
    ],
  });

  SD.addLab('ratelimit', {
    type: 'chaos', id: 'chaos-api', deck: 'api', title: '🎲 Chaos round: gateway migration',
    instructions: 'Paanch contract probes, ek guard gayab. Dhoondho, EK badlaav se theek karo, pakka karo — phir batao kya toota tha.',
  });
})();
