/* =====================================================================
   TRACK 9 — 🏢 Real Company Stories · Jira (Atlassian)

   Source: "How JIRA Was Rebuilt to Handle 1 Trillion Issues" (Akhil Sharma)
   + Atlassian ke apne engineering posts (tenant routing, search
   architecture, cloud migration / Project Vertigo).

   3 levels:
     st-jira-tenant — har customer ka apna database, shards, TCS, realms
     st-jira-index  — index ek COPY hai · drift · reconciliation loop
     st-jira-query  — JQL compile hoti hai · permissions query ke ANDAR
   ===================================================================== */
(function () {

VISUALS['st-jira-tenant'] = {
  t: 'Shared table vs database-per-tenant',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🏨 Shared tables (aam SaaS)</span>
        <div class="dg-node" data-hs="shared"><span class="ni">🗄️</span><span class="nl">issues</span><span class="ns">har row mein tenant_id · har query mein filter</span></div>
        <div class="dg-cap">Isolation <b>application logic</b> par tiki hai. Ek bhoola hua
          <code>WHERE tenant_id = ?</code> aur doosre customer ka data dikh jaata hai.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🏠 Database per tenant (Jira)</span>
        <div class="dg-node is-good" data-hs="perdb"><span class="ni">🏠</span><span class="nl">acme_db</span><span class="ns">apni tables</span></div>
        <div class="dg-node is-good"><span class="ni">🏠</span><span class="nl">globex_db</span><span class="ns">apni tables</span></div>
        <div class="dg-cap">Isolation <b>database boundary</b> par. Galti se doosre tenant ka
          data query karna mumkin hi nahi — woh usi database mein hai hi nahi.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">🌍 request</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="tcs">🧭 TCS (tenant kahan rehta hai?)</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="shard">📦 shard (web + workers + Postgres)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🏠 tenant ka apna database</span>
    </div>
    <div class="dg-cap">Shard sirf ek database server nahi hai — woh platform ka ek
      <b>slice</b> hai: web servers, worker nodes aur ek Postgres instance jisme us shard
      ke tenant databases rehte hain.</div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-box is-accent"><span class="bx-label">⚡ Sidecars</span>
        <div class="dg-cap">Hazaron services central TCS ko call nahi karte — har ek ke
          paas TCS sidecar hai jo tenant metadata ki local copy rakhta hai.</div></div>
      <div class="dg-box is-gold"><span class="bx-label">🌏 Realm</span>
        <div class="dg-cap">Tenant ka data kin regions mein reh sakta hai. Routing ka jawab
          "jo nazdeek ho" nahi — "jo realm allow kare" hota hai.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">🔊 Noisy neighbour</span>
        <div class="dg-cap">Ek bada customer poore Postgres host ko kha sakta hai — isliye
          har tenant ke connections par sakht limit.</div></div>
    </div>`,
};

VISUALS['st-jira-index'] = {
  t: 'Index ek COPY hai — aur har copy drift karti hai',
  html: `
    <div class="dg-flow">
      <span class="dg-pill good" data-hs="db">🗄️ Database (sach)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="push">📤 push</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="index">🔎 Search index (copy)</span>
    </div>
    <div class="dg-cap">Network fail ho sakta hai, message gir sakta hai, machine restart ho
      sakti hai. Database mein write safal hone ka matlab yeh nahi ki index mein bhi pahuncha.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Purana jawab: FULL RE-INDEX</span>
        <div class="dg-cap">Ek custom field badla → kaun se documents galat hue, pata nahi →
          sab dobara banao. Ghanton chalta hai, CPU/RAM kha jaata hai, beech mein fail ho
          jaaye toh adhoora ya locked index.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Naya jawab: RECONCILIATION</span>
        <div class="dg-cap">Har change ke saath database mein <b>document + version</b> ka
          record likho. Ek background job har minute poochhta hai: jo documents hone chahiye,
          woh hain? sahi version par hain? Nahi → dobara index karo.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">step 1</span><span class="cmd">naya index ALAG banao</span><span class="q">live index chalta rehta hai, searches chalti rehti hain</span></div>
      <div class="dg-rung"><span class="lv">step 2</span><span class="cmd">build ke dauraan hue changes replay karo</span><span class="q">naya index "abhi" tak pahunch jaata hai</span></div>
      <div class="dg-rung g"><span class="lv">step 3</span><span class="cmd">ek atomic switch</span><span class="q">search traffic naye index par — user ko pata bhi nahi chalta</span></div>
    </div>`,
};

VISUALS['st-jira-query'] = {
  t: 'JQL chalti nahi — compile hoti hai',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">⌨️ project = payments AND assignee = currentUser()</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="parse">🧩 parse</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="resolve">🔢 naam → internal ids</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="expand">👤 dynamic functions expand</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold" data-hs="perm">🔐 permissions query ke ANDAR</span><span class="dg-arrow">→</span>
      <span class="dg-pill good" data-hs="shards">🔎 sirf zaroori index shards</span>
    </div>
    <div class="dg-cap">Index ko "payments" ka matlab nahi pata — use project id pata hai.
      <code>currentUser()</code> aur <code>membersOf(developers)</code> query ke waqt hi khulte hain.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Permissions BAAD mein</span>
        <div class="dg-cap">Query 10 lakh issues match karti hai, user ko sirf 20 chahiye —
          par permission check 10 lakh baar karna padta hai.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Permissions ANDAR</span>
        <div class="dg-cap">Project-level permissions index mein hi baithi hain, aur user ke
          groups/grants query plan ka hissa ban jaate hain. Engine ko pehle se pata hai ki
          user kya dekh sakta hai.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-cap">Index ek bada pool nahi hai — woh <b>tenant aur project</b> se
      partitioned hai. "payments ke open bugs" jaisi query sirf un shards par jaati hai
      jinme us project ke issues hain. <b>Jo saath mein query hota hai, woh saath mein rehna
      chahiye.</b></div>`,
};

/* =====================================================================
   LEVEL 1 — TENANT KA APNA DATABASE
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-jira-tenant',
  icon: '🏠',
  title: 'Jira — har customer ka apna database',
  badge: 'Tenant Thanedaar',
  objectives: [
    'Shared table vs schema vs database-per-tenant — isolation kis level par hai',
    'Millions of databases chalane ki keemat: noisy neighbour aur connection limits',
    'Shard = platform ka slice (web + workers + Postgres), sirf DB server nahi',
    'TCS: "yeh tenant kahan rehta hai" ek critical infrastructure sawaal hai',
  ],
  lesson: [
    `<h3>🏢 Jira cloud se pehle server product tha</h3>
     <p>Jira zyadatar apni zindagi ek <b>self-hosted Java app</b> ke roop mein rahi:
     ek company, ek install, apna database. Isolation muft mein mil jaati thi — do
     customers ka data ek dusre ke paas tha hi nahi.</p>
     <p>Cloud mein woh muft isolation khatam ho gayi. Ab ek hi infrastructure par
     <b>laakhon companies</b> chalti hain, aur har issue, attachment, workflow aur
     permission ko sahi customer ka hona chahiye — phir bhi har customer ko lagna chahiye
     ki Jira sirf uski hai. Is cheez ka naam hai <b>tenant</b> (yourcompany.atlassian.net).</p>
     <h3>🗄️ Sabse bada faisla: tenant ka data kahan rahega</h3>
     <p>Zyadatar SaaS shared tables chunte hain: ek hi schema, har row mein
     <code>tenant_id</code>, har query mein filter. Jira ne ulta kiya — <b>har tenant ka
     apna database</b>. Laakhon tenant databases, jo shared Postgres instances par packed
     hain (lagbhag laakh-bhar database servers par). Ek Fortune 500 company aur ek 10
     logon ka startup ek hi machine par ho sakte hain, par unka data alag-alag databases
     mein.</p>
     <table>
       <tr><th></th><th>Shared tables</th><th>Database per tenant</th></tr>
       <tr><td>Isolation kahan</td><td>Application logic mein (har query yaad rakhe)</td><td>Database boundary par</td></tr>
       <tr><td>Ek kharab query</td><td>Sabko slow kar sakti hai</td><td>Ek customer tak</td></tr>
       <tr><td>Migration</td><td>Ek saath sabki</td><td>Tenant-by-tenant</td></tr>
       <tr><td>Data residency</td><td>Bahut mushkil</td><td>Ek tenant ko doosre region mein le jao</td></tr>
       <tr><td>Operational bhaar</td><td>Kam</td><td>Bahut zyada — laakhon databases chalane padte hain</td></tr>
     </table>
     <p class="tip">🎯 Atlassian ne <b>isolation ko density se upar</b> rakha. Keemat khud
     bhi maani: laakhon databases chalana zyada mushkil hai, aur ek bada customer wahi
     Postgres host kha sakta hai jis par doosre baithe hain — isliye har tenant ke
     database connections par sakht limit lagayi gayi.</p>`,
    `<h3>📦 Shard ka matlab yahan alag hai</h3>
     <p>Jira ka AWS par jaana ek multi-year project tha (Project Vertigo). Usi dauraan
     platform ko <b>shards</b> mein baanta gaya. Yahan shard sirf ek database server nahi
     hai — woh platform ka poora slice hai:</p>
     <pre>shard = web servers (requests)  +  worker nodes (background jobs)
         +  ek Postgres instance (us shard ke tenant databases)</pre>
     <p>Naya customer sign up karta hai toh use kisi region ke kisi shard par rakh diya
     jaata hai, aur wahi uska ghar ban jaata hai.</p>
     <h3>🧭 Isi se ek naya sawaal paida hota hai</h3>
     <p>Agar har tenant ka database duniya bhar ke hazaron servers mein kahin bhi ho sakta
     hai, toh <b>request ko pata kaise chale ki jaana kahan hai?</b> London se request
     aayi, par data Frankfurt, Sydney ya Virginia mein ho sakta hai. Ek bhi issue padhne
     se pehle yeh sawaal hal karna padta hai.</p>
     <p>Iska jawab hai <b>TCS — Tenant Context Service</b>: platform ki directory. Tenant
     id do, aur TCS batata hai — data kis region aur shard mein hai, kaun se features on
     hain, kaunsa licence hai.</p>
     <pre>TCS ke numbers: har region mein dasiyon hazaar requests/second
                 single-digit millisecond latency
                 read-optimised (lookups >>> updates)</pre>
     <p>Aur sabse aham design choice: <b>zyadatar services central TCS ko call karte hi
     nahi</b>. Platform mein hazaron chhote <b>TCS sidecars</b> chalte hain jo tenant
     metadata ki local copy rakhte hain. Service ek local lookup karti hai — na network
     hop, na har request par remote lookups ki zanjeer.</p>
     <p class="tip">🎯 Yahi Cloudflare wala pattern doosri shakal mein hai. Cloudflare ne
     poori config har server par rakhi. Jira ne <b>directory</b> har service ke paas
     rakhi. Dono ka nateeja ek: <b>read path par koi remote call nahi</b>.</p>`,
    `<h3>🌏 Realms — data kahan reh sakta hai</h3>
     <p>Bade enterprise aur regulators poochhte hain: mera data <b>physically</b> kahan
     rakha hai? European customer chahta hai Europe, Australian customer chahta hai
     Australia. Atlassian isko <b>realm</b> se model karta hai — un regions ka set jahan
     tenant ka data reh sakta hai, centrally store kiya gaya taaki har service usse maan
     sake.</p>
     <p>Isliye routing sirf performance ka sawaal nahi raha: TCS batata hai tenant kahan
     hai, par <b>realm</b> tay karta hai woh kahan ho sakta hai. Aur realms badalte bhi
     hain (company naye market mein jaati hai, regulation badalti hai), isliye tenants ko
     ek realm se doosre realm mein migrate karne ki suvidha bhi banani padi.</p>
     <h3>🧰 Micros — platform ke neeche ka platform</h3>
     <p>Jira, Confluence aur Bitbucket ke neeche Atlassian ka apna internal platform hai:
     <b>Micros</b>, jo AWS regions mein services deploy aur operate karta hai. Aisa
     platform tab nahi dikhta jab sab sthir ho — woh tab dikhta hai jab tumhe <b>failna
     ya phailna</b> ho. Deployment, networking, service discovery aur tooling standard
     hone ki wajah se naye region mein sab kuch khada karna infrastructure project se
     zyada <b>configuration</b> ka kaam ban gaya — engineers ne ek naya region ek hackathon
     mein khada kar diya tha.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Multi-tenant SaaS ka data model chuno',
      instructions: 'Har slot mein ek option. Review par har option ka tark khulega.',
      brief: `Tum ek B2B SaaS bana rahe ho. Customers mein 5 logon ki teams bhi hain aur
        50,000 logon ki enterprises bhi. Enterprise contracts mein "hamara data Europe
        mein rahega" likha hai, aur ek customer ka bhaari kaam doosre ko dikhna nahi
        chahiye.`,
      requirements: [
        'Ek customer ki heavy query doosre customers ko slow na kare',
        'Data residency per customer honi chahiye',
        'Migration ek saath sabki nahi, ek-ek karke ho sake',
        'Team chhoti hai — operational bhaar sochna zaroori hai',
      ],
      pass: 10,
      slots: [
        {
          id: 'store', label: 'Tenant data kahan', icon: '🗄️',
          options: [
            { id: 'perdb', label: 'Har tenant ka apna database (kai databases ek shared instance par)', score: 4, why: 'Jira ka raasta: isolation database boundary par, blast radius ek customer, migration aur residency tenant-by-tenant. Keemat: laakhon databases chalane ka operational bhaar.' },
            { id: 'schema', label: 'Har tenant ka apna schema, ek hi database', score: 2, why: 'Beech ka raasta — isolation logic se behtar hai, par connection aur resource pool phir bhi shared; residency ke liye alag database chahiye hi hoga.' },
            { id: 'shared', label: 'Shared tables + tenant_id column', score: -2, why: 'Sabse sasta aur sabse density wala, par isolation har query ke sahi likhe hone par tikti hai, aur "sirf Europe" wali shart poori karna bahut mushkil.' },
          ],
        },
        {
          id: 'route', label: 'Request ko tenant ka ghar kaise milega', icon: '🧭',
          options: [
            { id: 'tcs', label: 'Ek tenant directory service + har service ke paas local copy (sidecar/cache)', score: 4, why: 'TCS model. Directory ek jagah maintain hoti hai par read local hota hai — na network hop, na har request par remote lookup chain.' },
            { id: 'central', label: 'Har request par central directory ko call karo', score: -1, why: 'Sahi jawab deta hai par har request mein ek round trip aur ek naya failure point. Jira ne isi liye sidecars banaye.' },
            { id: 'hardcode', label: 'Tenant ka shard uske subdomain se calculate kar lo', score: -3, why: 'Tab tenant kabhi move nahi ho sakta — na rebalancing, na residency migration. Mapping hamesha data honi chahiye, code nahi.' },
          ],
        },
        {
          id: 'noisy', label: 'Noisy neighbour se bachav', icon: '🔊',
          options: [
            { id: 'caps', label: 'Har tenant ke connections/resources par sakht limit', score: 3, why: 'Jira ne yahi kiya — per-tenant connection caps. Isolation ka faayda tabhi hai jab ek tenant poora host na kha jaaye.' },
            { id: 'bigger', label: 'Bade servers le lo', score: -2, why: 'Bada server sirf woh din aage khiskata hai jab sabse bada customer usse bhi bada ho jaayega.' },
            { id: 'monitor', label: 'Monitoring lagao aur zaroorat par manually move karo', score: 0, why: 'Zaroori hai par kaafi nahi — insaan ke react karne se pehle padosi gir chuke honge.' },
          ],
        },
        {
          id: 'res', label: 'Data residency', icon: '🌏',
          options: [
            { id: 'realm', label: 'Har tenant ka ek "realm" (allowed regions) centrally store karo, aur routing usse maane', score: 4, why: 'Realms ka model: routing ka jawab "jo nazdeek ho" nahi, "jo realm allow kare" hota hai — aur realm badla toh tenant migrate ho sakta hai.' },
            { id: 'copy', label: 'Sab data har region mein replicate kar do', score: -3, why: 'Yeh residency ka ulta hai — data un jagah bhi chala jaata hai jahan contract mana karta hai.' },
            { id: 'later', label: 'Abhi ek region, baad mein sochenge', score: -1, why: 'Enterprise deal aane par yeh sabse mehenga retrofit ban jaata hai, kyunki tab tak data model residency ke bina bana ho chuka hoga.' },
          ],
        },
      ],
      verdicts: {
        great: '🎉 Yahi Atlassian ka combination hai: per-tenant DB, directory + local copies, per-tenant caps, aur realms.',
        ok: '👍 Chal jaayega, par kisi ek jagah isolation ya residency ki keemat baad mein deni padegi.',
        bad: '⚠️ Is design mein ya isolation application logic par tiki hai, ya tenant kabhi move hi nahi ho sakta.',
      },
    },
    {
      type: 'tradeoff',
      title: 'Isolation vs density lab',
      instructions: 'Ek host par kitne tenants, aur connection cap kitna — dono ghumao.',
      goal: 'Aisi setting dhoondho jahan ek bhaari tenant ke hone par baaki tenants ka p99 <b>200 ms se kam</b> rahe aur infra cost <b>60 units se kam</b> ho.',
      scenario: `Ek Postgres host par kai tenant databases hain. Un mein se ek "monster"
        tenant hai jo baar-baar bhaari reports chalata hai. Host ke paas <b>100
        connections</b> hain.`,
      knobs: [
        { id: 'per', label: 'Ek host par kitne tenants', min: 1, max: 40, step: 1, value: 40, unit: '',
          note: 'Zyada tenants = sasta, par ek dusre ke zyada kareeb.' },
        { id: 'cap', label: 'Per-tenant connection cap', min: 5, max: 100, step: 5, value: 100, unit: '',
          note: 'Cap na ho toh ek tenant poora pool le sakta hai.' },
        { id: 'monster', label: 'Monster tenant ka bhaar', min: 1, max: 10, step: 1, value: 8, unit: '×',
          note: 'Baaki tenants ke mukable kitna traffic.' },
      ],
      readouts: k => {
        const m = tenantModel(k);
        return [
          { label: 'Baaki tenants ka p99', value: m.p99 + ' ms', tone: m.p99 <= 200 ? 'ok' : 'bad' },
          { label: 'Monster tenant ne kitne connections liye', value: m.monsterConns + ' / 100', tone: m.monsterConns <= 40 ? 'ok' : 'bad' },
          { label: 'Infra cost', value: m.cost + ' units', tone: m.cost <= 60 ? 'ok' : 'warn' },
          { label: 'Monster khud kaisa hai', value: m.monsterP99 + ' ms', tone: m.monsterP99 <= 900 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = tenantModel(k);
        return [
          { label: 'Baaki tenants ka p99', pct: Math.min(100, (m.p99 / 1200) * 100), text: m.p99 + ' ms', tone: m.p99 <= 200 ? 'ok' : 'bad' },
          { label: 'Monster ke connections', pct: m.monsterConns, text: m.monsterConns + '%', tone: m.monsterConns <= 40 ? 'ok' : 'bad' },
          { label: 'Cost', pct: Math.min(100, m.cost), text: m.cost + '', tone: m.cost <= 60 ? 'ok' : 'warn' },
        ];
      },
      verdict: k => {
        const m = tenantModel(k);
        if (m.monsterConns > 40) return { ok: false, text: `Monster tenant <b>${m.monsterConns}</b> connections le gaya — baaki sab uske peechhe queue mein hain (p99 <b>${m.p99} ms</b>). Per-tenant cap lagao.` };
        if (m.p99 > 200) return { ok: false, text: `Cap laga hai par host par <b>${k.per}</b> tenants hain — pool ab bhi tang hai, p99 <b>${m.p99} ms</b>. Density thodi kam karo.` };
        if (m.cost > 60) return { ok: false, text: `Isolation acchi hai par sirf <b>${k.per}</b> tenants per host = cost <b>${m.cost}</b> units. Thodi density wapas laao.` };
        return { ok: true, text: `Balance mil gaya: <b>${k.per}</b> tenants per host, cap <b>${k.cap}</b> connections — baaki tenants ka p99 <b>${m.p99} ms</b>, cost <b>${m.cost}</b> units.` };
      },
      check: k => { const m = tenantModel(k); return m.p99 <= 200 && m.cost <= 60 && m.monsterConns <= 40; },
      lesson: `Database-per-tenant apne aap noisy neighbour nahi rokta — woh sirf
        <b>data</b> alag karta hai. Resources (connections, CPU, I/O) tab bhi shared hain,
        isliye per-tenant limits zaroori hain.`,
      quiz: {
        q: 'Per-tenant database hone ke baad bhi noisy neighbour kaise hota hai?',
        choices: [
          'Kyunki kai tenant databases ek hi Postgres host par hote hain — connections, CPU aur disk I/O phir bhi shared hain',
          'Kyunki queries cross-database join karti hain',
          'Kyunki backup ek saath chalta hai',
          'Hota hi nahi — alag database matlab poori isolation',
        ],
        answer: 0,
        explain: 'Isolation sirf data ki hui, resources ki nahi. Isiliye Atlassian per-tenant connection limits lagata hai.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — shared table vs per-tenant DB',
      project: '03-jira',
      exercise: 'ex1-tenant-isolation',
      goal: 'Ek bhoola hua tenant filter aur ek monster tenant — dono ko do models mein chalao aur farq dekho.',
      why: `Service do modes mein chalti hai: <code>TENANCY=shared</code> (ek table,
        tenant_id column) aur <code>TENANCY=perdb</code> (har tenant ka apna database).
        Ek endpoint mein jaan-boojh kar tenant filter chhoda gaya hai.`,
      steps: [
        { text: 'Shared-table mode chalao.', cmd: 'cd docker-labs/03-jira && npm start ex1-tenant-isolation', expect: 'ex1-tenant-isolation\n  api → http://localhost:4301  (TENANCY=shared · pool 40)' },
        { text: 'Leak test chalao — ek tenant ke token se "salary" search karo.', cmd: 'node tools/leak-test.js', expect: 'TENANCY=shared  /search?q=salary → 200 rows   (150 rows DOOSRE tenants ke)   ❌ leak' },
        { text: 'Per-tenant DB mode par jao aur leak test dobara.', cmd: 'TENANCY=perdb npm start ex1-tenant-isolation && node tools/leak-test.js', expect: 'TENANCY=perdb   /search?q=salary → 50 rows   (0 rows DOOSRE tenants ke)   ✅' },
        { text: 'Ab monster tenant ke saath load daalo (abhi bina cap ke).', cmd: 'node tools/noisy.js --monster 25 --others 10 --for 3', expect: 'TENANCY=perdb            others p99: 992 ms   monster p99: 1020 ms   monster ne max 40/40 connections liye' },
        { text: 'Per-tenant connection cap on karke wahi load dobara.', cmd: 'TENANCY=perdb CAP=8 npm start ex1-tenant-isolation && node tools/noisy.js --monster 25 --others 10 --for 3', expect: 'TENANCY=perdb   CAP=8  others p99: 64 ms   monster p99: 12442 ms   monster ne max 8/40 connections liye' },
      ],
      observe: {
        q: 'Per-tenant database par jaane ke baad bhi doosre tenants ka p99 992 ms tha. Cap lagane par 64 ms (aur monster ka p99 12,442 ms). Kyun?',
        choices: [
          'Alag database sirf DATA alag karta hai — connections, CPU aur I/O tab bhi shared the; cap ne resource share bandha',
          'Per-tenant DB mode slow hai',
          'Cap ne queries ko cache kar diya',
          'Monster tenant ne traffic kam kar diya',
        ],
        answer: 0,
        explain: 'Isolation ke do hisse hain: data isolation aur resource isolation. Database boundary pehla deta hai, limits doosra.',
      },
      lesson: 'Multi-tenant design mein hamesha do sawaal alag poochho: "kya ek tenant doosre ka data DEKH sakta hai?" aur "kya ek tenant doosre ko DHEEMA kar sakta hai?"',
    },
  ],
  interview: {
    title: 'Interview Round — multi-tenancy',
    instructions: 'Teen sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Shared tables ya database per tenant?"',
        choices: [
          'Depends: agar blast radius, per-tenant migration aur data residency chahiye toh per-tenant DB, par tab laakhon databases chalane ka operational bhaar uthana padega',
          'Hamesha shared tables — simple hai',
          'Hamesha per-tenant DB — safe hai',
          'Per-tenant schema hamesha sabse behtar hai',
        ],
        answer: 0,
        explain: 'Atlassian ne isolation ko density se upar chuna aur keemat maani. Sahi jawab tumhari shart par nirbhar hai, na ki fashion par.',
      },
      {
        q: 'Interviewer: "Har request ko pehle tenant ka ghar dhoondhna padta hai. Design?"',
        choices: [
          'Ek directory service jo read-optimised ho, aur har service ke paas uski local copy (sidecar/cache) — taaki request path mein remote call na ho',
          'Har request par central directory call, simple rakho',
          'Tenant id se shard calculate kar lo',
          'Har service apni copy rakhe aur khud update kare',
        ],
        answer: 0,
        explain: 'TCS ka model: central source of truth, local reads. Calculate karna mapping ko code mein jama deta hai — phir tenant kabhi move nahi ho sakta.',
      },
      {
        q: 'Interviewer: "Ek customer contract mein likha hai ki data Europe se bahar nahi jaayega. Kaise nibhaoge?"',
        choices: [
          'Har tenant ke saath allowed regions ka set (realm) centrally rakho, aur routing/placement ke har faisle ko usse maanne par majboor karo',
          'Sab kuch Europe mein rakh do',
          'Data encrypt kar do, phir kahin bhi rakho',
          'Sirf backups Europe mein rakho',
        ],
        answer: 0,
        explain: 'Realm ko data banao, code ki shart nahi — tabhi tenant migrate bhi ho sakta hai jab regulation ya market badle.',
      },
    ],
  },
  success: [
    'Main tenancy models ka faisla blast radius aur residency ke hisaab se le sakta hoon',
    'Main data isolation aur resource isolation ko alag-alag dekh sakta hoon',
    'Main tenant routing ko read-optimised + locally cached banana jaanta hoon',
  ],
  homework: `<p>Apne system mein "tenant" ya "workspace" jaisi cheez dhoondho. Ab do
    sawaal likho: (1) agar kisi query se <code>tenant_id</code> filter chhoot jaaye toh
    kya hoga? (2) agar ek customer 10× traffic bhej de toh baaki customers ko kya
    mehsoos hoga? Dono ke jawab mein jo bhi "pata nahi" hai, wahi tumhara agla kaam hai.</p>`,
  cards: [
    { front: 'Jira ka tenancy model?', back: 'Database per tenant — laakhon tenant databases shared Postgres instances par. Isolation database boundary par, na ki application logic par.' },
    { front: 'Per-tenant DB ke teen faayde?', back: 'Blast radius ek customer tak, migration tenant-by-tenant, aur data residency (ek tenant ko doosre region mein le jao).' },
    { front: 'Jira mein "shard" kya hai?', back: 'Platform ka slice: web servers + worker nodes + ek Postgres instance jisme us shard ke tenant databases rehte hain. Naya customer kisi shard par rakha jaata hai.' },
    { front: 'TCS kya hai?', back: 'Tenant Context Service — directory jo batati hai tenant kis region/shard/DB mein hai, features aur licence kya hain. Dasiyon hazaar req/s per region, single-digit ms, read-optimised, aur hazaron sidecars local copy rakhte hain.' },
    { front: 'Realm kya hai?', back: 'Un regions ka set jahan tenant ka data reh sakta hai (data residency). Routing ka jawab "jo nazdeek ho" nahi, "jo realm allow kare" hota hai.' },
  ],
},
]);

function tenantModel(k) {
  const pool = 100;                                   /* host ke kul connections */
  const monsterConns = Math.min(k.cap, Math.min(pool, k.monster * 12));
  const otherShare = Math.max(0.05, (pool - monsterConns) / Math.max(1, k.per - 1));
  const p99 = Math.max(12, Math.round(60 / otherShare));
  const monsterP99 = Math.round(200 + (k.monster * 1200) / Math.max(1, monsterConns));
  const cost = Math.round(2000 / Math.max(1, k.per));  /* kam tenants per host = zyada hosts */
  return { p99, monsterConns, monsterP99, cost };
}


/* =====================================================================
   LEVEL 2 — INDEX EK COPY HAI
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-jira-index',
  icon: '🔎',
  title: 'Jira — har copy drift karti hai',
  badge: 'Reconcile Rakshak',
  objectives: [
    'Search index source of truth nahi — ek copy hai',
    'Full re-index kyun paida hua, aur woh itna mehenga kyun tha',
    'Reconciliation loop: database hi index ka checklist ban jaata hai',
    'Zero-downtime reindex: alag banao → replay karo → atomic switch',
  ],
  lesson: [
    `<h3>🔎 Search database par nahi chalti</h3>
     <p>Jira ki search database par nahi chalti — woh bahut dheemi hoti. Jira ek alag
     search index rakhti hai (historically Lucene par bana, aaj OpenSearch). Har issue
     ek searchable document ban jaata hai, aur user ki query index par chalti hai,
     tables par nahi.</p>
     <p>Isme sabse zaroori baat yeh hai: <b>index source of truth nahi hai — woh ek copy
     hai</b>. Aur jab bhi tum kisi data ki copy rakhte ho, tumhe ek nayi problem mil
     jaati hai: <b>copy ko original ke saath sync rakhna</b>.</p>
     <h3>😱 Aur phir "full re-index" paida hota hai</h3>
     <p>Chhote changes aasan hain: issue badla, uska document update kar do. Par kuch
     changes chaude hote hain — naya calculated custom field, field configuration ka
     badlav, visibility rule ka badlav. Ab ek issue galat nahi hua — <b>hazaron ya
     laakhon documents</b> galat ho sakte hain.</p>
     <p>Aur sawaal aata hai: <b>inme se kaun se documents dobara banane hain?</b>
     Historically iska jawab saaf nahi tha. Galat search results dene se behtar safe
     option yahi laga: <b>poora index dobara bana do</b>.</p>
     <pre>Bade Jira instance par full re-index:
   ghanton chalta tha
   bahut saara CPU aur RAM kha jaata tha
   system par load daalta tha (jabki users kaam kar rahe hote the)
   beech mein fail ho gaya  →  adhoora, locked ya corrupt index</pre>
     <p class="tip">🎯 Asli problem Lucene nahi thi — problem <b>architecture</b> thi.
     Search ek copy par nirbhar thi, aur us copy ke sach se hat jaane par wapas laane ka
     koi sasta tareeka nahi tha.</p>`,
    `<h3>✅ Naya soch: index khud ko VERIFY karta rahe</h3>
     <p>Jira ne index ko "kabhi-kabhi dobara banane wali cheez" maanna band kar diya aur
     usse aisa system maan liya jo <b>lagatar apne aap ko database se milaata rehta hai</b>.</p>
     <pre>1. Issue badla  →  change search cluster ko push karo
2. Uske SAATH database mein likho: "document X, version N index mein hona chahiye"
3. Har minute ek reconciliation job poochhta hai:
      jo documents hone chahiye, woh hain?
      aur sahi VERSION par hain?
   → missing  →  index karo
   → purana version  →  update karo
   → beech mein kho gaya  →  agli baar pakda jaayega</pre>
     <p>Is tarah <b>database hi index ka checklist ban jaata hai</b>. Index ko sahi
     <b>maan</b>-ne ke bajaye Jira lagatar <b>check</b> karta hai ki woh sahi hai.</p>
     <h3>🔁 Aur reindex bhi ab disruptive nahi</h3>
     <p>Purana tareeka: live index ko replace karo (isliye dard). Naya tareeka:</p>
     <pre>1. Naya index PURANE KE SAATH banao — searches purane par chalti rehti hain
2. Build ke dauraan jo changes hue, unhe replay karo — naya index "abhi" tak aa jaata hai
3. Ek ATOMIC operation mein search traffic naye index par switch kar do</pre>
     <p>User ko kuch pata nahi chalta.</p>
     <p class="tip">🎯 Yeh sabak Jira se bahut aage jaata hai: <b>koi bhi</b> search
     index, cache, replica ya derived view banana mushkil nahi hai — usse <b>sahi rakhna</b>
     mushkil hai. Jo systems tikte hain woh yeh maan kar chalte hain ki <b>drift hogi
     hi</b>, aur lagatar reconcile karte rehte hain.</p>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — "search results galat aa rahe hain"',
      instructions: 'Timeline chalao. Jahan sawaal aaye, wahan rukega.',
      incident: 'Jira jaisa search index — drift se outage tak',
      goal: 'Drift ko pakdo aur sahi kadam chuno — bina poora index dobara banaye.',
      speedMs: 1800,
      metrics: [
        { id: 'drift', label: 'Galat/missing documents', unit: 'k', max: 500, dir: 'lower' },
        { id: 'p99', label: 'Search p99', unit: 'ms', max: 4000, dir: 'lower' },
        { id: 'tickets', label: 'Support tickets', unit: '', max: 200, dir: 'lower' },
      ],
      frames: [
        { t: '09:00', event: 'Sab normal. Index database ke saath sync hai, reconciliation job har minute chal raha hai.', metrics: { drift: 0, p99: 120, tickets: 0 } },
        { t: '09:20', event: 'Ek admin ne naya <b>calculated custom field</b> add kiya jo saare issues par laagu hota hai.', metrics: { drift: 0, p99: 130, tickets: 0 }, note: 'Ek config change — par asar har document par.' },
        { t: '09:24', event: 'Indexing pipeline mein backlog banna shuru — laakhon documents ko naye field ke saath dobara likhna hai.', metrics: { drift: 90, p99: 180, tickets: 2 }, tone: 'warn',
          ask: { q: 'Yahan sabse pehle kya dekhoge?',
                 choices: [
                   'Reconciliation ka backlog aur uski rate — kitne documents "hone chahiye" par abhi nahi hain',
                   'Search cluster ka CPU',
                   'Kitne users complain kar rahe hain',
                   'Database ka slow query log',
                 ], answer: 0,
                 explain: 'Database mein har document ka expected version likha hai. Backlog ka size aur drain rate hi asli sawaal ka jawab dete hain: "kitna galat hai aur kab tak theek hoga?"',
                 wrongHints: [
                   'CPU high hoga hi — par woh batata nahi ki kitne documents galat hain.',
                   'Tickets aane mein deri hoti hai; tab tak drift kaafi badh chuki hoti hai.',
                   'Database theek hai — sach wahin hai. Copy peechhe reh gayi hai.',
                 ] } },
        { t: '09:40', event: 'Ek network blip — kuch index writes gir gaye. Ab drift badh rahi hai aur users ko <b>purane</b> results dikh rahe hain.', metrics: { drift: 240, p99: 260, tickets: 28 }, tone: 'bad' },
        { t: '09:55', event: 'Ek engineer kehta hai: "poora re-index kar dete hain".', metrics: { drift: 320, p99: 900, tickets: 64 }, tone: 'bad',
          ask: { q: 'Full re-index ab kya karega?',
                 choices: [
                   'Ghanton lagega aur system par bhaari load daalega, jabki reconciliation job pehle se sirf galat documents theek kar sakta hai',
                   'Turant sab theek kar dega — sabse safe option hai',
                   'Kuch nahi karega, index pehle se sahi hai',
                   'Search band kar dega par data safe rahega',
                 ], answer: 0,
                 explain: 'Full re-index purana jawab tha jab yeh pata hi nahi chalta tha ki kaun se documents galat hain. Ab database mein expected versions hain — sirf farq theek karo.',
                 wrongHints: [
                   'Re-index "safe" lagta hai par ghanton ka load aur beech mein fail hone ka khatra saath laata hai.',
                   'Index sahi nahi hai — 3.2 lakh documents galat hain.',
                   'Search band karna dard ko outage bana dega.',
                 ] } },
        { t: '10:05', event: 'Reconciliation ki concurrency badhayi gayi aur usne missing/stale documents ko pakad kar dobara index karna shuru kiya.', metrics: { drift: 120, p99: 300, tickets: 70 }, tone: 'warn' },
        { t: '10:30', event: 'Drift lagbhag zero. Search results sahi. Poora index kabhi dobara nahi banana pada.', metrics: { drift: 4, p99: 140, tickets: 71 }, tone: 'ok',
          ask: { q: 'Aage aisa dobara na ho — sabse zaroori badlav?',
                 choices: [
                   'Har change ke saath expected document + version database mein likho, aur reconciliation ko lagatar chalao — drift ko rokna nahi, pakadna aasan banao',
                   'Indexing ko synchronous kar do taaki write tabhi complete ho jab index bhi update ho',
                   'Custom fields par rok laga do',
                   'Search cluster bada kar do',
                 ], answer: 0,
                 explain: 'Synchronous indexing har write ko dheema aur naazuk bana deta hai (index down = writes down). Jira ka jawab reconciliation hai: drift hogi, par usse detect aur repair karna sasta hona chahiye.',
                 wrongHints: [
                   'Synchronous karne se search cluster har write ka dependency ban jaata hai — availability girti hai.',
                   'Custom fields product ka feature hain, unhe rokna jawab nahi.',
                   'Bada cluster drift theek nahi karta, sirf tezi se galat jawab deta hai.',
                 ] } },
      ],
      lesson: `Har derived copy (index, cache, replica, materialized view) drift karegi.
        Sawaal yeh nahi ki drift roki kaise jaaye — sawaal yeh hai ki <b>drift pakadna aur
        theek karna kitna sasta hai</b>.`,
    },
    {
      type: 'order',
      title: 'Zero-downtime reindex — sahi kram',
      instructions: 'Live system par index dobara banane ka sahi kram lagao.',
      steps: [
        { text: 'Naya index live index ke SAATH banana shuru karo', explain: 'Purana index chalta rehta hai — searches chalti rehti hain.' },
        { text: 'Build ke dauraan hue saare changes record karte raho', explain: 'Build mein waqt lagega, aur us dauraan data badalta rahega.' },
        { text: 'Build poora hone par recorded changes naye index par replay karo', explain: 'Yahan naya index "abhi" tak pahunchta hai.' },
        { text: 'Ek atomic operation mein search traffic naye index par switch karo', explain: 'Switch ek hi step mein — warna kuch users purane aur kuch naye index par chale jaayenge.' },
        { text: 'Purana index kuch der rakho, phir hata do', explain: 'Rollback ka raasta khula rehta hai — agar naye index mein kuch galat mile toh wapas switch kar sakte ho.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Reconciliation lab — kitni baar, kitni tezi se',
      instructions: 'Reconcile interval aur concurrency badlo. Drift aur load dono dekho.',
      goal: 'Aisi setting dhoondho jahan sabse zyada drift <b>5,000 documents se kam</b> rahe aur database par reconciliation ka load <b>25% se kam</b> ho.',
      scenario: `1 crore documents. Roz lagbhag <b>2%</b> writes index tak nahi pahunchte
        (network blips, restarts, dropped messages). Reconciliation job database se
        expected versions padh kar farq theek karta hai.`,
      knobs: [
        { id: 'interval', label: 'Reconcile har kitni der mein', min: 1, max: 60, step: 1, value: 60, unit: ' min',
          note: 'Jitni der, utni drift jama hogi.' },
        { id: 'conc', label: 'Reconcile concurrency', min: 1, max: 20, step: 1, value: 1, unit: '',
          note: 'Zyada concurrency = tez repair, par database par zyada load.' },
        { id: 'scope', label: 'Kya check karein (0 = sirf naye changes · 1 = poora dataset)', min: 0, max: 1, step: 1, value: 1, unit: '',
          note: 'Poora dataset check karna sabse pukhta hai par sabse mehenga.' },
      ],
      readouts: k => {
        const m = reconcileModel(k);
        return [
          { label: 'Sabse zyada drift', value: m.drift.toLocaleString('en-IN') + ' docs', tone: m.drift <= 5000 ? 'ok' : 'bad' },
          { label: 'Database par load', value: m.load + '%', tone: m.load <= 25 ? 'ok' : 'bad' },
          { label: 'Galat result ki window', value: m.windowMin + ' min', tone: m.windowMin <= 10 ? 'ok' : 'warn' },
          { label: 'Missed delete/rare case pakda jaayega?', value: k.scope === 1 ? 'haan' : 'shayad nahi', tone: k.scope === 1 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = reconcileModel(k);
        return [
          { label: 'Drift', pct: Math.min(100, (m.drift / 50000) * 100), text: m.drift.toLocaleString('en-IN'), tone: m.drift <= 5000 ? 'ok' : 'bad' },
          { label: 'DB load', pct: Math.min(100, m.load), text: m.load + '%', tone: m.load <= 25 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = reconcileModel(k);
        if (k.scope === 1 && m.load > 25) return { ok: false, text: `Poora dataset har baar check karna sabse pukhta hai par database par <b>${m.load}%</b> load daal raha hai. Aam din ke liye sirf naye changes check karo aur poora sweep kabhi-kabhi chalao.` };
        if (m.drift > 5000) return { ok: false, text: `Drift <b>${m.drift.toLocaleString('en-IN')}</b> documents tak pahunch rahi hai — interval <b>${k.interval} min</b> bahut lamba hai ya concurrency <b>${k.conc}</b> bahut kam.` };
        if (m.load > 25) return { ok: false, text: `Load <b>${m.load}%</b> hai. Concurrency thodi kam karo ya interval thoda badhao.` };
        return { ok: true, text: `Balance mil gaya: har <b>${k.interval} min</b>, concurrency <b>${k.conc}</b> — drift <b>${m.drift.toLocaleString('en-IN')}</b> documents, DB load <b>${m.load}%</b>.` };
      },
      check: k => { const m = reconcileModel(k); return m.drift <= 5000 && m.load <= 25; },
      lesson: `Reconciliation ke do knob hain: <b>kitni jaldi pakdo</b> (interval) aur
        <b>kitni tezi se theek karo</b> (concurrency). Aur ek teesra faisla: roz sirf
        naye changes check karo, poora sweep kabhi-kabhi.`,
      quiz: {
        q: 'Reconciliation ke bajaye indexing ko synchronous kar dein toh?',
        choices: [
          'Har write ab search cluster par nirbhar ho jaayegi — index down hua toh writes bhi band',
          'Sab theek ho jaayega, drift hogi hi nahi',
          'Writes tez ho jaayengi',
          'Index chhota ho jaayega',
        ],
        answer: 0,
        explain: 'Synchronous indexing drift hatata hai par availability ki keemat par. Isiliye Jira ne "assume drift, reconcile continuously" chuna.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — drift banao, phir reconcile karo',
      project: '03-jira',
      exercise: 'ex2-index-reconcile',
      goal: 'Index mein jaan-boojh kar drift paida karo, reconciliation loop se usse theek karo, aur alag-index-swap wala reindex chala kar dekho.',
      why: `Lab mein ek chhota "search index" hai jo database se alag rehta hai. Tum
        <code>DROP_RATE</code> se index writes girwa sakte ho aur reconciliation loop
        ko on/off kar sakte ho.`,
      steps: [
        { text: 'Service chalao (10% index writes girengi, reconcile band).', cmd: 'cd docker-labs/03-jira && npm start ex2-index-reconcile', expect: 'ex2-index-reconcile\n  index-api → http://localhost:4310  (DROP_RATE=0.1 RECONCILE=off)' },
        { text: '5,000 issues likho aur drift naapo.', cmd: 'node tools/drift.js --writes 5000', expect: 'wrote 5000 issues   db: 5000   index: 4521   drift: 479 missing / 0 stale   ❌ search 9.6% issues galat dikha raha hai' },
        { text: 'Reconciliation on karo aur drift dobara naapo.', cmd: 'node tools/reconcile-on.js && node tools/drift.js --wait 1500', expect: 'reconcile: on\ndb: 5000   index: 5000   drift: 0 missing / 0 stale   ✅   (reconcile passes: 2, repaired: 479)' },
        { text: 'Purana tareeka: live index ko hi rebuild karo, aur beech mein searches chalte rakho.', cmd: 'node tools/reindex.js --mode in-place', expect: 'reindex mode=in-place time: 1022 ms   docs: 5000   searches ok: 87   searches GALAT: 71' },
        { text: 'Ab shadow index + atomic switch wala tareeka.', cmd: 'node tools/reindex.js --mode swap', expect: 'reindex mode=swap     time: 1027 ms   docs: 5000   replayed: 0   searches ok: 154   searches GALAT: 0' },
      ],
      observe: {
        q: 'In-place rebuild ke dauraan 71 searches galat jawab de rahi thin; shadow + swap mein 0. Asli farq kya tha?',
        choices: [
          'Shadow build ke dauraan purana index poori tarah serve karta raha, aur switch ek hi step mein hua',
          'Shadow build tez tha',
          'In-place rebuild ne zyada documents banaye',
          'Atomic switch ne cache kar liya',
        ],
        answer: 0,
        explain: 'Zero-downtime ka rahasya "tez banana" nahi, "purane ko chalne dena" hai — aur switch ko ek atomic step rakhna.',
      },
      lesson: 'Derived data ke do niyam: (1) expected version database mein likho aur reconcile karte raho, (2) rebuild karna ho toh alag banao, replay karo, phir ek hi step mein switch.',
    },
  ],
  interview: {
    title: 'Interview Round — derived data',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Tumhara search index database se out of sync ho jaata hai. Kya karoge?"',
        choices: [
          'Har change ke saath expected document + version database mein likho, aur ek background job lagatar farq dhoondh kar theek kare',
          'Har raat poora index dobara bana do',
          'Indexing synchronous kar do',
          'Search ke result ko database se verify karo',
        ],
        answer: 0,
        explain: 'Full rebuild mehenga hai aur synchronous indexing availability kha jaata hai. Reconciliation drift ko sasta bana deta hai.',
      },
      {
        q: 'Interviewer: "Live system par index rebuild karna hai. Plan?"',
        choices: [
          'Shadow index alag banao, build ke dauraan hue changes replay karo, phir ek atomic switch — aur purana index rollback ke liye kuch der rakho',
          'Maintenance window lo aur index rebuild karo',
          'Index delete karke dobara bana do, thodi der search band rahegi',
          'Har shard ko ek-ek karke rebuild karo, search wahi rahegi',
        ],
        answer: 0,
        explain: 'Yahi modern reindex pattern hai, aur yahi database migration mein bhi (dual write + backfill + switch) dikhta hai.',
      },
    ],
  },
  success: [
    'Main derived copies ke liye reconciliation loop design kar sakta hoon',
    'Main zero-downtime reindex ka kram bata sakta hoon',
    'Main "drift rokna" aur "drift sasta pakadna" ka farq samajhta hoon',
  ],
  homework: `<p>Apne system ki har derived copy likho (search index, cache, read replica,
    materialized view, analytics table). Har ek ke saamne likho: "agar yeh chupchap galat
    ho jaaye toh kitni der mein pata chalega?" Jiske saamne "pata nahi" ho, wahan pehle
    ek reconciliation check likho.</p>`,
  cards: [
    { front: 'Jira ka search index source of truth hai?', back: 'Nahi — woh ek COPY hai. Isi wajah se drift hoti hai, aur isi wajah se "full re-index" ka dard paida hua tha.' },
    { front: 'Reconciliation loop kaise kaam karta hai?', back: 'Har change ke saath database mein expected document + version likho. Background job har minute poochhta hai: documents maujood hain? sahi version par? Nahi → dobara index karo. Database index ka checklist ban jaata hai.' },
    { front: 'Zero-downtime reindex ke teen kadam?', back: '(1) naya index purane ke saath banao, (2) build ke dauraan hue changes replay karo, (3) ek atomic switch. Purana index rollback ke liye kuch der rakho.' },
    { front: 'Synchronous indexing kyun nahi?', back: 'Woh drift toh hata deta hai par har write ko search cluster par nirbhar bana deta hai — index down matlab writes down.' },
  ],
},
]);

function reconcileModel(k) {
  const dailyMissed = 1e7 * 0.02;                       /* roz kitne writes index tak nahi pahunchte */
  const perMin = dailyMissed / (24 * 60);
  const drift = Math.round(perMin * k.interval);
  const repaired = k.conc * 900 * k.interval;            /* ek pass mein kitna theek ho sakta hai */
  const backlog = Math.max(0, drift - repaired);
  const load = Math.min(100, Math.round((k.scope === 1 ? 14 : 2) * k.conc + (k.scope === 1 ? 8 : 1)));
  return { drift: drift + backlog, load, windowMin: k.interval };
}

/* =====================================================================
   LEVEL 3 — JQL COMPILE HOTI HAI, aur PERMISSIONS ANDAR JAATI HAIN
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-jira-query',
  icon: '🧩',
  title: 'Jira — query compile hoti hai, permissions andar jaati hain',
  badge: 'Query Karigar',
  objectives: [
    'JQL text nahi — parse, resolve, expand, plan',
    'Permissions ko result par filter karne ki asli keemat',
    'Permissions ko query ke andar daalna',
    'Index ko tenant + project se partition karna',
  ],
  lesson: [
    `<h3>🧩 "project = payments" ka index ke liye koi matlab nahi</h3>
     <p>Tum likhte ho:</p>
     <pre>project = payments AND assignee = currentUser() ORDER BY created</pre>
     <p>Search engine is text ko waise chala hi nahi sakta. Index insaan ke naam nahi
     jaanta — woh <b>internal ids</b> jaanta hai. Isliye Jira query ko chalane se pehle
     usse <b>compile</b> karta hai:</p>
     <pre>1. PARSE     — JQL ka structure samjho
2. RESOLVE   — project naam → project id · user naam → user id · group → user ids ka set
3. EXPAND    — currentUser() kaun hai? membersOf(developers) mein abhi kaun hai?
4. PLAN      — index ke liye ek execution plan banao</pre>
     <p>Point 3 khaas hai: kuch cheezein <b>query ke waqt hi</b> khul sakti hain.
     <code>currentUser()</code> is baat par nirbhar hai ki request kisne bheji;
     <code>membersOf(developers)</code> is baat par ki abhi us group mein kaun hai.</p>
     <p class="tip">🎯 Soch badlo: JQL ek search string nahi, ek <b>chhoti programming
     language</b> hai. Jira usse parse karta hai, identifiers resolve karta hai, dynamic
     functions expand karta hai, validate karta hai aur execution plan banata hai —
     <b>Jira text execute nahi karta, query compile karta hai</b>.</p>`,
    `<h3>🔐 Aur ab sabse mushkil hissa — permissions</h3>
     <p>Matching issues dhoondhna aasan hai. <b>Aise matching issues dhoondhna jo yeh
     user dekh sakta ho</b> mushkil hai. Jira ka permission model chhota nahi hai: project,
     role, group membership, issue-level security, aur kuch rules to issue ke content par
     hi depend karte hain (reporter apna issue dekh sakta hai, assignee dekh sakta hai).</p>
     <p>Seedha tareeka yeh hai: search chalao, saare matching issues lo, phir har ek par
     permission check karo. Jira ke paimane par yeh aafat hai:</p>
     <pre>query 10,00,000 issues match karti hai
user ko chahiye  →  pehle 20
naive tareeka    →  10,00,000 permission checks, sirf 20 rows dikhane ke liye</pre>
     <p>Jira ka tareeka ulta hai: <b>permissions ko search ke andar daal do</b>.</p>
     <ul>
       <li>Project-level permissions <b>index mein hi</b> baithi hain — engine poore
       sets ko scoring se pehle hi hata deta hai.</li>
       <li>Dynamic rules (current user, uske groups, uske grants) search ke waqt gather
       karke <b>query ke andar</b> daal di jaati hain.</li>
     </ul>
     <p>Jab query index tak pahunchti hai, engine ko pehle se pata hai ki user kya dekh
     sakta hai. <b>Permissions results par filter nahi hain — woh query ka hissa hain.</b>
     Sabse tez permission check woh hai jo karna hi na pade.</p>
     <h3>📦 Ek aur chaal: index bhi partitioned hai</h3>
     <p>Index ek bada pool nahi hai — woh <b>tenant aur project</b> se partitioned hai,
     aur ek project ke issues ek hi shard par rehte hain. Zyadatar searches poore org ke
     baare mein nahi hoti: "payments ke open bugs", "mobile ke high priority issues",
     "infrastructure mein mere assigned issues". Isliye query sirf un shards par jaati
     hai jinme woh projects hain.</p>
     <p class="tip">🎯 Ek line mein: <b>jo saath mein query hota hai, woh saath mein
     rehna chahiye.</b> Physical layout ko query pattern se milane se woh kaam hi khatam
     ho jaata hai jo kabhi zaroori nahi tha.</p>
     <h3>🏷️ ARI — ek primitive jo sab jagah chalta hai</h3>
     <p>Permissions Jira mein bhi hain, Confluence mein bhi, Bitbucket mein bhi. Comments,
     mentions aur notifications bhi. Har product ke liye alag-alag banana matlab wahi
     problem baar-baar solve karna. Isliye Atlassian ne ek common primitive banaya —
     <b>ARI (Atlassian Resource Identifier)</b>. Har important object ko ek ARI milti hai:
     Jira issue, Confluence page, Bitbucket pull request.</p>
     <p>Ab shared services ko yeh jaanne ki zaroorat hi nahi ki woh kis product ke saath
     kaam kar rahe hain. Permission service sirf itna poochhta hai: <b>"kya yeh user is
     resource ko padh sakta hai?"</b> — aur resource ek ARI hai. <b>Primitive standard
     karo, shared services apne aap simple ho jaate hain.</b></p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — permission checks ka bill',
      goal: 'Numbers se samjho ki "pehle search, phir filter" kyun nahi chalta.',
      problems: [
        {
          q: 'Query 10 lakh issues match karti hai aur user ko sirf pehle 20 chahiye. Naive tareeke mein kitne permission checks honge?',
          unit: 'checks', given: ['10,00,000 matching issues', 'har issue par ek check'],
          answer: 1000000, tol: 0.3,
          steps: ['Saare matching issues par check karna padta hai kyunki pata nahi kaun se 20 visible honge', '10,00,000 checks — 20 rows ke liye'],
          lesson: 'Kaam result set ke size par nirbhar hai, page size par nahi. Yahi galat hai.',
        },
        {
          q: 'Har permission check 0.05 ms leta hai. 10 lakh checks mein kitne SECOND lagenge?',
          unit: 'second', given: ['10,00,000 checks', '0.05 ms per check'],
          answer: 50, tol: 0.3,
          steps: ['10,00,000 × 0.05 ms = 50,000 ms', '= 50 second — ek search box ke liye'],
          lesson: 'Isi liye permissions query ke andar jaati hain: engine un issues ko chhoota hi nahi jo user dekh hi nahi sakta.',
        },
        {
          q: 'Ek org mein 2,000 projects hain aur query sirf 3 projects ko chhooti hai. Index partitioned ho toh kitne PERCENT index par query jaayegi?',
          unit: '%', given: ['2,000 projects', '3 projects chahiye'],
          answer: 0.15, tol: 0.4,
          steps: ['3 / 2000 = 0.0015 = 0.15%', 'Yaani 99.85% index ko chhua hi nahi jaata'],
          lesson: 'Layout ko access pattern se milane se sabse bada kaam — na chhune wala data — apne aap kat jaata hai.',
        },
      ],
    },
    {
      type: 'order',
      title: 'JQL compile pipeline — sahi kram',
      instructions: 'Ek JQL query ke saath kya-kya hota hai, sahi kram mein lagao.',
      steps: [
        { text: 'JQL text ko parse karke uska structure banao', explain: 'Yahin syntax errors pakde jaate hain — jaise kisi bhi language ke compiler mein.' },
        { text: 'Naam ko internal ids mein resolve karo (project → project id, user → user id)', explain: 'Index ko "payments" ka matlab nahi pata, use id pata hai.' },
        { text: 'Dynamic functions expand karo — currentUser(), membersOf(developers)', explain: 'Yeh values request ke waqt hi pata chalti hain: kaun poochh raha hai aur us group mein abhi kaun hai.' },
        { text: 'User ki permissions, groups aur grants gather karke query mein daal do', explain: 'Permissions filter nahi, query ka hissa ban jaati hain.' },
        { text: 'Execution plan banao aur sirf un index shards par bhejo jinme woh projects hain', explain: 'Tenant + project se partitioned index — 99% shards ko chhua hi nahi jaata.' },
        { text: 'Matching issue ids se tenant ke apne database se poore rows utha lo', explain: 'Index sirf ids deta hai; asli data tenant ke Postgres se aata hai.' },
      ],
    },
    {
      type: 'archdiff',
      title: 'Search architecture review — teen galtiyan',
      brief: `Ek team ne multi-tenant search banaya hai. 2,000 projects, 1 crore issues,
        aur permission model mein project roles + issue-level security dono hain.
        Teen galtiyan dhoondho.`,
      goal: 'Teen flaws par click karo. Sahi boxes ka tark bhi khulega.',
      nodes: [
        { id: 'parse', label: 'Query parser', sub: 'JQL → AST → ids resolve', row: 0 },
        { id: 'filter', label: 'Permission filter', sub: 'search ke BAAD har result par check', row: 0 },
        { id: 'index', label: 'Index', sub: 'ek hi bada index, sab tenants ek saath', row: 1 },
        { id: 'recon', label: 'Reconcile job', sub: 'har minute expected vs actual versions', row: 1 },
        { id: 'page', label: 'Pagination', sub: 'offset — page 500 tak jaa sakte ho', row: 1 },
        { id: 'db', label: 'Tenant DB', sub: 'ids se poore issues fetch', row: 2 },
      ],
      flaws: [
        { id: 'filter', why: 'Search ke baad filter karna matlab match hue har issue par permission check. 10 lakh match, 20 chahiye — 10 lakh checks. Permissions query ke andar honi chahiye.' },
        { id: 'index', why: 'Ek hi bada index matlab har query poore dataset ko chhooti hai, aur ek tenant ka bhaari load sabko dheema karta hai. Index ko tenant + project se partition karo.' },
        { id: 'page', why: 'Offset pagination gehre page par poora prefix scan karwati hai (page 500 = 10,000 rows chhod kar 20 lena). Search results ke liye cursor/search-after chahiye.' },
      ],
      fine: {
        parse: 'Query ko parse karke ids resolve karna bilkul sahi hai — yahi "compile, execute nahi" wala tark hai.',
        recon: 'Reconciliation job sahi hai: index ek copy hai, isliye lagatar verify karna hi behtar hai.',
        db: 'Index se ids aur tenant DB se poore rows — yeh standard pattern hai, kyunki index par poora document rakhna aur usse sync rakhna aur mehenga padta hai.',
      },
      lesson: `Search design ke teen sawaal: <b>permissions kahan lagti hain</b>,
        <b>index kis hisaab se bata hua hai</b>, aur <b>gehre pages kaise handle hote
        hain</b>.`,
    },
    {
      type: 'docker',
      title: '🐳 Lab — permissions filter ke baad vs query ke andar',
      project: '03-jira',
      exercise: 'ex3-permission-search',
      goal: '10 lakh issues par dono tareeke chala kar checks, latency aur pages compare karo.',
      why: `Search service do modes mein chalti hai: <code>PERM=after</code> (search karo
        phir har result par permission check) aur <code>PERM=inside</code> (user ke
        visible project set + grants ko query mein daal do).`,
      steps: [
        { text: 'Dataset load karo (3 lakh issues, 2,000 projects, 64 shards).', cmd: 'cd docker-labs/03-jira && npm start ex3-permission-search', expect: 'ex3-permission-search\n  search → http://localhost:4320  (3,00,000 issues · 2000 projects · 64 shards · PERM=after)' },
        { text: 'Filter-after mode mein search chalao.', cmd: 'node tools/search.js --user analyst', expect: 'PERM=after  matched: 2,00,000   permission checks: 2,00,000   scanned: 3,00,000   shards touched: 64/64   time: 699 ms   returned: 20' },
        { text: 'Permissions ko query ke andar daal kar dobara.', cmd: 'PERM=inside npm start ex3-permission-search && node tools/search.js --user analyst', expect: 'PERM=inside matched: 8,000   permission checks: 20   scanned: 3,00,000   shards touched: 64/64   time: 63 ms   returned: 20' },
        { text: 'Ab project-scoped query chalao aur dekho kitne shards chhue gaye.', cmd: 'node tools/search.js --user analyst --project 7', expect: 'PERM=inside matched: 100   permission checks: 0   scanned: 150   shards touched: 1/64   time: 41 ms   returned: 20' },
      ],
      observe: {
        q: 'PERM=inside mein permission checks 2 lakh se 20 kaise ho gaye?',
        choices: [
          'Kyunki user ke visible projects ka set query mein chala gaya — jo issues user dekh hi nahi sakta, engine ne unhe chhua hi nahi',
          'Kyunki results cache ho gaye',
          'Kyunki matched issues kam ho gaye',
          'Kyunki pagination ne kaam kam kar diya',
        ],
        answer: 0,
        explain: 'Sabse tez permission check woh hai jo karna hi na pade. Bache hue 20 checks sirf un issues par the jinme issue-level security thi.',
      },
      lesson: 'Jab bhi "filter baad mein karenge" sunn-o, poochho: <b>filter se pehle kitna kaam ho chuka hoga?</b>',
    },
  ],
  interview: {
    title: 'Interview Round — search + permissions',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Search results par permissions kaise lagaoge?"',
        choices: [
          'User ke visible scopes (projects/teams) index mein rakho aur query ke andar daal do; sirf content-dependent rare cases post-filter karo',
          'Search ke baad har result par permission service call karo',
          'Har user ke liye alag index banao',
          'Frontend par chhupa do',
        ],
        answer: 0,
        explain: 'Post-filtering ka kaam result-set ke size par nirbhar karta hai, page size par nahi — isi wajah se woh scale nahi karta.',
      },
      {
        q: 'Interviewer: "Index kis hisaab se partition karoge?"',
        choices: [
          'Us cheez se jisse zyadatar queries filter karti hain (tenant + project) — taaki ek query kuch shards ko chhoo kar nikal jaaye',
          'Random hash se, taaki load barabar rahe',
          'Time se, kyunki naye issues zyada padhe jaate hain',
          'User se, kyunki har user apna data dekhta hai',
        ],
        answer: 0,
        explain: 'Random hash load to barabar karta hai par har query ko har shard par bhejta hai. "Jo saath query hota hai woh saath rahe" yahan zyada zaroori hai.',
      },
    ],
  },
  success: [
    'Main query language ko compile pipeline ki tarah design kar sakta hoon',
    'Main permissions ko query ke andar le jaa sakta hoon',
    'Main index partitioning ko query pattern se mila sakta hoon',
  ],
  homework: `<p>Apne system ki sabse mehengi list/search query lo. Ab likho: us query mein
    permission ya visibility check <b>kahan</b> lagta hai — database ke andar, ya rows
    aane ke baad code mein? Agar baad mein lagta hai toh gino: filter se pehle kitne rows
    aate hain?</p>`,
  cards: [
    { front: 'JQL execute hoti hai ya compile?', back: 'Compile — parse → naam se internal ids → dynamic functions (currentUser, membersOf) expand → execution plan. Index ko naam nahi, ids pata hoti hain.' },
    { front: 'Permissions search ke baad lagane ki keemat?', back: 'Kaam result-set ke size par nirbhar ho jaata hai: 10 lakh match, 20 chahiye = 10 lakh checks. Jira permissions ko query ke andar daalta hai.' },
    { front: 'Jira ka index kis hisaab se bata hai?', back: 'Tenant + project se; ek project ke issues ek shard par. "Payments ke open bugs" jaisi query sirf kuch shards par jaati hai — jo saath query hota hai woh saath rehta hai.' },
    { front: 'ARI kya hai?', back: 'Atlassian Resource Identifier — har object (Jira issue, Confluence page, Bitbucket PR) ka ek jaisa id. Shared services (permissions, comments, mentions) product-specific logic ke bina kaam kar paate hain.' },
  ],
},
]);

})();
