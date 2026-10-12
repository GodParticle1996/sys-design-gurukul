/* ex0 · SLOW MOTION — tez bhejne wala, dheema kaam karne wala, chhote paimaane par.
   KhanaKart, baarish wali shaam: order-service har 200 ms par ek order line mein daalti hai (5 orders/s).
   dispatch-service line se ek order uthati hai aur rider dhoondhne mein 1 s lagati hai (1 order/s).
   Har second line mein 4 orders badhte hain. Saat tareeke — wahi orders, wahi dispatch — sirf LINE ka niyam badalta hai:
     unbounded     line ki koi hadd nahi · process ki memory mein 20 orders ki line aati hai (slow motion ka niyam)
     ram2x         wahi, par memory dugni: 40 orders
     drop-new      line ki hadd 8 · bhari ho toh naya order chupchaap gira do
     error         line ki hadd 8 · bhari ho toh customer ko turant "abhi nahi" bolo
     drop-oldest   line ki hadd 8 · bhari ho toh sabse purana gira do, naya le lo
     block-server  line ki hadd 8 · bhari ho toh order-service ka handler rukta hai (customers aate rehte hain)
     block         line ki hadd 8 · bhejne wala EK program hai jo sach mein ruk sakta hai (30 orders ki bulk file)
   Line ka code: lib/bounded-queue.js. Asli raftaar par asli crash: node tools/oom.js
   node tools/slowmo.js [--mode unbounded|ram2x|drop-new|error|drop-oldest|block-server|block] */
const { BoundedQueue } = require('../lib/bounded-queue');
const { sleep } = require('../lib/util');
const args = require('./args')();

const GAP = 200;          // har 200 ms par ek naya order
const WORK = 1000;        // dispatch-service ko ek order par 1 s
const FIRST_PICK = 100;   // dispatch-service 0.1 s, 1.1 s, 2.1 s … par agla order uthati hai
const N = 30, RUN = 6000; // hadd wale tareeke: 30 orders, 6 second
const MODES = {
  unbounded:      { name: 'line ki koi hadd nahi · process ki memory mein 20 orders ki line aati hai', cap: Infinity, policy: 'block', ram: 20, show: [0, 1100] },
  ram2x:          { name: 'line ki koi hadd nahi · memory dugni: 40 orders ki line aati hai', cap: Infinity, policy: 'block', ram: 40 },
  'drop-new':     { name: 'line ki hadd 8 · bhari ho toh naya order chupchaap gira do (drop-new)', cap: 8, policy: 'drop-new', show: [1800, 3100] },
  error:          { name: 'line ki hadd 8 · bhari ho toh customer ko turant "abhi nahi" bolo (error)', cap: 8, policy: 'error', show: [1800, 3100] },
  'drop-oldest':  { name: 'line ki hadd 8 · bhari ho toh sabse purana order gira do (drop-oldest)', cap: 8, policy: 'drop-oldest', show: [1800, 3100] },
  'block-server': { name: 'line ki hadd 8 · bhari ho toh order-service ka handler rukta hai (block) — customers aate rehte hain', cap: 8, policy: 'block', wait: 'many', show: [1800, 3100] },
  block:          { name: 'line ki hadd 8 · bhejne wala EK program hai jo ruk sakta hai (block) — 30 orders ki bulk file', cap: 8, policy: 'block', wait: 'one', show: [1800, 4100] },
};

const s1 = ms => (ms / 1000).toFixed(1) + ' s';
const snap = ms => Math.round(ms / 100) * 100;                       // ghadi ko 0.1 s par gol karo
const ids = a => {                                                   // [11,13,14,15,16] → "#11 · #13–#16"
  const out = [];
  for (let i = 0; i < a.length; i++) { let j = i; while (a[j + 1] === a[j] + 1) j++; out.push(j > i ? `#${a[i]}–#${a[j]}` : `#${a[i]}`); i = j; }
  return out.join(' · ');
};
/* table: har khaana apne heading jitna chauda, daayein se seedha */
function table(heads, rows) {
  console.log('   ' + heads.join('   '));
  rows.forEach(r => console.log('   ' + r.map((v, i) => String(v).padStart(heads[i].length)).join('   ')));
}

async function run(mode) {
  const M = MODES[mode];
  const q = new BoundedQueue({ cap: M.cap, policy: M.policy });
  const t0 = Date.now(), now = () => Date.now() - t0, until = ms => sleep(Math.max(0, t0 + ms - Date.now()));
  let arrived = 0, entered = 0, told = 0, working = null, crash = null, stop = false;
  const riders = [], picks = [], gone = [], rows = [], events = [];
  const say = text => events.push({ t: snap(now()), text });
  const fill = () => `${q.items.length}/${M.cap}`;

  /* ---- bhejne wala: order #k ko line mein daalna ---- */
  async function send(k) {
    arrived++;
    const order = { k, at: now() };
    if (M.wait) {                                                            // block: jagah banne tak yahin ruko
      const who = M.wait === 'one' ? `bhejne wala #${k} dena chahta hai` : `#${k} aaya`;
      if (q.full) say(`${who} → line bhari (${fill()}) → ${M.wait === 'one' ? 'bhejne wala RUK gaya' : 'handler RUK gaya · customer ka phone "Placing order…"'}`);
      const asked = now(), wasFull = q.full;
      await q.put(order);
      if (stop) return;
      entered++;
      say(wasFull ? `#${k} line mein gaya (${s1(snap(now() - asked))} ruk ke) → line ${fill()}` : `${M.wait === 'one' ? `bhejne wale ne #${k} diya` : `#${k} aaya`} → line ${fill()}${q.full ? ' — BHARI' : ''}`);
      return;
    }
    const head = q.items[0], before = q.dropped, wasFull = q.full, was = fill();
    const ok = q.offer(order);
    if (!ok) { told++; say(`#${k} aaya → line bhari (${was}) → customer ko turant "abhi nahi" (paisa nahi kata)`); return; }
    if (q.dropped > before && M.policy === 'drop-new') { gone.push(k); say(`#${k} aaya → line bhari (${was}) → #${k} chupchaap gira · customer ko phir bhi "order confirm"`); return; }
    if (q.dropped > before) { gone.push(head.k); say(`#${k} aaya → line bhari (${was}) → sabse purana #${head.k} chupchaap gira, #${k} andar`); }
    else say(`#${k} aaya → line ${M.ram ? q.items.length : fill()}${!wasFull && q.full ? ' — BHARI' : ''}`);
    entered++;
    if (M.ram && q.items.length > M.ram) { crash = { at: snap(now()), k, line: q.items.length }; stop = true; }
  }
  const senders = (async () => {
    for (let k = 1; !stop && (M.ram || k <= N); k++) {
      await until((k - 1) * GAP);
      if (stop) break;
      if (M.wait === 'one') await send(k);                                   // ek hi bhejne wala: pichhla order andar jaaye, tab agla
      else send(k);                                                          // har order ka apna handler
    }
  })();

  /* ---- kaam karne wala: dispatch-service ---- */
  const worker = (async () => {
    for (let n = 0; !stop; n++) {
      await until(FIRST_PICK + n * WORK);
      if (stop) break;
      const done = working;
      if (done) riders.push(done.k);                                         // pichhle order ko rider mil gaya
      working = q.take() || null;
      if (working) {
        const age = snap(now() - working.at);
        picks.push({ k: working.k, age });
        say(`dispatch-service: ${done ? `#${done.k} ko rider mil gaya · ` : ''}#${working.k} uthaya (${s1(age)} se khada tha) → line ${M.ram ? q.items.length : fill()}`);
      }
    }
  })();

  /* ---- har second ka haal (x.9 s par) ---- */
  const sampler = (async () => {
    for (let n = 1; !stop; n++) {
      await until(n * 1000 - 100);
      if (stop) break;
      const head = q.items[0];
      rows.push({ t: n * 1000 - 100, arrived, entered, told, riders: riders.length, line: q.items.length, waiting: q.waiting.length, dropped: q.dropped, headAge: head ? snap(now() - head.at) : 0 });
      if (!M.ram && n * 1000 >= RUN) { await until(RUN); stop = true; }
    }
  })();
  await sampler;                                                             // (block mein ruka hua bhejne wala ruka hi rehta hai — run yahin khatam)
  await worker;
  senders.catch(() => {});

  /* ---------- chhapai ---------- */
  console.log(`\n=== ${M.name} ===`);
  if (M.show) {
    console.log(`   ek-ek ghatna, ${s1(M.show[0])} se ${s1(M.show[1])} tak:`);
    events.filter(e => e.t >= M.show[0] && e.t <= M.show[1]).forEach(e => console.log(`   ${s1(e.t).padStart(6)}  ${e.text}`));
    console.log('   har second ka haal:');
  }
  const wait = L => `~${(L + 1.2).toFixed(1)} s baad`;                       // abhi aaye order ko rider: L aage wale + khud ka uthna + 1 s kaam
  const old = r => s1(r.headAge) + ' se khada';
  if (M.ram) {
    table(['   pal', 'aaye', '"confirm" bola', 'line mein', 'rider mila', 'line ka sabse purana', 'abhi aaye order ko rider'],
      rows.map(r => [s1(r.t), r.arrived, r.entered, r.line, r.riders, old(r), wait(r.line)]));
    console.log(`   ${s1(crash.at).padStart(6)}   #${crash.k} aaya → line ${crash.line} · memory mein jagah sirf ${M.ram} ki → 💥 process CRASH (out of memory)`);
    console.log(`   nateeja → "confirm" bola: ${entered} · rider mila: ${riders.length} · gayab: ${entered - riders.length} (line ke ${crash.line} + jis par kaam chal raha tha ${working ? 1 : 0})`);
    return;
  }
  const last = rows[rows.length - 1];
  if (M.wait === 'many') {
    table(['   pal', 'aaye', 'line mein', 'handler ruke hue (customer ka spinner)', 'rider mila'], rows.map(r => [s1(r.t), r.arrived, r.line, r.waiting, r.riders]));
    console.log(`   nateeja → gire: 0 · line mein: ${last.line} · par ${last.waiting} customers ka phone "Placing order…" par atka hai, aur yeh ginti har second ${rows[4].waiting - rows[3].waiting} badh rahi hai`);
    console.log('             bina hadd ki line wapas aa gayi — bas ek kadam peeche: line se nikal ke order-service ke andar');
  } else if (M.wait === 'one') {
    table(['   pal', 'line mein daale', 'line mein', '          bhejne wala', 'rider mila'], rows.map(r => [s1(r.t), r.entered, r.line, r.waiting ? 'RUKA hua (line bhari)' : 'chal raha', r.riders]));
    console.log(`   nateeja → line mein daale: ${last.entered} · gire: 0 · ruka hua: sirf bhejne wala khud · baaki ${N - last.entered} orders file mein hi hain — na gire, na kho gaye`);
    console.log(`             bhejne wale ki raftaar: pehle 5 orders/s, line bharne ke baad ${rows[5].entered - rows[4].entered} order/s — dispatch-service ki raftaar`);
  } else {
    const isErr = M.policy === 'error';
    table(['   pal', 'aaye', '"confirm" bola', 'line mein', isErr ? '"abhi nahi" bola' : 'chupchaap gire', 'rider mila', 'line ka sabse purana'],
      rows.map(r => [s1(r.t), r.arrived, r.arrived - r.told, r.line, isErr ? r.told : r.dropped, r.riders, old(r)]));
    console.log(`   dispatch-service ne jo order uthaya, woh kitni der se khada tha: ${picks.map(p => `#${p.k} ${s1(p.age)}`).join(' · ')}`);
    if (isErr) {
      console.log(`   nateeja → "confirm" bola: ${last.arrived - last.told} (${last.riders} ko rider mila, 1 par kaam chal raha, ${last.line} line mein) · "abhi nahi" bola: ${last.told} — turant, paisa kaatne se pehle · chupchaap gire: 0`);
    } else {
      console.log(`   gire: ${ids(gone)}`);
      console.log(`   nateeja → "confirm" bola: ${last.arrived} · rider mila ya milega: ${last.arrived - last.dropped} (${last.riders} ko mila, 1 par kaam chal raha, ${last.line} line mein) · chupchaap gire: ${last.dropped} · process zinda`);
    }
  }
}

(async () => {
  const modes = args.mode ? [args.mode] : Object.keys(MODES);
  console.log('order-service: har 200 ms par ek order (5 orders/s) · dispatch-service: ek order par 1 s (1 order/s) · line har second 4 badhti hai');
  for (const m of modes) {
    if (!MODES[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(MODES).join(' | ')}`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
