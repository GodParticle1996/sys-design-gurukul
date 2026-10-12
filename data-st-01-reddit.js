/* =====================================================================
   TRACK 9 — 🏢 Real Company Stories · Reddit

   Source: "How REDDIT Serves 4 BILLION Page Views a Month" (Akhil Sharma),
   Steve Huffman ke scaling talks, Reddit ka apna engineering blog aur
   open-sourced r2 codebase.

   4 levels:
     st-reddit-facts    — fact vs answer, thing/data model, shard by type
     st-reddit-rank     — vote = promise, hot formula, submission time
     st-reddit-cache    — listings, comment tree + Wilson, cache layers
     st-reddit-strangle — r2 monolith → GraphQL federation, baseplate

   ✍️ LIKHNE KA NIYAM (ADHD): "yeh / woh / uska / isse" ki jagah naam
   DOBARA likho. Har vaakya apne aap mein poora padha jaana chahiye.

   ⚠️ Poori file IIFE ke andar — data-flow.js top level par `const allOf`
   declare karti hai aur games.js `const el`.
   ===================================================================== */
(function () {

/* =====================================================================
   VISUALS
   ===================================================================== */
VISUALS['st-reddit-facts'] = {
  t: 'Reddit — ek taraf FACTS, doosri taraf ANSWERS',
  html: `
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">📌 FACT — user ne jo kiya</span>
        <div class="dg-node is-accent" data-hs="thing"><span class="ni">🧱</span><span class="nl">thing table</span><span class="ns">id · ups · downs · created · deleted</span></div>
        <div class="dg-node" data-hs="data"><span class="ni">🗂️</span><span class="nl">data table</span><span class="ns">(thing_id, key, value) — title, url, author</span></div>
        <div class="dg-cap">Chhota · turant likho · <b>bilkul sahi</b> hona chahiye.
          Comment kho gaya toh user ko pata chal jaata hai.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">🖼️ ANSWER — site jo dikhati hai</span>
        <div class="dg-node is-good" data-hs="listing"><span class="ni">📜</span><span class="nl">hot listing</span><span class="ns">sorted thing-ids · Cassandra permacache</span></div>
        <div class="dg-node is-good" data-hs="tree"><span class="ni">🌳</span><span class="nl">comment tree</span><span class="ns">pehle se joda hua · Cassandra</span></div>
        <div class="dg-cap">Mehenga banta hai · baar-baar padha jaata hai ·
          <b>bilkul sahi hone ki zaroorat nahi</b> — bas <b>taiyar</b> hona chahiye.</div>
      </div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill acc">🗳️ vote aaya</span><span class="dg-arrow">→</span>
      <span class="dg-pill">📝 fact likha (sync)</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="queue">📮 RabbitMQ job</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="worker">⚙️ worker ~20 answers repair</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">✅ agla reader ready answer</span>
    </div>
    <div class="dg-cap"><b>Record now, repair later.</b> User ka intezaar sirf fact likhne
      tak hai. Score, listings, karma aur caches baad mein theek hote hain.</div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span><i class="dg-dot" style="background:var(--accent)"></i> links cluster</span>
      <span><i class="dg-dot" style="background:var(--good)"></i> comments cluster</span>
      <span><i class="dg-dot" style="background:var(--gold)"></i> votes cluster (sabse zyada volume)</span>
    </div>
    <div class="dg-cap">Reddit ka niyam: <b>types ke beech koi JOIN nahi</b>. Jab koi join
      nahi hai toh har type apne alag database cluster par ja sakta hai.</div>`,
};

VISUALS['st-reddit-rank'] = {
  t: 'hot rank = log10(score) + t_submitted / 45000',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc">log10(score)</span>
      <span class="dg-arrow">+</span>
      <span class="dg-pill gold">t_submitted / 45000</span>
      <span class="dg-arrow">=</span>
      <span class="dg-pill good">hot rank (store kar do)</span>
    </div>
    <div class="dg-cap">45,000 second = <b>12.5 ghante</b>. Yahi vote aur waqt ke beech ka
      "exchange rate" hai: score ka <b>×10</b> hona utna hi upar uthata hai jitna post ka
      12.5 ghante <b>naya</b> hona.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">10 vote</span><span class="cmd">log10 = 1.0</span><span class="q">shuruaati votes hi post ki disha tay karte hain</span></div>
      <div class="dg-rung"><span class="lv">100 vote</span><span class="cmd">log10 = 2.0</span><span class="q">+1 poora = 12.5 ghante ki jawani</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">1,000 vote</span><span class="cmd">log10 = 3.0</span><span class="q">1001va vote sirf ~20 second ke barabar</span></div>
      <div class="dg-rung g"><span class="lv">t_submitted</span><span class="cmd">post ka janam-samay</span><span class="q">ghadi chalne se rank NAHI badalta — isliye stored answer sadta nahi</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Reddit — submission time</span>
        <div class="dg-cap">Rank sirf tab badalta hai jab <b>vote</b> aata hai.
          Ek vote = ek worker job = list mein ek post ki jagah badalna.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">❌ Agar current time hota (Hacker News style)</span>
        <div class="dg-cap">Har second har post ka rank badal jaata. Koi stored listing
          seconds se zyada sahi nahi rehti — matlab har request par dobara banao.</div></div>
    </div>`,
};

VISUALS['st-reddit-cache'] = {
  t: 'Reddit ka read path — cache hi architecture hai',
  html: `
    <div class="dg-flow">
      <span class="dg-pill good" data-hs="cdn">🌍 CDN (logged-out pages)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="mcrouter">🔀 mcrouter</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="permacache">📜 permacache</span>
      <span class="dg-pill" data-hs="stale">🕰️ stale copies</span>
      <span class="dg-pill" data-hs="lockcache">🔒 lock cache</span>
      <span class="dg-arrow">→</span>
      <span class="dg-pill bad" data-hs="pg">🐘 Postgres (last resort)</span>
    </div>
    <div class="dg-cap">Request ke Postgres tak pahunchne se pehle usko kam se kam
      teen jagah rukne ka mauka milta hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-box is-good"><span class="bx-label">🚫 Negative cache</span>
        <div class="dg-cap">"Kya is user ne vote kiya?" ka <b>NAHI</b> bhi cache hota hai.
          Isse "nahi" utna hi sasta ho jaata hai jitna "haan".</div></div>
      <div class="dg-box is-gold"><span class="bx-label">🕰️ Stale on purpose</span>
        <div class="dg-cap">Downstream slow hai? Purani copy do.
          <b>Purana par turant</b> &gt; <b>taza par band</b>.</div></div>
      <div class="dg-box is-accent"><span class="bx-label">🔒 Stampede lock</span>
        <div class="dg-cap">10,000 request, ek lock, ek rebuild.
          Baaki sab ya to thoda rukte hain ya stale copy le jaate hain.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">listing</span><span class="cmd">sorted thing-ids ki stored list</span><span class="q">worker list kholta hai, post ki jagah badalta hai, list wapas likhta hai</span></div>
      <div class="dg-rung"><span class="lv">~15</span><span class="cmd">sort orders per subreddit</span><span class="q">hot · new · top · top-week · top-year · controversial …</span></div>
      <div class="dg-rung g"><span class="lv">~1000</span><span class="cmd">entries ka hard cap</span><span class="q">bounded answer = bounded storage aur bounded repair cost</span></div>
    </div>`,
};

VISUALS['st-reddit-strangle'] = {
  t: 'r2 monolith ko GraphQL ke peechhe se ghera gaya',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc">📱 app</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold" data-hs="super">🕸️ GraphQL supergraph</span>
      <span class="dg-arrow">→</span>
      <span class="dg-pill bad" data-hs="r2">🐍 r2 monolith (ghat raha hai)</span>
      <span class="dg-pill good" data-hs="sub">🐹 Go subgraphs (badh rahe hain)</span>
    </div>
    <div class="dg-cap">Client ko ek hi API dikhti hai. Kaun sa field kahan se aaya —
      supergraph decide karta hai. Isi liye migration client ko dikhti hi nahi.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Aasan hissa — request move karna</span>
        <div class="dg-cap">Ek field ka owner badal do. Federation spec mein traffic
          shifting thi hi nahi, isliye Reddit ne khud 1% → 100% wali layer banayi.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">🪤 Mushkil hissa — data ka owner</span>
        <div class="dg-cap">Naya Go service agar usi Postgres/Cassandra ko padhta hai
          toh coupling khatam nahi hui — coupling sirf <b>application layer se
          database layer par</b> chali gayi.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-box is-accent"><span class="bx-label">🧰 baseplate</span>
        <div class="dg-cap">Har service ka same dhaancha: Postgres, Cassandra, memcached
          aur queues ki wahi wiring, wahi observability. 100 ek jaise services chalana
          aasan hai; 100 alag-alag services chalana narak hai.</div></div>
    </div>`,
};

/* =====================================================================
   LEVEL 1 — FACTS vs ANSWERS
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-reddit-facts',
  icon: '📌',
  title: 'Reddit — Facts aur Answers ka batwara',
  badge: 'Fact Munshi',
  objectives: [
    '<b>1% rule</b> — kaun likhta hai, kaun vote karta hai, kaun sirf padhta hai',
    'Ek <b>fact</b> aur ek <b>answer</b> mein farq, aur dono ka alag standard',
    '<b>Record now, repair later</b> — user ka intezaar kitna chhota rakha jaaye',
    'thing + data model: schema badle bina naya feature, aur uski keemat',
  ],
  lesson: [
    `<h3>🏢 Jan 2011 — 12 engineers, 1 arab se zyada page views ek mahine mein</h3>
     <p>Reddit ki team ek table ke aas-paas baith jaati thi. Us team ne sabse pehle
     apna <b>traffic</b> dekha, architecture baad mein socha. Traffic ka aakaar
     triangle jaisa tha:</p>
     <pre>~1%   log post/comment likhte hain      ← naye FACTS yahan bante hain
~9%   log vote karte hain                ← yahan bhi FACTS bante hain
~90%  log sirf padhte hain               ← inko ANSWERS chahiye, turant</pre>
     <p>Is triangle se Reddit ne ek batwara nikala jise poori architecture follow
     karti hai:</p>
     <table>
       <tr><th></th><th>FACT</th><th>ANSWER</th></tr>
       <tr><td>Kya hai</td><td>User ne jo kiya — post, comment, vote</td><td>Site jo dikhati hai — hot listing, comment tree, karma</td></tr>
       <tr><td>Likhne ka kharcha</td><td>Chhota</td><td>Bada</td></tr>
       <tr><td>Kitni baar padha jaata hai</td><td>Kam</td><td>Lagatar</td></tr>
       <tr><td>Kitna sahi hona chahiye</td><td><b>Bilkul sahi</b> — comment kho gaya toh user ko pata chal jaayega</td><td><b>Taiyar hona</b> zaroori hai, perfect hona nahi</td></tr>
     </table>
     <p class="tip">🎯 Steve Huffman ka line: <b>"key to speed is to precompute
     everything and cache it."</b> Reddit ka faisla — disk aur memory barbaad karna
     theek hai, <b>reader ka waqt barbaad karna nahi</b>.</p>`,
    `<h3>📮 Record now, repair later</h3>
     <p>Jab tum upvote dabate ho, Reddit sirf ek kaam <b>tumhare saamne</b> karta hai:
     vote ka fact likh deta hai. Uske baad ek job RabbitMQ par chala jaata hai aur
     control turant browser ko wapas mil jaata hai.</p>
     <p>Background worker phir un sab answers ko theek karta hai jo us vote se badle:
     post ka score, hot listing mein uski jagah, top-of-week, controversial,
     author ka karma, aur kai cached pages. Steve Huffman ka andaza tha —
     <b>ek vote se lagbhag 20 updates</b>.</p>
     <p>Ek detail jo log miss karte hain: Reddit ne <b>ek badi queue nahi</b> banayi.
     Alag-alag kaam ki alag queues banayin — votes, listings, karma+cache. Jab
     queues alag hain, do workers ek hi popular post par kam takrate hain, yaani
     lock contention kam.</p>
     <h3>⚖️ Yeh sauda kab kaam karta hai, kab ulta padta hai</h3>
     <pre>reads &gt;&gt;&gt; writes   →  1 vote ka 20 writes ban jaana SASTA hai
                     (kyunki uske baad lakhon reads lagbhag muft ho jaate hain)

writes ≈ reads     →  har user action 20 database writes mein phatta hai
                     aur yahi architecture tumhare khilaf kaam karne lagti hai</pre>
     <p class="tip">🎯 Precompute koi "best practice" nahi hai — yeh ek <b>ratio ka
     faisla</b> hai. Pehle read/write ratio nikalo, phir tay karo.</p>`,
    `<h3>🧱 thing + data — schema jise kabhi badalna hi na pade</h3>
     <p>Reddit ke har object ke liye do tables the:</p>
     <pre>thing table   id · ups · downs · created · deleted        ← jin par SORT/FILTER hota hai
data  table   (thing_id, key, value)                     ← title, url, author, subreddit …</pre>
     <p>Kyun? 2010 ke aas-paas bade Postgres table par <code>ALTER TABLE</code> poori
     table lock kar deta tha, aur Reddit har hafte naye features de raha tha. Toh
     Reddit ne aisa model banaya jisme naya attribute jodna = <b>data table mein
     ek nayi key likhna</b>, migration bilkul nahi.</p>
     <p>Keemat turant dikhi: id se uthana aasan raha, par kisi attribute par
     <b>filter ya sort</b> karna mehenga ho gaya — woh value ek row ke andar
     chhupi hai, column nahi hai. Isliye Reddit ne samjhauta kiya: <b>jin fields
     par sort hota hai (score, hot, controversy, created) unhe wapas thing table
     ke indexed columns bana diya</b>. Baaki sab schemaless rehne diya.</p>
     <h3>🔪 "Types ke beech koi JOIN nahi"</h3>
     <p>Reddit ne shuru mein hi ek niyam le liya: application kabhi database se
     link-to-comment-to-vote join nahi maangegi. Jab koi join hi nahi hai, tab
     har type apne alag cluster par ja sakta hai — links ek jagah, comments doosri
     jagah, aur <b>votes</b> (sabse zyada volume) apne cluster par.</p>
     <p class="tip">🎯 Zyadatar companies user ya tenant se shard karti hain (Jira,
     Slack). Reddit ne <b>type</b> se shard kiya — aur woh sirf isliye mumkin tha
     kyunki no-join niyam pehle se tha.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Fact ya Answer?',
      instructions: 'Har cheez ko sahi dabbe mein daalo. Yaad rakho — fact user ne banaya, answer site ne banaya.',
      bins: [
        { id: 'fact', label: '📌 FACT — turant, exact' },
        { id: 'answer', label: '🖼️ ANSWER — pehle se banao, thoda purana chalega' },
      ],
      items: [
        { text: 'User ne ek comment likha', bin: 'fact', explain: 'Comment user ka banaya hua hai. Kho gaya toh user ko turant pata chalega — isliye exact aur synchronous.' },
        { text: 'r/programming ka "hot" listing', bin: 'answer', explain: 'Listing ek banaya hua jawab hai. Do second purani listing se kisi ko farq nahi padta.' },
        { text: 'Kisi post par ek upvote ki row', bin: 'fact', explain: 'Vote ek ghatna hai jo hui. Reddit ise turant likhta hai — baaki sab baad mein.' },
        { text: 'Author ka karma number', bin: 'answer', explain: 'Karma facts se nikaala gaya jawab hai. Background worker isko theek karta hai.' },
        { text: 'Ek thread ka poora comment tree', bin: 'answer', explain: 'Tree ko har reader ke liye live banana bahut mehenga hai — isliye pehle se joda jaata hai aur Cassandra mein rehta hai.' },
        { text: 'Naya account ban-na', bin: 'fact', explain: 'Account banana ek ghatna hai, aur woh bilkul sahi likhni hai.' },
        { text: 'Screen par dikhne wala (thoda fuzzed) score', bin: 'answer', explain: 'Reddit jaan-boojh kar dikhne wale score mein halka shor milata tha, taaki vote manipulation karne wale apna asar na naap sakein. Andar ka score exact, bahar ka score "kareeb".' },
        { text: 'Kisi post ka title aur URL', bin: 'fact', explain: 'Title aur URL user ne diye — data table mein key-value ban ke seedhe likh diye jaate hain.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Diagram par ungli rakho',
      visual: 'st-reddit-facts',
      questions: [
        { q: 'Post ka title aur URL kahan store hote hain?', target: 'data', explain: 'data table mein — (thing_id, key, value) rows ke roop mein. Isi liye naya attribute jodne ke liye migration nahi chahiye.' },
        { q: 'Score aur created_at jaise SORT wale fields kahan wapas laaye gaye?', target: 'thing', explain: 'thing table mein indexed columns ban ke. Schemaless flexibility wahin tak rakhi gayi jahan sort nahi karna tha.' },
        { q: 'Vote likhne ke baad mehenga kaam kiske haath mein jaata hai?', target: 'worker', explain: 'Background worker ke. User ko wait sirf fact likhne ka karaya jaata hai.' },
        { q: 'User ka browser kis cheez ka intezaar NAHI karta?', target: 'queue', explain: 'Queue par pada job. Job enqueue hua aur control turant browser ko wapas.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Precompute ka ganit — kab faayda, kab ghaata',
      instructions: 'Teen knob ghumao. Read/write ratio badlo aur dekho precompute kab jeetta hai.',
      goal: 'Aisi setting dhoondho jahan read p99 <b>50 ms se kam</b> ho AUR roz ka CPU kharcha <b>1,00,000 CPU-second se kam</b> ho.',
      scenario: `Roz <b>10 lakh vote</b> aate hain. Har vote kai answers ko galat kar
        deta hai (score, hot list, top-week, controversial, karma, caches). Tumhe
        tay karna hai: answer <b>vote ke waqt</b> banega (precompute) ya
        <b>read ke waqt</b> (on-read)?`,
      knobs: [
        { id: 'reads', label: 'Har vote par kitne reads', min: 1, max: 100, step: 1, value: 40, unit: '×',
          note: 'Reddit par yeh number bahut bada tha — 90% log sirf padhte hain.' },
        { id: 'fanout', label: 'Ek vote se kitne answers bigadte hain', min: 4, max: 40, step: 4, value: 20, unit: '',
          note: 'Steve Huffman ka andaza: lagbhag 20.' },
        { id: 'mode', label: 'Tareeka (0 = read par banao · 1 = pehle se banao)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: '0 = on-read rebuild · 1 = record now, repair later.' },
      ],
      readouts: k => {
        const m = redditWorkModel(k);
        return [
          { label: 'Read p99', value: m.p99 + ' ms', tone: m.p99 <= 50 ? 'ok' : m.p99 <= 120 ? 'warn' : 'bad' },
          { label: 'CPU kharcha / din', value: Math.round(m.cpu).toLocaleString('en-IN') + ' s', tone: m.cpu <= 100000 ? 'ok' : m.cpu <= 400000 ? 'warn' : 'bad' },
          { label: '1 vote = kitne writes', value: m.writes + '', tone: m.writes <= 20 ? 'ok' : 'warn' },
          { label: 'Roz ke reads', value: (m.reads / 1e6).toFixed(1) + ' crore', tone: 'ok' },
        ];
      },
      bars: k => {
        const m = redditWorkModel(k);
        return [
          { label: 'Read p99', pct: Math.min(100, (m.p99 / 300) * 100), text: m.p99 + ' ms', tone: m.p99 <= 50 ? 'ok' : 'bad' },
          { label: 'CPU / din', pct: Math.min(100, (m.cpu / 600000) * 100), text: Math.round(m.cpu / 1000) + 'k s', tone: m.cpu <= 100000 ? 'ok' : 'bad' },
          { label: 'Write amplification', pct: Math.min(100, (m.writes / 40) * 100), text: m.writes + '× per vote', tone: m.writes <= 20 ? 'ok' : 'warn' },
        ];
      },
      verdict: k => {
        const m = redditWorkModel(k);
        if (k.mode === 0 && m.p99 > 50) return { ok: false, text: `On-read mode mein har reader khud listing banata hai — read p99 <b>${m.p99} ms</b>. Reddit ka 90% traffic yahi reader hai, isliye yeh raasta bandh hai.` };
        if (m.cpu > 100000 && k.mode === 1) return { ok: false, text: `Precompute on hai, par kharcha <b>${Math.round(m.cpu).toLocaleString('en-IN')} CPU-second</b> hai. Ya to fan-out ${k.fanout} bahut bada hai, ya reads (${k.reads}×) itne kam hain ki har vote par 20 writes karna ghaate ka sauda ban gaya.` };
        if (m.cpu > 100000) return { ok: false, text: `Kharcha bahut zyada: <b>${Math.round(m.cpu).toLocaleString('en-IN')} CPU-second</b> roz.` };
        return { ok: true, text: `Ho gaya. Reads <b>${k.reads}×</b> hain, fan-out <b>${k.fanout}</b>, aur answers pehle se bane hue hain — read p99 <b>${m.p99} ms</b>, kharcha <b>${Math.round(m.cpu).toLocaleString('en-IN')} CPU-second</b>. Yahi Reddit ka sauda hai: rare write par thoda zyada kaam, taaki lakhon reads lagbhag muft ho jaayein.` };
      },
      check: k => { const m = redditWorkModel(k); return m.p99 <= 50 && m.cpu <= 100000; },
      lesson: `Precompute tab jeetta hai jab <b>reads writes se bahut zyada</b> hon.
        Jahan writes reads ke barabar aa jaayein, wahan 1 vote = 20 writes wala
        model ulta pad jaata hai. Isiliye faisla "best practice" se nahi,
        <b>apne ratio</b> se lo.`,
      quiz: {
        q: 'Ek naya product hai jahan har user din mein 30 baar likhta hai aur sirf 2 baar padhta hai. Reddit wala precompute model kaisa rahega?',
        choices: [
          'Bura — har write 20 updates mein phategi aur reads itne hain hi nahi ki woh kharcha wasool ho',
          'Achha — precompute hamesha reads tez karta hai',
          'Farq nahi padta, dono ek jaise hain',
          'Achha, bas queue thodi badi kar do',
        ],
        answer: 0,
        explain: 'Precompute ek exchange hai: write par extra kaam karo taaki read muft ho. Jab reads hi kam hain, exchange ghaate ka hai.',
      },
    },
    {
      type: 'quiz',
      title: 'thing/data model aur no-join niyam',
      questions: [
        {
          q: 'Reddit ne thing + data model kyun banaya tha?',
          choices: [
            'Kyunki bade Postgres table par ALTER TABLE lock leta tha aur Reddit lagatar naye features de raha tha',
            'Kyunki key-value store SQL se hamesha tez hota hai',
            'Kyunki Postgres mein JOIN kaam nahi karta',
            'Kyunki disk bachana tha',
          ],
          answer: 0,
          explain: 'Model ka maqsad tha: naya attribute jodne ke liye migration na karni pade. 2010 ke Postgres mein bade table ka schema change poori table rok deta tha.',
        },
        {
          q: 'Us model ki sabse badi keemat kya thi?',
          choices: [
            'Kisi attribute par filter/sort karna mehenga ho gaya — value row ke andar chhupi thi, column nahi thi',
            'Data kho jaata tha',
            'Writes slow ho gaye',
            'Comment tree nahi ban sakta tha',
          ],
          answer: 0,
          explain: 'Id se uthana sasta raha, par "sabse zyada score wale posts dikhao" mehenga ho gaya. Isiliye sort wale fields wapas thing table ke indexed columns bane.',
        },
        {
          q: '"Types ke beech koi JOIN nahi" niyam ne kya unlock kiya?',
          choices: [
            'Har type apne alag database cluster par ja saka — links, comments, aur votes alag-alag',
            'Query planner tez ho gaya',
            'Cassandra ki zaroorat khatam ho gayi',
            'Schema migrations aasan ho gaye',
          ],
          answer: 0,
          explain: 'Join hota toh clusters ko ek doosre se baat karni padti. Join hai hi nahi, isliye type se sharding mumkin hua — aur votes, jinka volume sabse zyada tha, ko apna cluster mil gaya.',
        },
        {
          q: 'Dikhne wala score jaan-boojh kar thoda fuzzed kyun rakha gaya tha?',
          choices: [
            'Taaki vote manipulation karne wale apne votes ka asar naap na sakein',
            'Taaki database ka load kam ho',
            'Taaki cache invalidation na karni pade',
            'Taaki ranking formula chhupi rahe',
          ],
          answer: 0,
          explain: 'Ek hi fact ke do jawab, do alag standards: ranking wala score exact (warna order galat ho jaayega), screen wala score sirf "kareeb".',
        },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — fact likho, answer baad mein theek karo',
      project: '01-reddit',
      exercise: 'ex1-facts-answers',
      goal: 'Ek vote API ko do tareeke se chalao — sync rebuild aur queue + worker — aur p99 ka farq apni aankh se dekho.',
      why: `Lab mein do modes hain. <code>MODE=sync</code> vote aate hi saare 20 answers
        khud theek karta hai aur uske BAAD jawab deta hai. <code>MODE=async</code> sirf
        fact likhta hai, job queue par daalta hai aur turant jawab deta hai.`,
      steps: [
        { text: 'Lab folder mein jao.', cmd: 'cd docker-labs/01-reddit' },
        { text: 'Sync mode chalao (Docker ho to compose profile, warna npm).', cmd: 'npm start ex1-facts-answers', expect: 'ex1-facts-answers\n  vote-service   → http://localhost:4101  (MODE=sync)' },
        { text: 'Doosre terminal mein load tool chalao aur p50/p99 note karo.', cmd: 'node tools/vote-load.js --votes 150 --rate 25 --readers 10', expect: 'MODE=sync   vote p99: 24 ms   vote p50: 15 ms   read p99: 51 ms   answers repaired: 3000   queue peak: 0' },
        { text: 'Ab async mode chalao.', cmd: 'MODE=async npm start ex1-facts-answers', expect: 'ex1-facts-answers\n  vote-service   → http://localhost:4101  (MODE=async)' },
        { text: 'Wahi load dobara chalao aur dono ke numbers compare karo.', cmd: 'node tools/vote-load.js --votes 150 --rate 25 --readers 10', expect: 'MODE=async  vote p99: 6 ms   vote p50: 3 ms   read p99: 80 ms   answers repaired: 3000   queue peak: 20   drain: 0.0 s' },
      ],
      observe: {
        q: 'Async mode mein vote ka p50 15 ms se 3 ms par aa gaya, par dono modes mein 3000 answers repair hue. Kaam kahan gaya?',
        choices: [
          'Kaam khatam nahi hua — wahi 20 updates ab worker background mein kar raha hai, user ke jaane ke baad',
          'Kaam khatam ho gaya, async mode updates skip kar deta hai',
          'Database tez ho gaya kyunki queue use hui',
          'Reads ne kaam apne upar le liya',
        ],
        answer: 0,
        explain: 'Tool dono modes mein 3000 repairs ginta hai. Farq sirf itna hai ki kaun intezaar karta hai — async mein user nahi, worker karta hai.',
      },
      lesson: 'Async ka matlab "kam kaam" nahi hota. Async ka matlab hai <b>kaam ka waqt badal dena</b> — user ke saamne se hata kar background mein.',
    },
  ],
  interview: {
    title: 'Interview Round — read-heavy system',
    instructions: 'Teen sawaal. Har jawab mein "kyun" bhi socho. 🎤',
    questions: [
      {
        q: 'Interviewer: "Tumhare feed ka p99 800 ms hai kyunki har request par ranking calculate hoti hai. Pehla kadam?"',
        choices: [
          'Ranking ko write ke waqt calculate karke store karo, aur har naye event par usi stored answer ko repair karo',
          'Server bade kar do',
          'Har request par calculate karo par 5 second ka cache laga do',
          'Ranking formula simple kar do',
        ],
        answer: 0,
        explain: 'Yahi Reddit ka core move hai: answer ko read ke waqt banane ke bajaye write ke waqt banao aur maintain karo. Cache madad karta hai par pehle sawaal yeh hai ki jawab banta kab hai.',
      },
      {
        q: 'Interviewer: "Ek hi fact ke do alag jawab kab theek hai?"',
        choices: [
          'Jab dono jawabon ka correctness standard alag ho — jaise ranking ka score exact aur screen par dikhta score sirf kareeb',
          'Kabhi theek nahi, data hamesha ek hi hona chahiye',
          'Sirf tab jab do teams alag ho',
          'Sirf analytics mein',
        ],
        answer: 0,
        explain: 'Reddit internal score exact rakhta tha (ranking usi par tiki thi) aur bahar fuzzed dikhata tha. Pehle poochho: is jawab ko kitna sahi hona hai?',
      },
      {
        q: 'Interviewer: "Tum queue ko kai chhoti queues mein kyun baantoge?"',
        choices: [
          'Taaki alag-alag kaam ke workers ek hi hot row par lock ke liye na ladein',
          'Taaki messages jaldi delete ho',
          'Kyunki ek queue ki size limit hoti hai',
          'Taaki ordering guarantee mil jaaye',
        ],
        answer: 0,
        explain: 'Reddit ne votes, listings aur karma/cache ki alag queues rakhin. Alag queues = ek popular post par takrav kam.',
      },
    ],
  },
  success: [
    'Main kisi bhi feature ko fact aur answer mein todd sakta hoon',
    'Main read/write ratio dekh kar bata sakta hoon ki precompute faayde ka hai ya ghaate ka',
    'Main schemaless model ki flexibility aur uski query cost dono samjha sakta hoon',
  ],
  homework: `<p>Apne kisi bhi ek screen ko utha lo (dashboard, feed, profile page) aur
    ek kaagaz par do column banao: <b>FACT</b> aur <b>ANSWER</b>. Har cheez ko ek column
    mein daalo. Phir har ANSWER ke saamne likho: "yeh kitna purana ho sakta hai?" —
    1 second, 10 second, ya 5 minute. Jiske saamne "5 minute" likha hai, woh aaj se
    precompute hone layak hai.</p>`,
  cards: [
    { front: 'Fact aur Answer mein farq?', back: '<b>Fact</b> = user ne jo kiya (chhota, exact, sync). <b>Answer</b> = site jo dikhati hai (mehenga, baar-baar padha jaata, taza se zyada <b>taiyar</b> hona zaroori).' },
    { front: 'Reddit ka "record now, repair later" kya hai?', back: 'Vote aate hi sirf fact likho aur job queue par daalo; score, listings, karma aur caches background worker theek karta hai. Ek vote ≈ 20 updates.' },
    { front: 'Precompute kab ghaate ka sauda hai?', back: 'Jab writes reads ke barabar (ya zyada) hon. Precompute write par extra kaam karke read sasta karta hai — reads kam hon toh woh kaam wasool nahi hota.' },
    { front: 'thing + data model kyun bana?', back: 'Naye attribute ke liye migration na karni pade (2010 ka ALTER TABLE bade table ko lock karta tha). Keemat: attribute par filter/sort mehenga — isliye sort wale fields wapas indexed columns bane.' },
    { front: 'Reddit kis cheez se shard karta hai?', back: '<b>Type</b> se — links, comments aur votes alag clusters par. Yeh sirf isliye mumkin hua kyunki "types ke beech koi JOIN nahi" ka niyam pehle se tha.' },
  ],
},
]);

/* model — level 1 ka tradeoff lab */
function redditWorkModel(k) {
  const votes = 1e6;                       /* roz ke votes */
  const reads = votes * k.reads;
  if (k.mode === 1) {                      /* pehle se banao */
    const cpu = votes * k.fanout * 0.003   /* har repair 3 ms */
              + reads * 0.0005;            /* cache se serve 0.5 ms */
    return { cpu, p99: 18, writes: k.fanout, reads };
  }
  const cpu = votes * 0.001                /* vote likhna sasta */
            + reads * 0.025;               /* har read par rebuild 25 ms */
  return { cpu, p99: 240, writes: 1, reads };
}

/* =====================================================================
   LEVEL 2 — VOTE = PROMISE, aur hot rank ka ganit
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-reddit-rank',
  icon: '🗳️',
  title: 'Reddit — Rank jo sadta nahi',
  badge: 'Rank Ganitagya',
  objectives: [
    'hot rank formula: <b>log10(score) + t_submitted / 45000</b>',
    '45,000 second = 12.5 ghante — vote aur waqt ka exchange rate',
    'Submission time vs current time — ek choti si choice jisne poori architecture bachayi',
    'Kab tumhara stored answer apne aap purana ho jaata hai',
  ],
  lesson: [
    `<h3>🧮 Formula jo Reddit ne khud open source ki</h3>
     <pre>rank = log10(score) + t_submitted / 45000</pre>
     <p>Do hisse hain. Pehla hissa <b>popularity</b> hai (log10 par), doosra hissa
     <b>post kab submit hua</b> (Reddit ke apne epoch se seconds, 45,000 se bhaag).</p>
     <p>45,000 arbitrary number nahi hai. 45,000 second = <b>12.5 ghante</b>. Matlab:</p>
     <pre>score ×10 hona      ==  post ka 12.5 ghante NAYA hona
score ×100 hona     ==  post ka 25 ghante naya hona</pre>
     <p>Isiliye log kehte hain "Reddit par upvote time travel hai". Vote post ko
     waqt mein peechhe nahi le jaata, par ganit mein asar bilkul wahi hota hai.</p>
     <h3>📉 log10 ka doosra asar</h3>
     <p>Pehle 10 vote rank ko poora +1 dete hain. 1,000 vote wale post par ek aur
     vote rank ko lagbhag <b>20 second</b> ke barabar uthata hai. Yaani
     <b>shuruaati votes post ki disha tay karte hain</b>, baad ke votes lagbhag
     kuch nahi karte.</p>`,
    `<h3>⏰ Asli chaal: <code>t_submitted</code>, <code>now()</code> nahi</h3>
     <p>Formula mein jo waqt hai woh <b>post ka janam-samay</b> hai — aaj ka samay
     nahi. Is ek choice ka natija bahut bada hai:</p>
     <table>
       <tr><th>Reddit (submission time)</th><th>Agar current time hota</th></tr>
       <tr><td>Ghadi chalti rahe, rank <b>nahi</b> badalta</td><td>Har second har post ka rank badal jaata</td></tr>
       <tr><td>Rank sirf <b>vote</b> aane par recalculate hota hai</td><td>Har request par dobara calculate karna padta</td></tr>
       <tr><td>Stored listing mahino sahi rehti hai</td><td>Stored listing seconds mein purani</td></tr>
     </table>
     <p class="tip">🎯 Yahi is video ka sabse bada system-design sabak hai:
     <b>apna derived data aisa design karo ki woh pade-pade galat na ho jaaye</b>.
     Hacker News ka rank waqt ke saath decay karta hai — isiliye HN ko rebuild karna
     padta hai. Reddit ka nahi karta — isiliye Reddit maintain karta hai.</p>
     <h3>🆕 Naya post aaye toh?</h3>
     <p>Reddit intezaar nahi karta ki koi subreddit khole. Submit hote hi post ko
     har relevant listing mein uski jagah par daal diya jaata hai — hot, new, top,
     top-of-week, top-of-year, controversial… lagbhag <b>15 sort orders</b>.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — 45,000 ka matlab',
      goal: 'Formula ko apne haath se mehsoos karo. Order of magnitude sahi hona chahiye, exact number nahi.',
      problems: [
        {
          q: 'Reddit ka conversion factor 45,000 second hai. Yeh kitne GHANTE hue?',
          unit: 'ghante', given: ['45,000 second', '1 ghanta = 3,600 second'],
          answer: 12.5, tol: 0.3,
          steps: ['45,000 / 3,600 = 12.5', 'Yaani score ka ×10 hona = post ka 12.5 ghante naya hona'],
          lesson: 'Yeh ek "exchange rate" hai: ek taraf votes, doosri taraf ghante.',
        },
        {
          q: 'Ek post ka score 100 se 1,000 ho gaya. Rank mein yeh badhotri kitne SECOND ki freshness ke barabar hai?',
          unit: 'second', given: ['log10(1000) − log10(100) = 1', '1 rank point = 45,000 second'],
          answer: 45000, tol: 0.3,
          steps: ['log10(1000) = 3, log10(100) = 2 → farq 1', '1 × 45,000 = 45,000 second (12.5 ghante)'],
          lesson: 'log10 ke kaaran har ×10 barabar ek hi jump deta hai — 10→100 aur 100→1000 dono 12.5 ghante ke barabar.',
        },
        {
          q: '1,000 vote wale post par ek aur vote (1000 → 1001) rank ko kitne SECOND ke barabar uthata hai?',
          unit: 'second', given: ['log10(1001) − log10(1000) ≈ 0.00043', '1 rank point = 45,000 second'],
          answer: 19.5, tol: 0.5,
          steps: ['log10(1001) − log10(1000) ≈ 0.000434', '0.000434 × 45,000 ≈ 19.5 second'],
          lesson: 'Isiliye Reddit par "pehla ghanta" sab kuch hai — 1001va vote lagbhag bekaar hai.',
        },
      ],
    },
    {
      type: 'order',
      title: 'Ek vote ka safar — sahi kram lagao',
      instructions: 'Upvote dabne se lekar agle reader tak, kaam kis kram mein hota hai?',
      steps: [
        { text: 'Vote ka fact likha jaata hai (votes cluster mein ek row)', explain: 'Sirf yahi kaam user ke intezaar mein hota hai.' },
        { text: 'Ek job queue par daala jaata hai aur browser ko turant jawab milta hai', explain: 'Yahin par "record now" khatam aur "repair later" shuru hota hai.' },
        { text: 'Worker post ka naya hot rank nikalta hai: log10(score) + t_submitted/45000', explain: 'Rank sirf ab badla hai — kyunki score badla hai. Ghadi chalne se rank nahi badalta.' },
        { text: 'Worker stored listing kholta hai, post ko uski nayi jagah par le jaata hai, aur list wapas likh deta hai', explain: 'Listing dobara nahi banti — maintain hoti hai. Yeh farq hi poori architecture hai.' },
        { text: 'Author ka karma aur affected caches theek kiye jaate hain', explain: 'Ek vote ≈ 20 aise updates.' },
        { text: 'Agla reader page kholta hai aur pehle se taiyar listing usko mil jaati hai', explain: 'Reader ke waqt par kuch calculate nahi hua — jawab pehle se maujood tha.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Rank formula lab — decay kis cheez par ho',
      instructions: 'Formula badlo aur dekho ki stored listing kitni der sahi rehti hai.',
      goal: 'Aisi setting dhoondho jahan roz ka rebuild kaam <b>1 lakh se kam</b> ho, listing <b>90% se zyada</b> waqt sahi rahe, aur nayi post ko purani post se jeetne ka mauka mile (freshness weight 0 na ho).',
      scenario: `1 lakh active posts, roz 10 lakh votes. Tumhe tay karna hai ki rank
        formula <b>submission time</b> par chale ya <b>current time</b> par, aur
        freshness kitni strong ho.`,
      knobs: [
        { id: 'clock', label: 'Waqt ka source (0 = submission time · 1 = current time)', min: 0, max: 1, step: 1, value: 1, unit: '',
          note: 'Current time = rank har second badalta hai, stored answer sadne lagta hai.' },
        { id: 'fresh', label: 'Freshness ka weight (0 = sirf votes, 10 = bahut tez decay)', min: 0, max: 10, step: 1, value: 5, unit: '',
          note: '45,000 second wala factor is knob ka asli roop hai.' },
        { id: 'cap', label: 'Listing ka size cap', min: 100, max: 5000, step: 100, value: 5000, unit: ' entries',
          note: 'Bounded answer = bounded repair cost.' },
      ],
      readouts: k => {
        const m = rankModel(k);
        return [
          { label: 'Roz ka rebuild kaam', value: Math.round(m.work).toLocaleString('en-IN') + ' units', tone: m.work <= 100000 ? 'ok' : m.work <= 500000 ? 'warn' : 'bad' },
          { label: 'Stored listing sahi rehti hai', value: m.correct + '% waqt', tone: m.correct >= 90 ? 'ok' : m.correct >= 60 ? 'warn' : 'bad' },
          { label: 'Ek repair ka kharcha', value: m.perRepair + ' entries chhoo-ni padti', tone: m.perRepair <= 1000 ? 'ok' : 'warn' },
          { label: 'Nayi post ka mauka', value: k.fresh === 0 ? 'khatam — sirf purane hit chalenge' : 'theek hai', tone: k.fresh === 0 ? 'bad' : 'ok' },
        ];
      },
      bars: k => {
        const m = rankModel(k);
        return [
          { label: 'Rebuild kaam / din', pct: Math.min(100, (m.work / 2000000) * 100), text: Math.round(m.work / 1000) + 'k', tone: m.work <= 100000 ? 'ok' : 'bad' },
          { label: 'Listing sahi rehti hai', pct: m.correct, text: m.correct + '%', tone: m.correct >= 90 ? 'ok' : 'bad' },
          { label: 'Listing ka size', pct: Math.min(100, (k.cap / 5000) * 100), text: k.cap + ' entries', tone: k.cap <= 1000 ? 'ok' : 'warn' },
        ];
      },
      verdict: k => {
        const m = rankModel(k);
        if (k.clock === 1) return { ok: false, text: `Current time par rank tik nahi sakta: ghadi chalte hi har post ka rank badal jaata hai, isliye stored listing sirf <b>${m.correct}%</b> waqt sahi rehti hai aur roz <b>${Math.round(m.work).toLocaleString('en-IN')}</b> units ka rebuild lagta hai. Hacker News isi tarah kaam karta hai — aur isiliye HN rebuild karta hai, maintain nahi.` };
        if (k.fresh === 0) return { ok: false, text: 'Freshness weight 0 hai — ab sirf purane bade posts hi upar rahenge aur nayi post ko kabhi mauka nahi milega. Formula sasta zaroor hai par product mar jaayega.' };
        if (m.work > 100000) return { ok: false, text: `Kaam abhi bhi <b>${Math.round(m.work).toLocaleString('en-IN')}</b> units hai. Listing cap <b>${k.cap}</b> entries ka hai — har repair itni hi badi list chhoota hai. Reddit ne cap ~1000 rakha tha.` };
        return { ok: true, text: `Sahi. Submission time par rank tikta hai (listing <b>${m.correct}%</b> waqt sahi), freshness weight <b>${k.fresh}</b> nayi posts ko mauka deta hai, aur <b>${k.cap}</b> ka cap har repair ka kharcha bandha rakhta hai.` };
      },
      check: k => { const m = rankModel(k); return m.work <= 100000 && m.correct >= 90 && k.fresh > 0; },
      lesson: `Do niyam yaad rakho: (1) derived data ko aise design karo ki woh
        <b>pade-pade galat na ho</b> — warna tum use maintain nahi, rebuild karoge;
        (2) har stored answer ko ek <b>size cap</b> do, warna repair ka kharcha
        bina limit ke badhta jaayega.`,
      quiz: {
        q: 'Reddit purane version mein listing sirf ~1000 entries tak jaati thi. Iska asli kaaran?',
        choices: [
          'Stored answer ko bounded rakhna — bounded storage aur har repair ka bounded kharcha',
          'Pagination ka code likhna mushkil tha',
          'Cassandra 1000 se zyada rows nahi rakh sakta',
          'Users 1000 se aage scroll nahi karte the',
        ],
        answer: 0,
        explain: '"Listing ek product hai jiska spec hai" — spec mein upper bound daal do, toh storage bhi predictable aur repair bhi predictable.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — rank jo sadta hai vs rank jo tikta hai',
      project: '01-reddit',
      exercise: 'ex2-hot-rank',
      goal: 'Do ranking formula chala kar dekho: ek submission time par, doosra current time par. Kaun si stored listing sahi rehti hai?',
      why: `Service 2,000 posts rakhti hai aur ek stored "hot" listing maintain karti hai.
        <code>CLOCK=submitted</code> mein rank sirf vote par badalta hai;
        <code>CLOCK=now</code> mein har second badalta hai.`,
      steps: [
        { text: 'Submission-time wala mode chalao (lab mein 1 second = 1 simulated ghanta).', cmd: 'npm start ex2-hot-rank', expect: 'ex2-hot-rank\n  rank-service   → http://localhost:4102  (CLOCK=submitted · 1 second = 1 simulated ghanta)' },
        { text: 'Checker chalao — stored listing ko har 3 second par live ranking se compare karta hai. Koi vote NAHI bheja ja raha.', cmd: 'node tools/rank-check.js --for 12 --every 3', expect: 'CLOCK=submitted drift checks: 4   listings wrong: 0   worst positions wrong (top 25): 0   rebuilds needed: 0' },
        { text: 'Ab current-time wale mode par switch karo.', cmd: 'CLOCK=now npm start ex2-hot-rank', expect: 'ex2-hot-rank\n  rank-service   → http://localhost:4102  (CLOCK=now · 1 second = 1 simulated ghanta)' },
        { text: 'Wahi checker dobara chalao.', cmd: 'node tools/rank-check.js --for 12 --every 3', expect: 'CLOCK=now       drift checks: 4   listings wrong: 4   worst positions wrong (top 25): 22   rebuilds needed: 4' },
      ],
      observe: {
        q: 'CLOCK=now mein bina kisi naye vote ke bhi stored listing galat ho gayi. Kyun?',
        choices: [
          'Formula ka ek input (current time) apne aap badalta rehta hai, isliye stored answer bina kisi event ke purana ho jaata hai',
          'Service ne listing delete kar di',
          'Votes background mein aate rahe',
          'Cassandra ne data expire kar diya',
        ],
        answer: 0,
        explain: 'Stored answer tabhi tikta hai jab uske saare inputs sirf EVENTS par badlein. Ghadi ek aisa input hai jo bina kisi event ke badalta rehta hai.',
      },
      lesson: 'Derived data ka niyam: agar formula mein <b>now()</b> hai, toh tum us jawab ko store nahi kar sakte — sirf rebuild kar sakte ho.',
    },
  ],
  interview: {
    title: 'Interview Round — derived data',
    instructions: 'Do sawaal, dono "kab store karein" par. 🎤',
    questions: [
      {
        q: 'Interviewer: "Tumhare feed ka ranking score har 30 second par poori tarah rebuild hota hai. Kaise bachoge?"',
        choices: [
          'Formula se current time hatao — score ko sirf events (vote, view, purchase) par badalne do, phir score store karke maintain karo',
          'Rebuild ko 5 minute par le jao',
          'Rebuild ko GPU par chalao',
          'Score ko cache kar lo 30 second ke liye',
        ],
        answer: 0,
        explain: 'Cache aur bada interval dono sirf dard ko aage khiskate hain. Asli fix formula ke input badalna hai: waqt ki jagah event.',
      },
      {
        q: 'Interviewer: "Freshness chahiye par rebuild nahi chahiye. Kaise?"',
        choices: [
          'Freshness ko submission time ke roop mein score ke andar bake kar do — naya post shuru se hi upar hota hai, purane ko jeetne ke liye ×10 votes chahiye',
          'Har raat pura index rebuild kar lo',
          'Sirf pichhle 24 ghante ke post dikhao',
          'Freshness client side par calculate karo',
        ],
        answer: 0,
        explain: 'Reddit ne decay ko background job banane ke bajaye formula ke andar daal diya: naye post ko shuruaati advantage, purane ko upar rehne ke liye exponentially zyada votes.',
      },
    ],
  },
  success: [
    'Main bata sakta hoon ki koi derived value store karne layak hai ya nahi',
    'Main log10 + time-offset wali ranking ko samjha sakta hoon',
    'Main stored answer par size cap lagane ka kaaran bata sakta hoon',
  ],
  homework: `<p>Apne system ki koi ek derived value chuno (ranking, score, counter,
    leaderboard). Uske saare inputs likho. Ab har input ke saamne likho:
    "yeh kis EVENT par badalta hai?" Agar kisi input ke saamne "apne aap, waqt ke
    saath" likha hai — woh value store karne layak nahi hai jab tak formula badla
    na jaaye.</p>`,
  cards: [
    { front: 'Reddit ka hot rank formula?', back: '<code>log10(score) + t_submitted / 45000</code> — popularity log scale par, aur freshness seconds-since-epoch ke roop mein.' },
    { front: '45,000 ka matlab?', back: '12.5 ghante. Score ×10 hona = post ka 12.5 ghante naya hona. Isi liye "upvotes are time travel".' },
    { front: 'Submission time vs current time?', back: 'Submission time se rank sirf vote par badalta hai → stored listing sadti nahi. Current time se rank har second badalta hai → har baar rebuild.' },
    { front: '1,000 vote wale post par 1 aur vote ka asar?', back: 'Lagbhag 20 second ki freshness ke barabar. Shuruaati votes trajectory tay karte hain, baad ke lagbhag kuch nahi.' },
    { front: 'Listing par 1000 ka cap kyun?', back: 'Bounded answer = bounded storage + har repair ka bounded kharcha. "Listing ek product hai jiska spec hai."' },
  ],
},
]);

function rankModel(k) {
  const posts = 1e5;
  if (k.clock === 1) {
    /* current time — har check par listing purani, rebuild lagta hai */
    return { work: posts * 10 + k.cap * 20, correct: 5, perRepair: k.cap };
  }
  /* submission time — sirf vote par repair, aur repair ka kharcha cap se bandha hai */
  const votes = 1e6;
  const work = votes * (k.cap / 1000) * (k.fresh > 0 ? 0.1 : 0.05);
  return { work, correct: 99, perRepair: k.cap };
}


/* =====================================================================
   LEVEL 3 — LISTINGS, COMMENT TREES aur CACHE LAYERS
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-reddit-cache',
  icon: '📜',
  title: 'Reddit — Listing maintain karo, banao mat',
  badge: 'Cache Kotwal',
  objectives: [
    'Listing = stored sorted list, na HTML na query result',
    'Comment tree ke liye alag ganit: Wilson lower bound (best sort)',
    'Cache layers: CDN, mcrouter, negative cache, stale-on-purpose, stampede lock',
    'Bounded answer — har stored jawab ka size cap kyun zaroori hai',
  ],
  lesson: [
    `<h3>📜 Listing kya hai — aur kya nahi hai</h3>
     <p>Jab tum r/programming kholte ho aur "hot" chunte ho, us waqt ranking ho hi nahi
     rahi. Listing pehle se bani hui hai. Aur listing hai kya?</p>
     <pre>❌ rendered HTML nahi
❌ database query ka result nahi
✅ thing-ids ki ek SORTED LIST, har id ke saath uski sort value</pre>
     <p>Jab vote aata hai toh background worker Postgres se listing dobara nahi banwata.
     Worker stored list kholta hai, us post ko uski nayi jagah par le jaata hai, aur list
     wapas likh deta hai. Reddit listing ko <b>rebuild</b> nahi karta — <b>maintain</b>
     karta hai.</p>
     <p>Naya post aate hi Reddit har relevant listing mein uski jagah tay kar deta hai —
     hot, new, top, top-of-week, top-of-year, controversial… lagbhag <b>15 sort orders</b>
     har subreddit ke liye. In sab ki collection ko Reddit <b>permacache</b> kehta hai
     aur woh Cassandra mein rehti hai (denormalized data, lagbhag hamesha key se access).</p>
     <h3>📏 Bounded answer</h3>
     <p>Purane Reddit par tum kisi listing mein lagbhag <b>1000 posts</b> se aage
     page nahi kar sakte the. Kaaran pagination ka code nahi tha — kaaran yeh tha ki
     <b>stored jawab wahin khatam ho jaata tha</b>. Cap lagane se storage predictable
     rehti hai aur har repair ka kharcha bhi predictable rehta hai.</p>
     <p class="tip">🎯 Niyam: har derived answer ko ek <b>spec</b> do — "yeh kitna bada
     ho sakta hai". Bina cap wala jawab dheere-dheere ek aisa job ban jaata hai jo kabhi
     khatam nahi hota.</p>`,
    `<h3>🌳 Comment tree — same problem, alag ganit</h3>
     <p>Comments flat list nahi hain, tree hain: har comment apna post aur apna parent
     yaad rakhta hai. Popular thread mein hazaron comments ho sakte hain. Har reader ke
     liye poora tree walk karke har level sort karna bahut mehenga hai.</p>
     <p>Isliye Reddit ne wahi chaal chali: <b>tree bhi ek answer hai</b>. Naya comment
     ek fact hai — likha, queue par job gaya, worker ne stored tree mein usko splice kar
     diya (Cassandra mein). Reader ko pehle se juda hua tree milta hai.</p>
     <p>Aur jab tree bhi bahut bada ho jaaye? Reddit poora tree nahi bhejta — top
     comments bhejta hai aur "load more comments" button deta hai. <b>Bada jawab
     tukdon mein bhejo.</b></p>
     <h3>🎯 "Best" sort — percentage ka dhoka</h3>
     <p>Do comments:</p>
     <pre>A:   1 upvote,   0 downvote   →  100% positive  (sample = 1)
B: 300 upvote, 100 downvote   →   75% positive  (sample = 400)</pre>
     <p>Percentage dekho toh A jeetta hai. Par A ko sirf ek aadmi ne pasand kiya,
     jabki B ko 400 logon ne dekha aur 3 mein se 4 ne approve kiya. Asli sawaal
     percentage nahi hai — asli sawaal <b>sample size</b> hai.</p>
     <p>Reddit ka jawab 1927 ke ek statistic se aaya: <b>Wilson score confidence
     interval</b> (Reddit mein isse Randall Munroe, xkcd wale, laaye the). Har comment
     ko ek poll maano. Comments ko unke dikhe hue approval rate se nahi, balki
     <b>us sabse kam approval rate se rank karo jise data confidently support karta
     hai</b> (lower confidence bound).</p>
     <table>
       <tr><th>Comment</th><th>Dikhta hua rate</th><th>Lower bound (rank isi par)</th></tr>
       <tr><td>1 up / 0 down</td><td>100%</td><td>bahut neeche — sample chhota hai</td></tr>
       <tr><td>300 up / 100 down</td><td>75%</td><td>75% ke kareeb — sample bada hai</td></tr>
     </table>
     <p>Aur ek khoobsurti: agar ek accha comment galti se neeche shuru hua, toh uska
     interval chauda hai — do-chaar upvote aate hi lower bound tezi se upar chadhta hai.
     System <b>khud ko theek</b> karta jaata hai.</p>
     <p class="tip">🎯 Posts ka sawaal hai "abhi kya interesting hai" (waqt maayne rakhta
     hai). Comments ka sawaal hai "kaunsa reply sabse bharosemand hai" (waqt ka koi role
     nahi). <b>Do alag sawaal = do alag algorithm.</b> Ek hi formula har jagah mat thoko.</p>`,
    `<h3>🧊 Cache ek layer nahi — cache hi architecture hai</h3>
     <p>Reddit ka read path Postgres tak pahunchne se pehle kai jagah rukta hai:</p>
     <table>
       <tr><th>Layer</th><th>Kaam</th></tr>
       <tr><td>CDN</td><td>Logged-out users ko poora page edge se — request Reddit ke app servers tak aati hi nahi</td></tr>
       <tr><td>mcrouter</td><td>Facebook ka memcache routing proxy — tay karta hai request kis pool mein jaayegi</td></tr>
       <tr><td>permacache pool</td><td>Pehle se bani listings</td></tr>
       <tr><td>stale pool</td><td>Purani copies, jaan-boojh kar rakhi gayi</td></tr>
       <tr><td>lock pool</td><td>Distributed locks — stampede rokne ke liye</td></tr>
       <tr><td>Postgres</td><td>Last resort</td></tr>
     </table>
     <h3>🚫 Negative caching</h3>
     <p>"Kya is user ne is post par vote kiya?" — agar jawab HAAN hai toh cache karna
     zahir hai. Reddit <b>NAHI</b> ko bhi cache karta tha. Socho mat ki yeh chhoti baat
     hai: yeh sawaal har page load par har post ke liye poochha jaata hai. "Nahi" ko
     cache karne se lakhon database lookups gayab ho gaye.</p>
     <h3>🕰️ Stale on purpose · 🔒 stampede lock</h3>
     <p>Downstream slow ya down hai? Reddit jaan-boojh kar purani copy serve karta tha —
     <b>purana par turant</b> Reddit ke liye <b>taza par unavailable</b> se behtar hai.</p>
     <p>Aur jab koi popular listing expire hoti hai aur 10,000 requests ek saath aati
     hain? Bina coordination ke 10,000 requests wahi listing dobara banane lagengi aur
     database gir jaayega — yeh <b>cache stampede</b> hai. Reddit distributed lock
     lagata tha: <b>ek request rebuild karti hai, baaki ya thoda rukti hain ya stale
     copy le jaati hain</b>. Database ne rebuild ka kharcha sirf ek baar diya.</p>`,
  ],
  stages: [
    {
      type: 'archdiff',
      title: 'Read path review — teen galtiyan dhoondho',
      brief: `Ek team ne Reddit jaisa read path banaya hai. Traffic 90% logged-out
        readers ka hai. Diagram par click karke <b>teen</b> aisi jagah pakdo jahan
        design ulta padega.`,
      goal: 'Teen flaws pakdo. Sahi boxes par click karoge toh woh kyun sahi hain, woh bhi milega.',
      nodes: [
        { id: 'cdn', label: 'CDN', sub: 'sirf images aur CSS · HTML hamesha origin se', row: 0 },
        { id: 'app', label: 'App servers', sub: 'har request par listing rank karte hain', row: 0 },
        { id: 'mc', label: 'memcached', sub: 'ek hi pool, sab kuch usi mein', row: 1 },
        { id: 'neg', label: 'Vote-check', sub: '"haan" cache hota hai, "nahi" har baar DB se', row: 1 },
        { id: 'expire', label: 'Listing expiry', sub: 'expire hote hi har request rebuild karti hai', row: 1 },
        { id: 'pg', label: 'Postgres', sub: 'facts ka ghar — links, comments, votes', row: 2 },
      ],
      flaws: [
        { id: 'app', why: 'Har request par ranking calculate karna hi woh kaam hai jise Reddit ne write ke waqt shift kiya tha. Listing ko stored sorted list banao aur vote par maintain karo.' },
        { id: 'neg', why: 'Negative answer cache na karna sabse chupa hua leak hai. "Kya is user ne vote kiya?" har page par har post ke liye poochha jaata hai — "nahi" ko cache na karne ka matlab hai lakhon bekaar DB lookups.' },
        { id: 'expire', why: 'Bina lock ke expiry = cache stampede. 10,000 requests ek saath wahi listing banayengi. Ek distributed lock chahiye: ek rebuild kare, baaki stale copy le jaayein.' },
      ],
      fine: {
        cdn: 'CDN se static assets dena theek hai — par asli jeet tab hai jab logged-out users ka poora HTML page bhi edge se jaaye, jaisa Reddit karta tha.',
        mc: 'Ek memcached pool galat nahi hai. Reddit ne bade hone par pools alag kiye (permacache, stale, locks) taaki ek pool ka pressure doosre ko na khaye — par yeh tuning hai, flaw nahi.',
        pg: 'Postgres ko facts ka ghar rakhna bilkul sahi hai. Reddit ne bhi wahi kiya — Postgres last resort tha, source of truth ke roop mein.',
      },
      lesson: `Read path ki teen sabse aam galtiyan yahi hain: <b>read ke waqt calculate
        karna</b>, <b>"nahi" ko cache na karna</b>, aur <b>expiry par stampede se na
        bachna</b>.`,
    },
    {
      type: 'match',
      title: 'Cache layer aur uska kaam',
      pairs: [
        { left: '🌍 CDN', right: 'Logged-out user ko poora page edge se — origin tak request aati hi nahi', explain: 'Reddit ke sabse bade group ko wahi ek copy di ja sakti thi, isliye woh page CDN par ruk jaata tha.' },
        { left: '🔀 mcrouter', right: 'Tay karta hai request kaunse memcache pool mein jaayegi', explain: 'Facebook ka routing proxy. Reddit ke paas ek nahi, kai memcache pools the.' },
        { left: '🚫 Negative cache', right: '"Nahi" ko bhi store karo taaki woh "haan" jitna sasta ho', explain: '"Kya is user ne vote kiya?" par lakhon bekaar DB lookups isi se bachte hain.' },
        { left: '🕰️ Stale pool', right: 'Downstream slow ho toh jaan-boojh kar purani copy do', explain: 'Reddit ke liye purana-par-turant, taza-par-unavailable se behtar tha.' },
        { left: '🔒 Lock cache', right: 'Ek request rebuild kare, baaki rukein ya stale lein', explain: 'Cache stampede ka ilaaj — database rebuild ka kharcha sirf ek baar deta hai.' },
        { left: '🐘 Postgres', right: 'Facts ka ghar — last resort', explain: 'Answers cache mein rehte the; Postgres tak sirf woh request jaati thi jo har layer se bach nikli ho.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Stampede lab — expiry ke baad kya hota hai',
      instructions: 'Concurrency, lock aur stale serving ke knobs ghumao. Database par pahunchne wale rebuilds dekho.',
      goal: 'Aisi setting dhoondho jahan database par ek waqt mein <b>2 se zyada rebuild</b> na ho aur user-facing p99 <b>200 ms se kam</b> rahe.',
      scenario: `r/all ki hot listing expire hui hai. Usi instant <b>10,000 requests</b>
        aati hain. Ek rebuild database par lagbhag <b>800 ms</b> leta hai.`,
      knobs: [
        { id: 'reqs', label: 'Ek saath aane wali requests', min: 1000, max: 20000, step: 1000, value: 10000, unit: '',
          note: 'Popular listing par yeh number bada hi hoga.' },
        { id: 'lock', label: 'Distributed lock (0 = nahi · 1 = haan)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Lock hone par sirf ek request rebuild karti hai.' },
        { id: 'stale', label: 'Lock na milne par kya karein (0 = intezaar · 1 = stale do)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Stale dena matlab thoda purana jawab, par turant.' },
      ],
      readouts: k => {
        const m = stampedeModel(k);
        return [
          { label: 'Database par rebuilds', value: m.rebuilds.toLocaleString('en-IN'), tone: m.rebuilds <= 2 ? 'ok' : m.rebuilds <= 50 ? 'warn' : 'bad' },
          { label: 'User p99', value: m.p99 + ' ms', tone: m.p99 <= 200 ? 'ok' : m.p99 <= 900 ? 'warn' : 'bad' },
          { label: 'Kitne users ko purana jawab mila', value: m.stalePct + '%', tone: m.stalePct === 0 ? 'ok' : 'warn' },
          { label: 'DB par load', value: m.dbLoad, tone: m.rebuilds <= 2 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = stampedeModel(k);
        return [
          { label: 'Rebuilds', pct: Math.min(100, (m.rebuilds / 200) * 100), text: m.rebuilds + '', tone: m.rebuilds <= 2 ? 'ok' : 'bad' },
          { label: 'User p99', pct: Math.min(100, (m.p99 / 2000) * 100), text: m.p99 + ' ms', tone: m.p99 <= 200 ? 'ok' : 'bad' },
          { label: 'Stale serve', pct: m.stalePct, text: m.stalePct + '%', tone: 'warn' },
        ];
      },
      verdict: k => {
        const m = stampedeModel(k);
        if (!k.lock) return { ok: false, text: `Lock nahi hai — <b>${m.rebuilds.toLocaleString('en-IN')}</b> requests ek saath wahi listing bana rahi hain. Database ke liye yeh ek self-inflicted DDoS hai.` };
        if (!k.stale) return { ok: false, text: `Lock hai (rebuild sirf 1), par baaki <b>${(k.reqs - 1).toLocaleString('en-IN')}</b> requests rebuild khatam hone ka intezaar kar rahi hain — p99 <b>${m.p99} ms</b>. Reddit un requests ko stale copy de deta tha.` };
        return { ok: true, text: `Yahi Reddit ka combo hai: lock se ek rebuild, aur baaki sabko <b>stale copy turant</b>. p99 <b>${m.p99} ms</b>, database par sirf <b>${m.rebuilds}</b> rebuild.` };
      },
      check: k => { const m = stampedeModel(k); return m.rebuilds <= 2 && m.p99 <= 200; },
      lesson: `Cache stampede "ho sakta hai" wali cheez nahi hai — popular key par
        <b>hoga hi</b>. Do cheezein saath chahiye: lock (rebuild ek hi baar) aur stale
        serving (baaki sabko turant jawab).`,
      quiz: {
        q: 'Lock laga diya par stale serving nahi rakhi. Kya hoga?',
        choices: [
          'Database toh bach jaayega, par 10,000 users poore rebuild ka intezaar karenge — latency spike wahin rahega',
          'Sab theek ho jaayega',
          'Lock bekaar hai, use hata do',
          'Requests fail ho jaayengi',
        ],
        answer: 0,
        explain: 'Lock database ko bachata hai, stale serving user ko bachati hai. Dono alag problem solve karte hain.',
      },
    },
    {
      type: 'quiz',
      title: 'Wilson score aur comment ranking',
      questions: [
        {
          q: 'Comment A: 1 upvote, 0 downvote. Comment B: 300 upvote, 100 downvote. "Best" sort kise upar rakhega aur kyun?',
          choices: [
            'B ko — kyunki ranking dikhte hue percentage par nahi, us sabse kam approval rate par hoti hai jise data confidently support karta hai',
            'A ko — 100% hamesha 75% se behtar hai',
            'A ko — naya comment hamesha upar',
            'B ko — kyunki uske paas zyada total votes hain',
          ],
          answer: 0,
          explain: 'Wilson lower bound chhote sample par bharosa nahi karta. 1 vote wale comment ka interval bahut chauda hai, isliye uska lower bound neeche rehta hai.',
        },
        {
          q: 'Comment ranking mein waqt ka kya role hai?',
          choices: [
            'Koi role nahi — thread ke ghante baad likha gaya shandaar reply bhi top comment ban sakta hai',
            'Wahi role jo posts mein hai — purana comment neeche chala jaata hai',
            'Sirf pehle ghante ke comments dikhte hain',
            'Waqt se comment ka score aadha ho jaata hai',
          ],
          answer: 0,
          explain: 'Posts ka sawaal "abhi kya interesting hai" hai, comments ka sawaal "kaunsa reply bharosemand hai". Doosre sawaal mein waqt ka koi kaam nahi.',
        },
        {
          q: 'Reddit ne comment tree ko Cassandra mein "already assembled" kyun rakha?',
          choices: [
            'Kyunki har reader ke liye tree walk karke har level sort karna bahut mehenga hai — tree bhi ek ANSWER hai',
            'Kyunki Postgres tree store nahi kar sakta',
            'Kyunki comments delete nahi hote',
            'Kyunki Cassandra sasta hai',
          ],
          answer: 0,
          explain: 'Wahi fact/answer batwara: naya comment fact hai (turant likho), juda hua tree answer hai (background mein splice karo).',
        },
        {
          q: 'Monster thread par Reddit "load more comments" kyun dikhata hai?',
          choices: [
            'Kyunki bada stored answer bhi ek saath bhejna mehenga hai — bade jawab ko tukdon mein bhejo',
            'Kyunki baaki comments abhi bane nahi hain',
            'Kyunki users zyada nahi padhte',
            'Kyunki Cassandra ek baar mein utna data nahi de sakta',
          ],
          answer: 0,
          explain: 'Tree pehle se bana hua hai. Problem bhejne ki hai, banane ki nahi — isliye chunks mein bhejte hain.',
        },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — stampede, negative cache, stale serving',
      project: '01-reddit',
      exercise: 'ex3-cache-layers',
      goal: 'Ek popular listing ko expire karo aur teen configurations mein database par pahunchne wale rebuilds gino.',
      why: `Service ek listing serve karti hai jiska rebuild 800 ms leta hai. Tum
        <code>LOCK</code> aur <code>STALE</code> environment variables se cache ka
        vyavhaar badal sakte ho.`,
      steps: [
        { text: 'Bina lock ke chalao.', cmd: 'npm start ex3-cache-layers', expect: 'ex3-cache-layers\n  listing-service → http://localhost:4103  (LOCK=0 STALE=0 · rebuild 800 ms)' },
        { text: 'Stampede tool chalao — cache expire karke 500 requests ek saath.', cmd: 'node tools/stampede.js --concurrency 500', expect: 'LOCK=0 STALE=0   rebuilds: 96   p50: 1025 ms   p99: 1744 ms   db busy: 77.1 s' },
        { text: 'Sirf lock on karke dobara chalao.', cmd: 'LOCK=1 npm start ex3-cache-layers && node tools/stampede.js --concurrency 500', expect: 'LOCK=1 STALE=0   rebuilds: 1   p50: 879 ms   p99: 885 ms   db busy: 0.8 s   served: {"rebuild":1,"waited":499}' },
        { text: 'Ab lock + stale dono on.', cmd: 'LOCK=1 STALE=1 npm start ex3-cache-layers && node tools/stampede.js --concurrency 500', expect: 'LOCK=1 STALE=1   rebuilds: 1   p50: 226 ms   p99: 228 ms   db busy: 0.8 s   served: {"stale":499,"rebuild":1}' },
      ],
      observe: {
        q: 'Sirf lock lagane se database par rebuilds 96 se 1 ho gaye, par p50 abhi bhi 879 ms tha. Stale on karte hi p50 226 ms ho gaya. Kyun?',
        choices: [
          'Lock database ko bachata hai, stale serving user ko bachati hai — dono alag problem solve karte hain',
          'Stale serving se rebuild tez ho jaata hai',
          'Lock ne latency badha di thi',
          'Dono ek hi cheez hain, ek hi kaafi tha',
        ],
        answer: 0,
        explain: 'Lock ke saath baaki 499 requests rebuild ka intezaar karti hain (output mein "waited":499). Stale on karte hi unhe turant purani copy mil jaati hai ("stale":499).',
      },
      lesson: 'Stampede par do sawaal alag hain: "database par kitne rebuild jaayenge?" (lock) aur "baaki users ko kya milega?" (stale copy).',
    },
  ],
  interview: {
    title: 'Interview Round — cache design',
    instructions: 'Teen sawaal jo lagbhag har system design interview mein aate hain. 🎤',
    questions: [
      {
        q: 'Interviewer: "Ek popular key ka cache expire hota hai aur DB gir jaata hai. Fix?"',
        choices: [
          'Ek distributed lock lagao taaki sirf ek request rebuild kare, aur baaki ko stale copy do',
          'TTL badha do',
          'Cache ki memory badha do',
          'DB ke replicas badha do',
        ],
        answer: 0,
        explain: 'TTL badhana sirf stampede ko aage khiskata hai. Lock + stale dono chahiye: ek DB ke liye, doosra user ke liye.',
      },
      {
        q: 'Interviewer: "Tum negative results cache karoge?"',
        choices: [
          'Haan — "exist nahi karta" / "vote nahi kiya" jaise jawab bhi utne hi baar poochhe jaate hain, aur unko cache na karna ek chhupa hua leak hai',
          'Nahi, cache sirf asli data ke liye hota hai',
          'Sirf tab jab DB slow ho',
          'Nahi, kyunki row kabhi bhi ban sakti hai',
        ],
        answer: 0,
        explain: 'Reddit "nahi" ko cache karta tha. Bas TTL chhota rakho aur create ke waqt entry invalidate kar do.',
      },
      {
        q: 'Interviewer: "Comments ko posts wale ranking formula se rank karein?"',
        choices: [
          'Nahi — posts ka sawaal "abhi kya interesting hai" hai (waqt maayne rakhta hai), comments ka sawaal "kaunsa reply bharosemand hai" (sample size maayne rakhta hai)',
          'Haan, ek hi formula sab jagah rakhna simple rehta hai',
          'Haan, bas weight badal do',
          'Nahi, comments ko sirf waqt se sort karo',
        ],
        answer: 0,
        explain: 'Ek hi algorithm har jagah thokna sabse aam galti hai. Pehle poochho: yeh ranking kis sawaal ka jawab de rahi hai?',
      },
    ],
  },
  success: [
    'Main stampede ko lock + stale serving se handle kar sakta hoon',
    'Main bata sakta hoon ki negative caching kab zaroori hai',
    'Main sample size wale ranking problem ko pehchaan sakta hoon',
  ],
  homework: `<p>Apne system ka sabse popular cache key dhoondho. Ab poochho: "jis second
    yeh key expire hogi, us second kitni requests aayengi?" Agar jawab "bahut" hai toh
    aaj hi do cheezein likho — ek single-flight lock, aur ek stale fallback.</p>`,
  cards: [
    { front: 'Reddit ki listing kya hai?', back: 'Thing-ids ki ek stored sorted list (na HTML, na query result). Vote par worker list kholta hai, post ki jagah badalta hai, list wapas likhta hai — rebuild nahi, <b>maintain</b>.' },
    { front: 'Cache stampede ka ilaaj?', back: 'Do cheezein saath: <b>single-flight lock</b> (ek hi rebuild DB tak jaaye) aur <b>stale serving</b> (baaki sabko turant purani copy).' },
    { front: 'Negative caching kya hai?', back: '"Nahi / exist nahi karta" jaise jawab bhi cache karna. Reddit "kya is user ne vote kiya?" ka NAHI bhi cache karta tha — isse lakhon DB lookups bache.' },
    { front: 'Wilson lower bound kyun?', back: 'Ranking dikhte hue percentage par nahi, us sabse kam approval rate par jise data support karta hai. 1 up/0 down (100%) 300 up/100 down (75%) se neeche rehta hai — sample chhota hai.' },
    { front: 'Posts vs comments ranking?', back: 'Posts = waqt-weighted popularity (kya interesting hai abhi). Comments = statistical confidence (kaunsa reply bharosemand hai). Alag sawaal, alag ganit.' },
  ],
},
]);

function stampedeModel(k) {
  const rebuildMs = 800;
  if (!k.lock) return { rebuilds: k.reqs, p99: Math.min(9000, Math.round(rebuildMs * Math.max(1, k.reqs / 2500))), stalePct: 0, dbLoad: 'poora DB rebuild mein' };
  if (!k.stale) return { rebuilds: 1, p99: rebuildMs + 42, stalePct: 0, dbLoad: 'ek rebuild' };
  return { rebuilds: 1, p99: 11, stalePct: 99, dbLoad: 'ek rebuild' };
}

/* =====================================================================
   LEVEL 4 — MONOLITH KO GHERO (strangler fig + federation)
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-reddit-strangle',
  icon: '🌿',
  title: 'Reddit — r2 monolith ko dheere-dheere ghera',
  badge: 'Strangler Mali',
  objectives: [
    'r2 monolith: ek hi codebase, aur config tay karta hai server ka role',
    'Strangler fig + GraphQL federation se client ko pata bhi na chale',
    'Traffic shifting khud banani padi — spec mein thi hi nahi',
    'Asli mushkil API nahi, <b>data ka maalik</b> badalna hai',
    'baseplate — 100 services chalane layak kaise banti hain',
  ],
  lesson: [
    `<h3>🐍 r2 — ek Python monolith jisne ek dashak nikaal diya</h3>
     <p>Reddit ka core ek hi bada Python codebase tha jise r2 kehte hain (site shuru
     Lisp mein hui thi). Usi codebase mein things, listings, ranking aur caching sab
     kuch tha. Mazedaar detail: <b>wahi code har server par jaata tha</b>, aur
     <b>config tay karta tha ki server ka role kya hai</b> — koi server page serve
     karta tha, koi queue se job uthata tha. 2009 mein Reddit AWS par gaya (thumbnails
     ke liye S3 pehle se use ho raha tha).</p>
     <p>Monolith ne saalon kaam kiya kyunki ek codebase samajhna aur deploy karna
     aasan hai. Problem tab aayi jab team badi ho gayi — har team ek hi codebase ko
     edit karti hai aur har change sabko rokta hai.</p>
     <h3>🌿 Strangler fig — todo mat, ghero</h3>
     <p>Reddit ne rewrite nahi kiya. Purane system ke chaaron taraf naya system ugaya
     aur dheere-dheere traffic naye hisson par bheja:</p>
     <pre>2017  clients GraphQL par aaye
2021  GraphQL FEDERATION — ek supergraph, peechhe kai subgraphs
2022  Go mein naye subgraphs (subreddits, comments, votes) jo schema ke
      apne-apne hisse ka maalik ban gaye</pre>
     <p>Client ek hi query bhejta hai. Supergraph tay karta hai ki kaunsa field kis
     service se aayega — kuch fields naye Go subgraph se, kuch abhi bhi r2 se. Client
     ko farq dikhta hi nahi. Isiliye migration invisible rahi.</p>`,
    `<h3>🚦 Do problem jo har migration mein aati hain</h3>
     <p><b>Pehli: traffic shifting.</b> GraphQL federation ke spec mein traffic
     dheere-dheere shift karne ka koi tareeka tha hi nahi — na 1% bhejne ka, na error
     rate dekh kar rollback karne ka. Reddit ko woh layer <b>khud</b> banani padi.</p>
     <p class="tip">🎯 Sabak: koi bhi migration tool utna hi accha hai jitna uska
     <b>rollback</b>. Agar 1% par nahi bhej sakte aur seconds mein wapas nahi aa sakte,
     toh woh migration plan nahi, ummeed hai.</p>
     <p><b>Doosri (aur badi): data ka maalik kaun hai.</b> Socho tumne shandaar naya Go
     service bana liya — par woh wahi Postgres aur wahi Cassandra padh raha hai jo
     monolith padhta hai. Tumne kuch alag nahi kiya. Coupling khatam nahi hui —
     coupling sirf <b>application layer se database layer par</b> chali gayi.</p>
     <pre>Request move karna     =  hafte ka kaam
Data ka owner badalna  =  saalon ka kaam
  (kaun is table ka maalik hai? kaun schema badal sakta hai?
   kaun likh sakta hai? purane readers ka kya hoga?)</pre>
     <h3>🧰 baseplate — 100 services ka narak na ban-na</h3>
     <p>Monolith todne ke baad agla khatra: 100 alag-alag services jo sab apne tareeke
     se bani hon. Reddit ne <b>baseplate</b> banaya — ek service template/framework
     jisme Postgres, Cassandra, memcached aur queues ki wahi wiring hai aur wahi
     observability patterns hain.</p>
     <p>100 ek jaisi services chalana aasan hai. 100 alag-alag services chalana narak
     hai. (Jira ka Micros aur Cloudflare ka homogeneous fleet — teeno alag companies,
     ek hi seekh.)</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Migration plan banao',
      instructions: 'Har slot mein ek option chuno. Review par har option ka "kyun" khulega — chune hue ka bhi, chhode hue ka bhi.',
      brief: `Tumhare paas ek 9 saal purana Django monolith hai jo 4,000 requests/sec
        leta hai. Product team har hafte features maang rahi hai. Tumhe monolith ko
        dheere-dheere todna hai — <b>bina downtime</b>, aur bina feature work roke.`,
      requirements: [
        'Zero downtime — traffic 24×7 hai',
        'Har kadam seconds mein wapas roll back ho sake',
        'Feature delivery ruk-ni nahi chahiye',
        'Aakhir mein naye services ka apna data hona chahiye',
      ],
      pass: 11,
      slots: [
        {
          id: 'shape', label: 'Overall approach', icon: '🧭',
          options: [
            { id: 'strangle', label: 'Strangler fig — naye services purane ke aas-paas ugao, ek-ek raasta shift karo', score: 4, why: 'Reddit, Jira, Slack — teeno ne yahi kiya. Purana system chalta rehta hai, naya hissa-hissa kar ke aata hai, aur har kadam wapas liya ja sakta hai.' },
            { id: 'rewrite', label: 'Big bang rewrite — naya system poora banao, phir ek din switch', score: -4, why: 'Rewrite ke dauraan purana system bhi badalta rehta hai, isliye target hilta rehta hai. Switch wale din ka blast radius 100% hota hai.' },
            { id: 'freeze', label: 'Feature freeze karke pehle migration poori karo', score: -2, why: 'Business kabhi maanega nahi, aur migration mahine leti hai. Reddit ne saalon migration ki — freeze ka sawaal hi nahi tha.' },
          ],
        },
        {
          id: 'front', label: 'Client ke saamne kya rahega', icon: '🚪',
          options: [
            { id: 'gateway', label: 'Ek gateway/supergraph jo tay kare kaunsa field kahan se aaye', score: 4, why: 'Client ek hi API dekhta hai. Andar ka owner badalne par client ko kuch nahi karna padta — Reddit ne GraphQL federation isi liye chuna.' },
            { id: 'clients', label: 'Har client app ko naye endpoints par update karo', score: -3, why: 'Mobile apps update hone mein mahine lagte hain aur purane version saalon chalte hain. Client ko migration ka hissa banana sabse dheema raasta hai.' },
            { id: 'dns', label: 'DNS se poora traffic naye system par bhejo', score: -2, why: 'DNS "sab ya kuch nahi" hai, aur TTL ke kaaran rollback minutes leta hai. Percentage-based shifting nahi ho sakti.' },
          ],
        },
        {
          id: 'shift', label: 'Traffic kaise shift hoga', icon: '🚦',
          options: [
            { id: 'canary', label: 'Percentage se: 1% → 10% → 50% → 100%, error rate dekh kar, instant rollback ke saath', score: 4, why: 'Yahi woh layer hai jo federation spec mein thi hi nahi aur Reddit ko khud banani padi. Rollback ke bina migration plan adhoora hai.' },
            { id: 'allat', label: 'Ek raat mein poora switch', score: -3, why: 'Blast radius 100%, aur galti raat ko 3 baje milegi.' },
            { id: 'byteam', label: 'Internal users pehle, phir sab', score: 1, why: 'Bura nahi hai — par internal traffic ka aakaar production jaisa nahi hota, isliye load aur edge cases chhoot jaate hain. Canary ke saath milao.' },
          ],
        },
        {
          id: 'data', label: 'Data ka kya', icon: '🗄️',
          options: [
            { id: 'owner', label: 'Har naye service ko apni tables ka maalik banao; purane readers ko API ya event stream do', score: 4, why: 'Asli decoupling yahi hai. Warna do services ek hi table par likhengi aur coupling application se database par chali jaayegi.' },
            { id: 'shared', label: 'Naya service abhi ke liye purani tables hi padhta rahe', score: -1, why: 'Shuruaat ke liye theek hai (Reddit ne bhi kiya), par agar yahin ruk gaye toh monolith sirf naam se toota — coupling database layer par zinda hai.' },
            { id: 'dual', label: 'Application se dono databases mein likho (dual write)', score: -3, why: 'Ek write success, doosra fail — aur ab do sach hain. Bina coordinator ke dual write consistency bugs paida karta hai; log/CDC se replicate karo.' },
          ],
        },
        {
          id: 'std', label: 'Naye services ko ek jaisa kaise rakhoge', icon: '🧰',
          options: [
            { id: 'template', label: 'Ek service template: wahi wiring, wahi logging/metrics/tracing, wahi health checks', score: 3, why: 'Reddit ka baseplate, Jira ka Micros — ek hi seekh. 100 ek jaisi services chalane layak hain, 100 alag-alag nahi.' },
            { id: 'free', label: 'Har team apni pasand ka stack chune', score: -3, why: 'Azadi acchi lagti hai jab tak 3 baje ek aisi service page kare jiska logging format kisi aur ne banaya tha.' },
            { id: 'doc', label: 'Ek document likh do "best practices" ka', score: 0, why: 'Document se koi nuksaan nahi, par woh apne aap laagu nahi hota. Template code ban ke aata hai, document nahi.' },
          ],
        },
      ],
      verdicts: {
        great: '🎉 Yahi Reddit ka raasta hai: gherna, percentage se shift karna, data ka owner badalna, aur sab services ko ek template par rakhna.',
        ok: '👍 Theek hai — par ek do jagah blast radius abhi bhi bada hai. Review mein har option ka "kyun" padho.',
        bad: '⚠️ Is plan mein rollback nahi hai ya data ka owner nahi badal raha. Dono migration ko saalon tak latka dete hain.',
      },
    },
    {
      type: 'bins',
      title: 'Aasan kaam vs saalon ka kaam',
      instructions: 'Migration ke har kaam ko uske asli aakaar ke hisaab se baanto.',
      bins: [
        { id: 'weeks', label: '🟢 Hafton ka kaam' },
        { id: 'years', label: '🔴 Saalon ka kaam' },
      ],
      items: [
        { text: 'Ek endpoint ka traffic naye service par bhejna', bin: 'weeks', explain: 'Routing badalna aasan hissa hai — Reddit ne khud kaha ki request move karna aasan tha.' },
        { text: 'Tay karna ki is table ka maalik kaun hai aur kaun likh sakta hai', bin: 'years', explain: 'Ownership ka sawaal har purane reader, har report aur har background job ko chhoota hai.' },
        { text: 'Naye service ke liye ek GraphQL subgraph banana', bin: 'weeks', explain: 'Schema ka hissa lena straightforward hai — isiliye federation chuni gayi thi.' },
        { text: 'Monolith ke shared tables ko service-owned tables mein todna', bin: 'years', explain: 'Data ka batwara hi asli microservices migration hai; baaki sab uske aas-paas ka kaam hai.' },
        { text: '1% traffic shifting aur rollback ki layer banana', bin: 'weeks', explain: 'Reddit ko yeh khud banani padi — par yeh hafton ka kaam tha, saalon ka nahi.' },
        { text: 'Purane readers (reports, cron jobs) ko naye owner ke API/event par le jaana', bin: 'years', explain: 'Yahi woh lamba poonch hai jo migration ko khatam nahi hone deti.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — gateway se 1% traffic shift karo',
      project: '01-reddit',
      exercise: 'ex4-strangler',
      goal: 'Ek gateway ke peechhe monolith aur naya service dono chalao, percentage se traffic shift karo, aur kharab version par instant rollback karo.',
      why: `Gateway har request par tay karta hai: monolith ya naya service.
        <code>SHIFT</code> percent set karta hai. Naye service mein ek bug hai jo
        kuch percent requests par galat jawab deta hai — dekho ki tum kitni jaldi
        pakad ke wapas aa sakte ho.`,
      steps: [
        { text: 'Gateway + monolith + naya service chalao.', cmd: 'npm start ex4-strangler', expect: 'ex4-strangler\n  monolith       → http://localhost:4105\n  new-service    → http://localhost:4106  (BUG_RATE=0.3)\n  gateway        → http://localhost:4104  (SHIFT=0%)' },
        { text: 'Baseline traffic bhejo (sab monolith par).', cmd: 'node tools/shift.js --rps 200 --for 3', expect: 'SHIFT=  0%   monolith: 486   new: 0   mismatches: 0   errors: 0   p99: 26 ms' },
        { text: '1% traffic naye service par bhejo aur traffic dobara chalao.', cmd: 'curl -X POST localhost:4104/admin/shift/1 && node tools/shift.js --rps 200 --for 3', expect: '{"shift":1}\nSHIFT=  1%   monolith: 563   new: 9   mismatches: 3   errors: 0   p99: 5 ms' },
        { text: '50% par jao.', cmd: 'curl -X POST localhost:4104/admin/shift/50 && node tools/shift.js --rps 200 --for 3', expect: 'SHIFT= 50%   monolith: 272   new: 299   mismatches: 98   errors: 0   p99: 5 ms' },
        { text: 'Rollback karo aur dekho kitna waqt laga.', cmd: 'curl -X POST localhost:4104/admin/shift/0', expect: '{"shift":0}   ← rollback 3 ms mein' },
      ],
      observe: {
        q: '1% par sirf 3 mismatch dikhe, 50% par 98. Bug dono baar wahi tha. Percentage shifting ka asli faayda kya hai?',
        choices: [
          'Galti ka blast radius traffic ke percentage jitna hi rehta hai — bug 1% par pakda jaata hai, 100% par nahi',
          'Naya service 1% par tez chalta hai',
          'Mismatches sirf zyada load par hote hain',
          'Gateway 1% par requests cache karta hai',
        ],
        answer: 0,
        explain: 'Shadow compare + chhota percentage = bug tab milta hai jab sirf kuch users prabhavit hon, aur rollback ek flag hai.',
      },
      lesson: 'Migration plan ka pehla sawaal "kaise shift karenge" nahi hota — <b>"kitni jaldi wapas aa sakte hain"</b> hota hai.',
    },
  ],
  interview: {
    title: 'Interview Round — monolith todna',
    instructions: 'Teen sawaal jo har "microservices migration" interview mein aate hain. 🎤',
    questions: [
      {
        q: 'Interviewer: "Naya service bana liya hai aur woh monolith ki hi tables padh raha hai. Kya yeh microservice hai?"',
        choices: [
          'Nahi — coupling application layer se database layer par chali gayi hai; jab tak data ka owner nahi badla, monolith sirf naam se toota hai',
          'Haan, code alag hai toh service alag hai',
          'Haan, agar deployment alag hai',
          'Nahi, jab tak alag language use na ho',
        ],
        answer: 0,
        explain: 'Reddit ka apna sabak: requests move karna aasan hai, data ka owner badalna saalon ka kaam hai.',
      },
      {
        q: 'Interviewer: "Traffic shift karne ka plan?"',
        choices: [
          'Gateway par percentage: 1% → 10% → 50% → 100%, har step par error rate aur output compare, aur ek flag se instant rollback',
          'Raat ko poora switch, subah monitor',
          'Pehle internal users, phir sab',
          'DNS change karke',
        ],
        answer: 0,
        explain: 'Har achhi migration mein rollback pehle banta hai. Reddit ko yeh layer khud likhni padi kyunki federation spec mein thi hi nahi.',
      },
      {
        q: 'Interviewer: "Tum 40 microservices ko manageable kaise rakhoge?"',
        choices: [
          'Ek service template jisme wiring, logging, metrics, tracing aur health checks pehle se hon — nayi service us template se bane',
          'Har team apni pasand ka stack chune, innovation zaroori hai',
          'Ek best practices document likh do',
          'Sab services ek hi repo mein rakho',
        ],
        answer: 0,
        explain: 'Reddit ka baseplate, Jira ka Micros, Cloudflare ka homogeneous fleet — ek hi seekh alag-alag shakal mein.',
      },
    ],
  },
  success: [
    'Main strangler fig migration ka plan bana sakta hoon jisme har kadam reversible ho',
    'Main pehchaan sakta hoon ki data ownership abhi bhi shared hai ya nahi',
    'Main bata sakta hoon ki service template kyun zaroori hai',
  ],
  homework: `<p>Apne system ka ek endpoint chuno jise tum alag karna chahte ho. Ab
    do list likho: "is endpoint ki tables par aur kaun likhta hai?" aur "kaun padhta hai?"
    Jab tak dono list khaali nahi hoti, woh endpoint alag nahi hua — sirf naye ghar mein
    shift hua hai.</p>`,
  cards: [
    { front: 'Strangler fig pattern kya hai?', back: 'Purane system ko todne ke bajaye uske aas-paas naya system ugao aur ek-ek raasta shift karo. Purana hissa ghatta jaata hai, naya badhta jaata hai — har kadam reversible.' },
    { front: 'GraphQL federation migration mein kaise madad karta hai?', back: 'Ek supergraph aage, kai subgraphs peechhe. Field ka owner badal do — client ko ek hi API dikhti hai, migration invisible.' },
    { front: 'Reddit ko federation ke saath khud kya banana pada?', back: 'Traffic shifting layer — spec mein 1% bhejne, error rate dekhne aur instant rollback ka koi tareeka tha hi nahi.' },
    { front: 'Migration ka asli mushkil hissa?', back: 'Data ownership. Request move karna hafton ka kaam hai; "is table ka maalik kaun hai, kaun likh sakta hai, purane readers ka kya" saalon ka.' },
    { front: 'baseplate kya hai?', back: 'Reddit ka service template — Postgres/Cassandra/memcached/queues ki wahi wiring aur wahi observability. 100 ek jaisi services chalayi ja sakti hain, 100 alag-alag nahi.' },
  ],
},
]);

})();
