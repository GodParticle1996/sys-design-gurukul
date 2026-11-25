/* 🎲 Chaos deck 'dist' — dist track, level contention (engine: chaos.js)
   Swasth base: KV W=2 R=2 (3 replicas) · booking reservation, hold 600s · idempotency ON.
   Probes (base par): kv put + kv get → taaza · book seat --concurrent 2 → sold 1 · hold → 30s → confirm ok · same key POST × 2 → replay.
   Har card EK badlaav (perfsim par chala ke dekha, 2026-11-25):
     kv-w1        W=1 R=1 → get STALE (quorum ke baad bhi repair chahiye: do replicas purane)
     kv-r1        W=2 R=1 → get STALE (R=2 kaafi)
     locking-off  booking.mode none → ek seat do baar
     hold-short   holdTtl 5s → 30s baad confirm reject
     idem-off     idempotency off → same key, do 201 */
(function () {
  const K = s => s.sys.kv;
  /* read hamesha taaza: R + W > N, aur purane zinda replicas R se kam (warna read set sirf purane bhi ho sakte hain) */
  const quorumOk = s => { const k = K(s); const old = ['a', 'b', 'c'].filter(n => !k.down[n] && k.reps[n].ver < k.latest); return k.w + k.r > k.n && old.length < k.r; };
  const POST = "POST /payments -H 'Idempotency-Key: o1'";
  const H1 = 'runbook ke probe chalao — kaunsa jawab galat hai: purana balance, do baar biki seat, hold khatam, ya do charge? Phir us hisse ki settings dekho (kv status / book status / sim status).';

  SD.chaos.addDeck({
    id: 'dist', title: 'Distributed deck',
    sys: { name: 'bazaar-api', api: { idempotency: true }, booking: { mode: 'reservation', holdTtl: 600, seats: {}, holds: {} },
      kv: { n: 3, w: 2, r: 2, latest: 1, reps: { a: { v: 100, ver: 1 }, b: { v: 100, ver: 1 }, c: { v: 100, ver: 1 } }, down: { a: false, b: false, c: false } } },
    alert: '<b>📟 11:20 — Bazaar ki sale.</b> Kal raat "config simplification" PR merge hua (balance store, seat booking aur payments ki settings ek file mein). Ek setting galat gayi. Shuru: <code>runbook</code>.',
    placeholder: 'runbook',
    runbook: `# Bazaar runbook — "simplification ke baad"
Balance:   kv put aman 700 · kv get aman     → taaza (₹700) aana chahiye        | kv status · kv config --w N --r N · kv repair
Seat:      book seat S1 --concurrent 2       → sirf 1 bike                      | book status · sim set booking.mode …
Hold:      book hold S2 --owner riya · sim advance 30 · book confirm S2 --owner riya → safal | sim set booking.holdTtl N
Payment:   ${POST} (do baar) → 201, phir 200 replay | sim set api.idempotency true|false
Niyam:     ek baar mein EK badlaav; har probe ke liye nayi seat (S3, S4…).`,
    cards: [
      { id: 'kv-w1', title: 'Balance store W=1, R=1 — write aur read ke replicas milte hi nahi',
        sys: { kv: { w: 1, r: 1 } },
        fixed: quorumOk, verify: r => r.kind === 'kv' && r.op === 'get' && !r.stale, verifyText: 'kv get aman — taaza',
        hints: [H1, 'kv get STALE. kv status: W aur R kitne? R + W ≤ N matlab write ek replica par, read doosre se. Quorum ke baad bhi purana write sirf ek replica par hai.', 'kv config --w 2 --r 2, kv repair, phir kv get aman.'],
        solution: ['runbook', 'kv put aman 700', 'kv get aman', 'kv status', 'kv config --w 2 --r 2', 'kv repair', 'kv get aman'],
        why: 'W=1, R=1 → R + W = 2 ≤ 3: write aur read ke sets alag ho sakte hain, isliye purana balance. Quorum (R + W > N) <b>aage</b> ke writes ke liye; jo write pehle ek replica par hua, use <b>repair</b> se phailana padta hai.' },
      { id: 'kv-r1', title: 'Balance store R=1 — read sirf ek replica se',
        sys: { kv: { r: 1 } },
        fixed: quorumOk, verify: r => r.kind === 'kv' && r.op === 'get' && !r.stale, verifyText: 'kv get aman — taaza',
        hints: [H1, 'kv get STALE. kv status: W=2 theek hai — R kitna? R + W ≤ N.', 'kv config --w 2 --r 2, phir kv get aman.'],
        solution: ['runbook', 'kv put aman 700', 'kv get aman', 'kv status', 'kv config --w 2 --r 2', 'kv get aman'],
        why: 'W=2 ne write do replicas par pakka kiya, par R=1 teesre (purane) se padh sakta hai. R + W > N tabhi read set aur write set <b>milte</b> hain. Yahan W theek tha — R badhana kaafi.' },
      { id: 'locking-off', title: 'Seat booking ka locking band (booking.mode none)',
        sys: { booking: { mode: 'none' } },
        fixed: s => ['optimistic', 'pessimistic', 'reservation'].includes(s.sys.booking.mode),
        verify: r => r.kind === 'book' && r.op === 'seat' && r.concurrent >= 2 && !r.doubleBooked && r.sold === 1,
        verifyText: 'nayi seat par do log ek saath — sirf 1 bike',
        hints: [H1, 'Do log, ek seat, dono ko mili (DOUBLE). book status: mode kya hai?', 'sim set booking.mode reservation, phir book seat S3 --concurrent 2.'],
        solution: ['runbook', 'book seat S1 --concurrent 2', 'book status', 'sim set booking.mode reservation', 'book seat S3 --concurrent 2'],
        why: '"Check, phir write" do alag kadam hon toh dono buyer "khaali hai" dekh lete hain. Locking (optimistic / pessimistic / reservation) check aur claim ko <b>atomic</b> banata hai.' },
      { id: 'hold-short', title: 'Seat hold 600s se 5s kar diya gaya',
        sys: { booking: { holdTtl: 5 } },
        fixed: s => +s.sys.booking.holdTtl >= 300, verify: r => r.kind === 'book' && r.op === 'confirm' && r.ok,
        verifyText: 'naya hold → 30s → confirm safal',
        hints: [H1, 'Hold liya, 30 second baad confirm reject. book status: hold kitne second ka hai?', 'sim set booking.holdTtl 600, phir book hold S4 --owner riya, sim advance 30, book confirm S4 --owner riya.'],
        solution: ['runbook', 'book hold S2 --owner riya', 'sim advance 30', 'book confirm S2 --owner riya', 'book status', 'sim set booking.holdTtl 600', 'book hold S4 --owner riya', 'sim advance 30', 'book confirm S4 --owner riya'],
        why: 'Hold <b>lease</b> hai: payment jitna lamba hona chahiye. 5s ka hold payment ke beech khatam, seat kisi aur ki. TTL payment ke p99 se tay karo — itna lamba nahi ki chhodi seat ghanton atki rahe.' },
      { id: 'idem-off', title: 'Payments ki idempotency band ho gayi',
        sys: { api: { idempotency: false } },
        fixed: s => s.sys.api.idempotency === true, verify: r => r.kind === 'http' && r.method === 'POST' && r.idem === 'replay',
        verifyText: 'same key se POST do baar — doosra replay',
        hints: [H1, 'Same key, do POST, dono 201 (idem: ignored) — retry = doosra charge.', 'sim set api.idempotency true, phir POST do baar.'],
        solution: ['runbook', POST, POST, 'sim status', 'sim set api.idempotency true', POST, POST],
        why: 'Network exactly-once nahi deta — retry hoga. <b>Exactly-once effect</b> = at-least-once delivery + idempotency key. Key ignore hui toh har retry naya charge.' },
    ],
  });

  SD.addLab('contention', {
    type: 'chaos', id: 'chaos-dist', deck: 'dist', title: '🎲 Chaos round: config simplification',
    instructions: 'Balance, seat, hold, payment — ek setting galat. Probe chalao, EK badlaav se theek karo, pakka karo — phir batao kya toota tha.',
  });
})();
