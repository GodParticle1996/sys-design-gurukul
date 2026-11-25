/* 🎲 Chaos deck 'sec' — pro-sec track, level sec-abuse (engine: chaos.js; tenant/token: perfsim-pro.js)
   Swasth base: RLS ON · MegaMart alag read replica par · token revoke denylist se jaancha jaata hai · auth header.
   Probes (base par): tenant export sharma → leak 0 · tenant load → dashboards 180ms, report 15 min ·
   token revoke aman + token use t-old → 401 · GET bina token → 401 · u7 ke token se user 8 → 403.
   Har card EK badlaav (perfsim par chala ke dekha, 2026-11-25):
     rls-off      app-filter → Sharma ke export mein 54,88,000 doosron ki rows
     replica-off  MegaMart wapas saajha DB par → dashboards p99 10s
     token-jwt    denylist band (jwt-30d) → chori hua token revoke ke baad bhi 200
     auth-body    identity request se → user 8 ka data 200 (bina token bhi)
     auth-null    authentication hi band → bina token 200 */
(function () {
  const T = s => s.sys.tenancy;
  const NOTOK = 'GET /transactions/1';
  const IDOR = "GET /transactions?user_id=8 -H 'Authorization: Bearer u7'";
  const H1 = 'runbook ke probe ek-ek karke chalao: export, load, chori token, bina token, doosre ka data. Kaunsa jawab galat? Phir us hisse ki setting dekho (tenant status / token list aman / sim status).';

  SD.chaos.addDeck({
    id: 'sec', title: 'Security deck',
    sys: { name: 'chaipay-merchant', api: { auth: 'header' }, tenancy: { isolation: 'rls', quota: {}, replica: { mega: true } }, tokens: { mode: 'denylist', issued: 'denylist' } },
    alert: '<b>📟 14:00 — security review.</b> Kal raat infra "hardening" ke naam par config templates badle gaye. Pen-tester kehta hai: "ek darwaza khula hai." Kaunsa — dhoondho. Shuru: <code>runbook</code>.',
    placeholder: 'runbook',
    runbook: `# ChaiPay security probes
1. Tenant leak:    tenant export sharma                         → sirf Sharma ki 12,000 rows
2. Noisy tenant:   tenant load                                  → dashboards < 1s, MegaMart report ≤ 20 min
3. Chori token:    token revoke aman · token use t-old          → 401
4. Bina token:     ${NOTOK}                            → 401
5. Doosre ka data: ${IDOR} → 403
Settings:          tenant status · tenant isolation rls · tenant replica <id> · token mode … · sim set api.auth header
Niyam:             ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'rls-off', title: 'Row-level security hat gayi (wapas app-filter)',
        sys: { tenancy: { isolation: 'app-filter' } },
        fixed: s => T(s).isolation === 'rls', verify: r => r.kind === 'tenant-export' && r.leaked === 0, verifyText: 'tenant export sharma — leak 0',
        hints: [H1, 'Sharma ke export mein 55 lakh rows — doosre merchants ki. tenant status: isolation kya hai?', 'tenant isolation rls, phir tenant export sharma.'],
        solution: ['runbook', 'tenant export sharma', 'tenant status', 'tenant isolation rls', 'tenant export sharma'],
        why: 'app-filter mein har query mein developer ko WHERE merchant_id yaad rakhna padta hai — ek bhooli = <b>leak</b>. RLS database mein policy hai: code bhoole tab bhi sirf apni rows.' },
      { id: 'replica-off', title: 'MegaMart ka alag replica hata, wapas saajha DB par',
        sys: { tenancy: { replica: { mega: false } } },
        fixed: s => !!T(s).replica.mega, verify: r => r.kind === 'tenant-load' && r.othersP99 < 1000 && r.dtReportMin <= 20, verifyText: 'tenant load — dashboards < 1s, report ≤ 20 min',
        hints: [H1, 'tenant load: baaki 39,999 merchants ke dashboards 10s. tenant status: MegaMart kahan chal raha hai?', 'tenant replica mega, phir tenant load. (Sirf quota se dashboards bachenge par report 60 min.)'],
        solution: ['runbook', 'tenant load', 'tenant status', 'tenant replica mega', 'tenant load'],
        why: 'Noisy neighbour bhi security ka hissa hai — <b>availability</b>. MegaMart ki report saajha DB ka 80% CPU le leti hai. Alag replica: dono khush; sirf quota: dashboards bache, par report 60 min.' },
      { id: 'token-jwt', title: 'Token revoke check (denylist) band — 30 din ke JWT',
        sys: { tokens: { mode: 'jwt-30d', issued: 'jwt-30d' } },
        fixed: s => s.sys.tokens.mode === 'denylist', verify: r => r.kind === 'token-use' && r.status === 401, verifyText: 'token use t-old — 401',
        hints: [H1, 'Revoke ke baad bhi chori token se 200. token list aman: services token kaise jaanch rahi hain?', 'token mode denylist, phir token use t-old.'],
        solution: ['runbook', 'token revoke aman', 'token use t-old', 'token list aman', 'token mode denylist', 'token use t-old'],
        why: 'JWT apne andar expiry rakhta hai — services sirf signature dekhti hain, toh revoke ka pata hi nahi chalta. 30 din tak chor ke paas chaabi. <b>Denylist</b>: har request par revoke list (tez cache).' },
      { id: 'auth-body', title: 'Identity token ki jagah request se li ja rahi hai (auth = body)',
        sys: { api: { auth: 'body' } },
        fixed: s => s.sys.api.auth === 'header', verify: r => r.kind === 'http' && r.status === 403 && r.denied === 'idor', verifyText: 'u7 ke token se user 8 — 403',
        hints: [H1, 'Token u7 ka, data user 8 ka — 200. sim status: auth kahan se?', 'sim set api.auth header, phir probe 5.'],
        solution: ['runbook', IDOR, 'sim status', 'sim set api.auth header', IDOR],
        why: 'Server ne request mein likhi identity maan li — <b>IDOR</b>. Token valid tha; galti yeh ki "kaun hai" token se nahi, request se liya.' },
      { id: 'auth-null', title: 'Authentication hi band ho gaya (auth = none)',
        sys: { api: { auth: null } },
        fixed: s => s.sys.api.auth === 'header', verify: r => r.kind === 'http' && r.status === 401, verifyText: 'bina token GET — 401',
        hints: [H1, 'Bina token ke bhi 200! sim status: auth kya hai?', 'sim set api.auth header, phir probe 4 (bina token) — 401.'],
        solution: ['runbook', NOTOK, 'sim status', 'sim set api.auth header', NOTOK],
        why: 'Template mein auth hi band — koi bhi bina token data padh sakta hai. "Auth = body" (identity request se) aur "auth band" dono ka ilaaj ek: identity sirf <b>verified token</b> se.' },
    ],
  });

  SD.addLab('sec-abuse', {
    type: 'chaos', id: 'chaos-sec', deck: 'sec', title: '🎲 Chaos round: "hardening" ke baad',
    instructions: 'Paanch probes, ek khula darwaza. Dhoondho, EK badlaav se band karo, pakka karo — phir batao kya toota tha.',
  });
})();
