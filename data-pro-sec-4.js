/* =====================================================================
   System Gurukul — 🔐 Security aur Multi-tenancy (track pro-sec), hissa 4
   Levels: sec-abuse, boss-sec (design canvas + twists). Boss track ka aakhri level hai.
   ===================================================================== */
(() => {
SD.registerLevels('pro-sec', [
/* ---------------------------------------------------------------- S7 */
{
  id: 'sec-abuse',
  icon: '🤖',
  title: 'Bots aur abuse — OTP bombing aur credential stuffing',
  badge: 'Bot Bhagaane Wala',
  objectives: [
    '<b>Credential stuffing</b>: doosri sites ke leak hue passwords se login ki baarish',
    '<b>SMS pumping</b>: OTP API se kisi aur ki kamaai, tumhara bill',
    'Limit kis cheez par: IP, phone number, account, device — har ek ki kamzori',
    'Friction ki seedhi: asli user par kam, shak par zyada',
  ],
  lesson: [
    `<h3>🍬 Misaal: mithai ki dukaan par free sample</h3>
     <p>Sharma Sweets ne free sample rakha. Ek aadmi 50 baar line mein laga — har baar nayi topi.</p>
     <p>"Ek aadmi ek sample" ka niyam topi se toot gaya. "Ek gali se 10 sample" ka niyam doston ki toli se toot gaya.</p>
     <p class="tip">🎯 <b>Asli baat:</b> bots ek pehchaan badal ke aate hain: IP, phone number, account, device.
       Ek akela niyam kaafi nahi. Kai signals milaao, aur shak badhe toh rukawat (friction) badhao.
       OWASP API Top 10 isko API4 (bina hadd ka resource use) aur API6 (zaroori business flow par bina hadd ki pahunch) kehta hai.</p>`,
    `<h3>🔐 Credential stuffing</h3>
     <p>Hamlawar ke paas doosri websites ke leak se <b>1 crore email + password</b>. Bahut log ek hi password har jagah lagaate hain.
       Bot ChaiPay ke login par ek-ek karke try karta hai.</p>
     <p><b>50,000 alag IPs</b> se (botnet, residential proxies) — har IP se sirf 3 try. Isliye per-IP limit akela nahi rokta.</p>
     <p>Kaam ke signals:</p>
     <ul>
       <li>Naye device se login par OTP ya doosra factor</li>
       <li>Password jo jaane-maane leaks mein hai, use mana karo</li>
       <li>Kai accounts par ek jaisi failures: poore system ka failure rate dekho</li>
       <li>Ek account par galat passwords: delay badhao — account <b>lock</b> mat karo (warna hamlawar asli users ko lock kar dega)</li>
     </ul>`,
    `<h3>📱 OTP bombing aur SMS pumping</h3>
     <p>OTP API par koi hadd nahi. Do tarah ka nuksaan:</p>
     <ul>
       <li><b>OTP bombing:</b> ek number par 1,000 SMS — kisi ko pareshaan karne ke liye.</li>
       <li><b>SMS pumping:</b> bot mehenge (premium) numbers par lakhon OTP bhejwata hai. Hamlawar ko telecom se hissa milta hai. Bill tumhara.</li>
     </ul>
     <p><b>Kalpanik ₹ hisaab:</b> maano ek SMS ₹0.25. Ek raat mein 10 lakh nakli OTP = <b>₹2.5 lakh</b>. Premium international numbers par kai guna zyada.</p>
     <p>Pehchaan: <b>conversion rate</b> — kitne OTP bheje vs kitne sahi bhare gaye. Asli users mein zyadatar bharte hain. Pumping mein lagbhag koi nahi.</p>`,
    `<h3>🪜 Friction ki seedhi</h3>
     <table>
       <tr><th>Risk</th><th>Rukawat</th></tr>
       <tr><td>Jaana-pehchana device, normal raftaar</td><td>Kuch nahi</td></tr>
       <tr><td>Thoda tez ya naya network</td><td>Chhota delay, 429 + Retry-After</td></tr>
       <tr><td>Naya device, ajeeb pattern</td><td>CAPTCHA ya OTP</td></tr>
       <tr><td>Saaf hamla</td><td>Block</td></tr>
     </table>
     <p>Har seedhi ki keemat: asli user ka pareshaan hona. Isliye asli user ke liye neeche ke daande, shak ke liye upar ke.</p>`,
  ],
  stages: [
    {
      type: 'incident',
      title: '🚨 Raat 2 baje — SMS bill ka alert',
      instructions: 'OTP API par kuch gadbad hai. Sahi kadam chuno.',
      pager: `<b>#billing-alerts</b> — 2:14 AM<br>
        SMS provider: pichhle 1 ghante mein <b>4,20,000</b> OTP SMS (normal: 3,000).<br>
        92% numbers ek hi desh code ke premium range mein. OTP sahi bharne wale: <b>0.1%</b>.`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehla kadam?',
          choices: [
            { t: 'OTP API par turant: desh code ki allowlist aur per-number, per-IP limit', good: true, next: 'why', explain: 'Khoon rokna. Allowlist premium range ko band karti hai; limits baaki baarish ko. Asli Indian users chalte rahte hain.' },
            { t: 'SMS provider badal do; naye provider ki per-SMS keemat kam hai', good: false, explain: 'Sasta provider bhi har SMS ka paisa lega. Hamla wahi rahega, bill thoda kam.' },
            { t: 'OTP API poori band karo jab tak subah team na aaye', good: false, explain: 'Saare asli users ka login band. Allowlist aur limit se chhota, sahi ilaaj mumkin hai.' },
            { t: 'Alert ko mute karo; subah team aaram se dekhegi', good: false, explain: 'Har ghante ₹1 lakh se zyada. Subah tak bill bahut bada.' },
          ],
        },
        why: {
          sitrep: '✅ Allowlist aur limits live (2:31 AM). SMS wapas ~3,000/ghanta.',
          text: 'Hamla kis tarah ka tha?',
          choices: [
            { t: 'SMS pumping: premium numbers par OTP bhejwa ke telecom se hissa kamana', good: true, next: 'fix', explain: 'Premium range + lagbhag zero conversion = pumping ki pehchaan. Maksad ChaiPay mein ghusna nahi, SMS se kamaana tha.' },
            { t: 'Asli users baar-baar OTP maang rahe the, kyunki SMS der se pahunch rahe the', good: false, explain: 'Asli users ka conversion zyada hota hai aur numbers Indian hote. 0.1% conversion ye nahi dikhata.' },
            { t: 'DDoS: maksad ChaiPay ke servers ko girana tha', good: false, explain: 'Servers theek chal rahe the. Nuksaan bill ka tha, uptime ka nahi.' },
            { t: 'Kisi employee ne galti se load test production par chala diya', good: false, explain: 'Load test premium desh code ke numbers nahi chunta. Pattern bahar ka hai.' },
          ],
        },
        fix: {
          sitrep: '📊 Bill: ek ghante ka ~₹1 lakh (kalpanik rate). Provider se dispute file kiya.',
          text: 'Dobara na ho — systemic fix?',
          choices: [
            { t: 'Conversion rate par alert, desh allowlist, aur resend par CAPTCHA', good: true, next: 'end', explain: 'Conversion alert minton mein pakadta hai. Allowlist premium range band rakhti hai. CAPTCHA bot ke resend ko mehenga banata hai.' },
            { t: 'IP blocklist mein aaj ke saare IPs daal do', good: false, explain: 'Agli baar naye IPs aayenge. Botnet ke paas lakhon IPs hain.' },
            { t: 'OTP ki lambai 6 se 8 digit karo; lamba OTP bots rokta hai', good: false, explain: 'Lambai OTP guess karna mushkil karti hai. Pumping mein bot OTP bharta hi nahi — usse SMS bhejwana hai.' },
            { t: 'Har OTP ka kharcha user ke wallet se kaat lo', good: false, explain: 'Asli users ko saza, aur bot ka wallet hai hi nahi.' },
          ],
        },
        end: {
          end: true,
          text: 'Incident band. OTP API ab apni keemat jaanti hai.',
          summary: `<b>Seekh:</b> har API jo paisa kharch karwaati hai (SMS, email, payment), ek business flow hai — use bina hadd ke mat chhodo.
            <br><br><b>Teen niyam:</b>
            <br>1. Kai signals par limit: number, IP, device, desh.
            <br>2. Conversion rate (bheja vs bhara) par alert.
            <br>3. Shak badhe toh friction badhao: CAPTCHA, cooldown.`,
        },
      },
    },
    {
      type: 'match',
      title: 'Kaunse hamle par kaunsa ilaaj?',
      pairs: [
        { left: 'Ek number par 1,000 OTP — kisi ko pareshaan karna', right: 'Per-number limit + badhta cooldown', explain: 'Hamla ek number par hai, toh hadd bhi number par. Cooldown har resend ke saath badhta hai.' },
        { left: '1 crore leaked passwords, 50,000 IPs se, har IP 3 try', right: 'Leaked-password check + naye device par OTP', explain: 'IP limit ke neeche hamla hai. Account aur device ke signals kaam aate hain.' },
        { left: 'Ek account par 500 galat passwords', right: 'Per-account delay badhao, lock nahi', explain: 'Lock karne se hamlawar asli user ko bahar kar sakta hai. Delay se guessing dheemi, user safe.' },
        { left: 'Premium numbers par lakhon OTP, conversion 0.1%', right: 'Desh allowlist + conversion alert', explain: 'Pumping ki pehchaan conversion hai. Allowlist premium range band karti hai.' },
        { left: 'Ek IP se ek minute mein 2,000 signups', right: 'Per-IP limit + CAPTCHA', explain: 'Yahan IP hi saaf signal hai. 429 ya CAPTCHA.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Abuse ke faisle',
      questions: [
        {
          q: '5 galat password par account 24 ghante ke liye lock. Kya dikkat hai?',
          choices: [
            'Hamlawar jaan-boojh ke asli users ko lock kar sakta hai; delay ya OTP behtar',
            'Koi dikkat nahi; 5 galat password ka matlab pakka hamla hi hai, lock sahi',
            'Lock 24 ghante bahut kam hai; hamla rokna hai toh 7 din ka lock karo',
            'Lock ki jagah password ka hint dikhao, taaki asli user yaad kar sake',
          ],
          answer: 0,
          explain: 'Lockout khud ek denial of service ban jaata hai: hamlawar kisi ka bhi email daal ke 5 galat password bhejta hai. Badhta delay, CAPTCHA ya OTP guessing ko dheema karte hain bina asli user ko bahar kiye.',
          choiceExplanations: [
            'Lockout khud ek denial of service ban jaata hai: hamlawar kisi ka bhi email daal ke 5 galat password bhejta hai. Badhta delay, CAPTCHA ya OTP guessing ko dheema karte hain bina asli user ko bahar kiye.',
            'Asli users bhi password bhoolte hain. Aur hamlawar lock ko hathiyaar bana sakta hai.',
            'Lamba lock asli users ka nuksaan aur badhata hai.',
            'Hint hamlawar ko bhi dikhega. Password ke baare mein koi jaankari mat do.',
          ],
        },
        {
          q: 'Credential stuffing 50,000 IPs se, har IP se 3 try. Per-IP limit 100/min kaam karega?',
          choices: [
            'Nahi; har IP limit ke neeche hai. Device aur leaked-password signals chahiye',
            'Haan; 100/min ki limit saare bots ko rok degi, chahe kitne bhi IPs hon',
            'Haan, agar limit 100 se ghata ke 10/min kar do; tab bots ruk jaayenge',
            'Nahi; isliye login API band karo jab tak hamla khud na ruk jaaye',
          ],
          answer: 0,
          explain: '3 try per IP kisi bhi IP limit ke neeche hai. Hamla baanta hua hai, isliye signals bhi doosre chahiye: naya device, leaked password, poore system ka failure rate.',
          choiceExplanations: [
            '3 try per IP kisi bhi IP limit ke neeche hai. Hamla baanta hua hai, isliye signals bhi doosre chahiye: naya device, leaked password, poore system ka failure rate.',
            'Limit per IP hai; 3 try har IP se kabhi limit tak pahunchte hi nahi.',
            '10/min bhi 3 se zyada hai. Aur office ke saajhe IP waale asli users ruk sakte hain.',
            'Login band = saare users ke liye outage. Hamlawar yahi chahta ho sakta hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Abuse aur rate limits',
    instructions: 'OTP aur login ke abuse sawaal. 🎤',
    questions: [
      {
        q: 'OTP login API design karo. Abuse se kaise bachaoge?',
        choices: [
          'Number, IP aur device par limit; desh allowlist; resend par CAPTCHA; conversion alert',
          'Sirf per-IP limit; har mobile user ka IP alag hota hai, toh ye kaafi rahega',
          'OTP 4 ki jagah 8 digit ka karo; lamba OTP bots ko apne aap rok deta hai',
          'OTP ko API response mein bhi bhejo; SMS fail ho toh bhi user login kar sake',
        ],
        answer: 0,
        explain: 'OTP API paisa kharch karwaati hai aur login ka darwaza hai. Kai pehchaanon par hadd, desh ki allowlist, resend par rukawat, aur conversion par alert — sab saath.',
        choiceExplanations: [
          'OTP API paisa kharch karwaati hai aur login ka darwaza hai. Kai pehchaanon par hadd, desh ki allowlist, resend par rukawat, aur conversion par alert — sab saath.',
          'Mobile networks mein bahut users ek IP share karte hain (CGNAT), aur botnet ke paas lakhon IPs. Akela IP signal kamzor hai.',
          'Lambai guessing rokti hai, pumping ya bombing nahi — wahan bot OTP bharta hi nahi.',
          'Response mein OTP = koi bhi kisi ka bhi login kar le. Ye seedha security hole hai.',
        ],
      },
      {
        q: 'Asli users par friction kam kaise rakhoge?',
        choices: [
          'Risk ke hisaab se: jaana device bina rukawat; naya device ya shak par OTP',
          'Sab par CAPTCHA; har user ke liye bas ek baar ki chhoti si takleef hai',
          'Koi friction nahi; bots ko baad mein logs se pakad ke block kar denge',
          'Har login par OTP aur CAPTCHA dono; jitni rukawat, utni suraksha',
        ],
        answer: 0,
        explain: 'Friction ek budget hai. Shak wali traffic par kharch karo, jaane-pehchaane users par nahi. Isse conversion bhi bachta hai aur hamla bhi mehenga.',
        choiceExplanations: [
          'Friction ek budget hai. Shak wali traffic par kharch karo, jaane-pehchaane users par nahi. Isse conversion bhi bachta hai aur hamla bhi mehenga.',
          'Har user par CAPTCHA se asli users chhodte hain. Bots aksar CAPTCHA solving services use karte hain.',
          'Baad mein pakadna = nuksaan ho chuka (bill, chori hue accounts).',
          'Zyada rukawat se users bhaag jaate hain. Suraksha aur suvidha dono ka hisaab chahiye.',
        ],
      },
    ],
  },
  success: [
    'Credential stuffing aur SMS pumping pehchanna',
    'Sahi signal par limit lagana (number, IP, account, device)',
    'Risk ke hisaab se friction ki seedhi banana',
  ],
  homework: `Kisi app ke login aur OTP flow ko dhyaan se use karo (apna account).
    Kitni baar OTP resend kar sakte ho? Har baar wait badhta hai? Naye phone se login par kya extra poochha jaata hai?
    Teen cheezein likho jo tum apni OTP API mein lagaoge.`,
  cards: [
    { front: 'Credential stuffing?', back: 'Doosri sites ke leak hue passwords se login. Hazaaron IPs se — IP limit akela kaafi nahi.' },
    { front: 'SMS pumping ki pehchaan?', back: 'Premium numbers + lagbhag zero conversion (OTP bheja, bhara nahi). Ilaaj: desh allowlist + conversion alert.' },
    { front: 'Account lock kyun nahi?', back: 'Hamlawar asli users ko lock kar dega. Badhta delay, CAPTCHA ya OTP behtar.' },
    { front: 'Friction ki seedhi?', back: 'Kuch nahi → delay → CAPTCHA/OTP → block. Asli user neeche, shak upar.' },
  ],
},

/* ---------------------------------------------------------------- BOSS */
{
  id: 'boss-sec',
  icon: '👑',
  title: 'Boss — ChaiPay merchant platform ki poori security',
  badge: 'Suraksha Senapati',
  objectives: [
    'Saare tukde ek design mein: isolation, authorization, tokens, noisy tenant, secrets, abuse, audit',
    'Har parat ek alag bhool pakadti hai (defense in depth)',
    'Interviewer ke twists: bank grahak, support access, merchant ki leak hui key',
  ],
  lesson: [
    `<h3>🏁 Boss: ek design, saat faisle</h3>
     <p>ChaiPay merchant platform: <b>40,000 merchants</b>, 5 enterprise grahak, payouts, OTP login, reports.</p>
     <p>Har pichhla level ek parat tha. Boss mein saari ek saath:</p>
     <table>
       <tr><th>Parat</th><th>Kaunsi bhool pakadti hai</th></tr>
       <tr><td>Tenant isolation (RLS)</td><td>Query mein WHERE bhoole</td></tr>
       <tr><td>Authorization (can + test)</td><td>Endpoint mein owner check bhoole</td></tr>
       <tr><td>Tokens (chhote + denylist)</td><td>Phone chori</td></tr>
       <tr><td>Quota / cell</td><td>Ek tenant sabko dheema kare</td></tr>
       <tr><td>Secrets (workload identity)</td><td>Key leak</td></tr>
       <tr><td>Abuse limits</td><td>Bots aur SMS bill</td></tr>
       <tr><td>Audit log</td><td>"Maine nahi kiya"</td></tr>
     </table>
     <p class="tip">🎯 Ek parat par poora bharosa mat karo. Har parat kisi doosri parat ki bhool pakadti hai.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Design Canvas — ChaiPay merchant platform',
      instructions: 'Har slot par sabse theek parat chuno. Review mein saare options ka "kyun" padho.',
      brief: `40,000 merchants (zyadatar chhote), 5 enterprise grahak, payouts aur refunds, OTP login,
        mahine ki reports. Ek merchant ka data doosre ko kabhi na dikhe; paisa sirf sahi role se hile.`,
      requirements: ['Cross-tenant leak: zero', 'Chori hua token turant band (payouts)', 'Bada tenant baaki ko dheema na kare', 'SMS bill ki hadd'],
      pass: 20,
      slots: [
        {
          id: 'tenant', label: 'Merchant data ka isolation', icon: '🏬',
          options: [
            { id: 'rls', label: 'Pool + RLS; enterprise grahak ke liye silo', score: 3, why: 'Chhote merchants sasti pool mein, DB policy doosri parat. Enterprise contract ke hisaab se silo.' },
            { id: 'filter', label: 'Pool; har query mein developer WHERE lagaye', score: -2, why: 'Ek bhooli hui WHERE = sab merchants ka data. Export wale mission mein yahi hua.' },
            { id: 'silo', label: 'Har merchant ka alag DB: 40,000 databases', score: -1, why: 'Mazboot, par 40,000 DBs ka kharcha, migrations aur backups. Chhote merchants ke liye faayda kam.' },
          ],
        },
        {
          id: 'authz', label: 'Object aur function authorization', icon: '🚪',
          options: [
            { id: 'can', label: 'Service mein saajha can() + cross-tenant CI test', score: 3, why: 'Object ka maalik service jaanti hai. Test har naye endpoint ko pakadta hai.' },
            { id: 'gw', label: 'Sirf gateway par role check; service bharosa kare', score: -2, why: 'Gateway object ka maalik nahi jaanta. BOLA khula.' },
            { id: 'uuid', label: 'IDs UUID kar do; guess nahi hoga toh check kyun', score: -3, why: 'Leak hui ID se data milega. UUID authorization nahi.' },
          ],
        },
        {
          id: 'token', label: 'Login tokens', icon: '🎟️',
          options: [
            { id: 'mix', label: '15 min access + refresh rotation; payouts par denylist', score: 3, why: 'Aam requests tez; paise par chori turant band. Refresh chori bhi pakdi jaati hai.' },
            { id: 'long', label: '30 din ka JWT; revoke list ki zaroorat nahi', score: -3, why: 'Phone chori = 30 din ki khuli chaabi. Mission mein dekha.' },
            { id: 'db', label: 'Har request par auth DB se session padho, bina cache', score: 0, why: 'Revoke turant, par har request par DB call: latency aur ek single point of failure. Is scale par cache ya JWT + denylist behtar.' },
          ],
        },
        {
          id: 'noisy', label: 'Bada tenant, bhaari report', icon: '📢',
          options: [
            { id: 'quota', label: 'Per-merchant rate limit; reports quota ya queue mein', score: 3, why: 'Baaki merchants ka SLO bachta hai. Bade grahak ko paid alag replica ka raasta.' },
            { id: 'bigger', label: 'Bada DB le lo; shor apne aap dab jaayega', score: -1, why: 'Shor der se aayega, rukega nahi. Kharcha badhta jaayega.' },
            { id: 'none', label: 'Koi hadd nahi; sab merchants ko baraabar ka haq hai', score: -2, why: '1 tareekh ko 39,999 merchants ka dashboard 10 second.' },
          ],
        },
        {
          id: 'secrets', label: 'Payout gateway key aur DB credentials', icon: '🗝️',
          options: [
            { id: 'wid', label: 'Workload identity + secrets manager; service ka alag user', score: 3, why: 'Chhoti umar, chhota scope. Leak ho toh ek service, kuch der.' },
            { id: 'env', label: '.env file private repo mein; sirf apni team ke paas', score: -3, why: 'Saare devs, CI aur backups ke paas copy. Ek laptop chori = payout key chori.' },
            { id: 'shared', label: 'Ek admin DB user, secrets manager mein rakha', score: -1, why: 'Jagah sahi, par ek user sab services mein: ek leak, poora DB.' },
          ],
        },
        {
          id: 'otp', label: 'OTP login ka abuse', icon: '🤖',
          options: [
            { id: 'layers', label: 'Number, IP aur device limit; desh allowlist; alert', score: 3, why: 'Kai signals; premium range band; conversion alert minton mein pakadta hai.' },
            { id: 'ip', label: 'Sirf per-IP limit 100/min; baaki sab kuch khula', score: -1, why: 'Botnet ke paas lakhon IPs. Pumping aur stuffing dono IP limit ke neeche.' },
            { id: 'free', label: 'Koi limit nahi; SMS toh sasta hai, chalne do', score: -3, why: 'Ek raat ka pumping lakhon ka bill.' },
          ],
        },
        {
          id: 'audit', label: 'Refund aur payout ka saboot', icon: '📜',
          options: [
            { id: 'append', label: 'Append-only audit log: kaun, kya, kab, kis token se', score: 3, why: 'Mukarne par saboot. Engineers bhi badal nahi sakte.' },
            { id: 'applog', label: 'App ke normal logs; 7 din tak hi rakhte hain', score: -1, why: 'Jhagda 30 din baad aaya toh logs ja chuke.' },
            { id: 'col', label: 'Har row par ek updated_by column kaafi hai, bas', score: -2, why: 'Sirf aakhri badlaav; history aur saboot nahi.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Saat parat, saat alag bhoolon ke liye. Koi ek toote toh doosri pakadti hai — yahi defense in depth hai.',
        ok: '👍 Zyadatar sahi. Ek parat kamzor hai — us parat ki bhool ka nuksaan socho.',
        bad: '🤔 Kai parat gayab hain. Pichhle levels ke missions dobara dekho: export leak, chori hua token, 1 tareekh.',
      },
    },
    {
      type: 'quiz',
      title: 'Interviewer ke twists',
      questions: [
        {
          q: 'Enterprise bank grahak kehta hai: "hamara data alag DB mein, hamari apni key se encrypt." Kya badloge?',
          choices: [
            'Bank ko alag cell (silo) aur uski KMS key; routing layer bank ko us cell par bheje',
            'Mana kar do; pool + RLS sabke liye kaafi hai, ek grahak ke liye design nahi badlega',
            'Bank ki rows ko ek alag column se mark kar do; DB wahi, key bhi wahi rahegi',
            'Bank ka data CSV mein export karke unke server par bhej do; wahi chalayein',
          ],
          answer: 0,
          explain: 'Silo + customer-managed key contract ki shart poori karte hain. Routing layer (tenant → cell ka map) baaki code ko waisa hi rehne deti hai. Keemat: ek aur cell chalana.',
          choiceExplanations: [
            'Silo + customer-managed key contract ki shart poori karte hain. Routing layer (tenant → cell ka map) baaki code ko waisa hi rehne deti hai. Keemat: ek aur cell chalana.',
            'Bada grahak contract ki shart ke bina nahi aayega. Mix model isi ke liye hai.',
            'Column se isolation nahi badalta. Contract alag DB aur alag key maang raha hai.',
            'Data bahar bhejne se ChaiPay ka product hi nahi bachta, aur sync ka naya sar-dard.',
          ],
        },
        {
          q: 'Support team ko debugging ke liye merchant ka data dekhna hai. Kaise?',
          choices: [
            'Just-in-time access: ticket ke saath, kuch ghante, read-only, audit log mein',
            'Support team ko permanent admin DB access de do; jaldi kaam hoga',
            'Merchant se unka dashboard password maang lo aur unki tarah login karo',
            'Support ko ek shared admin account do jiska password sab jaante hon',
          ],
          answer: 0,
          explain: 'Access sirf zaroorat ke waqt, sirf zaroori data, sirf padhne ke liye, aur har baar log mein. Permanent admin access andar ka sabse bada khatra hai.',
          choiceExplanations: [
            'Access sirf zaroorat ke waqt, sirf zaroori data, sirf padhne ke liye, aur har baar log mein. Permanent admin access andar ka sabse bada khatra hai.',
            'Hamesha ka admin access = ek chura hua support laptop, poora DB.',
            'Password maangna merchants ko phishing ke liye taiyaar karta hai, aur saboot bhi nahi bachta ki kisne kya kiya.',
            'Shared account ke saath "kisne kiya" ka jawab kabhi nahi milega.',
          ],
        },
        {
          q: 'Ek merchant ne apni ChaiPay API key GitHub par daal di. ChaiPay kya kare?',
          choices: [
            'Self-service rotation: do keys saath valid, nayi lagao, purani radd; leak scanning',
            'Merchant ki galti hai; ChaiPay kuch nahi kar sakta, merchant khud sambhale',
            'Merchant ka account band karo jab tak woh support ko call na kare',
            'Saare merchants ki keys ek saath rotate karo, taaki koi bhi khatra na bache',
          ],
          answer: 0,
          explain: 'Do keys ek saath valid rehne se merchant bina downtime ke rotate kar sakta hai. GitHub jaise platforms ke secret scanning partner programs leak hui key ki khabar dete hain — ChaiPay purani key khud radd bhi kar sakta hai.',
          choiceExplanations: [
            'Do keys ek saath valid rehne se merchant bina downtime ke rotate kar sakta hai. GitHub jaise platforms ke secret scanning partner programs leak hui key ki khabar dete hain — ChaiPay purani key khud radd bhi kar sakta hai.',
            'Chori hui key se merchant ke paise jaayenge, aur bharosa ChaiPay ka tootega.',
            'Account band = merchant ki dukaan band. Key radd karna chhota aur sahi ilaaj hai.',
            '40,000 merchants ki integrations ek saath tootengi. Ek leak ke liye sab par outage.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Security summary',
    instructions: 'Aakhri do sawaal. 🎤',
    questions: [
      {
        q: '"Defense in depth" ek line mein?',
        choices: [
          'Kai parat, har parat alag bhool pakde; ek tootne par bhi doosri bachaaye',
          'Ek bahut mazboot parat, jaise WAF; baaki parat ka kharcha bekaar hai',
          'Security ko infrastructure team par chhod do; app team features banaye',
          'Har request ko teen baar encrypt karo; teen parat = teen guna suraksha',
        ],
        answer: 0,
        explain: 'Har parat ek alag galti ke liye: RLS bhooli WHERE ke liye, can() test bhoole check ke liye, denylist chori ke liye. Koi ek parat perfect nahi.',
        choiceExplanations: [
          'Har parat ek alag galti ke liye: RLS bhooli WHERE ke liye, can() test bhoole check ke liye, denylist chori ke liye. Koi ek parat perfect nahi.',
          'Har mazboot parat ki ek kamzori hoti hai. WAF business-logic bug nahi pakadta.',
          'Owner check, field allowlist aur OTP limits app ke code mein hi hain.',
          'Encryption ek hi khatre (data padh lena) ke liye hai. Teen baar karne se authorization bug theek nahi hota.',
        ],
      },
      {
        q: 'Naye feature ki security review mein sabse pehle kya maangoge?',
        choices: [
          'Naksha: trust boundaries, kaunsa data, kaunse roles, aur kya log hoga',
          'Code coverage ki report; 90% coverage matlab security bhi theek',
          'Pen-test ki date; review ke liye pehle code live hona chahiye',
          'Feature ki UI screenshots; screens dekh ke security ka andaaza',
        ],
        answer: 0,
        explain: 'Naksha hi threat model ki shuruaat hai. Uske bina har sawaal andaaza hai.',
        choiceExplanations: [
          'Naksha hi threat model ki shuruaat hai. Uske bina har sawaal andaaza hai.',
          'Coverage batata hai ki lines chali; ye nahi ki cross-tenant access ka test hai.',
          'Pen-test zaroori hai, par design ke bug pehle pakadna sasta hai.',
          'Hamlawar UI nahi, API use karta hai. Screens se boundaries nahi dikhti.',
        ],
      },
    ],
  },
  success: [
    'Ek multi-tenant payment platform ki poori security design karna',
    'Har parat ka kaam aur keemat bolna',
    'Enterprise, support access aur leaked key jaise twists sambhalna',
  ],
  homework: `Apne kisi project ka ek-page security design likho: naksha, 5 trust boundaries, har boundary ki ek parat,
    aur har parat ki keemat. Phir khud se poochho: "Agar ye ek parat toot jaaye, toh kaunsi doosri parat bachaayegi?"`,
  cards: [
    { front: 'Defense in depth?', back: 'Kai parat; har parat ek alag bhool pakadti hai. Ek toote toh doosri bachaaye.' },
    { front: 'Enterprise "alag DB, apni key"?', back: 'Silo cell + customer-managed KMS key; routing layer tenant ko cell par bheje.' },
    { front: 'Support ka data access?', back: 'Just-in-time, ticket ke saath, read-only, kuch ghante, audit log mein.' },
    { front: 'Merchant ki key leak?', back: 'Do keys ek saath valid → self-service rotation; secret scanning partner se khabar.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['sec-abuse'] = {
  t: 'Bot har baar nayi topi pehen ke aata hai',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">🤖 bot<br><small>50,000 IPs, premium numbers</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🚦 limits<br><small>number · IP · device · desh</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">📱 otp-api</span><span class="dg-arrow">→</span>
      <span class="dg-pill">✉️ SMS provider<br><small>har SMS ka ₹</small></span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill good">kuch nahi</span><span class="dg-arrow">→</span>
      <span class="dg-pill">delay / 429</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">CAPTCHA / OTP</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">block</span>
    </div>
    <div class="dg-cap">Friction ki seedhi: asli user neeche, shak upar. Pumping ki pehchaan: conversion (bheja vs bhara) lagbhag zero.</div>`,
};
VISUALS['boss-sec'] = {
  t: 'Saat parat — har parat alag bhool ke liye',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">📱 merchant / user</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🤖 abuse limits</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🎟️ token + denylist</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🚪 can() check</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🛡️ RLS</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🗄️ data</span>
    </div>
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">📢</span><span class="nl">Quota / cell</span><span class="ns">bada tenant alag</span></div>
      <div class="dg-node"><span class="ni">🗝️</span><span class="nl">Workload identity</span><span class="ns">chhoti umar ki keys</span></div>
      <div class="dg-node"><span class="ni">📜</span><span class="nl">Audit log</span><span class="ns">append-only</span></div>
    </div>`,
};

SD.addScenes({
  'sec-abuse': {
    intro: 'Raat 2 baje SMS bill ka alert. OTP API par <b>koi hadd nahi</b> thi.',
    nodes: [
      { id: 'bot', col: 0, row: 0, icon: '🤖', label: 'Bot', sub: 'premium numbers', tone: 'bad' },
      { id: 'otp', col: 1, row: 0, icon: '📱', label: 'otp-api' },
      { id: 'sms', col: 2, row: 0, icon: '✉️', label: 'SMS provider', sub: 'har SMS ka ₹' },
      { id: 'prem', col: 3, row: 0, icon: '☎️', label: 'Premium numbers', sub: 'hamlawar ka hissa' },
      { id: 'limit', col: 1, row: 1, icon: '🚦', label: 'limits', sub: 'abhi band' },
      { id: 'alert', col: 2, row: 1, icon: '📈', label: 'conversion alert', sub: 'bheja vs bhara' },
    ],
    steps: [
      { from: 'bot', to: 'otp', label: '4,20,000 OTP / ghanta', tone: 'bad', say: 'Bot premium desh code ke numbers par OTP maangta hai. Normal din mein 3,000 SMS ek ghante mein.' },
      { from: 'otp', to: 'sms', label: 'SMS bhejo', say: 'otp-api har maang par SMS bhejti hai. Har SMS ka paisa ChaiPay deta hai.' },
      { from: 'sms', to: 'prem', label: 'premium par SMS', tone: 'bad', say: 'Premium numbers par SMS pahunchne se hamlawar ko telecom se hissa milta hai. Bill ChaiPay ka.' },
      { at: ['alert'], set: { alert: { tone: 'bad', sub: 'bhara: 0.1%' } }, say: 'Pehchaan: OTP sahi bharne wale sirf 0.1%. Asli users mein zyadatar bharte hain. Ye SMS pumping hai.' },
      { at: ['limit'], set: { limit: { tone: 'good', sub: 'desh allowlist + hadd' } }, say: 'Ilaaj: desh code ki allowlist, aur har number, IP aur device par hadd.' },
      { from: 'bot', to: 'limit', label: '429 / CAPTCHA', tone: 'good', set: { bot: { tone: '', sub: 'ruk gaya' } }, say: 'Bot ki maang ab limits par rukti hai. Premium range band, resend par CAPTCHA.' },
      { at: ['sms', 'alert'], set: { sms: { tone: 'good', sub: '~3,000 / ghanta' }, alert: { tone: 'good', sub: 'alert chalu' } }, say: 'SMS wapas normal. Conversion alert agli baar minton mein khabar dega.' },
    ],
  },
  'boss-sec': {
    intro: 'ChaiPay merchant platform: ek request saat parton se guzarti hai. Har parat ek alag bhool pakadti hai.',
    nodes: [
      { id: 'user', col: 0, row: 0, icon: '📱', label: 'Merchant', tone: 'accent' },
      { id: 'abuse', col: 1, row: 0, icon: '🤖', label: 'abuse limits' },
      { id: 'token', col: 2, row: 0, icon: '🎟️', label: 'token + denylist' },
      { id: 'svc', col: 3, row: 0, icon: '🚪', label: 'service: can()' },
      { id: 'rls', col: 3, row: 1, icon: '🛡️', label: 'RLS policy' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'orders (pool)' },
      { id: 'audit', col: 1, row: 1, icon: '📜', label: 'audit log' },
      { id: 'quota', col: 0, row: 1, icon: '📢', label: 'quota / cell' },
    ],
    steps: [
      { from: 'user', to: 'abuse', label: 'POST /refund', say: 'Merchant refund maangta hai. Pehli parat: bots aur bina hadd ki requests yahin rukti hain.' },
      { from: 'abuse', to: 'token', label: 'limit ke andar', say: 'Doosri parat: token asli hai, aur revoke list mein nahi. Chori hua phone yahin rukta hai.' },
      { from: 'token', to: 'svc', label: 'merchant 42', say: 'Teesri parat: service poochhti hai — ye order merchant 42 ka hai? Refund ka role hai?' },
      { from: 'svc', to: 'rls', label: 'query', say: 'Chauthi parat: code WHERE bhool bhi jaaye, RLS sirf merchant 42 ki rows dikhati hai.' },
      { from: 'rls', to: 'db', label: 'sirf 42 ki rows', tone: 'good', say: 'Data tak sirf sahi merchant ki rows pahunchti hain.' },
      { from: 'db', to: 'audit', label: 'kaun, kya, kab', tone: 'gold', say: 'Refund ka saboot append-only audit log mein. Mukarne par jawab.' },
      { at: ['quota'], set: { quota: { tone: 'good', sub: 'bada tenant alag' } }, say: 'Saath mein: bada tenant quota ya alag cell mein, taaki 1 tareekh ko baaki dheeme na hon. Secrets workload identity se, chhoti umar ke.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-sec-abuse', levels: 'sec-abuse', guide: {
    title: 'Ek pehchaan par hadd, ya kai signals?',
    misaal: 'Free sample ka "ek aadmi ek sample" niyam topi badalne se toot gaya. Chehra, ghar aur gali — kai cheezein milaani padti hain.',
    asli: 'Bots IP, number, account aur device badalte hain. Kai signals par limit, aur risk badhe toh friction badhao.',
    points: [
      '<b>Stuffing:</b> IP limit ke neeche; device aur leaked-password signals.',
      '<b>Pumping:</b> conversion (bheja vs bhara) se pehchaan; desh allowlist.',
      '<b>Lock nahi:</b> delay, CAPTCHA ya OTP — warna asli user bahar.',
    ],
    use: 'API jo paisa kharch karwaye (SMS, email) ya login ka darwaza ho.',
    avoid: 'Sirf per-IP limit par bharosa mat karo; botnet aur CGNAT dono use todte hain.',
    mistake: 'Account lockout lagana — hamlawar use asli users ke khilaaf chalata hai.',
    compare: [
      { choice: 'Per-IP limit', when: 'Hamla kuch IPs se aa raha ho', tradeoff: 'Sasta aur seedha; baante hue hamle aur saajhe IP par kamzor' },
      { choice: 'Risk score + friction ki seedhi', when: 'Hamla kai pehchaanon mein baanta ho', tradeoff: 'Asli user ko kam rukawat; signals aur tuning ka kaam' },
    ],
    followup: 'CAPTCHA solving services ₹ mein sasti hain. CAPTCHA ke baad bot ka kharcha aur kaise badhaoge?',
    sources: [
      { title: 'OWASP — Credential Stuffing Prevention Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html' },
      { title: 'OWASP API Security Top 10 — 2023', url: 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/' },
    ],
  } },
  { id: 'pro-sec-boss', levels: 'boss-sec', guide: {
    title: 'Ek mazboot parat, ya kai alag parat?',
    misaal: 'Bank mein guard, CCTV, tijori ka taala aur register — chor ek ko chakma de, toh doosra pakad le.',
    asli: 'Har parat ek alag bhool pakadti hai. Design mein har parat ki keemat aur uska kaam saaf likho.',
    points: [
      '<b>Data:</b> RLS + service ka owner check.',
      '<b>Pehchaan:</b> chhote tokens + paise par denylist.',
      '<b>Saboot:</b> append-only audit; support access just-in-time.',
    ],
    use: 'Multi-tenant platform jahan paisa aur personal data dono hon.',
    avoid: 'Kisi ek parat (WAF, encryption, UUID) ko poori security mat samjho.',
    mistake: 'Design mein security ko "baad mein security team dekhegi" bol kar chhodna.',
    compare: [
      { choice: 'Ek central parat (gateway / WAF)', when: 'Jaane-pehchaane hamlon ko bahar rokna ho', tradeoff: 'Ek jagah, aasaan; business-logic bugs nahi pakadti' },
      { choice: 'Har layer par parat', when: 'Paisa aur tenant data dono hon', tradeoff: 'Bhool ek parat mein ho toh doosri pakde; kaam aur tests zyada' },
    ],
    followup: 'Saat mein se sirf teen parat ka budget hai. Kaunsi teen, aur kyun?',
    sources: [
      { title: 'OWASP — Application Security Verification Standard (ASVS)', url: 'https://owasp.org/www-project-application-security-verification-standard/' },
      { title: 'AWS — SaaS Tenant Isolation Strategies (silo, bridge, pool)', url: 'https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.html' },
    ],
  } },
);
})();
