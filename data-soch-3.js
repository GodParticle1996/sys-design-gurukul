/* =====================================================================
   🧠 Soch Akhada — scenarios 3: Security (4) + Observability aur cost (4) + Poora design (5)
   Shape aur niyam: soch.js ka header aur EXTENDING.md §11. Kahani: ChaiPay.
   Har `a` list mein PEHLA jawab sahi hai (renderer shuffle karta hai).
   ===================================================================== */
(function () {
SD.registerScenarios([

/* ----------------------------------------------------------------- SEC */
{
  id: 'idor-statement', icon: '🕵️', title: 'URL mein ek number badla, kisi aur ka statement khul gaya', topic: 'sec', hard: 1,
  levels: ['auth'],
  story: 'ChaiPay ka statement URL hai <code>GET /statements?user_id=1042</code>. Ek student ne URL mein 1042 ko 1043 kiya, aur use kisi aur ka poora statement dikh gaya. Usne ek script se 2 lakh users ke statement download kar liye.',
  facts: [
    'Har request ke saath student ka apna, sahi login token tha.',
    '<code>wallet-api</code> sirf yeh jaanchta hai: "token sahi hai?"',
    'Kiska statement dikhana hai, yeh URL ke <code>user_id</code> se tay hota hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Student ko doosron ka data kaise mil gaya?', a: [
      ['Server ne "yeh kaun hai" jaancha, par "kya yeh data iska hai" nahi jaancha', 'Pehli jaanch ko authentication kehte hain, doosri ko authorization. Server ne doosri jaanch chhod di aur URL mein likhe id par bharosa kar liya.'],
      ['Login token kamzor tha aur student ne use todkar doosra token bana liya', 'Student ne apna hi sahi token use kiya. Use kuch todna nahi pada; bas URL ka number badalna pada.'],
      ['<code>user_id</code> seedha 1, 2, 3 jaisa number hai; yahi asli galti hai', 'Seedha number andaaza aasaan banata hai. Lekin asli galti yeh hai ki server ne kisi ka bhi id maan liya.'],
    ] },
    { t: 'Hal chuno', q: 'Sabse pakka hal kaunsa hai?', a: [
      ['<code>user_id</code> URL se mat lo; token ke andar wale user ka hi data do', 'Token ka signature aur relevant claims verify karke user identity lo. URL, body ya header mein client jo bheje, wo sirf ek daava hai.'],
      ['<code>user_id</code> ko number ki jagah ek lamba random UUID bana do', 'Andaaza mushkil hoga. Lekin id kahin se bhi leak ho (link, log, screenshot) toh wahi samasya. Suraksha "chhupa hua id" par nahi tik sakti.'],
      ['Statement API par rate limit laga do: har user 10 request per minute', '2 lakh statement dheere-dheere niklenge. Lekin ek bhi doosre ka statement dikhna galat hai.'],
    ] },
    { t: 'Keemat', q: 'Ab identity sirf token se aati hai. Support agent ko kisi user ka statement dekhna ho toh?', a: [
      ['Agent ke liye alag permission aur alag raasta, aur har dekhne ka record', '"Doosre ka data dekhna" ek alag adhikaar hai. Use saaf-saaf dena padta hai aur har istemaal likhna padta hai.'],
      ['Support agent user ka password maange aur user bankar login karke statement dekhe', 'Password kisi se bhi nahi maanga jaana chahiye. Aur record mein dikhega ki user ne khud dekha.'],
      ['Sirf support team ke liye purana <code>user_id</code> wala URL chalu rakho', 'Wahi chhed wapas khul jaayega. Hamlavar ko bas wo URL dhoondhna hai.'],
    ] },
  ],
  fixes: [
    { n: 'Identity token se', how: 'Server token se user nikaalta hai; client se nahi poochhta.', cost: 'Doosre ka data dekhne ke liye alag raasta chahiye.', when: '"Mera data" wali har API.' },
    { n: 'Malik ki jaanch', how: 'Data laane ke baad jaancho: resource ka malik = token wala user?', cost: 'Har endpoint par yaad rakhni padti hai.', when: 'Saajhi cheezein: order, file, group.' },
    { n: 'Random id', how: 'Seedhe number ki jagah UUID.', cost: 'Akela kaafi nahi; sirf ek extra parat.', when: 'Upar ke dono ke saath.' },
  ],
  twist: { q: 'Naya feature "family account": maa apne bete ka statement dekh sakti hai.', a: [
    ['Server har request par jaanche: kya is user ka us account se rishta darj hai?', 'Rishta database mein darj hota hai, aur server use har baar dekhta hai. App ka kehna kaafi nahi.'],
    ['App maa ke request mein bete ka <code>user_id</code> bheje, aur server maan le', 'Yeh wahi purana chhed hai. Koi bhi kisi ka bhi id bhej sakta hai.'],
    ['Maa aur bete ko ek hi login token de do taaki dono sab kuch dekh sakein', 'Ab pata nahi chalega ki kisne kya kiya, aur bete ko bhi maa ka sab kuch dikhega.'],
  ] },
  asli: 'Login ka matlab sirf "tum kaun ho". Har request par ek aur sawal poochho: "kya <b>yeh cheez</b> tumhari hai?" Client ka bheja id ek daava hai, saboot nahi.',
  say: 'Yeh broken access control hai, jise IDOR bhi kehte hain: authentication thi, authorization nahi. Main identity token se loonga, client ke bheje id se nahi, aur saajhe resources par har request mein malik ya rishte ki jaanch server par karunga.',
},
{
  id: 'leaked-token', icon: '📱', title: 'Password badal diya, chor phir bhi 3 hafte andar raha', topic: 'sec', hard: 2,
  levels: ['auth'],
  story: 'Aman ka phone chori ho gaya. Aman ne doosre phone se turant password badal diya. Phir bhi chor 3 hafte tak Aman ke account ka balance aur history dekhta raha.',
  facts: [
    'Login par <code>auth-service</code> ek token (JWT) deta hai jo 30 din chalta hai.',
    'Baaki services token ko khud jaanch leti hain; <code>auth-service</code> se poochhti nahi.',
    'Password badalne se pehle se bane token par koi asar nahi padta.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Password badalne ke baad bhi chor andar kyun raha?', a: [
      ['Token 30 din tak apne aap sahi maana jaata hai; use wapas lene ka raasta nahi', 'Services sirf token ka signature aur tareekh dekhti hain. Dono sahi hain. "Yeh token ab radd hai", yeh kisi ko pata hi nahi.'],
      ['Chor ne kisi tarah Aman ka naya password bhi pata kar liya tha', 'Chor ko password ki zaroorat hi nahi thi. Chori hue phone mein purana token pehle se tha.'],
      ['Token ka signature kamzor tha, isliye chor ne apna naya token bana liya', 'Chor ne koi token banaya nahi. Usne wahi asli token use kiya jo phone mein tha.'],
    ] },
    { t: 'Hal chuno', q: 'Token ko "wapas lene layak" kaise banaoge, bina har request ko dheema kiye?', a: [
      ['Access token 15 minute ka; naya lene ke liye refresh token, jo radd ho sake', 'Chhota token jaldi mar jaata hai. Naya token maangte waqt <code>auth-service</code> dekhta hai ki refresh token radd toh nahi. Password badla, toh refresh token radd.'],
      ['Token ki umr 30 din se badhakar 90 din kar do taaki login kam karna pade', 'Chori hua token ab 90 din chalega. Samasya teen guna badi.'],
      ['Har service har request par <code>auth-service</code> se poochhe: token sahi hai?', 'Token turant radd ho sakega. Lekin <code>auth-service</code> har request ke raaste mein aa jaayega: wo dheema ya band hua toh sab band.'],
    ] },
    { t: 'Keemat', q: '15 minute wale access token ki keemat kya hai?', a: [
      ['Chori ke baad bhi chor ke paas 15 minute tak ka mauka bacha rehta hai', 'Radd karna "turant" nahi, "15 minute ke andar" hai. Zyadatar apps ke liye yeh chalta hai; bank jaise kaam ke liye aur sakhti chahiye.'],
      ['User ko har 15 minute mein apna password dobara daalna padega', 'App refresh token se chupchaap naya access token le leti hai. User ko kuch pata nahi chalta.'],
      ['Services ab token ko khud nahi jaanch sakti; sab <code>auth-service</code> par tika hai', 'Access token ab bhi signature se khud jaancha jaata hai. <code>auth-service</code> sirf har 15 minute par chahiye.'],
    ] },
  ],
  fixes: [
    { n: 'Chhota access + refresh token', how: 'Access token 15 minute; refresh token radd ho sakta hai.', cost: 'Radd hone mein 15 minute tak ki der.', when: 'Zyadatar apps.' },
    { n: 'Radd tokens ki list', how: 'Radd kiye token ke id ek tez store mein; services jaanchti hain.', cost: 'Har request par ek chhota lookup.', when: 'Turant radd karna zaroori ho.' },
    { n: 'Server-side session', how: 'Token sirf ek random id; asli data server ke paas.', cost: 'Har request par session store padhna.', when: 'Chhota system, ya poora control chahiye.' },
  ],
  twist: { q: 'Bank ka niyam: password badalte hi purana token 5 second ke andar band hona chahiye.', a: [
    ['Radd kiye tokens ki chhoti list rakho jise har service har request par jaanche', 'List mein token id sirf access token ki bachi umr tak rehta hai, isliye list chhoti rehti hai. Lookup ek tez store se hota hai.'],
    ['Access token ki umr 15 minute se ghatakar seedha 5 second kar do', 'Har app har 5 second par naya token maangegi. <code>auth-service</code> par bojh sainkdon guna ho jaayega.'],
    ['Kisi ek ka password badle toh saare users ko usi pal ek saath logout kar do', 'Ek user ki ghatna ke liye crore logon ko dobara login karwana.'],
  ] },
  asli: 'Jo token khud apni sachchai saabit karta hai, use wapas lena mushkil hota hai. Token ki umr = "chori ke baad chor kitni der andar reh sakta hai".',
  say: 'Yahan services revocation nahi jaanchti, isliye JWT expiry tak chalta hai. Main chhota access token aur revocable refresh token rakhunga. Turant revocation chahiye toh ek deny-list jise services jaanchein; entry sirf token ki bachi umr tak rehti hai.',
},
{
  id: 'tenant-leak', icon: '🏢', title: 'Export mein doosre merchants ke orders aa gaye', topic: 'sec', hard: 3,
  levels: ['auth', 'st-jira-tenant'],
  story: 'ChaiPay ka Merchant Dashboard 40,000 merchants use karte hain. Sabka data ek hi <code>orders</code> table mein hai. Ek naye "export" feature mein developer <code>WHERE merchant_id = ?</code> lagana bhool gaya. Sharma Sweets ke export mein doosre merchants ke orders aa gaye.',
  facts: [
    'Har query mein developer ko <code>merchant_id</code> ka filter khud lagana padta hai.',
    'Code mein aisi 600 queries hain.',
    'Code review mein yeh bhool pakdi nahi gayi.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Asli kamzori kya hai?', a: [
      ['Suraksha har query likhne wale ki yaaddasht par tiki hai; ek bhool matlab leak', '600 queries mein se 599 sahi hona kaafi nahi. Jo suraksha "har baar yaad rakhne" par tiki ho, wo ek din toot-ti hi hai.'],
      ['Saare merchants ka data ek hi table mein rakhna hi sabse badi galti thi', 'Saajhi table ek aam aur sasta tareeka hai. Galti table mein nahi, filter ke lagne ke tareeke mein hai.'],
      ['Export feature ko release se pehle theek se test nahi kiya gaya tha', 'Test ne madad ki hoti. Lekin agli nayi query mein wahi bhool phir ho sakti hai.'],
    ] },
    { t: 'Hal chuno', q: 'Kaunsa hal "bhool" ko hi namumkin banata hai?', a: [
      ['Filter ek hi jagah lagao jo har query par apne aap chale', 'Jaise database ki row-level security, ya ek data-access parat jo har query mein merchant ka filter khud jodti hai. App role RLS bypass na kare; tenant identity trusted ho. Data-access layer se seedhi query ka bypass bhi roko.'],
      ['Team ko kaho ki aage se har query mein filter dhyaan se lagayein', 'Yahi toh abhi ka niyam hai, aur yahi toota hai.'],
      ['Har merchant ko turant apna alag database de do, saare 40,000 ko', '40,000 database chalana, badalna aur backup lena bahut bhaari hai. Yeh sirf kuch bade customers ke liye theek hai.'],
    ] },
    { t: 'Keemat', q: 'Filter ab apne aap lagta hai. Kaunsa kaam ab alag se sochna padega?', a: [
      ['Admin report ko sabka data chahiye; cross-tenant access ka alag authorized raasta', 'Admin report ke raaste ka access kam logon ko, alag permission ke saath, aur har istemaal ka record.'],
      ['Har query ab pehle se lagbhag 10 guna dheemi chalegi, filter ki wajah se', 'Wahi filter pehle bhi lagta tha, bas haath se. Index ho toh raftaar wahi rehti hai.'],
      ['Code review ki ab koi zaroorat nahi rahegi kyunki bhool namumkin hai', 'Sirf yeh ek bhool namumkin hui hai. Baaki galtiyon ke liye review ab bhi chahiye.'],
    ] },
  ],
  fixes: [
    { n: 'Ek jagah ka filter', how: 'Row-level security ya data-access parat.', cost: 'Sabka data chahne wale kaam ke liye alag raasta.', when: 'Saajhi table, bahut customers.' },
    { n: 'Customer ka alag database', how: 'Har customer ka apna schema ya database.', cost: 'Chalane ka kharcha customer ke saath badhta hai.', when: 'Kuch bade ya niyam-bandhe customers.' },
    { n: 'Do-customer wala test', how: 'Har endpoint ko do merchants ke data ke saath apne aap jaancho.', cost: 'Tests sambhalne padte hain.', when: 'Hamesha, peeche ki suraksha.' },
  ],
  twist: { q: 'Ek bada bank-merchant kehta hai: hamara data kisi aur ke saath ek table mein nahi reh sakta.', a: [
    ['Us merchant ko alag database do; baaki sab saajhi table par rahein', 'Zyadatar customers saste saajhe tareeke par, aur kuch khaas customers alag. Yeh mila-jula tareeka aam hai.'],
    ['Ek ke liye nahi; saare 40,000 merchants ko alag database de do', 'Ek customer ki maang ke liye sabka kharcha aur kaam hazaaron guna.'],
    ['Bank ko samjhao ki filter kaafi hai, aur kuch bhi mat badlo', 'Bank ka niyam aksar kanoon se aata hai. Samjhane se nahi badalta.'],
  ] },
  asli: 'Jo suraksha "har developer har baar yaad rakhe" par tiki hai, wo suraksha nahi, ummeed hai. Niyam ko <b>ek jagah</b> lagao jahan se bachna mumkin na ho.',
  say: 'Multi-tenant saajhi table mein tenant filter har query par zaroori hai. Main tenant filter ek jagah lagaunga: row-level security ya data-access layer. Cross-tenant kaam ke liye alag, logged raasta, aur har endpoint ka do-tenant test. Bade niyam-bandhe customer ko alag database.',
},
{
  id: 'noisy-tenant', icon: '📢', title: 'Ek merchant ka report, 40,000 merchants ka dashboard dheema', topic: 'sec', hard: 2,
  levels: ['bulkhead', 'blast', 'ratelimit'],
  story: 'Har mahine ki 1 tareekh ko merchant DreamTeam11 50 lakh rows ka report nikaalta hai. Us ek ghante mein baaki 40,000 merchants ka dashboard 10 second leta hai. Sab ek hi <code>dashboard-api</code> aur ek hi database use karte hain.',
  facts: [
    'DreamTeam11 ke report ki queries database ka 80% CPU le leti hain.',
    'Kisi bhi merchant par koi hadd nahi hai.',
    'Baaki merchants ki queries chhoti aur halki hain.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Ek merchant sabko kaise dheema kar raha hai?', a: [
      ['Saajhe system mein kisi ke hisse par hadd nahi; ek merchant sabka hissa kha gaya', 'Is samasya ko noisy neighbour kehte hain: ek hi imaarat, ek hi paani ki tanki, aur ek ghar ne saara paani le liya.'],
      ['Database bahut chhota hai; 40,000 merchants ke liye kabhi kaafi tha hi nahi', 'Mahine ke baaki 29 din wahi database aaram se chalta hai.'],
      ['DreamTeam11 ne jaan-boojhkar baaki merchants par hamla kiya hai', 'DreamTeam11 bas apna sahi kaam kar raha hai. System ne use rokne ka koi niyam hi nahi banaya.'],
    ] },
    { t: 'Hal chuno', q: 'Baaki merchants ko kaise bachaoge?', a: [
      ['Har merchant ke liye hadd: ek saath kitni queries aur kitna bhaari kaam', 'Har customer ko uska hissa milta hai. Ek customer apni hadd bhar sakta hai, doosron ka hissa nahi le sakta.'],
      ['Database ko paanch guna badi machine par le jao taaki sabke liye jagah ho', 'Bada customer us machine ko bhi bhar dega, aur kharcha sabko dena padega.'],
      ['DreamTeam11 ka account har mahine ki 1 tareekh ko band kar do', 'Sabse bada customer apna kaam nahi kar paayega.'],
    ] },
    { t: 'Keemat', q: 'Har merchant par hadd lag gayi. Keemat kaun chukayega?', a: [
      ['DreamTeam11 ka report ab dheema chalega ya apni line mein lagega', 'Yeh sahi jagah ki keemat hai: bhaari kaam karne wala rukta hai, baaki 40,000 nahi.'],
      ['Chhote merchants ka dashboard limits ke baad pehle se dheema ho jaayega', 'Chhote merchants apni hadd ke bahut neeche rehte hain. Unka dashboard tez ho jaata hai.'],
      ['ChaiPay: ab har merchant ke liye ek alag server chalana padega', 'Hadd ek ginti hai jo saajhe system ke andar lagti hai. Alag server nahi chahiye.'],
    ] },
  ],
  fixes: [
    { n: 'Har customer ki hadd', how: 'Ek saath queries aur request ki ginti par hadd, customer ke hisaab se.', cost: 'Bhaari customer ko rukna padta hai.', when: 'Har saajha system.' },
    { n: 'Bhaari kaam ka alag raasta', how: 'Report queue se, aur read replica par.', cost: 'Report turant nahi milta.', when: 'Report, export, bulk kaam.' },
    { n: 'Bade customer ka alag hissa', how: 'Bade merchant ke liye alag capacity wala replica ya cell.', cost: 'Extra kharcha.', when: 'Kuch bahut bade customers.' },
  ],
  twist: { q: 'DreamTeam11 kehta hai: hum sabse zyada paisa dete hain, hamara report tez chahiye.', a: [
    ['DreamTeam11 ko apni alag DB capacity (replica ya cell) do, aur kharcha DreamTeam11 se lo', 'Tez report mil jaata hai, aur baaki customers ab bhi surakshit hain.'],
    ['DreamTeam11 par query ki hadd hata do; baaki merchants ko usi shared DB par limits ke saath rakho', 'Wahi 1 tareekh wali ghatna wapas.'],
    ['Saare merchants ki query hadd barabar ghata do; DreamTeam11 ki report usi shared database par chale', 'Baaki 40,000 ko saza milegi, aur DreamTeam11 ko phir bhi hadd lagegi.'],
  ] },
  asli: 'Saajhe system mein "sab achhe se chalenge" koi design nahi hai. Har customer ke hisse par <b>hadd</b> lagao, warna sabse bada customer sabki raftaar tay karega.',
  say: 'Yeh noisy neighbour hai. Main per-tenant limits lagaunga: concurrency aur request quota. Bhaari reports queue aur read replica par jaayengi. Bahut bade tenant ko dedicated capacity, taaki uska bojh baaki tenants tak na pahunche.',
},

/* ----------------------------------------------------------------- OBS */
{
  id: 'alert-fatigue', icon: '🔕', title: '214 alert aaye, asli wala kisi ne nahi dekha', topic: 'obs', hard: 1,
  levels: ['observability', 'slo'],
  story: 'On-call engineer Riya ko kal raat 214 alert aaye: "CPU 80%", "disk 70%", "pod restart". Riya ne phone silent kar diya. Raat 3 baje payments 40 minute fail hue. Us ghatna ka alert bhi unhi 214 mein tha; kisi ne nahi dekha.',
  facts: [
    '214 mein se 211 alert par kuch karne ki zaroorat nahi thi.',
    'Alert machine ki halat par bane hain (CPU, disk), user ke anubhav par nahi.',
    '"Payment fail ho rahe hain" ka koi seedha alert nahi hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Asli ghatna ka alert kyun chhoot gaya?', a: [
      ['Zyadatar alert par kuch karna nahi hota, isliye asli alert shor mein kho gaya', 'Jab 100 mein se 99 alert bekaar hon toh insaan sabko andekha karna seekh jaata hai. Ise alert fatigue kehte hain.'],
      ['Riya laaparwah thi; use raat bhar har ek alert kholkar dekhna chahiye tha', 'Koi bhi insaan raat mein 214 alert dhyaan se nahi dekh sakta. Galti system ke design ki hai.'],
      ['Alert kam the; aur zyada metrics par alert hote toh ghatna pakdi jaati', 'Aur alert matlab aur shor. Asli alert aur gehra dab jaata.'],
    ] },
    { t: 'Hal chuno', q: 'Raat ko phone kis baat par bajna chahiye?', a: [
      ['User ke dard par: jaise "payment fail 2% se upar, 5 minute se"', 'CPU 80% hona user ko dard nahi deta; payment fail hona deta hai. Phone tabhi baje jab user ko dard ho aur insaan ko abhi kuch karna ho.'],
      ['Wahi alert rakho, bas har hadd thodi badha do: CPU 80% ki jagah 90%', 'Shor thoda kam hoga, lekin alert ab bhi machine par hain, user par nahi.'],
      ['Saare alert ek channel mein bhejo aur ek aur engineer ko on-call rakho', 'Ab do log 214 alert ko andekha karenge.'],
    ] },
    { t: 'Keemat', q: 'Phone ab sirf user ke dard par bajta hai. CPU aur disk wale alert ka kya?', a: [
      ['CPU/disk alerts phone nahi bajayenge; din mein dashboard ya ticket dekho', 'CPU aur disk metrics kaaran dhoondhne mein kaam aate hain. Lekin "disk dheere-dheere bhar rahi hai" jaisi cheez ke liye ticket zaroor banna chahiye.'],
      ['Wo hamesha ke liye hata diye jaayenge aur un metrics ko koi nahi dekhega', 'Metrics rehte hain aur dashboard par dikhte hain. Sirf raat ko phone bajna band hota hai.'],
      ['Ab on-call ki zaroorat hi nahi rahegi, kyunki alert bahut kam ho gaye', 'On-call isiliye hai ki jab phone baje toh koi uthe. Ab phone bajna sach mein zaroori hoga.'],
    ] },
  ],
  fixes: [
    { n: 'Phone (page)', how: 'User ko dard + abhi kuch karna zaroori.', cost: 'Kisi ki neend.', when: 'Payment fail, site band.' },
    { n: 'Ticket', how: 'Zaroori hai, par kaam ke ghanton mein ho sakta hai.', cost: 'Kisi ko din mein dekhna padta hai.', when: 'Disk 4 din mein bharegi.' },
    { n: 'Sirf dashboard', how: 'Jaankari; koi kaam nahi.', cost: 'Koi apne aap nahi dekhta.', when: 'CPU, memory, aam metrics.' },
  ],
  twist: { q: 'Disk 4 din mein bhar jaayegi. User ko abhi koi dard nahi hai. Kya raat ko phone bajna chahiye?', a: [
    ['Nahi; ek ticket bane jise koi kaam ke ghanton mein theek kare', 'Kaam zaroori hai, par abhi nahi. Raat ki neend sirf "abhi" wale kaam ke liye todi jaati hai.'],
    ['Haan; raat ko hi phone baje taaki is baat ko koi bhoole nahi', 'Raat 3 baje uthkar koi wahi karega jo subah 10 baje ho sakta tha. Aur agla alert andekha hoga.'],
    ['Nahi; jab tak disk sach mein bhar na jaaye tab tak kuch mat karo', 'Disk bharne par database ruk jaayega. Tab user ko dard hoga, aur wo roka ja sakta tha.'],
  ] },
  asli: 'Har alert ke liye do sawal: "kya user ko abhi dard hai?" aur "kya insaan ko abhi kuch karna hai?" Dono "haan", tabhi phone baje.',
  say: 'Yeh alert fatigue hai: cause-based alerts ka shor. Main page sirf symptom-based alerts par rakhunga, jaise error rate ya SLO burn. Jo zaroori hai par urgent nahi, us alert ka ticket banega; baaki sirf dashboard.',
},
{
  id: 'slow-hop', icon: '🔍', title: 'Payment 2.4 second ka, aur har team kehti hai "hum tez hain"', topic: 'obs', hard: 2,
  levels: ['observability'],
  story: 'Payment ke sabse dheeme 1% request (p99) 2.4 second lene lage. Ek payment 6 services se guzarta hai. Har team kehti hai "hamari service tez hai". 2 din se koi nahi bata pa raha ki waqt kahan ja raha hai.',
  facts: [
    'Har service apne log alag likhti hai.',
    'Ek payment ke logs ko 6 services mein jodne wala koi id nahi hai.',
    'Har service ka apna average waqt theek dikhta hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: '2 din se jawab kyun nahi mil raha?', a: [
      ['Ek request ka safar 6 services mein joda nahi ja sakta; sab apna tukda dekhte hain', 'Har team ke paas apni service ke andar ka sach hai. Do services ke beech ka waqt, aur ek hi request ki poori kahani, kisi ke paas nahi.'],
      ['Logs kam hain; har service ko har request par aur zyada log likhne chahiye', 'Logs pehle se hazaaron hain. Kami ginti ki nahi, jodne wale dhaage ki hai.'],
      ['Chhe mein se koi ek team apni service ke baare mein jhooth bol rahi hai', 'Sab sach bol rahe ho sakte hain: har service ka average theek hai. Dheemapan beech mein ya sirf kuch request mein ho sakta hai.'],
    ] },
    { t: 'Hal chuno', q: 'Kaunsa auzaar seedha dikhayega ki waqt kahan gaya?', a: [
      ['Har request ko ek id jo saari services tak jaaye; har hissa apna waqt darj kare', 'Ise distributed tracing kehte hain. Ek request ka poora safar ek tasveer mein dikhta hai: kis service ne kitna waqt liya, aur beech mein kitna gaya.'],
      ['Har service ka log level badhakar DEBUG kar do aur 2 din aur dekho', 'Logs kai guna ho jaayenge. Bina jodne wale id ke wo bhi alag-alag tukde hi rahenge.'],
      ['Baari-baari har service ke servers dugne karo aur dekho p99 ghata ya nahi', 'Mehenga tukka. Aur waqt agar do services ke beech ja raha hai toh kuch nahi badlega.'],
    ] },
    { t: 'Keemat', q: 'Tracing ki keemat kya hai?', a: [
      ['Har request ka poora trace rakhna mehenga hai; kuch pratishat hi rakhne padte hain', 'Aksar 1% aam request rakhe jaate hain, aur dheeme ya fail request saare. Is chunav ko sampling kehte hain.'],
      ['Tracing lagane ke baad har payment lagbhag 1 second dheema ho jaata hai', 'Ek id aage bhejna aur waqt darj karna microsecond ka kaam hai.'],
      ['Trace id ke saath user ka balance aur naam bhi saari services mein phail jaata hai', 'Trace id ek random number hai. Usme user ka data nahi hota.'],
    ] },
  ],
  fixes: [
    { n: 'Distributed tracing', how: 'Ek id + har hisse ka waqt.', cost: 'Storage; sampling tay karni padti hai.', when: 'Request kai services se guzre.' },
    { n: 'Logs mein saajha id', how: 'Har log line mein wahi request id.', cost: 'Waqt ka bantwaara seedha nahi dikhta.', when: 'Pehla, sasta kadam.' },
    { n: 'Har call ke metrics', how: 'Har service apni har bahari call ka waqt naape.', cost: 'Ek request ki kahani nahi milti.', when: 'Dashboard aur alert ke liye.' },
  ],
  twist: { q: 'Trace dikhata hai: 2.4 second mein se 2.1 second "khaali" hai, do services ke beech.', a: [
    ['Gap = waqt jo kisi span ne record nahi kiya; aksar pool ya queue mein intezaar', 'Gap mein koi service kaam karti nahi dikhi. Sabse aam wajah: request kisi line (pool, queue, retry) mein khadi thi. Missing span ya clock skew bhi gap bana sakte hain, isliye pool aur retry metrics se pakka karo.'],
    ['Trace ka auzaar hi galat dikha raha hai; tracing hatao aur logs par laut jao', 'Khaali jagah galti nahi, sabse kaam ki jaankari hai.'],
    ['Network hi dheema hai; turant data centre badalne ki tayyari shuru karo', 'Ek hi data centre mein network millisecond leta hai, second nahi.'],
  ] },
  asli: 'Kai services wale system mein samasya aksar <b>beech mein</b> hoti hai: line, pool, retry. Har service ka apna dashboard wo jagah kabhi nahi dikhata.',
  say: 'Per-service dashboards ek request ki poori kahani nahi dikhate. Main distributed tracing lagaunga: trace id saari services tak, har span ka waqt. Sampling se kharcha kaabu mein. Trace ka khaali gap queueing, missing span, clock skew ya network delay ho sakta hai; pool aur retry metrics se wajah jaanchunga.',
},
{
  id: 'bill-doubled', icon: '🧾', title: 'Users 10% badhe, cloud bill dugna', topic: 'obs', hard: 2,
  levels: ['unitcost'],
  story: 'ChaiPay ka cloud bill ek mahine mein ₹18 lakh se ₹36 lakh ho gaya. Users sirf 10% badhe. CTO poochhta hai: "paisa kahan gaya?" Bill bas itna batata hai: compute ₹20 lakh, database ₹9 lakh, network ₹7 lakh.',
  facts: [
    'Kisi resource par label nahi hai ki wo kis team ya feature ka hai.',
    'Pichhle mahine 3 naye feature live hue.',
    'Kisi ko nahi pata ki ek payment process karne ka kharcha kitna hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'CTO ke sawal ka jawab kyun nahi mil raha?', a: [
      ['Kharcha kisi feature ya team se joda hi nahi gaya; "kisne badhaya" pata nahi', 'Bill "kya" batata hai (compute, network), "kisne" aur "kyun" nahi. Bina label ke har rupaya be-naam hai.'],
      ['Cloud company ne chupchaap apne saare daam dugne kar diye hain', 'Daam badalne ki koi khabar nahi hai. Aur pichhle mahine 3 naye feature live hue hain.'],
      ['Users 10% badhe hain, toh bill ka dugna ho jaana ek swabhavik baat hi hai', '10% zyada users ka matlab lagbhag 10% zyada kharcha. 100% ka koi aur kaaran hai.'],
    ] },
    { t: 'Hal chuno', q: 'Sabse pehle kya karoge?', a: [
      ['Har resource par team aur feature ka label; phir "ek payment ka kharcha" nikalo', 'Label batata hai ki paisa kahan gaya. "Ek payment ka kharcha" batata hai ki kharcha users ke saath badh raha hai ya unse tez.'],
      ['Saari teams ka budget ek saath 50% kaat do aur dekho kaun shikaayat karta hai', 'Zaroori cheezein bhi katengi, aur asli kaaran phir bhi pata nahi chalega.'],
      ['Sabse mehenge database ko turant ek chhoti machine par le jao', 'Bina jaane ki database ka kharcha kyun badha, yeh kadam payments ko dheema kar sakta hai.'],
    ] },
    { t: 'Keemat', q: 'Label lagane ki keemat kya hai?', a: [
      ['Label ko sahi rakhna lagataar ka kaam hai, aur saajha kharcha baantna padta hai', 'Naya resource bina label ke bane toh use roko. Saajhe database jaisa kharcha teams mein kisi niyam se baantna padta hai.'],
      ['Label lagane se cloud bill khud hi aur zyada badh jaata hai', 'Label ka koi kharcha nahi hota.'],
      ['Label lagte hi kharcha apne aap kam ho jaata hai, bina kisi ke kuch kiye', 'Label sirf dikhata hai. Kharcha tab ghat-ta hai jab koi dekhkar kuch badle.'],
    ] },
  ],
  fixes: [
    { n: 'Label + ek request ka kharcha', how: 'Har resource ka malik; kharcha ÷ payments.', cost: 'Label ka anushasan.', when: 'Hamesha. Pehla kadam.' },
    { n: 'Budget alert', how: 'Team ka kharcha tay hadd se upar jaaye toh alert.', cost: 'Hadd sahi rakhni padti hai.', when: 'Label ke baad.' },
    { n: 'Niyam se size ki jaanch', how: 'Har mahine: kaunsi machine zaroorat se badi hai?', cost: 'Insaan ka waqt.', when: 'Bill bada ho.' },
  ],
  twist: { q: 'Label ke baad pata chala: naya "analytics export" feature har ghante poora database doosre region mein copy karta hai. Network ka ₹6 lakh wahi hai.', a: [
    ['Sirf badle hue rows bhejo, aur utni hi baar jitni sach mein zaroorat hai', 'Poori copy ki jagah sirf farak bhejne se data aksar 100 guna kam ho jaata hai.'],
    ['Feature ko bina kisi ko bataye chupchaap band kar do', 'Analytics team ka kaam ruk jaayega. Kharcha ghatana hai, feature maarna nahi.'],
    ['Network ka bill ghatane ke liye users par request ki hadd laga do', 'Kharcha users se nahi, andar ki copy se aa raha hai.'],
  ] },
  asli: 'Bill ka kul jod kuch nahi sikhata. Poochho: "<b>ek payment</b> ka kharcha kitna hai, aur wo badh raha hai ya ghat raha hai?"',
  say: 'Bina tagging ke cost attribution nahi hota. Main har resource par team aur feature ka tag lagaunga aur unit cost nikalunga: cost per payment. Agar unit cost badh rahi hai toh koi naya feature ya inefficiency hai; phir budget alerts aur right-sizing.',
},
{
  id: 'error-budget', icon: '⏳', title: 'Budget ke 3 minute bache hain, aur kal bada launch', topic: 'obs', hard: 2,
  levels: ['slo', 'rollout'],
  story: 'Payment API ka time-based SLO hai: 30 din ke 99.9% waqt payment available ho. Mahine ke 10ve din tak 2 kharab deploy 40 minute ka nuksaan kar chuke hain. Product team kal ek bada feature launch karna chahti hai. Engineering kehti hai "khatra hai". Dono bahas kar rahe hain.',
  facts: [
    '99.9% ka matlab: 30 din mein lagbhag 43 minute fail hone ki chhoot (error budget).',
    '40 minute kharch ho chuke. 3 minute bache hain, agle 20 din ke liye.',
    'Dono kharab deploy seedhe 100% users par gaye the.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Is bahas ka faisla kis cheez se hona chahiye?', a: [
      ['Error budget se: 43 mein se 40 minute kharch ho chuke hain, sirf 3 bache hain', 'Error budget isi liye hai: "kitna khatra le sakte hain" ko raay se number mein badalna. Budget bacha hai toh tez chalo; khatam hai toh dheeme.'],
      ['Jo team zyada senior hai ya zyada zor se bolti hai, uski baat se', 'Tab har mahine wahi bahas hogi, aur har baar nateeja awaaz se tay hoga.'],
      ['Sirf is baat se ki product team ko yeh feature kitna zaroori lagta hai', 'Har feature apni team ko zaroori lagta hai. Users ko chalti hui payment bhi zaroori lagti hai.'],
    ] },
    { t: 'Hal chuno', q: 'Budget lagbhag khatam hai. Aam niyam kya hona chahiye?', a: [
      ['Naya launch roko; bacha waqt deploy ko surakshit banane mein lagao', 'Budget khatam hone ka matlab hai ki users is mahine kaafi dard seh chuke. Ab kaam sthirta par: canary, turant wapsi, tests.'],
      ['Launch karo, aur SLO ko 99.9% se ghatakar 99% kar do taaki budget bane', 'Number badalne se users ka dard nahi badalta. SLO tab badlo jab users ko sach mein kam ki zaroorat ho.'],
      ['Launch karo aur ummeed rakho ki is baar kuch nahi tootega', 'Is mahine do deploy toot chuke hain. Ummeed koi yojana nahi hai.'],
    ] },
    { t: 'Keemat', q: 'Is niyam ko chalane ki shart kya hai?', a: [
      ['Product aur engineering, dono ko yeh niyam pehle se, shaanti mein maanna hoga', 'Ghatna ke beech mein banaya gaya niyam koi nahi maanta. Niyam pehle se likha ho: "budget khatam, toh khatre wale launch band".'],
      ['Ek baar likha SLO phir kabhi badla nahi ja sakta', 'SLO ko waqt-waqt par dobara dekha jaata hai, users ki zaroorat ke hisaab se.'],
      ['Engineering ko mahine ke ant tak har tarah ka deploy band karna padega', 'Sirf khatre wale launch rukte hain. Sthirta badhane wale aur chhote fix chalte rehte hain.'],
    ] },
  ],
  fixes: [
    { n: 'Error budget ka niyam', how: 'Budget khatam, toh khatre wale launch band.', cost: 'Feature der se aate hain.', when: 'Har SLO ke saath.' },
    { n: 'Dheere-dheere rollout', how: '1% → 10% → 100%, har kadam par jaanch.', cost: 'Launch mein zyada waqt.', when: 'Har deploy.' },
    { n: 'SLO dobara dekhna', how: 'Kya users ko sach mein 99.9% chahiye?', cost: 'Galat number chunne ka khatra.', when: 'Budget baar-baar khatam ho.' },
  ],
  twist: { q: 'Feature ek kanooni deadline ke liye hai. Kal launch hona hi hai.', a: [
    ['Pehle 1% users par chalao, jaancho, dheere badhao; turant wapsi ka button rakho', 'Khatra lena hi hai toh use chhota karo. Canary ka asar traffic aur SLI ki definition se naapo; time-based budget mein 1% users ka matlab 1/100 minutes nahi.'],
    ['Saare users par ek saath launch karo taaki kaam ek hi baar mein jaldi nipat jaaye', 'Yahi tareeka is mahine do baar toot chuka hai.'],
    ['Deadline ko andekha karo, kyunki budget ka niyam sabse upar hai', 'Kanoon todna bhi ek nuksaan hai. Niyam khatra kam karne ke liye hai, aankh band karne ke liye nahi.'],
  ] },
  asli: 'SLO ka asli kaam bahas khatam karna hai. "Kitna tootna theek hai" ko pehle se ek number bana do; phir faisla number karta hai, awaaz nahi.',
  say: 'Main error budget se faisla karunga: 99.9% par mahine ke 43 minute, jisme se 40 kharch ho chuke. Policy ke hisaab se risky launch rukega aur kaam reliability par hoga. Agar launch zaroori hai toh canary se 1% par shuru, tez rollback ke saath.',
},

/* -------------------------------------------------------------- DESIGN */
{
  id: 'design-feed', icon: '📰', title: 'Design: doston ki activity feed', topic: 'design', hard: 3,
  levels: ['fanout', 'realtime'],
  story: 'Interviewer: "ChaiPay mein ek Activity Feed banao. User ko apne doston ke public payments dikhein, jaise \'Riya ne Aman ko pay kiya\'." 5 crore users hain. Aam user ke 200 dost hain. Kuch celebrity ke 50 lakh followers hain.',
  facts: [
    'Feed kholna bahut zyada hota hai (read); post karna kam (write).',
    'Feed 200 ms mein khulni chahiye.',
    'Ek celebrity din mein lagbhag 20 post karta hai.',
  ],
  steps: [
    { t: 'Asli mushkil', q: 'Is design ki sabse badi mushkil kya hai?', a: [
      ['Ek post ko bahut saare logon ki feed tak pahunchana, aur feed ko tez kholna', 'Post ek jagah likha jaata hai, par use hazaaron ya lakhon feed mein dikhna hai. "Kab jodein: likhte waqt ya padhte waqt?" yahi poora sawal hai.'],
      ['5 crore users ke naam aur profile photo ko store karne ki jagah dhoondhna', '5 crore rows ek aam database ke liye mushkil nahi hain.'],
      ['Har post ko database mein surakshit save karne ka tareeka nikaalna', 'Ek post save karna saada kaam hai. Mushkil use baantna hai.'],
    ] },
    { t: 'Mukhya faisla', q: 'Aam user (200 dost) ke post ke liye kaunsa tareeka?', a: [
      ['Post hote hi use har dost ki pehle se bani feed mein daal do', 'Ise fan-out on write kehte hain. Feed kholna ek saada, tez read ban jaata hai: bani-banayi list uthao. Likhte waqt 200 chhote write hote hain.'],
      ['Feed kholte waqt 200 doston ke taaza posts dhoondho aur jodkar dikhao', 'Ise fan-out on read kehte hain. Har feed kholne par 200 jagah se data lana 200 ms mein mushkil hai, aur feed bahut baar khulti hai.'],
      ['Saare users ke posts ek hi badi list mein rakho aur wahin se chhaano', '5 crore users ki ek list mein se "mere doston ke post" chhaanna har baar bhaari kaam hai.'],
    ] },
    { t: 'Keemat', q: 'Ab ek celebrity (50 lakh followers) post karta hai. Fan-out on write mein kya hoga?', a: [
      ['Ek post ke liye 50 lakh feed mein likhna padega: der lagegi aur bhaari bojh', '20 post × 50 lakh = din ke 10 crore write, sirf ek celebrity se. Aur zyadatar followers shaayad feed kholein bhi nahi.'],
      ['Celebrity ki apni feed dheemi khulegi kyunki uske dost bahut zyada hain', 'Samasya celebrity ke padhne mein nahi, uske likhne mein hai.'],
      ['Kuch nahi hoga; ek post likhna har haal mein sasta hi rehta hai', 'Ek post sasta hai. Use 50 lakh jagah copy karna sasta nahi.'],
    ] },
  ],
  fixes: [
    { n: 'Likhte waqt baantna', how: 'Post hote hi har follower ki feed mein copy.', cost: 'Bahut followers par bhaari write.', when: 'Aam user, kam followers.' },
    { n: 'Padhte waqt jodna', how: 'Feed kholte waqt doston ke posts lao aur jodo.', cost: 'Har read bhaari.', when: 'Bahut followers wale kuch log.' },
    { n: 'Mila-jula', how: 'Aam user: likhte waqt. Celebrity: padhte waqt.', cost: 'Do raaste sambhalne padte hain.', when: 'Dono tarah ke users hon.' },
  ],
  twist: { q: 'Toh celebrity ke posts ke saath kya karoge?', a: [
    ['Celebrity ke posts feed kholte waqt jodo; baaki sab pehle se bani feed se lo', 'Bani-banayi feed + kuch celebrity ke taaza posts. Do tez read, aur 50 lakh write bach gaye.'],
    ['Celebrity ko din mein sirf ek hi post karne ki ijaazat do, usse zyada nahi', 'Sabse zyada dekhe jaane wale users ko rokna product ko nuksaan deta hai.'],
    ['Saare users ke liye feed kholte waqt jodna shuru kar do', 'Aam user ki feed, jo sabse zyada khulti hai, phir se dheemi ho jaayegi.'],
  ] },
  asli: 'Feed ka poora design ek sawal hai: "mehnat <b>likhte waqt</b> karein ya <b>padhte waqt</b>?" Jawab user ke followers ki ginti se badalta hai.',
  say: 'Read zyada hain, isliye aam users ke liye fan-out on write: post hote hi followers ki precomputed feed mein. Celebrity ke liye fan-out on read, taaki ek post 50 lakh write na bane. Feed kholte waqt dono ko merge karunga: hybrid approach.',
},
{
  id: 'design-rate-limiter', icon: '🚧', title: 'Design: 12 servers par ek rate limiter', topic: 'design', hard: 2,
  levels: ['ratelimit'],
  story: 'Interviewer: "ChaiPay ke liye rate limiter banao: har user 100 request per minute." <code>api-gateway</code> ke 12 servers hain aur 50,000 request har second aate hain.',
  facts: [
    'Limiter har request par chalta hai, isliye use 1–2 ms se zyada nahi lena chahiye.',
    'Ginti saare 12 servers ke beech saajhi honi chahiye.',
    'Limiter khud band ho jaaye toh bhi payments chalne chahiye.',
  ],
  steps: [
    { t: 'Asli mushkil', q: 'Is design ki sabse badi mushkil kya hai?', a: [
      ['Har request par saajhi ginti padhna aur badalna, wo bhi 1–2 ms mein', 'Ginti saajhi honi chahiye (sahi hone ke liye) aur bahut tez honi chahiye (har request par chalti hai). Dono ek saath paana hi sawal hai.'],
      ['Limit ka sahi number chunna: 100 theek hai ya 150 hona chahiye', 'Number ek setting hai jo baad mein badal sakti hai. Design us par nahi tika.'],
      ['Mana kiye gaye user ko ek sundar aur saaf message dikhana', 'Message zaroori hai, par wo design ki mushkil nahi hai.'],
    ] },
    { t: 'Mukhya faisla', q: 'Ginti kahan aur kaise rakhoge?', a: [
      ['Redis mein har user ka counter; ek hi atomic kadam mein badhao aur jaancho', 'Redis memory mein hai, isliye tez hai. Saare servers wahi counter dekhte hain. "Badhao aur jaancho" ek hi kadam hai, isliye do request ke beech koi nahi ghus sakta.'],
      ['Har gateway server apni memory mein har user ki alag ginti rakhe', 'Sabse tez, lekin har server sirf apna hissa dekhta hai. User 12 × 100 = 1,200 request kar paayega.'],
      ['Har request par database ki ek table mein ek nayi row likho aur gino', '50,000 write har second, sirf ginne ke liye. Bina aggregation har request ka INSERT + COUNT mehenga hai; capacity workload par benchmark karo.'],
    ] },
    { t: 'Keemat', q: '"Har minute 100" tay khidki se gin rahe ho. User 12:00:59 par 100 aur 12:01:00 par 100 request bhejta hai. Kya hua?', a: [
      ['2 second mein 200 request nikal gaye: khidki ki seema par dugna', 'Tay khidki (fixed window) seema par dhokha khaati hai. Hal: khisakti khidki (sliding window) ya token bucket.'],
      ['Kuch nahi hua; limiter ne bilkul sahi kaam kiya aur 100 par roka', 'Har khidki mein 100 hi the, par user ne 2 second mein 200 kar liye. Maksad yeh nahi tha.'],
      ['User agle ek ghante ke liye apne aap block ho gaya', 'Limiter block nahi karta; wo sirf hadd se upar ke request ko mana karta hai.'],
    ] },
  ],
  fixes: [
    { n: 'Tay khidki', how: 'Har minute ka ek counter.', cost: 'Seema par dugna nikal sakta hai.', when: 'Saada, dheeli hadd.' },
    { n: 'Khisakti khidki', how: 'Pichhle 60 second ko dekho, kisi bhi pal se.', cost: 'Thoda zyada hisaab ya memory.', when: 'Hadd sakht chahiye.' },
    { n: 'Token bucket', how: 'Baalti mein token tay raftaar se bharte hain; har request ek token leta hai.', cost: 'Do setting: raftaar aur baalti ka size.', when: 'Chhota jhatka manzoor, lambi raftaar par hadd.' },
  ],
  twist: { q: 'Redis 30 second ke liye band ho gaya. Limiter kya kare?', a: [
    ['Request jaane do, aur har server apni memory mein ek dheeli hadd rakhe', 'Ise fail-open kehte hain. Haalaat mein likha hai ki payments chalne chahiye. Local hadd baadh se bachaav deti hai.'],
    ['Saare request tab tak rok do jab tak Redis poori tarah wapas na aa jaaye', 'Suraksha ke ek auzaar ke band hone se poora payment band. Haalaat mein yahi mana hai.'],
    ['Saare 12 gateway servers ko ek saath restart kar do', 'Restart se Redis wapas nahi aata, aur 12 servers ka ek saath girna khud ek ghatna hai.'],
  ] },
  asli: 'Rate limiter raaste ke beech mein baitha hai. Isliye do sawal sabse pehle: "yeh kitna tez hai?" aur "yeh khud band ho toh kya hoga?"',
  say: 'Main counter Redis mein rakhunga, atomic increment ke saath, taaki saare gateway servers ek hi ginti dekhein. Algorithm token bucket ya sliding window, kyunki fixed window seema par dugna jaane deti hai. Redis band ho toh fail-open, local fallback limit ke saath.',
},
{
  id: 'design-typeahead', icon: '⌨️', title: 'Design: search box ke suggestion', topic: 'design', hard: 2,
  levels: ['search', 'caching'],
  story: 'Interviewer: "ChaiPay ke search box mein merchant ke naam ka suggestion banao. User \'sha\' likhe toh \'Sharma Sweets\' aur \'Shah Medical\' dikhein." 1 crore merchants hain. Har akshar par ek request aati hai.',
  facts: [
    'Suggestion 100 ms ke andar dikhna chahiye, warna user aage likh chuka hota hai.',
    'Zyadatar log wahi kuch hazaar mashhoor shuruaati akshar likhte hain.',
    'Naya merchant kuch minute baad dikhe toh chalega.',
  ],
  steps: [
    { t: 'Asli mushkil', q: 'Is design ki sabse badi mushkil kya hai?', a: [
      ['Har akshar par, 100 ms mein, 1 crore naamon mein se top 5 nikaalna', 'Request bahut zyada hain (har akshar), waqt bahut kam hai, aur data bada hai. Teeno ek saath.'],
      ['Merchants ke naam mein spelling ki galtiyon ko theek karna', 'Yeh ek achhi extra suvidha hai, par pehle seedha suggestion tez hona chahiye.'],
      ['1 crore merchants ke naam ko kahin store karne ki jagah dhoondhna', '1 crore naam kuch sau MB hain. Store karna mushkil nahi.'],
    ] },
    { t: 'Mukhya faisla', q: 'Jawab 100 ms mein kaise aayega?', a: [
      ['Har shuruaati akshar ke top 5 jawab pehle se banakar rakho; request par bas uthao', 'Mehnat pehle hi ho chuki hai. Request par sirf ek lookup: "sha" → 5 naam. Ise precompute karna kehte hain.'],
      ['Har request par database se poochho: naam "sha" se shuru ho, lokpriyata se sort', 'Bina matching index prefix lookup aur popularity sort mehenga hai; indexed query ko benchmark kiye bina 100 ms namumkin mat maano.'],
      ['Poori merchant list ek baar phone par bhej do aur phone par hi dhoondho', '1 crore naam phone par bhejna bhaari hai, aur list har din badalti hai.'],
    ] },
    { t: 'Keemat', q: 'Pehle se bane jawab ki keemat kya hai?', a: [
      ['Naya ya badla hua merchant thodi der baad dikhta hai; suchi dobara banani padti hai', 'Haalaat mein likha hai ki kuch minute ki der chalegi. Isliye yeh keemat yahan manzoor hai.'],
      ['Har search ab pehle se dheemi ho jaati hai kyunki suchi badi hai', 'Lookup suchi ke size se lagbhag azaad hai. Wo tez hi rehta hai.'],
      ['Sirf top 5 merchants hi kabhi dhoondhe ja sakte hain, baaki merchants kabhi nahi', 'User aur akshar likhta hai toh naya prefix banta hai, aur uske apne top 5 hote hain.'],
    ] },
  ],
  fixes: [
    { n: 'Pehle se bani suchi', how: 'Har prefix → top 5, ek tez store ya trie mein.', cost: 'Suchi dobara banani padti hai; thodi der.', when: 'Tez, saada suggestion.' },
    { n: 'Search engine', how: 'Jaise Elasticsearch ka suggestion feature.', cost: 'Ek aur system chalana.', when: 'Spelling ki galti bhi sehni ho.' },
    { n: 'Cache + app mein rukna', how: 'Mashhoor prefix cache; app likhna rukne par hi request bheje.', cost: 'Suggestion thoda der se.', when: 'Hamesha, upar ke saath.' },
  ],
  twist: { q: 'Traffic 10 guna ho gaya. Sabse sasta kadam kaunsa hai?', a: [
    ['App tabhi request bheje jab user likhna roke; mashhoor prefix cache karo', 'Tez likhne wala user 6 akshar par 6 ki jagah 1–2 request bhejega. Aur mashhoor prefix ka jawab cache se aayega.'],
    ['Search ke servers ko seedha 10 guna kar do aur baaki sab waisa hi rakho', 'Kaam karega, par kharcha 10 guna. Pehle faaltu request hatao.'],
    ['Zyada bojh ke waqt suggestion feature ko poori tarah band kar do', 'Jab sabse zyada log aate hain, tabhi feature gayab. Yeh aakhri raasta hai, pehla nahi.'],
  ] },
  asli: 'Jab jawab bahut tez chahiye aur sawal baar-baar wahi hain, toh mehnat <b>pehle</b> kar lo. Request ke waqt sirf uthao.',
  say: 'Main har prefix ke top-k suggestions precompute karunga aur ek tez key-value store ya trie mein rakhunga. Request par ek lookup. Popular prefix cache honge aur client debounce karega. Keemat: naya merchant kuch minute baad dikhta hai.',
},
{
  id: 'design-notification', icon: '🔔', title: 'Design: OTP, alert aur offers ka notification system', topic: 'design', hard: 2,
  levels: ['dlq', 'scheduling', 'fanout'],
  story: 'Interviewer: "ChaiPay ka notification system banao: OTP, payment alert aur offers; SMS, push aur email par." Din mein 5 crore notification jaate hain. Diwali par ek saath 2 crore offer jaate hain.',
  facts: [
    'OTP 5 second mein pahunchna chahiye. Offer 1 ghante mein bhi chalega.',
    'SMS provider kabhi-kabhi 30 second ke liye fail hota hai.',
    'Ek hi notification user ko do baar nahi jaana chahiye.',
  ],
  steps: [
    { t: 'Asli mushkil', q: 'Is design ki sabse badi mushkil kya hai?', a: [
      ['Turant wale OTP ko 2 crore offers ki baadh ke peeche atakne se bachana', 'Sab notification barabar nahi hain. Ek hi line ho toh OTP 2 crore offers ke peeche khada hoga, aur login band.'],
      ['5 crore notification ka text aur design har ek din tayyar karna', 'Text ek template se banta hai. Wo system design ki mushkil nahi hai.'],
      ['SMS, push aur email mein se har user ke liye ek ko chunna', 'Yeh ek setting hai jo user ki pasand se aati hai.'],
    ] },
    { t: 'Mukhya faisla', q: 'OTP ko offers se kaise bachaoge?', a: [
      ['Alag queue aur alag workers: OTP ki tez line, offers ki dheemi line', 'OTP ki line hamesha chhoti rehti hai, chahe offers ki line mein 2 crore message hon.'],
      ['Ek hi queue rakho: jo pehle aaya, wo pehle jaayega', '2 crore offers ke peeche aaya OTP ghanton baad jaayega.'],
      ['Jab offers bhej rahe ho, tab OTP bhejna thodi der ke liye rok do', 'Tab us dauraan koi login nahi kar paayega.'],
    ] },
    { t: 'Keemat', q: 'SMS provider 30 second fail hua, aur worker ne retry kiya. Kya khatra hai?', a: [
      ['Provider ne pehli baar bhej diya ho toh retry se user ko do message milenge', 'Isliye har notification ka ek unique id rakho aur bhejne se pehle jaancho. Provider ko bhi wahi id do agar wo samajhta hai.'],
      ['Retry ki wajah se poori queue hamesha ke liye ruk jaayegi', 'Baar-baar fail hone wala message alag queue (DLQ) mein chala jaata hai. Line nahi rukti.'],
      ['Koi khatra nahi; kisi bhi message ko dobara bhejna surakshit hota hai', 'Do baar OTP ya do baar "₹500 kat gaye" user ko dara deta hai.'],
    ] },
  ],
  fixes: [
    { n: 'Zaroorat ke hisaab se alag line', how: 'OTP, alert, offer: alag queue aur workers.', cost: 'Zyada queue sambhalni padti hain.', when: 'Message ki zaroorat alag-alag ho.' },
    { n: 'Doosra provider', how: 'Pehla fail ho toh doosre se bhejo.', cost: 'Do provider ka kharcha aur jod.', when: 'OTP jaisa zaroori message.' },
    { n: 'Unique id + hadd', how: 'Local dedupe + provider-supported idempotency; ek user ko din mein N offer.', cost: 'Ek table aur jaanch.', when: 'Hamesha.' },
  ],
  twist: { q: 'SMS provider 20 minute ke liye band hai. OTP ka kya karoge?', a: [
    ['OTP turant doosre provider se bhejo; purane OTP ko baad mein mat bhejo', 'OTP kuch minute mein bekaar ho jaata hai. 20 minute baad pahuncha OTP sirf uljhan hai.'],
    ['OTP ko queue mein rakho aur provider aane par 20 minute baad bhej do', 'Tab tak user ja chuka hoga, aur OTP expire ho chuka hoga.'],
    ['Jab tak provider wapas na aaye, sabke liye login band kar do', 'Ek provider ke band hone se poori app band.'],
  ] },
  asli: 'Queue ke design ka pehla sawal: "kya saare message barabar zaroori hain?" Nahi, toh unhe ek line mein mat khada karo.',
  say: 'Main priority ke hisaab se alag queues rakhunga: OTP, transactional aur promotional, apne workers ke saath. Har notification ka idempotency id, retry backoff ke saath, DLQ, aur OTP ke liye doosra provider. Promotional par per-user cap.',
},
{
  id: 'design-transfer', icon: '🏦', title: 'Design: wallet se wallet paisa bhejna', topic: 'design', hard: 3,
  levels: ['ledger', 'idempotency', 'saga'],
  story: 'Interviewer: "ChaiPay ka wallet-to-wallet transfer design karo: Riya, Aman ko ₹500 bhejti hai." Paisa na banna chahiye, na gayab hona chahiye. 2,000 transfer har second hote hain.',
  facts: [
    'Riya ka balance ghatna aur Aman ka badhna: dono ho, ya koi nahi.',
    'Network par wahi request dobara aa sakti hai.',
    'Auditor kabhi bhi poochh sakta hai: "yeh balance kaise bana?"',
  ],
  steps: [
    { t: 'Asli mushkil', q: 'Is design ki sabse badi mushkil kya hai?', a: [
      ['Paisa na bane, na khoye: do badlaav saath hon, aur dobara aayi request ek baar chale', 'Paise ke system mein "lagbhag sahi" nahi chalta. Sahi hona raftaar se pehle aata hai.'],
      ['2,000 transfer har second ke liye kaafi servers ka intezaam karna', '2,000 har second ek achhe database ke liye mushkil nahi. Yeh baad ka sawal hai.'],
      ['Transfer wali screen ko itna tez banana ki user ko zara bhi intezaar na karna pade', 'Tez galat transfer se dheema sahi transfer behtar hai.'],
    ] },
    { t: 'Mukhya faisla', q: 'Balance ko kaise rakhoge?', a: [
      ['Har transfer ki do entry ek ledger mein: ek se ghata, ek mein joda', 'Ise double-entry ledger kehte hain. Entry kabhi mitti nahi, sirf judti hai. Balance in entries ka jod hai, aur dono entry ek hi transaction mein likhi jaati hain.'],
      ['Sirf har user ka balance number rakho aur har transfer par use badal do', 'Itihaas nahi bachta. Galti ho toh pata nahi chalta kab hui, aur auditor ke sawal ka jawab nahi.'],
      ['Balance ko cache mein rakho aur database mein raat ko ek baar likho', 'Cache gira toh din bhar ke transfer gayab. Paisa cache mein nahi rakha jaata.'],
    ] },
    { t: 'Keemat', q: 'Ledger ki keemat kya hai?', a: [
      ['Ledger badhta hi jaata hai; balance jaldi padhne ke liye alag se rakhna padta hai', 'Har baar crore entries jodna dheema hai. Isliye taaza balance ek alag jagah rakha jaata hai, jo usi transaction mein badalta hai.'],
      ['Ledger mein galat entry ko baad mein mitaana ya badalna aasaan ho jaata hai', 'Ulta: entry kabhi mitaayi nahi jaati. Galti ko ek nayi ulti entry se theek kiya jaata hai.'],
      ['Transfer ab ek database transaction mein poora nahi ho sakta', 'Dono entry aur balance ka badlaav ek hi database mein, ek hi transaction mein hote hain.'],
    ] },
  ],
  fixes: [
    { n: 'Double-entry ledger', how: 'Har transfer = do entry; sirf jodo, mitao mat.', cost: 'Data badhta hai; balance alag rakhna padta hai.', when: 'Paise ka har system.' },
    { n: 'Idempotency key', how: 'Har transfer ka unique id; dobara aaye toh purana nateeja.', cost: 'Ek table, usi transaction mein.', when: 'Hamesha.' },
    { n: 'Roz ka milaan', how: 'Ledger ka jod = balance? Bank ke record se mel?', cost: 'Ek job aur uski nigrani.', when: 'Hamesha, peeche ki suraksha.' },
  ],
  twist: { q: 'Riya ChaiPay par hai, par Aman ka khaata doosre bank mein hai. Ab ek database transaction mumkin nahi.', a: [
    ['Riya ka paisa pehle "roka hua" dikhao; bank pakka kare toh poora karo, warna lautao', 'Do kadam: roko, phir pakka karo ya chhodo. Beech ki halat saaf dikhti hai, aur fail hone par paisa lautta hai.'],
    ['Bank ka jawab aane se pehle hi Aman ko "paisa mil gaya" dikha do', 'Bank mana kar de toh Aman ko jhootha paisa dikh chuka hoga.'],
    ['Riya ka paisa kaat lo, aur bank fail ho jaaye toh us transfer ko bas bhool jao', 'Riya ka paisa gayab. Yahi toh sabse pehli shart thi jo todni nahi thi.'],
  ] },
  asli: 'Paise ke system mein balance ek <b>nateeja</b> hai, sach nahi. Sach entries ki list hai, jo kabhi mitti nahi.',
  say: 'Main double-entry ledger use karunga: har transfer ki debit aur credit entry ek transaction mein, append-only. Har request par idempotency key. Balance alag materialize hoga. Doosre bank ke liye hold-confirm-cancel wala saga, aur roz reconciliation.',
},

]);
})();
