/* =====================================================================
   System Gurukul — 🔐 Security aur Multi-tenancy (track pro-sec), hissa 1
   Kahani: ChaiPay (UPI wallet + merchant dashboard). Levels: sec-threat, sec-bola.
   Is file mein: track ki entry, levels, VISUALS, scenes, decision guides.
   Guides SD.guidanceExtra mein jaate hain — isliye ye file data-guidance.js se PEHLE load hoti hai.
   Terminal missions perfsim-pro.js ke commands (tenant, token) chalate hain — hissa 2 aur 3 mein.
   ===================================================================== */
(() => {
SD.tracks.push({
  id: 'pro-sec',
  icon: '🔐',
  name: 'Security aur Multi-tenancy',
  blurb: 'ChaiPay ke saath asli production security: hamla kahan se aayega (threat model), authorization ki teen deewarein, chori hua token radd karna, ek merchant ka data doosre ko na dikhe, ek bada merchant baaki sab ko dheema na kare, secrets aur bots. Har level mein ek faisla aur uski keemat; teen terminal missions.',
  certTitle: 'SURAKSHA SENAPATI',
  certSub: 'Certificate of Production Security',
  motto: 'Hamla wahan se aata hai jahan tumne bharosa kar liya tha.',
  formula: 'Security = har trust boundary par (kaun hai + kya kar sakta hai + data theek hai + saboot)',
  alwaysUnlocked: true,
});

SD.registerLevels('pro-sec', [
/* ---------------------------------------------------------------- S1 */
{
  id: 'sec-threat',
  icon: '🗺️',
  title: 'Threat model — hamla kahan se aayega?',
  badge: 'Khatra Naksha-kaar',
  objectives: [
    '<b>Trust boundary</b> pehchano: jahan alag bharose ya permissions wale hisson ke beech data jaata hai',
    '<b>STRIDE</b> ke 6 khatre — har khatre ka ek seedha sawaal',
    'Har khatre ke liye ek control, aur control ki keemat',
    '20 khatron mein se pehle kaunse theek karein',
  ],
  lesson: [
    `<h3>🏪 Misaal: Sharma ji ki dukaan ka taala</h3>
     <p>Sharma ji ne darwaze par mehenga taala lagaya. Chor peeche ki khidki se aaya.</p>
     <p>Galti taale mein nahi thi. Galti yeh thi ki kisi ne <b>naksha</b> nahi banaya: dukaan mein andar aane ke kitne raaste hain?
       Darwaza, khidki, godown ka shutter, galle ki chaabi.</p>
     <p>Har raaste par do sawaal: <b>kaun aa sakta hai?</b> aur <b>kya le ja sakta hai?</b></p>
     <p class="tip">🎯 <b>Asli baat:</b> threat model = system ka naksha + har border par "yahan kya bigad sakta hai?".
       Ye kaam design review mein hota hai, code likhne se pehle. Baad mein theek karna mehenga padta hai.</p>`,
    `<h3>🧱 Trust boundary — bharose ki seema</h3>
     <p>ChaiPay ka raasta: <b>Aman ka phone</b> → <code>api-gateway</code> → <code>wallet-api</code> → <code>ledger-db</code>.
       Saath mein <b>partner bank</b> ka webhook aur <b>merchant dashboard</b>.</p>
     <p>Aman ka phone tumhare kaabu mein nahi hai. App ko koi bhi tod-marod sakta hai. Isliye phone se aaya har byte <b>shak</b> ke saath padho.</p>
     <p><b>Trust boundary</b> woh line hai jahan alag bharose ya permissions wale hisson ke beech data jaata hai.
       Har boundary par chaar kaam:</p>
     <table>
       <tr><th>Kaam</th><th>Sawaal</th></tr>
       <tr><td>Authenticate</td><td>Bhejne wala kaun hai? (signed token, signature)</td></tr>
       <tr><td>Authorize</td><td>Kya ye bhejne wala ye kaam kar sakta hai?</td></tr>
       <tr><td>Validate</td><td>Data ka shape aur range theek hai?</td></tr>
       <tr><td>Audit</td><td>Baad mein saboot milega ki kisne kya kiya?</td></tr>
     </table>`,
    `<h3>🎯 STRIDE — 6 khatre, 6 sawaal</h3>
     <p>Microsoft ka STRIDE ek checklist hai. Har boundary par 6 sawaal poochho:</p>
     <table>
       <tr><th>Khatra</th><th>Sawaal</th><th>Aam control</th></tr>
       <tr><td><b>S</b>poofing</td><td>Koi aur ban ke aa sakta hai?</td><td>Strong login, signed token</td></tr>
       <tr><td><b>T</b>ampering</td><td>Data raaste mein ya DB mein badal sakta hai?</td><td>TLS, signature, integrity check</td></tr>
       <tr><td><b>R</b>epudiation</td><td>Koi mukar sakta hai "maine nahi kiya"?</td><td>Append-only audit log</td></tr>
       <tr><td><b>I</b>nformation disclosure</td><td>Data galat haath lag sakta hai?</td><td>Authorization, kam data bhejo, encryption</td></tr>
       <tr><td><b>D</b>enial of service</td><td>Koi system ko thappa kar sakta hai?</td><td>Rate limit, quota</td></tr>
       <tr><td><b>E</b>levation of privilege</td><td>Aam user admin ka kaam kar sakta hai?</td><td>Least privilege, har function par role check</td></tr>
     </table>
     <p class="tip">⚠️ STRIDE se khatre <b>dhoondhe</b> jaate hain. Checklist poori hone ka matlab "system surakshit" nahi.</p>`,
    `<h3>⚖️ Pehle kaunsa khatra?</h3>
     <p>List mein 20 khatre aayenge. Sab ek saath theek nahi honge. Do cheezein gino:</p>
     <ul>
       <li><b>Asar (impact):</b> paisa gaya? doosre ka data dikha? sirf thodi der dheema hua?</li>
       <li><b>Sambhavna (likelihood):</b> hamla kitna aasaan hai? URL ka ek number badalna, ya data center mein ghusna?</li>
     </ul>
     <p>Bada asar + aasaan hamla = sabse pehle. Har control ki keemat bhi likho: latency, ops ka kaam, user ki pareshani (jaise har baar OTP).</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Kaunsa khatra kis STRIDE dabbe mein?',
      instructions: 'ChaiPay ke asli jaise 8 khatre. Har khatre ko sahi STRIDE dabbe mein daalo.',
      bins: [
        { id: 's', label: '🎭 Spoofing' },
        { id: 't', label: '✏️ Tampering' },
        { id: 'r', label: '🙅 Repudiation' },
        { id: 'i', label: '👀 Info disclosure' },
        { id: 'd', label: '🧱 Denial of service' },
        { id: 'e', label: '👑 Elevation' },
      ],
      items: [
        { text: 'Chor ne Aman ka chura hua token laga ke Aman ka balance dekha', bin: 's', explain: 'Chor Aman <b>ban ke</b> aaya. Identity ki chori = Spoofing. Control: token radd karna (agle levels), device binding.' },
        { text: 'Bank webhook mein amount ₹100 se ₹10,000 kar diya; signature check nahi tha', bin: 't', explain: 'Raaste mein data badla = Tampering. Control: webhook ka signature (HMAC) aur timestamp jaancho.' },
        { text: 'Merchant bola "refund maine nahi kiya" — kisi log mein nahi ki kisne kiya', bin: 'r', explain: 'Saboot nahi = Repudiation. Control: append-only audit log — kaun, kya, kab, kis token se.' },
        { text: 'Export API ne Sharma Sweets ko doosre merchants ke orders bhi de diye', bin: 'i', explain: 'Data galat haath laga = Information disclosure. Multi-tenant level mein yahi bug terminal par chalaoge.' },
        { text: 'Ek bot ne login API par 50,000 request/min bheji; asli users ko 503', bin: 'd', explain: 'Asli users ke liye service band = Denial of service. Control: rate limit, bot detection.' },
        { text: 'Support agent ke role se "settlement account badlo" API bhi chal gayi', bin: 'e', explain: 'Chhote role ne bade role ka kaam kiya = Elevation of privilege. Control: har function par role check, deny by default.' },
        { text: 'Error page ke stack trace mein DB password dikh gaya', bin: 'i', explain: 'Secret galat haath laga = Information disclosure. Control: production mein generic error, secrets kabhi logs ya errors mein nahi.' },
        { text: 'OTP API se ek number par 1,000 SMS gaye; SMS ka bill aur user dono pareshaan', bin: 'd', explain: 'Resource ka bina hadd ke istemaal = Denial of service (OWASP API4: unrestricted resource consumption). Control: har number aur har IP par limit.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Threat model ke faisle',
      questions: [
        {
          q: 'ChaiPay mein naya "bulk refund" feature aa raha hai. Threat model kab karoge?',
          choices: [
            'Design review mein, code se pehle: naksha banao, har boundary par STRIDE poochho',
            'Launch ke baad pen-test se, kyunki asli khatre tabhi dikhte hain jab code live ho',
            'Sirf code review mein, kyunki saare khatre code ki galat lines mein hi hote hain',
            'Jab pehla incident aaye, tab us hisse ka model banao; usse pehle andaaza hi hai',
          ],
          answer: 0,
          explain: 'Design mein badlaav sabse sasta hai. Bulk refund mein paisa jaata hai: kaun refund kar sakta hai, kitna, kitni baar, aur saboot kahan — ye sab design ke sawaal hain. Pen-test aur code review baad mein bhi chahiye.',
          choiceExplanations: [
            'Design mein badlaav sabse sasta hai. Bulk refund mein paisa jaata hai: kaun refund kar sakta hai, kitna, kitni baar, aur saboot kahan — ye sab design ke sawaal hain. Pen-test aur code review baad mein bhi chahiye.',
            'Pen-test zaroori hai, par launch ke baad mila design bug (jaise "koi bhi role refund kar sakta hai") theek karna mehenga hai, aur tab tak paisa ja chuka ho sakta hai.',
            'Kai khatre design ke hain, kisi ek line ke nahi: missing role check, missing audit log, bina hadd ka bulk size. Code review unhe aksar nahi pakadta.',
            'Incident ka intezaar matlab pehla nuksaan grahak uthayenge. Threat model ka poora faayda pehle sochne mein hai.',
          ],
        },
        {
          q: 'Partner bank ka webhook aata hai: "payment 7781 SUCCESS". ChaiPay ko kya jaanchna chahiye?',
          choices: [
            'Signature aur timestamp jaancho; event id se duplicate webhook ko dobara mat chalao',
            'Bank ka IP allowlist kaafi hai; IP sahi ho toh body par poora bharosa kar lo',
            'HTTPS se aaya hai toh body koi badal nahi sakta; seedha SUCCESS maan lo',
            'Webhook ko ek baar fail karo; bank doosri baar bheje tabhi sach maano',
          ],
          answer: 0,
          explain: 'Webhook ek trust boundary hai. Signature (jaise HMAC) se pata chalta hai ki bank ne bheja aur body nahi badli. Signature mein timestamp bhi shaamil ho; server sirf chhoti samay-seema ke andar webhook maane. Samay-seema ke andar replay ko event id ki atomic duplicate jaanch rokti hai.',
          choiceExplanations: [
            'Webhook ek trust boundary hai. Signature (jaise HMAC) se pata chalta hai ki bank ne bheja aur body nahi badli. Signature mein timestamp bhi shaamil ho; server sirf chhoti samay-seema ke andar webhook maane. Samay-seema ke andar replay ko event id ki atomic duplicate jaanch rokti hai.',
            'IP allowlist ek extra parat hai, par IP badal sakte hain aur proxy/cloud IPs saajhe hote hain. Body ka saboot signature deta hai.',
            'HTTPS sirf raaste ko bachata hai. Bhejne wala koi bhi ho sakta hai jo tumhara webhook URL jaanta ho.',
            'Jaan-boojh ke fail karna kuch saabit nahi karta. Hamlawar bhi doosri baar bhej sakta hai, aur asli payments der se dikhenge.',
          ],
        },
        {
          q: 'List mein 20 khatre hain, waqt 2 hafte. Pehle kaunse theek karoge?',
          choices: [
            'Jo paisa ya data le jaayein aur aasaan hon: asar × sambhavna se kram banao',
            'Jo sabse naye aur dilchasp hamle hain; purane hamle sab jaante hain, rukte hain',
            'List ke kram se ek-ek karke; kram badalne se koi khatra chhoot sakta hai',
            'Jo sabse sasta theek ho, woh pehle; chahe asar chhota ho, ginti toh badhegi',
          ],
          answer: 0,
          explain: 'Bada asar + aasaan hamla = sabse pehle. URL ka number badal ke doosre merchant ka data dekhna aasaan hai aur asar bada — woh pehle. Data center mein ghusna mushkil hai — baad mein.',
          choiceExplanations: [
            'Bada asar + aasaan hamla = sabse pehle. URL ka number badal ke doosre merchant ka data dekhna aasaan hai aur asar bada — woh pehle. Data center mein ghusna mushkil hai — baad mein.',
            'Zyadatar breaches purane, saade hamlon se hote hain (missing authorization, leaked keys). Naya hamla dilchasp hai, zaroori nahi.',
            'List ka kram kisi ne bina soche likha tha. Kram asar aur sambhavna se banna chahiye.',
            'Sasta fix achha hai jab asar bhi ho. Sirf ginti badhaane se bada khatra khula reh jaata hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Security kaise sochoge',
    instructions: 'Interviewer ne poochha: "Is design ki security?" 🎤',
    questions: [
      {
        q: '"Is payment design mein security kaise sochoge?" Sabse achha pehla jawab?',
        choices: [
          'Boundaries ginaunga; pehchaan, ijaazat, data ki jaanch aur audit log dekhunga',
          'Sab data encrypt kar dunga; encrypt hua data hamesha surakshit rehta hai',
          'Aage ek WAF laga dunga; WAF saare API hamle bahar hi rok deta hai',
          'Security team alag se dekhegi; system design mein uski jagah nahi hai',
        ],
        answer: 0,
        explain: 'Boundaries ka naksha dikhata hai ki tum system ke hisaab se soch rahe ho. Har boundary par chaar kaam: kaun hai, kya kar sakta hai, data theek hai, aur saboot. Phir sabse bade khatre ka ek control detail mein batao.',
        choiceExplanations: [
          'Boundaries ka naksha dikhata hai ki tum system ke hisaab se soch rahe ho. Har boundary par chaar kaam: kaun hai, kya kar sakta hai, data theek hai, aur saboot. Phir sabse bade khatre ka ek control detail mein batao.',
          'Encryption data ko chori se bachaata hai, par galat user ko sahi token se data dena (authorization bug) encryption nahi rokta.',
          'WAF jaane-pehchane patterns rokta hai. "Merchant 42 ne merchant 88 ka order maanga" jaisa business-logic bug WAF ko normal request lagti hai.',
          'Design mein hi tay hota hai ki check kahan lagega. Baad mein alag team ke liye jagah nahi bachti.',
        ],
      },
      {
        q: 'Merchant kehta hai "ye refund maine nahi kiya". Repudiation se kaise bachoge?',
        choices: [
          'Append-only audit log: kaun, kya, kab, kis token se; log koi badal na sake',
          'App ke normal logs 7 din rakho; zaroorat pade toh grep karke dhoondh lenge',
          'Har refund par merchant se dobara password maango; phir mukarna mushkil hai',
          'Refund row mein updated_by column kaafi hai; purani value rakhna zaroori nahi',
        ],
        answer: 0,
        explain: 'Saboot tabhi kaam ka hai jab koi use mita ya badal na sake — ChaiPay ke engineers bhi nahi. Append-only store (alag permissions ke saath) mein actor, action, object, time aur token/session id rakho.',
        choiceExplanations: [
          'Saboot tabhi kaam ka hai jab koi use mita ya badal na sake — ChaiPay ke engineers bhi nahi. Append-only store (alag permissions ke saath) mein actor, action, object, time aur token/session id rakho.',
          'Normal logs jaldi mitte hain, badle ja sakte hain, aur aksar structured nahi hote. Jhagda 30 din baad bhi aa sakta hai.',
          'Dobara password se friction badhta hai, par saboot phir bhi kahin likha hona chahiye. Chura hua session bhi password maang sakta hai.',
          'updated_by sirf aakhri badlaav dikhata hai, aur row badalne wala usse bhi badal sakta hai. Poori history chahiye.',
        ],
      },
    ],
  },
  success: [
    'Kisi bhi design mein trust boundaries khojna',
    'STRIDE ke 6 sawaal se khatre dhoondhna',
    'Khatron ko asar × sambhavna se kram dena',
  ],
  homework: `Apne kisi project (ya ChaiPay jaise kisi app) ka 5-box naksha banao: phone, gateway, service, DB, ek bahar ki service.
    Har arrow par ek line likho: "yahan STRIDE ka kaunsa khatra?" Sabse bade 2 khatron ke liye ek-ek control aur uski keemat likho.`,
  cards: [
    { front: 'Threat model kab?', back: '<b>Design review mein, code se pehle.</b> Naksha + har trust boundary par "kya bigad sakta hai?"' },
    { front: 'Trust boundary?', back: 'Alag bharose ya permissions wale hisson ke beech ki seema. Wahan: pehchaan (authn), ijaazat (authz), data jaanch aur audit.' },
    { front: 'STRIDE?', back: '<b>S</b>poofing, <b>T</b>ampering, <b>R</b>epudiation, <b>I</b>nfo disclosure, <b>D</b>enial of service, <b>E</b>levation of privilege. Checklist, guarantee nahi.' },
    { front: 'Webhook par bharosa kab?', back: 'Signature + timestamp sahi ho. Event id se duplicate ek baar hi process karo.' },
  ],
},

/* ---------------------------------------------------------------- S2 */
{
  id: 'sec-bola',
  icon: '🚪',
  title: 'Authorization ki teen deewarein — object, field, function',
  badge: 'Darbaan',
  objectives: [
    '<b>BOLA</b>: URL ka ek number badla aur doosre ka data mil gaya — OWASP API #1',
    '<b>Field-level</b>: body mein "kyc_status" bheja aur badal gaya (mass assignment)',
    '<b>Function-level</b>: support ka role admin API chala gaya',
    'Ownership check kahan rakhein, aur har endpoint ko test kaise karein',
  ],
  lesson: [
    `<h3>🏢 Misaal: office ka security guard</h3>
     <p>Office ke gate par guard ID card dekhta hai. Andar aa gaye. Ab teen sawaal bache hain jo gate wala guard nahi poochh sakta:</p>
     <ul>
       <li><b>Object:</b> kya tum <i>is</i> cabin mein ja sakte ho? (har cabin kisi ka hai)</li>
       <li><b>Field:</b> file padh sakte ho, par salary wala page badal sakte ho?</li>
       <li><b>Function:</b> tum intern ho — kya "naye employee ko joining letter do" wala kaam kar sakte ho?</li>
     </ul>
     <p class="tip">🎯 <b>Asli baat:</b> login (authentication) gate hai. <b>Authorization</b> andar ke teen sawaal hain:
       object, field, function. OWASP API Top 10 (2023) mein ye teeno alag-alag jagah par hain: API1, API3, API5.</p>`,
    `<h3>1️⃣ Object — BOLA (Broken Object Level Authorization)</h3>
     <p>Sharma Sweets (merchant 42) ka token. Request: <code>GET /v1/merchants/88/settlements</code>.
       Code ne sirf id se row nikaali. Jawab mein merchant 88 ke settlements.</p>
     <pre>❌ SELECT * FROM settlements WHERE merchant_id = :url_id
✅ SELECT * FROM settlements WHERE merchant_id = :url_id
                               AND merchant_id = :token_merchant   → nahi mila? 404</pre>
     <p>IDs ko UUID karne se guess karna mushkil hota hai, par <b>check phir bhi chahiye</b>. IDs logs, links aur emails mein leak hoti hain.</p>`,
    `<h3>2️⃣ Field — Broken Object <i>Property</i> Level Authorization</h3>
     <p>Do roop hain:</p>
     <ul>
       <li><b>Mass assignment:</b> <code>PATCH /v1/merchants/42</code> body mein <code>"kyc_status": "verified"</code> bheja. Code ne poori body DB mein likh di. KYC bina jaanch ke "verified".</li>
       <li><b>Zyada data bhejna:</b> <code>GET /v1/me</code> ke jawab mein <code>pan_number</code> aur andar ka <code>risk_score</code> bhi.</li>
     </ul>
     <p>Ilaaj: har role ke liye <b>likhne layak fields ki allowlist</b>; jawab mein sirf woh fields jo screen ko chahiye (response DTO: jawab mein bhejne layak fields ka chuna hua roop).</p>`,
    `<h3>3️⃣ Function — BFLA (Broken Function Level Authorization)</h3>
     <p>Support agent ka token. Request: <code>POST /admin/v1/merchants/42/payout-account</code>. Code ne sirf "login hai?" dekha. Settlement ka bank account badal gaya.</p>
     <p>Ilaaj: har route par role/permission check, aur <b>deny by default</b> — naya route bina permission ke likha toh band rahe.</p>
     <h3>📍 Check kahan rakhein?</h3>
     <table>
       <tr><th>Jagah</th><th>Kya kar sakti hai</th></tr>
       <tr><td>Gateway</td><td>Token asli hai? Mota role (merchant / support / admin)?</td></tr>
       <tr><td>Service</td><td>Ye <b>object</b> is merchant ka hai? Ye <b>field</b> ye role badal sakta hai? — data service ke paas hai</td></tr>
     </table>
     <p>40 endpoints par consistency ke liye: ek saajha <code>can(user, action, object)</code> function, aur CI mein har endpoint ka test:
       <b>"merchant A ka token + merchant B ka object → 404"</b>.</p>`,
  ],
  stages: [
    {
      type: 'incident',
      title: '🚨 Twitter par screenshot',
      instructions: 'Ek merchant ne doosri dukaan ka data dekh liya. Sahi kadam chuno.',
      pager: `<b>#security-incident</b> — 10:42 AM<br>
        Twitter par screenshot: "ChaiPay dashboard ke URL mein merchant ka number badla — doosri dukaan ke settlements dikh gaye."<br>
        Endpoint: <code>GET /v1/merchants/{id}/settlements</code>. Token sahi tha (merchant 42), maanga merchant 88.`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehla kadam?',
          choices: [
            { t: 'Endpoint par owner check ka hotfix: merchant_id token se, mismatch par 404', good: true, next: 'scope', explain: 'Pehle khoon rokna. Owner check se aage ka leak turant band. Hotfix chhota rakho taaki jaldi deploy ho.' },
            { t: 'URL ke merchant IDs ko UUID mein badlo, taaki number guess hi na ho sake', good: false, explain: 'Guess mushkil hoga, par jiske paas doosre ki ID hai (link, email, log) woh ab bhi data dekh sakta hai. Asli bug missing check hai.' },
            { t: 'Gateway par rate limit kam karo, taaki koi bahut saare IDs try na kar sake', good: false, explain: 'Ek request bhi leak ke liye kaafi hai. Rate limit sirf bade paimane ki chori dheemi karta hai.' },
            { t: 'Pehle screenshot hatwao aur PR team ko batao; code baad mein dekhenge', good: false, explain: 'Bug abhi bhi khula hai. Communication zaroori hai, par fix ke saath, uske badle mein nahi.' },
          ],
        },
        scope: {
          sitrep: '✅ Hotfix live (11:05). Ab 404 aata hai jab token ka merchant aur URL ka merchant alag hon.',
          text: 'Kitna data gaya — kaise pata karoge?',
          choices: [
            { t: 'Access logs mein dhoondho: kis request mein token ka merchant ≠ URL ka merchant', good: true, next: 'fix', explain: 'Logs se cross-tenant requests dhoondho. Status aur response metadata se jaancho ki data sach mein gaya ya request ruki. Row count log nahi hua toh exact rows ka daava mat karo.' },
            { t: 'DB ka slow query log dekho; jo queries chali hain, unhi se leak ginenge', good: false, explain: 'Slow query log sirf dheemi queries rakhta hai. Leak wali queries tez aur normal thi.' },
            { t: 'Maan lo ki sirf screenshot wale merchant ne dekha; baaki koi nahi jaanta', good: false, explain: 'Andaaza saboot nahi. Bug kab se tha aur kisne use kiya, logs batayenge.' },
            { t: 'Saare merchants ke password reset karwa do; usse purana leak bhi band', good: false, explain: 'Password sahi the; tokens bhi sahi the. Reset se pichhla leak nahi ginega aur grahak pareshaan honge.' },
          ],
        },
        fix: {
          sitrep: '📊 Logs: 9 din mein 3 merchants ne 41 baar doosre merchant ka data dekha. Saare prabhavit merchants ko suchit kiya.',
          text: 'Dobara na ho — systemic fix?',
          choices: [
            { t: 'Saajha can() check + CI test: A ka token aur B ka object har endpoint par 404', good: true, next: 'end', explain: 'Ek jagah policy, aur har endpoint ka test jo cross-tenant access ko fail karta hai. Naya endpoint test ke bina merge nahi.' },
            { t: 'Code review checklist mein likh do: "authorization yaad rakhna"', good: false, explain: 'Yaad rakhna wahi cheez hai jo is baar bhooli gayi. Test aur default-deny yaaddasht par nahi chalte.' },
            { t: 'Saare IDs encrypt karke bhejo; encrypt ID ko koi badal nahi sakta', good: false, explain: 'Encrypt ID bhi copy ho sakti hai. Doosre ki asli link mil gayi toh check ke bina data milega.' },
            { t: 'Sirf is endpoint ko theek karo; baaki endpoints mein pehle se check hai', good: false, explain: '"Pehle se hai" kisne jaancha? Ek endpoint mein chhoota toh baaki mein bhi ho sakta hai. Test se pata chalega.' },
          ],
        },
        end: {
          end: true,
          text: 'Incident band. Har endpoint ab cross-tenant test se guzarta hai.',
          summary: `<b>Seekh:</b> login sahi hona aur object ka maalik hona do alag sawaal hain.
            <br><br><b>Teen niyam:</b>
            <br>1. Har fetch par maalik = token ka merchant; mismatch par 404.
            <br>2. Leak ki ginti access logs se: token ka merchant ≠ URL ka merchant.
            <br>3. Saajha <code>can()</code> + CI test, taaki naya endpoint bhi bina check ke na jaaye.`,
        },
      },
    },
    {
      type: 'bins',
      title: 'Kaunsi deewar toot rahi hai?',
      instructions: 'Har bug ko sahi deewar mein daalo: object, field ya function.',
      bins: [
        { id: 'obj', label: '📦 Object (BOLA)' },
        { id: 'prop', label: '🏷️ Field (property)' },
        { id: 'fn', label: '🔧 Function (BFLA)' },
      ],
      items: [
        { text: 'GET /orders/9001 — order kisi aur merchant ka, phir bhi mil gaya', bin: 'obj', explain: 'Object kiska hai, ye check nahi hua. Query mein merchant_id = token ka merchant.' },
        { text: 'PATCH /me body mein "role": "admin" bheja aur role badal gaya', bin: 'prop', explain: 'Mass assignment. User sirf allowlist wale fields (naam, phone) badal sake.' },
        { text: 'Support agent ne DELETE /admin/merchants/42 chala diya', bin: 'fn', explain: 'Function sirf admin ka tha. Route par role check missing.' },
        { text: 'GET /me ke jawab mein password_hash aur risk_score bhi aaye', bin: 'prop', explain: 'Zyada fields bhej diye. Response DTO mein sirf screen ke fields.' },
        { text: 'Merchant 42 ne invoice 7781 download kiya jo merchant 88 ka tha', bin: 'obj', explain: 'Wahi BOLA: object ka maalik check nahi hua.' },
        { text: 'Aam merchant token se POST /internal/payouts/retry bhi chal gaya', bin: 'fn', explain: 'Andar ka function bahar khula. Deny by default: permission na ho toh band.' },
        { text: 'PATCH /orders/5 mein "amount": 1 bhej ke paid order ka amount badla', bin: 'prop', explain: 'Order merchant ka hi tha (object theek), par amount field koi badal hi nahi sakta. Field allowlist.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Authorization ke faisle',
      questions: [
        {
          q: 'Team ne saari IDs UUID kar di. Kya ab BOLA ka khatra khatam?',
          choices: [
            'Nahi; guess mushkil hua, par har fetch par owner check phir bhi chahiye',
            'Haan; UUID guess karna lagbhag namumkin hai, toh check ki zaroorat nahi',
            'Haan, agar UUIDv4 ho; sirf UUIDv7 mein time hai isliye wahan check chahiye',
            'Nahi; par UUID ko base64 karke bhejo, tab owner check ki zaroorat nahi',
          ],
          answer: 0,
          explain: 'UUID guess ko mushkil banata hai, authorization nahi deta. IDs links, emails, logs aur screenshots mein leak hoti hain. Jiske paas ID hai, check ke bina woh data dekh lega.',
          choiceExplanations: [
            'UUID guess ko mushkil banata hai, authorization nahi deta. IDs links, emails, logs aur screenshots mein leak hoti hain. Jiske paas ID hai, check ke bina woh data dekh lega.',
            'Guess ka khatra kam hua, leak ka nahi. Ek forwarded link kaafi hai.',
            'Version se farak nahi padta. Dono versions mein ID mil gayi toh check hi bachata hai.',
            'base64 sirf encoding hai; koi bhi decode/encode kar sakta hai. Ye check ki jagah nahi le sakta.',
          ],
        },
        {
          q: '"Ye order is merchant ka hai?" — ye check kahan rakhoge?',
          choices: [
            'Service mein, data ke saath: query mein merchant_id = token ka merchant',
            'Sirf gateway par; gateway token dekh ke har object ka faisla kar deta hai',
            'Frontend mein; jo button user ke kaam ka nahi, woh dikhao hi mat',
            'Logs mein; baad mein galat access pakad ke us user ko ban kar do',
          ],
          answer: 0,
          explain: 'Object kiska hai, ye data service ke paas hai. Gateway token aur mota role dekh sakta hai, par order 9001 ka maalik nahi jaanta. Database ki policy (RLS, agle levels mein) ek doosri parat ban sakti hai.',
          choiceExplanations: [
            'Object kiska hai, ye data service ke paas hai. Gateway token aur mota role dekh sakta hai, par order 9001 ka maalik nahi jaanta. Database ki policy (RLS, agle levels mein) ek doosri parat ban sakti hai.',
            'Gateway ke paas order ka data nahi hai. Har order ke liye DB poochhna gateway ko service bana deta hai.',
            'Hamlawar frontend use hi nahi karta; seedha API call karta hai. Button chhupana UX hai, security nahi.',
            'Logs baad mein batate hain; data tab tak ja chuka hota hai. Logs saboot hain, rok nahi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Authorization',
    instructions: 'Microservices aur multi-tenant API ke sawaal. 🎤',
    questions: [
      {
        q: '40 microservice endpoints hain. Authorization ko consistent kaise rakhoge?',
        choices: [
          'Saajha can(user, action, object) check; CI mein har endpoint ka cross-tenant test',
          'Har team apne tareeke se check likhe; har service ka domain alag hota hai',
          'Sirf gateway par saare niyam rakho; services ko authorization ka pata na ho',
          'Har quarter ek pen-test karwao; jo bug mile, us endpoint ko theek kar do',
        ],
        answer: 0,
        explain: 'Policy ek jagah, test har endpoint par. Test ka niyam seedha hai: merchant A ke token se merchant B ka object → 404. Naya endpoint test ke bina merge nahi. Pen-test upar ki parat hai.',
        choiceExplanations: [
          'Policy ek jagah, test har endpoint par. Test ka niyam seedha hai: merchant A ke token se merchant B ka object → 404. Naya endpoint test ke bina merge nahi. Pen-test upar ki parat hai.',
          'Alag tareeke = alag galtiyan. Domain alag ho sakta hai, par "object kiska hai" ka sawaal sab mein ek jaisa hai.',
          'Gateway object ka maalik nahi jaanta. Object aur field ke check service mein hi ho sakte hain.',
          'Pen-test teen mahine mein ek baar dekhta hai; beech ke deploy bina jaanch ke jaate hain.',
        ],
      },
      {
        q: 'Merchant 42 ne merchant 88 ka order maanga. Kaunsa status code doge?',
        choices: [
          '404: doosre ka object hai ya nahi, ye bhi mat batao; apne log mein asli wajah',
          '200 aur khaali object; client ko error handle karne ka jhanjhat nahi hoga',
          '401; taaki user dobara login kare aur sahi merchant chun sake',
          '403 aur error mein us order ke maalik merchant ka naam bhi batao',
        ],
        answer: 0,
        explain: '404 se hamlawar ko ye bhi nahi pata chalta ki order 9001 hai bhi ya nahi. Kai APIs 403 dete hain — wo bhi chalega, bas maalik ki jaankari mat do. Apne audit log mein asli wajah (cross-tenant access) likho.',
        choiceExplanations: [
          '404 se hamlawar ko ye bhi nahi pata chalta ki order 9001 hai bhi ya nahi. Kai APIs 403 dete hain — wo bhi chalega, bas maalik ki jaankari mat do. Apne audit log mein asli wajah (cross-tenant access) likho.',
          '200 se client sochega request safal thi. Bugs chhup jaate hain aur monitoring mein dikhte nahi.',
          '401 ka matlab "tum kaun ho, pata nahi". Yahan token sahi hai; sawaal permission ka hai.',
          'Maalik ka naam batana khud ek information disclosure hai.',
        ],
      },
    ],
  },
  success: [
    'Object, field aur function — teeno deewarein alag pehchanna',
    'Ownership check service mein, data ke saath rakhna',
    'Har endpoint ka cross-tenant test likhwana',
  ],
  homework: `Kisi bhi API (apni ya public docs wali) ke 5 endpoints lo. Har ek ke saamne teen sawaal likho:
    object kiska hai? kaunse fields kaun badal sakta hai? kaunsa role ye function chala sakta hai?
    Jahan jawab "pata nahi" hai, wahan ek test likho: doosre user ke token se 404 aana chahiye.`,
  cards: [
    { front: 'BOLA?', back: 'Broken Object Level Authorization — URL/body mein doosre ka object id aur data mil gaya. Ilaaj: har fetch par <b>maalik = token ka user</b>. OWASP API1:2023.' },
    { front: 'Mass assignment?', back: 'Body ke saare fields DB mein likh diye ("role": "admin"). Ilaaj: har role ke liye <b>likhne layak fields ki allowlist</b>.' },
    { front: 'BFLA?', back: 'Chhote role ne bade role ka function chala diya. Ilaaj: har route par permission, <b>deny by default</b>.' },
    { front: 'UUID se BOLA khatam?', back: 'Nahi. Guess mushkil, par leak hui ID se data milega. Check phir bhi chahiye.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['sec-threat'] = {
  t: 'ChaiPay ka naksha — har boundary par STRIDE',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">📱 Aman ka phone<br><small>tumhare kaabu mein nahi</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🚪 api-gateway<br><small>boundary 1: token asli?</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">⚙️ wallet-api<br><small>authorize + validate</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🗄️ ledger-db<br><small>audit log alag</small></span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill bad">🏦 partner bank<br><small>bahar ki service</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🔏 webhook<br><small>boundary 2: signature + timestamp</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">⚙️ wallet-api</span>
    </div>
    <div class="dg-cap">Har arrow par 6 sawaal: <b>S</b> koi aur bana? <b>T</b> data badla? <b>R</b> saboot hai? <b>I</b> data leak? <b>D</b> thappa? <b>E</b> chhota role bada kaam?</div>`,
};
VISUALS['sec-bola'] = {
  t: 'Gate ke andar teen deewarein',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🍬 merchant 42 ka token</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🚪 gateway<br><small>login sahi? mota role?</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good">⚙️ service<br><small>teen deewarein</small></span>
    </div>
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">📦</span><span class="nl">Object (API1)</span><span class="ns">GET /merchants/88/… → maalik 42 nahi → 404</span></div>
      <div class="dg-node is-gold"><span class="ni">🏷️</span><span class="nl">Field (API3)</span><span class="ns">"kyc_status" body mein → allowlist mein nahi → ignore/400</span></div>
      <div class="dg-node is-accent"><span class="ni">🔧</span><span class="nl">Function (API5)</span><span class="ns">support role → /admin/… → deny by default</span></div>
    </div>
    <div class="dg-cap">Gateway sirf token aur mota role jaanta hai. <b>Object kiska hai</b>, ye data service ke paas hai — check wahin.</div>`,
};

SD.addScenes({
  'sec-threat': {
    intro: 'ChaiPay ka naksha banao. Phir har <b>trust boundary</b> par STRIDE ke sawaal poochho.',
    nodes: [
      { id: 'phone', col: 0, row: 0, icon: '📱', label: 'Aman ka phone', sub: 'kaabu mein nahi', tone: 'bad' },
      { id: 'gw', col: 1, row: 0, icon: '🚪', label: 'api-gateway', sub: 'boundary 1' },
      { id: 'wallet', col: 2, row: 0, icon: '⚙️', label: 'wallet-api' },
      { id: 'db', col: 3, row: 0, icon: '🗄️', label: 'ledger-db' },
      { id: 'bank', col: 0, row: 1, icon: '🏦', label: 'Partner bank', sub: 'bahar ki service', tone: 'bad' },
      { id: 'hook', col: 1, row: 1, icon: '🔏', label: 'webhook endpoint', sub: 'boundary 2' },
      { id: 'audit', col: 3, row: 1, icon: '📜', label: 'audit log', sub: 'append-only' },
    ],
    steps: [
      { at: ['phone', 'bank'], say: 'Do jagah se data andar aata hai: Aman ka phone aur partner bank. Dono tumhare kaabu mein nahi. Inse aaya har byte shak ke saath padho.' },
      { from: 'phone', to: 'gw', label: 'POST /v1/pay', say: 'Boundary 1. Spoofing ka sawaal: request sach mein Aman ki hai? Signed token jaancho, sirf header ka naam nahi.' },
      { from: 'gw', to: 'wallet', label: 'user = Aman', say: 'wallet-api mein Elevation aur Info disclosure ke sawaal: Aman ye kaam kar sakta hai? Jawab mein sirf Aman ka data jaaye?' },
      { from: 'wallet', to: 'db', label: 'debit ₹500', tone: 'good', say: 'Tampering: amount raaste mein badla toh? Server amount khud jaanchta hai; client ki keemat par bharosa nahi.' },
      { from: 'bank', to: 'hook', label: 'payment SUCCESS', say: 'Boundary 2: bank ka webhook. Signature aur timestamp jaancho. Bina signature wala "SUCCESS" koi bhi bhej sakta hai.' },
      { from: 'hook', to: 'wallet', label: 'event id 7781', bend: 40, say: 'Signed timestamp ko chhoti samay-seema se jaancho. Event id ki atomic duplicate jaanch samay-seema ke andar bhi dobara processing rokti hai.' },
      { from: 'wallet', to: 'audit', label: 'kaun, kya, kab', tone: 'gold', say: 'Repudiation ka jawab: append-only audit log. Merchant mukre toh saboot ho; log engineers bhi na badal sakein.' },
      { at: ['gw'], set: { gw: { tone: 'gold', sub: 'rate limit: Denial' } }, say: 'Denial of service: ek bot 50,000 request/min bheje toh? Gateway par rate limit. Ab har boundary par 6 sawaal poochh liye.' },
    ],
  },
  'sec-bola': {
    intro: 'Sharma Sweets (merchant 42) ne URL mein number <b>88</b> kar diya. Token sahi hai. Kya hoga?',
    nodes: [
      { id: 'm42', col: 0, row: 0, icon: '🍬', label: 'Sharma Sweets', sub: 'token: merchant 42', tone: 'accent' },
      { id: 'gw', col: 1, row: 0, icon: '🚪', label: 'api-gateway', sub: 'token asli?' },
      { id: 'api', col: 2, row: 0, icon: '⚙️', label: 'settlements-api' },
      { id: 'db', col: 3, row: 0, icon: '🗄️', label: 'settlements table' },
      { id: 'log', col: 2, row: 1, icon: '📜', label: 'access log', sub: 'token ≠ URL?' },
    ],
    steps: [
      { from: 'm42', to: 'gw', label: 'GET /merchants/88/…', say: 'Sharma Sweets ka token merchant 42 ka hai. URL mein merchant 88 likha hai.' },
      { from: 'gw', to: 'api', label: 'token sahi ✅', say: 'Gateway ne token ka signature jaancha. Login sahi hai. Gateway ko nahi pata ki settlements kiske hain.' },
      { from: 'api', to: 'db', label: 'WHERE merchant_id=88', tone: 'bad', say: 'Purana code: sirf URL ki id se row nikaali. Token ka merchant dekha hi nahi.' },
      { at: ['m42', 'db'], set: { db: { tone: 'bad', sub: 'leak!' }, m42: { tone: 'bad', sub: 'merchant 88 ka data' } }, say: 'Merchant 88 ke settlements Sharma Sweets tak pahunch gaye. Ye BOLA hai: OWASP API Top 10 ka number 1.' },
      { from: 'api', to: 'db', label: 'AND merchant_id=42', tone: 'good', set: { db: { tone: 'good', sub: 'owner check' } }, say: 'Hotfix: query mein doosri shart — merchant_id = token ka merchant. Row nahi mili.' },
      { at: ['m42'], set: { m42: { tone: 'good', sub: '404 Not Found' } }, say: '404: hamlawar ko ye bhi nahi pata chalta ki merchant 88 ke settlements hain ya nahi.' },
      { from: 'api', to: 'log', label: 'cross-tenant try', tone: 'gold', say: 'Access log mein likho: token 42, maanga 88. Status aur response metadata se jaancho ki data gaya ya request ruki. Row count log na ho toh exact rows ka daava mat karo.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-sec-threat', levels: 'sec-threat', guide: {
    title: 'Pehle naksha, phir taala',
    misaal: 'Sharma ji ne darwaze par mehenga taala lagaya, chor khidki se aaya. Pehle gino ki andar aane ke kitne raaste hain, phir har raaste par taala chuno.',
    asli: 'Threat model design ke waqt banta hai: system ka naksha, har trust boundary, aur har boundary par STRIDE ke 6 sawaal.',
    points: [
      '<b>Boundary:</b> jahan data phone ya bahar ki service se andar aata hai.',
      '<b>STRIDE:</b> Spoofing, Tampering, Repudiation, Info disclosure, Denial, Elevation.',
      '<b>Kram:</b> asar × sambhavna; bada asar aur aasaan hamla sabse pehle.',
    ],
    use: 'Naya feature paisa, personal data ya permissions ko chhoota ho.',
    avoid: 'Checklist poori hone ko "system surakshit" mat maano; STRIDE khatre dhoondhta hai, guarantee nahi deta.',
    mistake: 'Sirf bahar ke hamlawar ko sochna; andar ka support role aur bahar ki service bhi boundary hain.',
    compare: [
      { choice: 'Design review mein threat model', when: 'Feature abhi kaagaz par hai', tradeoff: 'Sabse sasta badlaav; par andaaze par chalta hai, baad mein test se pakka karo' },
      { choice: 'Launch ke baad pen-test', when: 'Code live hai aur asli behaviour jaanchna hai', tradeoff: 'Asli bugs milte hain; par design ka bug theek karna tab mehenga hai' },
    ],
    followup: 'Partner bank ka webhook signature ke saath aata hai, par bank ki key leak ho gayi. Ab kaun sa control bachayega?',
    sources: [
      { title: 'Microsoft — Threat Modeling Tool: STRIDE threats', url: 'https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats' },
      { title: 'OWASP — Threat Modeling Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html' },
    ],
  } },
  { id: 'pro-sec-authz', levels: 'sec-bola', guide: {
    title: 'Login gate hai; andar teen deewarein',
    misaal: 'Office ke gate par ID card dikhaya. Andar har cabin, har file ka page, har kaam ka alag niyam hai — gate wala guard ye nahi jaanta.',
    asli: 'Authorization ke teen sawaal: ye object kiska hai, ye field kaun badal sakta hai, ye function kaun chala sakta hai.',
    points: [
      '<b>Object:</b> har fetch par maalik = token ka user (BOLA, API1).',
      '<b>Field:</b> likhne layak fields ki allowlist; jawab mein kam fields (API3).',
      '<b>Function:</b> har route par permission, deny by default (API5).',
    ],
    use: 'Multi-tenant API jahan URL ya body mein object id aati hai.',
    avoid: 'UUID ya encryption ko authorization mat samjho; leak hui ID se data milega.',
    mistake: 'Gateway par login check karke maan lena ki service ke andar sab surakshit hai.',
    compare: [
      { choice: 'Service mein owner check', when: 'Object ka data service ke paas hai', tradeoff: 'Sahi jagah; par har endpoint mein lagana padta hai — saajha can() aur test chahiye' },
      { choice: 'Database policy (RLS)', when: 'Ek hi DB mein sab tenants ka data hai', tradeoff: 'Code bhoole toh bhi DB rokta hai; par setup aur debugging mushkil' },
    ],
    followup: 'Ek merchant ke do branch hain aur manager dono dekh sakta hai. Owner check ka niyam kaise badlega?',
    sources: [
      { title: 'OWASP API Security Top 10 — 2023', url: 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/' },
      { title: 'OWASP — Authorization Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html' },
    ],
  } },
);
})();
