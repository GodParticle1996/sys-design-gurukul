/* ex0 · SLOW MOTION — ek shor karne wala tenant, ek shaant; chhote paimaane par, taaki har request dikhe.
   KhanaKart ka partner-api: restaurants ke system isi se baat karte hain. Yahan 2 khidkiyan (workers), har request 500 ms.
     B = Bholu Dhaba (chhota restaurant): har second ek request ("order accept") — 0.25 s, 1.25 s, … 6.25 s (kul 7)
         Dhaba ka tablet 1.5 s tak jawab ka intezaar karta hai, phir error dikha deta hai.
     A = Annapurna Foods (bada chain): 1.00 s par menu-sync script 12 requests ek saath bhej deti hai (1.00–1.22 s).
   Chaar niyam — wahi requests, wahi khidkiyan; sirf "agla kaam kiska" badalta hai:
     fifo    sab ek hi line mein
     quota   ek line, par har tenant ki token wali baalti: 2 requests/second (lib/token-bucket.js)
     fair    har tenant ki apni line; khidkiyan baari-baari har line se ek uthati hain (lib/fair-queue.js)
     pool    har tenant ki apni khidki: khidki 1 sirf A ki, khidki 2 sirf B ki
   Ghadi tay hai (har ghatna apne tay pal par), isliye har run mein wahi output.
   node tools/slowmo.js [--mode fifo|quota|fair|pool] */
const { FairQueue } = require('../lib/fair-queue');
const { TokenBucket } = require('../lib/token-bucket');
const { sleep } = require('../lib/util');
const args = require('./args')();

const WORK = 500, RUN = 7500;
const A_AT = 1000, A_N = 12, A_GAP = 20;            // A: 12 requests, 20 ms ke fasle par
const B_AT = 250, B_EVERY = 1000, B_N = 7, B_TIMEOUT = 1500;   // B: har second ek (kul 7); tablet 1.5 s rukta hai
const NAMES = {
  fifo: 'sab ek hi line mein (FIFO)',
  quota: 'ek line + har tenant ki token wali baalti: 2 requests/second (quota)',
  fair: 'har tenant ki apni line, khidkiyan baari-baari (fair queue)',
  pool: 'har tenant ki apni khidki: khidki 1 sirf A ki, khidki 2 sirf B ki (pool)',
};
const s2 = ms => (ms / 1000).toFixed(2) + ' s';

async function run(mode) {
  /* ---- tay ghadi: ghatnayein apne tay pal par, kram mein ---- */
  const t0 = Date.now(), events = [];
  let clock = 0, seq = 0;
  const at = (t, fn) => events.push({ t, seq: seq++, fn });
  const log = [];
  const say = (text, kind) => log.push({ t: clock, text, kind });

  /* ---- service ---- */
  const win = [null, null];                                        // khidki 1, khidki 2 par abhi kaunsa kaam
  const fifo = [], fair = new FairQueue(), own = { A: [], B: [] };
  const bucket = { A: new TokenBucket({ rate: 2, now: () => clock }), B: new TokenBucket({ rate: 2, now: () => clock }) };
  const st = { A: { ok: 0, no: 0, last: 0 }, B: { sent: 0, ok: 0, late: 0, waits: [] }, busy: 0, wasted: 0 };
  const lineText = () => {
    if (mode === 'fair') return `A ki line: ${fair.lines.get('A') ? fair.lines.get('A').length : 0} · B ki line: ${fair.lines.get('B') ? fair.lines.get('B').length : 0}`;
    if (mode === 'pool') return `A ki line: ${own.A.length} · B ki line: ${own.B.length}`;
    return fifo.length ? `line [${fifo.map(j => j.t).join(' ')}]` : 'line khaali';
  };
  /* is khidki ke liye agla kaam — yahi ek jagah hai jahan chaaron niyam alag hain */
  function pick(w) {
    if (mode === 'fair') {
      const whose = fair.turn[0], empty = whose && !fair.lines.get(whose).length;
      const j = fair.next();
      if (j) j.why = empty ? `baari ${whose} ki thi, par ${whose} ki line khaali` : `baari ${j.t} ki`;
      return j;
    }
    if (mode === 'pool') return own[w === 0 ? 'A' : 'B'].shift() || null;
    return fifo.shift() || null;
  }
  function start(w, j) { win[w] = j; j.start = clock; at(clock + WORK, () => finish(w)); }
  function pump(note) {
    const started = [];
    for (let w = 0; w < 2; w++) if (!win[w]) { const j = pick(w); if (j) { start(w, j); started.push({ w, j }); } }
    return started;
  }
  function finish(w) {
    const j = win[w]; win[w] = null; st.busy += WORK;
    let what;
    if (j.dead) { st.wasted++; what = `${j.id} ka kaam poora — par tablet ${s2(j.at + B_TIMEOUT)} par haar maan chuka tha (bekaar kaam)`; }
    else if (j.t === 'B') { j.done = true; st.B.ok++; st.B.waits.push(clock - j.at); what = `${j.id} ho gaya ✅ (${s2(clock - j.at)} mein)`; }
    else { st.A.ok++; st.A.last = clock; what = `${j.id} ho gaya`; }
    const next = pump();
    const nx = next.length ? ` → agla: ${next[0].j.id}${next[0].j.why ? ` (${next[0].j.why})` : ''}` : ' → khidki khaali';
    say(`khidki ${w + 1}: ${what}${nx} · ${lineText()}`);
  }
  function arrive(t, id) {
    const j = { t, id, at: clock };
    if (t === 'B') { st.B.sent++; at(clock + B_TIMEOUT, () => { if (!j.done) { j.dead = true; st.B.late++; say(`${id} ❌ 1.5 s ho gaye, jawab nahi aaya — tablet ne haar maan li${win.includes(j) ? ` (${id} abhi khidki par hai)` : ` (${id} abhi bhi line mein khada hai)`}`); } }); }
    if (mode === 'quota' && !bucket[t].take()) { st.A.no++; return say(`${id} aaya → baalti khaali → 429 (mana)`, 'A429'); }
    if (mode === 'fair') fair.push(t, j); else if (mode === 'pool') own[t].push(j); else fifo.push(j);
    const started = pump();
    const mine = started.find(x => x.j === j);
    say(mine ? `${id} aaya → khidki ${mine.w + 1} par (turant)` : `${id} aaya → line mein · ${lineText()}`, t === 'A' ? (mine ? 'Awin' : 'Aline') : undefined);
  }
  for (let k = 0; k < B_N; k++) at(B_AT + k * B_EVERY, () => arrive('B', `B#${k + 1}`));
  for (let i = 0; i < A_N; i++) at(A_AT + i * A_GAP, () => arrive('A', `A#${i + 1}`));

  while (events.length) {
    events.sort((a, b) => a.t - b.t || a.seq - b.seq);
    const e = events.shift();
    if (e.t > RUN) break;
    await sleep(Math.max(0, t0 + e.t - Date.now()));
    clock = e.t; e.fn();
  }

  /* ---------- chhapai ---------- */
  console.log(`\n=== ${NAMES[mode]} ===`);
  for (let i = 0; i < log.length; i++) {
    const l = log[i];
    if (l.kind && l.kind[0] === 'A') {                               // A ke 12 requests ek hi line mein
      let j = i; while (log[j + 1] && log[j + 1].kind && log[j + 1].kind[0] === 'A') j++;
      const burst = log.slice(i, j + 1), n = k => burst.filter(x => x.kind === k).length;
      const parts = [];
      if (n('Awin')) parts.push(`${n('Awin')} seedhe khidki par`);
      if (n('Aline')) parts.push(`${n('Aline')} line mein`);
      if (n('A429')) parts.push(`${n('A429')} ko 429 (mana) — baalti mein 2 hi tokens the`);
      console.log(`   ${(s2(burst[0].t).replace(' s', '') + '–' + s2(burst[burst.length - 1].t)).padStart(13)}  A ke ${burst.length} requests aaye (menu sync): ${parts.join(', ')} · ${burst[burst.length - 1].text.split(' · ').slice(1).join(' · ') || lineAfter(burst)}`);
      i = j;
    } else console.log(`   ${s2(l.t).padStart(13)}  ${l.text}`);
  }
  function lineAfter() { return mode === 'quota' ? 'line khaali' : ''; }
  const B = st.B, worst = B.waits.length ? s2(Math.max(...B.waits)) : '-';
  console.log(`   nateeja → B (Bholu Dhaba): ${B.sent} mein se ${B.ok} ✅, ${B.late} ❌ · jo poore hue unka sabse lamba intezaar ${worst}`);
  console.log(`             A (Annapurna Foods): ${A_N} mein se ${st.A.ok} ✅${st.A.no ? `, ${st.A.no} ko 429 (mana) — jabki khidkiyan khaali thi` : ` · A ka aakhri kaam ${s2(st.A.last)} par poora`}`);
  console.log(`             khidkiyon ne kaam kiya ${s2(st.busy)} (do khidki × ${s2(RUN)} = ${s2(2 * RUN)} mein se)${st.wasted ? ` · usme se bekaar kaam: ${st.wasted} requests (${s2(st.wasted * WORK)})` : ''}`);
}

(async () => {
  const modes = args.mode ? [args.mode] : Object.keys(NAMES);
  console.log('partner-api: 2 khidkiyan, har request 500 ms (4 requests/second) · B: har second 1 request, tablet 1.5 s rukta hai · A: 1.00 s par 12 requests ek saath');
  for (const m of modes) {
    if (!NAMES[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(NAMES).join(' | ')}`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
