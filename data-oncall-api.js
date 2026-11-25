/* 📟 On-call shift 'clearpay' — boss-api (engine: oncall.js)
   boss-api ka terminal mission deep offset → index → count → cursor sikhata hai; yeh shift API track ke BAAKI hisse:
     1 DuplicatePayments   same Idempotency-Key, dono 201 (idem: ignored)  → sim set api.idempotency true → doosra 200 replay
     2 CrossMerchantRead   u7 ka token, user_id=8 ka data 200 (auth: body)  → sim set api.auth header → 403 (denied: idor)
     3 PartnerBurst        -n 30 sab 200                                    → sim add ratelimit --rps 5 --burst 10 → 5 × 200, 25 × 429
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const tables = SD.defaultSys().db.tables;
  tables.transactions.indexes.push({ name: 'ix_user_created', cols: ['user_id', 'created_at', 'id'] });
  const KEY = "POST /payments -H 'Idempotency-Key: pk-7781'";
  const READ8 = "GET /transactions?user_id=8 -H 'Authorization: Bearer u7'";
  const BURST = "GET /transactions/1 -H 'Authorization: Bearer u7' -n 30";
  const INC = [
    { id: 'DuplicatePayments', sev: '🔴 SEV1', text: 'Partner PayKaro ke timeouts ke baad retries: ek hi payment do baar charge ho raha (same Idempotency-Key, dono 201).',
      fixed: s => s.sys.api.idempotency === true,
      verify: r => r.kind === 'http' && r.method === 'POST' && r.idem === 'replay',
      verifyText: 'same key se POST do baar bhejo — doosra replay hona chahiye',
      hints: [
        `${KEY} do baar chalao. Dono ka status kya hai? Record mein "idem" kya kehta hai?`,
        'Client key bhej raha hai, par server use dekh hi nahi raha — har POST naya charge. Server ko key yaad rakhni hogi, taaki retry ko pichhla jawab mile.',
        `sim set api.idempotency true, phir wahi POST do baar: pehla 201 (naya), doosra 200 (replay — wahi purana jawab, naya charge nahi).`,
      ] },
    { id: 'CrossMerchantRead', sev: '🔴 SEV1', text: 'PayKaro support: "user_id=8 bhejo toh kisi aur merchant ka data aata hai" — token sirf u7 ka hai.',
      fixed: s => s.sys.api.auth === 'header',
      verify: r => r.kind === 'http' && r.status === 403 && r.denied === 'idor',
      verifyText: 'u7 ke token se user_id=8 maango — 403 aana chahiye',
      hints: [
        `${READ8} chalao. Token u7 ka, data 8 ka — status kya aaya? sim status mein auth kahan se aa raha hai?`,
        'Server identity query se le raha hai — jo client bheje, wahi maan liya. Yeh IDOR hai. Identity sirf verified token se aani chahiye.',
        'sim set api.auth header, phir wahi GET: 403 Forbidden (token u7 ka, maanga 8 ka).',
      ] },
    { id: 'PartnerBurst', sev: '🟠 SEV2', text: 'PayKaro ka reconciliation script ek second mein 30 requests maar raha — DB par bojh, baaki merchants dheeme.',
      fixed: s => !!s.sys.api.rateLimit,
      verify: r => r.kind === 'http' && r.rateLimited && r.blocked > 0,
      verifyText: 'wahi 30 ka burst dobara — kuch 429 aane chahiye',
      hints: [
        `${BURST} chalao — 30 mein se kitne guzre?`,
        'Ek client sabka hissa kha raha hai. Har client ki raftaar ki hadd chahiye: har second kuch requests, thoda burst — baaki 429 aur Retry-After.',
        `sim add ratelimit --rps 5 --burst 10, phir wahi -n 30: kuch 200, baaki 429.`,
      ] },
  ];

  SD.oncall.add({
    id: 'clearpay', start: 0 * 60 + 40, INC,
    build: ({ risky }) => ({
      sys: { name: 'clearpay-api', api: { auth: 'body' }, db: { tables } },
      goal: '<b>ClearPay, 00:40.</b> Naya partner PayKaro aaj raat live hua. Pager baj raha hai. Har alert theek karo, phir <b>pakka</b> karo. Shuru: <code>runbook</code>.',
      placeholder: 'runbook',
      runbook: `# ClearPay on-call runbook — partner integrations (raat)
Partner:      PayKaro (token u7) — payments, transactions list, reconciliation script.
Dekho:        sim status (auth, idempotency, rate limit) · metrics
Payment:      ${KEY}
Read:         GET /transactions?user_id=<id> -H 'Authorization: Bearer u7'
Burst:        ${BURST}   (ek second mein 30)
Badlo:        sim set api.<setting> <value> · sim add ratelimit --rps N --burst B
Mat chhuna:   auth dheela karna (body/none) · idempotency off · DROP INDEX · sim reset · sim inject`,
      responses: [
        risky(/^sim set api\.auth\s+(body|param|none|null)\b/i, 'Auth dheela karna mana — identity hamesha verified token se. Query/body wali identity koi bhi badal sakta hai.'),
        risky(/^sim set api\.idempotency\s+false\b/i, 'Idempotency band karna mana — partner ke retries phir do baar charge karenge.'),
        risky(/^drop\s+index\b/i, 'Index mat giraao — raat ko production index girana = har query full scan.'),
      ],
      successText: `<b>Raat ki kahani:</b> partner ke timeouts → retries → server key ko dekh hi nahi raha tha, isliye double charge (1) →
        idempotency ke baad support ne dekha ki user_id badalne se doosre ka data aata hai — identity query se aa rahi thi (2) →
        auth header se theek; phir partner ka script 30 req/s se sabka hissa kha raha tha (3) → rate limit.<br>
        <b>Seekh:</b> naya partner = naye client — har client ko <b>shaq</b> se dekho: retries hongi (idempotency), galat ids aayengi (auth), aur bojh aayega (rate limit).<br>
        <b>Postmortem action items:</b> partner launch checklist mein teeno · idempotency key ka scope (route + user) · IDOR ke liye test · har partner key ki apni rate limit.`,
      solution: [
        'runbook', KEY, KEY, 'sim status', 'sim set api.idempotency true', KEY, KEY,
        READ8, 'sim set api.auth header', READ8,
        BURST, 'sim add ratelimit --rps 5 --burst 10', BURST,
      ],
    }),
  });

  SD.addLab('boss-api', {
    type: 'oncall', id: 'oncall-api', shift: 'clearpay', title: '📟 On-call shift: naye partner ki pehli raat',
    instructions: 'Live API, jude hue alerts. Har command = 1 minute. Theek karo, phir pakka karo — khatarnaak commands gine jaate hain.',
  });
})();
