/* =====================================================================
   🧠 Soch Akhada — scenarios 2: Request ka raasta (3) + Resilience (6) + Distributed (7)
   Shape aur niyam: soch.js ka header aur EXTENDING.md §11. Kahani: ChaiPay.
   Har `a` list mein PEHLA jawab sahi hai (renderer shuffle karta hai).
   ===================================================================== */
(function () {
SD.registerScenarios([

/* ---------------------------------------------------------------- FLOW */
{
  id: 'sync-chain', icon: '⛓️', title: 'SMS provider dheema, toh payment 6 second ka', topic: 'flow', hard: 2,
  levels: ['syncasync', 'latency'],
  story: '"Pay" dabate hi <code>pay-api</code> ek ke baad ek 5 kaam karta hai: fraud check, paisa kaatna, SMS, cashback, analytics. Poora payment 2.1 second leta hai. Jis din SMS provider dheema hota hai, payment 6 second leta hai aur log button dobara dabate hain.',
  facts: [
    'Fraud check 150 ms · paisa kaatna 200 ms · SMS 900 ms (kabhi 5 second) · cashback 400 ms · analytics 450 ms.',
    'User ko "payment hua ya nahi" batane ke liye sirf fraud check aur paisa kaatna zaroori hain.',
    'SMS, cashback aur analytics kuch second baad bhi ho jaayein toh chalega.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Payment itna dheema kyun hai?', a: [
      ['Paanch kaam ek line mein hain; user sabse dheeme kaam ka bhi intezaar karta hai', 'Ek ke baad ek chalne par waqt judta hai: 150 + 200 + 900 + 400 + 450 = 2,100 ms. Jo kaam user ke liye zaroori nahi, wo bhi user ko rok raha hai.'],
      ['<code>pay-api</code> ke servers kam hain, isliye har payment server par line mein rukta hai', 'Haalaat mein har kaam ka waqt likha hai, aur unka jod hi 2.1 second hai. Server ki line ka koi sanket nahi hai.'],
      ['Paisa kaatne wala database dheema hai aur zyadatar waqt wahi le raha hai', 'Paisa kaatna sirf 200 ms leta hai. Sabse bada hissa SMS (900 ms) hai.'],
    ] },
    { t: 'Hal chuno', q: 'Payment ko tez aur SMS provider se azaad kaise karoge?', a: [
      ['Fraud check aur paisa kaatne ke baad jawab do; baaki teen kaam queue se karo', 'User 350 ms mein "payment hua" dekh leta hai. SMS, cashback aur analytics ek queue mein jaate hain aur worker teenon kaam background mein karta hai.'],
      ['Paanchon kaam ek saath (parallel) chalao aur paanchon ke jawab ka intezaar karo', 'Waqt ab sabse dheeme kaam jitna: SMS, yaani 900 ms ya 5 second. Aur fraud check ko paisa kaatne se pehle hi hona chahiye.'],
      ['SMS provider ki call ka timeout 5 second se ghatakar 1 second kar do, bas', 'Sabse bura din thoda behtar hoga. Lekin user phir bhi chaar ghair-zaroori kaamon ka intezaar karega.'],
    ] },
    { t: 'Keemat', q: 'SMS, cashback aur analytics ab queue se chalte hain. Kaunsi nayi baat sambhalni hogi?', a: [
      ['Payment "safal" dikh chuka hai, par SMS ya cashback baad mein fail ho sakta hai', 'Isliye worker ko retry chahiye, baar-baar fail hone wale message ke liye alag queue, aur screen par saaf line: "cashback kuch minute mein judega".'],
      ['Payment ab pehle se dheema hoga kyunki queue mein likhne mein bahut waqt lagta hai', 'Queue mein ek message likhna kuch millisecond ka kaam hai.'],
      ['Fraud check ab payment ke baad chalega, isliye fraud wale payment nahi rukenge', 'Fraud check ab bhi paisa kaatne se pehle, usi request mein hota hai. Queue mein sirf teen ghair-zaroori kaam gaye hain.'],
    ] },
  ],
  fixes: [
    { n: 'Zaroori abhi, baaki queue se', how: 'Jawab ke liye zaroori kaam request mein; baaki message queue mein.', cost: 'Baad wale kaam ka fail hona sambhalna padta hai.', when: 'Kaam ka nateeja user ko turant nahi chahiye.' },
    { n: 'Ek saath chalana (parallel)', how: 'Independent calls ko saath bhejo.', cost: 'Waqt sabse dheemi call jitna.', when: 'Saare nateeje jawab ke liye chahiye.' },
    { n: 'Timeout + chhod dena', how: 'Ghair-zaroori call par chhoti hadd; na aaye toh aage badho.', cost: 'Wo kaam kabhi-kabhi chhoot jaata hai.', when: 'Kaam queue mein nahi daal sakte.' },
  ],
  twist: { q: 'Queue ka worker 2 ghante band raha. 40 lakh SMS queue mein jama hain. Worker chalu hote hi sab ek saath jaayenge.', a: [
    ['Bahut purane SMS chhod do; baaki ko tay raftaar se bhejo', '2 ghante purana "payment ho gaya" SMS user ko sirf uljhata hai. Har message par "is waqt ke baad bekaar" likho, aur provider ko tay raftaar se hi bhejo.'],
    ['Saare 40 lakh SMS jitni jaldi ho sake ek saath bhej do', 'Provider ki hadd paar hogi, kharcha poora lagega, aur users ko 2 ghante purane SMS ek saath milenge.'],
    ['Queue poori khaali kar do aur kisi ko kuch mat bhejo', 'Pichhle kuch minute ke SMS abhi bhi kaam ke hain. Sab phenkne se wo bhi kho jaate hain.'],
  ] },
  asli: 'Har kaam ke liye poochho: "kya user ko iska nateeja abhi chahiye?" Jawab "nahi" hai toh wo kaam request ke andar nahi, queue mein hona chahiye.',
  say: 'Request ke andar main sirf wo kaam rakhunga jo jawab ke liye zaroori hain: fraud check aur ledger. SMS, cashback aur analytics queue mein jaayenge, retry aur DLQ ke saath. Isse latency 2.1 second se lagbhag 350 ms hoti hai aur SMS provider ka dheemapan payment ko nahi chhoota.',
},
{
  id: 'tail-latency', icon: '🐢', title: 'Har service 99% tez, phir bhi har dasvi screen dheemi', topic: 'flow', hard: 3,
  levels: ['latency', 'fanout'],
  story: 'ChaiPay ki home screen ek request mein 10 services ko call karti hai: balance, offers, bills aur 7 aur. Har service ka dashboard kehta hai "99% request 100 ms se kam". Phir bhi har 10 mein se lagbhag 1 home screen 1 second se zyada leti hai.',
  facts: [
    'Har service: 99% request tez (100 ms se kam), 1% dheeme (lagbhag 1 second).',
    '10 calls ek saath (parallel) jaati hain; is misaal mein calls ka dheema hona independent hai.',
    'Home screen tab tak rukti hai jab tak saari 10 services jawab na de dein.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Har service 99% tez hai. Phir 10% screen dheemi kaise?', a: [
      ['10 mein se ek bhi call dheemi ho toh screen dheemi: 1% ka mauka 10 baar', 'Saari 10 calls ke tez hone ka mauka 0.99 ko 10 baar guna = lagbhag 90%. Yaani 10% screen mein kam se kam ek dheemi call hoti hai.'],
      ['Parallel calls ek doosre ka CPU kha rahi hain, isliye saari calls dheemi hain', 'Calls alag-alag services par chalti hain, alag machines par. Aur dashboard dikhata hai ki har service 99% tez hai.'],
      ['Dashboard galat hai; services asal mein 99% request tez nahi de rahi hain', 'Dashboard sahi hai. Ganit hi batata hai ki 10 calls saath jodne par 1% wala mauka 10% ban jaata hai.'],
    ] },
    { t: 'Hal chuno', q: 'Home screen ke dheeme hone ka mauka sabse seedhe kaise ghatega?', a: [
      ['Har call par timeout; dheemi service ka hissa khaali ya purana dikha do', 'Screen ab sabse dheemi call ki ghulam nahi rehti. 150 ms mein jo aaya wo dikhao; baaki hissa chhupao ya pichhla data dikhao.'],
      ['Har service ke servers dugne kar do taaki saari services tez ho jaayein', '1% dheeme request aksar ruk-ruk kar hone wali cheezon se aate hain (memory safai, disk). Servers dugne karne se wo 1% nahi jaata.'],
      ['10 calls ko ek ke baad ek chalao taaki services par bojh kam pade', 'Ab waqt judega: 10 calls × 100 ms = 1 second, har screen par.'],
    ] },
    { t: 'Keemat', q: 'Har call par timeout lag gaya. Iski keemat kya hai?', a: [
      ['Kabhi-kabhi screen ka ek hissa khaali ya thoda purana dikhega', 'Har hisse ke liye tay karna hoga: offers chhup sakte hain, lekin balance ke bina screen bekaar hai.'],
      ['Services par bojh dugna ho jaayega kyunki har call do baar jaayegi', 'Timeout call ko dobara nahi bhejta. Bojh wahi rehta hai.'],
      ['Home screen ka aam (average) waqt pehle se zyada ho jaayega', 'Timeout sirf dheemi calls ko kaat-ta hai. Aam waqt ghat-ta hai, badhta nahi.'],
    ] },
  ],
  fixes: [
    { n: 'Timeout + khaali/purana hissa', how: 'Har call par hadd; na aaye toh hissa chhupao.', cost: 'Screen kabhi adhoori dikhti hai.', when: 'Hissa ghair-zaroori hai.' },
    { n: 'Doosri koshish saath mein (hedged request)', how: 'Jawab der kare toh wahi request doosre server par bhi bhejo; jo pehle aaye wo lo.', cost: 'Kuch pratishat extra calls.', when: 'Sirf padhne wali, zaroori call.' },
    { n: 'Kam calls', how: '10 calls ko 2–3 mein jodo, ya home screen ka data pehle se banakar rakho.', cost: 'Zyada kaam; data thoda purana.', when: 'Screen baar-baar wahi data dikhati hai.' },
  ],
  twist: { q: 'Balance ghair-zaroori nahi hai: balance ke bina home screen bekaar hai. Aur balance ki 1% calls 1 second leti hain.', a: [
    ['95 ms tak jawab na aaye toh wahi request doosre server par bhi bhej do', 'Independent slow events hon toh dono ka dheema hona 1% × 1% = 0.01%; shared bottleneck par yeh hisaab nahi chalega. Yeh sirf isliye surakshit hai ki balance padhna kuch badalta nahi.'],
    ['Balance par 100 ms ka timeout rakho aur fail hone par ₹0 dikha do', 'Paise wali app mein ₹0 dikhana user ko dara deta hai. Galat number, khaali jagah se bura hai.'],
    ['Balance call ka timeout hata do taaki wo call kabhi fail hi na ho', 'Tab dheemi call poori screen ko 1 second ya usse zyada latkaye rakhegi.'],
  ] },
  asli: 'Ek request jitni zyada services par tiki hai, utni hi baar wo "1% dheeme" wali lottery khelti hai. Average mat dekho; poochho: "sabse dheemi call kya karegi?"',
  say: 'Independent calls ki is misaal mein 10 calls par 1% slow chance lagbhag 9.6% ban jaata hai. Main har call par timeout lagaunga aur ghair-zaroori hisson ko chhupaunga. Zaroori read call ke liye hedged request, aur lambe waqt mein calls ki ginti kam karunga.',
},
{
  id: 'long-conn-skew', icon: '⚖️', title: '4 naye server jode, phir bhi purane 4 hi jal rahe hain', topic: 'flow', hard: 3,
  levels: ['networking'],
  story: '<code>notify-gateway</code> ke 4 servers 90% CPU par the. Team ne 4 naye servers jode. 1 ghante baad purane 4 servers abhi bhi 85% par hain, aur naye 4 servers sirf 5% par.',
  facts: [
    'Phone apps <code>notify-gateway</code> se lamba connection (WebSocket) rakhti hain: ghanton tak khula.',
    'Load balancer sirf <b>naya</b> connection baantta hai: sabse kam connection wale server ko.',
    'Jo connection ban chuka, wo apne server se juda rehta hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Naye servers khaali kyun baithe hain?', a: [
      ['Purane connection purane servers par hi tike hain; LB sirf naye connection baantta hai', 'Load balancer connection banne ke pal mein faisla karta hai. Ghanton lambe connection par wo faisla ghanton tak nahi badalta.'],
      ['Load balancer ne naye servers ko abhi tak pehchaana hi nahi hai', 'Naye servers 5% CPU par hain, yaani unhe kuch naye connection mil rahe hain. Load balancer unhe jaanta hai.'],
      ['Naye servers ki machine chhoti hai, isliye load balancer unhe kam bojh deta hai', 'Haalaat mein machine ke size ka koi farak nahi likha. Wajah connection ka lamba hona hai.'],
    ] },
    { t: 'Hal chuno', q: 'Bojh ko barabar kaise karoge, bina users ko jhatka diye?', a: [
      ['Purane servers thode-thode connection band karein; app dobara judkar naye par jaaye', 'Dobara judne wala connection "naya" hai, isliye load balancer use khaali server par bhejta hai. Thoda-thoda karne se jhatka nahi lagta.'],
      ['Purane 4 servers ko ek saath restart kar do taaki saare connection naye banein', 'Lakhon phone ek hi pal mein dobara judenge. Naye 4 servers us jhatke mein gir sakte hain.'],
      ['Load balancer ka tareeka badalkar round-robin kar do, baaki sab wahi rakho', 'Tareeka sirf naye connection par laagu hota hai. Purane connection wahin rahenge.'],
    ] },
    { t: 'Keemat', q: 'Server jaan-boojhkar connection band karega. Iski keemat kya hai?', a: [
      ['Dobara judne ke pal mein user ka notification thoda ruk sakta hai', 'Isliye app ko yaad rakhna hoga ki aakhri message kaunsa mila tha, aur judte hi wahin se aage maangna hoga.'],
      ['Purane servers par rakha users ka data hamesha ke liye kho jaayega', 'Gateway server sirf connection rakhta hai. Message queue ya database mein rehte hain.'],
      ['Naye servers ka CPU turant 100% ho jaayega aur wo gir jaayenge', 'Connection thode-thode aate hain aur 8 servers mein bantte hain. Har server lagbhag 45% par aayega.'],
    ] },
  ],
  fixes: [
    { n: 'Thoda-thoda connection band karna', how: 'Scale ke baad purane servers dheere-dheere connection chhodte hain.', cost: 'Chhoti rukawat; app ko dobara judna aana chahiye.', when: 'Naye servers jodne ke turant baad.' },
    { n: 'Connection ki umr par hadd', how: 'Har connection kuch minute (+ random) baad band hota hai.', cost: 'Dobara judne ka thoda kharcha hamesha.', when: 'Hamesha, lambe connection ke saath.' },
    { n: 'App mein ruk-kar judna', how: 'Toot-te hi nahi; random der rukkar judo.', cost: 'Judne mein kuch second.', when: 'Hamesha; connection draining aur age limit bina jitter ke khatarnaak.' },
  ],
  twist: { q: 'Ek purana server crash ho gaya. Crash hue server ke 5 lakh phone ek saath dobara jud rahe hain, aur baaki servers bhi girne lage.', a: [
    ['App dobara judne se pehle random der ruke, aur har baar thoda zyada', 'Random der 5 lakh phone ko waqt mein phaila deti hai. Ise backoff + jitter kehte hain.'],
    ['App turant aur lagataar judne ki koshish kare jab tak jud na jaaye', 'Yahi toh jhatka bana raha hai: 5 lakh phone har pal dobara koshish karenge.'],
    ['Load balancer agle 10 minute tak koi naya connection na le', '10 minute tak kisi ko notification nahi milega, aur 10 minute baad wahi jhatka wapas.'],
  ] },
  asli: 'Is WebSocket setup mein load balancer <b>naye connection</b> baantta hai. Connection lamba ho toh "naye server jod diye" ka matlab "bojh bant gaya" nahi hota.',
  say: 'Lambe connection ke saath naye servers ko sirf naye connection milte hain. Main connection ki umr par hadd lagaunga aur scale ke baad purane servers se thode-thode connection band karwaunga. App backoff aur jitter ke saath dobara judegi aur aakhri message id se aage maangegi.',
},

/* --------------------------------------------------------------- RESIL */
{
  id: 'retry-storm', icon: '🌪️', title: 'Retry ne dheemi service ko maar hi diya', topic: 'resil', hard: 2,
  levels: ['retries', 'backpressure'],
  story: '<code>ledger-service</code> ek dheemi query ki wajah se 2 second lene lagi. <code>pay-api</code> ka timeout 1 second hai, aur fail hone par <code>pay-api</code> turant 3 baar retry karta hai. 5 minute mein <code>ledger-service</code> poori tarah gir gayi.',
  facts: [
    'Aam bojh: 2,000 request har second.',
    'Har fail request ke 3 retry: <code>ledger-service</code> par 8,000 request har second.',
    'Retry turant hote hain; beech mein koi rukna nahi.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Dheemi service poori tarah kyun gir gayi?', a: [
      ['Retry ne bojh 4 guna kar diya; dabi hui service aur zyada dab gayi', 'Service dheemi thi kyunki us par kaam zyada tha. Har retry ne aur kaam bheja. Dheemapan → retry → aur dheemapan: yeh ghera khud ko badhata hai.'],
      ['Dheemi query ne <code>ledger-service</code> ka database hamesha ke liye kharab kar diya', 'Database kharab nahi hua. Query hatte hi database theek chalta hai; bojh hi asli samasya hai.'],
      ['<code>pay-api</code> ka 1 second ka timeout bahut chhota hai, isliye sab fail hue', 'Timeout bada karne se <code>pay-api</code> ke apne threads latkenge. Bojh ko 4 guna retry ne kiya.'],
    ] },
    { t: 'Hal chuno', q: 'Retry ko surakshit kaise banaoge?', a: [
      ['Retry ke beech badhta hua random gap, aur kul retry par ek hadd', 'Gap (backoff) service ko saans lene deta hai. Random hissa (jitter) sabko ek saath lautne se rokta hai. Hadd (retry budget) kehti hai: retry kul bojh ka 10% se zyada nahi.'],
      ['Retry ko 3 se badhakar 10 kar do taaki koi bhi payment fail na ho', 'Bojh 4 guna ki jagah 11 guna ho jaayega. Service aur jaldi giregi.'],
      ['Retry ko poori tarah hata do: ek baar fail hua toh bas fail', 'Ek chhoti si network gadbad par bhi payment fail hoga. Hadd ke andar retry kaam ki cheez hai.'],
    ] },
    { t: 'Keemat', q: 'Backoff aur retry ki hadd lag gayi. Gadbad ke waqt ab kya hoga?', a: [
      ['Kuch payment bina poore retry ke hi jaldi fail ho jaayenge', 'Yeh jaan-boojhkar hai: thode request fail hote hain taaki service zinda rahe aur baaki chalte rahein.'],
      ['Aam din mein bhi har payment pehle se dheema ho jaayega', 'Backoff sirf fail hone par lagta hai. Safal request par koi asar nahi.'],
      ['<code>ledger-service</code> par bojh aam din mein bhi 4 guna rahega', 'Aam din mein fail kam hote hain, isliye retry bhi kam. Bojh lagbhag 2,000 hi rehta hai.'],
    ] },
  ],
  fixes: [
    { n: 'Backoff + jitter', how: 'Har retry se pehle badhta hua, random gap.', cost: 'Safal hone mein thodi der.', when: 'Hamesha, har retry ke saath.' },
    { n: 'Retry ki hadd (budget)', how: 'Retry kul request ka chhota hissa hi ho sakte hain.', cost: 'Gadbad mein kuch request jaldi fail.', when: 'Jab kai clients ek service ko call karein.' },
    { n: 'Circuit breaker', how: 'Lagataar fail ho toh kuch der call hi mat karo.', cost: 'Us dauraan sahi request bhi rukte hain.', when: 'Service sach mein giri ho.' },
  ],
  twist: { q: 'Dheemi query hat gayi. Lekin <code>ledger-service</code> chalu hote hi 8,000 request har second se phir gir jaati hai.', a: [
    ['<code>pay-api</code> pehle thoda traffic bheje, phir dheere-dheere poora', 'Circuit breaker yahi karta hai: pehle kuch request se parakhta hai, theek rahe toh bojh badhata hai. Service ko khada hone ka mauka milta hai.'],
    ['<code>ledger-service</code> ko baar-baar restart karo jab tak wo tik na jaaye', 'Har restart par wahi 8,000 request girenge. Nateeja wahi rahega.'],
    ['<code>ledger-service</code> ka apna timeout badhakar 30 second kar do', 'Request aur der tak jagah gherenge. Service aur jaldi bhar jaayegi.'],
  ] },
  asli: 'Retry dawa hai, par zyada maatra mein zeher. Har retry ke saath poochho: "agar sab ek saath retry karein toh bojh kitna guna hoga?"',
  say: 'Bina backoff ke retry ne bojh 4 guna kar diya; ise retry storm kehte hain. Main exponential backoff aur jitter lagaunga, retry budget rakhunga, aur circuit breaker se giri hui service ko dheere-dheere traffic doonga.',
},
{
  id: 'hung-dependency', icon: '🧊', title: 'Fraud check chup hua, toh balance dekhna bhi band', topic: 'resil', hard: 2,
  levels: ['timeouts', 'breaker', 'bulkhead'],
  story: '<code>fraud-check</code> service ne jawab dena band kar diya: error nahi, bas chuppi. 3 minute mein <code>pay-api</code> ne saare request lena band kar diya. Balance dekhna bhi band, jabki balance ka <code>fraud-check</code> se koi lena-dena nahi.',
  facts: [
    '<code>pay-api</code> ke paas 200 worker threads hain.',
    '<code>fraud-check</code> ki call par koi timeout nahi hai.',
    '40% request payment ke hain. Baaki 60% (balance, history) <code>fraud-check</code> ko chhote bhi nahi.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Balance wale request kyun band ho gaye?', a: [
      ['Har payment ek thread ko hamesha ke liye rok leta hai; 200 threads khatam', 'Bina timeout ke thread jawab ka intezaar hamesha karta hai. Kuch minute mein saare 200 threads atke hue payment ke paas hain. Balance ke liye koi thread bacha hi nahi.'],
      ['<code>fraud-check</code> ne <code>pay-api</code> ko galat data bhejkar crash kar diya', '<code>fraud-check</code> ne kuch bheja hi nahi; wo chup hai. Aur <code>pay-api</code> crash nahi hua, bhar gaya hai.'],
      ['Balance aur history ke request bhi chupke se <code>fraud-check</code> ko call karte hain', 'Haalaat mein saaf likha hai ki balance aur history <code>fraud-check</code> ko nahi chhote. Wo threads ki kami se ruke hain.'],
    ] },
    { t: 'Hal chuno', q: 'Ek chup dependency ko poori service girane se kaise rokoge?', a: [
      ['<code>fraud-check</code> ki call par timeout, aur us call ke liye threads ki alag hadd', 'Timeout thread ko wapas chhudata hai. Alag hadd (jaise 40 threads) kehti hai ki <code>fraud-check</code> kitna bhi bigde, 160 threads baaki kaam ke liye bache rahenge.'],
      ['<code>pay-api</code> ke worker threads ko 200 se badhakar seedha 2,000 kar do', '2,000 threads bhi bhar jaayenge; bas 3 minute ki jagah 30 minute mein. Aur har thread memory leta hai.'],
      ['<code>fraud-check</code> ke servers dugne kar do taaki wo kabhi chup na ho', 'Koi bhi dependency kabhi bhi latak sakti hai. Bulaane wale ko khud ko bachana aana chahiye.'],
    ] },
    { t: 'Keemat', q: 'Timeout lag gaya. <code>fraud-check</code> ka jawab waqt par nahi aaya. Ab payment ka kya hoga?', a: [
      ['Tay karna padega: payment roko, ya chhoti rakam ko bina check jaane do', 'Yeh business ka faisla hai. "Roko" surakshit hai par payment band. "Jaane do" mein payment chalte hain par fraud ka khatra. Aksar beech ka raasta: ₹500 se kam jaane do.'],
      ['Kuch tay nahi karna; timeout ke baad payment apne aap sahi ho jaata hai', 'Timeout sirf intezaar khatam karta hai. Payment ka kya ho, yeh code ko batana padta hai.'],
      ['Timeout hote hi <code>pay-api</code> ko <code>fraud-check</code> restart kar dena chahiye', 'Ek service doosri ko restart nahi karti. Aur restart se wajah theek hogi, iski koi guarantee nahi.'],
    ] },
  ],
  fixes: [
    { n: 'Timeout', how: 'Har bahari call par intezaar ki hadd.', cost: 'Dheema lekin sahi jawab bhi kat sakta hai.', when: 'Hamesha. Bina timeout ki call mat likho.' },
    { n: 'Alag hadd (bulkhead)', how: 'Har dependency ke liye threads ya connections ki apni hadd.', cost: 'Us dependency ka kaam jaldi "bhara hua" bolega.', when: 'Ek service kai dependency ko call kare.' },
    { n: 'Circuit breaker', how: 'Lagataar fail par call hi band, kuch der ke liye.', cost: 'Breaker khula ho toh sahi call bhi nahi jaati.', when: 'Dependency der tak bigdi rahe.' },
  ],
  twist: { q: '<code>fraud-check</code> ab jawab deta hai, lekin 790 ms mein. Timeout 800 ms hai. Threads phir bhar rahe hain.', a: [
    ['Timeout ko aam jawab ke waqt ke paas lao (jaise 200 ms) aur breaker lagao', 'Timeout "swasth" service ke waqt se tay hota hai. Aam din mein jawab 100 ms mein aata hai toh 800 ms ki hadd bahut dheeli hai.'],
    ['Timeout ko 800 ms se badhakar 5 second kar do taaki call fail na ho', 'Har thread ab 5 second tak atak sakta hai. Threads aur jaldi khatam honge.'],
    ['Timeout hata do, kyunki <code>fraud-check</code> ab jawab to de hi raha hai', 'Agli baar <code>fraud-check</code> chup hua toh wahi 3 minute wali ghatna.'],
  ] },
  asli: 'Mari hui service se zyada khatarnaak <b>chup</b> service hai. Error turant aata hai; chuppi tumhare threads ko bandhak bana leti hai.',
  say: 'Bina timeout ki call ne saare threads rok liye, isliye ek dependency ki chuppi poori service ko le doobi. Main har bahari call par timeout, har dependency ke liye bulkhead aur circuit breaker lagaunga. Timeout par payment roken ya jaane dein, yeh business ke saath tay karunga.',
},
{
  id: 'poison-message', icon: '☠️', title: 'Ek kharab message, 6 lakh cashback atke', topic: 'resil', hard: 1,
  levels: ['dlq'],
  story: '<code>cashback-worker</code> queue se message uthata hai aur cashback jodta hai. Raat 1 baje ek message aaya jisme amount ki jagah "abc" likha tha. Worker crash hua, message queue mein lauta, worker ne phir uthaya, phir crash. Subah tak 6 lakh cashback atke pade hain.',
  facts: [
    'Queue kram se chalti hai: pehla message poora hue bina agla nahi aata.',
    'Fail hua message queue mein sabse aage laut aata hai.',
    'Kharab message sirf ek hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: '6 lakh message kyun atke hain?', a: [
      ['Ek kharab message baar-baar fail hokar poori line ko roke hue hai', 'Message kabhi safal nahi ho sakta, aur fail hote hi sabse aage laut aata hai. Aise message ko <b>poison message</b> kehte hain.'],
      ['Queue mein jagah khatam ho gayi hai, isliye naye message chal nahi rahe', 'Queue mein message jama ho rahe hain, yaani jagah hai. Message nikal nahi rahe.'],
      ['<code>cashback-worker</code> ke servers kam hain aur raat ko kaam zyada aa gaya', 'Worker ek hi message par atka hai. Zyada servers bhi usi message par crash honge.'],
    ] },
    { t: 'Hal chuno', q: 'Ek kharab message poori line ko na roke, iske liye kya karoge?', a: [
      ['Kuch koshishon (jaise 3) ke baad message ko alag queue mein rakh do', 'Is alag queue ko <b>dead-letter queue (DLQ)</b> kehte hain. Line aage badh jaati hai, aur kharab message jaanch ke liye surakshit rehta hai.'],
      ['Jo message fail ho, use usi waqt hamesha ke liye delete kar do', 'Kisi ka cashback chupchaap kho jaayega, aur galti ka saboot bhi nahi bachega.'],
      ['Worker ko aur servers de do taaki message jaldi-jaldi process hon', 'Har server wahi kharab message uthayega aur crash hoga.'],
    ] },
    { t: 'Keemat', q: 'DLQ lag gayi. Ab kaunsa naya kaam tumhare sir aaya?', a: [
      ['DLQ par nazar: alert, wajah ki jaanch, aur theek karke dobara chalana', 'Bina alert ki DLQ ek aisi peti hai jisme logon ka paisa pada hai aur koi dekhta nahi.'],
      ['Kuch nahi; DLQ ke message kuch der mein apne aap theek ho jaate hain', 'DLQ sirf rakhti hai. Message ko theek karna aur dobara bhejna insaan ya alag job ka kaam hai.'],
      ['Ab har message do baar process hoga: ek baar queue se, ek baar DLQ se', 'DLQ mein sirf wahi message jaate hain jo baar-baar fail hue. Safal message wahan nahi jaate.'],
    ] },
  ],
  fixes: [
    { n: 'Dead-letter queue', how: 'N koshishon ke baad message alag queue mein.', cost: 'DLQ ki nigrani aur dobara chalane ka tareeka chahiye.', when: 'Har queue ke saath.' },
    { n: 'Shuru mein hi jaanch', how: 'Message banane wala hi galat data ko rok de.', cost: 'Bhejne walon ko niyam maanne padte hain.', when: 'Hamesha; DLQ ke saath.' },
    { n: 'Ruk-ruk kar retry', how: 'Asthaayi galti par gap ke saath dobara koshish.', cost: 'Message der se poora hota hai.', when: 'Galti thodi der ki ho (database band).' },
  ],
  twist: { q: 'Ab 6 lakh message DLQ mein hain kyunki <code>cashback-db</code> 10 minute band tha. Message kharab nahi the.', a: [
    ['Asthaayi galti par ruk-ruk kar retry; pakki galti ya khatam budget par DLQ', '"Database band hai" kuch der mein theek ho jaata hai; "amount abc hai" kabhi nahi. Dono ke saath alag bartaav chahiye. Phir DLQ ke message dobara chala do.'],
    ['DLQ mein bhejne ki hadd 3 se badhakar 3,000 koshish kar do, bas itna', 'Agla kharab message 3,000 koshishon tak poori line ko roke rakhega.'],
    ['DLQ ke saare 6 lakh message delete kar do aur aage badho', '6 lakh logon ka cashback kho jaayega, jabki message bilkul sahi the.'],
  ] },
  asli: 'Queue mein do tarah ki galti hoti hai: "abhi nahi ho sakta" aur "kabhi nahi ho sakta". Pehli ke liye retry, doosri ke liye DLQ. Dono ko milana hi samasya hai.',
  say: 'Yeh poison message hai: ek message jo kabhi safal nahi hoga aur line rok deta hai. Main kuch koshishon ke baad use DLQ mein bhejunga, DLQ par alert rakhunga, aur asthaayi galti ke liye backoff wala retry alag rakhunga.',
},
{
  id: 'flash-sale', icon: '🎟️', title: '60,000 log aaye, lagbhag kisi ka payment nahi hua', topic: 'resil', hard: 2,
  levels: ['shedding', 'flashcrowd', 'backpressure'],
  story: 'Raat 12 baje ChaiPay par "₹1 mein movie ticket" sale. Aam bojh 3,000 request har second hai; 12:00:00 par 60,000 ho gaya. 20 second mein har request 30 second lene laga, aur lagbhag koi payment poora nahi hua.',
  facts: [
    '<code>pay-api</code> 8,000 request har second sambhal sakta hai.',
    'Autoscaling naye server 3 minute mein laata hai.',
    'App 10 second par timeout hokar retry karti hai. Tickets sirf 10,000 hain.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Server chal rahe the. Phir lagbhag koi payment poora kyun nahi hua?', a: [
      ['Server ne har request ko le liya, isliye sab dheeme hue aur koi poora nahi', 'Capacity 8,000 hai aur 60,000 aa rahe hain. Sabko lene par line itni lambi ho jaati hai ki jab baari aati hai, app 10 second par haar maan chuki hoti hai. Server ne kaam kiya, par bekaar.'],
      ['Autoscaling kharab hai; use ek second mein naye server laane chahiye the', 'Naya server aane mein minute lagte hain; yeh aam baat hai. Sale ka jhatka pehle hi second mein aata hai.'],
      ['Database mein 10,000 tickets rakhne ki jagah kam pad gayi thi', '10,000 rows kisi bhi database ke liye bahut chhota data hai.'],
    ] },
    { t: 'Hal chuno', q: 'Capacity 8,000 hi hai. Sabse zyada payment kaise poore honge?', a: [
      ['Capacity se upar ke request ko turant mana karo: "line lambi hai, ruko"', 'Ise <b>load shedding</b> kehte hain. 8,000 request poore hote hain, aur baaki ko jaldi, saaf jawab milta hai.'],
      ['Saare 60,000 request ko ek lambi queue mein rakho aur ek-ek karke chalao', 'Queue har second 52,000 se badhti hai. Baari aane tak app timeout ho chuki hoti hai.'],
      ['App ka timeout 10 second se badhakar 2 minute kar do taaki koi fail na ho', 'Line aur lambi hogi, aur user 2 minute ghoomta chakra dekhega.'],
    ] },
    { t: 'Keemat', q: 'Load shedding lag gayi. Iski keemat kya hai?', a: [
      ['Har second 52,000 logon ko "ruko" dikhega, aur wo naraaz ho sakte hain', 'Pehle requests timeout ho rahi thi; ab capacity ke andar requests chalengi. 8,000 requests/s ka matlab 8,000 safal ticket sales/s nahi. "Tum line mein itne number par ho" wali screen narazgi kam karti hai.'],
      ['Jin logon ko mana kiya gaya, unka paisa pehle hi kat chuka hoga', 'Mana sabse pehle hota hai, payment shuru hone se pehle. Paisa nahi kat-ta.'],
      ['Server ka poora CPU request ko mana karne mein hi kharch ho jaayega', 'Mana karna bahut sasta kaam hai, aur aksar server se pehle, gateway par hota hai.'],
    ] },
  ],
  fixes: [
    { n: 'Load shedding', how: 'Capacity se upar turant "abhi nahi" (429/503).', cost: 'Kai users ko mana.', when: 'Achanak aaya bojh.' },
    { n: 'Waiting room', how: 'Gateway par line; har user ko number aur baari.', cost: 'Banana padta hai.', when: 'Sale ka waqt pehle se pata ho.' },
    { n: 'Pehle se servers badhana', how: 'Sale se pehle hi capacity badha do.', cost: 'Utni der ka extra kharcha.', when: 'Waqt aur andaaza pata ho.' },
  ],
  twist: { q: 'Agli sale ka waqt pehle se pata hai. Ab kya badloge?', a: [
    ['Sale se pehle servers badhao, aur gateway par waiting room lagao', 'Pehle se badhi capacity zyada log sambhalti hai. Waiting room baaki logon ko saaf line deta hai.'],
    ['Sirf autoscaling ki oopri hadd badha do; baaki autoscaling sambhal lega', 'Autoscaling ko 3 minute lagte hain. Sale ka faisla pehle 20 second mein ho jaata hai.'],
    ['Sale ko bina bataye chupchaap shuru karo taaki kam log aayein', 'Sale ka maksad hi log laana hai.'],
  ] },
  asli: 'Bojh capacity se upar ho toh sabko "haan" kehna sabko "na" kehne jaisa hai. Kuch ko jaldi "na" bolo, tabhi baaki ko sach mein "haan" mil paata hai.',
  say: 'Bina admission control ke server har request leta hai, line lambi hoti hai, aur kaam client ke timeout ke baad poora hota hai. Main load shedding lagaunga, planned sale ke liye pehle se scale karunga aur gateway par waiting room rakhunga.',
},
{
  id: 'optional-dep', icon: '🎁', title: 'Reward points ki line ne checkout band kar diya', topic: 'resil', hard: 1,
  levels: ['degrade'],
  story: 'Checkout screen par ek line hai: "Is payment par 20 reward points milenge". Yeh line <code>rewards-service</code> se aati hai. Aaj <code>rewards-service</code> band hai, aur checkout screen khul hi nahi rahi: "Something went wrong".',
  facts: [
    'Reward points wali line sirf jaankari hai. Payment ke liye zaroori nahi.',
    '<code>pay-api</code> checkout ke jawab mein <code>rewards-service</code> ka data jodta hai.',
    '<code>rewards-service</code> ki call fail hui toh <code>pay-api</code> poora jawab 500 kar deta hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Checkout kyun band hai?', a: [
      ['Reward call fail hui aur checkout ka poora jawab fail kar diya gaya', 'Code har dependency ko barabar zaroori maan raha hai. Jaankari wali ek line ne payment ka raasta rok diya.'],
      ['<code>rewards-service</code> ke bina payment ka hisaab galat ho jaata hai', 'Haalaat mein likha hai ki reward points sirf jaankari hain. Payment ka hisaab unke bina poora hai.'],
      ['Checkout screen ke frontend code mein koi galti hai jo screen tod rahi hai', 'Server khud 500 bhej raha hai. Frontend wahi dikha raha hai jo use mila.'],
    ] },
    { t: 'Hal chuno', q: 'Sabse seedha hal?', a: [
      ['Rewards call fail ho toh wo line chhupa do aur checkout chalne do', 'Ise <b>graceful degradation</b> kehte hain: thodi kam suvidha ke saath kaam chalta rahe.'],
      ['<code>rewards-service</code> ke teen aur replica chala do taaki wo na gire', 'Service kam giregi, lekin giregi zaroor. Us din phir checkout band.'],
      ['Checkout tab tak dobara koshish kare jab tak reward points na aa jaayein', 'User tab tak payment nahi kar paayega jab tak ek ghair-zaroori service theek na ho.'],
    ] },
    { t: 'Keemat', q: 'Degradation sahi se karne ke liye team ko kya karna padega?', a: [
      ['Har dependency ke liye likhna: zaroori hai ya nahi, aur fail par kya dikhe', 'Yeh faisla pehle se likha hona chahiye, aur test bhi: dependency band karke dekho ki screen kaisi dikhti hai.'],
      ['Kuch nahi; ek baar line chhupa di toh hamesha ke liye kaam ho gaya', 'Har nayi dependency ke saath wahi sawal dobara aata hai. Yeh ek aadat hai, ek baar ka kaam nahi.'],
      ['Reward points ko hamesha ke liye checkout screen se hata dena padega', 'Line sirf tab chhupti hai jab service fail ho. Baaki waqt dikhti hai.'],
    ] },
  ],
  fixes: [
    { n: 'Hissa chhupana', how: 'Fail hone par wo hissa mat dikhao.', cost: 'User ko wo jaankari nahi milti.', when: 'Hissa sirf jaankari ka hai.' },
    { n: 'Purana ya default value', how: 'Cache ka pichhla value ya ek aam line dikhao.', cost: 'Value thoda galat ho sakta hai.', when: 'Lagbhag sahi value bhi chalega.' },
    { n: 'Baad mein jodna', how: 'Points payment ke baad queue se jodo.', cost: 'User ko baad mein dikhte hain.', when: 'Kaam turant zaroori nahi.' },
  ],
  twist: { q: 'Ab <code>rewards-service</code> band nahi, dheemi hai: 4 second. Checkout bhi 4 second le raha hai.', a: [
    ['Rewards call par chhota timeout (jaise 150 ms); na aaye toh line chhupa do', 'Dheemi service bhi "fail" hi hai, bas der se. Timeout dheemepan ko jaldi fail mein badal deta hai.'],
    ['Checkout ka poora timeout badhakar 10 second kar do taaki wo fail na ho', 'User 4 second intezaar karega ek aisi line ke liye jo zaroori nahi.'],
    ['Reward points ko payment se pehle ka ek zaroori kadam bana do', 'Tab <code>rewards-service</code> ka har dheemapan seedha payment ko rokega.'],
  ] },
  asli: 'Har dependency barabar nahi hoti. Pehle se tay karo: "dependency band ho toh bhi core kaam chalega?" Jawab "haan" hai toh dependency fail hone par core flow chalna chahiye.',
  say: 'Yahan ek optional dependency ko critical ki tarah bartaa gaya. Main dependencies ko zaroori aur ghair-zaroori mein baantunga. Ghair-zaroori call par chhota timeout aur fallback hoga: hissa chhupao ya purana value dikhao.',
},
{
  id: 'replica-not-backup', icon: '🗑️', title: 'DELETE galti se chala, aur replica bhi khaali', topic: 'resil', hard: 2,
  levels: ['replicas-backups', 'replication'],
  story: 'Ek engineer ne galti se production par <code>DELETE FROM merchants</code> chala diya; WHERE lagana bhool gaya. Team ne socha: "koi baat nahi, <code>pg-replica-1</code> hai na." Lekin 1 second ke andar <code>pg-replica-1</code> ki <code>merchants</code> table bhi khaali thi.',
  facts: [
    'Replica <code>pg-primary</code> ka har badlaav turant copy karta hai.',
    'Aakhri backup 6 din purana hai.',
    'Us backup ko kabhi restore karke dekha nahi gaya.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Replica ne data kyun nahi bachaya?', a: [
      ['Replica har badlaav copy karta hai, galti bhi; replica backup nahi hai', 'Replica ka kaam "machine mar jaaye toh doosri tayyar ho" hai. Galat command bhi ek badlaav hai, aur replica use bhi imaandaari se copy karta hai.'],
      ['Replication dheemi chal rahi thi, isliye replica ka data bhi kharab hua', 'Ulta: replication tez thi, isliye DELETE 1 second mein replica tak pahunch gaya.'],
      ['Replica galat tarah se set tha, warna wo DELETE ko khud rok deta', 'Koi replica yeh nahi jaanta ki kaunsa badlaav "galti" hai. Sahi set replica bhi yahi karta.'],
    ] },
    { t: 'Hal chuno', q: 'Aisi galti ke baad data wapas laane ke liye kya chahiye?', a: [
      ['Roz ka backup aur change-log, taaki "galti se 1 minute pehle" par laut sakein', 'Backup ek purana pal deta hai. Change-log us pal se aage ke badlaav dobara chalata hai, galti se theek pehle tak. Ise point-in-time recovery kehte hain.'],
      ['Replica ki ginti 1 se badhakar 5 kar do taaki data zyada jagah par rakha ho', 'Paanchon replica wahi DELETE copy karenge. Paanch khaali table milengi.'],
      ['Saare engineers se production ka access hamesha ke liye le lo', 'Access kam karna achha hai, lekin script aur migration bhi galti karte hain. Wapsi ka raasta phir bhi chahiye.'],
    ] },
    { t: 'Keemat', q: 'Backup aur change-log rakhne ke saath kaunsi zimmedari aati hai?', a: [
      ['Backup ko niyam se restore karke dekhna, warna backup sirf ek ummeed hai', 'Jo backup kabhi restore nahi hua, uske baare mein do baatein nahi pata: kya wo chalta hai, aur restore mein kitne ghante lagte hain.'],
      ['Backup lete waqt <code>pg-primary</code> har din kuch ghante band rahega', 'Backup chalte database se liya jaata hai, aksar replica se. Database band nahi hota.'],
      ['Change-log rakhne ke baad kisi bhi replica ki koi zaroorat nahi rehti', 'Dono ka kaam alag hai: replica machine marne par turant kaam aata hai; backup galti ya data kharab hone par.'],
    ] },
  ],
  fixes: [
    { n: 'Backup + change-log', how: 'Poora backup + lagataar log: kisi bhi pal par lauto.', cost: 'Restore mein ghante lag sakte hain.', when: 'Hamesha. Yahi asli backup hai.' },
    { n: 'Der wala replica', how: 'Ek replica jaan-boojhkar 1 ghanta peeche.', cost: 'Galti 1 ghante mein pakadni hogi.', when: 'Jaldi wapsi chahiye.' },
    { n: 'Soft delete', how: 'Row mitao mat; <code>deleted_at</code> likho.', cost: 'Har query mein filter; data badhta hai.', when: 'User ka zaroori data.' },
  ],
  twist: { q: 'Backup se restore mein 9 ghante lagenge. Business kehta hai: 30 minute se zyada band nahi chalega.', a: [
    ['Ek replica jaan-boojhkar 1 ghanta peeche rakho; galti par data wahin se lo', 'Galti delay window ke andar pakdo aur replay roko. Table recovery ka waqt data size aur restore rehearsal se jaancho; 30 minute guaranteed nahi.'],
    ['Backup ko din mein ek baar ki jagah har 12 ghante par lena shuru kar do', 'Kam data khoyega, lekin restore ka waqt wahi 9 ghante rahega.'],
    ['Restore ke waqt zyada engineers ko kaam par laga do', 'Restore ka waqt data ke size aur disk ki raftaar se tay hota hai, logon ki ginti se nahi.'],
  ] },
  asli: 'Replica <b>machine ke marne</b> se bachata hai. Backup <b>insaan ki galti</b> se bachata hai. Aur jo backup kabhi restore nahi hua, wo backup nahi hai.',
  say: 'Replication galti ko bhi copy karti hai, isliye replica backup nahi hai. Main roz ka backup aur change-log rakhunga point-in-time recovery ke liye, restore ka niyam se abhyaas karunga, aur jaldi wapsi ke liye ek delayed replica rakhunga.',
},

/* ---------------------------------------------------------------- DIST */
{
  id: 'dual-write', icon: '✉️', title: 'Payment save hua, par event kabhi gaya hi nahi', topic: 'dist', hard: 3,
  levels: ['outbox'],
  story: '<code>pay-api</code> payment ko <code>pay-db</code> mein save karta hai, phir Kafka par "PaymentDone" event bhejta hai. <code>cashback-service</code> us event se cashback deta hai. Kal 1,200 payment ka cashback nahi aaya. <code>pay-db</code> mein wo payment hain; Kafka mein unke event nahi hain.',
  facts: [
    'Code ka kram: pehle <code>pay-db</code> commit, phir Kafka par event.',
    'Kal Kafka 90 second ke liye band tha.',
    'Event bhejna fail ho toh code sirf ek error log karta hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: '1,200 event kyun gayab hain?', a: [
      ['Do alag jagah likhna ek saath nahi hota; beech mein toota toh ek hi hua', 'Database aur Kafka do alag system hain. Unke beech koi saajha transaction nahi hai. Commit ke baad Kafka band mila, aur event kabhi gaya nahi. Is galti ko <b>dual write</b> kehte hain.'],
      ['<code>cashback-service</code> ne 1,200 event padhkar bhi cashback nahi diya', 'Haalaat mein likha hai ki Kafka mein wo event hain hi nahi. <code>cashback-service</code> ko kuch mila hi nahi.'],
      ['Kafka ne 1,200 event le liye the aur baad mein unhe kho diya', 'Kafka us waqt band tha. Event Kafka tak pahunche hi nahi.'],
    ] },
    { t: 'Hal chuno', q: 'Payment aur event ko "dono ya koi nahi" kaise banaoge?', a: [
      ['Payment ke saath, usi transaction mein, event ko ek "outbox" table mein likho', 'Dono ek hi database mein, ek hi transaction mein hain: ya dono, ya koi nahi. Ek alag worker outbox padhkar Kafka ko bhejta hai. Kafka band ho toh worker baad mein bhejta hai.'],
      ['Kram ulta kar do: pehle Kafka par event bhejo, phir <code>pay-db</code> mein save karo', 'Ab ulti galti hogi: event chala gaya, par payment save nahi hua. Cashback bina payment ke.'],
      ['Event bhejna fail ho toh <code>pay-db</code> se us payment ko bhi delete kar do', 'User ka safal payment gayab ho jaayega. Aur wo delete bhi fail ho sakta hai.'],
    ] },
    { t: 'Keemat', q: 'Outbox lag gaya. Padhne wali service ko ab kya sehna hoga?', a: [
      ['Worker ek event do baar bhej sakta hai; padhne wale ko dobara aana sehna hoga', 'Worker "bhej diya" likhne se pehle crash ho toh wahi event dobara jaata hai. Isliye <code>cashback-service</code> event id yaad rakhe aur dobara aaye toh chhod de.'],
      ['Kafka band hone par ab payment bhi fail ho jaayenge', 'Ulta: payment ab Kafka par tika hi nahi. Event baad mein jaata hai.'],
      ['Outbox table ki wajah se har payment lagbhag 1 second dheema ho jaayega', 'Usi transaction mein ek chhoti row aur likhna kuch millisecond ka kaam hai.'],
    ] },
  ],
  fixes: [
    { n: 'Outbox table', how: 'Event usi transaction mein table mein; worker baad mein bhejta hai.', cost: 'Ek worker; event do baar ja sakta hai.', when: 'Database badlaav ke saath event zaroor jaana chahiye.' },
    { n: 'Change-log se event (CDC)', how: 'Ek tool database ka log padhkar event banata hai.', cost: 'Ek aur system chalana padta hai.', when: 'Bahut saari tables ke event chahiye.' },
    { n: 'Roz ka milaan', how: 'Ek job dono jagah ka data milaati hai aur farak theek karti hai.', cost: 'Galti der se pakdi jaati hai.', when: 'Peeche ki suraksha ke roop mein.' },
  ],
  twist: { q: 'Outbox worker crash hua: event Kafka ko chala gaya, par outbox row par "bheja" likhne se pehle.', a: [
    ['<code>cashback-service</code> event id yaad rakhe; wahi id dobara aaye toh chhod de', 'Event do baar aayega, yeh maan lo. Asar ek baar ho, yeh padhne wale ka kaam hai.'],
    ['Worker ko aisa banao ki wo kabhi, kisi bhi halat mein crash na ho', 'Machine band ho sakti hai, bijli ja sakti hai. "Kabhi crash nahi" koi design nahi hai.'],
    ['Outbox row par "bheja" pehle likho, aur Kafka ko event uske baad bhejo', 'Ab crash par event kabhi nahi jaayega. Wahi purani samasya wapas.'],
  ] },
  asli: 'Bina saajhe commit protocol ke do alag systems mein "dono ya koi nahi" nahi milta. Ek mein likho (database), aur doosre ko wahin se bharosemand tareeke se pahunchao.',
  say: 'Yeh dual write hai: database commit aur Kafka publish ke beech koi transaction nahi. Main transactional outbox use karunga: event usi transaction mein outbox table mein, ek relay use Kafka bhejta hai. Delivery at-least-once hai, isliye consumer event id se idempotent hoga.',
},
{
  id: 'saga-half', icon: '🎬', title: 'Paisa kata, ticket nahi bana, seat ruki hui', topic: 'dist', hard: 3,
  levels: ['saga'],
  story: 'Movie ticket ke teen kadam: <code>booking-service</code> seat rokta hai, <code>pay-service</code> paisa kaatta hai, <code>ticket-service</code> ticket banata hai. Aman ka paisa kat gaya, lekin <code>ticket-service</code> fail ho gaya. Aman ke paas na ticket hai, na paisa, aur seat ruki hui hai.',
  facts: [
    'Teeno services ke apne alag database hain.',
    'Teeno par ek saajha database transaction mumkin nahi.',
    'Abhi koi kadam fail ho toh pichhle kadam wapas nahi hote.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Aman aadhi halat mein kyun atka hai?', a: [
      ['Teen alag commit hain; teesra fail hua, par pehle do wapas nahi hue', 'Ek database mein rollback sab kuch wapas kar deta. Teen database mein har commit pakka ho chuka hota hai. Wapas karne ke liye naya kaam karna padta hai.'],
      ['<code>pay-service</code> ne Aman ka paisa galti se do baar kaat liya', 'Paisa ek hi baar kata hai. Samasya yeh hai ki ticket nahi bana aur paisa wapas nahi aaya.'],
      ['Seat rokne wala kadam sabse pehle nahi, sabse aakhir mein hona chahiye tha', 'Kram badalne se sirf aadhi halat ka roop badlega. Koi bhi kadam fail ho sakta hai.'],
    ] },
    { t: 'Hal chuno', q: 'Har service ka apna database hai (shared DB ka option nahi). Teen services ke beech "poora ya kuch nahi" jaisa bartaav kaise laoge?', a: [
      ['Har kadam ka ulta kadam likho: fail hone par refund karo aur seat chhodo', 'Is pattern ko <b>saga</b> kehte hain. Ulte kadam (compensation) pichhle commit ka asar mitate hain.'],
      ['Teeno services ko ek hi saajha database par le aao aur ek transaction chalao', 'Kaam karega, par teeno teams ek doosre ke schema se bandh jaayengi. Services alag isiliye ki gayi thi.'],
      ['<code>ticket-service</code> ko tab tak retry karo jab tak safal na ho, chahe ghante lagein', 'Aman ka paisa ghanton atka rahega, aur film shuru ho chuki hogi. Retry ki ek hadd chahiye, uske baad ulta kadam.'],
    ] },
    { t: 'Keemat', q: 'Saga ki keemat kya hai?', a: [
      ['Beech ki aadhi halat doosron ko dikhti hai, aur ulta kadam bhi fail ho sakta hai', 'Seat kuch der "ruki hui" dikhegi jabki booking fail hone wali hai. Aur refund ko bhi retry aur dobara-surakshit (idempotent) banana padta hai.'],
      ['Saga mein har kadam, safal ho ya fail, pehle se lagbhag 10 guna dheema ho jaata hai', 'Kadam utne hi tez rehte hain. Extra kaam sirf fail hone par hota hai.'],
      ['Saga lagane ke baad <code>ticket-service</code> kabhi fail nahi hoga', 'Saga fail hone ko rokta nahi. Saga fail hone ke baad safai karta hai.'],
    ] },
  ],
  fixes: [
    { n: 'Saga, ek sanchaalak ke saath', how: 'Ek service kadam aur ulte kadam chalati hai (orchestration).', cost: 'Ek aur service; wahi sab jaanti hai.', when: '3 ya zyada kadam; flow saaf dikhna chahiye.' },
    { n: 'Saga, events se', how: 'Har service event sunkar apna kadam chalati hai (choreography).', cost: 'Poora flow ek jagah nahi dikhta.', when: '2–3 kadam, saada flow.' },
    { n: 'Two-phase commit', how: 'Sab pehle "tayyar" bolte hain, phir sab saath commit.', cost: 'Lock lambe; sanchaalak atke toh sab atke.', when: 'Ek jaise database, kam bojh.' },
  ],
  twist: { q: 'Refund ki call bhi fail ho gayi kyunki bank band hai.', a: [
    ['Refund ko tab tak retry karo jab tak ho na jaaye; refund dobara-surakshit ho', 'Ulta kadam chhoda nahi ja sakta. Use queue mein rakho, retry karo, aur wahi refund do baar na ho iske liye ek key bhejo.'],
    ['Refund chhod do; Aman khud support ko call karke apna paisa maang lega', 'System ne paisa liya hai, toh lautana bhi system ka kaam hai.'],
    ['Poore saga ko dobara shuru se chalao: seat, paisa, phir ticket', 'Aman ka paisa dobara katega, jabki pehla abhi lauta nahi.'],
  ] },
  asli: 'Kai services ke beech rollback nahi hota. Har kadam likhte waqt uska <b>ulta kadam</b> bhi likho, warna tum aadhi halat ki zimmedari user par daal rahe ho.',
  say: 'Alag database wali services par ek transaction nahi chalta, isliye main saga use karunga: har kadam ka compensation, jaise refund aur seat chhodna. Compensation retry hoga aur idempotent hoga. Teen kadam ke liye orchestration, taaki flow ek jagah dikhe.',
},
{
  id: 'dup-consume', icon: '👯', title: 'Deploy ke baad 300 logon ko cashback do baar', topic: 'dist', hard: 2,
  levels: ['exactlyonce'],
  story: '<code>cashback-worker</code> Kafka se "PaymentDone" padhta hai, ₹50 cashback jodta hai, phir Kafka ko batata hai "padh liya". Kal ek deploy mein worker beech mein band hua. 300 logon ko ₹50 do baar mila.',
  facts: [
    'Worker ne cashback jod diya tha, lekin "padh liya" kehne se pehle band ho gaya.',
    'Naye worker ne wahi message dobara padhe.',
    'Har event mein ek unique <code>payment_id</code> hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Cashback do baar kyun gaya?', a: [
      ['Kaam ho gaya tha, par "padh liya" nahi pahuncha; message dobara aaya', 'Kafka ke liye jo message "padh liya" nahi hua, wo dobara diya jaata hai. Ise at-least-once delivery kehte hain: kam se kam ek baar, kabhi-kabhi do baar.'],
      ['Kafka ne galti se har message ki do copy bana di thi', 'Message ek hi hai. Wahi message do baar diya gaya kyunki pehli baar ka "padh liya" kabhi nahi aaya.'],
      ['Do worker ek hi waqt mein ek hi message ko saath-saath padh rahe the', 'Pehla worker band ho chuka tha. Doosre ne uske baad wahi message padha.'],
    ] },
    { t: 'Hal chuno', q: 'Dobara aaye message ka asar ek hi baar kaise hoga?', a: [
      ['<code>payment_id</code> par unique constraint: usi payment ka cashback dobara na jude', 'Doosri baar insert fail hota hai aur worker message ko chhod deta hai. Aise worker ko idempotent consumer kehte hain.'],
      ['Kram badlo: pehle Kafka ko "padh liya" bolo, phir cashback jodo', 'Ab beech mein band hone par cashback kabhi nahi milega: message "padha hua" hai par kaam nahi hua.'],
      ['Har deploy ke waqt Kafka ko rok do taaki koi message na aaye', 'Worker deploy ke bina bhi band ho sakta hai: machine mar jaaye, memory khatam ho.'],
    ] },
    { t: 'Keemat', q: 'Is hal ko sahi lagane mein naazuk baat kya hai?', a: [
      ['Cashback jodna aur <code>payment_id</code> likhna ek hi transaction mein hon', 'Alag-alag hue toh beech mein band hone par ya cashback do baar, ya kabhi nahi.'],
      ['Ab har message jaan-boojhkar do baar process karna padega', 'Zyadatar message ek hi baar aate hain. Constraint sirf dobara aaye message ko rokta hai.'],
      ['Unique constraint lagane se Kafka mein message ka kram toot jaata hai', 'Constraint database mein hai. Kafka ke kram se uska koi lena-dena nahi.'],
    ] },
  ],
  fixes: [
    { n: 'Dobara-surakshit worker', how: 'Unique key (<code>payment_id</code>) par kaam ek hi baar.', cost: 'Key ka hisaab rakhna padta hai.', when: 'Paisa, order, koi bhi zaroori kaam.' },
    { n: 'Pehle "padh liya"', how: 'Message ko pehle ack, phir kaam (at-most-once).', cost: 'Band hone par kaam kho jaata hai.', when: 'Khona chalta ho: gintiyaan, logs.' },
    { n: 'Kafka ke andar transaction', how: 'Padhna aur likhna, dono Kafka mein, ek transaction mein.', cost: 'Sirf Kafka se Kafka tak kaam karta hai.', when: 'Stream processing.' },
  ],
  twist: { q: 'Cashback ab database mein nahi, ek bahari bank API se jaata hai. Us API par unique constraint nahi laga sakte.', a: [
    ['Bank API ko <code>payment_id</code> ek idempotency key ki tarah bhejo', 'Bank wahi key dobara dekhega toh paisa dobara nahi bhejega. Bank ka documented key scope aur retention jaancho; idempotency support na ho toh reconciliation chahiye.'],
    ['Bank API ko call karne se pehle har baar 5 second ruk jao', 'Rukne se dobara aaya message "naya" nahi ban jaata. Paisa phir bhi do baar jaayega.'],
    ['Har din ke ant mein jinhe do baar mila, unse paisa wapas maango', 'Paisa wapas lena mushkil hai aur user ko bura lagta hai.'],
  ] },
  asli: '"Exactly once" bhejna mumkin nahi; message kabhi-kabhi do baar aayega hi. Isliye kaam ko aisa banao ki do baar chalne par bhi asar ek hi baar ho.',
  say: 'Kafka at-least-once deta hai, isliye duplicate aayenge. Main consumer ko idempotent banaunga: payment_id par unique constraint aur cashback usi transaction mein. Bahari API ke liye wahi id idempotency key banegi.',
},
{
  id: 'lock-gc', icon: '⏰', title: 'Lock tha, phir bhi do workers ne paisa bheja', topic: 'dist', hard: 3,
  levels: ['locks', 'clocks'],
  story: 'Raat ka "settlement" job ek hi worker ko chalana chahiye. Worker A ne Redis mein lock liya (30 second ka). Phir Worker A 40 second ke liye atak gaya. Lock expire hua, Worker B ne lock liya aur kaam shuru kiya. Worker A jaaga aur usne bhi kaam jaari rakha. 900 merchants ko paisa do baar gaya.',
  facts: [
    'Worker A ko pata hi nahi chala ki uska lock expire ho chuka hai.',
    'Lock sirf yeh tay karta hai ki "kaun shuru kare".',
    '<code>settlement-db</code> kisi lock ke baare mein kuch nahi jaanta.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Lock ke hote hue do workers kaise chale?', a: [
      ['Lock expire ho gaya, par purana worker khud ko abhi bhi malik samajhta raha', 'Atka hua process waqt ka guzarna nahi dekh sakta. Jaagne par Worker A ko lagta hai ki ek pal hi beeta hai. Lock "kisi aur ko diya ja chuka hai", Worker A ko kisi ne nahi bataya.'],
      ['Redis ne ek hi lock ek hi pal mein do workers ko de diya tha', 'Redis ne lock sahi diya: pehle A ko, expire hone ke baad B ko. Galti lock dene mein nahi hai.'],
      ['Lock ka waqt 30 second bahut lamba tha; chhota hota toh yeh na hota', 'Chhote waqt mein lock aur jaldi expire hota. Samasya aur aasaani se aati.'],
    ] },
    { t: 'Hal chuno', q: 'Purane malik ke write ko kaun rok sakta hai?', a: [
      ['Har lock ke saath badhta number do; database purane number ka write thukra de', 'Is number ko <b>fencing token</b> kehte hain. A ke paas 33 hai, B ke paas 34. Database 34 dekh chuka hai, toh 33 wala write mana.'],
      ['Lock ka waqt 30 second se badhakar seedha 10 minute kar do', 'Worker A crash ho toh 10 minute koi kaam nahi karega. Aur 11 minute ka atakna phir wahi ghatna.'],
      ['Worker har write se theek pehle jaanche ki lock abhi bhi usi ke paas hai', 'Jaanchne aur likhne ke beech bhi worker atak sakta hai. Khidki chhoti hoti hai, band nahi.'],
    ] },
    { t: 'Keemat', q: 'Fencing token ke saath kaunsi shart aati hai?', a: [
      ['Database ko har write par number jaanchna hoga; lock akela kaafi nahi', 'Suraksha us jagah lagti hai jahan data likha jaata hai. Agar wo jagah number nahi jaanch sakti toh fencing kaam nahi karta.'],
      ['Har worker ko apni ghadi Redis ki ghadi se milaakar rakhni hogi', 'Fencing ghadi par tika hi nahi hai. Wo sirf badhte number par tika hai.'],
      ['Fencing ke baad lock ka waqt kabhi expire nahi hona chahiye', 'Expire hona zaroori hai, warna crash hue worker ka lock hamesha atka rahega.'],
    ] },
  ],
  fixes: [
    { n: 'Fencing token', how: 'Lock ke saath badhta number; data store purana number thukraata hai.', cost: 'Data store ko number jaanchna aana chahiye.', when: 'Lock ka galat hona paisa ya data bigaade.' },
    { n: 'Kaam ko dobara-surakshit banana', how: '<code>merchant + tareekh</code> par unique: ek settlement ek hi baar.', cost: 'Har kaam ke liye key sochni padti hai.', when: 'Kaam ki kudrati key ho.' },
    { n: 'Database ka apna lock', how: 'Lock usi database mein jahan data hai, usi transaction mein.', cost: 'Sirf ek database ke andar.', when: 'Saara kaam ek hi database mein hai.' },
  ],
  twist: { q: 'Settlement ek bahari bank API ko call karta hai. Bank fencing number nahi samajhta.', a: [
    ['Bank ko har call ke saath <code>merchant + tareekh</code> wali idempotency key do', 'Dono workers wahi key bhejenge. Bank documented idempotency support aur retention ke andar doosri baar paisa nahi bhejega.'],
    ['Lock ka waqt aur badha do taaki wo beech mein expire hi na ho', 'Worker kitni der atkega, iski koi hadd nahi. Waqt badhana sirf mauka kam karta hai.'],
    ['Do ki jagah sirf ek worker rakho taaki takraav ho hi na sake', 'Akela worker mara toh settlement hoga hi nahi. Aur Worker A ke restart ke waqt bhi do copy chal sakti hain.'],
  ] },
  asli: 'Distributed lock ek <b>salaah</b> hai, guarantee nahi. Asli suraksha data store par lagao: fencing number ya idempotency key.',
  say: 'TTL wala lock process pause ke baad galat ho sakta hai: purana holder ko pata nahi chalta ki lock gaya. Main fencing token use karunga jise data store jaanche, ya kaam ko idempotent banaunga. Lock sirf faaltu kaam kam karne ke liye rahega.',
},
{
  id: 'last-coupon', icon: '🎫', title: '100 coupon the, 137 logon ko mil gaye', topic: 'dist', hard: 2,
  levels: ['contention', 'lock-choices'],
  story: '"Pehle 100 logon ko ₹200 cashback" wala coupon. 100 ki jagah 137 logon ko mil gaya. Code yeh karta hai: <code>count</code> padho; 100 se kam ho toh coupon do aur <code>count + 1</code> likho.',
  facts: [
    'Raat 9 baje 5,000 log ek saath aaye.',
    'Padhna aur likhna do alag query hain.',
    '<code>coupon-service</code> ke 10 servers hain.',
  ],
  steps: [
    { t: 'Asli wajah', q: '37 extra coupon kaise bant gaye?', a: [
      ['Kai request ne ek saath wahi purana count padha, aur sabko "jagah hai" dikha', 'Padhne aur likhne ke beech ek chhoti khidki hai. Us khidki mein dasiyon request count = 99 padhte hain, aur sab coupon de dete hain.'],
      ['Database ne <code>count + 1</code> ka jod kabhi-kabhi galat kar diya', 'Database ne jod sahi kiya. Har request ne purane count par jod kiya, yahi samasya hai.'],
      ['10 servers ki ghadi alag-alag thi, isliye ginti aage-peeche ho gayi', 'Is code mein ghadi ka koi kaam hi nahi hai. Ginti database ki ek row mein hai.'],
    ] },
    { t: 'Hal chuno', q: 'Sabse saada sahi hal?', a: [
      ['Ek hi query: <code>SET count = count + 1 WHERE count &lt; 100</code>', 'Jaanch aur badlaav ek hi atomic kadam ban jaate hain. Database ek waqt mein ek hi request ko row badalne deta hai. Row badli toh coupon do; nahi badli toh "khatam".'],
      ['Padhne aur likhne ke beech 100 ms ruk jao taaki baaki request nikal jaayein', 'Rukne se khidki aur badi ho jaati hai. Aur zyada request purana count padhenge.'],
      ['<code>coupon-service</code> ka sirf ek hi server rakho, 10 ki jagah', 'Ek server ke andar bhi kai request ek saath chalte hain. Ek server mein bhi read aur write ke beech race hai.'],
    ] },
    { t: 'Keemat', q: 'Ab saare request ek hi row ko badalte hain. Bahut zyada bojh par kya hoga?', a: [
      ['Wahi ek row sabki line ban jaati hai; request row ke lock ka intezaar karte hain', '5,000 log ke liye theek hai. 5 lakh log par wahi row gala ghont deti hai. Tab coupon ko pehle se tokens mein baantna padta hai.'],
      ['Kabhi-kabhi 100 se zyada coupon phir bhi bant jaayenge, pehle ki tarah', 'Shart <code>count &lt; 100</code> usi query mein hai. 100 se upar jaana mumkin nahi.'],
      ['Count kabhi 100 tak nahi pahunchega kyunki query baar-baar fail hogi', 'Query fail nahi hoti; wo ek-ek karke chalti hai. Count theek 100 par rukta hai.'],
    ] },
  ],
  fixes: [
    { n: 'Ek atomic query', how: 'Jaanch aur badlaav ek hi UPDATE mein.', cost: 'Ek row par sabki line.', when: 'Saada counter, madhyam bojh.' },
    { n: 'Version ke saath likhna (optimistic)', how: 'Likho sirf tab jab version wahi ho jo padha tha; warna dobara koshish.', cost: 'Takraav zyada ho toh bahut retry.', when: 'Takraav kam hote hain.' },
    { n: 'Pehle lock, phir kaam (pessimistic)', how: '<code>SELECT ... FOR UPDATE</code>, phir jaanch aur likhna.', cost: 'Lock lamba; sab line mein.', when: 'Jaanch ke baad kaam lamba ho.' },
  ],
  twist: { q: 'Ab 5 lakh log ek saath aate hain. Wahi ek row sabko rok rahi hai.', a: [
    ['100 coupon pehle se Redis ki list mein daal do; har request ek nikaale', 'List se ek cheez nikaalna atomic aur bahut tez hai. List khaali, toh coupon khatam. Database par line nahi lagti.'],
    ['Row par se lock hata do taaki saare request ek saath tez chalein', 'Lock hi ginti ko sahi rakhta hai. Lock ke bina wahi 137 wali ghatna, aur badi.'],
    ['Har server apni memory mein 0 se 100 tak apni alag ginti rakhe', '10 servers × 100 = 1,000 coupon bant jaayenge.'],
  ] },
  asli: '"Pehle dekho, phir karo" do kadam hain, aur do kadam ke beech koi aur ghus sakta hai. Jaanch aur badlaav ko <b>ek hi atomic kadam</b> banao.',
  say: 'Yeh check-then-act race hai. Main jaanch aur increment ko ek atomic conditional UPDATE mein rakhunga. Bojh bahut zyada ho toh coupon ko pehle se tokens ki tarah Redis list mein daalunga, jahan pop atomic hai.',
},
{
  id: 'split-brain', icon: '🧠', title: 'Network toota, aur do primary ban gaye', topic: 'dist', hard: 3,
  levels: ['consensus', 'consensus-split', 'cap'],
  story: 'ChaiPay ke 2 data centre hain: Mumbai (primary database) aur Chennai (standby). Dono ke beech ka network 4 minute toota. Chennai ki script ne socha "Mumbai mar gaya" aur Chennai ko primary bana diya. 4 minute tak dono ne write liye. Network juda toh dono ke paas alag balance the.',
  facts: [
    'Mumbai zinda tha. Sirf beech ka network toota tha.',
    'Failover script ek hi cheez dekhti hai: "kya mujhe Mumbai dikh raha hai?"',
    'Dono taraf ke users payment kar rahe the.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Do primary kyun ban gaye?', a: [
      ['Chennai "network toota" aur "Mumbai mar gaya" mein farak nahi kar sakta', 'Dono halat mein Chennai ko ek hi cheez dikhti hai: Mumbai jawab nahi de raha. Do jagah hon toh yeh farak pata karna mumkin hi nahi.'],
      ['Mumbai ka database sach mein 4 minute ke liye crash ho gaya tha', 'Haalaat mein likha hai ki Mumbai zinda tha aur write le raha tha.'],
      ['Replication bahut dheemi thi, isliye dono taraf ka data alag ho gaya', 'Data isliye alag hua ki dono ne alag-alag write liye. Replication ki raftaar wajah nahi hai.'],
    ] },
    { t: 'Hal chuno', q: 'Kaise pakka karoge ki ek waqt mein ek hi primary ho?', a: [
      ['Teesri jagah ek gawah rakho; primary wahi bane jise 3 mein se 2 vote milein', 'Network toote toh sirf ek taraf ke paas 2 vote ho sakte hain; sirf wahi taraf primary chun sakti hai. Purana primary bhi bahumat khote hi write band kare (ya fence ho), warna purana primary likhta rahega. Ise <b>quorum</b> (bahumat) kehte hain.'],
      ['Failover script ka intezaar badhakar 10 minute kar do, phir failover karo', '11 minute ka network tootna phir wahi ghatna. Aur Mumbai sach mein mare toh 10 minute sab band.'],
      ['Dono ko hamesha write lene do aur network judne par data ko jod lo', 'Balance ko "jodna" mumkin nahi: ek hi ₹500 dono taraf kharch ho chuka ho sakta hai.'],
    ] },
    { t: 'Keemat', q: 'Bahumat wale niyam ki keemat kya hai?', a: [
      ['Jis taraf 2 vote nahi, wo write lena band kar dega, chahe wo zinda ho', 'Yeh jaan-boojhkar hai: sahi data ke liye thodi uplabdhta chhodi gayi. CAP theorem yahi kehta hai: network toote toh dono ek saath nahi milte.'],
      ['Teeno jagah poora database rakhna padega, yaani kharcha teen guna', 'Gawah sirf vote deta hai. Use poore data ki zaroorat nahi; ek chhoti machine kaafi hai.'],
      ['Failover ab hamesha haath se karna padega, apne aap nahi hoga', 'Bahumat ke saath failover apne aap aur surakshit hota hai. Yahi iska fayda hai.'],
    ] },
  ],
  fixes: [
    { n: 'Bahumat + gawah', how: '3 jagah; primary ko 2 vote chahiye.', cost: 'Kam vote wali taraf band.', when: 'Apne aap failover chahiye.' },
    { n: 'Haath se failover', how: 'Insaan jaanchkar faisla karta hai.', cost: 'Dheema; raat 3 baje kisi ko uthna padta hai.', when: 'Failover kam hota hai, team chhoti hai.' },
    { n: 'Purane primary ko pehle band karna', how: 'Naya primary banane se pehle purane ko zabardasti band karo (fencing).', cost: 'Band karne ka bharosemand raasta chahiye.', when: 'Bahumat ke saath, extra suraksha.' },
  ],
  twist: { q: 'Ab 3 mein se 2 jagah ek saath band ho gayi. Bachi hui ek jagah zinda hai, par akeli.', a: [
    ['Wo akeli jagah write na le; read chalu rakhe aur insaan ko bulaye', 'Use nahi pata ki baaki do sach mein band hain ya sirf network toota hai. Bina bahumat ke write lena wahi split-brain hai.'],
    ['Wo akeli jagah khud ko primary bana le, kyunki wahi zinda bachi hai', 'Agar baaki do zinda nikle aur unhone bhi primary chun liya ho toh phir do primary.'],
    ['Wo akeli jagah apna data mitaakar bilkul naye sire se shuru ho', 'Shaayad wahi aakhri sahi copy ho. Data mitaana sabse bura faisla hai.'],
  ] },
  asli: 'Do machine kabhi tay nahi kar sakti ki doosri mari hai ya sirf dikh nahi rahi. Isliye faisla <b>bahumat</b> se hota hai, aur ek failure ke baad bhi bahumat chahiye toh kam se kam teen voters rakho.',
  say: 'Do nodes network partition aur crash mein farak nahi kar sakte, isliye split-brain hua. Main quorum use karunga: teen jagah, leader ko bahumat chahiye. Alpmat wali taraf write band karegi; yeh CAP ka consistency wala chunav hai.',
},
{
  id: 'cron-triple', icon: '📨', title: '20 lakh users ko teen-teen SMS', topic: 'dist', hard: 1,
  levels: ['scheduling'],
  story: '"Bijli ka bill kal due hai" wala reminder har subah 9 baje jaata hai. <code>reminder-service</code> ke 3 servers hain aur har server par wahi cron chalta hai. Aaj 20 lakh users ko 3-3 SMS gaye. SMS ka bill ₹6 lakh ki jagah ₹18 lakh aaya.',
  facts: [
    'Teeno servers par wahi code aur wahi cron hai.',
    'Servers ko ek doosre ke baare mein pata nahi. Is SMS provider ki API idempotency keys support karti hai.',
    'Sirf ek server rakhna mana hai: wo gira toh reminder nahi jaayega.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Teen SMS kyun gaye?', a: [
      ['Teeno servers ne wahi job chalaya; "kaun chalaye" kisi ne tay nahi kiya', 'Server badhane se har cheez teen guna ho jaati hai: capacity bhi, aur tay-waqt wale job bhi.'],
      ['SMS provider ne galti se har SMS ko teen baar bhej diya', 'Provider ne wahi bheja jo use mila: 60 lakh request.'],
      ['Cron ka waqt galat likha tha, isliye wahi job teen baar chal gaya tha', 'Har server par cron ek hi baar chala. Server teen hain.'],
    ] },
    { t: 'Hal chuno', q: 'Teen servers rehte hue job ek hi baar kaise chalega?', a: [
      ['Job shuru karne se pehle ek saajha lock lo; jise mile, sirf wahi chalaye', 'Teeno 9 baje lock maangte hain; ek ko milta hai. Wo server mar jaaye toh agli baar doosre ko mil jaata hai.'],
      ['Do servers par cron band kar do aur sirf ek server par chalne do', 'Wo ek server gira toh reminder nahi jaayega. Haalaat mein yahi mana hai.'],
      ['Teeno servers alag waqt par chalayein: 9:00, 9:05 aur 9:10 baje', 'Job phir bhi teen baar chalega, bas 5-5 minute ke farak se.'],
    ] },
    { t: 'Keemat', q: 'Lock ke saath kaunsi nayi halat sochni padegi?', a: [
      ['Lock wala server beech mein mare toh aadha kaam: "kahan tak hua" likhna hoga', 'Doosra server shuru se chalega toh pehle 12 lakh ko dobara SMS jaayega. Isliye har user ka "bhej diya" record chahiye.'],
      ['Lock lene ki wajah se reminder ab har din poora 1 ghanta late jaayenge', 'Lock lena kuch millisecond ka kaam hai.'],
      ['Lock ke liye ab teen ki jagah nau servers chalane padenge', 'Lock ek saajha store (Redis ya database) mein hota hai. Server badhane ki zaroorat nahi.'],
    ] },
  ],
  fixes: [
    { n: 'Saajha lock', how: 'Jise lock mile, wahi job chalaye.', cost: 'Lock wala beech mein mare toh aadha kaam.', when: 'Chhota job.' },
    { n: 'Har SMS ka record', how: '<code>user + bill + tareekh</code> par unique pending record; provider-supported dedupe se bhejo.', cost: 'Ek table aur har SMS par ek insert.', when: 'Dobara bhejna mehenga ya bura ho.' },
    { n: 'Scheduler + queue', how: 'Ek scheduler kaam ko queue mein daalta hai; workers uthate hain.', cost: 'Queue chalani padti hai.', when: 'Bada job, kai workers.' },
  ],
  twist: { q: 'Lock wala server 12 lakh SMS ke baad crash ho gaya. Doosre server ne lock liya aur shuru se chalne laga.', a: [
    ['Har SMS ka durable pending record rakho; provider ko wahi idempotency key do', 'Pending SMS retry honge; provider-supported dedupe ek hi key ko dobara nahi bhejta. Provider dedupe na de toh duplicate ya loss ka khatra aur reconciliation chahiye.'],
    ['Crash ke baad doosra server us din kuch bhi na bheje', 'Bache hue 8 lakh users ko reminder nahi milega.'],
    ['Lock ka waqt 24 ghante kar do taaki doosra server use le hi na sake', 'Tab crash ke baad koi bhi baaki kaam nahi karega.'],
  ] },
  asli: 'Server ki ginti badhate hi poochho: "kaunsa kaam sirf <b>ek baar</b> hona chahiye?" Wo kaam apne aap ek baar nahi hoga; use tay karna padta hai.',
  say: 'Har server par cron chalne se job N baar chalta hai. Main ek saajha lock ya leader se job ek jagah chalaunga, aur user + bill + tareekh ka pending record rakhunga. Provider-supported idempotency se retry karunga; local unique record akela SMS dedupe nahi karta.',
},

]);
})();
