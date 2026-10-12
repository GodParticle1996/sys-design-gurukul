/* =====================================================================
   System Gurukul — Concept diagrams

   Har level ka ek signature visual. `VISUALS[levelId]` ya `stage.visual`
   se uthaya jaata . gallery.html sab ek saath dikhata hai.

   ⚠️ APPEND-SAFE STYLE: yeh ek flat object literal NAHI hai. Har diagram
   apni alag `VISUALS['id'] = {...};` assignment hai, isliye naya diagram
   file ke AAKHIR mein chipka do — beech mein ghusane ki zaroorat nahi
   (aur galti se kisi doosre diagram ke andar nest hone ka khatra nahi).

   Shape:  VISUALS['level-id'] = { t: 'Title', html: `...` };
   Hotspot stages ke liye elements par data-hs="targetId" lagao.
   ===================================================================== */

const VISUALS = {};

/* =====================================================================
   TRACK 1 — Foundations: Request ka Safar
   ===================================================================== */

VISUALS['lifecycle'] = {
  t: 'Ek request ki poori zindagi — client se DB tak aur wapas',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung" data-hs="dns"><span class="lv">1</span><span class="cmd">DNS lookup</span><span class="q">~20 ms (cached: 0)</span></div>
      <div class="dg-rung" data-hs="tls"><span class="lv">2</span><span class="cmd">TCP + TLS handshake</span><span class="q">~80 ms (keep-alive: 0)</span></div>
      <div class="dg-rung g" data-hs="cdn"><span class="lv">3</span><span class="cmd">CDN edge</span><span class="q">HIT = yahin khatam ⚡</span></div>
      <div class="dg-rung" data-hs="lb"><span class="lv">4</span><span class="cmd">Load balancer</span><span class="q">~1 ms · TLS terminate</span></div>
      <div class="dg-rung a" data-hs="gateway"><span class="lv">5</span><span class="cmd">API gateway</span><span class="q">auth · rate limit · routing</span></div>
      <div class="dg-rung" data-hs="app"><span class="lv">6</span><span class="cmd">Service (app code)</span><span class="q">~5 ms CPU</span></div>
      <div class="dg-rung g" data-hs="cache"><span class="lv">7</span><span class="cmd">Cache (Redis)</span><span class="q">HIT = yahin khatam ⚡ ~1 ms</span></div>
      <div class="dg-rung" data-hs="pool"><span class="lv">8</span><span class="cmd">DB connection pool</span><span class="q">⏳ yahan QUEUE banti hai</span></div>
      <div class="dg-rung" data-hs="db"><span class="lv">9</span><span class="cmd">Database</span><span class="q">~5–20 ms (ya 8 second 😱)</span></div>
    </div>

    <div class="dg-rule"></div>

    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">⚡ Jitna JALDI ruk jao, utna sasta</span>
        <div class="dg-stack">
          <div class="dg-node is-good"><span class="ni">🌍</span><span class="nl">CDN par ruka</span><span class="ns">~20 ms · 0 server cost</span></div>
          <div class="dg-node is-accent"><span class="ni">🧠</span><span class="nl">Cache par ruka</span><span class="ns">~30 ms · 0 DB cost</span></div>
          <div class="dg-node is-gold"><span class="ni">🗄️</span><span class="nl">DB tak gaya</span><span class="ns">~60 ms · poora cost</span></div>
          <div class="dg-node is-bad"><span class="ni">⏳</span><span class="nl">Pool ke queue mein atka</span><span class="ns">~10 s · timeout</span></div>
        </div>
        <div class="dg-cap">Har layer ka ek hi kaam hai: <b>agli layer tak jaane se rokna</b>.</div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">🧭 Design karte waqt yeh poochho</span>
        <div class="dg-col">
          <div class="dg-node"><span class="nl">Yeh request kahan-kahan ruk sakti hai?</span></div>
          <div class="dg-node"><span class="nl">Har hop par kya fail ho sakta hai?</span></div>
          <div class="dg-node"><span class="nl">Sabse dheema hop kaunsa hai?</span></div>
          <div class="dg-node"><span class="nl">Kaunsa hop QUEUE banata hai?</span></div>
        </div>
        <div class="dg-cap">Aakhri sawaal sabse zaroori hai — <b>outage hamesha queue se aata hai</b>,
          CPU se nahi.</div>
      </div>
    </div>`,
};

VISUALS['boundaries'] = {
  t: 'Kahan auth, kahan cache, kahan rate limit — har cheez ki apni jagah',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">📱 Client</span><span class="dg-arrow"></span>
      <span class="dg-pill acc" data-hs="cdn">🌍 CDN</span><span class="dg-arrow"></span>
      <span class="dg-pill gold" data-hs="gateway">🚪 Gateway</span><span class="dg-arrow"></span>
      <span class="dg-pill" data-hs="service">⚙️ Service</span><span class="dg-arrow"></span>
      <span class="dg-pill good" data-hs="db">🗄️ DB</span>
    </div>

    <div class="dg-grid" style="margin-top:12px">
      <div class="dg-node is-accent" data-hs="cdn"><span class="ni">🌍</span><span class="nl">CDN</span>
        <span class="ns">public, immutable cheezein<br>images · JS · public API GET</span></div>
      <div class="dg-node is-gold" data-hs="gateway"><span class="ni">🚪</span><span class="nl">Gateway</span>
        <span class="ns">AuthN (tum kaun ho?)<br>rate limit · routing · TLS</span></div>
      <div class="dg-node" data-hs="service"><span class="ni">⚙️</span><span class="nl">Service</span>
        <span class="ns">AuthZ (tum yeh kar sakte ho?)<br>business rules · app cache</span></div>
      <div class="dg-node is-good" data-hs="db"><span class="ni">🗄️</span><span class="nl">DB</span>
        <span class="ns">constraints · transactions<br>row-level rules</span></div>
    </div>

    <div class="dg-rule"></div>

    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Galat jagah</span>
        <div class="dg-stack">
          <div class="dg-node is-bad"><span class="nl">Service mein rate limit</span>
            <span class="ns">request pehle hi andar aa chuki — thread, connection, memory sab kharch ho gaya</span></div>
          <div class="dg-node is-bad"><span class="nl">Gateway mein AuthZ</span>
            <span class="ns">gateway ko har resource ke business rules pata karne padenge — woh scale nahi karta</span></div>
          <div class="dg-node is-bad"><span class="nl">Per-user data CDN par</span>
            <span class="ns">ek user ka balance doosre ko dikh jaayega 💀</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Sahi usool</span>
        <div class="dg-stack">
          <div class="dg-node is-good"><span class="nl">Reject jitna BAAHAR ho sake</span>
            <span class="ns">har layer andar aana mehenga karti hai</span></div>
          <div class="dg-node is-good"><span class="nl">Cache utna BAAHAR jitna data public ho</span>
            <span class="ns">public → CDN · per-user → app cache · kabhi mismatch mat karo</span></div>
          <div class="dg-node is-good"><span class="nl">AuthN baahar, AuthZ andar</span>
            <span class="ns">"kaun ho" gateway jaanta hai, "kya kar sakte ho" service jaanti hai</span></div>
        </div>
      </div>
    </div>`,
};

VISUALS['latency'] = {
  t: 'p50 jhoot bolta hai — tail latency hi asli anubhav hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">📉 Average ka dhokha</span>
        <div class="dg-col">
          <div class="dg-node"><span class="nl">100 requests</span>
            <span class="ns">99 requests: 10 ms<br>1 request: 5,000 ms</span></div>
          <div class="dg-node is-gold"><span class="nl">average = 59 ms</span>
            <span class="ns">"sab theek hai!" 😊</span></div>
          <div class="dg-node is-bad"><span class="nl">p99 = 5,000 ms</span>
            <span class="ns">har 100 mein se 1 user ka 5 second barbaad 😡</span></div>
        </div>
        <div class="dg-cap">Average outliers ko <b>chhupata</b> hai. Percentile unhe <b>dikhata</b> hai.
          Isliye dashboards par hamesha p50 + p95 + p99 — kabhi sirf average nahi.</div>
      </div>

      <div class="dg-box is-accent"><span class="bx-label">🧮 Tail amplification</span>
        <div class="dg-col">
          <div class="dg-node" data-hs="one"><span class="nl">1 service call</span>
            <span class="ns">p99 = 1% requests dheemi</span></div>
          <div class="dg-node is-gold" data-hs="ten"><span class="nl">10 parallel calls</span>
            <span class="ns">1 − 0.99¹⁰ = <b>9.6%</b> requests dheemi</span></div>
          <div class="dg-node is-bad" data-hs="hundred"><span class="nl">100 parallel calls</span>
            <span class="ns">1 − 0.99¹⁰⁰ = <b>63%</b> requests dheemi 💀</span></div>
        </div>
        <div class="dg-cap">Microservices ka sabse chhupa hua tax: har extra call tumhare
          <b>p99 ko p50 banata jaata hai</b>. Isiliye fan-out limit karo.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend"><span class="dg-pill acc" data-hs="numbers">📏 YAAD RAKHNE LAAYAK NUMBERS</span></div>
    <div class="dg-ladder" style="margin-top:8px">
      <div class="dg-rung g"><span class="lv">L1</span><span class="cmd">CPU cache reference</span><span class="q">1 ns</span></div>
      <div class="dg-rung g"><span class="lv">RAM</span><span class="cmd">Main memory read</span><span class="q">100 ns</span></div>
      <div class="dg-rung"><span class="lv">SSD</span><span class="cmd">Random read</span><span class="q">100 µs = 0.1 ms</span></div>
      <div class="dg-rung"><span class="lv">NET</span><span class="cmd">Same datacenter round trip</span><span class="q">0.5 ms</span></div>
      <div class="dg-rung a"><span class="lv">DB</span><span class="cmd">Simple indexed query</span><span class="q">1–5 ms</span></div>
      <div class="dg-rung a"><span class="lv">🌐</span><span class="cmd">India → US round trip</span><span class="q">150 ms</span></div>
      <div class="dg-rung"><span class="lv">💿</span><span class="cmd">Disk seek (spinning)</span><span class="q">10 ms</span></div>
    </div>
    <div class="dg-cap">Inhe ratna nahi hai — bas <b>order of magnitude</b> yaad rahe.
      "Memory se padhna ~1000x sasta hai disk se" — itna kaafi hai design decisions ke liye.</div>`,
};

VISUALS['estimation'] = {
  t: 'Back-of-the-envelope — andaza nahi, hisaab',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc" data-hs="users">12,00,000 users/din</span>
      <span class="dg-arrow"></span>
      <span class="dg-pill" data-hs="rps">÷ 86,400 s</span>
      <span class="dg-arrow"></span>
      <span class="dg-pill gold" data-hs="avg">≈ 14 rps average</span>
      <span class="dg-arrow"></span>
      <span class="dg-pill bad" data-hs="peak">× 3 peak = 42 rps</span>
    </div>
    <div class="dg-cap" style="margin-top:8px">⚠️ Design hamesha <b>peak</b> ke liye karo. Average ke liye
      design karoge toh har roz shaam 8 baje system girega.</div>

    <div class="dg-rule"></div>

    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🔢 3 numbers, sab kuch nikal aata hai</span>
        <div class="dg-stack">
          <div class="dg-node is-accent"><span class="nl">1 din = 86,400 s</span>
            <span class="ns">≈ 10⁵ — round kar lo, easy math</span></div>
          <div class="dg-node is-accent"><span class="nl">1 million/din ≈ 12 rps</span>
            <span class="ns">iski madad se sab kuch guess ho jaata hai</span></div>
          <div class="dg-node is-accent"><span class="nl">Peak = average × 2–5</span>
            <span class="ns">consumer app? 3x lo. Flash sale? 50x.</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">📦 Storage ka formula</span>
        <div class="dg-col">
          <div class="dg-node"><span class="nl">rps × bytes × seconds</span>
            <span class="ns">14 × 2 KB × 86,400 = 2.4 GB/din</span></div>
          <div class="dg-node is-gold"><span class="nl">× 365</span>
            <span class="ns">= 880 GB/saal</span></div>
          <div class="dg-node is-bad"><span class="nl">× 3 (replication)</span>
            <span class="ns">= 2.6 TB — <b>yeh number budget meeting mein chahiye</b></span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="little">LITTLE'S LAW: L = λ × W</span>
      <span>concurrency = arrival rate × service time.
        500 rps × 20 ms = <b>10 requests ek saath andar</b> — matlab 10 connections chahiye, 500 nahi.</span>
    </div>
    <div class="dg-cap">Yeh ek formula tumhe bata deta hai ki pool kitna bada ho, thread kitne hon,
      aur kab woh <b>bharne</b> waala hai. Poore Resilience track ki neev yahi hai.</div>`,
};

VISUALS['syncasync'] = {
  t: 'Sync vs Async — kab rukna hai, kab "baad mein" bolna hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🐌 SAB KUCH SYNC (order place karna)</span>
        <div class="dg-ladder">
          <div class="dg-rung"><span class="lv">1</span><span class="cmd">order DB mein likho</span><span class="q">20 ms</span></div>
          <div class="dg-rung"><span class="lv">2</span><span class="cmd">payment charge karo</span><span class="q">400 ms</span></div>
          <div class="dg-rung a"><span class="lv">3</span><span class="cmd">confirmation email bhejo</span><span class="q">800 ms</span></div>
          <div class="dg-rung a"><span class="lv">4</span><span class="cmd">warehouse ko batao</span><span class="q">300 ms</span></div>
          <div class="dg-rung a"><span class="lv">5</span><span class="cmd">analytics event bhejo</span><span class="q">200 ms</span></div>
          <div class="dg-rung"><span class="lv">6</span><span class="cmd">invoice PDF banao</span><span class="q">1,500 ms</span></div>
        </div>
        <div class="dg-cap"><b>User 3.2 second ruka.</b> Aur agar email service down hai toh
          <b>order hi fail ho gaya</b> — jabki order toh ban chuka tha!</div>
      </div>

      <div class="dg-box is-good"><span class="bx-label">⚡ SAHI BATWARA</span>
        <div class="dg-ladder">
          <div class="dg-rung g" data-hs="sync"><span class="lv">SYNC</span><span class="cmd">order likho + payment</span><span class="q">420 ms → 201 Created</span></div>
          <div class="dg-rung" data-hs="async"><span class="lv">→Q</span><span class="cmd">email · warehouse · analytics · PDF</span><span class="q">queue mein daal do</span></div>
        </div>
        <div class="dg-cap" style="margin-top:10px">User <b>420 ms</b> mein free.
          Email service down? Message queue mein pada rahega, baad mein chala jaayega.
          <b>Order tab bhi safal hai.</b></div>
        <div class="dg-rule"></div>
        <div class="dg-node is-good"><span class="nl">Sync mein SIRF woh jo</span>
          <span class="ns">(a) user ke jawab ke liye zaroori ho, YA<br>(b) fail hone par poora kaam radd karna pade</span></div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="trap">⚠️ JAAL</span>
      <span>Async ka matlab "gaya hi nahi" nahi hota. Ab tumhe chahiye:
        <b>retry</b>, <b>DLQ</b>, <b>idempotent consumer</b>, aur user ko batane ka tareeka ki kaam
        abhi <i>chal raha hai</i>. Async ne latency ka problem hataya aur
        <b>consistency ka problem de diya</b>.</span>
    </div>`,
};

VISUALS['fanout'] = {
  t: 'Fan-out / fan-in — parallel calls ka chhupa hua tax',
  html: `
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🌿 FAN-OUT (product page)</span>
        <div class="dg-col">
          <div class="dg-node is-accent"><span class="ni">📄</span><span class="nl">GET /product/42</span></div>
        </div>
        <div class="dg-grid" style="margin-top:8px">
          <div class="dg-node"><span class="nl">catalog</span><span class="ns">p99 40 ms</span></div>
          <div class="dg-node"><span class="nl">pricing</span><span class="ns">p99 60 ms</span></div>
          <div class="dg-node"><span class="nl">inventory</span><span class="ns">p99 90 ms</span></div>
          <div class="dg-node"><span class="nl">reviews</span><span class="ns">p99 120 ms</span></div>
          <div class="dg-node"><span class="nl">recommend</span><span class="ns">p99 200 ms</span></div>
        </div>
        <div class="dg-cap" style="margin-top:8px">Parallel bhejo toh total = <b>sabse dheeme</b> ka time = 200 ms.
          Serial bhejo toh <b>sum</b> = 510 ms. Parallel hamesha behtar — par…</div>
      </div>

      <div class="dg-box is-bad"><span class="bx-label">💀 …tail amplification</span>
        <div class="dg-col">
          <div class="dg-node is-bad" data-hs="tail"><span class="nl">P(koi ek slow) = 1 − 0.99⁵</span>
            <span class="ns">= <b>4.9%</b> — ek call ka 1% paanch ka 5% ban gaya</span></div>
          <div class="dg-node is-gold" data-hs="fewer"><span class="nl">Ilaaj 1: kam calls</span>
            <span class="ns">5 calls → 2 calls (batch/aggregate endpoint)</span></div>
          <div class="dg-node is-good"><span class="nl">Ilaaj 2: optional ko async</span>
            <span class="ns">reviews & recommendations page load ke BAAD lao</span></div>
          <div class="dg-node is-good"><span class="nl">Ilaaj 3: hedged request</span>
            <span class="ns">p95 par doosri copy bhejo, jo pehle aaye woh lo</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="fanin">🔀 FAN-IN</span>
      <span>Ulta problem: 1000 workers ek hi DB row par likh rahe hain →
        <b>lock contention</b>. Ilaaj: partition karo (per-user counter),
        ya batch karo (1 second ke updates jodo, ek hi write).</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="timeout">⏱️ NIYAM</span>
      <span>Har fan-out call par <b>timeout</b> chahiye — aur woh timeout tumhare
        apne SLO se CHHOTA hona chahiye. Warna ek dheemi dependency tumhara poora
        p99 apne saath le doobegi.</span>
    </div>`,
};

VISUALS['decompose'] = {
  t: 'Service decomposition — ek service kab kaafi hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ MONOLITH (2–20 engineers)</span>
        <div class="dg-col">
          <div class="dg-node is-good"><span class="ni">📦</span><span class="nl">Ek deploy</span>
            <span class="ns">local function call = 0.001 ms<br>ek transaction, ek DB, ACID muft</span></div>
          <div class="dg-node is-good"><span class="nl">Refactor sasta hai</span>
            <span class="ns">boundary galat nikli? bas file move karo</span></div>
        </div>
        <div class="dg-cap">Shuru mein boundaries <b>pata hi nahi</b> hoti.
          Monolith mein galat boundary ki keemat = ek refactor.
          Microservices mein = ek migration project.</div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">⚠️ MICROSERVICES ki asli keemat</span>
        <div class="dg-stack">
          <div class="dg-node is-bad"><span class="nl">function call → network call</span>
            <span class="ns">0.001 ms → 5 ms, aur ab woh FAIL ho sakti hai</span></div>
          <div class="dg-node is-bad"><span class="nl">transaction → saga</span>
            <span class="ns">ROLLBACK ka option khatm — ab compensating actions likho</span></div>
          <div class="dg-node is-bad"><span class="nl">JOIN → API composition</span>
            <span class="ns">ek query 4 calls + app mein merge ban gayi</span></div>
          <div class="dg-node is-bad"><span class="nl">stack trace → distributed trace</span>
            <span class="ns">debugging ka poora naya tooling chahiye</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend"><span class="dg-pill acc" data-hs="when">🔪 SPLIT KAB KARO — 4 asli wajahein</span></div>
    <div class="dg-ladder" style="margin-top:8px">
      <div class="dg-rung g" data-hs="team"><span class="lv">1</span><span class="cmd">Team ownership</span><span class="q">alag team, alag release cycle</span></div>
      <div class="dg-rung g" data-hs="scale"><span class="lv">2</span><span class="cmd">Alag scaling shape</span><span class="q">search ko 40 machine chahiye, billing ko 2</span></div>
      <div class="dg-rung g" data-hs="blast"><span class="lv">3</span><span class="cmd">Blast radius</span><span class="q">recommendation gire toh checkout na gire</span></div>
      <div class="dg-rung g" data-hs="tech"><span class="lv">4</span><span class="cmd">Alag tech/compliance</span><span class="q">ML Python mein · PCI data alag</span></div>
      <div class="dg-rung"><span class="lv">❌</span><span class="cmd">"Microservices modern hai"</span><span class="q">yeh wajah nahi hai</span></div>
    </div>
    <div class="dg-cap"><b>Sabse zaroori niyam:</b> data ownership. Do services ek hi table par likhein —
      toh woh do services nahi, ek distributed monolith hai (saare nuksaan, koi faayda nahi).</div>`,
};

VISUALS['boss-flow'] = {
  t: 'BOSS — "Notification feature" ka poora flow',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">📱 App</span><span class="dg-arrow"></span>
      <span class="dg-pill gold">🚪 Gateway</span><span class="dg-arrow"></span>
      <span class="dg-pill acc">⚙️ notify-api</span><span class="dg-arrow"></span>
      <span class="dg-pill">📮 Queue</span><span class="dg-arrow"></span>
      <span class="dg-pill good">👷 Workers</span><span class="dg-arrow"></span>
      <span class="dg-pill">📨 FCM/APNs</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-gold"><span class="ni">🚪</span><span class="nl">Gateway</span>
        <span class="ns">AuthN · rate limit<br>(per-user, warna spam)</span></div>
      <div class="dg-node is-accent"><span class="ni">⚙️</span><span class="nl">notify-api</span>
        <span class="ns">validate · dedupe key<br>202 Accepted turant</span></div>
      <div class="dg-node"><span class="ni">📮</span><span class="nl">Queue</span>
        <span class="ns">buffer · retry · DLQ<br>spike yahan smooth hota hai</span></div>
      <div class="dg-node is-good"><span class="ni">👷</span><span class="nl">Workers</span>
        <span class="ns">idempotent send<br>rate limit per provider</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill good">202 ACCEPTED</span>
      <span>200 nahi — <b>202</b>. Kyunki kaam abhi hua nahi hai, sirf <b>maan liya</b> gaya hai.
        Status ke liye ek <code>/notifications/:id</code> do. Yeh chhota sa status code
        poore async design ko client ke saamne imaandaar banata hai.</span>
    </div>`,
};

/* =====================================================================
   TRACK 2 — API Design & Contracts
   ===================================================================== */

VISUALS['naming'] = {
  t: 'Resource naming — URL mein NOUN, method mein VERB',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ RPC-in-a-trenchcoat</span>
        <div class="dg-ladder">
          <div class="dg-rung"><span class="lv">1</span><span class="cmd">POST /getUser?id=5</span><span class="q">GET hona chahiye tha</span></div>
          <div class="dg-rung"><span class="lv">2</span><span class="cmd">POST /createNewOrder</span><span class="q">verb URL mein</span></div>
          <div class="dg-rung"><span class="lv">3</span><span class="cmd">GET /deleteUser/5</span><span class="q">GET se DELETE 💀</span></div>
          <div class="dg-rung"><span class="lv">4</span><span class="cmd">POST /user_orders_list</span><span class="q">snake + plural mix</span></div>
          <div class="dg-rung"><span class="lv">5</span><span class="cmd">GET /api/getAllOrdersForUserById</span><span class="q">…</span></div>
        </div>
        <div class="dg-cap">Har endpoint ek naya <b>aviskaar</b> hai. Client ko har baar
          documentation kholni padti hai — kyunki guess karna namumkin hai.</div>
      </div>

      <div class="dg-box is-good"><span class="bx-label">✅ Predictable resources</span>
        <div class="dg-ladder">
          <div class="dg-rung g"><span class="lv">GET</span><span class="cmd">/users/5</span><span class="q">ek user</span></div>
          <div class="dg-rung g"><span class="lv">GET</span><span class="cmd">/users/5/orders</span><span class="q">uske orders</span></div>
          <div class="dg-rung g"><span class="lv">POST</span><span class="cmd">/orders</span><span class="q">naya order</span></div>
          <div class="dg-rung g"><span class="lv">PATCH</span><span class="cmd">/orders/812</span><span class="q">badlo</span></div>
          <div class="dg-rung g"><span class="lv">DEL</span><span class="cmd">/orders/812</span><span class="q">hatao</span></div>
        </div>
        <div class="dg-cap">Ek baar pattern samajh liya toh client <b>baaki sab guess</b>
          kar sakta hai. Yahi achhi API ki asli pehchaan hai.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend"><span class="dg-pill acc" data-hs="rules">📏 CHHOTE NIYAM, BADA FARAK</span></div>
    <div class="dg-grid" style="margin-top:8px">
      <div class="dg-node is-good" data-hs="plural"><span class="ni">🔤</span><span class="nl">Plural nouns</span>
        <span class="ns">/orders — /order nahi<br>collection + item ek jaise dikhein</span></div>
      <div class="dg-node is-good" data-hs="nest"><span class="ni">🪆</span><span class="nl">Nesting 2 level tak</span>
        <span class="ns">/users/5/orders ✅<br>/users/5/orders/9/items/3/tax ❌</span></div>
      <div class="dg-node is-good" data-hs="kebab"><span class="ni">➖</span><span class="nl">kebab-case paths</span>
        <span class="ns">/shipping-addresses<br>(JSON body mein snake_case ya camelCase — bas consistent)</span></div>
      <div class="dg-node is-gold" data-hs="action"><span class="ni">⚡</span><span class="nl">Actions jo noun nahi hain</span>
        <span class="ns">POST /orders/812/cancel<br>sab CRUD nahi ban sakta — thoda pragmatic raho</span></div>
    </div>`,
};

VISUALS['verbs'] = {
  t: 'Verbs & status codes — safe, idempotent, ya na dono',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">GET</span><span class="cmd">safe ✅ · idempotent ✅</span><span class="q">kuch badalta nahi — cache/retry dono safe</span></div>
      <div class="dg-rung a"><span class="lv">PUT</span><span class="cmd">safe ❌ · idempotent ✅</span><span class="q">poora replace — 5 baar bhejo, wahi natija</span></div>
      <div class="dg-rung a"><span class="lv">DEL</span><span class="cmd">safe ❌ · idempotent ✅</span><span class="q">dobara delete = pehle se hi gaya hua</span></div>
      <div class="dg-rung"><span class="lv">PATCH</span><span class="cmd">safe ❌ · idempotent ⚠️</span><span class="q">"+1 karo" idempotent nahi; "value = 5" hai</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">POST</span><span class="cmd">safe ❌ · idempotent ❌</span><span class="q">isi liye Idempotency-Key chahiye</span></div>
    </div>
    <div class="dg-cap" style="margin-top:8px">
      <b>Safe</b> = kuch badalta nahi. <b>Idempotent</b> = N baar bhejo, asar ek baar jaisa.
      Yeh do shabd interview mein sahi bolna bada farak laata hai.</div>

    <div class="dg-rule"></div>

    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Status codes jo kaam ke hain</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="c200"><span class="nl">200 / 201 / 202 / 204</span>
            <span class="ns">OK · Created (+Location) · Accepted (async!) · No Content</span></div>
          <div class="dg-node is-accent" data-hs="c400"><span class="nl">400 / 401 / 403 / 404</span>
            <span class="ns">galat request · kaun ho? · nahi kar sakte · hai hi nahi</span></div>
          <div class="dg-node is-gold" data-hs="c409"><span class="nl">409 / 422 / 429</span>
            <span class="ns">conflict · samajh aaya par galat · bahut maara</span></div>
          <div class="dg-node is-bad" data-hs="c500"><span class="nl">500 / 502 / 503 / 504</span>
            <span class="ns">mera bug · upstream kharab · main bhara hoon · upstream timeout</span></div>
        </div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">❌ Woh galtiyan jo mehengi padti hain</span>
        <div class="dg-stack">
          <div class="dg-node is-bad"><span class="nl">Har cheez par 200</span>
            <span class="ns"><code>200 { "error": "not found" }</code><br>ab har client ko body parse karke error dhoondhna padega</span></div>
          <div class="dg-node is-bad"><span class="nl">Overload par 500</span>
            <span class="ns">achhe clients 500 par retry NAHI karte —<br>jabki yahan retry hi sahi tha. 503 bhejo.</span></div>
          <div class="dg-node is-bad"><span class="nl">401 vs 403 ulta</span>
            <span class="ns">401 = "tum kaun ho pata nahi" (login karo)<br>403 = "pata hai, par ijaazat nahi"</span></div>
          <div class="dg-node is-bad"><span class="nl">GET se state badalna</span>
            <span class="ns">crawler, prefetch aur browser CDN sab
              tumhara data mita denge</span></div>
        </div>
      </div>
    </div>`,
};

VISUALS['offset-pain'] = {
  t: 'OFFSET 24,286,400 — database ko 24 million rows padh ke PHENKNI padti hain',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">GET /transactions?page=485728&amp;limit=50</span>
      <span class="dg-arrow"></span>
      <span class="dg-pill bad">LIMIT 50 OFFSET 24,286,350</span>
    </div>

    <div class="dg-ladder" style="margin-top:12px">
      <div class="dg-rung g" data-hs="p1"><span class="lv">1</span><span class="cmd">page=1 → OFFSET 0</span><span class="q">50 rows padhi · 4 ms ⚡</span></div>
      <div class="dg-rung a" data-hs="p100"><span class="lv">100</span><span class="cmd">page=100 → OFFSET 4,950</span><span class="q">5,000 rows padhi · 12 ms 🙂</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)" data-hs="p10k"><span class="lv">10k</span><span class="cmd">page=10000 → OFFSET 499,950</span><span class="q">5 lakh rows padhi · 380 ms 😬</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)" data-hs="p485k"><span class="lv">485k</span><span class="cmd">page=485728 → OFFSET 24,286,350</span><span class="q">2.4 CRORE rows padhi · 7 s 💀</span></div>
    </div>
    <div class="dg-cap" style="margin-top:8px">User ko har baar <b>50</b> rows milti hain.
      Database har baar <b>offset + 50</b> rows padhta hai. Yeh cost user ko dikhti nahi —
      database ko poori dikhti hai.</div>

    <div class="dg-rule"></div>

    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🤔 "Index laga do na?"</span>
        <div class="dg-col">
          <div class="dg-node is-gold" data-hs="index"><span class="ni">🗂️</span><span class="nl">CREATE INDEX ON (created_at)</span>
            <span class="ns">page 1: 12.8 s → 4 ms ✅<br>page 485728: 12.8 s → <b>6.8 s</b> 😐</span></div>
          <div class="dg-node is-bad" data-hs="why"><span class="ni">💡</span><span class="nl">Index SKIP nahi kar sakta</span>
            <span class="ns">woh sirf TEZ WALK karta hai.<br>24M entries chal ke phenkni hi padengi.</span></div>
        </div>
        <div class="dg-cap">Index ne sorting bachaayi — <b>skipping nahi</b>.
          OFFSET ka matlab hi hai "ginti karke aage badho", aur ginti ke liye
          har entry chhuni padti hai.</div>
      </div>

      <div class="dg-box is-bad"><span class="bx-label">💣 Aur bhi bura</span>
        <div class="dg-stack">
          <div class="dg-node is-bad" data-hs="count"><span class="nl">"total": 24286450</span>
            <span class="ns">har request par ek COUNT(*) — apne aap mein 2.7 s</span></div>
          <div class="dg-node is-bad"><span class="nl">Buffer pool trash</span>
            <span class="ns">24M rows cache se sab kuch nikaal denge —<br>baaki SAARI queries dheemi ho jaayengi</span></div>
          <div class="dg-node is-bad"><span class="nl">Replica lag</span>
            <span class="ns">lambi read replica ko peeche kar deti hai</span></div>
          <div class="dg-node is-bad" data-hs="shift"><span class="nl">Data shift = rows gum</span>
            <span class="ns">page 2 dekhte waqt naya row aa gaya?<br>ek row tum <b>kabhi</b> nahi dekhoge</span></div>
        </div>
      </div>
    </div>`,
};

VISUALS['cursor'] = {
  t: 'Cursor / keyset pagination — "jahan chhoda tha, wahin se"',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🐌 OFFSET — "ginti karke aage badho"</span>
        <pre style="font-size:.72rem">SELECT * FROM transactions
ORDER BY created_at DESC
LIMIT 50 OFFSET 24286350;

→ 24,286,400 rows padhi
→ 24,286,350 phenki
→ 50 di</pre>
        <div class="dg-cap">Cost <b>page number ke saath badhta</b> hai.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">⚡ KEYSET — "is point ke baad wale do"</span>
        <pre style="font-size:.72rem">SELECT * FROM transactions
WHERE (created_at, id) &lt; (?, ?)
ORDER BY created_at DESC, id DESC
LIMIT 50;

→ index par 1 SEEK
→ 50 rows padhi
→ 50 di</pre>
        <div class="dg-cap">Cost <b>hamesha same</b> — page 1 ho ya page 4,85,728.</div>
      </div>
    </div>

    <div class="dg-rule"></div>

    <div class="dg-grid">
      <div class="dg-node is-accent" data-hs="tuple"><span class="ni">🔑</span><span class="nl">Tuple comparison</span>
        <span class="ns">(created_at, id) &lt; (?, ?)<br>id tie-breaker hai — bina uske<br>same timestamp wale rows gum ho sakte hain</span></div>
      <div class="dg-node is-accent" data-hs="idx"><span class="ni">🗂️</span><span class="nl">Index MATCH karna chahiye</span>
        <span class="ns">(user_id, created_at, id)<br>filter → sort → tiebreak, isi kram mein</span></div>
      <div class="dg-node is-good" data-hs="opaque"><span class="ni">🎭</span><span class="nl">Cursor OPAQUE ho</span>
        <span class="ns">base64({t, id, dir}) — server banata hai<br>kal query strategy badlo, client na tootein</span></div>
      <div class="dg-node is-gold" data-hs="stable"><span class="ni">📌</span><span class="nl">Stable results</span>
        <span class="ns">naye rows aane par bhi<br>koi row skip ya duplicate nahi hoti</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">⚖️ Cursor ki keemat (imaandaari se)</span>
        <div class="dg-stack">
          <div class="dg-node is-bad"><span class="nl">"Page 500 par jao" nahi ho sakta</span>
            <span class="ns">sirf next/prev. Par transaction history mein<br>kisi ne kabhi page 485728 maanga hi nahi tha.</span></div>
          <div class="dg-node is-bad"><span class="nl">Total count mushkil</span>
            <span class="ns">"1-50 of 24,286,450" nahi mil sakta.<br>Ilaaj: approx count, ya <code>has_more</code> hi dikhao.</span></div>
          <div class="dg-node is-bad"><span class="nl">Random sort par kaam nahi karta</span>
            <span class="ns">sort key <b>unique + stable</b> honi chahiye</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🚚 Legacy API ka migration</span>
        <div class="dg-ladder">
          <div class="dg-rung g"><span class="lv">1</span><span class="cmd">next_cursor bhi bhejo</span><span class="q">page abhi bhi chalta rahe</span></div>
          <div class="dg-rung g"><span class="lv">2</span><span class="cmd">max page depth lagao</span><span class="q">1000 se aage 400</span></div>
          <div class="dg-rung g"><span class="lv">3</span><span class="cmd">deep-page users ko dhoondo</span><span class="q">page depth par metric</span></div>
          <div class="dg-rung g"><span class="lv">4</span><span class="cmd">bade export ko async API do</span><span class="q">sync call nahi, job</span></div>
          <div class="dg-rung g"><span class="lv">5</span><span class="cmd">page hata do</span><span class="q">400 + saaf error</span></div>
        </div>
      </div>
    </div>`,
};

VISUALS['filtering'] = {
  t: 'Filter · sort · sparse fields — har param ek query cost hai',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">✅</span><span class="cmd">?status=pending&amp;merchant=amazon</span><span class="q">saaf, indexable</span></div>
      <div class="dg-rung g"><span class="lv">✅</span><span class="cmd">?created_after=2026-01-01</span><span class="q">range — index ka aakhri column</span></div>
      <div class="dg-rung g"><span class="lv">✅</span><span class="cmd">?sort=-created_at</span><span class="q">minus = descending</span></div>
      <div class="dg-rung g"><span class="lv">✅</span><span class="cmd">?fields=id,amount,status</span><span class="q">sparse — covering index ban sakta hai</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">❌</span><span class="cmd">?filter=amount&gt;100 AND status='x'</span><span class="q">SQL-in-a-querystring 💀</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">❌</span><span class="cmd">?sort=random()</span><span class="q">poori table sort</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">💀 Unbounded query surface</span>
        <div class="dg-col">
          <div class="dg-node is-bad" data-hs="anyfilter"><span class="nl">"Har column par filter allow karo"</span>
            <span class="ns">15 columns = 32,768 combinations<br>tum har ek ke liye index nahi bana sakte</span></div>
          <div class="dg-node is-bad"><span class="nl">Nateeja</span>
            <span class="ns">koi bhi user ek aisi combination dhoondh lega<br>jo full scan karti hai</span></div>
        </div>
        <div class="dg-cap">Yeh wahi bimari hai jo deep pagination ki thi:
          <b>API ne user ko ek mehenga sawaal poochhne DIYA</b>.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Bounded query surface</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="allow"><span class="nl">Allow-list</span>
            <span class="ns">sirf woh filters jinke liye index hai</span></div>
          <div class="dg-node is-good" data-hs="require"><span class="nl">Ek filter zaroori</span>
            <span class="ns">/transactions bina user_id ke = 400<br>tenant-scoped data mein yeh sona hai</span></div>
          <div class="dg-node is-good" data-hs="maxlimit"><span class="nl">max limit + default limit</span>
            <span class="ns">default 20, max 100 — dono chahiye</span></div>
          <div class="dg-node is-good"><span class="nl">Sort bhi allow-list</span>
            <span class="ns">sirf indexed columns par sort</span></div>
        </div>
      </div>
    </div>
    <div class="dg-cap"><b>Design ka usool:</b> har query param ek <b>vaada</b> hai ki tum use
      sasta serve kar sakte ho. Jo vaada nibha na sako, woh param mat do.</div>`,
};

VISUALS['versioning'] = {
  t: 'Versioning — client tumhare saath deploy nahi hota',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ SAFE (non-breaking)</span>
        <div class="dg-stack">
          <div class="dg-node is-good"><span class="nl">Naya optional field add</span><span class="ns">purane clients use ignore karenge</span></div>
          <div class="dg-node is-good"><span class="nl">Naya endpoint add</span><span class="ns">koi purana raasta nahi toota</span></div>
          <div class="dg-node is-good"><span class="nl">Naya optional query param</span><span class="ns">default purana behaviour ho</span></div>
          <div class="dg-node is-good"><span class="nl">Enum mein nayi value</span><span class="ns">⚠️ tabhi safe jab clients unknown values handle karte hon</span></div>
        </div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">❌ BREAKING</span>
        <div class="dg-stack">
          <div class="dg-node is-bad"><span class="nl">Field hataana ya rename</span><span class="ns">purana client turant crash</span></div>
          <div class="dg-node is-bad"><span class="nl">Type badalna</span><span class="ns"><code>"5"</code> → <code>5</code> bhi breaking hai</span></div>
          <div class="dg-node is-bad"><span class="nl">Field ko required banana</span><span class="ns">purane requests 400 ho jaayenge</span></div>
          <div class="dg-node is-bad"><span class="nl">Default behaviour badalna</span><span class="ns">sabse chhupa hua breaking change</span></div>
          <div class="dg-node is-bad"><span class="nl">Error format badalna</span><span class="ns">error handling bhi ek contract hai</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-accent" data-hs="url"><span class="ni">🔗</span><span class="nl">/v1/ URL mein</span>
        <span class="ns">✅ browser mein dikhta hai, cache-friendly, debug aasan<br>❌ har resource duplicate karna padta hai</span></div>
      <div class="dg-node is-gold" data-hs="header"><span class="ni">📋</span><span class="nl">Header mein</span>
        <span class="ns">✅ URL saaf rehta hai<br>❌ browser se test nahi kar sakte, CDN cache mushkil</span></div>
      <div class="dg-node is-good" data-hs="never"><span class="ni">🎯</span><span class="nl">Sabse achha: version hi na badlo</span>
        <span class="ns">additive changes karo, purane fields<br>deprecate karo par tod-o mat</span></div>
    </div>
    <div class="dg-cap"><b>Asli baat:</b> v2 banana aasan hai; v1 ko <b>hamesha</b> chalate rehna
      mehenga hai. Har version ek naya maintenance boj hai — isliye pehle poochho ki
      change ko additive banaya ja sakta hai ya nahi.</div>`,
};

VISUALS['errors'] = {
  t: 'Error contract — machine bhi padh sake, insaan bhi',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Jo aksar milta hai</span>
        <pre style="font-size:.72rem">200 OK
{ "error": "something went wrong" }

500
"Internal Server Error"

400
{ "msg": "invalid", "code": 7 }</pre>
        <div class="dg-cap">Client kya kare? Retry? User ko kya dikhaye? Kaunsa field galat tha?
          <b>Kuch pata nahi.</b> Aur har endpoint ka format alag hai.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ RFC 9457 — problem details</span>
        <pre style="font-size:.72rem">422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "/errors/validation-failed",
  "title": "Validation failed",
  "status": 422,
  "detail": "amount 0 se bada hona chahiye",
  "instance": "/orders/812",
  "trace_id": "abc123",
  "errors": [
    { "field": "amount", "code": "min", "min": 1 }
  ]
}</pre>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend"><span class="dg-pill acc" data-hs="fields">📋 HAR ERROR MEIN YEH HONA CHAHIYE</span></div>
    <div class="dg-grid" style="margin-top:8px">
      <div class="dg-node is-accent" data-hs="code"><span class="ni">🏷️</span><span class="nl">Stable machine code</span>
        <span class="ns"><code>type</code> ya <code>code</code> — client isi par switch karega.<br>Message badal sakta hai, code kabhi nahi.</span></div>
      <div class="dg-node is-accent" data-hs="human"><span class="ni">💬</span><span class="nl">Insaani message</span>
        <span class="ns">developer ke liye — user ko dikhane ke liye nahi<br>(woh localized hona chahiye)</span></div>
      <div class="dg-node is-accent" data-hs="field"><span class="ni">🎯</span><span class="nl">Kaunsa field</span>
        <span class="ns">form par error dikhane ke liye zaroori</span></div>
      <div class="dg-node is-gold" data-hs="trace"><span class="ni">🔍</span><span class="nl">trace_id</span>
        <span class="ns">support ticket se seedha log tak —<br>yeh ek field ghanton bachata hai</span></div>
    </div>
    <div class="dg-cap"><b>Sabse zaroori sawaal jo har error ko answer karna chahiye:</b>
      "client ko ab kya karna chahiye — retry, theek karke dobara, ya haar maan lo?"
      Status code yeh batata hai; body use samjhata hai.</div>`,
};

VISUALS['idempotency'] = {
  t: 'Idempotency key — "N baar bhejo, charge ek hi baar"',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">💸 Bina key ke</span>
        <div class="dg-ladder">
          <div class="dg-rung"><span class="lv">1</span><span class="cmd">POST /payments (₹4,999)</span><span class="q">server ne charge kar diya ✅</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">2</span><span class="cmd">…network timeout</span><span class="q">client ko jawab nahi mila 📵</span></div>
          <div class="dg-rung"><span class="lv">3</span><span class="cmd">client retry karta hai</span><span class="q">"shayad gaya hi nahi tha"</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">4</span><span class="cmd">POST /payments (₹4,999)</span><span class="q">DOOSRA charge 💀</span></div>
        </div>
        <div class="dg-cap">Client ko kabhi pata nahi chalta ki request <b>pahunchi nahi</b>
          ya <b>jawab kho gaya</b>. Dono ek jaise dikhte hain — isliye retry lazmi hai,
          aur duplicate bhi.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🔑 Key ke saath</span>
        <div class="dg-ladder">
          <div class="dg-rung g"><span class="lv">1</span><span class="cmd">POST + Idempotency-Key: abc-1</span><span class="q">201 Created · key store hui</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">2</span><span class="cmd">…timeout</span><span class="q">jawab kho gaya</span></div>
          <div class="dg-rung g"><span class="lv">3</span><span class="cmd">POST + Idempotency-Key: abc-1</span><span class="q">200 + x-idempotent-replay ✅</span></div>
          <div class="dg-rung g"><span class="lv">4</span><span class="cmd">wahi jawab wapas</span><span class="q">naya charge NAHI hua 🎉</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-accent" data-hs="who"><span class="ni">🙋</span><span class="nl">Key CLIENT banata hai</span>
        <span class="ns">UUID, har logical operation ke liye ek.<br>Server banayega toh retry par nayi ban jaayegi — bekaar.</span></div>
      <div class="dg-node is-accent" data-hs="store"><span class="ni">🗄️</span><span class="nl">UNIQUE constraint par store</span>
        <span class="ns">key + response, ek transaction mein.<br>App-level check race condition hai.</span></div>
      <div class="dg-node is-gold" data-hs="ttl"><span class="ni">⏳</span><span class="nl">TTL rakho (24h–7d)</span>
        <span class="ns">hamesha nahi — warna table anant badhegi</span></div>
      <div class="dg-node is-bad" data-hs="conflict"><span class="ni">⚠️</span><span class="nl">Same key, ALAG body</span>
        <span class="ns">409 Conflict bhejo — chup-chaap purana jawab<br>lautana ek chhupa hua bug hai</span></div>
    </div>
    <div class="dg-cap"><b>Kahan chahiye:</b> har non-idempotent write jispar paisa,
      inventory ya notification tika ho. <code>GET/PUT/DELETE</code> pehle se idempotent hain —
      <code>POST</code> ko banana padta hai.</div>`,
};

VISUALS['ratelimit'] = {
  t: 'Rate limiting — token bucket aur imaandaar headers',
  html: `
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🪣 TOKEN BUCKET (sabse zyada use hota hai)</span>
        <div class="dg-col">
          <div class="dg-node is-accent" data-hs="bucket"><span class="ni">🪣</span><span class="nl">burst = 200 tokens</span>
            <span class="ns">refill 100/sec · har request 1 token</span></div>
          <div class="dg-node is-good"><span class="nl">✅ Burst allowed</span>
            <span class="ns">app khulte hi 200 requests? theek hai —<br>asli users aise hi behave karte hain</span></div>
          <div class="dg-node is-gold"><span class="nl">Sustained = 100/sec</span>
            <span class="ns">bucket khaali hone ke baad refill rate hi limit hai</span></div>
        </div>
        <div class="dg-cap">Fixed window (<i>"per minute 6000"</i>) ka jaal:
          minute ke <b>border par</b> 12,000 requests aa sakti hain (5999 + 6000).</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">📋 Headers jo client ki madad karte hain</span>
        <pre style="font-size:.72rem">429 Too Many Requests
retry-after: 3
ratelimit-limit: 100
ratelimit-remaining: 0
ratelimit-reset: 3

{ "type": "/errors/rate-limited",
  "title": "Too Many Requests",
  "status": 429 }</pre>
        <div class="dg-cap"><b>Retry-After</b> ke bina client turant dobara maarega —
          aur tumne rate limit lagayi hi isliye thi ki na maare.
          Yeh ek header retry storm ko rokta hai.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill acc" data-hs="key">🔑 KIS PAR LIMIT?</span>
      <span><b>API key / user id</b> par — IP par nahi. Ek office ke 500 log ek hi IP se
        aate hain, aur ek attacker ke paas 500 IP hote hain. IP-based limiting
        asli users ko rokta hai aur attackers ko nahi.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="cost">⚖️ SAARI REQUESTS BARABAR NAHI</span>
      <span><code>GET /users/5</code> aur <code>POST /reports</code> ek jaise nahi hain.
        Mehenge endpoints ke liye <b>zyada tokens</b> lo (weighted limiting) —
        warna 100 report requests tumhe gira dengi jabki limit "respect" hui thi.</span>
    </div>`,
};

VISUALS['boss-api'] = {
  t: 'BOSS — API design review',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">1</span><span class="cmd">POST /getTransactions</span><span class="q">verb URL mein, GET hona chahiye</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">2</span><span class="cmd">?page=485728&amp;limit=5000</span><span class="q">deep offset + unbounded limit</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">3</span><span class="cmd">200 { "error": "not found" }</span><span class="q">status code jhooth bol raha hai</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">4</span><span class="cmd">POST /payments (no key)</span><span class="q">retry = double charge</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">5</span><span class="cmd">429 (koi Retry-After nahi)</span><span class="q">client turant dobara maarega</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">6</span><span class="cmd">"total": 24286450</span><span class="q">har request par COUNT(*)</span></div>
    </div>
    <div class="dg-cap" style="margin-top:8px">Chhe endpoints, chhe alag bimariyan —
      aur har ek production mein asli incident bani hai.</div>
    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill good">🏁 EK LINE MEIN POORA TRACK</span>
      <span>Achhi API woh hai jiska <b>naam guess kiya ja sake</b>,
        jiski <b>cost bounded ho</b>, jiske <b>errors actionable</b> hon,
        aur jise <b>surakshit retry</b> kiya ja sake.</span>
    </div>`,
};

/* =====================================================================
   TRACK 3 — Data & Storage
   ===================================================================== */

VISUALS['modeling'] = {
  t: 'Access pattern pehle, schema baad mein',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Schema-first (ulta)</span>
        <div class="dg-col">
          <div class="dg-node is-bad"><span class="nl">"Entities kya hain?"</span><span class="ns">User, Order, Product…</span></div>
          <div class="dg-node is-bad"><span class="nl">Tables banao, normalize karo</span><span class="ns">3NF tak, textbook jaisa</span></div>
          <div class="dg-node is-bad"><span class="nl">Phir queries likho</span><span class="ns">…aur 6-table JOIN mile</span></div>
          <div class="dg-node is-bad"><span class="nl">Migration likho</span><span class="ns">har baar</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Access-pattern-first</span>
        <div class="dg-col">
          <div class="dg-node is-good" data-hs="queries"><span class="nl">"App kaunse sawaal poochhega?"</span>
            <span class="ns">"is user ke last 50 orders"<br>"is order ke items + prices"</span></div>
          <div class="dg-node is-good" data-hs="freq"><span class="nl">Har sawaal ki frequency aur latency</span>
            <span class="ns">1000/sec, p99 &lt; 50 ms</span></div>
          <div class="dg-node is-good"><span class="nl">Ab schema + index design karo</span>
            <span class="ns">jo un sawaalon ko sasta banaye</span></div>
        </div>
        <div class="dg-cap">Yeh NoSQL ki soch hai — par SQL mein bhi utni hi sahi hai.
          Schema ek <b>jawab</b> hai; sawaal pehle aane chahiye.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">⚖️ Normalize vs Denormalize</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="norm"><span class="nl">NORMALIZE (default)</span>
            <span class="ns">ek sach, ek jagah · update sasta<br>read mein JOIN</span></div>
          <div class="dg-node is-gold" data-hs="denorm"><span class="nl">DENORMALIZE (soch samajh ke)</span>
            <span class="ns">read tez · write mehenga<br>ab do jagah sync rakhni hai</span></div>
        </div>
        <div class="dg-cap">Denormalize tab jab: read:write ratio bahut zyada ho,
          JOIN sach mein bottleneck ho (naapa hua), aur data <b>badalta na</b> ho
          (jaise order par <b>us waqt ka</b> price — woh historical fact hai, duplicate nahi).</div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">🗑️ Soft delete ka jaal</span>
        <div class="dg-stack">
          <div class="dg-node is-bad" data-hs="soft"><span class="nl">deleted_at IS NULL</span>
            <span class="ns">ab HAR query mein yeh lagana hai —<br>ek bhool = deleted data user ko dikha</span></div>
          <div class="dg-node is-bad"><span class="nl">Unique constraints toot-te hain</span>
            <span class="ns">email unique? deleted row bhi jagah ghere hai</span></div>
          <div class="dg-node is-good"><span class="nl">Behtar: archive table</span>
            <span class="ns">delete karo, doosri table mein daalo —<br>live queries saaf, audit bhi hai</span></div>
        </div>
      </div>
    </div>`,
};

VISUALS['btree'] = {
  t: 'B-tree index — kitaab ka index, par sorted aur balanced',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc" data-hs="root">root</span><span class="dg-arrow"></span>
      <span class="dg-pill acc" data-hs="branch">branch</span><span class="dg-arrow"></span>
      <span class="dg-pill acc" data-hs="leaf">leaf (sorted)</span><span class="dg-arrow"></span>
      <span class="dg-pill gold" data-hs="heap">heap row</span>
    </div>
    <div class="dg-cap" style="margin-top:8px">2.4 crore rows mein pahunchne ke liye ~4 hops
      (log ba 100 se). Isiliye index lookup <b>hamesha</b> tez hai — chahe table kitni bhi badi ho.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">⚡ Index KAAM karta hai</span>
        <div class="dg-ladder">
          <div class="dg-rung g"><span class="lv">=</span><span class="cmd">WHERE user_id = 'OP-101'</span><span class="q">equality — sabse achha</span></div>
          <div class="dg-rung g"><span class="lv">&gt;</span><span class="cmd">WHERE created_at &gt; '2026-01-01'</span><span class="q">range — sorted hai isliye</span></div>
          <div class="dg-rung g"><span class="lv">↕</span><span class="cmd">ORDER BY created_at</span><span class="q">sort muft — index already sorted</span></div>
          <div class="dg-rung g"><span class="lv">%</span><span class="cmd">WHERE name LIKE 'Ra%'</span><span class="q">prefix match — yeh bhi range hai</span></div>
        </div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">🐌 Index BEKAAR ho jaata hai</span>
        <div class="dg-ladder">
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">%</span><span class="cmd">WHERE name LIKE '%sharma'</span><span class="q">leading wildcard — kahan se shuru karein?</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">fn</span><span class="cmd">WHERE YEAR(created_at) = 2026</span><span class="q">column par function 💀</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">≠</span><span class="cmd">WHERE status != 'done'</span><span class="q">"sab kuch chhod ke" = poora scan</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">?</span><span class="cmd">WHERE active = 1  (99% rows)</span><span class="q">low selectivity — scan hi sasta hai</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="sel">🎯 SELECTIVITY</span>
      <span>= distinct values ÷ total rows. <code>email</code> (sab alag) = 1.0, perfect.
        <code>is_active</code> (2 values) ≈ 0.0000001, bekaar.
        <b>Index tabhi laga jab woh 90%+ rows kaat de</b> — warna optimizer use
        ignore karke seq scan hi karega (aur woh sahi hoga).</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="fn">⚠️ SABSE AAM GALTI</span>
      <span><code>WHERE YEAR(created_at) = 2026</code> — index <code>created_at</code> par hai,
        <code>YEAR(created_at)</code> par nahi. Likho:
        <code>created_at &gt;= '2026-01-01' AND created_at &lt; '2027-01-01'</code></span>
    </div>`,
};

VISUALS['composite'] = {
  t: 'Composite index — column ka KRAM hi sab kuch hai',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc">CREATE INDEX ix ON transactions(user_id, created_at, id)</span>
    </div>
    <div class="dg-ladder" style="margin-top:10px">
      <div class="dg-rung g" data-hs="p1"><span class="lv">✅</span><span class="cmd">WHERE user_id = ?</span><span class="q">1/3 — index laga</span></div>
      <div class="dg-rung g" data-hs="p2"><span class="lv">✅</span><span class="cmd">WHERE user_id = ? AND created_at &gt; ?</span><span class="q">2/3 — aur gehra</span></div>
      <div class="dg-rung g" data-hs="p3"><span class="lv">✅</span><span class="cmd">WHERE user_id = ? ORDER BY created_at</span><span class="q">sort bhi MUFT mila</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)" data-hs="broken"><span class="lv">❌</span><span class="cmd">WHERE created_at &gt; ?</span><span class="q">FULL SCAN — leading column chhoda</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">📞 Phone book ka ulta</span>
        <div class="dg-node is-bad"><span class="ni">📕</span><span class="nl">(lastName, firstName) par sorted</span>
          <span class="ns">"Sharma" dhoondo → 1 second<br>"Priya" dhoondo → POORI kitaab</span></div>
        <div class="dg-cap">Index sorted hai — <b>pehle column se</b>. Doosre column ka order
          sirf <b>us</b> pehle column ke andar hai. Isiliye leading column chhodne par
          index bekaar ho jaata hai.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🎯 Column ka kram kaise chuno</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="eq"><span class="ni">1️⃣</span><span class="nl">Equality columns PEHLE</span><span class="ns">WHERE x = ? wale</span></div>
          <div class="dg-node is-accent" data-hs="sort"><span class="ni">2️⃣</span><span class="nl">Sort column BEECH mein</span><span class="ns">ORDER BY jispar hai</span></div>
          <div class="dg-node is-gold" data-hs="range"><span class="ni">3️⃣</span><span class="nl">Range column AAKHIR mein</span><span class="ns">&gt; &lt; BETWEEN — uske baad index ruk jaata hai</span></div>
        </div>
        <div class="dg-cap">Range ke <b>baad</b> ka koi bhi column index se filter nahi hota —
          woh sirf rows padh ke chhaanta hai.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill good" data-hs="cover">🏆 COVERING INDEX</span>
      <span>Query ke SAARE columns index mein hain → heap chhune ki zaroorat hi nahi
        (<code>Using index</code> / <code>Index Only Scan</code>). 2-3x tez.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="tax">💸 INDEX KA TAX</span>
      <span>5 alag single-column indexes ≠ ek composite index (DB aksar ek hi chunta hai).
        Aur har index <b>har INSERT/UPDATE/DELETE</b> ko dheema karta hai aur disk khaata hai.
        Index muft nahi — woh <b>write par tax</b> hai.</span>
    </div>`,
};

VISUALS['indextypes'] = {
  t: 'Index ke prakar — kaunsa kab',
  html: `
    <div class="dg-grid">
      <div class="dg-node is-good" data-hs="btree"><span class="ni">🌳</span><span class="nl">B-tree</span>
        <span class="ns">default. equality + range + sort<br>90% cases yahi</span></div>
      <div class="dg-node is-accent" data-hs="hash"><span class="ni">#️⃣</span><span class="nl">Hash</span>
        <span class="ns">SIRF equality — range/sort nahi<br>thoda tez, bahut kam upyogi</span></div>
      <div class="dg-node is-gold" data-hs="gin"><span class="ni">📚</span><span class="nl">GIN / inverted</span>
        <span class="ns">ek row mein KAI values<br>JSONB, arrays, tags, full-text</span></div>
      <div class="dg-node is-accent" data-hs="fulltext"><span class="ni">🔎</span><span class="nl">Full-text</span>
        <span class="ns">stemming + ranking<br>"running" ↔ "run"</span></div>
      <div class="dg-node is-gold" data-hs="partial"><span class="ni">✂️</span><span class="nl">Partial</span>
        <span class="ns">WHERE status='pending'<br>chhota index, chhota tax</span></div>
      <div class="dg-node is-accent" data-hs="brin"><span class="ni">📊</span><span class="nl">BRIN</span>
        <span class="ns">bahut badi, naturally sorted tables<br>(time-series logs) — bahut chhota</span></div>
      <div class="dg-node is-good" data-hs="geo"><span class="ni">🗺️</span><span class="nl">GiST / R-tree</span>
        <span class="ns">"5 km ke andar"<br>geo, ranges, overlaps</span></div>
      <div class="dg-node is-muted" data-hs="bitmap"><span class="ni">🔲</span><span class="nl">Bitmap</span>
        <span class="ns">low-cardinality columns ka AND/OR<br>(analytics DBs mein)</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">?</span><span class="cmd">WHERE email = ?</span><span class="q">B-tree (ya hash) — equality</span></div>
      <div class="dg-rung g"><span class="lv">?</span><span class="cmd">WHERE created_at BETWEEN ? AND ?</span><span class="q">B-tree — range chahiye</span></div>
      <div class="dg-rung a"><span class="lv">?</span><span class="cmd">WHERE tags @&gt; ARRAY['urgent']</span><span class="q">GIN — ek row, kai values</span></div>
      <div class="dg-rung a"><span class="lv">?</span><span class="cmd">WHERE data-&gt;&gt;'plan' = 'pro'</span><span class="q">GIN (JSONB) ya expression index</span></div>
      <div class="dg-rung a"><span class="lv">?</span><span class="cmd">"laptop charger" dhoondo</span><span class="q">full-text — ya Elasticsearch</span></div>
      <div class="dg-rung a"><span class="lv">?</span><span class="cmd">sirf pending orders (0.1% rows)</span><span class="q">partial index — 1000x chhota</span></div>
      <div class="dg-rung a"><span class="lv">?</span><span class="cmd">2 saal ke logs, time se sorted</span><span class="q">BRIN — B-tree se 1000x chhota</span></div>
    </div>
    <div class="dg-cap"><b>Practical sach:</b> 90% cases mein jawab B-tree hai.
      Baaki 10% mein sahi type chunna 100x farak laata hai —
      aur galat type chunna sirf disk barbaad karta hai.</div>`,
};

VISUALS['nplus1'] = {
  t: 'N+1 — ORM ka sabse mehenga tohfa',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🐌 N+1 (101 queries)</span>
        <pre style="font-size:.72rem">orders = Order.limit(100)      ← 1 query
for o in orders:
    print(o.user.name)         ← 100 queries!

SELECT * FROM orders LIMIT 100;
SELECT * FROM users WHERE id=1;
SELECT * FROM users WHERE id=2;
SELECT * FROM users WHERE id=3;
… 97 aur</pre>
        <div class="dg-cap">Har query 1 ms bhi ho toh 101 ms — aur network round trip
          alag. Code mein yeh <b>ek line</b> hai; DB par 101 queries hain.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">⚡ Eager load (2 queries)</span>
        <pre style="font-size:.72rem">orders = Order.limit(100)
          .includes(:user)     ← eager load

SELECT * FROM orders LIMIT 100;
SELECT * FROM users
  WHERE id IN (1,2,3,…);       ← EK query

→ 2 queries, ~4 ms</pre>
        <div class="dg-cap">Ya ek JOIN. Dono theek hain — <b>101 queries theek nahi hai</b>.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="hidden">👻 YEH CHHUPA KYUN REHTA HAI</span>
      <span>Dev machine par 10 rows hain → 11 queries → 12 ms → sab theek lagta hai.
        Production mein 100 rows → 101 queries → 400 ms.
        Aur <b>GraphQL mein toh yeh nested ho jaata hai</b> — 100 orders × 5 items ×
        1 product = 501 queries ek request mein.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good" data-hs="fix">🔧 TEEN ILAAJ</span>
      <span><b>1.</b> Eager loading (<code>includes</code>/<code>select_related</code>/<code>JOIN FETCH</code>)
        <b>2.</b> DataLoader — ek request ke andar batch + dedupe (GraphQL ka standard)
        <b>3.</b> <b>Test mein query count assert karo</b> — yahi ise wapas aane se rokta hai</span>
    </div>`,
};

VISUALS['pool'] = {
  t: "Connection pool — CPU 10%, aur phir bhi sab timeout",
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">📊</span><span class="cmd">cpu.utilization  10%</span><span class="q">app BUSY nahi hai</span></div>
      <div class="dg-rung"><span class="lv">📊</span><span class="cmd">memory  41%</span><span class="q">koi pressure nahi</span></div>
      <div class="dg-rung g"><span class="lv">✅</span><span class="cmd">/health  200 OK</span><span class="q">"process zinda hai" — bas itna</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">🔥</span><span class="cmd">http.p99  9,925 ms</span><span class="q">phir bhi sab timeout</span></div>
    </div>
    <div class="dg-cap" style="margin-top:8px">Agar app kaam nahi kar rahi, toh woh
      <b>kis cheez ka intezaar</b> kar rahi hai?</div>

    <div class="dg-rule"></div>
    <div class="dg-box is-bad" style="margin-bottom:10px"><span class="bx-label">🔍 EK REQUEST KA TRACE</span>
      <div class="dg-ladder">
        <div class="dg-rung"><span class="lv">5ms</span><span class="cmd">app handler (CPU)</span><span class="q">app ka apna kaam</span></div>
        <div class="dg-rung" style="border-left-color:var(--bad)" data-hs="wait"><span class="lv">9900</span><span class="cmd">⏳ pool.acquire()</span><span class="q">💀 YAHI HAI</span></div>
        <div class="dg-rung"><span class="lv">20ms</span><span class="cmd">db query</span><span class="q">DB bilkul theek hai!</span></div>
      </div>
      <div class="dg-cap">Query optimize karna <b>bekaar</b> hai — SQL sirf 20 ms le raha hai.
        Bottleneck DB nahi, <b>DB ke saamne ki QUEUE</b> hai.</div>
    </div>

    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🧮 LITTLE'S LAW</span>
        <div class="dg-col">
          <div class="dg-node is-accent" data-hs="law"><span class="nl">capacity = pool × (1000 / service_ms)</span>
            <span class="ns">pool 50, query 20ms  → 2,500 rps ✅<br>
              pool 50, query 200ms → 250 rps ⚠️<br>
              pool 50, query 8s    → 6 rps 💀</span></div>
          <div class="dg-node is-bad" data-hs="hold"><span class="nl">…aur agar 45 connections<br>ek lambi transaction ne pakad rakhe hain?</span>
            <span class="ns">effective pool = 5 → capacity 250 rps</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🔎 KYA DEKHNA HAI</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="metrics"><span class="nl">pool.wait_ms</span><span class="ns">🔥 ASLI SIGNAL — p99 se bhi zyada kaam ka</span></div>
          <div class="dg-node is-good"><span class="nl">active vs idle connections</span><span class="ns">kaun pakde baitha hai</span></div>
          <div class="dg-node is-good"><span class="nl">queue depth</span><span class="ns">kitne intezaar mein hain</span></div>
          <div class="dg-node is-good"><span class="nl">lambi transactions / leaks</span><span class="ns">aksar asli mujrim</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="saturate">🪣 SATURATION — CPU ke ALAWA</span>
      <span>db connection pool · thread pool · http connection pool · file descriptors ·
        queue capacity · worker slots · downstream rate limits.
        <b>Utilization</b> batata hai "kitna use ho raha hai"; <b>saturation</b> batata hai
        "kitna INTEZAAR ho raha hai". Outage hamesha saturation se aata hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="bigger">⚠️ POOL BADHANA ILAAJ NAHI</span>
      <span>Har connection DB par ek process/thread hai. <b>500 connections aksar 50 se DHEEME
        hote hain</b> (context switching + lock contention). Pehle service time ghatao,
        phir pool ka soch-o.</span>
    </div>`,
};

VISUALS['caching'] = {
  t: 'Cache — layers, patterns, aur asli mushkil: invalidation',
  html: `
    <div class="dg-flow">
      <span class="dg-pill" data-hs="browser">📱 Browser</span><span class="dg-arrow"></span>
      <span class="dg-pill acc" data-hs="cdn">🌍 CDN</span><span class="dg-arrow"></span>
      <span class="dg-pill gold" data-hs="app">🧠 App cache</span><span class="dg-arrow"></span>
      <span class="dg-pill good" data-hs="db">🗄️ DB buffer pool</span>
    </div>
    <div class="dg-cap" style="margin-top:8px">Jitna <b>baahar</b> cache karo, utna sasta —
      par utna hi mushkil invalidate karna. Yeh poora tradeoff hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">📖 CACHE-ASIDE (sabse aam)</span>
        <pre style="font-size:.72rem">v = cache.get(k)
if v is None:
    v = db.query(k)
    cache.set(k, v, ttl)
return v</pre>
        <div class="dg-cap">App cache ka maalik hai. Cache down? DB se chal jaayega.
          <b>Jaal:</b> miss par har request DB jaayegi (stampede).</div>
      </div>
      <div class="dg-box is-accent"><span class="bx-label">✍️ WRITE-THROUGH / WRITE-BEHIND</span>
        <div class="dg-stack">
          <div class="dg-node is-accent" data-hs="through"><span class="nl">write-through</span>
            <span class="ns">cache + DB dono ek saath likho<br>consistent, par write dheema</span></div>
          <div class="dg-node is-gold" data-hs="behind"><span class="nl">write-behind</span>
            <span class="ns">cache mein likho, DB baad mein<br>tez — par crash par DATA GAYA</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="invalid">🔑 INVALIDATION — do hi tareeke</span>
      <span><b>TTL</b> (aasan, par thodi der stale) ya <b>explicit delete on write</b>
        (fresh, par har write path yaad rakhna padega — aur ek bhool = hamesha ka stale data).
        Zyadatar systems dono use karte hain: explicit delete + chhota TTL safety net ke taur par.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc" data-hs="keys">🗝️ CACHE KEY DESIGN</span>
      <span><code>user:5:orders:page:1:v2</code> — <b>namespace</b> (kis cheez ka),
        <b>id</b>, <b>variant</b> (filters/page), <b>version</b>.
        Version chaabi mein rakhne se poora cache "invalidate" karna ek constant badalne
        jitna aasan ho jaata hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="what">📦 KYA CACHE KARNA HAI</span>
      <span>Jo <b>mehenga</b> ho, <b>baar-baar</b> maanga jaaye, aur <b>kam badalta</b> ho.
        Teenon chahiye — sirf "slow hai" kaafi wajah nahi.</span>
    </div>`,
};

VISUALS['stampede'] = {
  t: 'Cache stampede — jab 10,000 keys ek saath expire hoti hain',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🌩️ STAMPEDE (thundering herd)</span>
        <div class="dg-ladder">
          <div class="dg-rung g"><span class="lv">t0</span><span class="cmd">deploy — cache warm hua</span><span class="q">10,000 keys, TTL 300s</span></div>
          <div class="dg-rung g"><span class="lv">t1</span><span class="cmd">sab hit ho rahe hain</span><span class="q">DB par 0 load ✅</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">t300</span><span class="cmd">SAARI 10,000 keys EK SAATH expire</span><span class="q">💀</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">t300</span><span class="cmd">10,000 requests → DB</span><span class="q">ek second mein</span></div>
        </div>
        <div class="dg-cap">Aur jo requests intezaar mein hain, unka bhi cache miss hoga —
          isliye ek key ke liye <b>500 identical queries</b> ek saath ja sakti hain.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ TEEN ILAAJ</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="jitter"><span class="ni">🎲</span><span class="nl">TTL par JITTER</span>
            <span class="ns">ttl = 300 + random(0, 60)<br>expiry bikhar gayi — sabse sasta fix</span></div>
          <div class="dg-node is-good" data-hs="lock"><span class="ni">🔒</span><span class="nl">Single-flight lock</span>
            <span class="ns">ek key ke liye SIRF EK request DB jaaye,<br>baaki uske jawab ka intezaar karein</span></div>
          <div class="dg-node is-good" data-hs="early"><span class="ni">⏰</span><span class="nl">Probabilistic early refresh</span>
            <span class="ns">expiry ke paas aate hi kuch requests<br>pehle hi refresh kar dein — miss hi na ho</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="cold">❄️ COLD START</span>
      <span>Cache flush ya Redis restart ke baad <b>100% miss</b>. Agar DB itna traffic
        nahi jhel sakta, toh tumhara system cache par <b>depend</b> karta hai — woh
        optimization nahi, ek <b>dependency</b> hai. Poochho: cache poora chala jaaye toh
        system zinda rahega?</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="hot">🔥 HOT KEY</span>
      <span>Ek celebrity ka profile = ek hi cache key par 50,000 rps. Woh ek Redis node
        garam kar degi. Ilaaj: key ko replicate karo (<code>user:5:copy_0..9</code>),
        ya app ke andar chhota local cache (2 second TTL) rakho.</span>
    </div>`,
};

VISUALS['storage'] = {
  t: 'Storage engine — access pattern batata hai kaunsa',
  html: `
    <div class="dg-grid">
      <div class="dg-node is-good" data-hs="rdbms"><span class="ni">🗄️</span><span class="nl">Relational</span>
        <span class="ns">rishte, transactions, ad-hoc queries<br><b>default — yahin se shuru karo</b></span></div>
      <div class="dg-node is-accent" data-hs="kv"><span class="ni">🔑</span><span class="nl">Key-Value</span>
        <span class="ns">ek key se poora object<br>session, cache, feature flags</span></div>
      <div class="dg-node is-gold" data-hs="doc"><span class="ni">📄</span><span class="nl">Document</span>
        <span class="ns">nested, alag-alag shape<br>catalog, CMS, event payloads</span></div>
      <div class="dg-node is-accent" data-hs="ts"><span class="ni">📈</span><span class="nl">Time-series</span>
        <span class="ns">append-only + time range<br>metrics, IoT, logs</span></div>
      <div class="dg-node is-gold" data-hs="search"><span class="ni">🔎</span><span class="nl">Search</span>
        <span class="ns">relevance, typo, facets<br>Elasticsearch/OpenSearch</span></div>
      <div class="dg-node is-good" data-hs="obj"><span class="ni">🪣</span><span class="nl">Object store</span>
        <span class="ns">bade files, blobs<br>S3 — DB mein kabhi nahi</span></div>
      <div class="dg-node is-accent" data-hs="col"><span class="ni">📊</span><span class="nl">Columnar / OLAP</span>
        <span class="ns">crore rows par aggregate<br>ClickHouse, BigQuery</span></div>
      <div class="dg-node is-muted" data-hs="graph"><span class="ni">🕸️</span><span class="nl">Graph</span>
        <span class="ns">"3 hop door kaun"<br>social, fraud rings</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">🌡️ HOT · WARM · COLD</span>
        <div class="dg-ladder">
          <div class="dg-rung g" data-hs="hot"><span class="lv">🔥</span><span class="cmd">Hot — 30 din</span><span class="q">main DB · SSD · full index</span></div>
          <div class="dg-rung a" data-hs="warm"><span class="lv">🌤️</span><span class="cmd">Warm — 1 saal</span><span class="q">partition · kam index · sasti disk</span></div>
          <div class="dg-rung" data-hs="cold"><span class="lv">🧊</span><span class="cmd">Cold — 7 saal (compliance)</span><span class="q">S3/Glacier · parquet · query dheemi par sasti</span></div>
        </div>
        <div class="dg-cap">90% queries pichhle 30 din ko chhuti hain. Puraana data
          main DB mein rakhne se <b>har</b> query dheemi hoti hai —
          index bade, cache mein kam jagah.</div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">⚠️ POLYGLOT KA JAAL</span>
        <div class="dg-stack">
          <div class="dg-node is-bad"><span class="nl">"Har kaam ka apna DB"</span>
            <span class="ns">5 databases = 5 backup plans,<br>5 failure modes, 5 tarah ka gyaan</span></div>
          <div class="dg-node is-good"><span class="nl">Postgres bahut kuch kar leta hai</span>
            <span class="ns">JSONB (document) · full-text · GIS<br>· LISTEN/NOTIFY · arrays</span></div>
        </div>
        <div class="dg-cap"><b>Ek DB se shuru karo.</b> Naya DB tab jab access pattern
          sach mein fit na ho — aur uski poori operational keemat maan ke.</div>
      </div>
    </div>`,
};

VISUALS['sharding'] = {
  t: 'Partition · Shard · Replica — teen alag cheezein',
  html: `
    <div class="dg-grid">
      <div class="dg-node is-good" data-hs="replica"><span class="ni">👯</span><span class="nl">REPLICATION</span>
        <span class="ns">wahi data, kai copies<br>→ read scale + HA<br>❌ write scale nahi</span></div>
      <div class="dg-node is-accent" data-hs="partition"><span class="ni">✂️</span><span class="nl">PARTITIONING</span>
        <span class="ns">EK server, table tukdon mein<br>→ purane tukde drop karna aasan<br>❌ capacity nahi badhti</span></div>
      <div class="dg-node is-gold" data-hs="shard"><span class="ni">🧩</span><span class="nl">SHARDING</span>
        <span class="ns">KAI servers, data bata hua<br>→ write scale ✅<br>❌ cross-shard JOIN gaya</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">⏱️ REPLICA LAG — read-after-write</span>
        <div class="dg-ladder">
          <div class="dg-rung"><span class="lv">1</span><span class="cmd">POST /profile (naam badla)</span><span class="q">primary par likha ✅</span></div>
          <div class="dg-rung"><span class="lv">2</span><span class="cmd">GET /profile</span><span class="q">replica se padha</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)" data-hs="lag"><span class="lv">3</span><span class="cmd">PURANA naam dikha</span><span class="q">"save nahi hua?" 😡</span></div>
        </div>
        <div class="dg-cap"><b>Ilaaj:</b> write ke baad kuch second primary se padho
          (sticky), ya user ke apne data ke liye hamesha primary,
          ya client ko write timestamp do aur replica utna catch-up kare.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🔑 SHARD KEY — sabse bada faisla</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="good"><span class="nl">✅ user_id / tenant_id</span>
            <span class="ns">zyadatar queries ek hi shard par<br>data barabar bantta hai</span></div>
          <div class="dg-node is-bad" data-hs="bad1"><span class="nl">❌ created_at</span>
            <span class="ns">SAARE naye writes ek shard par —<br>hotspot ban gaya</span></div>
          <div class="dg-node is-bad" data-hs="bad2"><span class="nl">❌ country</span>
            <span class="ns">India shard 100x bada,<br>Fiji shard khaali</span></div>
        </div>
        <div class="dg-cap">Shard key <b>badalna lagbhag namumkin</b> hai —
          poora data dobara baantna padta hai. Isliye yeh faisla din 1 par
          sabse zyada sochne wala hai.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="order">📋 SAHI KRAM</span>
      <span>Shard <b>aakhri</b> option hai. Pehle: index theek karo → query theek karo →
        cache lagao → read replicas → vertical scale (aaj ek machine 100 TB aur lakhon
        IOPS kar leti hai) → <b>phir</b> partition → <b>phir</b> shard.
        Zyadatar teams shard karti hain jab unhe sirf ek index chahiye tha.</span>
    </div>`,
};

VISUALS['boss-data'] = {
  t: 'BOSS — dashboard 12 second se 200 ms',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">1</span><span class="cmd">Koi index nahi — full scan + sort</span><span class="q">12.8 s</span></div>
      <div class="dg-rung a"><span class="lv">2</span><span class="cmd">Sahi composite index</span><span class="q">→ 380 ms</span></div>
      <div class="dg-rung a"><span class="lv">3</span><span class="cmd">Covering banao (fields limit karo)</span><span class="q">→ 140 ms</span></div>
      <div class="dg-rung a"><span class="lv">4</span><span class="cmd">COUNT(*) hatao</span><span class="q">→ 60 ms</span></div>
      <div class="dg-rung g"><span class="lv">5</span><span class="cmd">Cache + jitter</span><span class="q">→ 2 ms (90% requests)</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill good">🏁 EK LINE MEIN POORA TRACK</span>
      <span>Pehle <b>access pattern</b> likho, phir <b>index</b> banao jo use match kare,
        phir <b>rows bounded</b> karo, phir <b>cache</b> lagao —
        aur har kadam par <b>naapo</b>, andaza mat lagao.</span>
    </div>`,
};

/* =====================================================================
   TRACK 4 — Scale & Resilience
   ===================================================================== */

VISUALS['timeouts'] = {
  t: 'Timeout — woh vachan jo tum apne CALLER se karte ho',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">💀 BINA TIMEOUT</span>
        <div class="dg-ladder">
          <div class="dg-rung"><span class="lv">t0</span><span class="cmd">downstream dheema hua</span><span class="q">30 s response</span></div>
          <div class="dg-rung"><span class="lv">t1</span><span class="cmd">har request 30 s latki</span><span class="q">thread + connection blocked</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">t2</span><span class="cmd">thread pool khatam</span><span class="q">ab SAARE endpoints down</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">t3</span><span class="cmd">tumhare caller bhi latke</span><span class="q">cascade 💥</span></div>
        </div>
        <div class="dg-cap">Ek dheemi dependency ne poore system ko le dooba —
          aur woh <b>down bhi nahi</b> thi, sirf dheemi thi.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">⏱️ TEEN ALAG TIMEOUTS</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="connect"><span class="nl">connect timeout</span>
            <span class="ns">TCP handshake — 1-3 s<br>"woh zinda bhi hai?"</span></div>
          <div class="dg-node is-good" data-hs="read"><span class="nl">read/socket timeout</span>
            <span class="ns">bytes ke beech — 5-30 s<br>"woh bol raha hai?"</span></div>
          <div class="dg-node is-accent" data-hs="total"><span class="nl">total/request timeout</span>
            <span class="ns">poori call — <b>yahi asli hai</b><br>SLO se KAM hona chahiye</span></div>
        </div>
        <div class="dg-cap">Log aksar sirf connect timeout lagate hain —
          aur phir bhi 30 second latakte hain, kyunki connection toh ban gaya tha.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="budget">⏳ TIMEOUT BUDGET</span>
      <span>Tumhara SLO 200 ms hai. Tum 3 services call karte ho.
        Har ek ka timeout 200 ms rakhoge? Toh 600 ms tak latak sakte ho.
        <b>Budget baanto:</b> total 180 ms → A: 60 · B: 60 · C: 40 · apna kaam 20.
        Aur har call ko <b>bacha hua</b> budget do (deadline propagation),
        fixed number nahi.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="rule">📏 NIYAM</span>
      <span>Har remote call par timeout — <b>default</b>, opt-in nahi.
        Aur woh timeout <b>tumhare apne SLO se kam</b> hona chahiye.
        Warna tum apna vaada doosre ke haath mein de rahe ho.</span>
    </div>`,
};

VISUALS['retries'] = {
  t: 'Retry — madad bhi, aur aag mein ghee bhi',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🌩️ RETRY STORM</span>
        <div class="dg-ladder">
          <div class="dg-rung"><span class="lv">t0</span><span class="cmd">service thodi dheemi hui</span><span class="q">10% errors</span></div>
          <div class="dg-rung"><span class="lv">t1</span><span class="cmd">sab clients retry karte hain</span><span class="q">load ×2</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">t2</span><span class="cmd">aur zyada errors</span><span class="q">load ×3</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">t3</span><span class="cmd">service poori tarah gir gayi</span><span class="q">💀 retry ne maara</span></div>
        </div>
        <div class="dg-cap">Service <b>apne aap</b> theek ho jaati — par retries ne
          use theek hone ka mauka hi nahi diya.</div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">🎯 BACKOFF KAAFI NAHI HAI</span>
        <div class="dg-col">
          <div class="dg-node is-bad" data-hs="nojitter"><span class="nl">Bina jitter ke exponential backoff</span>
            <span class="ns">saare clients ne ek saath fail dekha<br>
              → sab 1s ruke → sab ek saath maare<br>
              → sab 2s ruke → sab ek saath maare</span></div>
          <div class="dg-node is-good" data-hs="jitter"><span class="nl">Full jitter</span>
            <span class="ns"><code>sleep = random(0, min(cap, base × 2^n))</code><br>
              ab sab alag time par — load PHAIL gaya</span></div>
        </div>
        <div class="dg-cap">Backoff ne bharam diya ki load kam hoga.
          Asal mein storm sirf <b>synchronize</b> ho gaya.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="what">❌ RETRY MAT KARO</span>
      <span><code>400</code> (request galat hai — dobara bhi galat hogi) ·
        <code>401/403</code> (permission) · <code>404</code> ·
        <code>422</code> (validation). Inhe retry karna sirf load hai, koi umeed nahi.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good" data-hs="yes">✅ RETRY KARO</span>
      <span><code>429</code> (Retry-After ke hisaab se) · <code>503</code> ·
        <code>504</code> · network timeout · connection reset.
        <b>Sirf idempotent operations</b> — warna Idempotency-Key ke saath.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="layers">⚠️ LAYERS KA GUNA</span>
      <span>SDK 3 retries × gateway 3 retries × client 3 retries = <b>27 requests</b>
        ek user action ke liye. Retry <b>ek</b> layer par rakho — aksar sabse upar wali.</span>
    </div>`,
};

VISUALS['breaker'] = {
  t: 'Circuit breaker — downstream ko nahi, KHUD ko bachata hai',
  html: `
    <div class="dg-flow">
      <span class="dg-pill good" data-hs="closed">CLOSED<br>sab normal</span>
      <span class="dg-arrow"></span>
      <span class="dg-pill bad" data-hs="open">OPEN<br>fail fast (1 ms)</span>
      <span class="dg-arrow"></span>
      <span class="dg-pill gold" data-hs="half">HALF-OPEN<br>ek test request</span>
      <span class="dg-arrow"></span>
      <span class="dg-pill good">CLOSED</span>
    </div>

    <div class="dg-ladder" style="margin-top:12px">
      <div class="dg-rung g"><span class="lv">→</span><span class="cmd">CLOSED: requests jaati hain, failures ginte hain</span><span class="q">window mein 50% fail?</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">→</span><span class="cmd">OPEN: 30 s tak koi request nahi jaayegi</span><span class="q">1 ms mein fail, fallback</span></div>
      <div class="dg-rung a"><span class="lv">→</span><span class="cmd">HALF-OPEN: ek test request</span><span class="q">pass → CLOSED · fail → OPEN</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">🎯 BREAKER KISKO BACHATA HAI?</span>
        <div class="dg-col">
          <div class="dg-node is-good" data-hs="you"><span class="ni">🛡️</span><span class="nl">TUMHE</span>
            <span class="ns">tumhare threads uske intezaar mein<br>mar nahi rahe — 30 s wait ki jagah 1 ms</span></div>
          <div class="dg-node is-muted"><span class="ni">🤝</span><span class="nl">…aur usko bhi, thoda</span>
            <span class="ns">use theek hone ka mauka milta hai</span></div>
        </div>
        <div class="dg-cap">Yeh sabse aam galatfehmi hai. Breaker ka pehla maqsad
          <b>apne resources bachana</b> hai.</div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">⚙️ Tuning ke asli sawaal</span>
        <div class="dg-stack">
          <div class="dg-node"><span class="nl">Threshold</span><span class="ns">bahut kam → chhoti dikkat par khul jaayega<br>bahut zyada → kabhi nahi khulega</span></div>
          <div class="dg-node"><span class="nl">Minimum calls</span><span class="ns">2 requests mein se 1 fail = 50%<br>par woh data nahi hai — min 20 calls rakho</span></div>
          <div class="dg-node"><span class="nl">Per-dependency</span><span class="ns">ek global breaker sab kuch band kar dega</span></div>
          <div class="dg-node is-bad"><span class="nl">Fallback kya hai?</span><span class="ns">breaker khula — ab user ko KYA doge?<br>Bina iske breaker sirf tez failure hai</span></div>
        </div>
      </div>
    </div>`,
};

VISUALS['bulkhead'] = {
  t: 'Bulkhead — jahaz ke compartments',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🚢 BINA BULKHEAD — ek chhed, poora jahaz</span>
        <div class="dg-col">
          <div class="dg-node is-bad" data-hs="shared"><span class="ni">🧵</span><span class="nl">200 threads ka ek pool</span>
            <span class="ns">/checkout · /search · /recommendations<br>sab isi mein se lete hain</span></div>
          <div class="dg-node is-bad"><span class="nl">recommendations 30 s dheemi hui</span>
            <span class="ns">uski requests threads pakde baithi hain<br>→ 200 threads khatam<br>→ <b>checkout bhi down</b> 💀</span></div>
        </div>
        <div class="dg-cap">Ek <b>optional</b> feature ne <b>paise wale</b> flow ko maar diya.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ BULKHEAD — alag compartments</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="critical"><span class="nl">checkout — 120 threads</span><span class="ns">apna pool, koi chhu nahi sakta</span></div>
          <div class="dg-node is-accent" data-hs="normal"><span class="nl">search — 60 threads</span><span class="ns">apna pool</span></div>
          <div class="dg-node is-gold" data-hs="optional"><span class="nl">recommendations — 20 threads</span><span class="ns">poori tarah bhar jaaye toh bhi<br>baaki 180 threads safe</span></div>
        </div>
        <div class="dg-cap">Ab recommendations poori tarah mar sakta hai —
          checkout ko pata bhi nahi chalega.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill acc" data-hs="where">🧩 KAHAN-KAHAN BULKHEAD</span>
      <span><b>Thread pools</b> (per dependency) · <b>connection pools</b> (per DB/service) ·
        <b>queues</b> (bulk vs transactional) · <b>instances</b> (alag deployment) ·
        <b>tenants</b> (ek bada customer sab na kha jaaye)</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="cost">⚖️ KEEMAT</span>
      <span>Alag pools ka matlab hai <b>kam sharing</b> — checkout ke 120 threads
        khaali baithe hain jabki search ko chahiye the. Tum thodi si efficiency
        <b>isolation</b> ke badle bech rahe ho. Aur woh sauda lagbhag hamesha sahi hai.</span>
    </div>`,
};

VISUALS['dlq'] = {
  t: 'Dead letter queue — ek poison message, poori queue band',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">☠️ BINA DLQ</span>
        <div class="dg-ladder">
          <div class="dg-rung"><span class="lv">1</span><span class="cmd">msg #4471 process hua</span><span class="q">crash — malformed JSON</span></div>
          <div class="dg-rung"><span class="lv">2</span><span class="cmd">redeliver → phir crash</span><span class="q">infinite loop</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">3</span><span class="cmd">consumer aage badhta hi nahi</span><span class="q">offset atka</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">4</span><span class="cmd">peeche 2 lakh messages jam</span><span class="q">💀 ek message = outage</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ DLQ KE SAATH</span>
        <div class="dg-ladder">
          <div class="dg-rung g"><span class="lv">1</span><span class="cmd">msg #4471 fail</span><span class="q">retry 1 (backoff)</span></div>
          <div class="dg-rung g"><span class="lv">2</span><span class="cmd">phir fail</span><span class="q">retry 2, retry 3</span></div>
          <div class="dg-rung a"><span class="lv">3</span><span class="cmd">3 baar ke baad → DLQ</span><span class="q">alag rakh diya</span></div>
          <div class="dg-rung g"><span class="lv">4</span><span class="cmd">consumer aage badh gaya</span><span class="q">baaki 2 lakh chal gaye ✅</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="alert">🔔 DLQ PAR ALERT LAAZMI HAI</span>
      <span>Ek DLQ jisko koi dekhta hi nahi, woh <b>ek jagah hai jahan data chup-chaap
        marta hai</b>. <code>dlq.depth &gt; 0</code> par alert — aur usme
        <b>original message + error + stack trace + retry count</b> hona chahiye,
        warna debug namumkin hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc" data-hs="replay">♻️ REPLAY KA RASTA</span>
      <span>Bug theek karne ke baad DLQ se messages wapas main queue mein daalne ka
        tool hona chahiye. Aur <b>consumer idempotent hona chahiye</b> —
        warna replay duplicate side-effects banayega.</span>
    </div>`,
};

VISUALS['degrade'] = {
  t: 'Graceful degradation — adhoora jawab > koi jawab nahi',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ ALL-OR-NOTHING</span>
        <div class="dg-node is-bad"><span class="ni">💥</span><span class="nl">recommendations service down</span>
          <span class="ns">→ poora product page 500<br>→ user kuch nahi khareed sakta</span></div>
        <div class="dg-cap">Ek <b>optional</b> box ki wajah se poora
          <b>revenue</b> ruk gaya.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ DEGRADE</span>
        <div class="dg-ladder">
          <div class="dg-rung g" data-hs="core"><span class="lv">✅</span><span class="cmd">product info + price + "Buy"</span><span class="q">CORE — kabhi na gire</span></div>
          <div class="dg-rung a" data-hs="stale"><span class="lv">🕰️</span><span class="cmd">reviews — 2 ghante purane</span><span class="q">stale cache se</span></div>
          <div class="dg-rung" data-hs="hide"><span class="lv">➖</span><span class="cmd">recommendations</span><span class="q">chhupa do, khaali jagah bhi nahi</span></div>
          <div class="dg-rung" data-hs="tell"><span class="lv">💬</span><span class="cmd">"Live stock abhi update nahi ho raha"</span><span class="q">BATAO, chhupao mat</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="tiers">🎚️ PEHLE HI TAY KARO: KYA CORE HAI</span>
      <span>Incident ke beech mein "kya zaroori hai" decide karna sabse bura waqt hai.
        Har feature ko pehle hi <b>CORE / IMPORTANT / OPTIONAL</b> mein baanto —
        aur code mein bhi woh farak dikhna chahiye (timeout, bulkhead, fallback).</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="honest">⚠️ IMAANDAAR RAHO</span>
      <span>Stale data <b>chup-chaap</b> dikhana sabse bura hai — user faisle lega
        jo galat data par hain. "2 ghante purana" likh do. Aur jo cheez
        <b>paisa</b> ya <b>surakshi</b> se judi hai (balance, stock, permissions),
        uspar kabhi stale fallback mat do — wahan error behtar hai.</span>
    </div>`,
};

VISUALS['shedding'] = {
  t: 'Load shedding & backpressure — sabko girane se behtar hai kuch ko rokna',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">💀 SAB KO ANDAR AANE DO</span>
        <div class="dg-ladder">
          <div class="dg-rung"><span class="lv">1</span><span class="cmd">10,000 rps aayi, capacity 2,000</span><span class="q">sab andar</span></div>
          <div class="dg-rung"><span class="lv">2</span><span class="cmd">queue badhti gayi</span><span class="q">p99 30 s</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">3</span><span class="cmd">clients timeout ho ke retry</span><span class="q">load ×2</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">4</span><span class="cmd">0% requests safal</span><span class="q">💀 sab mare</span></div>
        </div>
        <div class="dg-cap">Sabse bura nateeja: <b>koi bhi</b> user serve nahi hua,
          jabki 2,000 rps toh ho hi sakte the.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ SHED KARO</span>
        <div class="dg-ladder">
          <div class="dg-rung g"><span class="lv">1</span><span class="cmd">2,000 rps andar</span><span class="q">poori speed se serve ✅</span></div>
          <div class="dg-rung a"><span class="lv">2</span><span class="cmd">baaki → 503 + Retry-After</span><span class="q">turant, sasta</span></div>
          <div class="dg-rung g"><span class="lv">3</span><span class="cmd">20% users khush</span><span class="q">0% se behtar</span></div>
        </div>
        <div class="dg-cap"><b>Jaldi reject karna</b> ek feature hai — dheere fail
          hona sabse mehenga failure mode hai.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-good" data-hs="priority"><span class="ni">🎖️</span><span class="nl">Priority shedding</span>
        <span class="ns">checkout > browse > analytics<br>pehle sabse kam zaroori girao</span></div>
      <div class="dg-node is-accent" data-hs="queue"><span class="ni">📏</span><span class="nl">Bounded queue</span>
        <span class="ns">bhari? turant reject.<br>Unbounded = "failure baad mein, aur bada"</span></div>
      <div class="dg-node is-gold" data-hs="deadline"><span class="ni">⏳</span><span class="nl">Deadline dekho</span>
        <span class="ns">request 8 s se queue mein hai aur<br>client ka timeout 5 s tha? <b>phenk do</b> —<br>uspar kaam karna barbaadi hai</span></div>
      <div class="dg-node is-good" data-hs="admission"><span class="ni">🚪</span><span class="nl">Admission control</span>
        <span class="ns">waiting room — "loading…" 8 s<br>sabko 503 se behtar</span></div>
    </div>
    <div class="dg-cap"><b>Backpressure</b> ka matlab hai ki "bhar gaya hoon" ka signal
      <b>upstream</b> tak jaaye — taaki woh bhejna hi kam kar de.
      Sirf reject karna aadha kaam hai.</div>`,
};

VISUALS['flashcrowd'] = {
  t: 'Flash crowd — 5 baje, 12 lakh log, ek saath',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">4:59:59</span><span class="dg-arrow"></span>
      <span class="dg-pill bad">12,00,000 users</span><span class="dg-arrow"></span>
      <span class="dg-pill bad">~1,20,000 rps</span>
    </div>
    <div class="dg-cap" style="margin-top:8px">Yeh normal scaling problem <b>nahi</b> hai.
      Yeh ek <b>predictable</b> flash crowd hai — aur usme sabse bada faayda yeh hai ki
      tumhe <b>pehle se pata</b> hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung g" data-hs="pre"><span class="lv">1</span><span class="cmd">PRECOMPUTE — 4:59:59 tak sab taiyaar</span><span class="q">roll_no → poora result object</span></div>
      <div class="dg-rung g" data-hs="scale"><span class="lv">2</span><span class="cmd">PRE-SCALE — autoscaling ka intezaar mat karo</span><span class="q">woh traffic ke BAAD react karta hai</span></div>
      <div class="dg-rung g" data-hs="admit"><span class="lv">3</span><span class="cmd">ADMISSION CONTROL — waiting room</span><span class="q">1.5 lakh andar, baaki "loading…"</span></div>
      <div class="dg-rung g" data-hs="simple"><span class="lv">4</span><span class="cmd">READ PATH bilkul simple</span><span class="q">partitioned KV, ek key lookup</span></div>
      <div class="dg-rung g" data-hs="repl"><span class="lv">5</span><span class="cmd">AGGRESSIVE REPLICATION</span><span class="q">result immutable hai — conflict ho hi nahi sakta</span></div>
      <div class="dg-rung a" data-hs="test"><span class="lv">6</span><span class="cmd">LOAD TEST — asli traffic shape par</span><span class="q">"pehle 10 second" jhel paoge?</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🌩️ RETRY AMPLIFICATION</span>
        <div class="dg-col">
          <div class="dg-node is-bad" data-hs="amp"><span class="nl">12 lakh → 30 lakh</span>
            <span class="ns">503 milte hi log refresh dabate hain<br>(aur app apne aap retry karta hai)</span></div>
          <div class="dg-node is-good"><span class="nl">Waiting room isse bhi rokta hai</span>
            <span class="ns">"Aapka result load ho raha hai" dekh ke<br>user refresh nahi dabata</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">⏱️ 8 SECOND vs 503</span>
        <div class="dg-node is-good"><span class="ni">🚪</span><span class="nl">8 second ka intezaar</span>
          <span class="ns">user ruk jaata hai, result mil jaata hai</span></div>
        <div class="dg-node is-bad"><span class="ni">💥</span><span class="nl">Sabko 503</span>
          <span class="ns">sab refresh dabate hain → aur bura</span></div>
        <div class="dg-cap">Ek <b>predictable</b> event par autoscaling par bharosa karna
          sabse aam galti hai — woh traffic dekhne ke <b>baad</b> react karta hai,
          aur tab tak 10 second beet chuke honge.</div>
      </div>
    </div>`,
};

VISUALS['observability'] = {
  t: 'Observability — "kya toota" nahi, "kahan waqt gaya"',
  html: `
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🔴 RED — har SERVICE ke liye</span>
        <div class="dg-stack">
          <div class="dg-node is-accent" data-hs="rate"><span class="nl">Rate</span><span class="ns">requests/sec</span></div>
          <div class="dg-node is-accent" data-hs="errors"><span class="nl">Errors</span><span class="ns">kitni fail hui</span></div>
          <div class="dg-node is-accent" data-hs="duration"><span class="nl">Duration</span><span class="ns">p50 / p95 / p99</span></div>
        </div>
      </div>
      <div class="dg-box is-gold"><span class="bx-label">🟡 USE — har RESOURCE ke liye</span>
        <div class="dg-stack">
          <div class="dg-node is-gold" data-hs="util"><span class="nl">Utilization</span><span class="ns">kitna use ho raha hai</span></div>
          <div class="dg-node is-gold" data-hs="sat"><span class="nl">Saturation</span><span class="ns">kitna INTEZAAR ho raha hai 🔥</span></div>
          <div class="dg-node is-gold" data-hs="err"><span class="nl">Errors</span><span class="ns">resource-level failures</span></div>
        </div>
        <div class="dg-cap">Zyadatar dashboards par sirf <b>utilization</b> hota hai.
          Aur outage hamesha <b>saturation</b> se aata hai.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-good" data-hs="metrics"><span class="ni">📊</span><span class="nl">Metrics</span>
        <span class="ns">"kya kuch galat hai?"<br>sasta, aggregate, alerting ke liye</span></div>
      <div class="dg-node is-accent" data-hs="traces"><span class="ni">🔍</span><span class="nl">Traces</span>
        <span class="ns">"waqt KAHAN gaya?"<br>ek request ka poora safar</span></div>
      <div class="dg-node is-gold" data-hs="logs"><span class="ni">📜</span><span class="nl">Logs</span>
        <span class="ns">"us EK request mein kya hua?"<br>structured + trace_id</span></div>
    </div>
    <div class="dg-cap" style="margin-top:8px">Teenon ka kaam alag hai. Metric batata hai
      <b>ki</b> problem hai; trace batata hai <b>kahan</b>; log batata hai <b>kya</b>.
      Sirf logs se debug karna ek jasoosi novel hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="health">🟢 HEALTH CHECK KA JHOOTH</span>
      <span><b>Liveness</b> = "process zinda hai?" (restart karo) —
        jaan-boojh ke sasta. <b>Readiness</b> = "traffic le sakta hoon?"
        (LB se hatao). Dono ek hi endpoint banana sabse aam galti hai:
        ek dheemi dependency par liveness fail hoga aur
        <b>healthy pods restart hote rahenge</b>.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good" data-hs="alert">🔔 ALERT SYMPTOMS PAR, CAUSES PAR NAHI</span>
      <span>❌ "CPU &gt; 80%" — toh kya? Shayad sab theek hai.<br>
        ✅ "checkout ka error rate 5 min se &gt; 1%" — user ko dard ho raha hai.<br>
        Har alert ke saath ek <b>runbook</b> ho. Jis alert par koi kuch nahi karta,
        use <b>hata do</b> — woh baaki alerts ko bhi bekaar bana raha hai.</span>
    </div>`,
};

VISUALS['slo'] = {
  t: 'SLO & error budget — "kitna toot sakta hai" ka number',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">99%</span><span class="cmd">"do nines"</span><span class="q">432 min/mahina — 7 ghante!</span></div>
      <div class="dg-rung a"><span class="lv">99.9%</span><span class="cmd">"teen nines"</span><span class="q">43 min/mahina</span></div>
      <div class="dg-rung a"><span class="lv">99.99%</span><span class="cmd">"chaar nines"</span><span class="q">4.3 min/mahina</span></div>
      <div class="dg-rung g"><span class="lv">99.999%</span><span class="cmd">"paanch nines"</span><span class="q">26 SECOND/mahina</span></div>
    </div>
    <div class="dg-cap" style="margin-top:8px">Har extra 9 ki keemat lagbhag <b>10x</b> hai.
      "100% uptime" ek target nahi, ek galatfehmi hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">📐 SLI → SLO → SLA</span>
        <div class="dg-col">
          <div class="dg-node is-accent" data-hs="sli"><span class="nl">SLI</span>
            <span class="ns">jo tum NAAPTE ho<br>"successful requests ÷ total"</span></div>
          <div class="dg-node is-gold" data-hs="slo"><span class="nl">SLO</span>
            <span class="ns">tumhara apna target<br>"99.9% over 30 days"</span></div>
          <div class="dg-node is-bad" data-hs="sla"><span class="nl">SLA</span>
            <span class="ns">customer se contract + PAISA<br>hamesha SLO se DHEELA rakho</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">💰 ERROR BUDGET — asli kaam yeh hai</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="budget"><span class="nl">99.9% = 43 min/mahina</span>
            <span class="ns">yeh tumhara <b>kharch karne ka</b> budget hai</span></div>
          <div class="dg-node is-good"><span class="nl">Budget bacha hai?</span>
            <span class="ns">deploy karo, risk lo, tez chalo 🚀</span></div>
          <div class="dg-node is-bad"><span class="nl">Budget khatam?</span>
            <span class="ns">feature freeze — sirf reliability kaam</span></div>
        </div>
        <div class="dg-cap">Error budget "product vs reliability" wali behes ko
          ek <b>number</b> mein badal deta hai. Yahi uski asli taakat hai.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="burn">🔥 BURN RATE ALERTS</span>
      <span>"Budget 10x speed se jal raha hai" — yeh "error rate &gt; 1%" se behtar alert hai,
        kyunki woh <b>asar</b> ko time se jodta hai. Chhota spike jise budget jhel sakta hai,
        woh raat ko kisi ko nahi jagana chahiye.</span>
    </div>`,
};

VISUALS['boss-resil'] = {
  t: 'BOSS — 3 baje raat, sab kuch ek saath',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">🚨</span><span class="cmd">checkout error rate 60%</span><span class="q">p99 9.9 s</span></div>
      <div class="dg-rung"><span class="lv">📊</span><span class="cmd">CPU 12% · memory 40% · health green</span><span class="q">"sab theek hai"</span></div>
      <div class="dg-rung"><span class="lv">🔌</span><span class="cmd">payment provider p99 = 8 s</span><span class="q">down nahi — DHEEMA</span></div>
      <div class="dg-rung"><span class="lv">🔁</span><span class="cmd">SDK 3 retries, bina jitter</span><span class="q">load ×4</span></div>
      <div class="dg-rung"><span class="lv">🧵</span><span class="cmd">ek hi thread pool sab ke liye</span><span class="q">koi bulkhead nahi</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-good" data-hs="timeout"><span class="ni">⏱️</span><span class="nl">Timeout</span><span class="ns">ek call ka INTEZAAR</span></div>
      <div class="dg-node is-good" data-hs="jitter"><span class="ni">🎲</span><span class="nl">Jitter</span><span class="ns">storm ka SYNCHRONIZATION</span></div>
      <div class="dg-node is-good" data-hs="breaker"><span class="ni">🔌</span><span class="nl">Breaker</span><span class="ns">failing dep par KOSHISH</span></div>
      <div class="dg-node is-good" data-hs="fallback"><span class="ni">🪂</span><span class="nl">Fallback</span><span class="ns">user ka ANUBHAV</span></div>
      <div class="dg-node is-good" data-hs="bulkhead"><span class="ni">🚢</span><span class="nl">Bulkhead</span><span class="ns">BLAST RADIUS</span></div>
      <div class="dg-node is-good" data-hs="shed"><span class="ni">🌊</span><span class="nl">Shed</span><span class="ns">overload mein KITNA KAAM</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill good">🏁 EK LINE MEIN POORA TRACK</span>
      <span>Har remote call ek din fail hogi. Sawaal yeh hai —
        <b>tab tumhara system kya karega?</b>
        Jawab: <code>timeout + jitter + breaker + fallback + bulkhead + shed</code>.</span>
    </div>`,
};

/* =====================================================================
   TRACK 5 — Distributed Data & Consistency
   ===================================================================== */

VISUALS['cap'] = {
  t: 'CAP — network toot-ta hai, toh tum kya chunoge?',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc" data-hs="c">C — Consistency</span>
      <span class="dg-pill acc" data-hs="a">A — Availability</span>
      <span class="dg-pill bad" data-hs="p">P — Partition tolerance</span>
    </div>
    <div class="dg-cap" style="margin-top:8px"><b>P optional nahi hai.</b> Network toot-ta HAI —
      cable kate, switch mare, datacenter alag ho jaaye. Toh asli sawaal
      "teen mein se do" nahi hai. Asli sawaal hai:
      <b>"jab partition ho, toh C chunoge ya A?"</b></div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🔒 CP — Consistency chuna</span>
        <div class="dg-col">
          <div class="dg-node is-accent" data-hs="cp"><span class="nl">Partition mein: ERROR do</span>
            <span class="ns">"abhi nahi bata sakta"<br>galat jawab dene se behtar</span></div>
          <div class="dg-node"><span class="nl">Kahan sahi hai</span>
            <span class="ns">bank balance · inventory · seat booking<br>· permissions</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🟢 AP — Availability chuna</span>
        <div class="dg-col">
          <div class="dg-node is-good" data-hs="ap"><span class="nl">Partition mein: PURANA data do</span>
            <span class="ns">"shayad thoda purana hai"<br>kuch na dene se behtar</span></div>
          <div class="dg-node"><span class="nl">Kahan sahi hai</span>
            <span class="ns">product catalog · social feed<br>· recommendations · analytics</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="pacelc">📐 PACELC — CAP ka poora roop</span>
      <span>if <b>P</b>artition → <b>A</b> ya <b>C</b>;
        <b>E</b>lse (normal din) → <b>L</b>atency ya <b>C</b>onsistency.<br>
        Yeh zyada kaam ka hai, kyunki partition <b>kabhi-kabhi</b> hota hai
        par latency-vs-consistency ka faisla tumhe <b>har din</b> lena padta hai —
        "replica se padhun (tez, thoda purana) ya primary se (dheema, sahi)?"</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="perop">⚠️ YEH FAISLA POORE SYSTEM KA NAHI</span>
      <span>Ek hi app mein: balance dikhana <b>CP</b>, product catalog <b>AP</b>.
        "Hum AP system hain" bolna adhoora hai — faisla <b>per-operation</b> hota hai.</span>
    </div>`,
};

VISUALS['eventual'] = {
  t: 'Eventual consistency — asli kaam UX mein hai',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">t0</span><span class="cmd">user ne profile picture badli</span><span class="q">primary par likha ✅</span></div>
      <div class="dg-rung a"><span class="lv">t1</span><span class="cmd">page reload</span><span class="q">replica se padha — PURANI photo</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">t2</span><span class="cmd">"save nahi hua?" — dobara upload</span><span class="q">ab do photos 😡</span></div>
      <div class="dg-rung g"><span class="lv">t3</span><span class="cmd">…2 second baad sab sync</span><span class="q">par user ja chuka hai</span></div>
    </div>
    <div class="dg-cap" style="margin-top:8px">System <b>sahi</b> tha. UX <b>galat</b> tha.
      Eventual consistency ki asli mushkil technical nahi — <b>product</b> ki hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ CHAAR UX PATTERNS</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="own"><span class="nl">Apna data primary se</span>
            <span class="ns">tumhara data hamesha fresh dikhega;<br>doosron ka replica se chalega</span></div>
          <div class="dg-node is-good" data-hs="optimistic"><span class="nl">Optimistic UI</span>
            <span class="ns">UI mein turant dikha do,<br>background mein confirm karo</span></div>
          <div class="dg-node is-good" data-hs="pending"><span class="nl">"Processing…" batao</span>
            <span class="ns">state chhupao mat — dikhao</span></div>
          <div class="dg-node is-good" data-hs="sticky"><span class="nl">Sticky reads</span>
            <span class="ns">write ke baad kuch second primary se</span></div>
        </div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">🚫 KAHAN EVENTUAL NAHI CHALEGA</span>
        <div class="dg-stack">
          <div class="dg-node is-bad" data-hs="money"><span class="nl">Paisa nikaalna</span><span class="ns">do ATM, purana balance = overdraft</span></div>
          <div class="dg-node is-bad"><span class="nl">Aakhri seat / last item</span><span class="ns">double booking</span></div>
          <div class="dg-node is-bad"><span class="nl">Permissions revoke</span><span class="ns">nikaala hua user abhi bhi andar</span></div>
          <div class="dg-node is-bad"><span class="nl">Unique username</span><span class="ns">do log, ek naam</span></div>
        </div>
        <div class="dg-cap">Yahan <b>strong consistency</b> chahiye — chahe woh dheemi ho.</div>
      </div>
    </div>`,
};

VISUALS['dbperservice'] = {
  t: 'DB per service — aazadi ki keemat',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ SHARED DATABASE</span>
        <div class="dg-col">
          <div class="dg-node is-bad" data-hs="shared"><span class="ni">🗄️</span><span class="nl">Ek DB, 5 services</span>
            <span class="ns">order-service → orders ← inventory-service<br>dono LIKH rahe hain</span></div>
        </div>
        <div class="dg-ladder" style="margin-top:8px">
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">1</span><span class="cmd">ek migration = SAB services ka coordination</span><span class="q">independent deploy gaya</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">2</span><span class="cmd">ek slow query = SAB down</span><span class="q">blast radius = sab</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">3</span><span class="cmd">schema ka maalik koi nahi</span><span class="q">badalne se sab darte hain</span></div>
        </div>
        <div class="dg-cap"><b>Distributed monolith</b> — saare nuksaan, koi faayda nahi.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ DB PER SERVICE</span>
        <div class="dg-col">
          <div class="dg-node is-good" data-hs="own"><span class="ni">🔐</span><span class="nl">Ek service, ek data ka maalik</span>
            <span class="ns">baaki sirf API ya EVENTS se pahunchein<br>— kabhi table se nahi</span></div>
        </div>
        <div class="dg-ladder" style="margin-top:8px">
          <div class="dg-rung g"><span class="lv">✅</span><span class="cmd">independent deploy aur migration</span><span class="q">apna schema, apni marzi</span></div>
          <div class="dg-rung g"><span class="lv">✅</span><span class="cmd">blast radius bandha</span><span class="q">ek DB gire toh ek service</span></div>
          <div class="dg-rung a"><span class="lv">⚠️</span><span class="cmd">JOIN gaya, transaction gaya</span><span class="q">ab composition aur saga</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill acc" data-hs="read">📖 SHARED READ-ONLY?</span>
      <span>"Dusri service ki table sirf PADHENGE" — yeh bhi coupling hai.
        Woh schema badlega toh tum tootoge, aur use pata bhi nahi chalega.
        Behtar: <b>API</b>, ya <b>event se apni copy</b> banao (read model).</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="start">🚦 SHURU KAHAN SE</span>
      <span>Ek DB, par <b>alag schemas/tables per module</b> aur koi cross-module
        foreign key nahi. Yeh "modular monolith" waala rasta hai — aage chal ke
        service nikaalni ho toh line pehle se khinchi hui hai.</span>
    </div>`,
};

VISUALS['querying'] = {
  t: 'Services ke aar-paar query — JOIN gaya, ab kya?',
  html: `
    <div class="dg-grid">
      <div class="dg-node is-accent" data-hs="composition"><span class="ni">🧩</span><span class="nl">API composition</span>
        <span class="ns">gateway N services call kare<br>aur app mein jode<br>✅ simple ❌ fan-out tail</span></div>
      <div class="dg-node is-good" data-hs="cqrs"><span class="ni">📖</span><span class="nl">CQRS read model</span>
        <span class="ns">events se ek denormalized<br>view table banao<br>✅ ek tez query ❌ stale + jagah</span></div>
      <div class="dg-node is-gold" data-hs="replica"><span class="ni">📋</span><span class="nl">Data replication</span>
        <span class="ns">zaroori fields ki apni copy<br>events se update<br>✅ local JOIN ❌ duplicate</span></div>
      <div class="dg-node is-muted" data-hs="search"><span class="ni">🔎</span><span class="nl">Search index</span>
        <span class="ns">sab kuch ek index mein<br>✅ powerful ❌ ek aur system</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🎯 SAWAAL: "Delhi ke users ke pending orders"</span>
        <div class="dg-col">
          <div class="dg-node"><span class="nl">Monolith mein</span><span class="ns">ek JOIN, 5 ms</span></div>
          <div class="dg-node is-bad"><span class="nl">Services mein (naive)</span>
            <span class="ns">user-service se Delhi users (50,000)<br>
              → order-service se har user ke orders<br>
              → 50,000 calls 💀</span></div>
          <div class="dg-node is-good"><span class="nl">CQRS read model</span>
            <span class="ns">ek <code>order_summary</code> table<br>
              (order_id, user_city, status)<br>→ ek query, 5 ms ✅</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🧭 KAISE CHUNO</span>
        <div class="dg-ladder">
          <div class="dg-rung g"><span class="lv">1</span><span class="cmd">2-3 services, chhota data</span><span class="q">API composition</span></div>
          <div class="dg-rung a"><span class="lv">2</span><span class="cmd">baar-baar chalne wali query</span><span class="q">CQRS read model</span></div>
          <div class="dg-rung a"><span class="lv">3</span><span class="cmd">sirf 2-3 fields chahiye</span><span class="q">un fields ki local copy</span></div>
          <div class="dg-rung"><span class="lv">4</span><span class="cmd">arbitrary search + facets</span><span class="q">search index</span></div>
        </div>
        <div class="dg-cap">Har option mein tum <b>freshness</b> bech ke
          <b>query speed</b> khareed rahe ho.</div>
      </div>
    </div>`,
};

VISUALS['saga'] = {
  t: 'Saga — ROLLBACK gaya, ab compensate karo',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ 2PC (do-phase commit)</span>
        <div class="dg-col">
          <div class="dg-node is-bad" data-hs="2pc"><span class="nl">Coordinator sabse "ready?" poochhta hai</span>
            <span class="ns">sab "haan" bolein → sab commit</span></div>
          <div class="dg-node is-bad"><span class="nl">Coordinator prepare ke BAAD mar gaya?</span>
            <span class="ns">sab locks pakde <b>latke</b> rehte hain<br>— aur woh blocking hai</span></div>
        </div>
        <div class="dg-cap">Isiliye microservices mein 2PC lagbhag use nahi hota:
          availability <b>sabse kamzor</b> participant jaisi ho jaati hai.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ SAGA — chhote local transactions</span>
        <div class="dg-ladder">
          <div class="dg-rung g"><span class="lv">1</span><span class="cmd">order banao (pending)</span><span class="q">↩️ order cancel</span></div>
          <div class="dg-rung g"><span class="lv">2</span><span class="cmd">stock reserve karo</span><span class="q">↩️ stock chhodo</span></div>
          <div class="dg-rung g"><span class="lv">3</span><span class="cmd">payment charge karo</span><span class="q">↩️ refund</span></div>
          <div class="dg-rung a"><span class="lv">4</span><span class="cmd">shipping banao</span><span class="q">↩️ shipping cancel</span></div>
        </div>
        <div class="dg-cap">Har kadam ka apna <b>compensating action</b>.
          Step 3 fail? → 2 aur 1 ko ULTA karo.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">💃 CHOREOGRAPHY</span>
        <div class="dg-node is-accent" data-hs="choreo"><span class="nl">Har service event sunta aur publish karta hai</span>
          <span class="ns">OrderCreated → StockReserved → PaymentDone<br>
            ✅ decoupled, koi central point nahi<br>
            ❌ poora flow <b>kahin likha hi nahi</b> hai —<br>
            debugging 6 services ke logs mein</span></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🎭 ORCHESTRATION</span>
        <div class="dg-node is-good" data-hs="orch"><span class="nl">Ek orchestrator har kadam bulata hai</span>
          <span class="ns">✅ flow EK JAGAH dikhta hai<br>
            ✅ state, retry, timeout sab wahin<br>
            ❌ ek aur component, halka coupling</span></div>
        <div class="dg-cap"><b>3 se zyada steps?</b> Orchestration lo.
          Choreography chhote flows mein sundar hai aur bade flows mein
          <b>samajh se bahar</b>.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="isolation">⚠️ SAGA MEIN ISOLATION NAHI HAI</span>
      <span>Beech ki halat <b>doosron ko dikhti</b> hai — order ban chuka hai par
        payment nahi hua. Isliye state explicit rakho
        (<code>pending → confirmed → cancelled</code>) aur UI mein bhi dikhao.
        Aur kuch cheezein ULTI nahi hoti — email chala gaya toh gaya
        ("hamari galti" wala email bhejna hi ilaaj hai).</span>
    </div>`,
};

VISUALS['outbox'] = {
  t: 'Outbox — "DB mein likha par event nahi gaya"',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">💀 DUAL WRITE — ek atomic nahi hai</span>
        <pre style="font-size:.72rem">db.save(order)          ✅
kafka.publish(event)    ❌ crash!

→ order DB mein HAI
→ event kabhi nahi gaya
→ inventory ko pata hi nahi
→ warehouse ko pata hi nahi
→ silent data inconsistency</pre>
        <div class="dg-cap">Kram ulta karo toh ulta problem: event chala gaya
          aur order bana hi nahi. <b>Do alag systems ko ek saath atomic likhna
          namumkin hai.</b></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ OUTBOX — dono EK transaction mein</span>
        <pre style="font-size:.72rem">BEGIN;
  INSERT INTO orders ...;
  INSERT INTO outbox (event) ...;   ← usi DB mein
COMMIT;                             ← ATOMIC ✅

-- alag process:
poll outbox → publish → mark sent</pre>
        <div class="dg-cap">Ab dono ek hi transaction mein hain — ya dono hue,
          ya dono nahi. Publisher crash ho toh event <b>outbox mein pada</b> hai;
          restart par chala jaayega.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill good" data-hs="tx">1 transaction:<br>order + outbox row</span>
      <span class="dg-arrow"></span>
      <span class="dg-pill acc" data-hs="poll">relay poll kare<br>(ya CDC)</span>
      <span class="dg-arrow"></span>
      <span class="dg-pill" data-hs="publish">broker par publish</span>
      <span class="dg-arrow"></span>
      <span class="dg-pill gold" data-hs="mark">sent mark karo</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="atleast">⚠️ AT-LEAST-ONCE</span>
      <span>Publish ke <b>baad</b> aur mark ke <b>pehle</b> crash? Event dobara jaayega.
        Isiliye consumers ko <b>idempotent</b> hona hi hoga —
        outbox exactly-once nahi deta, woh "<b>kabhi kho nahi sakta</b>" deta hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc" data-hs="cdc">🔄 CDC (Debezium)</span>
      <span>Polling ki jagah DB ka <b>transaction log</b> padho. Kam latency,
        DB par kam load — par ek aur system chalana padta hai.</span>
    </div>`,
};

VISUALS['exactlyonce'] = {
  t: 'Exactly-once ka jhooth — at-least-once + idempotent',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🤔 CRASH KE BAAD — pata hi nahi chal sakta</span>
        <div class="dg-ladder">
          <div class="dg-rung"><span class="lv">1</span><span class="cmd">consumer ne message process kiya</span><span class="q">✅</span></div>
          <div class="dg-rung"><span class="lv">2</span><span class="cmd">ack bhejne se PEHLE crash</span><span class="q">💥</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">?</span><span class="cmd">broker ko pata nahi: kaam hua ya nahi</span><span class="q">dono ek jaise dikhte hain</span></div>
        </div>
        <div class="dg-cap">Do hi vikalp hain — aur teesra koi nahi:</div>
        <div class="dg-stack" style="margin-top:8px">
          <div class="dg-node is-gold"><span class="nl">Dobara bhejo</span><span class="ns">at-least-once → DUPLICATES</span></div>
          <div class="dg-node is-bad"><span class="nl">Mat bhejo</span><span class="ns">at-most-once → DATA LOSS</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ ASLI JAWAB</span>
        <div class="dg-col">
          <div class="dg-node is-good" data-hs="formula"><span class="ni">🎯</span>
            <span class="nl">at-least-once delivery<br>+ idempotent processing<br>= effectively-once</span>
            <span class="ns">"exactly-once" nahi — par nateeja wahi</span></div>
        </div>
        <div class="dg-ladder" style="margin-top:8px">
          <div class="dg-rung g" data-hs="key"><span class="lv">1</span><span class="cmd">har message mein ek unique id</span><span class="q">producer deta hai</span></div>
          <div class="dg-rung g" data-hs="unique"><span class="lv">2</span><span class="cmd">processed_ids par UNIQUE constraint</span><span class="q">app check nahi — DB constraint</span></div>
          <div class="dg-rung g" data-hs="same"><span class="lv">3</span><span class="cmd">side-effect + id ek transaction mein</span><span class="q">warna phir dual write</span></div>
        </div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill acc" data-hs="natural">💡 SABSE SASTI IDEMPOTENCY</span>
      <span>Kabhi-kabhi operation <b>khud hi</b> idempotent hoti hai —
        <code>SET status = 'shipped'</code> (kitni baar bhi chalao, wahi natija).
        Jahan ho sake, operation ko aisa hi design karo:
        "value SET karo" &gt; "value BADHAO".</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="claim">⚠️ "Hamara broker exactly-once deta hai"</span>
      <span>Woh apne <b>andar</b> deta hai (read → process → write, ek hi cluster mein).
        Jaise hi tum bahar kuch karte ho — payment API call, email bhejna —
        woh guarantee khatm. <b>Idempotency phir bhi tumhe hi likhni hai.</b></span>
    </div>`,
};

VISUALS['scheduling'] = {
  t: 'Scheduled work — 2 crore rows scan mat karo',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🐌 POLLING — "sabse poochho"</span>
        <pre style="font-size:.72rem">-- har ghante:
SELECT * FROM cards
WHERE due_date - INTERVAL '5 days' 
      BETWEEN now() AND now()+1h;

→ 2 CRORE rows scan
→ 50,000 reminders mile
→ har ghante, hamesha</pre>
        <div class="dg-cap">Yeh wahi bimari hai jo <b>deep pagination</b> mein thi:
          jawab ke liye <b>poora dataset chhuna</b>. Access pattern galat hai,
          data ka size nahi.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">⚡ SCHEDULED EVENT — "waqt likh lo"</span>
        <pre style="font-size:.72rem">-- jab bill aaye ya due date badle:
reminder_at = due_date - 5 days
              (user ke timezone mein)
INSERT/UPDATE ek baar

-- worker:
SELECT * FROM reminders
WHERE reminder_at <= now()
ORDER BY reminder_at
LIMIT 1000;      ← index par seek</pre>
        <div class="dg-cap">Ek baar hisaab karo, <b>store karo</b>, aur waqt aane par
          uthao. 2 crore scan ki jagah 50,000 due rows par seedha seek.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-accent" data-hs="bucket"><span class="ni">🪣</span><span class="nl">Time buckets / timer wheel</span>
        <span class="ns">agle 1 min · agle 5 min · baad mein<br>worker sirf paas wale bucket dekhta hai</span></div>
      <div class="dg-node is-good" data-hs="index"><span class="ni">🗂️</span><span class="nl">Index on reminder_at</span>
        <span class="ns">technology se zyada<br><b>ACCESS PATTERN</b> matter karta hai</span></div>
      <div class="dg-node is-gold" data-hs="partition"><span class="ni">🔀</span><span class="nl">Partition karo</span>
        <span class="ns">user_id · date · region<br>workers alag-alag partition lein</span></div>
      <div class="dg-node is-accent" data-hs="stagger"><span class="ni">🎲</span><span class="nl">Stagger karo</span>
        <span class="ns">50 lakh notifications 9:00 par nahi —<br>9:00–9:30 mein phailao</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="change">🔄 ASLI DUNIYA BADALTI HAI</span>
      <span>Yahi ise cron se alag banata hai. User ne <b>pehle</b> pay kar diya → reminder cancel.
        Bank ne <b>due date badli</b> → recompute. User ne reminders <b>band</b> kiye → cancel.
        Send <b>fail</b> hua → backoff ke saath retry. Schedule ek <b>jeeti-jaagti</b> cheez hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold" data-hs="idem">♻️ IDEMPOTENT SEND</span>
      <span>Workers crash hote hain aur queues redeliver karti hain.
        <code>(user_id, bill_id, reminder_date)</code> par unique constraint —
        warna user ko ek hi reminder 3 baar jaayega.</span>
    </div>`,
};

VISUALS['locks'] = {
  t: 'Distributed lock & leader election — bharosa kam karo',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">⚠️ DISTRIBUTED LOCK TOOTA HUA HAI</span>
        <div class="dg-ladder">
          <div class="dg-rung"><span class="lv">1</span><span class="cmd">A ne lock liya (TTL 30 s)</span><span class="q">✅</span></div>
          <div class="dg-rung"><span class="lv">2</span><span class="cmd">A ka GC pause / network freeze — 40 s</span><span class="q">A ko pata nahi</span></div>
          <div class="dg-rung a"><span class="lv">3</span><span class="cmd">lock expire hua, B ne le liya</span><span class="q">B kaam kar raha hai</span></div>
          <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">4</span><span class="cmd">A jaaga aur likhne laga</span><span class="q">💀 DONO likh rahe hain</span></div>
        </div>
        <div class="dg-cap">A ko lagta hai uske paas lock hai. Woh <b>galat</b> hai —
          par jaan-ne ka koi tareeka nahi.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ ILAAJ</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="fence"><span class="nl">Fencing token</span>
            <span class="ns">har lock ke saath badhta hua number;<br>
              storage purane token ko REJECT kare</span></div>
          <div class="dg-node is-good" data-hs="avoid"><span class="nl">…ya lock hi mat lo</span>
            <span class="ns">DB unique constraint · conditional update<br>
              · partition (ek key = ek worker)</span></div>
        </div>
        <div class="dg-cap"><b>Sabse achha distributed lock woh hai jiski zaroorat hi na pade.</b>
          Aksar design badal ke lock hataya ja sakta hai.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">👑 LEADER ELECTION</span>
        <div class="dg-col">
          <div class="dg-node is-accent" data-hs="leader"><span class="nl">Ek node "leader", baaki standby</span>
            <span class="ns">cron jobs · partition assignment<br>· sequence generation</span></div>
          <div class="dg-node is-bad" data-hs="split"><span class="nl">Split-brain</span>
            <span class="ns">network partition mein DO leader ban sakte hain —<br>
              isiliye quorum (majority) chahiye</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🧰 KYA USE KARO</span>
        <div class="dg-ladder">
          <div class="dg-rung g"><span class="lv">1</span><span class="cmd">DB unique constraint / conditional update</span><span class="q">sabse simple, sabse strong</span></div>
          <div class="dg-rung g"><span class="lv">2</span><span class="cmd">Partition — ek key sirf ek worker ko</span><span class="q">lock ki zaroorat hi khatam</span></div>
          <div class="dg-rung a"><span class="lv">3</span><span class="cmd">etcd / ZooKeeper (consensus)</span><span class="q">sach mein leader chahiye toh</span></div>
          <div class="dg-rung"><span class="lv">4</span><span class="cmd">Redis lock (fencing token ke saath)</span><span class="q">sirf "best effort" kaam ke liye</span></div>
        </div>
      </div>
    </div>`,
};

VISUALS['boss-dist'] = {
  t: 'BOSS — poora order system',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">📱 App</span><span class="dg-arrow"></span>
      <span class="dg-pill gold">order-service</span><span class="dg-arrow"></span>
      <span class="dg-pill acc">outbox</span><span class="dg-arrow"></span>
      <span class="dg-pill">broker</span><span class="dg-arrow"></span>
      <span class="dg-pill good">inventory · payment · shipping</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">1</span><span class="cmd">Idempotency-Key se order banao (pending)</span><span class="q">double-submit safe</span></div>
      <div class="dg-rung g"><span class="lv">2</span><span class="cmd">order + outbox row EK transaction mein</span><span class="q">event kabhi kho nahi sakta</span></div>
      <div class="dg-rung g"><span class="lv">3</span><span class="cmd">orchestrator saga chalaye</span><span class="q">flow ek jagah dikhe</span></div>
      <div class="dg-rung g"><span class="lv">4</span><span class="cmd">har consumer idempotent</span><span class="q">at-least-once = duplicates</span></div>
      <div class="dg-rung g"><span class="lv">5</span><span class="cmd">fail par compensate + state dikhao</span><span class="q">saga mein isolation nahi hai</span></div>
      <div class="dg-rung g"><span class="lv">6</span><span class="cmd">"Delhi ke pending orders" ke liye read model</span><span class="q">cross-service JOIN gaya</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill good">🏁 EK LINE MEIN POORA TRACK</span>
      <span>Distributed system mein "ek saath" jaisi koi cheez nahi hoti — sirf "aakhir mein".
        Isliye har cheez <b>idempotent</b>, <b>retryable</b> aur <b>observable</b> banao.</span>
    </div>`,
};

/* ===== TRACK 2 addition — auth ===== */
VISUALS['auth'] = {
  t: 'Identity kahan se aati hai — aur kahan se KABHI nahi',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Client jo bhej raha hai</span>
        <div class="dg-stack">
          <div class="dg-node is-bad" data-hs="spoof"><span class="ni">🔗</span><span class="nl">?user_id=8</span><span class="ns">query param — client jo chaahe likh de</span></div>
          <div class="dg-node is-bad" data-hs="spoof"><span class="ni">📦</span><span class="nl">{ "user_id": 8 }</span><span class="ns">body — bilkul wahi baat</span></div>
          <div class="dg-node is-bad" data-hs="spoof"><span class="ni">🏷️</span><span class="nl">X-User-Id: 8</span><span class="ns">header hai, par <b>bina signature</b> ke — utna hi jhootha</span></div>
        </div>
        <div class="dg-cap">Request ka <b>har hissa</b> client ke kaabu mein hai.
          Yahan se identity lena = <b>IDOR</b>, OWASP API ki #1 vulnerability.
          URL mein ek number badalna hi poora "hack" hai.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Server jo verify kar sakta hai</span>
        <div class="dg-stack">
          <div class="dg-node is-good" data-hs="token"><span class="ni">🔐</span><span class="nl">Authorization: Bearer &lt;jwt&gt;</span><span class="ns">server ke <b>signature</b> ke saath</span></div>
          <div class="dg-node is-accent" data-hs="short"><span class="ni">⏳</span><span class="nl">access token: 5–15 min</span><span class="ns">revoke nahi hota — isliye umar chhoti</span></div>
          <div class="dg-node is-gold"><span class="ni">🔁</span><span class="nl">refresh token: 30 din</span><span class="ns">server ke paas — <b>revoke ho sakta hai</b></span></div>
        </div>
        <div class="dg-cap">Hum header par bharosa nahi karte — <b>signature</b> par karte hain.
          Yahi ek farak hai.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">client</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">gateway<br><small>authN: token asli hai?</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good" data-hs="own">service<br><small>authZ: yeh row <b>iski</b> hai?</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">DB</span>
    </div>
    <div class="dg-cap">Gateway sirf keh sakta hai "yeh user 7 hai". "Order #9912 user 7 ka hai"
      — yeh sirf woh service jaanti hai jiske paas data hai. Behtar: check ko
      <b>query mein</b> daal do — <code>WHERE id=? AND user_id=?</code> — taaki bhoolna mumkin hi na ho.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">401</span><span class="cmd">Unauthorized</span><span class="q">"tum kaun ho, pata nahi" → client login/refresh bheje</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">403</span><span class="cmd">Forbidden</span><span class="q">"pata hai, ijaazat nahi" → login se kuch nahi hoga</span></div>
      <div class="dg-rung" style="border-left-color:var(--muted)"><span class="lv">404</span><span class="cmd">Not Found</span><span class="q">jab <b>existence</b> hi secret ho (private repos)</span></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">⚠️ Galat code = infinite login loop</span>
      <span>AuthZ fail par 401 bhejoge toh mobile app bar-bar login screen dikhaayega —
        jabki login se problem hal hi nahi hone wali.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">🔒 DEFAULT DENY</span>
      <span>Naya endpoint bana ke auth lagana bhoolna sabse aam auth bug hai.
        Ilaaj: public ko <code>@Public</code> se <b>explicitly</b> mark karna pade —
        bhoolne ka natija "band" ho, "khula" nahi.</span>
    </div>`,
};

/* ===== TRACK 3 additions ===== */
VISUALS['eviction'] = {
  t: 'Cache ke andar — kya nikle, kya bache',
  html: `
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">🧊</span><span class="nl">EVICTION</span><span class="ns">memory bhar gayi<br><b>policy</b> decide karti hai</span></div>
      <div class="dg-node is-accent"><span class="ni">⏳</span><span class="nl">EXPIRY (TTL)</span><span class="ns">waqt poora hua<br><b>tumne</b> likha tha</span></div>
      <div class="dg-node is-gold"><span class="ni">🔄</span><span class="nl">INVALIDATION</span><span class="ns">data badal gaya<br><b>write path</b> ka kaam</span></div>
    </div>
    <div class="dg-cap">Teen alag cheezein. "Stale data" ka ilaaj policy badalna nahi hai —
      woh invalidation ka bug hai. "Hit rate gir gaya" ka ilaaj TTL nahi — woh aksar size hai.
      Isiliye <code>evictions</code> aur <code>expirations</code> ko <b>alag</b> count karo.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung g" data-hs="policy"><span class="lv">LRU</span><span class="cmd">jo sabse pehle use hui thi</span><span class="q">recency — sessions, "abhi dekha hua"</span></div>
      <div class="dg-rung g" data-hs="policy"><span class="lv">LFU</span><span class="cmd">jo sabse kam BAAR use hui</span><span class="q">kuch keys hamesha hot — top products</span></div>
      <div class="dg-rung" data-hs="policy"><span class="lv">FIFO</span><span class="cmd">jo sabse pehle aayi thi</span><span class="q">rolling buffer — warna kabhi hi</span></div>
    </div>

    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">💀 LRU ka scan pollution</span>
        <div class="dg-flow" data-hs="pollute">
          <span class="dg-pill bad">analytics job</span><span class="dg-arrow">→</span>
          <span class="dg-pill">10 lakh keys chhui</span><span class="dg-arrow">→</span>
          <span class="dg-pill bad">sab "recent"</span>
        </div>
        <div class="dg-cap">Scan ki har key LRU ke liye "abhi use hui" hai, isliye woh asli hot keys
          ko bahar nikaal deti hai — aur unme se koi <b>dobara maangi hi nahi jaayegi</b>.
          "Nightly job ke baad subah tak slow" ka signature yahi hai.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🔥 Hot key — sharding se hal NAHI hoti</span>
        <div class="dg-stack">
          <div class="dg-node is-bad"><span class="ni">🔴</span><span class="nl">node-3</span><span class="ns">50,000 rps — jal raha hai</span></div>
          <div class="dg-node is-muted"><span class="ni">😴</span><span class="nl">baaki 7 nodes</span><span class="ns">0 rps — khaali</span></div>
          <div class="dg-node is-good" data-hs="replicate"><span class="ni">🧬</span><span class="nl">key#0 … key#7</span><span class="ns">N copies → load bant gaya</span></div>
        </div>
        <div class="dg-cap">Ek key hamesha <b>ek</b> node par hash hoti hai. Cluster ki total capacity
          chahe kitni ho — <b>ek key ki capacity ek node ki capacity hai</b>. Upar 1s ka local cache
          bhi lagao: 99.9% traffic app ki memory se hi nikal jaayega.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill acc">💧 TTL JITTER</span>
      <span>ALAG-ALAG keys ek saath expire na hon. 10,000 keys ek pal mein expire = stampede.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good" data-hs="flight">🤝 SINGLE-FLIGHT</span>
      <span>EK key par ek saath aaye 5,000 miss → <b>1</b> DB query. Pehli request lock leti hai,
        baaki usi jawab ka intezaar karti hain. Jitter se alag bimari — dono ka ilaaj lagao.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🏗️ CACHE LOAD-BEARING HAI</span>
      <span>95% hit rate ka matlab hai Redis girte hi DB par load <b>20x</b>. Cache "optional speedup"
        lagta hai par chupke se woh deewar ban jaata hai jiske bina system khada nahi rehta.</span>
    </div>`,
};

VISUALS['engines'] = {
  t: 'B-tree vs LSM — kharch abhi ya baad mein',
  html: `
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🌳 B-tree — "abhi kharch karo"</span>
        <div class="dg-flow">
          <span class="dg-pill">write</span><span class="dg-arrow">→</span>
          <span class="dg-pill bad">page dhoondo</span><span class="dg-arrow">→</span>
          <span class="dg-pill bad">padho</span><span class="dg-arrow">→</span>
          <span class="dg-pill bad">badlo</span><span class="dg-arrow">→</span>
          <span class="dg-pill bad">likho</span>
        </div>
        <div class="dg-cap">Random page I/O + page splits + har index ka apna update.
          <b>write amp ~4x</b>. Par read seedha hai: ek descent, row mil gayi.
          Postgres, InnoDB, MongoDB.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">📚 LSM — "baad mein kharch karo"</span>
        <div class="dg-flow">
          <span class="dg-pill">write</span><span class="dg-arrow">→</span>
          <span class="dg-pill good">memtable</span><span class="dg-arrow">→</span>
          <span class="dg-pill good">WAL append</span><span class="dg-arrow">→</span>
          <span class="dg-pill good">SSTable</span>
        </div>
        <div class="dg-cap">Kuch dhoondta hi nahi — sirf <b>append</b>. Sequential I/O,
          <b>write amp ~1.3x</b>. Par read ko memtable → L0 → L1 → L2 → L3 dekhne pad sakte hain.
          RocksDB, Cassandra, ScyllaDB.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">WRITE</span><span class="cmd">disk par gaya ÷ tumne likha</span><span class="q">B-tree 4.2x · LSM 1.3x</span></div>
      <div class="dg-rung"><span class="lv">READ</span><span class="cmd">ek row ke liye kitni jagah dekhi</span><span class="q">B-tree 1x · LSM 5x (bloom filters bachate hain)</span></div>
      <div class="dg-rung"><span class="lv">SPACE</span><span class="cmd">disk size ÷ asli data</span><span class="q">B-tree 1.3x · LSM 2.1x (purane versions + tombstones)</span></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">⚖️ RUM CONJECTURE</span>
      <span><b>R</b>ead, <b>U</b>pdate, <b>M</b>emory — kisi bhi do ko behtar karo, teesra bigadta hai.
        Isiliye "sabse achha engine" hota hi nahi, sirf "is workload ke liye sahi engine".</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🧹 COMPACTION = LSM KA CHHUPA BILL</span>
      <span>Writes tez the kyunki kaam <b>taala</b> gaya tha. Compaction woh kaam karti hai —
        disk I/O saturate, read p99 ~3x. "Sab theek tha, achanak p99 chad gaya" ka jawab
        aksar yahi hota hai. Aur LSM mein <b>DELETE se disk BADHTA hai</b> (tombstone).</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">📇 ROW store (OLTP)</span>
        <div class="dg-cap"><code>[id|name|city|amt] [id|name|city|amt] …</code><br>
          ✅ "user 7 ka poora record" — ek jagah se<br>
          ❌ "saare amounts ka SUM" — har row ki har column</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">📊 COLUMNAR (OLAP)</span>
        <div class="dg-cap"><code>[id id id…] [name…] [amt amt amt…]</code><br>
          ✅ SUM — sirf ek column, aur ek jaisi values → 10x compress<br>
          ❌ poora record — 4 jagah se todna pada</div>
      </div>
    </div>
    <div class="dg-cap"><b>OLTP</b> = thodi rows ki saari columns. <b>OLAP</b> = saari rows ki thodi columns.
      Layout hi ulta hai — isiliye ek DB dono achhe se nahi kar sakta.
      Aur OLTP par analytics chalane ka asli nuksaan latency nahi, <b>buffer pool pollution</b> hai.</div>`,
};

VISUALS['migrations'] = {
  t: 'Zero-downtime migration — kram hi sab kuch hai',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">1</span><span class="cmd">EXPAND</span><span class="q">nayi table/column banao — purani ko haath mat lagao</span></div>
      <div class="dg-rung g"><span class="lv">2</span><span class="cmd">DUAL-WRITE</span><span class="q">har naya write DONO jagah — <b>backfill se PEHLE</b></span></div>
      <div class="dg-rung g"><span class="lv">3</span><span class="cmd">BACKFILL</span><span class="q">chhote batches (5k–10k) + beech mein sleep</span></div>
      <div class="dg-rung g"><span class="lv">4</span><span class="cmd">VERIFY</span><span class="q">count → checksum → shadow read</span></div>
      <div class="dg-rung g"><span class="lv">5</span><span class="cmd">CUTOVER</span><span class="q">ek FLAG se — 1% → 10% → 100%</span></div>
      <div class="dg-rung g"><span class="lv">6</span><span class="cmd">CONTRACT</span><span class="q">kuch din baad purana likhna band, phir drop</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Kram ulta: backfill pehle</span>
        <div class="dg-flow">
          <span class="dg-pill">backfill shuru</span><span class="dg-arrow">→</span>
          <span class="dg-pill bad">41,204 naye writes</span><span class="dg-arrow">→</span>
          <span class="dg-pill">backfill khatam</span>
        </div>
        <div class="dg-cap">Backfill ek <b>snapshot</b> copy karta hai. Us doraan aaye writes
          nayi table mein pahunche hi nahi. Nayi table ab <b>chup-chaap galat</b> hai —
          aur yeh galti <b>koi error nahi</b> deti. Sirf <code>verify</code> ise pakadta hai.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Sahi kram: dual-write pehle</span>
        <div class="dg-flow">
          <span class="dg-pill good">dual-write ON</span><span class="dg-arrow">→</span>
          <span class="dg-pill">backfill</span><span class="dg-arrow">→</span>
          <span class="dg-pill good">drift = 0</span>
        </div>
        <div class="dg-cap">Do kadam milke ek <b>poora cover</b> dete hain:
          backfill <b>ateet</b> sambhaalta hai, dual-write <b>vartaman</b>.
          Beech mein koi khaali khidki bachni nahi chahiye.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">🔢</span><span class="nl">Count</span><span class="ns">rows barabar? — sasta, roz chalao</span></div>
      <div class="dg-node is-accent"><span class="ni">🧮</span><span class="nl">Checksum</span><span class="ns">values bhi barabar? — batch-wise hash</span></div>
      <div class="dg-node is-good"><span class="ni">👥</span><span class="nl">Shadow read</span><span class="ns">asli traffic dono jagah, compare + log</span></div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill bad">🚪 ROLLBACK KA DARWAZA</span>
      <span>Rollback tab tak mumkin hai jab tak <b>purani table source of truth hai</b>.
        Jis pal wahan likhna band karoge, darwaza band. Isliye dual-write cutover ke
        <b>baad bhi</b> kuch din chalao.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">🎛️ CUTOVER = FLAG, DEPLOY NAHI</span>
      <span>Deploy rollback: 20 minute. Flag palatna: 20 second. Ek incident mein woh farak sab kuch hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">📏 BATCH SIZE</span>
      <span>Bada batch = lambi transaction = locks + undo bloat + replica lag.
        Migration ka dhyeya "jaldi" nahi — <b>"kisi ko pata na chale"</b> hai.</span>
    </div>`,
};

/* ===== TRACK 6 — Patterns & System Shapes ===== */
VISUALS['classify'] = {
  t: 'Boxes se pehle naam — 12 shapes aur unke failure modes',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">❌ boxes banao</span><span class="dg-arrow">→</span>
      <span class="dg-pill">LB · service · DB · cache</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">"cache kyun?" — "scale ke liye"</span>
    </div>
    <div class="dg-flow" style="margin-top:8px">
      <span class="dg-pill good">✅ naam lo</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">"read-heavy + realtime fanout"</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">failure modes khud saamne</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">Read zyada ya write zyada?</span><span class="q">cache/replicas &nbsp;vs&nbsp; append log/partitioning</span></div>
      <div class="dg-rung"><span class="lv">2</span><span class="cmd">Turant ya thodi der mein?</span><span class="q">push/websocket &nbsp;vs&nbsp; queue/batch</span></div>
      <div class="dg-rung"><span class="lv">3</span><span class="cmd">Serve kar rahe ho ya process?</span><span class="q">latency, p99 &nbsp;vs&nbsp; throughput, cost</span></div>
      <div class="dg-rung"><span class="lv">4</span><span class="cmd">Ek user ya laakhon tak fanout?</span><span class="q">hot keys, celeb problem, precompute</span></div>
      <div class="dg-rung g"><span class="lv">5</span><span class="cmd">Galat jawab kitna MEHENGA hai?</span><span class="q">yeh akela caching + consistency + transactions tay kar deta hai</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-accent"><span class="ni">📖</span><span class="nl">Read-heavy</span><span class="ns">feed, catalog<br>💀 cache invalidation · hot key</span></div>
      <div class="dg-node is-accent"><span class="ni">✍️</span><span class="nl">Write-heavy</span><span class="ns">logs, metrics<br>💀 duplicates · partition key</span></div>
      <div class="dg-node is-accent"><span class="ni">📡</span><span class="nl">Realtime fanout</span><span class="ns">chat, live score<br>💀 connection storm · offline gap</span></div>
      <div class="dg-node is-accent"><span class="ni">📊</span><span class="nl">Batch / analytics</span><span class="ns">dashboards<br>💀 pipeline chup-chaap fail</span></div>
      <div class="dg-node is-accent"><span class="ni">🔍</span><span class="nl">Search</span><span class="ns">search bar<br>💀 indexing lag · relevance</span></div>
      <div class="dg-node is-accent"><span class="ni">📤</span><span class="nl">File / media</span><span class="ns">photos, video<br>💀 app se proxy · storage cost</span></div>
      <div class="dg-node is-accent"><span class="ni">🔄</span><span class="nl">Workflow</span><span class="ns">order pipeline<br>💀 beech mein fail · compensation</span></div>
      <div class="dg-node is-accent"><span class="ni">💰</span><span class="nl">Transactional</span><span class="ns">wallet, payments<br>💀 "numbers match nahi kar rahe"</span></div>
      <div class="dg-node is-accent"><span class="ni">🎯</span><span class="nl">Recommendation</span><span class="ns">home feed<br>💀 cold start · training-serving skew</span></div>
      <div class="dg-node is-accent"><span class="ni">🔔</span><span class="nl">Notification</span><span class="ns">email, push<br>💀 duplicate · 9AM par 50 lakh</span></div>
      <div class="dg-node is-accent"><span class="ni">📍</span><span class="nl">Geo / spatial</span><span class="ns">nearby drivers<br>💀 hot cell · cell boundary</span></div>
      <div class="dg-node is-accent"><span class="ni">🧭</span><span class="nl">Coordination</span><span class="ns">scheduler, leader<br>💀 split brain · clock skew</span></div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill gold">🧩 EK SYSTEM = 2–3 SHAPES</span>
      <span>Instagram = read-heavy (feed) + media (photos) + realtime fanout (notifications)
        + recommendation (explore). Har hisse ko uske <b>apne</b> shape se design karo —
        ek hi hathoda sab par chalane se hi log photos DB mein daal dete hain.</span>
    </div>`,
};

VISUALS['search'] = {
  t: 'Inverted index — table ko ulta kar do',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ LIKE '%wireless%'</span>
        <div class="dg-cap">B-tree <b>sorted</b> hai — navigate shuruaat se hota hai.
          Beech ka match matlab shuruaat unknown, isliye <b>har row</b> padhni padegi.
          <br><br><code>LIKE 'wireless%'</code> ✅ index chalega
          <br><code>LIKE '%wireless%'</code> ❌ full scan
          <br><br>Farak sirf ek <code>%</code> ka hai — aur uske liye poora alag system chahiye.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Inverted index</span>
        <div class="dg-cap"><b>NORMAL:</b> row → uske shabd
          <br><code>doc 12 → "wireless bluetooth headphones"</code>
          <br><br><b>INVERTED:</b> shabd → rows ki sorted list
          <br><code>"wireless"  → [12, 47, 88, 301, …]</code>
          <br><code>"bluetooth" → [12, 205, …]</code>
          <br><br>Multi-word search = lists ka <b>intersection</b> — microseconds,
          chahe crore documents hon.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">"Wireless Headphones!"</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">lowercase</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">tokenize</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">stopwords</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">stemming</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">synonyms</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">postings</span>
    </div>
    <div class="dg-cap">Yahi hissa search ko "database" se alag banata hai — yeh ek <b>bhasha</b> ka
      faisla hai. Aur <b>query bhi isi pipeline</b> se guzarni chahiye, warna query aur index ke
      token match hi nahi karenge.</div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill good">POST /products</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">Postgres<br><small>source of truth</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">CDC / outbox</span><span class="dg-arrow">→</span>
      <span class="dg-pill">queue</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">Elasticsearch<br><small>⏳ 2–30 sec</small></span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">⏳ INDEXING LAG</span>
      <span>"Maine save kiya, search mein nahi dikh raha" — yeh <b>bug nahi, design</b> hai.
        Ilaaj UX mein: apne items DB se dikhao (read-your-own-writes) + "indexing" ka signal
        + lag par ek SLI/alert. Sync indexing karne se search ka problem
        <b>availability</b> ka problem ban jaata hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🚫 SEARCH INDEX ≠ SOURCE OF TRUTH</span>
      <span>Woh reindex hoga hi — naya analyzer, naya field, version upgrade, corruption.
        Sirf wahan rakha data ek din chala jaayega. Aur usme <b>tezi se badalne wala</b> data
        (jaise daam) mat rakho: filter uspar karo, par dikhao live source se.</span>
    </div>`,
};

VISUALS['media'] = {
  t: 'Presigned upload — bytes app server se guzarte hi nahi',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ App ke through proxy</span>
        <div class="dg-flow">
          <span class="dg-pill">client</span><span class="dg-arrow">→</span>
          <span class="dg-pill bad">app server<br><small>12 MINUTE</small></span><span class="dg-arrow">→</span>
          <span class="dg-pill">S3</span>
        </div>
        <div class="dg-cap">4 GB video, dheema mobile network = 12 minute. Un 12 minute mein
          us request ne ek <b>thread</b> pakda hai, aur aksar ek <b>DB connection</b> bhi.
          50 log ek saath upload karein → pool khatam → <b>poori API</b> timeout,
          jiska upload se koi lena-dena hi nahi.
          <br><br>Yeh bilkul wahi <b>pool exhaustion</b> hai — CPU 10%, health green, sab timeout.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Presigned URL</span>
        <div class="dg-flow">
          <span class="dg-pill">client</span><span class="dg-arrow">→</span>
          <span class="dg-pill good">app<br><small>40 ms</small></span><span class="dg-arrow">→</span>
          <span class="dg-pill acc">signed URL</span>
        </div>
        <div class="dg-flow" style="margin-top:6px">
          <span class="dg-pill">client</span><span class="dg-arrow">⟹</span>
          <span class="dg-pill good">S3 (SEEDHA)</span><span class="dg-arrow">→</span>
          <span class="dg-pill acc">event: "aa gaya"</span>
        </div>
        <div class="dg-cap">App ne 40 ms kaam kiya, 12 minute nahi. Aur multipart/resume
          storage khud deta hai — jo warna tumhe likhna padta.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">🔏</span><span class="cmd">expiry 5–15 min</span><span class="q">chori hua URL zyada der kaam na kare</span></div>
      <div class="dg-rung g"><span class="lv">🔏</span><span class="cmd">ek hi key</span><span class="q">koi doosri file overwrite na kar de</span></div>
      <div class="dg-rung g"><span class="lv">🔏</span><span class="cmd">max Content-Length</span><span class="q">warna koi 500 GB daal dega — bill tumhara</span></div>
      <div class="dg-rung g"><span class="lv">🔏</span><span class="cmd">fix Content-Type</span><span class="q">warna HTML upload karke tumhare domain par XSS</span></div>
    </div>
    <div class="dg-cap">Signed URL ek <b>capability</b> hai — jiske paas hai woh wahi kar sakta hai
      jo signature mein likha hai. Har shart ek darwaza band karti hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">🪣 Object storage</span>
        <div class="dg-cap">asli <b>bytes</b> · transcoded versions · thumbnails
          <br><small>sasta, unlimited, CDN-friendly</small></div>
      </div>
      <div class="dg-box is-accent"><span class="bx-label">🗄️ Database</span>
        <div class="dg-cap">id, owner, size, type, <b>status</b>, s3_key, view count
          <br><small>query, join, permission, transaction</small></div>
      </div>
    </div>
    <div class="dg-flow" style="margin-top:8px">
      <span class="dg-pill">uploaded</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">scanning</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">processing</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">ready</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">💸 STORAGE BILL</span>
      <span>Lifecycle rules <b>din 1</b> par likho: 30d → IA, 90d → archive.
        Aur <b>orphan objects</b> saaf karo — failed uploads aur delete hui rows ke bytes
        jo storage mein pade rehte hain, aur jinka DB mein koi row nahi.</span>
    </div>`,
};

VISUALS['realtime'] = {
  t: 'Realtime — connections ek capacity dimension hain',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">📊</span><span class="cmd">Polling — har 5s ek request</span><span class="q">update kam ho toh sabse simple, aur aksar kaafi</span></div>
      <div class="dg-rung"><span class="lv">⏸️</span><span class="cmd">Long poll — request rukti hai</span><span class="q">WebSocket na chale tab ka fallback</span></div>
      <div class="dg-rung g"><span class="lv">📡</span><span class="cmd">SSE — ek-tarfa stream</span><span class="q">plain HTTP! proxies + auto-reconnect muft — notifications, LLM tokens</span></div>
      <div class="dg-rung g"><span class="lv">🔌</span><span class="cmd">WebSocket — do-tarfa</span><span class="q">jab client BHI bheje — chat, collab, gaming</span></div>
    </div>
    <div class="dg-cap">Sabse aam over-engineering: notifications ke liye WebSocket.
      Ek-tarfa data ke liye <b>SSE</b> chuno — woh plain HTTP hai, isliye purane proxies,
      load balancers aur reconnect sab apne aap kaam karte hain.</div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">client</span><span class="dg-arrow">⇄</span>
      <span class="dg-pill acc">WS gateway<br><small>sirf sockets</small></span><span class="dg-arrow">⇄</span>
      <span class="dg-pill gold">pub/sub</span><span class="dg-arrow">⇄</span>
      <span class="dg-pill good">services</span>
    </div>
    <div class="dg-cap"><code>10 lakh users ÷ 50,000 conn/node = 20 gateway nodes</code> —
      aur woh nodes tab bhi chahiye jab <b>koi kuch bhej hi na raha ho</b>.
      Pub/sub isliye ki user A gateway-3 par hai aur user B gateway-17 par.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Sirf broadcast</span>
        <div class="dg-flow">
          <span class="dg-pill">message</span><span class="dg-arrow">→</span>
          <span class="dg-pill bad">WebSocket broadcast</span>
        </div>
        <div class="dg-cap">Offline user ne message <b>hamesha ke liye</b> miss kar diya.
          Aur agar DB insert baad mein fail ho gaya, toh woh dikha bhi aur save bhi nahi hua.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Store, phir push</span>
        <div class="dg-flow">
          <span class="dg-pill good">persist (id ke saath)</span><span class="dg-arrow">→</span>
          <span class="dg-pill acc">push</span>
        </div>
        <div class="dg-cap">Reconnect par client apna <code>last_seen_id</code> bhejta hai
          aur gap bhar leta hai. WebSocket sirf ek <b>tez raasta</b> hai — source of truth nahi.
          Yeh ek design offline users, reconnects, multi-device sync aur "message kho gaya" —
          <b>chaaron</b> hal karta hai.</div>
      </div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill bad">🌩️ RECONNECT STORM</span>
      <span>Ek gateway restart = 50,000 ek saath wapas — aur har reconnect mein auth +
        subscription restore + backlog fetch hai. Bina jitter ke woh agla node giraayenge.
        Ilaaj wahi: <b>backoff + full jitter</b>, backlog par limit, rolling restarts.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">📡 FANOUT: WRITE PAR YA READ PAR</span>
      <span><b>Write par</b> = read turant, par celeb par 5 crore writes.
        <b>Read par</b> = write sasta, read mehenga. Asli systems <b>hybrid</b> karte hain.</span>
    </div>`,
};

VISUALS['geo'] = {
  t: 'Geohash — 2D problem ko 1D prefix scan banao',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ lat/lng dono par BETWEEN</span>
        <div class="dg-cap"><code>WHERE lat BETWEEN ? AND ?<br>&nbsp; AND lng BETWEEN ? AND ?</code>
          <br><br>Composite index <b>pehli range ke baad ruk jaata hai</b>.
          <code>(lat,lng)</code> index poori latitude patti tak le jaayega —
          poore desh ki us patti ke 4 lakh drivers — aur phir <code>lng</code> se
          filter karne ke liye woh saari rows padhni padengi.
          <br><br><b>B-tree 1D hai. Jagah 2D hai.</b></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Geohash</span>
        <div class="dg-cap"><code>Mumbai (19.076, 72.877) → te7ud9k</code>
          <br><br><code>te&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ ~1250 km</code>
          <br><code>te7u&nbsp;&nbsp;&nbsp;&nbsp;→ ~39 km</code>
          <br><code>te7ud&nbsp;&nbsp;&nbsp;→ ~5 km</code>
          <br><code>te7ud9k&nbsp;→ ~150 m</code>
          <br><br><b>Paas ki jagah ka prefix bhi paas hota hai.</b> Isliye "nearby" ab
          <code>LIKE 'te7ud%'</code> hai — ek <b>B-tree prefix scan</b>.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">84 lakh drivers</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">cell + 8 padosi cells<br><small>mota chhanna</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">~900 candidates</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">haversine se sort<br><small>baarik chhanna</small></span>
    </div>
    <div class="dg-cap">Har production geo system ka <b>do-kadam</b> design.
      Padosi cells isliye ki tum cell ke <b>kinare</b> par ho sakte ho — 50 meter door ka driver
      bagal wali cell mein hoga aur sirf apni cell dekhne par kabhi milega hi nahi.</div>

    <div class="dg-rule"></div>
    <div class="dg-stack">
      <div class="dg-node is-bad"><span class="ni">🔥</span><span class="nl">cell te7ud9 — airport, 8 PM</span><span class="ns">40,000 rps</span></div>
      <div class="dg-node is-muted"><span class="ni">🌊</span><span class="nl">cell te7uc2 — samundar</span><span class="ns">0 rps</span></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🔥 HOT CELL = WAHI HOT KEY</span>
      <span>Geo data <b>kabhi</b> uniformly nahi bikhra hota. Ilaaj wahi jo cache mein tha:
        cell ko chhoti precision par <b>todo</b> (5 → 7 characters), ya us cell ka data
        <b>replicate</b> karo. Fixed grid size lagbhag hamesha galti hai —
        Manhattan aur Rajasthan ke liye ek hi cell size sahi ho hi nahi sakta.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">⬡ H3 (hexagons)</span>
      <span>Hexagon mein har padosi ki doori <b>ek jaisi</b> hai; square mein diagonal padosi
        1.41x door hai. Isse "nearby" ka hisaab aur cell-to-cell aggregation dono saaf rehte hain.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">📍 LOCATION = CURRENT STATE</span>
      <span>1 lakh drivers × 15 ping/min = 15 lakh writes/min — aur 20 second purana location ka
        koi mol hi nahi. Yeh <b>history nahi</b> hai; in-memory geo store mein rakho, DB mein nahi.</span>
    </div>`,
};

VISUALS['ledger'] = {
  t: 'Ledger — balance ek column nahi, entries ka sum hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ balance column</span>
        <div class="dg-cap"><code>UPDATE accounts<br>SET balance = balance - 500<br>WHERE id = 7;</code>
          <br><br>❓ "3 tareekh ko balance kya tha?" — <b>pata nahi</b>
          <br>❓ "4700 kyun hai?" — <b>pata nahi</b>
          <br><br>Purani value ke upar likh diya. Itihaas kahin nahi hai —
          aur ek bug ke baad recovery ka koi rasta bhi nahi.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ immutable entries</span>
        <div class="dg-cap"><code>1 &nbsp;acc 7 &nbsp;+5000 &nbsp;topup_881<br>2 &nbsp;acc 7 &nbsp;&nbsp;-500 &nbsp;order_912<br>3 &nbsp;acc 7 &nbsp;&nbsp;+200 &nbsp;refund_912</code>
          <br><br><code>balance(7) = SUM = 4700</code>
          <br><br>Kabhi UPDATE nahi, kabhi DELETE nahi — sirf INSERT.
          Har number ka <b>kab, kitna, kyun</b> maujood hai.
          Accountants yeh 600 saal se chala rahe hain.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill bad">user_wallet −500</span>
      <span class="dg-arrow">+</span>
      <span class="dg-pill good">merchant +500</span>
      <span class="dg-arrow">=</span>
      <span class="dg-pill gold">SUM 0</span>
    </div>
    <div class="dg-cap"><b>Double-entry.</b> Poore system ka <code>SUM(amount)</code> hamesha zero hona
      chahiye. Yeh sirf hisaab nahi — yeh ek <b>checkable invariant</b> hai: ek query jo batati hai
      ki kahin paisa <b>bana ya mita</b> toh nahi. Uspar alert lagao — woh bugs pakadta hai
      jo kisi unit test mein nahi milte.</div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">1️⃣</span><span class="nl">Sirf hamare paas</span><span class="ns">humne count kar liya, paisa aaya nahi?</span></div>
      <div class="dg-node is-bad"><span class="ni">2️⃣</span><span class="nl">Sirf unke paas</span><span class="ns">webhook chhoot gaya / event kho gaya</span></div>
      <div class="dg-node is-accent"><span class="ni">3️⃣</span><span class="nl">Amount alag</span><span class="ns">fees, currency conversion, rounding</span></div>
    </div>
    <div class="dg-cap"><b>Reconciliation ke teen buckets.</b> Kul farak ek number hai —
      usse kuch pata nahi chalta. Buckets se <b>karan</b> milta hai, aur har bucket ka fix alag hai.
      Teesra sabse aam aur sabse boring hai — isiliye log use skip karte hain
      aur saal ke ant mein 40 lakh ka farak dhoondte hain.</div>

    <div class="dg-legend">
      <span class="dg-pill acc">🔁 IDEMPOTENCY vs 🔍 RECONCILIATION</span>
      <span>Idempotency duplicates <b>rokti</b> hai. Reconciliation kho gaye aur alag hue records
        <b>pakadti</b> hai. Exactly-once mumkin nahi hai — isliye dono chahiye.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🚫 YAHAN CACHE NAHI</span>
      <span>History aur dashboard par stale bilkul theek hai. Par <b>kharch se pehle ka balance
        check</b> hamesha primary se, transaction ke andar, row lock ke saath —
        warna overdraft. Poora system eventual ho sakta hai, siwaay <b>us ek query</b> ke.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">💵 FLOAT KABHI NAHI</span>
      <span><code>0.1 + 0.2 ≠ 0.3</code>. Paisa <b>integer paise/cents</b> mein ya decimal mein:
        ₹4,999.50 → <code>499950</code>. Aur galat entry ka fix ek nayi <b>reversal entry</b> hai,
        purani ko badalna nahi.</span>
    </div>`,
};

VISUALS['antipattern'] = {
  t: 'Har pattern ek vyapaar hai — keemat bhi likho',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">3-table CRUD app</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">15 microservices</span>
    </div>
    <div class="dg-cap">Usne pattern <b>yaad</b> kar liya tha. Woh yeh nahi samjha ki pattern
      kis dard ka ilaaj hai — aur badle mein kya <b>keemat</b> maangta hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🧩</span><span class="cmd">Microservices</span><span class="q">💀 har method call ab NETWORK call — fail, dheemi, duplicate ho sakti hai</span></div>
      <div class="dg-rung"><span class="lv">📜</span><span class="cmd">Event sourcing</span><span class="q">💀 "abhi state kya hai" ke liye projections; schema evolution</span></div>
      <div class="dg-rung"><span class="lv">🔀</span><span class="cmd">CQRS</span><span class="q">💀 write ke turant baad read purana — aur UX ko woh sambhaalna padta hai</span></div>
      <div class="dg-rung"><span class="lv">📨</span><span class="cmd">Kafka</span><span class="q">💀 ek aur cluster chalana, partition/ordering, ops ka boj</span></div>
      <div class="dg-rung"><span class="lv">🧊</span><span class="cmd">Cache</span><span class="q">💀 invalidation, staleness, stampede — aur woh LOAD-BEARING ban jaata hai</span></div>
      <div class="dg-rung"><span class="lv">✂️</span><span class="cmd">Sharding</span><span class="q">💀 cross-shard queries khatam, rebalancing, hot shards. Shard key WAPAS nahi hoti</span></div>
    </div>
    <div class="dg-cap">Daayan column galtiyan nahi hain — woh <b>keemat</b> hai.
      Aur keemat tabhi chukani chahiye jab baayen taraf ka dard <b>sach mein</b> ho raha ho.</div>

    <div class="dg-rule"></div>
    <div class="dg-box is-good"><span class="bx-label">🥱 Ek Postgres, aaj ke hardware par</span>
      <div class="dg-cap"><code>~10,000 simple queries/sec &nbsp;·&nbsp; 5–10 TB aaram se</code>
        <br><br>JSONB (document store) · GIN (full-text) · PostGIS (geo) ·
        LISTEN/NOTIFY (pub-sub) · SKIP LOCKED (queues)
        <br><br>Yaani ek hi box mein document DB + search engine + geo store + queue —
        <b>ek transaction, ek backup, ek cheez jise monitor karna hai.</b>
        Zyadatar products isse kabhi bahar nikalte hi nahi.</div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold">❓ EK SAWAAL JO SAB SAAF KAR DETA HAI</span>
      <span>"Yeh kis cheez ko theek kar raha hai, jo <b>abhi</b> sach mein toota hua hai?"
        Jawab mein "scale par…" ya "aage chal ke…" aaye — toh abhi zaroorat nahi hai.
        Aaj ka dard chahiye, kal ka anumaan nahi.</span>
    </div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">💬</span><span class="cmd">"Kafka laga dete hain"</span><span class="q">→ "Roz kitne events? 1000/din ke liye ek table kaafi hai"</span></div>
      <div class="dg-rung"><span class="lv">💬</span><span class="cmd">"Redis cache laga dete hain"</span><span class="q">→ "Query abhi kitni slow hai? Ek index se kaam ho jaayega?"</span></div>
      <div class="dg-rung"><span class="lv">💬</span><span class="cmd">"Yeh service alag kar dete hain"</span><span class="q">→ "Alag deploy? Alag scale? Ya bas code ganda lag raha hai?"</span></div>
      <div class="dg-rung"><span class="lv">💬</span><span class="cmd">"MongoDB behtar hai"</span><span class="q">→ "Kaunsi query abhi mushkil hai? Schema sach mein badal raha hai?"</span></div>
    </div>
    <div class="dg-cap">Yeh sawaal cynical nahi hai. Aadhe waqt jawab "haan, sach mein zaroorat hai"
      hoga — aur tab tum use <b>saaf iraade</b> ke saath laga rahe ho, uski keemat jaante hue.</div>`,
};

VISUALS['coffeeshop'] = {
  t: 'Coffee shop = task processing system',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">☕ dukaan</span><span class="dg-arrow">≡</span>
      <span class="dg-pill acc">🚗 Uber</span><span class="dg-arrow">≡</span>
      <span class="dg-pill acc">🍔 DoorDash</span><span class="dg-arrow">≡</span>
      <span class="dg-pill acc">🎬 video transcoding</span>
    </div>
    <div class="dg-cap">Ek hi shape: kaam aata hai → <b>limited resources</b> par process hota hai →
      poora hone par notification. Senior engineers yahan isliye phisalte hain ki sawaal
      <b>jaana-pehchana</b> hai — dimaag "arre yeh toh coffee shop hai" bol ke
      abstraction dhoondna hi band kar deta hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🧍</span><span class="cmd">Counter par line</span><span class="q">request queue + backpressure</span></div>
      <div class="dg-rung"><span class="lv">☕</span><span class="cmd">3 espresso machines, 8 baristas</span><span class="q">resource pool — aur ASLI bottleneck machines hain</span></div>
      <div class="dg-rung"><span class="lv">🎫</span><span class="cmd">Token number ka parcha</span><span class="q">202 Accepted + job id + status endpoint (aur idempotency ka anchor)</span></div>
      <div class="dg-rung"><span class="lv">📣</span><span class="cmd">"Order 47 ready!"</span><span class="q">notification — push + poll fallback</span></div>
      <div class="dg-rung"><span class="lv">📋</span><span class="cmd">Order → banta hai → ready</span><span class="q">state machine</span></div>
      <div class="dg-rung"><span class="lv">🥛</span><span class="cmd">"Doodh khatam ho gaya"</span><span class="q">dependency failure + fallback (black coffee) + saaf signal</span></div>
      <div class="dg-rung"><span class="lv">🚶</span><span class="cmd">"Aaj sirf simple coffee"</span><span class="q">graceful degradation — bandh karne se behtar hai kam menu</span></div>
      <div class="dg-rung"><span class="lv">🧾</span><span class="cmd">Bade orders ka alag counter</span><span class="q">bulkhead ("10 items or less" lane)</span></div>
      <div class="dg-rung"><span class="lv">🗑️</span><span class="cmd">10 min purani coffee phenki jaati hai</span><span class="q">TTL + orphan cleanup</span></div>
      <div class="dg-rung"><span class="lv">🚪</span><span class="cmd">"Abhi 20 minute wait"</span><span class="q">admission control — sach batao, aur customer ko faisla karne do</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">⚠️ Arithmetic jo log bhool jaate hain</span>
        <div class="dg-cap"><code>aa rahe: 200/min<br>ban rahe: &nbsp;60/min</code>
          <br><br>Queue <b>kabhi</b> khaali nahi hogi. Woh sirf badhti jaayegi.
          Us halat mein sabko "queue mein daal do" ka matlab hai unhe dhokha dena.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Bottleneck kahan hai</span>
        <div class="dg-cap">8 baristas, 3 machines → ek aur barista se <b>kuch nahi</b> hoga.
          <br><br>Wahi galti: app instances badhana jab DB connection pool 50 par atka ho.
          Pehle bottleneck <b>dhoondo</b>, phir scale karo.</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🧠 JAB DESIGN MEIN FANS JAO</span>
      <span>Use ek <b>insaani cheez</b> bana ke socho — dukaan, warehouse, post office, hospital ka ER.
        Unhone queueing, prioritization aur degradation dashakon pehle hal kar liya —
        aur unke hal tumhe <b>intuitively</b> pata hain, kyunki tumne unhe jiya hai.</span>
    </div>`,
};

VISUALS['review'] = {
  t: 'Design review — ek kram, aur ek sawaal',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">FR — kya karna hai</span><span class="q">3–5 line. Isse zyada = kuch bhi gehra nahi hoga</span></div>
      <div class="dg-rung g"><span class="lv">2</span><span class="cmd">NFR — kitna, kitni jaldi, kitna bharosemand</span><span class="q">⭐ YAHI architecture banate hain</span></div>
      <div class="dg-rung g"><span class="lv">3</span><span class="cmd">Estimates — traffic, data, growth</span><span class="q">⭐ aksar yahin pata chalta hai ki problem chhota/bada hai</span></div>
      <div class="dg-rung"><span class="lv">4</span><span class="cmd">API — entities pehle, phir endpoints</span><span class="q">5 minute. API ek kadam hai, manzil nahi</span></div>
      <div class="dg-rung"><span class="lv">5</span><span class="cmd">Data model — access patterns se schema</span><span class="q">ulta karoge toh migration likhoge</span></div>
      <div class="dg-rung"><span class="lv">6</span><span class="cmd">Components — boxes</span><span class="q">log YAHAN se shuru karte hain — isliye design bina karan ka rehta hai</span></div>
      <div class="dg-rung"><span class="lv">7</span><span class="cmd">Tradeoffs — har faisle ka kyun + keemat</span><span class="q">"maine X chuna, kyunki Y; keemat Z"</span></div>
      <div class="dg-rung g"><span class="lv">8</span><span class="cmd">Failure modes</span><span class="q">⭐ sabse zyada SKIP kiya jaane wala kadam</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">⚙️ Functional (KYA)</span>
        <div class="dg-cap">User order de sakta hai · status dikhta hai · refund ho sakta hai
          <br><br><small>Yeh <b>har</b> design mein mumkin hai — isliye ismein architecture ka koi ishara nahi.</small></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">📏 Non-functional (KAISA)</span>
        <div class="dg-cap">p99 &lt; 200ms · 99.9% · peak 5,000 rps · order kabhi kho na sake
          <br><br><small>Yeh teen shartein milke tumhare <b>aadhe faisle</b> khud kar deti hain.
          "Tez" ek requirement nahi hai; "p99 200ms" hai.</small></div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-box is-bad"><span class="bx-label">🔟 "10x par kya SABSE PEHLE tootega?"</span>
      <div class="dg-stack">
        <div class="dg-node is-bad"><span class="ni">1</span><span class="nl">DB connection pool</span><span class="ns">sabse aam</span></div>
        <div class="dg-node is-bad"><span class="ni">2</span><span class="nl">thread / worker pool</span><span class="ns"></span></div>
        <div class="dg-node is-bad"><span class="ni">3</span><span class="nl">downstream rate limit</span><span class="ns"></span></div>
        <div class="dg-node is-bad"><span class="ni">4</span><span class="nl">hot partition ya key</span><span class="ns"></span></div>
        <div class="dg-node is-bad"><span class="ni">5</span><span class="nl">queue capacity · file descriptors · ek shared lock</span><span class="ns"></span></div>
      </div>
      <div class="dg-cap"><b>Ek bhi CPU nahi hai.</b> Isiliye "CPU 10%, health green, phir bhi timeout"
        itna aam hai. Jo cheezein pehle khatam hoti hain woh <b>concurrency limits</b> hain,
        compute nahi — aur woh dashboard par nahi dikhti.</div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill gold">🔙 DO SAWAAL JO CHHOOT JAATE HAIN</span>
      <span><b>"Migration plan kya hai?"</b> — greenfield mein bhi aksar ek purana system hota hai;
        uske bina design ek kalpana hai. <b>"Rollback mein kitna waqt?"</b> — 20 minute
        matlab har change 20 minute ka risk; 20 second (flag) matlab tum tez chal sakte ho.</span>
    </div>`,
};

VISUALS['boss-shapes'] = {
  t: 'FINAL BOSS — ek problem, saat shapes',
  html: `
    <div class="dg-flow">
      <span class="dg-pill gold">🍽️ Food delivery · 8 PM · 8,000 rps · aadha traffic ek ilaake se</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">📍</span><span class="cmd">Nearby restaurants</span><span class="q">geo + read-heavy → 💀 <b>hot cell</b></span></div>
      <div class="dg-rung"><span class="lv">📖</span><span class="cmd">Menu aur listing</span><span class="q">read-heavy → 💀 <b>stampede, hot key</b></span></div>
      <div class="dg-rung"><span class="lv">🔄</span><span class="cmd">Order ka lifecycle</span><span class="q">workflow → 💀 <b>beech mein fail → compensation</b></span></div>
      <div class="dg-rung"><span class="lv">💰</span><span class="cmd">Payment</span><span class="q">ledger → 💀 <b>double charge, reconciliation</b></span></div>
      <div class="dg-rung"><span class="lv">🔌</span><span class="cmd">Live tracking</span><span class="q">realtime fanout → 💀 <b>reconnect storm, offline gap</b></span></div>
      <div class="dg-rung"><span class="lv">🔔</span><span class="cmd">"Order accept hua" SMS</span><span class="q">notification → 💀 <b>duplicate, 8 PM ka burst</b></span></div>
      <div class="dg-rung"><span class="lv">🔍</span><span class="cmd">Restaurant search</span><span class="q">search → 💀 <b>indexing lag</b></span></div>
    </div>
    <div class="dg-cap">Saat shapes — aur tumne kuch <b>naya</b> nahi seekha.
      Har failure mode pehle se pata hai, aur har ek ka ilaaj bhi.
      <b>Yahi pattern pehchanne ka poora faayda hai.</b></div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill bad">naive<br><small>COUNT(*) har request par<br>pool 50 · koi cache nahi</small></span>
      <span class="dg-arrow">→</span>
      <span class="dg-pill">measure<br><small>load · trace · metrics</small></span>
      <span class="dg-arrow">→</span>
      <span class="dg-pill acc">fix<br><small>count off · cache+jitter<br>coalesce · timeout+fallback</small></span>
      <span class="dg-arrow">→</span>
      <span class="dg-pill good">pool badhao<br><small>service time ghatane ke BAAD</small></span>
    </div>
    <div class="dg-cap">Kram par dhyaan do: <b>pool sabse aakhir mein</b>.
      Pool badhana muft nahi hai — har connection DB par ek process/thread hai.
      Pehle service time ghatao, phir pool badhao.</div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold">👑 POORE APP KA NICHOD</span>
      <span><b>1.</b> Pehle pattern ka <b>naam</b> lo — naam ke saath uska known failure mode aata hai.
        <b>2.</b> Bottleneck <b>maapo</b>, anumaan mat lagao — woh lagbhag kabhi CPU nahi hota.
        <b>3.</b> Har faisle ki <b>keemat</b> bolo — keemat na bata sako toh samjha nahi,
        bas naam seekha hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">🎓 Boxes koi bhi bana leta hai</span>
      <span>Tradeoff bolna, bottleneck maapna, aur "iski keemat yeh hai" keh paana —
        wahi <b>architect</b> banata hai.</span>
    </div>`,
};

/* ===== Hello Interview se aaye levels ===== */
VISUALS['networking'] = {
  t: 'Wire par — setup ka tax, protocols, aur LB ki layer',
  html: `
    <div class="dg-ladder" data-hs="setup">
      <div class="dg-rung"><span class="lv">30ms</span><span class="cmd">DNS lookup</span><span class="q">"api.example.com ka IP kya hai?"</span></div>
      <div class="dg-rung"><span class="lv">1 RTT</span><span class="cmd">TCP handshake</span><span class="q">SYN → SYN-ACK → ACK</span></div>
      <div class="dg-rung"><span class="lv">1-2 RTT</span><span class="cmd">TLS handshake</span><span class="q">keys ka exchange</span></div>
      <div class="dg-rung g"><span class="lv">↓</span><span class="cmd">ab request bhej sakte ho</span><span class="q">~150 ms nikal chuke, ek byte data gaye bina</span></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">♻️ CONNECTION REUSE</span>
      <span>Keep-alive / connection pooling sabse sasta optimization hai —
        warm connection par yeh poora setup <b>gayab</b> ho jaata hai.
        Har request par nayi connection kholna latency dugni kar deta hai,
        aur code mein kuch "galat" nahi dikhta.</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🔒 TCP</span>
        <div class="dg-cap">Guaranteed, kram mein, handshake ke saath.
          Packet kho gaya → <b>ruko, dobara bhejo</b>.
          <br><br><b>Default hai</b> — API, web, DB. Isse hatne ki khaas wajah chahiye.</div>
      </div>
      <div class="dg-box is-gold"><span class="bx-label">⚡ UDP</span>
        <div class="dg-cap">Koi guarantee nahi, seedha bhejo.
          Packet kho gaya → <b>aage badho</b>.
          <br><br>Tab chuno jab <b>purana data bekaar</b> ho — live video, gaming, VoIP.</div>
      </div>
    </div>
    <div class="dg-cap"><b>QUIC</b> UDP par bana hai — par usne reliability, ordering aur congestion control
      <b>khud</b> likh liye. Kyun? TCP kernel mein hai aur use badalna namumkin hai;
      UDP par jaake unhone TCP ko userspace mein <b>dobara likh diya</b>, behtar tareeke se.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung" data-hs="hol"><span class="lv">1.1</span><span class="cmd">ek connection = ek request</span><span class="q">browser 6 kholta hai, baaki assets LINE mein — <b>head-of-line blocking</b></span></div>
      <div class="dg-rung" data-hs="hol"><span class="lv">2</span><span class="cmd">ek connection, multiplexed</span><span class="q">par TCP par — ek packet kho gaya = <b>saari</b> streams ruk gayi</span></div>
      <div class="dg-rung g" data-hs="quic"><span class="lv">3</span><span class="cmd">QUIC (UDP) — har stream alag</span><span class="q">loss sirf usi stream ko roke; connection ID se network badalne par bhi zinda</span></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">⚠️ PURANI TRICKS AB NUKSAAN KARTI HAIN</span>
      <span>Domain sharding = extra DNS+TCP+TLS. Sprite sheets = ek pixel badalne par poori file dobara.
        Woh HTTP/1.1 ki 6-connection limit ke liye bani thi.
        <b>Har optimization apne zamaane ki bottleneck ke liye hoti hai.</b></span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent" data-hs="l4"><span class="bx-label">⚡ L4 — transport</span>
        <div class="dg-cap">IP + port dekhta hai, packets aage badhata hai.
          <br>✅ bahut tez · ✅ <b>WebSocket ke liye sahi</b> · ✅ TLS pass-through
          <br>❌ path se route nahi · ❌ retry nahi</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🧠 L7 — application</span>
        <div class="dg-cap">Poori HTTP request padhta hai.
          <br>✅ path/header routing · ✅ retry · ✅ rate limit · ✅ TLS terminate
          <br>❌ mehenga (parse + decrypt) · ⚠️ lambi connections ka state</div>
      </div>
    </div>`,
};

VISUALS['numbers'] = {
  t: 'Latency ka ladder — aur usse nikalte faisle',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">0.5 ns</span><span class="cmd">L1 cache</span><span class="q">insaani paimane par: 0.5 second</span></div>
      <div class="dg-rung"><span class="lv">100 ns</span><span class="cmd">RAM</span><span class="q">100 second</span></div>
      <div class="dg-rung"><span class="lv">2 µs</span><span class="cmd">1 KB compress</span><span class="q">33 minute</span></div>
      <div class="dg-rung"><span class="lv">100 µs</span><span class="cmd">SSD random read</span><span class="q">27 ghante</span></div>
      <div class="dg-rung"><span class="lv">0.5 ms</span><span class="cmd">same-DC round trip</span><span class="q"><b>6 din</b></span></div>
      <div class="dg-rung"><span class="lv">10 ms</span><span class="cmd">HDD seek</span><span class="q">4 mahine</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">150 ms</span><span class="cmd">cross-continent RTT</span><span class="q"><b>5 saal</b></span></div>
    </div>
    <div class="dg-cap">Sab kuch 1 billion se guna karo aur woh insaani waqt ban jaata hai.
      Ab socho — tumhare code mein ek loop ke andar ek network call hai.
      Woh har chakkar par <b>5 saal</b> intezaar kar raha hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">1000x</span><span class="cmd">RAM vs SSD</span><span class="q">→ caching ka <b>poora</b> karan</span></div>
      <div class="dg-rung g"><span class="lv">0.5ms × 20</span><span class="cmd">20 service hops</span><span class="q">→ 10ms sirf network par, bina kaam kiye</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">150ms</span><span class="cmd">cross-continent</span><span class="q">→ p99 200ms ka SLO <b>physics</b> se namumkin. Ilaaj sirf architecture</span></div>
      <div class="dg-rung g"><span class="lv">100µs</span><span class="cmd">ek index lookup</span><span class="q">→ 1000 lookups (N+1) = 100ms</span></div>
      <div class="dg-rung g"><span class="lv">~10k qps</span><span class="cmd">ek Postgres</span><span class="q">→ sharding ki baat <b>abhi</b> zaroori hai ya nahi</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">✂️ Shortcut 1 — "roz ka X" → rps</span>
        <div class="dg-cap"><code>86,400 ≈ 100,000</code>
          <br><br><code>1M/din&nbsp;&nbsp;&nbsp; ≈ &nbsp;&nbsp;&nbsp;12 rps</code>
          <br><code>100M/din &nbsp;≈ &nbsp;1,200 rps</code>
          <br><code>1B/din&nbsp;&nbsp;&nbsp; ≈ 12,000 rps</code>
          <br><br>"10 lakh requests roz" bada sunai deta hai aur <b>12 rps</b> hota hai —
          ek laptop ka kaam.</div>
      </div>
      <div class="dg-box is-gold"><span class="bx-label">📈 Shortcut 2 — peak</span>
        <div class="dg-cap"><code>peak = average × 2 se 5</code>
          <br><br>Par agar traffic mein koi <b>event</b> hai (result, sale, match)
          toh woh <b>100x</b> bhi ho sakta hai.
          <br><br>Isliye pehla sawaal: "kya iska traffic predictable spike wala hai?"</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">🎯 ANUMAAN → PHIR NAAPO</span>
      <span>Estimate ka kaam yeh batana hai ki tumhe kis <b>paimane</b> ki cheez chahiye —
        10 servers ya 1000. Asli number load test se aata hai, dimaag se nahi.</span>
    </div>`,
};

VISUALS['ids'] = {
  t: 'IDs — random primary key ka chhupa hua bill',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Sortable id (Snowflake / ULID / autoinc)</span>
        <div class="dg-cap">Har naya row → B-tree ke <b>aakhri page</b> par
          <br>→ woh page pehle se memory mein <b>garam</b> hai
          <br>→ koi split nahi, koi random I/O nahi
          <br><br><code>page splits &nbsp;&nbsp;2,000</code>
          <br><code>1L inserts &nbsp;6,000 ms</code>
          <br><code>cursor &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;✅ tie-breaker kaam karta hai</code></div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">❌ Random id (UUIDv4)</span>
        <div class="dg-cap">Har naya row → B-tree mein <b>kahin bhi</b>
          <br>→ woh page shayad disk se laana pade
          <br>→ bhara hua ho toh <b>SPLIT</b>
          <br><br><code>page splits &nbsp;340,000 💥</code>
          <br><code>1L inserts &nbsp;43,000 ms</code>
          <br><code>cursor &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;❌ sort ka matlab hi nahi</code></div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">1 bit</span><span class="dg-arrow">|</span>
      <span class="dg-pill acc">41 bit — timestamp (ms)</span><span class="dg-arrow">|</span>
      <span class="dg-pill">10 bit — machine</span><span class="dg-arrow">|</span>
      <span class="dg-pill">12 bit — sequence</span>
    </div>
    <div class="dg-cap"><b>Snowflake, 64 bits.</b> Timestamp <b>sabse aage</b> — isliye ids ko number ki tarah
      sort karo toh woh apne aap waqt ke kram mein aa jaati hain.
      41 bit = 69 saal · 10 bit = 1024 machines · 12 bit = 4096 ids per machine <b>per millisecond</b>.
      Aur koi central service nahi chahiye.</div>
    <div class="dg-legend">
      <span class="dg-pill bad">⏰ CLOCK PEECHE JAANA</span>
      <span>NTP clock peeche kar sakta hai — aur tab wahi ids <b>dobara</b> ban jaayengi.
        Implementation ko wahin <b>ruk jaana</b> chahiye ya logical counter badhana chahiye,
        chupchaap dohraana nahi.</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">🔢</span><span class="nl">autoinc</span><span class="ns">8B · sortable ✅ · DB chahiye ❌ · guessable ❌</span></div>
      <div class="dg-node is-bad"><span class="ni">🎲</span><span class="nl">UUIDv4</span><span class="ns">16B · sortable ❌ · coordination-free ✅ · guess-proof ✅</span></div>
      <div class="dg-node is-accent"><span class="ni">🔤</span><span class="nl">ULID</span><span class="ns">16B · sortable ✅ · coordination-free ✅ · time leak ⚠️</span></div>
      <div class="dg-node is-good"><span class="ni">❄️</span><span class="nl">Snowflake</span><span class="ns">8B · sortable ✅ · machine id chahiye ⚠️</span></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">🎯 PRACTICAL RAASTA — DO IDs</span>
      <span><code>id</code> = BIGINT (Snowflake/autoinc) — <b>primary key</b>, index-friendly.
        <code>public_id</code> = UUID / short code — API aur URL mein yahi jaata hai.
        Index sequential rehta hai, aur bahar koi count ya doosre records guess nahi kar sakta.</span>
    </div>`,
};

VISUALS['probabilistic'] = {
  t: 'Bloom & HLL — thoda galat, par 1000x sasta',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">ADD "priya"</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">h1→17</span>
      <span class="dg-pill acc">h2→402</span>
      <span class="dg-pill acc">h3→9981</span>
      <span class="dg-arrow">→</span>
      <span class="dg-pill good">teenon bits = 1</span>
    </div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ "PAKKA nahi hai"</span>
        <div class="dg-cap">Ek bhi bit 0 mila → item hai hi nahi.
          <br><br>Yeh <b>hamesha sach</b> hai — false negative <b>kabhi nahi</b> hota,
          kyunki add karte waqt bits 1 kar diye gaye the aur woh kabhi 0 nahi hote.
          <br><br>Isi case mein tum bina DB gaye jawab de dete ho.</div>
      </div>
      <div class="dg-box is-accent"><span class="bx-label">⚠️ "SHAYAD hai"</span>
        <div class="dg-cap">Saare bits 1 mile — par woh kisi <b>doosre</b> item ne bhi
          set kiye ho sakte hain.
          <br><br>Isliye iske baad <b>asli lookup</b> karni padti hai —
          par tab tak 99% bekaar lookups kat chuke hote hain.</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🚫 DELETE NAHI HO SAKTA</span>
      <span>Bits doosre items ke saath <b>share</b> hote hain — 0 karne se unka jawab
        toot jaayega (false negative). Uske liye <b>counting bloom filter</b> chahiye
        (bits ki jagah counters, ~4x memory).</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">1.1 MB</span><span class="cmd">10 lakh items, 1% FP</span><span class="q">exact set 22.9 MB hota — <b>20x sasta</b></span></div>
      <div class="dg-rung"><span class="lv">488 KB</span><span class="cmd">aadhi memory, 3 hashes</span><span class="q">FP 14.7% — memory kam, jhooth zyada</span></div>
    </div>
    <div class="dg-cap"><b>Do knobs:</b> bits (m) aur hash functions (k).
      Optimal <code>k ≈ (m/n) × ln2</code>, aur target FP ke liye
      <code>m = -n·ln(p)/(ln2)²</code>. Poora tradeoff ek line mein:
      <b>memory kam karo, jhooth badh jaata hai</b>.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">📊 HyperLogLog</span>
        <div class="dg-cap"><code>16,384 registers → 12 KB → ±0.81%</code>
          <br><br><code>10 lakh unique?&nbsp; 12 KB</code>
          <br><code>10 crore unique? 12 KB</code>
          <br><code>exact hota&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1.5 GB</code>
          <br><br>Woh values store hi nahi karta — sirf yeh yaad rakhta hai ki
          kisi hash ke shuru mein <b>sabse zyada kitne zero</b> dekhe.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🔗 Aur woh MERGE hota hai</span>
        <div class="dg-cap">Har server apna HLL rakhe, din ke ant mein sab jod do —
          poore system ka unique count, <b>bina kisi central counter ke</b>.
          <br><br>Redis: <code>PFADD</code> / <code>PFCOUNT</code> / <code>PFMERGE</code>.</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">✅ APPROXIMATE CHALEGA</span>
      <span>Unique visitors · LSM ki SSTable ka "yeh key hai kya" · cache ke aage
        "yeh key exist karti bhi hai" · Chrome Safe Browsing.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">❌ EXACT CHAHIYE</span>
      <span>Balance · "yeh payment ho chuka hai?" — jahan false positive ka matlab
        <b>ek asli cheez gira dena</b> ho. Wahi purana sawaal: galat jawab kitna mehenga hai?</span>
    </div>`,
};

VISUALS['conshash'] = {
  t: 'Consistent hashing — node jodne par sab kuch na hile',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad" data-hs="modn"><span class="bx-label">❌ hash % N</span>
        <div class="dg-cap"><code>key "user:42" → hash 91827</code>
          <br><code>% 4 → node 3</code>
          <br><code>% 5 → node 2</code> ← alag node!
          <br><br><b>4 → 5 nodes par ~80% keys move.</b>
          <br>Cache mein: 80% turant thanda, aur woh saara load ek saath DB par.
          <br>Sharding mein: 80% data machine-to-machine copy.
          <br><br>Yeh sirf dheema nahi — yeh aksar ek outage hai.</div>
      </div>
      <div class="dg-box is-good" data-hs="clockwise"><span class="bx-label">✅ Hash ring</span>
        <div class="dg-cap">Sirf keys nahi — <b>nodes ko bhi</b> hash karo,
          aur dono ko ek gol daayre (0 … 2³²) par rakho.
          <br><br><b>Niyam:</b> har key <b>ghadi ki disha</b> mein pehle milne wale node ki hai.
          <br><br>Naya node ring par ek jagah baithta hai aur sirf apne se pehle wale
          arc ki keys leta hai. Baaki ring ko pata bhi nahi chalta.
          <br><br><b>4 → 5 nodes par ~20% keys move</b> (= 1/N, jitni honi hi thi).</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">1</span><span class="cmd">vnode per node</span><span class="q">node-1 45% · node-2 3% · node-3 19% · node-4 30% — <b>skew 1.9x</b></span></div>
      <div class="dg-rung g" data-hs="vnodes"><span class="lv">150</span><span class="cmd">vnodes per node</span><span class="q">24.7% · 24.8% · 25.2% · 25.3% — <b>skew 1.01x</b></span></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">🌀 VIRTUAL NODES — DO faayde</span>
      <span><b>1. Skew:</b> ek jagah baithne se nodes ke beech ki doori random hoti hai.
        150 chhote tukdon ka jod lagbhag barabar ho jaata hai.
        <b>2. Cascade:</b> node <b>girne</b> par uska load <b>saare</b> nodes mein bant jaata hai —
        sirf uske ek padosi par nahi (jo dab ke khud gir sakta tha).</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">vnode hashes ki sorted list</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">binary search: pehla point &gt; key</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">koi bada na mile → <b>pehla point</b> (wrap)</span>
    </div>
    <div class="dg-cap">Ring <b>gol</b> hai — 2³² ke baad wapas 0. Wrap-around bhoolna sabse aam bug hai
      (aakhri arc ki keys kahin nahi jaati). Replication chahiye toh ring par
      <b>agle N alag nodes</b> le lo — Cassandra yahi karta hai.</div>

    <div class="dg-legend">
      <span class="dg-pill bad" data-hs="hotkey">🔥 YEH HOT KEY THEEK NAHI KARTI</span>
      <span>Ring <b>keys</b> ko baantti hai, <b>ek key ko nahi</b>. Ek popular key phir bhi
        ek hi node par jaayegi. Uske liye ilaaj alag hai: key ki N copies, ya local cache.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">🧭 KAHAN CHALTA HAI</span>
      <span>Cassandra/DynamoDB partitions · Redis Cluster (16,384 slots) ·
        Memcached clients · CDN origin selection · Envoy ka "ring hash" LB policy.</span>
    </div>`,
};

VISUALS['streams'] = {
  t: 'Stream — queue nahi, ek LOG',
  html: `
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">📬 Queue — ek to-do list</span>
        <div class="dg-cap">Padha ki <b>gaya</b>. Kai consumers message <b>baant</b> lete hain.
          Position broker ke paas. Replay <b>namumkin</b>.
          <br><br>✅ Background jobs, emails, thumbnails — simple aur sasta.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🌊 Log — ek itihaas</span>
        <div class="dg-cap">Message <b>rehta hai</b> (retention tak). Har consumer group ko
          <b>poora</b> data. Offset <b>consumer</b> ke paas.
          <br><br>✅ Replay · ✅ kai independent consumers · ✅ ordering (partition ke andar)</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">⏪ REPLAY — jo queue de hi nahi sakti</span>
      <span>Naya feature? Purana data replay karo. Bug se galat aggregation?
        Offset peeche karo. Nayi team ko wahi events? Naya consumer group,
        purane par koi asar nahi. <b>Aksar yahi Kafka chunne ka asli karan hota hai.</b></span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">p0 p1 p2</span><span class="dg-arrow">→</span><span class="dg-pill good">consumer A</span>
    </div>
    <div class="dg-flow" style="margin-top:6px">
      <span class="dg-pill">p3 p4 p5</span><span class="dg-arrow">→</span><span class="dg-pill good">consumer B</span>
    </div>
    <div class="dg-flow" style="margin-top:6px">
      <span class="dg-pill is-muted">—</span><span class="dg-arrow">→</span><span class="dg-pill bad">consumer C, D 😴</span>
    </div>
    <div class="dg-cap">Ek partition ek waqt mein <b>ek hi</b> consumer ko milta hai
      (warna ordering toot jaati). Isliye <b>partitions hi tumhari max parallelism hain</b>.
      Aur partition count baad mein badhana mehenga hai — <code>hash(key) % partitions</code>
      ka jawab badal jaata hai, aur ek user ke purane-naye events alag partitions mein bikhar jaate hain.</div>
    <div class="dg-legend">
      <span class="dg-pill acc">🔑 ORDERING = PARTITION KEY KA DESIGN</span>
      <span>Kram sirf <b>ek partition ke andar</b> guarantee hai. Isliye jin cheezon ka kram
        matter karta hai unhe ek hi key (jaise <code>user_id</code>) par bhejo.
        Global ordering = ek partition = zero parallelism.</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">8:59:58</span><span class="cmd">event HUA</span><span class="q">event time</span></div>
      <div class="dg-rung"><span class="lv">9:00:03</span><span class="cmd">event PAHUNCHA</span><span class="q">processing time (phone tunnel mein tha)</span></div>
    </div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">⏱️ Processing time se gino</span>
        <div class="dg-cap">Aasan — aur <b>galat</b>. Aur galti random nahi hoti:
          woh systematically un users par padti hai jinka network kharab hai.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🌊 Event time + watermark</span>
        <div class="dg-cap">Sahi — par "window band kab karein?"
          <br><br><b>Watermark</b> = "itni der se purana ab nahi aayega".
          <br><code>10s → jaldi, ~2% chhoote</code>
          <br><code>60s → ~0.1% chhoote, natija 1 min der se</code></div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">⚖️ COMPLETENESS vs LATENCY</span>
      <span>Iska jawab <b>engineering nahi, business</b> deta hai. Billing: der manzoor, galti nahi.
        Live dashboard: ulta. Aur teesra raasta: pehle approximate dikhao, baad mein correct karo.</span>
    </div>`,
};

VISUALS['contention'] = {
  t: 'Contention — ek seat, do khareedaar',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">A</span><span class="cmd">SELECT → "free"</span><span class="q"></span></div>
      <div class="dg-rung"><span class="lv">B</span><span class="cmd">SELECT → "free"</span><span class="q">A ne abhi tak UPDATE nahi kiya</span></div>
      <div class="dg-rung"><span class="lv">A</span><span class="cmd">UPDATE → sold</span><span class="q"></span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">B</span><span class="cmd">UPDATE → sold</span><span class="q">💥 ek hi seat, do log</span></div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">⚠️ TRANSACTION SE YEH NAHI RUKTI</span>
      <span>Transaction <b>atomicity</b> deta hai — "koi aur beech mein na aaye" <b>nahi</b>.
        Default READ COMMITTED par dono SELECT successful hain. Chahiye:
        <code>SELECT … FOR UPDATE</code>, ya condition ko update ke <b>andar</b>
        (<code>WHERE status='free'</code>).</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🔒 Pessimistic</span>
        <div class="dg-cap">"Takraav hoga hi" — pehle lock lo.
          <br><code>SELECT … FOR UPDATE</code>
          <br><br>Doosri request <b>rukti</b> hai.
          <br>✅ hot row par saaf · ❌ kam contention par bekaar wait</div>
      </div>
      <div class="dg-box is-gold"><span class="bx-label">🔁 Optimistic</span>
        <div class="dg-cap">"Shayad na ho" — likhte waqt check karo.
          <br><code>UPDATE … WHERE version = ?</code>
          <br><br>Haarne wali ko <code>0 rows</code> milta hai.
          <br>✅ kam contention par tez · ❌ hot row par sab retry karke haarte hain</div>
      </div>
    </div>
    <div class="dg-cap">Faisla ek hi number se: <b>kitni baar do requests ek hi row par takraati hain?</b></div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill good">1. HOLD<br><small>TTL 10 min</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">2. PAY<br><small>koi lock latka hua nahi</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">3a. CONFIRM<br><small>hold → sale</small></span>
      <span class="dg-pill is-muted">3b. EXPIRE<br><small>seat apne aap wapas</small></span>
    </div>
    <div class="dg-cap"><b>Reservation.</b> Beech mein <b>insaan ka waqt</b> hai — aur uske liye
      dono locking strategies galat hain. Redis mein yeh ek line hai:
      <code>SET seat:A1 user123 NX EX 600</code> — <code>NX</code> atomic check-and-set,
      <code>EX</code> apne aap expiry.</div>
    <div class="dg-legend">
      <span class="dg-pill bad">⏳ TTL = IS PATTERN KI DEFINITION</span>
      <span>Uske bina "hold" ek <b>permanent kabza</b> ban jaata hai.
        Abandoned checkouts chup-chaap poora inventory kha jaate hain —
        aur kyunki kuch "fail" nahi hota, woh kisi dashboard par nahi dikhta.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🔑 DO NIYAM</span>
      <span><b>1.</b> Lock ke andar <b>kabhi</b> network call nahi — lock ka waqt = us row par sabka wait.
        <b>2.</b> Lock ki umar hamesha bandhi ho (TTL / transaction timeout / fencing token) —
        crash hua process apna lock hamesha ke liye na pakde rahe.</span>
    </div>`,
};

VISUALS['chooser'] = {
  t: 'Kaunsa aujaar kab — aur uska "yeh mat karo"',
  html: `
    <div class="dg-flow">
      <span class="dg-pill good">Postgres</span><span class="dg-arrow">+</span>
      <span class="dg-pill good">Redis</span><span class="dg-arrow">+</span>
      <span class="dg-pill good">S3</span><span class="dg-arrow">+</span>
      <span class="dg-pill good">ek queue</span>
    </div>
    <div class="dg-cap"><b>Default stack.</b> Isse hato sirf jab koi <b>maapi hui</b> cheez majboor kare.
      "Aage chal ke" ek karan nahi hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🐘</span><span class="cmd">Postgres — transactions, joins, constraints</span><span class="q">❌ 4GB videos mat rakho · crore rows par analytics mat chalao</span></div>
      <div class="dg-rung"><span class="lv">🗄️</span><span class="cmd">Cassandra — bhaari writes, time-series</span><span class="q">❌ ad-hoc queries nahi · partition key baad mein badal nahi sakte</span></div>
      <div class="dg-rung"><span class="lv">⚡</span><span class="cmd">Redis — cache, counters, locks, sorted sets</span><span class="q">❌ source of truth mat banao (memory-first)</span></div>
      <div class="dg-rung"><span class="lv">🔍</span><span class="cmd">Elasticsearch — full-text, facets, fuzzy</span><span class="q">❌ source of truth nahi · badalne wala data (daam) mat rakho</span></div>
      <div class="dg-rung"><span class="lv">📨</span><span class="cmd">Kafka — durable log, replay, kai consumers</span><span class="q">❌ sirf background jobs ke liye mat lagao · sync path mein mat daalo</span></div>
      <div class="dg-rung"><span class="lv">🪣</span><span class="cmd">S3 — bytes, backups, data lake</span><span class="q">❌ database mat banao · usme "query" mat karo</span></div>
      <div class="dg-rung"><span class="lv">📊</span><span class="cmd">ClickHouse — crore rows par aggregate</span><span class="q">❌ single-row updates mat karo · OLTP ki jagah nahi</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Yeh mat bolo</span>
        <div class="dg-cap">"Scale ke liye NoSQL chahiye"
          <br>"Mere data mein relationships hain isliye SQL"
          <br>"Redis laga denge"
          <br>"Kafka laga denge"
          <br><br><small>Har ek mein sirf <b>aujaar ka naam</b> hai.</small></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Iski jagah</span>
        <div class="dg-cap">"Is table ka write rate 80k/s hai jo ek node se bahar hai,
          aur access hamesha by (device, time) — isliye Cassandra"
          <br><br>"Mujhe replay aur teen independent consumers chahiye —
          warna SQS kaafi thi"
          <br><br><small>Har ek mein ek <b>zaroorat</b> hai jisse chunav nikla.</small></div>
      </div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill gold">📏 HATNE KE MAAPE HUE KARAN</span>
      <span>LIKE full scan kar raha hai → <b>Elasticsearch</b> ·
        kai teams ko wahi events / replay → <b>Kafka</b> ·
        analytics OLTP ka buffer pool dho rahi hai → <b>columnar</b> ·
        ek table ka write rate ek machine se bahar → <b>Cassandra/sharding</b> ·
        users door hain → <b>CDN/regional</b>.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">⚠️ HAR NAYA SYSTEM EK MULTIPLIER HAI</span>
      <span>Ek aur cheez jo gir sakti hai · ek aur upgrade · ek aur on-call ·
        ek aur naye engineer ko seekhni · ek aur jagah jahan data alag ho sakta hai.
        Pehle poochho: <b>kaunsi 2 hataayi ja sakti hain?</b></span>
    </div>`,
};

/* ===== TRACK 7 — Poore Systems Banao ===== */
VISUALS['bitly'] = {
  t: 'URL shortener — poora design ek ratio se',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">40 writes/sec</span><span class="dg-arrow">:</span>
      <span class="dg-pill acc">12,000 reads/sec</span><span class="dg-arrow">=</span>
      <span class="dg-pill gold">100 : 1</span>
    </div>
    <div class="dg-cap">Yeh ek ratio poora design tay kar deta hai:
      write path itna chhota hai ki uspar sochna hi galti hai. <b>Saara kaam read path par hai.</b></div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">🎲</span><span class="cmd">Random 7 chars</span><span class="q">har insert par "yeh code hai kya?" lookup — aur space bharne par retries badhte hain</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">#️⃣</span><span class="cmd">md5(url) ke pehle 7</span><span class="q">wahi URL = wahi code (kabhi bug) · truncation se collisions phir bhi</span></div>
      <div class="dg-rung g"><span class="lv">🔢</span><span class="cmd">Counter → scramble → base62</span><span class="q">collision <b>namumkin</b> → lookup HAI HI NAHI · code sabse chhota</span></div>
    </div>
    <div class="dg-cap"><code>62⁷ = 3.5 kharab codes</code> — 5 saal ke 6 arab URLs ke liye 500x margin.
      Aur counter sortable hai, isliye index bhi khush.</div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">GET /aX9k2Lq</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">CACHE hit (95%+)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">302 redirect</span>
    </div>
    <div class="dg-flow" style="margin-top:6px">
      <span class="dg-pill is-muted">miss</span><span class="dg-arrow">→</span>
      <span class="dg-pill">DB (code par index)</span><span class="dg-arrow">→</span>
      <span class="dg-pill is-muted">cache mein daalo</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🚫 REDIRECT PATH PAR KUCH NAHI</span>
      <span>Koi join nahi, koi auth nahi, koi analytics <b>write</b> nahi.
        Click count ko sync karne se 12,000 reads/sec <b>12,000 writes/sec</b> ban jaate hain —
        aur woh sab <b>ek hi row</b> par. Event bhejo, redirect turant lauta do.</span>
    </div>

    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">↩️ 301 Permanent</span>
        <div class="dg-cap">Browser cache kar leta hai → agli baar server tak aata hi nahi.
          <br>✅ load kam
          <br>❌ <b>click count khatam</b> · ❌ destination kabhi badal nahi sakte</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">↩️ 302 Found</span>
        <div class="dg-cap">Har click server se guzarta hai.
          <br>✅ analytics milti hai · ✅ destination badla ja sakta hai
          <br>❌ har click ek request
          <br><br><small>Jab analytics <b>product</b> ho, woh extra load ek feature hai.</small></div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🔥 VIRAL LINK = HOT KEY</span>
      <span>50k rps ek code par. Cache nodes badhane se kuch nahi —
        <b>1-second local cache</b> (99.9% traffic app ki memory se) + cache key ki N copies.</span>
    </div>`,
};

VISUALS['leaderboard'] = {
  t: 'Leaderboard — jawab ek data structure hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ SQL</span>
        <div class="dg-cap"><code>SELECT … ORDER BY score DESC LIMIT 100</code>
          <br><small>top-100 tez hai (index ke pehle 100)</small>
          <br><br><code>SELECT COUNT(*) WHERE score &gt; mera</code>
          <br><small>💥 har baar lakhon rows — aur <b>har player</b> yeh poochhta hai</small>
          <br><br>Aur 10k score updates/sec index ke ek hi hisse par <b>hot spot</b> banate hain.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Redis sorted set</span>
        <div class="dg-cap"><code>ZADD&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;score update &nbsp;&nbsp;O(log n)</code>
          <br><code>ZREVRANGE&nbsp; top 100 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;O(log n + k)</code>
          <br><code>ZREVRANK&nbsp;&nbsp;meri rank &nbsp;&nbsp;&nbsp;&nbsp;O(log n)</code>
          <br><br>Skip list ke har node par "mere neeche kitne hain" ka count —
          isliye rank <b>gini nahi, padhi</b> jaati hai.</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🎯 BADA SABAK</span>
      <span>Kabhi-kabhi jawab "query optimize karo" nahi hota —
        jawab <b>alag data structure</b> hota hai.</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🗓️</span><span class="cmd">leaderboard:daily:2026-09-04</span><span class="q">TTL 48 ghante</span></div>
      <div class="dg-rung"><span class="lv">🗓️</span><span class="cmd">leaderboard:weekly:2026-W36</span><span class="q">TTL 14 din</span></div>
      <div class="dg-rung"><span class="lv">🗓️</span><span class="cmd">leaderboard:alltime</span><span class="q">koi TTL nahi</span></div>
    </div>
    <div class="dg-cap">Update par teenon mein <code>ZINCRBY</code>. Ek hi set mein "time se filter"
      ka koi sasta tareeka nahi — woh <b>score</b> par sorted hai, time par nahi.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">💾 Redis ka rishta</span>
        <div class="dg-cap">DB = <b>source of truth</b> (scores wahan bhi likho)
          <br>Redis = <b>derived</b> read structure jo rebuild ho sake
          <br><br>Redis gira → leaderboard gaya, <b>scores nahi</b>.</div>
      </div>
      <div class="dg-box is-accent"><span class="bx-label">📈 5 crore players par</span>
        <div class="dg-cap">Sorted set shard karna mushkil (rank ke liye <b>global ordering</b> chahiye).
          <br><br>Isliye pehle <b>requirement</b> kaato:
          <br>• Top-1000 alag chhote set mein (99% reads)
          <br>• Baaki ke liye "top 5% mein ho" / approximate rank
          <br><br><small>Rank 4,82,391 vs 4,84,100 — player ke liye <b>koi farak nahi</b>.</small></div>
      </div>
    </div>`,
};

VISUALS['adclick'] = {
  t: 'Ad click aggregator — kyunki billing isi data par hai',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">browser</span><span class="dg-arrow">→</span>
      <span class="dg-pill">ingest API</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">Kafka<br><small>partition by ad_id</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good">Flink<br><small>event-time windows</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">ClickHouse → dashboard</span>
    </div>
    <div class="dg-flow" style="margin-top:6px">
      <span class="dg-pill is-muted">Kafka</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">raw events → S3</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">raat ko EXACT batch</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">billing</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">⚖️ DO PATHS, DO ZAROORATEIN</span>
      <span>Dashboard ko <b>turant</b> chahiye (thodi galti manzoor).
        Billing ko <b>sahi</b> chahiye (der manzoor).
        Ek hi pipeline se speed aur correctness dono maangna hi galti hai.</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-box is-bad"><span class="bx-label">💰 "Billing isi data par hoti hai" — ek line, teen faisle</span>
      <div class="dg-stack">
        <div class="dg-node is-accent"><span class="ni">⏱️</span><span class="nl">Event time laazmi</span><span class="ns">processing time se campaign ke aakhri minute ke clicks agle minute mein chale jaate hain</span></div>
        <div class="dg-node is-accent"><span class="ni">🔁</span><span class="nl">Dedup laazmi</span><span class="ns">at-least-once = consumer crash par batch dobara = dugna bill</span></div>
        <div class="dg-node is-accent"><span class="ni">🧾</span><span class="nl">Exact correction pass</span><span class="ns">approximate structures (HLL) yahan galat jagah par hain</span></div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">click_id</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">bloom<br><small>sasta pehla chhanna</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good">exact check<br><small>LAAZMI</small></span>
    </div>
    <div class="dg-cap">Bloom akela nahi chalega: "shayad dekha hai" par ek <b>asli</b> click
      gir sakta hai — aur woh kisi ka paisa hai. Bloom 99% bekaar lookups kaatta hai,
      faisla exact check karta hai.</div>

    <div class="dg-legend">
      <span class="dg-pill bad">🔥 HOT PARTITION — teesri baar wahi shape</span>
      <span>Super Bowl ad = traffic ka 40% ek <code>ad_id</code> par, yaani ek partition par.
        Hot <b>key</b> (cache) → hot <b>cell</b> (geo) → hot <b>partition</b> (yahan).
        Ilaaj teenon jagah wahi: <b>todo ya replicate karo</b>.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">🔍 COUNT DISPUTE AAYE TOH</span>
      <span>Raw events se <b>reconciliation</b> — teen buckets (sirf unke, sirf hamare, dono par alag).
        Aur do sabse sambhaavit karan pehle se pata hain: <b>late events</b> aur <b>dedup</b>.
        Isiliye raw events rakhna is baatcheet ka ekmatr saboot hai.</span>
    </div>`,
};

VISUALS['ticketmaster'] = {
  t: 'Ticket booking — do alag problems, do alag ilaaj',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🌊 Problem 1 — FLASH CROWD</span>
        <div class="dg-cap">5 lakh log, 10 second.
          <br><br>Ilaaj: <b>waiting room</b> (admission control) + pre-scale +
          cached seat map.
          <br><br><small>Yeh contention theek <b>nahi</b> karta.</small></div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">🎟️ Problem 2 — CONTENTION</span>
        <div class="dg-cap">200 seats, sab ek hi front row chaahte hain.
          <br><br>Ilaaj: <b>hold + TTL</b> (atomic <code>SET NX EX</code>).
          <br><br><small>Yeh load kam <b>nahi</b> karta.</small></div>
      </div>
    </div>
    <div class="dg-cap"><b>Har problem ko uska apna ilaaj chahiye.</b> Yeh design isliye mushkil hai
      ki log aksar sirf ek dekh paate hain — ya toh scale ki baat karte hain, ya sirf locking ki.</div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">5 lakh log</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">waiting room<br><small>"tumhara number 42,318<br>~8 minute"</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good">3,000 concurrent<br><small>andar</small></span>
    </div>
    <div class="dg-cap">Yeh sirf technical bachaav nahi — <b>imaandaari</b> hai.
      Bina number ke sab refresh karte hain (aur retry se load 3x ho jaata hai)
      aur aakhir mein 4,99,800 logon ko "sold out" milta hai.
      Number dikhne par log <b>faisla</b> kar sakte hain.</div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill good">HOLD<br><small>SET seat NX EX 600</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">PAY<br><small>10 min, koi DB lock nahi</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">CONFIRM<br><small>ek transaction<br>+ idempotency key</small></span>
    </div>
    <div class="dg-flow" style="margin-top:6px">
      <span class="dg-pill is-muted">payment fail / user chala gaya</span><span class="dg-arrow">→</span>
      <span class="dg-pill is-muted">TTL EXPIRE — seat apne aap wapas</span>
    </div>
    <div class="dg-cap">Hold ek <b>chhota</b> atomic operation hai jiska asar <b>lamba</b> hai.
      DB lock 10 minute pakadna namumkin hai; aur bina hold ke user payment karke aaye
      aur seat ja chuki ho — woh sabse bura anubhav hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">👀 Read path — seat map</span>
        <div class="dg-cap">Cache se (1-2 second purana <b>bilkul theek</b>) + SSE se
          "yeh seats gayi" ka update.
          <br><br>5 lakh log <b>ek hi</b> map dekh rahe hain — woh ek key hai.</div>
      </div>
      <div class="dg-box is-accent"><span class="bx-label">✍️ Write path — booking</span>
        <div class="dg-cap">Seedha, atomic, primary par. Read path se poori tarah alag —
          warna seat map ka load booking ko gira dega.</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill good">🎯 GALTIYAN JALDI AUR SASTI BANAO</span>
      <span>Stale map se user bik chuki seat par click karega aur turant
        "yeh ja chuki" mil jaayega — <b>achha error</b>.
        Bura error woh hai jo <b>payment ke baad</b> pata chale.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">⏳ TTL BINA HOLD = SILENT INVENTORY LOSS</span>
      <span>"Sold out" jabki hall aadha khaali. Aur yeh <b>error rate par dikhta hi nahi</b> —
        sab 200 laut raha hai. Alert business metric par lagao: available vs sold ka farak.</span>
    </div>`,
};

VISUALS['whatsapp'] = {
  t: 'Chat — store karo, phir push',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">message aaya</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">monotonic id<br><small>per conversation</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good">DURABLE store<br><small>yahan COMMIT hota hai</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill is-muted">push<br><small>ek optimization</small></span>
    </div>
    <div class="dg-cap">Ek kram, <b>chaar</b> problems hal: offline users · reconnects ·
      multi-device sync · "message kho gaya".
      Ulta karoge (pehle push, phir store) toh message <b>dikhega par save nahi hoga</b>.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">📱</span><span class="cmd">phone &nbsp;last_seen = 8817</span><span class="q">sab padh liya</span></div>
      <div class="dg-rung"><span class="lv">💻</span><span class="cmd">laptop last_seen = 8814</span><span class="q">3 messages baaki</span></div>
      <div class="dg-rung"><span class="lv">📟</span><span class="cmd">tablet last_seen = 8801</span><span class="q">16 baaki</span></div>
    </div>
    <div class="dg-cap">Multi-device ke liye koi alag sync system chahiye hi nahi —
      har device apna <b>cursor</b> rakhta hai aur wahi gap-fill query chalata hai
      jo har reconnect chalata hai. Aur <b>receipts bhi wahi cursors hain</b>:
      "kitno ne padha" = <code>COUNT(cursor &gt;= message_id)</code>.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">📰 Feed — write par fanout</span>
        <div class="dg-cap">Ek tweet, 5 crore log padhte hain.
          <br>Read:write = <b>1000 : 1</b>
          <br>→ kaam <b>write</b> par karo, read turant ho</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">💬 Chat — read par fanout</span>
        <div class="dg-cap">Ek message, 20 log padhte hain.
          <br>Read:write = <b>20 : 1</b>
          <br>→ ek write, padhte waqt fetch</div>
      </div>
    </div>
    <div class="dg-cap">"Fanout on write" koi universal best practice nahi hai —
      woh ek <b>ratio</b> ka jawab hai. (Chat mein bhi notification ka chhota event
      write par fanout hota hai — poora message nahi.)</div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">10 crore concurrent</span><span class="dg-arrow">÷</span>
      <span class="dg-pill">50,000 per node</span><span class="dg-arrow">=</span>
      <span class="dg-pill acc">2,000 gateway nodes</span>
    </div>
    <div class="dg-cap">Aur woh nodes tab bhi chahiye jab <b>koi kuch bhej hi na raha ho</b>.
      Gateway sirf sockets rakhe, logic peechhe, beech mein pub/sub (do users
      do alag gateways par hote hain), aage L4 LB.</div>
    <div class="dg-legend">
      <span class="dg-pill bad">🌩️ 2,000 NODES KA DEPLOY</span>
      <span>Ek saath restart = 10 crore reconnects ek saath, aur har reconnect mein
        auth + subscriptions + backlog fetch. <b>Rolling restart + client backoff/jitter</b> —
        yeh design ki shart hai, ops ka detail nahi.</span>
    </div>`,
};

VISUALS['youtube'] = {
  t: 'Video platform — teen alag systems',
  html: `
    <div class="dg-flow">
      <span class="dg-pill gold">100 crore watch-hours/din × ~1 GB</span><span class="dg-arrow">=</span>
      <span class="dg-pill bad">~100 PB/din ≈ 10 Tbps</span>
    </div>
    <div class="dg-cap">Ek number, aur poora design tay ho gaya: yeh origin se serve karna
      <b>namumkin</b> hai. Isliye sab kuch CDN ke around banta hai —
      aur <b>CDN hit rate</b> hi sabse zaroori metric hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">UPLOAD — presigned multipart → S3</span><span class="q">bandwidth-bound · app 40ms kaam karta hai, 20 minute nahi</span></div>
      <div class="dg-rung"><span class="lv">2</span><span class="cmd">TRANSCODE — S3 event → queue → workers</span><span class="q">CPU-bound · 240p…4K + chunks + manifest · status API</span></div>
      <div class="dg-rung"><span class="lv">3</span><span class="cmd">DELIVER — CDN, miss par origin</span><span class="q">egress-bound · yahan 99% traffic hai</span></div>
    </div>
    <div class="dg-cap">Teenon <b>alag</b> scale karte hain aur alag failure modes rakhte hain.
      Ek hi service mein rakhne ka matlab hai ki ek viral video ki delivery
      uploads ko rok degi.</div>

    <div class="dg-rule"></div>
    <div class="dg-box is-good"><span class="bx-label">📶 Adaptive bitrate — video ek file nahi hai</span>
      <div class="dg-cap"><code>manifest.m3u8</code>
        <br><code>&nbsp;240p&nbsp; → chunk0 chunk1 chunk2 …</code>
        <br><code>&nbsp;480p&nbsp; → chunk0 chunk1 chunk2 …</code>
        <br><code>1080p → chunk0 chunk1 chunk2 …</code>
        <br><br>Player har chunk ke baad apni speed naapta hai aur <b>agla</b> chunk
        alag quality se maang sakta hai — beech mein, bina ruke.
        <br><br>Isiliye playback 2 second mein shuru hota hai (sabse chhoti quality ka pehla chunk),
        seek turant hota hai (sirf woh chunk chahiye), aur kharab network par video
        ruk-ruk ke chalne ki jagah <b>dhundhla</b> ho jaata hai.</div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill bad">📉 HIT RATE 95% → 90%</span>
      <span>Origin traffic <b>DUGNA</b> (5% → 10%) — aur woh 10 Tbps ka 10% hai.
        Hit rate ek first-class SLI honi chahiye, aur uska girna ek alert.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">👁️ VIEW COUNT</span>
      <span>100 crore views/din = 12,000 writes/sec <b>ek hot row</b> par.
        Sahi raasta: view event → stream → windowed aggregate → periodic update.
        "1.2M views" mein exactness ka koi mol nahi.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🛡️ ORIGIN SHIELD</span>
      <span>Video viral hua: pehle minute mein <b>har edge</b> par miss, aur woh sab
        origin par ek saath. Edges pehle ek middle layer se poochhein jo ek hi origin
        request banaye — yeh CDN ke paimane par wahi <b>single-flight</b> hai.</span>
    </div>`,
};

VISUALS['boss-uber'] = {
  t: 'FINAL BOSS — ek problem, saat shapes',
  html: `
    <div class="dg-flow">
      <span class="dg-pill gold">🚗 10 lakh drivers · 8 PM, baarish · 50,000 requests/min ek shehar mein</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">📍</span><span class="cmd">Driver locations</span><span class="q">write-heavy, ephemeral → 💀 <b>1.5 crore writes/min DB par = storm</b></span></div>
      <div class="dg-rung"><span class="lv">🗺️</span><span class="cmd">Nearby search</span><span class="q">geo → 💀 <b>hot cell</b> (airport, 8 PM)</span></div>
      <div class="dg-rung"><span class="lv">🤝</span><span class="cmd">Matching</span><span class="q">contention → 💀 <b>ek driver do riders ko</b></span></div>
      <div class="dg-rung"><span class="lv">🔄</span><span class="cmd">Ride lifecycle</span><span class="q">workflow → 💀 <b>beech mein fail → compensation</b></span></div>
      <div class="dg-rung"><span class="lv">🔌</span><span class="cmd">Live tracking</span><span class="q">realtime fanout → 💀 <b>reconnect storm</b></span></div>
      <div class="dg-rung"><span class="lv">💰</span><span class="cmd">Fare + payment</span><span class="q">ledger → 💀 <b>double charge, reconciliation</b></span></div>
      <div class="dg-rung"><span class="lv">📈</span><span class="cmd">Surge pricing</span><span class="q">streaming → 💀 <b>late events, hot partition</b></span></div>
    </div>
    <div class="dg-cap"><b>Saat shapes — aur ek bhi cheez nayi nahi.</b>
      Har failure mode ka naam tumhe pata hai, aur har ek ka ilaaj bhi.
      Yahi is poore app ka maksad tha.</div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">rider ki cell + 8 padosi</span><span class="dg-arrow">→</span>
      <span class="dg-pill">doori + ETA se rank</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">top driver par HOLD<br><small>TTL 15s</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">offer</span>
    </div>
    <div class="dg-flow" style="margin-top:6px">
      <span class="dg-pill is-muted">reject / 15s timeout</span><span class="dg-arrow">→</span>
      <span class="dg-pill is-muted">hold chhodo, agle driver par</span>
    </div>
    <div class="dg-cap">Kadam 3 hi sabse zaroori hai aur sabse zyada chhoota hai.
      Bina hold ke ek driver 5 riders ko offer ho jaayega, aur chaar ko
      "mil gaya… nahi mila" dikhega. Yeh wahi <b>reservation pattern</b> hai —
      sirf TTL 15 second ka hai, 10 minute ka nahi.</div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad">🔁 HAR SAGA STEP COMPENSATE NAHI HOTA</span>
      <span>Ride complete, payment fail — ride <b>reverse nahi ho sakti</b>,
        service di ja chuki hai. Wahan <b>forward recovery</b> chahiye:
        retry → outstanding balance → agli ride se pehle settle.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">👑 POORE APP KA NICHOD</span>
      <span><b>1.</b> Pattern ka <b>naam</b> lo — uske saath uska known failure mode aata hai.
        <b>2.</b> Bottleneck <b>maapo</b>, anumaan mat lagao — woh lagbhag kabhi CPU nahi hota.
        <b>3.</b> Har faisle ki <b>keemat</b> bolo — keemat na bata sako toh tumne samjha nahi,
        bas naam seekha hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">🏛️ Boxes koi bhi bana leta hai</span>
      <span>Tradeoff bolna, bottleneck maapna, aur "iski keemat yeh hai" keh paana —
        wahi <b>architect</b> banata hai.</span>
    </div>`,
};

/* ============ 📡 TRACK 8 — The Feed ============ */

VISUALS['pm-config'] = {
  t: 'Cloudflare, 18 Nov 2025 — zanjeer jiski har kadi safe thi',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🔐 permission change</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🔎 query bina filter</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">📄 rows DOGUNI</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">💥 unwrap() panic</span>
    </div>
    <div class="dg-cap">Har kadi alag se dekho toh sab theek hai. Permission change
      security ke liye <b>sahi</b> tha. Feature file roz banti thi. 200 ki limit
      teen guna headroom thi. Outage kisi <b>ek kadi</b> se nahi, poori
      <b>zanjeer</b> se hua.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">11:05</span><span class="cmd">ClickHouse permission change</span><span class="q">users ko <code>r0</code> database ke columns bhi dikhne lage</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">11:15</span><span class="cmd">feature file 60 → 240 rows</span><span class="q">query mein database ka filter tha hi nahi — har column do baar</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">11:20</span><span class="cmd">FL2 proxy panic</span><span class="q">200 features pre-allocated · <code>unwrap()</code> Err par chala · 5xx</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">11:35+</span><span class="cmd">har 5 min: theek → kharab → theek</span><span class="q">ClickHouse rolling update — file kabhi acche node se, kabhi kharab node se</span></div>
      <div class="dg-rung g"><span class="lv">14:30</span><span class="cmd">sahi file manually daali gayi</span><span class="q">core traffic chal pada · 17:06 par sab normal</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">💥 Jo hua</span>
        <div class="dg-cap">
          file &gt; 200 features → <b>panic</b> → 5xx
          <br>generator query ka koi test nahi
          <br>config ek saath poore fleet par
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Jo hona chahiye tha</span>
        <div class="dg-cap">
          file &gt; 200 → log + alert + <b>purani file par raho</b>
          <br>generated file par schema + row-count check
          <br>config bhi staged: 1% → 10% → 100%
        </div>
      </div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill gold">🎯 CONFIG EK INPUT HAI</span>
      <span>Cloudflare ne apne remediation mein khud yahi likha: apne banaye config
        files ko <b>usi tarah</b> harden karo jaise user ke bheje hue input ko.
        User input par bounds-check hamesha tha — apne hi config par nahi tha.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🌀 FLAPPING = GENERATOR DHOONDHO</span>
      <span>Jab failure ka period kisi cron ya refresh interval se mile, sabse pehle
        usi <b>generator</b> ko dekho. 5 minute ka cycle Bot Management ki
        5-minute file thi — attack nahi.</span>
    </div>`,
};

VISUALS['pm-regex'] = {
  t: 'Cloudflare, 2 Jul 2019 — detect 3 min, mitigate 25 min',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">.*(?:.*=.*)</span><span class="dg-arrow">→</span>
      <span class="dg-pill">catastrophic backtracking</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">CPU ~100% har machine par</span>
    </div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">x=x</span><span class="cmd">23 kadam</span><span class="q">chhota input, chhota kaam</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">20 x</span><span class="cmd">555 kadam</span><span class="q">input 7x bada, kaam 24x bada</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">thoda aur</span><span class="cmd">lakhon kadam</span><span class="q">exponential — CPU khatam</span></div>
    </div>
    <div class="dg-cap">Ilaaj review ya timeout nahi — <b>linear-time engine</b> (RE2 / Rust regex),
      jo nested quantifiers ko exponential hone hi nahi deta.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🚀 Normal code ka raasta</span>
        <div class="dg-cap">DOG → PIG → Canary → global<br><small>ghanton ka staged rollout</small></div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">⚡ WAF rules ka raasta</span>
        <div class="dg-cap">Quicksilver → <b>poori duniya, seconds mein</b>
          <br><small>naye attack ke jawab ke liye — par bina bake aur bina kill switch ke</small></div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">13:42 deploy</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">13:45 alert</span><span class="dg-arrow">→</span>
      <span class="dg-pill">14:00 culprit mila</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">14:07 WAF off</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">⏱️ DO ALAG NUMBER</span>
      <span><b>Time to detect: 3 min.</b> <b>Time to mitigate: 25 min.</b>
        Ek "27 minute" mein mila do aur poori seekh gayab. Paisa monitoring mein nahi,
        <b>kill switch</b> mein lagana tha.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">📐 ROLLOUT KI ASLI SHART</span>
      <span><code>bake time ≥ alert firing time</code> — bake alert se chhota hua toh
        kharab change canary ke <b>baad</b> pakda jaayega, yaani global ho chuka hoga.
        Percentage akela kuch nahi kehta.</span>
    </div>`,
};

VISUALS['pm-split'] = {
  t: 'GitHub, 21 Oct 2018 — 43 second, 24 ghante',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">43 second partition</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">failover (bina fencing)</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">~954 orphan writes</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">24 ghante 11 minute</span>
    </div>
    <div class="dg-cap">Nuksaan partition ki <b>lambai</b> se nahi aaya — us dauraan liye gaye
      <b>writes</b> se aaya. Purana primary <b>mara nahi</b> tha, sirf <b>kat</b> gaya tha —
      aur zinda tha, isliye likhta raha.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">⚡ Jaldi failback</span>
        <div class="dg-cap">Sewa turant normal
          <br>❌ East Coast ke <b>954 writes gum</b>
          <br><small>kisi ka issue, comment, ya push chala jaata</small></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🛡️ Consistency pehle</span>
        <div class="dg-cap">Ek bhi user ka data nahi khota
          <br>❌ <b>24 ghante</b> degraded sewa
          <br><small>GitHub ne yahi chuna, aur wajah likh kar batayi</small></div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">✋ Ek taraf writes roko</span><span class="q">har second reconcile ka kaam bada kar raha hai</span></div>
      <div class="dg-rung"><span class="lv">2</span><span class="cmd">📤 Irreversible effects roko</span><span class="q">50 lakh webhooks + 80,000 Pages builds queue mein</span></div>
      <div class="dg-rung"><span class="lv">3</span><span class="cmd">🔍 Diff nikalo</span><span class="q">kaunse writes kis taraf hain</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">4</span><span class="cmd">💾 Backup se restore</span><span class="q"><b>sabse lamba kadam</b> — decompress, checksum, prepare, load</span></div>
      <div class="dg-rung"><span class="lv">5</span><span class="cmd">🔁 Orphan writes replay</span><span class="q">ab sachai poori hui</span></div>
      <div class="dg-rung g"><span class="lv">6</span><span class="cmd">📬 Queues drain karo</span><span class="q">sabse aakhir mein — data sahi hone ke baad</span></div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill bad">🔪 FENCING — asli ilaaj</span>
      <span>Naya primary tabhi bane jab purana primary <b>writes lena band</b> kar chuka ho
        (lease khatam, ya STONITH). Sirf timeout badhane se har chhote partition par
        outage lamba hota hai, split brain nahi rukta.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">⏳ RTO NAAPO, ANUMAAN MAT LAGAO</span>
      <span>24 ghante code mein nahi, <b>backup restore ke I/O</b> mein gaye. Apna sabse
        bada database ek baar sach mein restore karke ghadi dekho.</span>
    </div>`,
};

VISUALS['pm-thread'] = {
  t: 'AWS Kinesis, 25 Nov 2020 — capacity badhane se outage',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">capacity ADD ki</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">har server par threads badhe</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">OS thread limit paar</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">shard-map bana hi nahi</span>
    </div>
    <div class="dg-cap">Har front-end server <b>har doosre</b> server ke liye ek thread banata hai.
      Isliye naye servers aane par threads <b>har</b> server par badhe — sirf naye par nahi —
      aur poora fleet <b>ek saath</b> limit paar kar gaya.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">N</span><span class="cmd">9,200 servers</span><span class="q">threads per server ≈ 9,199</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">N²</span><span class="cmd">8.5 crore threads (poora fleet)</span><span class="q">9,200 × 9,199</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">+10%</span><span class="cmd">servers 10% badhe → threads <b>21%</b> badhe</span><span class="q">O(N²) ka asar</span></div>
      <div class="dg-rung"><span class="lv">RAM</span><span class="cmd">9,199 × 8 KB = ~74 MB</span><span class="q">memory graph bilkul saaf — limit thread COUNT ki thi</span></div>
    </div>
    <div class="dg-cap">Isiliye CPU aur memory dashboards ne kuch nahi bataya. <b>Har limit ek
      dashboard par nahi hoti</b> — threads, file descriptors, PIDs, ephemeral ports,
      connection table. Alert <b>limit ke 70%</b> par lagao.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🏢 Ek bada fleet</span>
        <div class="dg-cap">thread ganit N×N<br>blast radius <b>100%</b>
          <br>capacity add = <b>global</b> change</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🧊 Kai chhote cells</span>
        <div class="dg-cap">har cell mein sirf uske apne servers<br>blast radius <b>1/N</b>
          <br>capacity add = <b>naya cell</b>, purane chhoote hi nahi</div>
      </div>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🐢 RECOVERY KI RAFTAAR BHI EK DESIGN FAISLA HAI</span>
      <span>AWS ne servers <b>~400/ghanta</b> ki raftaar se wapas laaye. Har server chalu
        hote hi cache <b>banane</b> aur requests <b>serve karne</b>, dono ke liye ladta hai —
        ek saath sab chalu karne se recovery <b>ulta lamba</b> ho jaata hai.</span>
    </div>`,
};

VISUALS['pm-spiral'] = {
  t: 'Roblox, 28-31 Oct 2021 — 73 ghante ka death spiral',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">streaming flag ON</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">channel contention</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">Consul KV 2 second</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">services unhealthy</span>
    </div>
    <div class="dg-cap">Aur unhealthy services ne <b>aur zyada</b> discovery requests bheji —
      jisse contention aur badhi. Yeh chakkar apne aap chalta raha.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">1</span><span class="cmd">Consul dheema hua</span><span class="q">streaming ke kam Go channels par bhaari contention</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">2</span><span class="cmd">Service discovery atki</span><span class="q">Nomad aur Vault dono Consul par nirbhar</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">3</span><span class="cmd">Services ne khud ko unhealthy kiya</span><span class="q">dependencies mil hi nahi rahi thi</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">4</span><span class="cmd">Aur zyada discovery requests</span><span class="q">bina backoff ke retry = spiral ka indhan</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">↺</span><span class="cmd">Wapas kadam 1 par</span><span class="q"><b>bahar ka load hatane par bhi nahi ruka</b></span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">💾 BoltDB freelist</span>
        <div class="dg-cap">4.2 GB file mein asli data sirf <b>489 MB</b>
          <br>7.8 MB freelist <b>har 16 KB append</b> par dobara likha
          <br>KV write latency: 300 ms → <b>2 second</b></div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">🙈 Observability</span>
        <div class="dg-cap">Monitoring khud Consul par nirbhar thi
          <br>Consul gira → Consul ka andar dekhne ka raasta bhi gaya
          <br>Root cause milne mein <b>~46 ghante</b></div>
      </div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill bad">🧪 DEATH SPIRAL KA TEST</span>
      <span>Bahar ka <b>saara</b> load hatao. System theek ho gaya? load bahar ka tha.
        Nahi hua? load <b>andar</b> ka hai — ilaaj internal churn kaatna hai
        (backoff, circuit breaker, non-essential clients band karo).</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🖥️ CONTENTION KA ILAAJ HARDWARE NAHI HAI</span>
      <span>128-core servers laaye gaye aur haalat <b>ULTA kharab</b> hui — dual-socket NUMA
        par ek hi channel ki contention aur badh gayi. Zyada cores = zyada ladne wale.</span>
    </div>`,
};

VISUALS['napkin'] = {
  t: 'Napkin math — paimana, physics aur Little\'s Law',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">40 writes/sec</span><span class="dg-arrow">·</span>
      <span class="dg-pill acc">4,000 writes/sec</span><span class="dg-arrow">·</span>
      <span class="dg-pill gold">400,000 writes/sec</span>
    </div>
    <div class="dg-cap">Teen bilkul <b>alag systems</b>: ek Postgres · schema+index+batching ·
      ek stream (Kafka + LSM). In teenon ke beech <b>100x</b> ka farak hai — isliye
      tumhara 2x error koi farak nahi daalta, 100x error galat system bana deta hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold">📅 1 DIN ≈ 100,000 SECOND</span>
      <span>Roz ka volume 1 lakh se divide karo, QPS mil gaya.
        <b>1M/din ≈ 12/sec · 10M/din ≈ 120/sec · 1B/din ≈ 12,000/sec</b></span>
    </div>

    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">&lt;1ms</span><span class="cmd">memory 100 ns · SSD random 100 µs · same-AZ RTT 0.5 ms</span><span class="q">"lagbhag muft" — par 100 aise call phir bhi 50 ms hain</span></div>
      <div class="dg-rung"><span class="lv">1-10ms</span><span class="cmd">cross-AZ RTT · indexed row · 1 MB SSD sequential</span><span class="q">simple query 50 ms le rahi hai? index nahi lag raha ya N+1 hai</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">10-100ms</span><span class="cmd">disk seek 10 ms · Mumbai↔Singapore 35 ms · 1 MB @ 1 Gbps 8 ms</span><span class="q">sehne laayak — agar sequential na ho</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">100ms+</span><span class="cmd">Mumbai↔Virginia 130 ms · cold start · naya TLS handshake 400 ms</span><span class="q">yahan design badalna padta hai</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🌍 Physics ki seema</span>
        <div class="dg-cap"><code>RTT ≥ 2 × doori ÷ 200,000 km/s</code>
          <br>Mumbai↔Virginia (13,000 km) = <b>130 ms</b>
          <br><br>Teen hi ilaaj: <b>call mat karo</b> (cache),
          <b>data paas laao</b> (replicate), <b>async kar do</b>.
          Chautha raasta nahi hai.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🔢 Little's Law</span>
        <div class="dg-cap"><code>L = λ × W</code>
          <br>50,000 rps × 40 ms = <b>2,000 concurrent</b>
          <br>Pool 200 ka? <b>1,800 queue mein</b>
          <br><br>Queue mein khadi request <b>CPU nahi jalati</b> —
          isliye "CPU 10% par timeout" dikhta hai.</div>
      </div>
    </div>`,
};

VISUALS['vectors'] = {
  t: 'Vector search — HNSW ke teen knob',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">text</span><span class="dg-arrow">→</span>
      <span class="dg-pill">embedding model</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">768 numbers</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">"sabse paas kaun?"</span>
    </div>
    <div class="dg-cap">Query ka <b>aakaar</b> badal gaya, isliye index ka aakaar bhi badal gaya.
      768 dimensions mein "sorted order" jaisi koi cheez hai hi nahi — isliye B-tree bekaar hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">Flat</span><span class="cmd">har vector se doori</span><span class="q">&lt;10 lakh vectors · recall <b>100%</b> · koi tuning nahi</span></div>
      <div class="dg-rung"><span class="lv">IVF</span><span class="cmd">clusters mein baanto, paas ke clusters dekho</span><span class="q">memory kam, index build tez · usi recall par latency zyada</span></div>
      <div class="dg-rung g"><span class="lv">HNSW</span><span class="cmd">layered graph — upar lambi chhalaang, neeche chhote kadam</span><span class="q">sabse aam chunav: sabse achhi recall-vs-latency</span></div>
    </div>
    <div class="dg-cap">HNSW ko samajhne ka aasan tareeka: woh ek <b>skip list</b> hai jo graph ban gaya.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🎛️ Teen knob, teen alag tradeoff</span>
        <div class="dg-cap">
          <b>M</b> — neighbours/node → recall ↑, <b>memory ↑↑</b>
          <br><b>efConstruction</b> — build-time → <b>ek baar</b> ka kharcha
          <br><b>efSearch</b> — search-time → <b>har query</b>, latency ↑
          <br><br><small>Latency budget toote → efSearch. RAM budget toote → quantization.
          Galat knob ghumana sabse aam galti hai.</small></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🗜️ Quantization (10 crore × 768)</span>
        <div class="dg-cap">
          float32 · 3,072 B → <b>307 GB</b> · baseline recall
          <br>int8 · 768 B → <b>77 GB</b> · recall ~1-2% kam
          <br>binary · 96 B → <b>10 GB</b> · recall bahut kam
          <br><br><small>Binary akela nahi — binary se candidates nikalo,
          phir float32 se <b>rerank</b>.</small></div>
      </div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill bad">🕳️ VECTOR SEARCH KA BLIND SPOT</span>
      <span><b>Exact tokens</b> — model number, SKU, error code, naam. Vectors <b>matlab</b>
        pakadte hain, isliye "iPhone 15" aur "iPhone 14" unke liye lagbhag ek hain.
        Ilaaj: <b>hybrid search</b> (vector + BM25).</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🐌 RAG KA CHHUPA HUA BOTTLENECK</span>
      <span>embedding 10-30 ms · vector search 5-50 ms · <b>rerank 50-200 ms</b> ·
        LLM first token 200-800 ms. Anumaan "LLM dheema hai" hota hai; naap aksar
        <b>rerank</b> dikhata hai.</span>
    </div>`,
};

VISUALS['multiregion'] = {
  t: 'Multi-region — "active-active" ke chaar alag matlab',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">1️⃣</span><span class="cmd">Ek global primary</span><span class="q">strong · remote users ko poora RTT · <b>region gira toh writes BAND</b></span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">🗳️</span><span class="cmd">Cross-region quorum</span><span class="q">strong · <b>har write par 1 RTT</b> · 3+ regions par zinda rehta hai</span></div>
      <div class="dg-rung g"><span class="lv">📍</span><span class="cmd">Regional-by-row</span><span class="q"><b>strong AUR local</b> · har row ka apna home region · us region ke rows hi rukte hain</span></div>
      <div class="dg-rung"><span class="lv">🔀</span><span class="cmd">Async multi-primary</span><span class="q">local writes · <b>eventual</b> + conflicts · hamesha zinda</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🌐 Duniya bhar ka quorum</span>
        <div class="dg-cap">write p99 = 5 ms + <b>130 ms</b> = ~135 ms
          <br><small>har write par ek poora inter-region RTT</small></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🌏 Ek continent ka quorum</span>
        <div class="dg-cap">write p99 = 5 ms + <b>30 ms</b> = ~35 ms
          <br><small>isiliye asli global systems quorum ek continent mein rakhte hain
          aur continents ke beech async replicate karte hain</small></div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold">📍 REGIONAL-BY-ROW — kam samjha jaane wala hal</span>
      <span>Mumbai ka user apna data Mumbai se padhta aur likhta hai (5 ms, strong).
        Virginia ka user Virginia se. <b>Cross-region coordination hai hi nahi</b> —
        isliye tez BHI hai aur strong BHI.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">💰 KEEMAT KAHAN</span>
      <span><b>Ek:</b> jo data kisi ek user ka nahi (config, catalog, rates) usko
        <b>global table</b> banana padta hai. <b>Do:</b> kai regions ke rows maangne
        wali query ab ek <b>cross-region fan-out</b> hai.</span>
    </div>
    <div class="dg-cap"><b>Faisle ka sahi kram:</b> 1. data user-wise baanta ja sakta hai? →
      regional-by-row &nbsp;·&nbsp; 2. har jagah ek jaisa chahiye? → global table &nbsp;·&nbsp;
      3. strong + multi-region writes? → quorum, <b>par ek continent mein</b> &nbsp;·&nbsp;
      4. stale read chalega? → local replica. Zyadatar teams kadam 3 se shuru karti hain,
      aur wahi sabse mehenga kadam hai.</div>`,
};

VISUALS['rollout'] = {
  t: 'Progressive rollout — canary ka ganit',
  html: `
    <div class="dg-legend">
      <span class="dg-pill bad">❓ "5% CANARY" APNE AAP MEIN KUCH NAHI KEHTA</span>
      <span>Canary ka kaam <b>statistics</b> hai. Asli sawaal: us 5% par kitne
        <b>samples</b> aayenge, aur kya utne mein tumhara regression dikhega?</span>
    </div>
    <div class="dg-flow">
      <span class="dg-pill">n ≈ 16 × p × (1−p) ÷ delta²</span>
    </div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">0.1%</span><span class="cmd">baseline error rate (p)</span><span class="q">aam production service</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">0.05pp</span><span class="cmd">n ≈ 64,000 samples</span><span class="q">1% canary @ 20k rps = 200 rps → ~5 min</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">0.02pp</span><span class="cmd">n ≈ 4,00,000 samples</span><span class="q">1% par 33 min · 5% par <b>6.7 min</b></span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">0.01pp</span><span class="cmd">n ≈ 16,00,000 samples</span><span class="q">delta aadha → samples <b>chaar guna</b></span></div>
    </div>
    <div class="dg-cap">Samples sirf do cheezon se aate hain: <b>zyada traffic</b> (bada canary)
      ya <b>zyada waqt</b> (lamba bake). Teesra raasta hai hi nahi —
      <b>statistics blast radius maangti hai</b>.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">📦 Deploy</span>
        <div class="dg-cap">chalta <b>code</b> badalta hai
          <br>palatne mein <b>minutes</b>
          <br>rollback ke dauraan version skew</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🎚️ Feature flag</span>
        <div class="dg-cap">code ka <b>vyavhaar</b> badalta hai
          <br>palatne mein <b>seconds</b>
          <br>flag combinations kabhi test nahi hote</div>
      </div>
    </div>
    <div class="dg-cap">Sahi aakaar: <b>band halat mein deploy karo, phir flag se kholo</b> —
      ab deploy aur release do alag ghatnayein hain, aur dono ka apna kill switch hai.</div>

    <div class="dg-legend">
      <span class="dg-pill gold">🤖 AUTOMATIC ROLLBACK</span>
      <span>Raat 3 baje insaan ko jagana + context dena + sahi button dabwana = 20 minute.
        Machine ko sirf <b>ek shart</b> chahiye. Cloudflare 2019: detect 3 min, mitigate 25 min.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🧹 AAKHRI KADAM — FLAG HATAO</span>
      <span>10 flags = <b>1,024 combinations</b>, jinme se tum 3 test karte ho.
        Bhoole hue flags apni ek poori outage class hain.</span>
    </div>`,
};

VISUALS['unitcost'] = {
  t: 'Cost per request — har design faisle ka bill',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">$258,000 / mahina</span><span class="dg-arrow">÷</span>
      <span class="dg-pill">1,200 crore requests</span><span class="dg-arrow">=</span>
      <span class="dg-pill gold">$21.50 per million</span>
    </div>
    <div class="dg-cap">"Yeh design behtar hai" ek <b>raay</b> hai. "$21.50 vs $84 per million"
      ek <b>tathya</b> hai. Cost per request architecture ko raay se nikaal kar ganit mein le aata hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung g"><span class="lv">💻</span><span class="cmd">Compute — 100 crore req × 200 ms = <b>$2,222</b></span><span class="q">lagbhag hamesha sabse chhota hissa</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">📤</span><span class="cmd">Egress — 1 PB × $0.05/GB = <b>$50,000</b></span><span class="q">ilaaj: CDN (origin egress lagbhag khatam)</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">🚪</span><span class="cmd">NAT Gateway — har GB par charge</span><span class="q">ilaaj: <b>VPC endpoints</b> (S3/DynamoDB) — NAT bypass</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">↔️</span><span class="cmd">Cross-AZ — <b>dono taraf</b> charge</span><span class="q">ilaaj: zone-aware routing</span></div>
    </div>
    <div class="dg-cap">Chaaron <b>per-GB</b> hain aur chaaron <b>architecture</b> se aate hain —
      instance chhota karne se ek bhi kam nahi hoti. Isliye bill ka pehla kadam instance size
      nahi, <b>data ka raasta</b> hota hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🤖 LLM ka ganit</span>
        <div class="dg-cap">2,000 input × $3/M = $0.006
          <br>500 output × $15/M = <b>$0.0075</b>
          <br>per call = $0.0135 → 10 lakh/din = <b>$13,500/din</b>
          <br><br><small>Output input se <b>5x mehenga</b> — "jawab chhota rakho"
          ek asli cost optimization hai (aur latency bhi behtar).</small></div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">📉 Unit economics ka test</span>
        <div class="dg-cap">users 2x → bill <b>1.6x</b> ✅ sehatmand
          <br>users 2x → bill 2x ⚠️ chinta
          <br>users 2x → bill <b>3x</b> 🚨 khatra
          <br><br><small>Teesri line = kahin <b>super-linear</b> kaam hai
          (N+1, fan-out, cross-AZ, O(N²)). Bill se pehle <b>design</b> ki problem.</small></div>
      </div>
    </div>`,
};

VISUALS['boss-feed'] = {
  t: 'BOSS — paanch outage, ek hi dhaancha',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">TRIGGER (chhota, aksar sahi kaam)</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">AMPLIFIER (design ki kadi)</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">BLIND SPOT (diagnosis atki)</span>
    </div>
    <div class="dg-cap">Design ka kaam beech wala column hai. <b>Trigger</b> rokna lagbhag
      namumkin hai — chhote badlav hamesha honge. <b>Blind spot</b> monitoring ka kaam hai.
      <b>Amplifier</b> hi bounds, staging, fencing aur backoff se toota jaata hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">CF25</span><span class="cmd">permission change → 200-limit + panic</span><span class="q">config par koi validation nahi</span></div>
      <div class="dg-rung"><span class="lv">CF19</span><span class="cmd">ek regex → global deploy bina bake</span><span class="q">WAF ka apna kill switch nahi</span></div>
      <div class="dg-rung"><span class="lv">GH18</span><span class="cmd">43s partition → bina fencing ke failover</span><span class="q">restore time kabhi naapa nahi gaya</span></div>
      <div class="dg-rung"><span class="lv">AWS20</span><span class="cmd">capacity add → O(N²) threads</span><span class="q">thread count par koi alert nahi</span></div>
      <div class="dg-rung"><span class="lv">RBX21</span><span class="cmd">streaming flag → internal retry churn</span><span class="q">monitoring khud Consul par</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold">🧭 ANJAAN OUTAGE — CHAAR SAWAAL</span>
      <span><b>1.</b> Pichhle 30 min mein kya <b>deploy</b> hua? (code + config + permission +
        flag + migration + capacity) &nbsp; <b>2.</b> Failure ka koi <b>period</b> hai? →
        generator dhoondho &nbsp; <b>3.</b> Bahar ka load hatane par theek hota hai? → nahi
        toh death spiral &nbsp; <b>4.</b> Kya main is system ko <b>iske bina</b> dekh sakta hoon?</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">⚡ MITIGATION KA KADAM KAISE CHUNTE HO</span>
      <span>Teen kasautiyan: <b>chhota</b> ho · <b>turant palat</b> sake · <b>naya khatra</b>
        na laaye. Isiliye flag band karna &gt; naya code deploy karna &gt; upgrade karna.
        Roblox ne streaming flag band kiya; BoltDB ka fix Q1 2022 tak rakha.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill acc">✍️ ACHHA ACTION ITEM</span>
      <span>Ek <b>naam wali kadi</b> todta hai — "row-count bound lagao taaki kharab file
        ban hi na sake". Bura action item ek <b>iraada</b> hai — "aur alerts lagayenge".</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">👑 TRACK KA SABSE DOHRAYA GAYA SABAK</span>
      <span>Emergency ka raasta girne wale system se <b>alag</b> ho. Cloudflare 2019
        (apne tools), Roblox 2021 (telemetry Consul par — 46 ghante andhera),
        Slack 2021 (dashboards saturated network par) — teenon.</span>
    </div>`,
};

VISUALS['dropbox'] = {
  t: 'File storage & sync — bytes app server se guzarti hi nahi',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Proxy wala raasta</span>
        <div class="dg-cap">Client → <b>App Server</b> → S3
          <br>har byte <b>do baar</b> chalti hai
          <br>app servers bandwidth ke liye khareede jaate hain
          <br>50 GB ki ek file poora server bhar deti hai</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Presigned URL</span>
        <div class="dg-cap">Client → App Server: "upload karna hai"
          <br>App Server → Client: <b>presigned URL</b>
          <br>Client → S3 <b>seedha</b>
          <br>S3 → App Server: notification → metadata update</div>
      </div>
    </div>
    <div class="dg-cap">App server ka kaam <b>ijazat dena</b> hai, <b>bytes dhona</b> nahi.
      Aur presigned URL ki expiry <b>minute</b> mein rakho — woh ek bearer token hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">🧩 chunking + fingerprint</span><span class="dg-arrow">=</span>
      <span class="dg-pill good">resumable</span><span class="dg-arrow">+</span>
      <span class="dg-pill good">dedup</span><span class="dg-arrow">+</span>
      <span class="dg-pill good">parallel</span>
    </div>
    <div class="dg-cap">Ek faisla, teen problem hal. Yeh un kam faislon mein se hai jahan
      "aur kuch nahi karna pada" sach mein hota hai.</div>

    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">✂️</span><span class="cmd">Fixed-size (har 5 MB par kaato)</span><span class="q">file ke SHURU mein ek byte joda → saare boundaries khisak gaye → <b>poori file dobara</b></span></div>
      <div class="dg-rung g"><span class="lv">🌊</span><span class="cmd">Content-defined (rolling hash)</span><span class="q">wahi ek byte → sirf <b>aas-paas ke</b> chunks badle → 2 GB ki jagah ~10 MB</span></div>
    </div>

    <div class="dg-legend">
      <span class="dg-pill gold">🔄 SYNC = PUSH + POLL, DONO</span>
      <span><b>Push</b> latency deta hai, <b>poll</b> guarantee deta hai. Websocket toot-ta hai
        (laptop band, network badla, phone sleep) aur us dauraan ka change hamesha ke liye
        chhoot jaata hai. "Kabhi-kabhi ek file sync nahi hoti" wale bug sirf-push design se aate hain.</span>
    </div>`,
};

VISUALS['crawler'] = {
  t: 'Web crawler — bottleneck coordination hai, capacity nahi',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">10 arab pages</span><span class="dg-arrow">÷</span>
      <span class="dg-pill">3,750 pages/sec/machine</span><span class="dg-arrow">÷</span>
      <span class="dg-pill">5 din</span><span class="dg-arrow">=</span>
      <span class="dg-pill gold">~8 machines</span>
    </div>
    <div class="dg-cap">Sirf 8 machines — aur yahi is problem ka asli sabak hai. Crawler ka
      bottleneck <b>bandwidth ya CPU nahi</b> hai. Bottleneck <b>politeness</b> aur <b>DNS</b>
      hai, yaani <b>coordination</b>, capacity nahi.</div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill bad">🚦 POLITENESS QUEUE KA KAAM HAI, WORKER KA NAHI</span>
      <span>500 workers × "main 1 req/sec bhejta hoon" = <b>500 req/sec</b> ek hi domain par.
        Global shart ke liye shared jagah chahiye: per-domain lock (Redis) + message ko
        delay karke wapas queue mein daalna.</span>
    </div>

    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🔗 URL dedup</span>
        <div class="dg-cap">"yeh URL pehle crawl hua?"
          <br>queue mein daalne se <b>pehle</b>
          <br>normalize → hash → bloom/index</div>
      </div>
      <div class="dg-box is-accent"><span class="bx-label">📄 Content dedup</span>
        <div class="dg-cap">"yeh PAGE pehle dekha?"
          <br>fetch karne ke <b>baad</b>
          <br>content hash / simhash
          <br><small>ek hi content darjan URLs par: tracking params, session ids, mirrors</small></div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">🌐</span><span class="cmd">DNS — scale par <b>70% tak</b> waqt</span><span class="q">har naya domain ek network round trip</span></div>
      <div class="dg-rung g"><span class="lv">💾</span><span class="cmd">Local DNS cache + kai providers + connection reuse</span><span class="q">thanda: DNS+TCP+TLS+request · warm: sirf request</span></div>
      <div class="dg-rung"><span class="lv">🕳️</span><span class="cmd">Max depth 15-20 hop + per-domain page budget</span><span class="q">calendar aur faceted search anant hote hain — aur robots.txt mein <b>allowed</b> bhi</span></div>
    </div>`,
};

VISUALS['blast'] = {
  t: 'Blast radius & cells — shuffle sharding ka ganit',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">ek bada fleet = 100%</span><span class="dg-arrow">→</span>
      <span class="dg-pill">10 cells = 10%</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">8 cells + shuffle = 3.6%</span>
    </div>
    <div class="dg-cap">Availability ka doosra sawaal: "kitni der" nahi, <b>"kitne users"</b>.
      Ek hi bade fleet par jawab hamesha <b>100%</b> hota hai — chahe kitne bhi replicas hon.</div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill gold">🎲 SHUFFLE SHARDING</span>
      <span>Har customer ko 8 mein se <b>koi bhi do</b> cells do. Poora outage tabhi jab
        <b>dono</b> cells kharab hon. C(8,2) = 28 → blast radius <b>3.6%</b>,
        bina ek bhi naya cell jode. Aur jinka ek cell gira, woh <b>degrade</b> hote hain,
        marte nahi.</span>
    </div>
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">8</span><span class="cmd">bina shuffle: 100/8 = <b>12.5%</b></span><span class="q">5% ke liye <b>20 cells</b> chahiye — 20 control planes</span></div>
      <div class="dg-rung g"><span class="lv">8</span><span class="cmd">shuffle K=2: 100/28 = <b>3.6%</b></span><span class="q">utne hi cells, ganit combinations ka hai</span></div>
      <div class="dg-rung g"><span class="lv">8</span><span class="cmd">shuffle K=3: 100/56 = <b>1.8%</b></span><span class="q">combinations tezi se badhte hain</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🪣 Cell gira — load kahan?</span>
        <div class="dg-cap"><b>Spare</b> — har cell mein 100/(N−1)% extra
          <br>(8 cells par ~14%)
          <br><b>Shed</b> — saaf 503 + Retry-After
          <br><br><small>"Dekh lenge" = pehla wala, bina plan ke —
          aur woh baaki cells ko bhi le doobta hai.</small></div>
      </div>
      <div class="dg-box is-bad"><span class="bx-label">🕳️ Blast radius ke leak</span>
        <div class="dg-cap">shared config store
          <br>shared auth service
          <br>global router (fail-static nahi)
          <br><b>ek saath saare cells par deploy</b>
          <br><br><small>Har component par ek sawaal: cell ke <b>ANDAR</b> hai
          ya cells ke <b>BEECH</b> mein?</small></div>
      </div>
    </div>
    <div class="dg-cap">Cells <b>zyada</b> operational kaam hain, kam nahi — aur seedhe-seedhe
      tez ya saste bhi nahi. Poora faayda ek hi jagah hai: <b>failure ka daayra</b>, aur uske
      saath har <b>release</b> ka blast radius bhi 1/N ho jaata hai.</div>`,
};

VISUALS['clocks'] = {
  t: 'Ghadiyan jhooth bolti hain — kaunsi ghadi kis kaam ke liye',
  html: `
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🕰️ Wall clock</span>
        <div class="dg-cap">"abhi kya samay hai"
          <br><b>peeche ja sakti hai</b> — NTP, leap second, admin
          <br>✅ logs, display, certificate expiry
          <br>❌ duration, timeout, rate limit</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">⏱️ Monotonic clock</span>
        <div class="dg-cap">"kitna samay <b>beeta</b>"
          <br><b>kabhi peeche nahi jaati</b>
          <br>✅ timeout, breaker, rate limiter, latency
          <br>❌ machines ke beech tulna ho hi nahi sakti</div>
      </div>
    </div>
    <div class="dg-cap">Sabse aam bug: duration naapne ke liye wall clock. NTP ghadi 200 ms
      peeche kare aur tumhara elapsed time <b>rinatmak</b> ho jaaye — phir har timeout,
      rate limiter aur breaker ka ganit toot jaata hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">1</span><span class="cmd">Negative duration</span><span class="q">end − start = −150 ms · timeout ka ganit toot gaya</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">2</span><span class="cmd">Lock do jagah</span><span class="q">A ki ghadi 5s aage → A samajhta hai lock khatam · <b>dono likhte hain</b></span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">3</span><span class="cmd">Last-write-wins se data loss</span><span class="q">jiski ghadi AAGE thi woh jeeta — chahe uska write pehle hua ho</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span class="dg-pill good">🔢 SAMAY KI JAGAH KRAM</span>
      <span><b>Lamport</b> — badhta counter (kaaran ka kram) &nbsp;·&nbsp;
        <b>Vector clock</b> — concurrent tha ya nirbhar, yeh batata hai &nbsp;·&nbsp;
        <b>HLC</b> — wall clock jaisa dikhta hai par kram ki guarantee deta hai (aaj ka aam chunav)</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill gold">🛰️ SPANNER KA TRUETIME</span>
      <span>Ghadi ko <b>sahi</b> karne ki koshish nahi ki — uski <b>galti naapi</b>.
        "Mujhe nahi pata abhi kya samay hai, par main <b>7 ms se zyada galat nahi hoon</b>" —
        aur commit us 7 ms ka intezaar karta hai.</span>
    </div>
    <div class="dg-legend">
      <span class="dg-pill bad">🔪 LOCK KA SAHI TAREEKA — FENCING TOKEN</span>
      <span>Har lock ke saath ek <b>badhta hua number</b>, aur <b>storage khud</b> purane
        number wale write ko reject karti hai. Ab ghadi kya kehti hai isse farak nahi padta.</span>
    </div>`,
};
