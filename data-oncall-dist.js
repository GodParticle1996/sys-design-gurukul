/* 📟 On-call shift 'walletkv' — boss-dist (engine: oncall.js; kv: perfsim-pro.js)
   boss-dist ka terminal idempotency + read model sikhata hai; yeh shift dist track ke copies wale hisse:
     1 StaleBalance     W=1, R=1: ₹500 ek replica par, read doosre se → ₹100 → kv config --w 2 --r 2 + kv repair → ₹500
     2 WritesFailing    (onFire: b aur c down) W=2 par sirf 1 zinda → 503 → kv up c (replica restart) → write ack a, c
     3 DuplicateTopUp   UPI app ka retry: same key, do baar ₹500 credit → sim set api.idempotency true → replay
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const K = s => s.sys.kv;
  const alive = k => ['a', 'b', 'c'].filter(n => !k.down[n]);
  const KEY = "POST /payments -H 'Idempotency-Key: topup-9911'";
  const INC = [
    { id: 'StaleBalance', sev: '🔴 SEV1', text: 'Aman: "₹500 top-up kiya, app mein kabhi ₹500 dikhta hai, kabhi ₹100!" Support ke paas 40 aise tickets.',
      fixed: s => { const k = K(s); return k.w + k.r > k.n && alive(k).every(n => k.reps[n].ver === k.latest); },
      verify: r => r.kind === 'kv' && r.op === 'get' && !r.stale && r.value === 500,
      verifyText: 'kv get aman — ₹500 (stale nahi)',
      hints: [
        'kv status, phir kv get aman — kaunsa replica padha gaya, aur woh kis version par hai?',
        'W=1 ne write ek replica par pakka kiya, R=1 ne doosre se padha — dono sets milte hi nahi (R + W ≤ N). Overlap chahiye. Aur purana write config badalne se apne aap nahi phailta.',
        'kv config --w 2 --r 2 (R + W = 4 > 3), phir kv repair, phir kv get aman.',
      ] },
    { id: 'WritesFailing', sev: '🔴 SEV1', text: 'Rack switch gira: replicas b aur c down. Har top-up par 503.',
      onFire: s => { K(s).down.b = true; K(s).down.c = true; },
      fixed: s => alive(K(s)).length >= K(s).w,
      verify: r => r.kind === 'kv' && r.op === 'put' && r.acked >= 2,
      verifyText: 'ek top-up likho (kv put aman 700) — 2 replicas ka ack',
      hints: [
        'kv status — kitne replicas zinda hain, aur W kitna maangta hai? (kv put aman 700 chalao toh 503 dikhega.)',
        'W=2 ka matlab: 2 copies ke bina write "haan" nahi. Yahi consistency ki keemat hai — availability. W ghataoge toh stale balance wapas. Replica wapas lao.',
        'kv up c (replica restart), phir kv put aman 700 — ack a, c.',
      ] },
    { id: 'DuplicateTopUp', sev: '🔴 SEV1', text: 'UPI app ne timeout ke baad top-up dobara bheja — ek hi Idempotency-Key, aur Aman ko do baar ₹500 credit!',
      fixed: s => s.sys.api.idempotency === true,
      verify: r => r.kind === 'http' && r.method === 'POST' && r.idem === 'replay',
      verifyText: 'same key se POST do baar — doosra replay',
      hints: [
        `${KEY} do baar chalao — dono ka status? Record mein idem kya kehta hai?`,
        'Network "exactly once" nahi deta — retry hoga hi. Server ko key yaad rakhni hai, taaki doosri koshish ko pichhla jawab mile, naya credit nahi.',
        `sim set api.idempotency true, phir wahi POST do baar: 201, phir 200 replay.`,
      ] },
  ];

  SD.oncall.add({
    id: 'walletkv', start: 1 * 60 + 35, INC,
    build: ({ risky }) => ({
      sys: { name: 'wallet-api',
        kv: { n: 3, w: 1, r: 1, latest: 2, reps: { a: { v: 500, ver: 2 }, b: { v: 100, ver: 1 }, c: { v: 100, ver: 1 } }, down: { a: false, b: false, c: false } } },
      goal: '<b>Wallet app, 01:35.</b> Balance 3 replicas wale KV store mein hai (a, b, c). Pager tumhare paas hai. Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: kv status)',
      runbook: `# Wallet on-call runbook
Balance store:  kv status · kv get aman · kv put aman <rupaye>
Quorum:         kv config --w N --r N     (R + W > N = read aur write ke sets milte hain)
Copies:         kv repair (sabse naya version baaki zinda replicas par) · kv up <node> (replica restart)
Top-up API:     ${KEY}
Settings:       sim set api.idempotency true|false
Mat chhuna:     W=1 (stale balance wapas) · kv down · idempotency off · sim reset · sim inject`,
      responses: [
        risky(/^kv config\b.*--w\s+1\b/i, 'W=1 mana — writes chal padengi par ek hi copy par; agla read doosre replica se purana balance dega.'),
        risky(/^kv down\b/i, 'Replica band karna mana — production mein khud copy girana availability aur kam karta hai.'),
        risky(/^sim set api\.idempotency\s+false\b/i, 'Idempotency band karna mana — retries phir do baar credit karenge.'),
      ],
      successText: `<b>Raat ki kahani:</b> W=1, R=1 — write aur read alag replicas par, isliye ₹500 kabhi ₹100 (1) → quorum (R + W > N) + repair →
        rack gira, do replicas down; W=2 ne galat jawab dene ki jagah 503 diya (2) — yahi consistency ki keemat; replica wapas →
        phir UPI retry ne ek top-up do baar credit kiya (3) → idempotency key se doosri koshish ko pichhla jawab.<br>
        <b>Seekh:</b> copies ki duniya mein teen sawaal — <b>kaunsi copy padhi</b> (quorum), <b>copies kam hon toh kya</b> (availability vs consistency), aur <b>wahi kaam do baar aaye toh</b> (idempotency).<br>
        <b>Postmortem action items:</b> balance par W/R quorum default · replicas alag racks mein · har credit API par idempotency key.`,
      solution: [
        'runbook', 'kv status', 'kv get aman', 'kv config --w 2 --r 2', 'kv repair', 'kv get aman',
        'kv status', 'kv up c', 'kv put aman 700',
        KEY, KEY, 'sim set api.idempotency true', KEY, KEY,
      ],
    }),
  });

  SD.addLab('boss-dist', {
    type: 'oncall', id: 'oncall-dist', shift: 'walletkv', title: '📟 On-call shift: teen copies, ek balance',
    instructions: 'Wallet ka balance 3 replicas par. Har command = 1 minute. Theek karo, phir pakka karo — khatarnaak commands gine jaate hain.',
  });
})();
