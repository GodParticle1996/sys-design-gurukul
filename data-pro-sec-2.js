/* =====================================================================
   System Gurukul — 🔐 Security aur Multi-tenancy (track pro-sec), hissa 2
   Levels: sec-tokens (token mission), sec-tenancy (tenant export + RLS mission).
   Commands perfsim-pro.js mein: token …, tenant ….
   ===================================================================== */
(() => {
const T_TOKEN = [
  { text: 'Chor ki nazar se: revoke se pehle t-old se balance kholo',
    check: s => s.records.some(r => r.kind === 'token-use' && r.token === 't-old' && r.status === 200 && !r.revoked) },
  { text: 'auth-service mein Aman ke saare sessions radd karo',
    check: s => s.sys.tokens.revoked === true },
  { text: 'Revoke ke baad t-old dobara try karo (mode abhi jwt-30d)',
    check: s => s.records.some(r => r.kind === 'token-use' && r.token === 't-old' && r.revoked && r.mode === 'jwt-30d') },
  { text: 'wallet-api har request par revoke list jaanche: mode denylist',
    check: s => s.sys.tokens.mode === 'denylist' },
  { text: 't-old se nayi request: ab 401 aana chahiye',
    check: s => SD.mission.current(s, 'token-use', r => r.token === 't-old' && r.status === 401) },
];
const T_TENANT = [
  { text: 'Sharma Sweets ka export chalao — kitne rows aaye?',
    check: s => s.records.some(r => r.kind === 'tenant-export' && r.tenant === 'sharma' && r.leaked > 0) },
  { text: 'orders table par row-level security lagao',
    check: s => s.sys.tenancy.isolation === 'rls' },
  { text: 'Export dobara: sirf Sharma Sweets ke 12,000 rows',
    check: s => SD.mission.current(s, 'tenant-export', r => r.tenant === 'sharma' && r.leaked === 0 && r.isolation === 'rls') },
];

SD.registerLevels('pro-sec', [
/* ---------------------------------------------------------------- S3 */
{
  id: 'sec-tokens',
  icon: '🎟️',
  title: 'Chori hua token — radd kaise karein?',
  badge: 'Token Thanedaar',
  objectives: [
    '<b>Session</b> (server yaad rakhta hai) vs <b>JWT</b> (token khud bolta hai) — revoke ka farak',
    '30 din ka JWT chori hua: "logout all devices" ke baad bhi kyun chalta hai',
    'Teen ilaaj: revoke list (denylist), chhota access token + refresh, aur dono',
    'Terminal: chor ka token simulator mein sach mein band karo',
  ],
  lesson: [
    `<h3>🎬 Misaal: cinema ka ticket vs club ka card</h3>
     <p><b>Cinema ticket:</b> gate wala ticket par mohar dekhta hai. Mohar asli hai toh andar. Ticket kho gaya? Cinema ko pata hi nahi ki ab kiske haath mein hai.</p>
     <p><b>Club card:</b> gate wala har baar register kholta hai: "ye card abhi chalu hai?" Card radd karna aasaan. Par har entry par register dekhna padta hai.</p>
     <p class="tip">🎯 <b>Asli baat:</b> Signed JWT (JSON Web Token) cinema ticket hai — signature aur expiry token ke andar. Service ko kisi se poochhna nahi padta, isliye tez.
       Par radd (revoke) karna mushkil. Session club card hai — har request par server ka record, revoke turant.</p>`,
    `<h3>📱 Aman ka phone chori hua</h3>
     <p>ChaiPay ke access tokens <b>JWT, 30 din</b> ke hain. Aman ne support ko call kiya. Support ne "logout all devices" dabaya.</p>
     <p><code>auth-service</code> ne Aman ke sessions aur refresh tokens radd kar diye. Lekin <code>wallet-api</code> sirf token ka signature aur expiry dekhti hai.
       Revoke list kabhi poochhti hi nahi.</p>
     <p>Maano token ek din pehle bana tha. Nateeja: chor ka token <b>29 din aur</b> chalega. "Logout" button sirf auth-service ke andar laga, wallet-api tak pahuncha hi nahi.</p>`,
    `<h3>🛠️ Teen ilaaj, teen keematein</h3>
     <table>
       <tr><th>Ilaaj</th><th>Asar kab</th><th>Keemat</th></tr>
       <tr><td><b>Revoke list (denylist)</b>: har request par tez cache mein "ye user/token radd hai?"</td><td>Turant</td><td>Har request par ek lookup (~1 ms). Cache gira toh faisla: rok do (fail closed) ya jaane do (fail open)?</td></tr>
       <tr><td><b>Chhota access token</b> (5–15 min) + <b>refresh token</b> auth-service ke paas</td><td>Access token ki bachi umar tak</td><td>Har 15 min ek refresh call; tab tak khidki khuli</td></tr>
       <tr><td><b>Dono</b>: paise wale endpoints par denylist, baaki par chhota token</td><td>Paise par turant</td><td>Do mechanism chalaane padte hain</td></tr>
     </table>
     <p class="tip">⚠️ Mode badalne se <b>pehle se jaari</b> token chhota nahi hota. t-old ki expiry uske andar likhi hai: 30 din.
       Purane token ko turant rokne ke liye denylist, token-version check ya introspection chahiye: service auth-server se token ka haal poochhe.</p>`,
    `<h3>🔁 "Logout all devices" ka seedha design</h3>
     <p>User ke record mein ek timestamp: <code>tokens_valid_after = abhi</code>. ChaiPay har JWT mein <code>iat</code> (kab jaari hua) rakhta aur jaanchta hai; JWT standard mein iat optional hai.
       Service jaanchti hai: <code>iat &lt; tokens_valid_after</code>? Toh 401.</p>
     <p>Ek user ke liye ek hi value — list har token ki nahi badhti. Ye bhi ek denylist hai, bas user ke hisaab se.</p>
     <p>Asli JWT jaanch mein signature ke saath allowed algorithm, issuer (kisne jaari kiya), audience (kis service ke liye), expiry aur zaroori claims bhi jaancho. Simulator revoke ka farak dikhane ke liye jaanch ko chhota rakhta hai.</p>
     <p><b>Refresh token rotation:</b> har refresh par naya refresh token. Purana dobara aaya? Matlab kisi ne copy kiya — poori family radd.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — chor ka token band karo',
      goal: "Aman ka phone chori hua. Chor ke paas <code>t-old</code> token hai: 30 din wala JWT. Pehle chor ki nazar se dekho. Phir Aman ke sessions radd karo, aur pakka karo ki t-old sach mein band ho gaya.",
      sys: {},
      tasks: T_TOKEN,
      success: SD.allTasks(T_TOKEN),
      verify: s => s.sys.tokens.revoked === true && s.sys.tokens.mode === 'denylist' && SD.mission.current(s, 'token-use', r => r.token === 't-old' && r.status === 401),
      solution: [
        'token use t-old',
        'token revoke aman',
        'token use t-old',
        'token mode denylist',
        'token use t-old',
      ],
      successText: 't-old ab 401 deta hai. Revoke tabhi kaam karta hai jab har service revoke list dekhe. Keemat: har request par ek tez lookup. Asli system mein paise wale endpoints par denylist, baaki par chhota access token.',
      hints: [
        'Pehle chor ki nazar se dekho: purane token se balance khulta hai? Phir Aman ke sessions radd karo aur t-old dobara try karo.',
        '`token use <token>` ek request bhejta hai. `token revoke aman` auth-service mein sessions radd karta hai. `token mode jwt-30d|denylist|short` tay karta hai ki wallet-api token kaise jaanche. Mode short sirf naye tokens par lagta hai, pehle se jaari t-old par nahi.',
        'Poora raasta — har command alag Enter se chalao:\ntoken use t-old\ntoken revoke aman\ntoken use t-old\ntoken mode denylist\ntoken use t-old',
      ],
    },
    {
      type: 'quiz',
      title: 'Token ke faisle',
      questions: [
        {
          q: '"Logout all devices" ke baad bhi chor ka token kyun chala?',
          choices: [
            'wallet-api sirf signature aur expiry jaanchti thi; revoke list dekhti hi nahi thi',
            'auth-service ka revoke fail ho gaya tha; button dobara dabane se theek ho jaata',
            'Chor ne token ka signature badal diya tha, isliye wallet-api ki jaanch paas hui',
            'JWT ki expiry server ki ghadi se nahi, chor ke phone ki ghadi se chalti hai',
          ],
          answer: 0,
          explain: 'JWT self-contained hai: signature asli aur expiry baaki, toh token valid. Revoke auth-service mein hua, par wallet-api ne kabhi revoke list poochhi hi nahi.',
          choiceExplanations: [
            'JWT self-contained hai: signature asli aur expiry baaki, toh token valid. Revoke auth-service mein hua, par wallet-api ne kabhi revoke list poochhi hi nahi.',
            'Revoke sahi hua tha: sessions aur refresh tokens radd. Dikkat ye thi ki wallet-api us record ko dekhti nahi.',
            'Signature badalne par jaanch fail hoti. Chor ne asli token hi chalaaya.',
            'Expiry server apni ghadi se jaanchta hai. Phone ki ghadi se farak nahi padta.',
          ],
        },
        {
          q: 'Denylist ka Redis cache 5 minute ke liye gir gaya. Payment endpoint kya kare?',
          choices: [
            'Payment roko ya alag OTP jaancho; balance par bhi data ka risk dekho',
            'Sab par fail open: sab chalne do; cache girna ChaiPay ki galti hai',
            'Saare users ke tokens radd karo; cache aane tak sab dobara login karein',
            'Cache aane tak denylist check hata do; bas logs mein likhte raho',
          ],
          answer: 0,
          explain: 'Khatre ke hisaab se faisla: paise jaane wale kaam par chori ka nuksaan bada, toh fail closed (ya extra check). Balance private data hai. Balance par fail open sirf tab chuno jab data leak ka risk policy mein manzoor ho.',
          choiceExplanations: [
            'Khatre ke hisaab se faisla: paise jaane wale kaam par chori ka nuksaan bada, toh fail closed (ya extra check). Balance private data hai. Balance par fail open sirf tab chuno jab data leak ka risk policy mein manzoor ho.',
            'Fail open ka matlab chura hua token 5 minute paisa bhej sakta hai. Payment par ye mehenga hai.',
            'Ek cache outage ke liye lakhon users ko logout karna khud ek bada incident hai.',
            'Ye fail open hi hai, bas naam alag. Logs baad mein batate hain; paisa tab tak ja chuka.',
          ],
        },
        {
          q: 'Access token 15 min ka, refresh token 30 din ka. Refresh token hi chori ho gaya toh?',
          choices: [
            'Refresh rotation: har refresh par naya token; purana dobara aaye toh family radd',
            'Kuch nahi ho sakta; refresh token 30 din tak chalega, bas intezaar karo',
            'Access token ko 1 minute ka kar do; refresh token ka khatra apne aap khatam',
            'Refresh token ko bhi JWT bana do, taaki auth-service ko yaad na rakhna pade',
          ],
          answer: 0,
          explain: 'Refresh token ka record auth-service rakhti hai, isliye token radd ho sakta hai. Rotation mein purana token radd hota hai. Aman aur chor dono copy chalaayein tab reuse pakadta hai aur poori family radd hoti hai; akela chor chalaaye toh turant pata nahi chalta.',
          choiceExplanations: [
            'Refresh token ka record auth-service rakhti hai, isliye token radd ho sakta hai. Rotation mein purana token radd hota hai. Aman aur chor dono copy chalaayein tab reuse pakadta hai aur poori family radd hoti hai; akela chor chalaaye toh turant pata nahi chalta.',
            'Refresh token server-side hai; usse radd karna seedha hai. Intezaar ki zaroorat nahi.',
            'Chor naye access tokens banata rahega. Access token chhota karne se refresh ka khatra nahi jaata.',
            'Self-contained refresh token radd karna aur mushkil hoga — wahi dikkat jo 30 din ke JWT mein thi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Auth tokens',
    instructions: 'Login aur logout ke design sawaal. 🎤',
    questions: [
      {
        q: 'Microservices mein JWT loge ya server-side session?',
        choices: [
          'JWT tez jaanch ke liye; revoke ke liye chhota expiry aur paise par denylist',
          'Sirf JWT, lambi expiry ke saath; revoke ki zaroorat bahut kam padti hai',
          'Sirf session; har service har request par auth-service ka DB poochhe',
          'JWT mein password ka hash daal do; har service khud login jaanch le',
        ],
        answer: 0,
        explain: 'JWT se har service bina network call ke identity jaanch leti hai. Kamzori revoke hai — use chhoti expiry aur zaroori jagah denylist se bharo. Faisla khatre aur latency dono se.',
        choiceExplanations: [
          'JWT se har service bina network call ke identity jaanch leti hai. Kamzori revoke hai — use chhoti expiry aur zaroori jagah denylist se bharo. Faisla khatre aur latency dono se.',
          'Phone chori, employee nikla, password leak — revoke roz ki zaroorat hai. Lambi expiry ka JWT in sab mein khula rehta hai.',
          'Har request par auth DB ki call latency aur ek single point of failure jodti hai. Cache ke saath ho sakta hai, par keemat gino.',
          'Yahan signed JWT ka payload encoded hai, encrypted nahi. JWT ka encrypted roop (JWE) bhi hota hai; password hash token mein phir bhi mat rakho.',
        ],
      },
      {
        q: '"Logout from all devices" button kaise banaoge?',
        choices: [
          'User par tokens_valid_after = abhi; token ka iat usse pehle ho toh 401',
          'Har device par push bhejo ki app apna token khud mita de',
          'JWT signing key badal do; isse saare users ek saath logout ho jaayenge',
          'Client ko bolo ki localStorage saaf kare; server par kuch mat badlo',
        ],
        answer: 0,
        explain: 'Ek user ke liye ek timestamp. Har service token ka iat (jaari hone ka samay) milaati hai. Purane saare tokens ek saath band, naye login chalte rahte hain.',
        choiceExplanations: [
          'Ek user ke liye ek timestamp. Har service token ka iat (jaari hone ka samay) milaati hai. Purane saare tokens ek saath band, naye login chalte rahte hain.',
          'Chor ka phone push sunega hi kyun? Chor token copy karke kahin aur chala sakta hai.',
          'Key badalne se ek user ki jagah lakhon users logout honge. Key leak ke liye theek, ek chori ke liye nahi.',
          'Chor ka client tumhari baat nahi maanega. Revoke server par hona chahiye.',
        ],
      },
    ],
  },
  success: [
    'JWT aur session ka revoke wala farak samjhana',
    'Chori hue token ko denylist se turant band karna',
    'Khatre ke hisaab se fail open ya fail closed chunna',
  ],
  homework: `Kisi bhi app mein login karo aur browser ke DevTools → Application/Storage mein token dhoondho.
    Agar JWT hai toh local offline decoder mein decode karo (asli production token kisi website par mat chipkao):
    exp aur iat dekho. Token kitne din chalta hai? Phone chori ho toh kitni der khula rahega?`,
  cards: [
    { front: 'JWT revoke mushkil kyun?', back: 'Service sirf signature + expiry dekhti hai, kisi se poochhti nahi. Revoke list na dekhe toh token expiry tak chalta hai.' },
    { front: 'Denylist ki keemat?', back: 'Har request par ek tez lookup. Cache gira toh: paise par <b>fail closed</b>, kam khatre wale kaam par chalne do.' },
    { front: 'Logout all devices?', back: '<code>tokens_valid_after = abhi</code>; token ka <code>iat</code> pehle ka → 401.' },
    { front: 'Refresh rotation?', back: 'Har refresh par naya refresh token. Purana dobara aaya = chori; poori family radd.' },
  ],
},

/* ---------------------------------------------------------------- S4 */
{
  id: 'sec-tenancy',
  icon: '🏬',
  title: 'Multi-tenancy — ek merchant ka data doosre ko na dikhe',
  badge: 'Kiraaydaar Rakshak',
  objectives: [
    'Data rakhne ke teen tareeke: saajhi table, alag schema, alag database; AWS ke pool, silo aur bridge ka farak',
    'App ka filter vs database ki policy (Postgres <b>RLS</b>)',
    'RLS ke jaal: table owner, BYPASSRLS, connection pool',
    'Terminal: export ka leak dekho aur RLS se band karo',
  ],
  lesson: [
    `<h3>🏢 Misaal: ek godown, 40,000 dukaanein</h3>
     <p><b>A — ek bada godown</b>, har dabbe par dukaan ka naam. Sasta. Par galat dabba uthana aasaan.</p>
     <p><b>B — ek building, har dukaan ka alag kamra.</b> Sahi permissions hon toh galti mushkil, par 40,000 kamron ki chaabiyan sambhalo.</p>
     <p><b>C — har dukaan ki alag building.</b> Zyada alag resources, zyada kharcha; sahi permissions phir bhi chahiye.</p>
     <p class="tip">🎯 <b>Asli baat:</b> ChaiPay ke 40,000 merchants (tenants) ek hi <code>orders</code> table mein hain — model A.
       Ab har query ko yaad rakhna hai ki sirf apne merchant ki rows padhe.</p>`,
    `<h3>📊 Teen model</h3>
     <table>
       <tr><th>Model</th><th>Isolation</th><th>Kharcha</th><th>Kab</th></tr>
       <tr><td><b>Pool</b>: saajhi table, <code>merchant_id</code> column</td><td>Sabse kamzor — filter par nirbhar</td><td>Sabse sasta, ek migration sab par</td><td>Hazaaron chhote tenants</td></tr>
       <tr><td><b>Alag schema</b>: har tenant ki tables alag namespace mein</td><td>Beech ka</td><td>Hazaaron schemas: migration aur catalog bhaari</td><td>Sau ke aas-paas tenants, custom fields</td></tr>
       <tr><td><b>Alag database</b>: har tenant ka apna DB</td><td>Data boundary mazboot; shared host par CPU phir bhi saajha</td><td>Sabse mehenga, har DB ko chalana</td><td>Bade, regulated ya bahut load wale tenants</td></tr>
     </table>
     <p>AWS ke naam resources par lagte hain: <b>pool</b> = saajhe resources, <b>silo</b> = tenant ke apne resources, <b>bridge</b> = dono ka mix. Alag schema ko bridge kehna zaroori nahi. Alag DB bhi saajhe server par ho sakta hai; CPU aur connections ka isolation apne aap nahi milta.</p>
     <p>ChaiPay mein chhote merchants pool mein, bade enterprise dedicated DB/server wale silo mein.</p>`,
    `<h3>🧯 App filter ka dard</h3>
     <p>Pool mein har query: <code>WHERE merchant_id = ?</code>. 400 queries. Ek naya "Export CSV" feature. Ek bhool = <b>sab merchants ka data</b>.</p>
     <p><b>Postgres Row-Level Security (RLS):</b> policy table par lagti hai. Database khud har query par filter jodta hai — code bhoole tab bhi.</p>
     <pre>ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY by_tenant ON orders
  USING (merchant_id = current_setting('app.merchant_id')::bigint);

-- har request ke transaction mein:
SELECT set_config('app.merchant_id', $1, true);   -- $1 = verified token ka merchant</pre>`,
    `<h3>⚠️ RLS ke chaar jaal</h3>
     <ul>
       <li><b>Superuser ya BYPASSRLS</b> role par policy lagti hi nahi. App ka role alag rakho.</li>
       <li><b>Table owner</b> bhi bach jaata hai — jab tak <code>FORCE ROW LEVEL SECURITY</code> na lagao.</li>
       <li><b>Connection pool:</b> setting sirf transaction tak rakho (<code>set_config(…, true)</code> ya <code>SET LOCAL</code>). Warna agli request purane merchant ki setting ke saath chal sakti hai.</li>
       <li><b>merchant_id kahan se?</b> Verified token se. URL ya body se nahi.</li>
     </ul>
     <p class="tip">RLS ek <b>doosri parat</b> hai. Service ka owner check (pichhla level) phir bhi chahiye — RLS us bhool ko pakadta hai jo code mein chhoot gayi.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — export ka leak band karo',
      goal: "Naye <b>Export CSV</b> feature par shikayat aayi. Sharma Sweets ka export chalao aur gino kitne rows aaye. Phir <code>orders</code> table par row-level security lagao aur export dobara chalao.",
      sys: {},
      tasks: T_TENANT,
      success: SD.allTasks(T_TENANT),
      verify: s => s.sys.tenancy.isolation === 'rls' && SD.mission.current(s, 'tenant-export', r => r.tenant === 'sharma' && r.leaked === 0),
      solution: [
        'tenant export sharma',
        'tenant isolation rls',
        'tenant export sharma',
      ],
      successText: 'Export mein ab sirf Sharma Sweets ke 12,000 rows. Database ki policy ne filter lagaya, chahe export code bhool jaaye. Asli Postgres mein yaad rakho: app ka role superuser, table owner ya BYPASSRLS na ho, aur merchant ki setting har transaction mein set ho.',
      hints: [
        'Pehle export chala ke gino: 12,000 se zyada rows aaye toh doosre merchants ka data bhi aaya.',
        '`tenant export <merchant>` export chalata hai. `tenant isolation app-filter|rls` tay karta hai ki merchant ka filter code lagaye ya database.',
        'Poora raasta — har command alag Enter se chalao:\ntenant export sharma\ntenant isolation rls\ntenant export sharma',
      ],
    },
    {
      type: 'bins',
      title: 'Kaunsa tenant kis model mein?',
      instructions: 'Har tenant ke liye sabse theek isolation model chuno.',
      bins: [
        { id: 'pool', label: '🧺 Pool (saajhi table)' },
        { id: 'bridge', label: '🚪 Alag schema' },
        { id: 'silo', label: '🏰 Silo (alag DB)' },
      ],
      items: [
        { text: '40,000 chhoti dukaanein, har ek ke 100–10,000 orders', bin: 'pool', explain: 'Hazaaron chhote tenants ke liye alag DB ka kharcha aur kaam bahut. Pool + RLS.' },
        { text: 'Ek bank: contract kehta hai data alag DB mein, alag encryption key ke saath', bin: 'silo', explain: 'Contract hi silo maang raha hai. Alag DB, alag key, alag backup.' },
        { text: 'Free trial ke 5,000 merchants; aadhe ek hafte mein chhod dete hain', bin: 'pool', explain: 'Jaldi aane-jaane wale tenants ke liye har ek ka DB banana-mitaana mehenga. Pool.' },
        { text: '200 B2B grahak, har ek ko apne custom columns aur reports chahiye', bin: 'bridge', explain: '200 tenants ko apne columns chahiye: alag schema ek vikalp hai. Migrations aur permissions har schema par sambhalni hongi.' },
        { text: 'MegaMart: 50 lakh orders; iski reports se baaki sab dheeme ho jaate hain', bin: 'silo', explain: 'Bhaari reports ko dedicated compute ya alag read replica do. Saajhe host par sirf alag DB banaane se CPU isolation nahi milta.' },
        { text: 'Sarkari client: contract mein dedicated DB, khaas region aur alag audit', bin: 'silo', explain: 'Is abhyas mein dedicated DB chuna hai. Sirf region aur audit ki shart se silo zaroori nahi; region-wise pool bhi shart poori kar sakta hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'RLS ke faisle',
      questions: [
        {
          q: 'RLS policy lagayi, phir bhi export mein sab merchants ka data aaya. Pehle kya jaanchoge?',
          choices: [
            'App ka DB role table owner, superuser ya BYPASSRLS wala toh nahi',
            'Postgres ka version; purane versions mein RLS policy chalti hi nahi',
            'Export query ka index; galat index se policy chhoot jaati hai',
            'Network ka TLS; bina TLS ke database policy ko ignore karta hai',
          ],
          answer: 0,
          explain: 'Superuser aur BYPASSRLS roles par policy nahi lagti. Table owner par bhi nahi lagti, jab tak FORCE ROW LEVEL SECURITY na ho. Aksar app usi role se judti hai jisne table banayi.',
          choiceExplanations: [
            'Superuser aur BYPASSRLS roles par policy nahi lagti. Table owner par bhi nahi lagti, jab tak FORCE ROW LEVEL SECURITY na ho. Aksar app usi role se judti hai jisne table banayi.',
            'RLS Postgres 9.5 se hai. Aaj ke versions mein chalti hai; sawaal role ka hai.',
            'Index sirf raftaar badalta hai. Policy har plan mein lagti hai.',
            'TLS raaste ko bachata hai. Policy ka TLS se koi lena-dena nahi.',
          ],
        },
        {
          q: 'Connection pool hai. app.merchant_id ko poore connection (session) par set kiya, transaction par nahi. Khatra?',
          choices: [
            'Agli request usi connection par purane merchant ki setting ke saath chal sakti hai',
            'Kuch nahi; Postgres har query ke baad session ki setting apne aap mita deta hai',
            'Postgres session par custom setting rakhne hi nahi deta; query error degi',
            'Sirf raftaar ka khatra; har query thodi dheemi ho jaayegi, data sahi rahega',
          ],
          answer: 0,
          explain: 'Pool connection ko agli request ko de deta hai. Agli request ne setting nahi badli toh purane merchant ka data dikh sakta hai. set_config(…, true) ya SET LOCAL setting ko transaction ke saath khatam karte hain.',
          choiceExplanations: [
            'Pool connection ko agli request ko de deta hai. Agli request ne setting nahi badli toh purane merchant ka data dikh sakta hai. set_config(…, true) ya SET LOCAL setting ko transaction ke saath khatam karte hain.',
            'Session setting connection band hone ya badalne tak rehti hai. Har query ke baad nahi mitti.',
            'Custom settings (app.* jaise naam) session par set ho sakti hain. Error nahi aata — isliye bug chupta hai.',
            'Raftaar nahi, data ka sawaal hai: galat merchant ki rows.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Multi-tenant SaaS',
    instructions: 'SaaS design mein isolation ke sawaal. 🎤',
    questions: [
      {
        q: '40,000 chhote tenants aur 5 bade enterprise tenants. Isolation kaise?',
        choices: [
          'Chhote pool mein RLS ke saath; bade enterprise ko silo, contract aur load dekh kar',
          'Sabko alag DB; isolation sabse zaroori hai, kharcha baad mein dekh lenge',
          'Sab ek pool mein; bade tenants par bhi wahi niyam, warna code do jagah',
          'Har tenant ke liye alag microservice deploy karo; data apne aap alag',
        ],
        answer: 0,
        explain: 'Mix sabse aam hai. Pool sasta aur ek migration sab par. Enterprise silo — contract, encryption, region ya load ke liye. Routing layer batati hai ki tenant kahan rehta hai.',
        choiceExplanations: [
          'Mix sabse aam hai. Pool sasta aur ek migration sab par. Enterprise silo — contract, encryption, region ya load ke liye. Routing layer batati hai ki tenant kahan rehta hai.',
          '40,000 DBs ka kharcha, backup, migration aur monitoring bahut bhaari. Chhote tenants ke liye faayda kam.',
          'Bade tenant ka contract alag DB maang sakta hai, aur uska load baaki sab ko dheema kar sakta hai.',
          'Service alag karne se data alag nahi hota; service ki ginti bhi 40,000 ho jaayegi.',
        ],
      },
      {
        q: 'Request ka tenant id kahan se loge?',
        choices: [
          'Verified token ke claim se; URL ki id sirf claim se milaane ke liye',
          'URL path se; REST mein resource ka maalik URL mein hi likha hota hai',
          'Header X-Tenant-Id se; hamara frontend toh sahi id hi bhejta hai',
          'Body ke merchant_id field se; har POST request mein woh aata hi hai',
        ],
        answer: 0,
        explain: 'Token ka signature server ne banaya, isliye claim par bharosa ho sakta hai. URL, header aur body client ke haath mein hain — unhe sirf token ke tenant se milaao.',
        choiceExplanations: [
          'Token ka signature server ne banaya, isliye claim par bharosa ho sakta hai. URL, header aur body client ke haath mein hain — unhe sirf token ke tenant se milaao.',
          'URL client badal sakta hai — pichhle level ka BOLA yahi tha.',
          'Hamlawar frontend use nahi karta; header khud likh deta hai.',
          'Body bhi client ki hai. Mass assignment jaisa hi khatra.',
        ],
      },
    ],
  },
  success: [
    'Saajhi table, alag schema aur alag DB mein se zaroorat ke hisaab se chunna',
    'Postgres RLS lagana aur uske jaal pehchanna',
    'Tenant id ko sirf verified token se lena',
  ],
  homework: `Local Postgres mein do roles banao: owner aur app. orders table par RLS lagao.
    owner se SELECT karo (sab rows dikhengi), phir app se — set_config ke saath aur bina.
    Phir FORCE ROW LEVEL SECURITY laga ke owner se dobara dekho.`,
  cards: [
    { front: 'Pool / bridge / silo?', back: 'AWS mein pool = saajhe resources, silo = tenant ke apne resources, bridge = dono ka mix. Alag schema sirf data rakhne ka ek tareeka hai.' },
    { front: 'RLS kyun?', back: 'Code filter bhoole tab bhi database khud <code>merchant_id</code> ka filter lagata hai. Doosri parat.' },
    { front: 'RLS kab nahi lagti?', back: 'Superuser, BYPASSRLS role, aur table owner (bina FORCE ROW LEVEL SECURITY).' },
    { front: 'Pool + RLS setting?', back: '<code>set_config(\'app.merchant_id\', $1, true)</code> — sirf transaction tak. Session par rakha toh agli request mein chipak sakta hai.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['sec-tokens'] = {
  t: 'Revoke tabhi kaam karta hai jab service revoke list dekhe',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ jwt-30d: sirf signature + expiry</span>
        <div class="dg-flow">
          <span class="dg-pill bad">🕵️ chor: t-old</span><span class="dg-arrow">→</span>
          <span class="dg-pill">⚙️ wallet-api</span><span class="dg-arrow">→</span>
          <span class="dg-pill bad">200 OK</span>
        </div>
        <div class="dg-cap">auth-service ne revoke kiya, par wallet-api ne poochha hi nahi.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ denylist: har request par jaanch</span>
        <div class="dg-flow">
          <span class="dg-pill bad">🕵️ chor: t-old</span><span class="dg-arrow">→</span>
          <span class="dg-pill acc">⚙️ wallet-api<br><small>radd hai? (~1 ms)</small></span><span class="dg-arrow">→</span>
          <span class="dg-pill good">401</span>
        </div>
        <div class="dg-cap">Keemat: har request par ek lookup. Cache gira toh paise par fail closed.</div>
      </div>
    </div>`,
};
VISUALS['sec-tenancy'] = {
  t: 'Code bhoole tab bhi database filter lagaye',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🍬 Sharma Sweets<br><small>token: merchant 42</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">⚙️ export-api<br><small>set_config(merchant, 42, true)</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🛡️ RLS policy<br><small>merchant_id = setting</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🗄️ orders<br><small>sirf 12,000 rows</small></span>
    </div>
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">🧺</span><span class="nl">Pool</span><span class="ns">saajhi table — sasta, filter par nirbhar</span></div>
      <div class="dg-node"><span class="ni">🚪</span><span class="nl">Alag schema</span><span class="ns">alag tables; permissions chahiye</span></div>
      <div class="dg-node"><span class="ni">🏰</span><span class="nl">Silo</span><span class="ns">alag DB — mazboot, mehenga</span></div>
    </div>
    <div class="dg-cap">Jaal: superuser / BYPASSRLS / table owner (bina FORCE) par policy nahi lagti.</div>`,
};

SD.addScenes({
  'sec-tokens': {
    intro: 'Aman ka phone chori hua. Chor ke paas <b>t-old</b> hai: 30 din wala JWT.',
    nodes: [
      { id: 'thief', col: 0, row: 0, icon: '🕵️', label: 'Chor', sub: 't-old (30 din)', tone: 'bad' },
      { id: 'wallet', col: 2, row: 0, icon: '⚙️', label: 'wallet-api', sub: 'signature + expiry' },
      { id: 'aman', col: 0, row: 1, icon: '🙋', label: 'Aman', sub: 'naya phone', tone: 'accent' },
      { id: 'auth', col: 1, row: 1, icon: '🔑', label: 'auth-service' },
      { id: 'deny', col: 2, row: 1, icon: '🧠', label: 'revoke list', sub: 'Redis cache' },
    ],
    steps: [
      { from: 'thief', to: 'wallet', label: 'GET /balance (t-old)', say: 'Chor purane token se balance maangta hai. Token ek din pehle bana tha. Signature asli hai, expiry 29 din door.' },
      { at: ['wallet'], set: { wallet: { tone: 'bad', sub: '200 OK — chor andar' } }, say: 'wallet-api sirf signature aur expiry jaanchti hai. Dono theek, toh 200 OK.' },
      { from: 'aman', to: 'auth', label: 'logout all devices', say: 'Aman support ko call karta hai. Support "logout all devices" dabata hai.' },
      { from: 'auth', to: 'deny', label: 'Aman: radd', tone: 'good', set: { deny: { tone: 'good', sub: 'aman: radd' } }, say: 'auth-service sessions aur refresh tokens radd karti hai, aur revoke list mein Aman ka naam likhti hai.' },
      { from: 'thief', to: 'wallet', label: 'GET /balance (t-old)', set: { wallet: { tone: 'bad', sub: 'phir 200 OK!' } }, say: 'Chor dobara try karta hai. wallet-api revoke list dekhti hi nahi, toh phir 200 OK. Logout button wallet-api tak pahuncha hi nahi.' },
      { at: ['wallet'], set: { wallet: { tone: 'gold', sub: 'mode: denylist' } }, say: 'Ilaaj: wallet-api har request par revoke list jaanche. Keemat: har request par ek tez lookup, lagbhag 1 ms.' },
      { from: 'wallet', to: 'deny', label: 'Aman radd hai?', say: 'Ab har request se pehle sawaal: is token ka user radd hai?' },
      { at: ['thief', 'wallet'], set: { wallet: { tone: 'good', sub: '401 Unauthorized' }, thief: { tone: 'good', sub: 'band' } }, say: 't-old ab 401. Chor bahar. Aman naye phone par dobara login karta hai.' },
      { at: ['deny'], say: 'Cache gira toh? Paise wale endpoints par rok do (fail closed). Balance bhi private data hai; fail open sirf manzoor risk policy ke saath.' },
    ],
  },
  'sec-tenancy': {
    intro: 'ChaiPay ke 40,000 merchants ek hi <code>orders</code> table mein. Naya "Export CSV" feature aaya.',
    nodes: [
      { id: 'sharma', col: 0, row: 0, icon: '🍬', label: 'Sharma Sweets', sub: 'Export CSV', tone: 'accent' },
      { id: 'api', col: 1, row: 0, icon: '⚙️', label: 'export-api', sub: 'naya code' },
      { id: 'db', col: 2, row: 0, icon: '🗄️', label: 'orders table', sub: '55 lakh rows' },
      { id: 'pool', col: 1, row: 1, icon: '🔌', label: 'connection pool' },
      { id: 'policy', col: 2, row: 1, icon: '🛡️', label: 'RLS policy', sub: 'abhi band' },
    ],
    steps: [
      { from: 'sharma', to: 'api', label: 'GET /export', say: 'Sharma Sweets apne orders ka export maangti hai. Token merchant 42 ka hai.' },
      { from: 'api', to: 'db', label: 'SELECT * FROM orders', tone: 'bad', say: 'Naye export code mein WHERE merchant_id lagana bhool gaye. Query poori table padhti hai.' },
      { at: ['sharma'], set: { sharma: { tone: 'bad', sub: '55 lakh rows!' } }, say: 'Export mein 55 lakh rows: Sharma Sweets ke 12,000 aur baaki 39,999 merchants ke. Ek bhool, sabka data.' },
      { at: ['policy', 'db'], set: { policy: { tone: 'good', sub: 'merchant_id = setting' } }, say: 'Ilaaj: orders par row-level security. Policy ka niyam: sirf merchant_id = setting wali rows dikhengi.' },
      { from: 'api', to: 'pool', label: 'set_config(…, 42, true)', say: 'Har request ke transaction mein merchant set karo, verified token se. true ka matlab: setting transaction ke saath khatam.' },
      { from: 'pool', to: 'db', label: 'SELECT * FROM orders', say: 'Code abhi bhi WHERE bhool raha hai. Par ab database khud filter jodta hai.' },
      { at: ['sharma'], set: { sharma: { tone: 'good', sub: '12,000 rows' } }, say: 'Export mein sirf Sharma Sweets ke 12,000 rows. Code ki bhool database ne pakad li.' },
      { at: ['api'], set: { api: { tone: 'gold', sub: 'role: owner nahi' } }, say: 'Jaal yaad rakho: app ka DB role superuser, BYPASSRLS ya table owner na ho. Warna policy chupchaap lagti hi nahi.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-sec-tokens', levels: 'sec-tokens', guide: {
    title: 'Tez jaanch ya turant radd?',
    misaal: 'Cinema ka ticket gate par bina register ke chalta hai; kho jaaye toh rokna mushkil. Club card har baar register se milta hai; radd turant, par har baar register.',
    asli: 'JWT bina network call ke jaanch deta hai. Revoke ke liye service ko kisi list se poochhna padta hai, ya token ki umar chhoti rakhni padti hai.',
    points: [
      '<b>Denylist:</b> asar turant; har request par ek lookup.',
      '<b>Chhota access token:</b> khidki expiry tak khuli; refresh radd ho sakta hai.',
      '<b>Pehle se jaari token:</b> mode badalne se chhota nahi hota.',
    ],
    use: 'Paise ya personal data wale endpoints par chori ka nuksaan bada ho.',
    avoid: 'Lambi expiry ka JWT bina kisi revoke raaste ke mat do.',
    mistake: 'Auth-service mein logout karke maan lena ki baaki services ko bhi pata chal gaya.',
    compare: [
      { choice: 'Revoke list har request par', when: 'Turant band karna zaroori ho (paise, admin)', tradeoff: 'Lookup ka kharcha; cache gira toh fail open ya closed ka faisla' },
      { choice: 'Chhota access token + refresh', when: 'Kuch minute ki khidki manzoor ho', tradeoff: 'Lookup nahi; par expiry tak chor ke paas samay' },
    ],
    followup: 'Revoke list ka cache dusre region mein 2 second peeche hai. Kya ye manzoor hai, aur kis endpoint par nahi?',
    sources: [
      { title: 'RFC 7519 — JSON Web Token (JWT)', url: 'https://www.rfc-editor.org/rfc/rfc7519' },
      { title: 'RFC 7009 — OAuth 2.0 Token Revocation', url: 'https://www.rfc-editor.org/rfc/rfc7009' },
      { title: 'RFC 9700 — Best Current Practice for OAuth 2.0 Security', url: 'https://www.rfc-editor.org/rfc/rfc9700' },
    ],
  } },
  { id: 'pro-sec-tenancy', levels: 'sec-tenancy', guide: {
    title: 'Saajha godown, alag kamra, ya alag building?',
    misaal: 'Ek godown mein 40,000 dukaanon ke dabbe sasta hai, par galat dabba uthana aasaan. Alag building surakshit hai, par 40,000 buildings koi nahi chala sakta.',
    asli: 'Isolation model tenant ke size, contract aur load se chuno. Pool mein database ki policy (RLS) doosri parat banti hai.',
    points: [
      '<b>Pool:</b> sasta; filter ki bhool sabka data dikha sakti hai.',
      '<b>Silo:</b> mazboot; har tenant ka DB chalana mehenga.',
      '<b>RLS:</b> code bhoole toh bhi DB filter lagaye; role aur pool ke jaal yaad rakho.',
    ],
    use: 'Hazaaron tenants ek DB mein hon aur ek query ki bhool bada leak bana sakti ho.',
    avoid: 'RLS ko akeli parat mat banao; service ka owner check bhi rakho.',
    mistake: 'App ko table owner ya BYPASSRLS role se jodna — policy chupchaap band.',
    compare: [
      { choice: 'Pool + RLS', when: 'Bahut saare chhote tenants', tradeoff: 'Sasta aur ek migration; isolation policy aur setting par nirbhar' },
      { choice: 'Silo (alag DB)', when: 'Contract, region ya bada load', tradeoff: 'Mazboot isolation; kharcha, migrations aur routing ka kaam badhta hai' },
    ],
    followup: 'Ek tenant pool se silo mein jaana chahta hai bina downtime ke. Data kaise le jaoge?',
    sources: [
      { title: 'PostgreSQL — Row Security Policies', url: 'https://www.postgresql.org/docs/current/ddl-rowsecurity.html' },
      { title: 'AWS — SaaS Tenant Isolation Strategies (silo, bridge, pool)', url: 'https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.html' },
    ],
  } },
);
})();
