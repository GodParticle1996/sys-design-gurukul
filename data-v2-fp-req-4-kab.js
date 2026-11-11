/* First Principles — FAANG Senior Engineer.
   Source credit: The Anatomy of a Request (kt1tW0El6Gg), numbered video 4/15.
   Evidence: docker-labs/54-request-anatomy/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "route", "icon": "🗺️", "label": "BGP raasta", "x": 140, "y": 105}, {"id": "door", "icon": "🚪", "label": "edge / LB", "x": 445, "y": 105}, {"id": "svc", "icon": "🔐", "label": "service", "x": 750, "y": 105}];
const EDGES = [{"from": "route", "to": "door"}, {"from": "door", "to": "svc"}];
VISUALS["fp-req-kab"] = { t: "Raasta policy chunti hai, darwaze apni keemat lete hain, aur aakhri pehra service ka.", html: SD.viz.svg(HERO, EDGES, { nodes: { route: {tone:'acc',badge:'policy > speed'}, door: {tone:'busy',badge:'WAF · L4 · L7'}, svc: {tone:'ok',badge:'authorization'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-req-kab",
  "icon": "🛣️",
  "group": "🛣️ Anatomy of a Request",
  "title": "Request 4 · Kab — raasta, darwaza aur pehra kahan?",
  "badge": "Raah Ganitagya",
  "objectives": [
    "BGP raasta kaise chunta hai, aur anycast kab door le jaata hai?",
    "Edge, WAF, L4, L7 aur gateway — kiska kaam kya, keemat kya?",
    "Kaunsi jaanch service ke andar hi honi chahiye?"
  ],
  "lesson": [
    "<h3>🏢 Society ka gate, lift aur flat ka darwaza</h3><p>Society ke gate par guard gaadi ka number dekhta hai, lobby mein receptionist poochhta hai \"kis flat mein?\", aur flat ka maalik khud dekhta hai ki aap mehmaan ho ya nahi. Guard ke paas flat ki chaabi nahi, aur maalik gate par khada nahi rehta.</p><p>Request ke raaste mein bhi har darwaze ka kaam alag hai — aur har kaam ki keemat. Pehle raasta, phir darwaze.</p>"
  ],
  "stages": [
    {
      "type": "cards",
      "title": "🗺️ Internet ka raasta: policy, anycast aur leak",
      "goal": "Internet hazaaron alag networks (autonomous systems) ka jod hai. Networks ke beech raasta BGP chunta hai. Lab 54 ex6 ka model: ek prefix ke kai raaston mein BGP pehle business policy (LOCAL_PREF), phir chhota AS path dekhta hai. Packet bhejte waqt router sabse lamba matching prefix leta hai.",
      "lesson": "BGP speed nahi dekhta: contracts aur raaste ki lambai dekhta hai. Anycast aksar paas le jaata hai, hamesha sabse paas nahi. Galat announcement, khaas kar zyada specific prefix, traffic kheench sakta hai.",
      "steps": [
        {
          "title": "1. Sasta raasta jeeta",
          "say": "DelhiNet ISP ke paas KhanaKart tak do raaste: peer se (LOCAL_PREF 100, AS path 2, naapa RTT 50 ms) aur sasta contract (LOCAL_PREF 150, AS path 3, 200 ms).",
          "ask": {
            "q": "BGP kaunsa raasta chunega?",
            "choices": [
              "200 ms wala — LOCAL_PREF 150 pehle dekha jaata hai; speed BGP ka input hi nahi",
              "50 ms wala — BGP har raaste ka RTT naapta hai aur sabse tez chunta hai",
              "50 ms wala — AS path chhota hai, aur AS path sabse pehle dekha jaata hai"
            ],
            "answer": 0,
            "hint": "Ek hi prefix ke do raaste: pehle policy, phir path?",
            "explain": "LOCAL_PREF (ISP ki business policy) AS path se pehle aata hai: 150 > 100, toh sasta contract jeeta — 200 ms. BGP latency naapta hi nahi.",
            "choiceExplanations": [
              "LOCAL_PREF (ISP ki business policy) AS path se pehle aata hai: 150 > 100, toh sasta contract jeeta — 200 ms. BGP latency naapta hi nahi.",
              "BGP mein koi latency measurement nahi. Faisla policy aur path se hota hai.",
              "AS path tab dekha jaata jab LOCAL_PREF barabar ho. Yahan 150 vs 100."
            ]
          }
        },
        {
          "title": "2. Anycast — paas, par hamesha sabse paas nahi",
          "say": "KhanaKart ek hi IP prefix Mumbai, Singapore aur Frankfurt teeno se announce karta hai (<b>anycast</b>). Har user ka ISP apni policy se ek PoP chunta hai.",
          "ask": {
            "q": "Chennai ka ISP Singapore ke saath peering karta hai (LOCAL_PREF 100), Mumbai sirf transit se (50). Chennai ka user kahan pahunchega?",
            "choices": [
              "Singapore (2,902 km) — policy ne peering chuni; Mumbai (1,033 km) paas tha",
              "Mumbai — anycast hamesha user ke sabse paas wale PoP par hi bhejta hai",
              "Teeno par baari-baari — anycast har request alag PoP par bhejta hai"
            ],
            "answer": 0,
            "hint": "ISP doori dekhta hai ya LOCAL_PREF?",
            "explain": "Anycast \"paas\" BGP ki nazar se hai: policy aur AS path. Chennai ka ISP peering (100) ko transit (50) se upar rakhta hai → Singapore, 29 ms min RTT, jabki Mumbai 10 ms. Lab ex6 mein Dubai bhi Frankfurt gaya, Mumbai paas tha. Ilaaj: Chennai ke ISP ke saath peering, ya announcements ko tune karna.",
            "choiceExplanations": [
              "Anycast \"paas\" BGP ki nazar se hai: policy aur AS path. Chennai ka ISP peering (100) ko transit (50) se upar rakhta hai → Singapore, 29 ms min RTT, jabki Mumbai 10 ms. Lab ex6 mein Dubai bhi Frankfurt gaya, Mumbai paas tha. Ilaaj: Chennai ke ISP ke saath peering, ya announcements ko tune karna.",
              "Doori BGP ka input nahi. Zyada tar case mein paas wala jeet-ta hai, har baar nahi.",
              "Ek ISP ke andar ek prefix ka ek best raasta hota hai; requests baari-baari nahi bant-ti."
            ]
          }
        },
        {
          "title": "3. Leak: zyada specific jeeta",
          "say": "KhanaKart 203.0.112.0/22 announce karta hai. LeakyNet galti se 203.0.113.0/24 announce kar deta hai — /22 ke andar ka ek tukda.",
          "ask": {
            "q": "203.0.113.10 par jaane wala traffic kahan jaayega (ISP filter nahi karta)?",
            "choices": [
              "LeakyNet — /22 aur /24 dono installed hain; forwarding mein /24 sabse lamba match hai",
              "KhanaKart — asli maalik ka announcement hamesha jeet-ta hai, chahe koi aur kuch bhi kahe",
              "KhanaKart — LeakyNet ka AS path lamba hai, isliye LeakyNet ka raasta haarega"
            ],
            "answer": 0,
            "hint": "/22 aur /24 mein zyada specific kaun?",
            "explain": "/22 aur /24 alag prefixes hain, dono install hote hain. Packet bhejte waqt router sabse lamba match leta hai: /24. Policy aur AS path sirf ek hi prefix ke raaston mein chunte hain. Isliye 203.0.113.x LeakyNet gaya; /22 ka baaki hissa bacha. 2008 mein Pakistan Telecom ka YouTube ke /22 ke andar /24 aisa hi tha. Bachav: RPKI (prefix ka valid ROA ho aur ISP Invalid routes reject kare), aur route filters.",
            "choiceExplanations": [
              "/22 aur /24 alag prefixes hain, dono install hote hain. Packet bhejte waqt router sabse lamba match leta hai: /24. Policy aur AS path sirf ek hi prefix ke raaston mein chunte hain. Isliye 203.0.113.x LeakyNet gaya; /22 ka baaki hissa bacha. 2008 mein Pakistan Telecom ka YouTube ke /22 ke andar /24 aisa hi tha. Bachav: RPKI (prefix ka valid ROA ho aur ISP Invalid routes reject kare), aur route filters.",
              "BGP ko \"asli maalik\" nahi pata — jab tak RPKI jaisi jaanch na ho.",
              "AS path sirf ek hi prefix ke raaston mein ginta hai. /22 aur /24 dono install hain, aur packet lamba match leta hai."
            ]
          }
        },
        {
          "title": "4. Naam",
          "say": "Ek network jo apna raasta khud tay karta hai: <b>autonomous system (AS)</b>. Networks ke beech raasta: <b>BGP</b>. ISP ki pasand: <b>LOCAL_PREF</b>. Ek IP kai jagah se: <b>anycast</b>. Galat announcement ka failna: <b>route leak / hijack</b>. Origin ki jaanch: <b>RPKI</b>."
        }
      ]
    },
    {
      "type": "cards",
      "title": "🚪 Darwaze ki line: edge, WAF, L4, L7 aur gateway",
      "goal": "Packet KhanaKart tak pahuncha. App ke code se pehle kai darwaze: edge, WAF, load balancer, API gateway. Har darwaze ka kaam aur keemat alag.",
      "lesson": "Edge handshake paas karta hai. Lab ke linear rules par WAF ka kharcha lagbhag rules × bytes. L4 sasta aur andha, L7 samajhdar aur mehnga. Gateway pehla parda hai, aakhri nahi.",
      "steps": [
        {
          "title": "1. Edge par TLS khatam",
          "say": "Sydney ka user, origin Ashburn (fiber RTT kam se kam 156.7 ms). Lab ka arithmetic model, server processing ke bina: seedha origin tak pehle byte ke liye TCP 1 + TLS 1.3 1 + request 1 = 3 × 156.7 = <b>470 ms</b>. Sydney edge par TCP+TLS setup sirf 6 ms (RTT 3 ms); edge ka origin tak pehle se garam connection ho toh cache-miss pehla byte <b>166 ms</b>; edge cache hit par 9 ms."
        },
        {
          "title": "2. WAF ka bill",
          "say": "Lab ex5: saaf text bodies aur linear regex rules; match na mile toh har rule poori body padhta hai (match milte hi scan rukta hai). 1 KB order par 2,000 rules: 0.6 ms. 1 MiB base64 text par 500 rules: ~134–139 ms; 2,000 rules: ~539–545 ms. Backtracking wale regex ka kharcha alag ho sakta hai (Feed ka incident).",
          "ask": {
            "q": "Image upload endpoint par p99 bahut dheema hai. Profiling: WAF ke 500 text rules har upload body poori padhte hain. Pehla ilaaj?",
            "choices": [
              "Upload format par bekaar text rules hatao ya seemit karo; size, type, headers jaancho",
              "Server ka CPU dugna karo — WAF ka kaam app server ke apne CPU par hi chalta hai",
              "Rules ko 500 se 1,000 karo — zyada rules se attacks jaldi aur zyada pakde jaate hain"
            ],
            "answer": 0,
            "hint": "Kharcha kis cheez se badhta hai: rules × kya?",
            "explain": "Lab ke linear rules par kharcha lagbhag rules × bytes. Image upload par SQL/script ke text rules ka faayda kam, kharcha bada. Text rules hatao ya seemit karo; size, type, headers aur upload ke zaroori security checks rakho. Kai managed WAF body ka sirf pehla hissa padhte hain aur badi body ke liye alag setting dete hain — inspection ka kharcha seemit rakhne ke liye.",
            "choiceExplanations": [
              "Lab ke linear rules par kharcha lagbhag rules × bytes. Image upload par SQL/script ke text rules ka faayda kam, kharcha bada. Text rules hatao ya seemit karo; size, type, headers aur upload ke zaroori security checks rakho. Kai managed WAF body ka sirf pehla hissa padhte hain aur badi body ke liye alag setting dete hain — inspection ka kharcha seemit rakhne ke liye.",
              "WAF aksar edge ya load balancer par chalta hai; CPU dugna karne se rules × bytes ka kaam nahi ghatta.",
              "Rules dugne toh kharcha bhi lagbhag dugna (ex5: 500 → 2,000 rules par ~4×)."
            ]
          }
        },
        {
          "title": "3. L4 andha, L7 samajhdar",
          "say": "Lab ex4: L4 proxy bytes copy karta hai, connection dekh ke backend chunta hai. L7 proxy har HTTP request padh ke path se chunta hai.",
          "ask": {
            "q": "Client ek hi keep-alive connection par /api aur /img dono bhejta hai, aage L4 proxy. /img kahan jaayega?",
            "choices": [
              "/api wale backend par hi — L4 poore connection ko ek backend deta hai",
              "Image backend par — L4 proxy HTTP path padh ke /img alag bhej deta hai",
              "Baari-baari dono backends par — L4 har request par round robin karta hai"
            ],
            "answer": 0,
            "hint": "L4 kya ginta hai: connection ya request?",
            "explain": "L4 HTTP nahi padhta; connection ke shuru mein backend chunta hai. Ek keep-alive connection = ek backend: lab mein /img 100% A par gaya. L7 ne har request ka path padha: /img 100% B. Keemat: L7 proxy ka CPU ~2.2–2.6× (134–157 vs 59–62 ms / 1,000 req).",
            "choiceExplanations": [
              "L4 HTTP nahi padhta; connection ke shuru mein backend chunta hai. Ek keep-alive connection = ek backend: lab mein /img 100% A par gaya. L7 ne har request ka path padha: /img 100% B. Keemat: L7 proxy ka CPU ~2.2–2.6× (134–157 vs 59–62 ms / 1,000 req).",
              "Path padhna L7 ka kaam hai; L4 ko sirf IP aur port dikhte hain.",
              "Round robin L4 mein connections par hota hai (lab B: naye connection par A/B 50–50), requests par nahi."
            ]
          }
        },
        {
          "title": "4. Gateway pehla parda",
          "say": "API gateway JWT jaanchta hai, rate limit lagata hai, kharab requests rokta hai — app tak pahunchne se pehle.",
          "ask": {
            "q": "Team kehti hai: \"Gateway JWT jaanchta hai, toh services ke andar ke permission checks hata do.\" Sahi?",
            "choices": [
              "Nahi — valid JWT 'order 42 tumhara hai?' ka saboot nahi; service har request par enforce kare",
              "Haan — ek jagah jaanch tez hai, aur services ke checks bas dohraav hain",
              "Haan — gateway C++ mein hai, isliye gateway ki jaanch services se zyada bharose layak hai"
            ],
            "answer": 0,
            "hint": "Gateway ko pata hai ki order 42 kis user ka hai?",
            "explain": "Gateway authentication (kaun ho), moti hadd (rate limit, size) aur kuch authorization (jaise authorizer se) kar sakta hai. Par order service ko har request par resource permission enforce karni chahiye — is user ko is order par haq hai? Decision local code ya shared authorization service se aa sakta hai; valid JWT order access ka saboot nahi. Andar ka koi galat call ya gateway ki galti seedha data tak na pahunche: defense in depth.",
            "choiceExplanations": [
              "Gateway authentication (kaun ho), moti hadd (rate limit, size) aur kuch authorization (jaise authorizer se) kar sakta hai. Par order service ko har request par resource permission enforce karni chahiye — is user ko is order par haq hai? Decision local code ya shared authorization service se aa sakta hai; valid JWT order access ka saboot nahi. Andar ka koi galat call ya gateway ki galti seedha data tak na pahunche: defense in depth.",
              "Order ka maalik kaun, service ke data mein likha hai. Gateway ke check ke baad bhi service enforce kare.",
              "Language bharose ka paimana nahi. Asli sawaal: data kiske paas hai?"
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 L4 vs L7, WAF ka bill, aur BGP model",
      "project": "54-request-anatomy",
      "exercise": "ex4-lb",
      "goal": "Do backends ke aage L4 aur L7 proxy — latency, proxy CPU, kaunsa backend. Phir 2,000 tak WAF rules × body size. Phir BGP ka model.",
      "why": "Node 22+ chahiye. ex4 asli processes (~20 s), ex5 asli CPU (~5 s) — samay badlega. ex6 model hai, har run same.",
      "steps": [
        {
          "text": "Lab folder se: L4 vs L7.",
          "cmd": "cd docker-labs/54-request-anatomy && npm start -- ex4-lb",
          "expect": "REAL RUN: Node v24.18.0; separate processes on 127.0.0.1; 4,000 requests one after another, each /api or /img by a seeded coin toss\nL4 = TCP proxy, picks a backend per connection (round robin), never reads HTTP; L7 = HTTP proxy, routes each request by path\nevery way warmed up (300 untimed requests), then 3 rounds in rotating order; numbers = median of the rounds\n\nA) client keeps ONE connection open (keep-alive)\n   way                    p50       p99    proxy CPU / 1,000 req    /api went to     /img went to\n   direct to backend A    0.07 ms   0.36 ms                —            A 100% · B 0%    A 100% · B 0%\n   through L4 proxy       0.13 ms   0.47 ms            59 ms            A 100% · B 0%    A 100% · B 0%\n   through L7 proxy       0.18 ms   0.59 ms           134 ms            A 100% · B 0%    A 0% · B 100%\n\nB) client opens a NEW connection per request\n   way                    p50       p99    proxy CPU / 1,000 req    /api went to     /img went to\n   direct to backend A    0.12 ms   0.42 ms                —            A 100% · B 0%    A 100% · B 0%\n   through L4 proxy       0.26 ms   0.64 ms           162 ms            A 50% · B 50%    A 50% · B 50%\n   through L7 proxy       0.32 ms   0.85 ms           239 ms            A 100% · B 0%    A 0% · B 100%"
        },
        {
          "text": "WAF ke rules × bytes.",
          "cmd": "npm start -- ex5-waf",
          "expect": "REAL RUN: Node v24.18.0; one request body scanned by N regex rules on one thread; elapsed/CPU ms per request\nbodies are clean (no rule matches), so every rule reads every byte; timings change run to run\n\nbody                                 20 rules     100 rules     500 rules    2000 rules\n1 KB JSON order                      0.00/0.0      0.04/0.0      0.12/0.1      0.61/0.6\n100 KB JSON                          0.17/0.2      0.90/0.9      4.59/4.6    18.02/18.0\n1 MB image upload (base64)           5.56/5.6    27.87/27.9  133.57/133.6  545.18/545.2\n\nattack body {\"q\":\"1 UNION SELECT password FROM users\"} → caught by rule #1 (first match stops the scan)\n1 MB upload with only the 20 base rules on its URL and headers (body skipped): 0.00/0.0 ms"
        },
        {
          "text": "BGP: policy, anycast, leak.",
          "cmd": "npm start -- ex6-bgp",
          "expect": "MODEL: per prefix, BGP picks the route with the highest LOCAL_PREF (policy), then the shortest AS path;\n       sending a packet then uses the longest matching installed prefix. Other BGP checks and tie-breakers are left out.\n\nA) DelhiNet ISP → KhanaKart 203.0.113.0/24: two routes it learned\n   PeerFast (peer)                LOCAL_PREF 100  AS path 2  measured RTT  50 ms  \n   TransitCheap (cheap contract)  LOCAL_PREF 150  AS path 3  measured RTT 200 ms  ← chosen\n   BGP never saw the 50 ms vs 200 ms: policy (LOCAL_PREF) decides before path length, and speed is not an input.\n\nB) anycast: KhanaKart announces 198.51.100.0/24 from Mumbai, Singapore and Frankfurt PoPs\n   user       BGP sends to   distance   RTT (min)   nearest PoP   distance   RTT (min)\n   Delhi      Mumbai          1,148 km       11 ms   Mumbai         1,148 km       11 ms\n   Chennai    Singapore       2,902 km       29 ms   Mumbai         1,033 km       10 ms   ← not the nearest\n   Dubai      Frankfurt       4,836 km       48 ms   Mumbai         1,935 km       19 ms   ← not the nearest\n   London     Frankfurt         638 km        6 ms   Frankfurt        638 km        6 ms\n   Sydney     Singapore       6,306 km       63 ms   Singapore      6,306 km       63 ms\n   anycast lands each user where its ISP's policy and AS path point — usually near, not always the nearest.\n\nC) route leak: KhanaKart announces 203.0.112.0/22; LeakyNet wrongly announces 203.0.113.0/24 inside it (like YouTube, 2008)\n   ASSUMED: KhanaKart has a valid covering ROA and SafeNet rejects RPKI-Invalid routes; LeakyNet is not an authorized origin\n   ISP                      203.0.113.10 before → after          203.0.112.10 after\n   DelhiNet                 KhanaKart (real) → LeakyNet (leak)    KhanaKart (real)\n   MumbaiFiber              KhanaKart (real) → LeakyNet (leak)    KhanaKart (real)\n   ChennaiNet               KhanaKart (real) → LeakyNet (leak)    KhanaKart (real)\n   SafeNet (RPKI filter)    KhanaKart (real) → KhanaKart (real)   KhanaKart (real)\n   both routes are installed; the /24 is the longer match, so 203.0.113.x follows it despite worse policy and a longer path.\n   without a covering ROA the leak is NotFound, not Invalid; a leak that keeps an authorized origin passes origin checks."
        }
      ],
      "observe": {
        "q": "Requirement: A order API ke liye, B image service ke liye; /api → A, /img → B chahiye. B mein (har request naya connection) L4 par /api aur /img dono A 50% · B 50% gaye. L4 requirement poori karta hai?",
        "choices": [
          "Nahi — load barabar, par path dekhe bina; /img aadhe samay A par gaya",
          "Haan — L4 ne har request ka path padh ke dono backends par kaam baanta",
          "Haan — 50–50 ka matlab hai ki L4 ne har request sahi backend par bheji"
        ],
        "answer": 0,
        "hint": "L4 ne /img request ko kis aadhaar par backend diya?",
        "explain": "L4 ne connection ginke baari-baari backend diya, path dekhe bina. Path ke hisaab se routing ki requirement L4 poori nahi karta — lab mein L7 ne /img 100% B par bheja. Lab ke dono backends har path par jawab dete hain; capture sirf batata hai ki kisne jawab diya.",
        "choiceExplanations": [
          "L4 ne connection ginke baari-baari backend diya, path dekhe bina. Path ke hisaab se routing ki requirement L4 poori nahi karta — lab mein L7 ne /img 100% B par bheja. Lab ke dono backends har path par jawab dete hain; capture sirf batata hai ki kisne jawab diya.",
          "L4 path padhta hi nahi; 50–50 sirf connection ki ginti hai.",
          "Requirement ke hisaab se /img → B. L4 par /img aadha A par gaya."
        ]
      },
      "lesson": "L4 sasta, connection par; L7 mehnga, request par. Lab ke linear WAF rules ka bill bytes ke saath badhta hai. BGP policy se chalta hai, speed se nahi."
    },
    {
      "type": "bins",
      "title": "⚖️ Kaunsa kaam kis darwaze par?",
      "instructions": "KhanaKart ka design: edge par TLS, cache aur WAF; andar L7/gateway par routing, rate limit aur JWT; order service par resource permissions aur business rules. Har kaam design ke tay darwaze par rakho. User ke paas karna sasta ho (handshake, cache, attack rokna) toh 🌐. Traffic baantna, path se route, rate limit ya token jaanch ho toh ⚖️. Data aur business rule par tika faisla ho toh 🔐.",
      "bins": [
        {
          "id": "edge",
          "label": "🌐 Edge par"
        },
        {
          "id": "lb",
          "label": "⚖️ Load balancer / gateway"
        },
        {
          "id": "svc",
          "label": "🔐 Service khud"
        }
      ],
      "items": [
        {
          "text": "Sydney ke users ke liye TLS handshake jaldi khatam karna",
          "bin": "edge",
          "explain": "Handshake user ke paas wale edge par: model mein TCP+TLS setup ~313 ms se 6 ms. Cache-miss pehle byte ka total 470 ms se 166 ms (lab ex0)."
        },
        {
          "text": "Login form par SQL injection jaise jaane-pehchane attack rokna",
          "bin": "edge",
          "explain": "WAF ke signatures edge par chalein toh kharab traffic andar aane se pehle ruk jaata hai, aur saaf traffic aage halka jaata hai."
        },
        {
          "text": "/img requests image service ko, /api requests order service ko bhejna",
          "bin": "lb",
          "explain": "Path padhna L7 load balancer ka kaam hai; L4 path nahi dekh sakta (lab ex4)."
        },
        {
          "text": "Laakhon lambe TCP connections (game server) ko machines mein baantna",
          "bin": "lb",
          "explain": "L4 load balancer connection par baant-ta hai, sasta aur tez; HTTP padhne ki zaroorat nahi."
        },
        {
          "text": "Har API key ko 100 requests/second tak rokna, aur JWT ka signature jaanchna",
          "bin": "lb",
          "explain": "Rate limit aur authentication (kaun ho) API gateway par ek jagah — services tak bekaar traffic na jaaye."
        },
        {
          "text": "User 7 ko order 42 cancel karne ka haq hai ya nahi",
          "bin": "svc",
          "explain": "Order ka maalik kaun, order service ke data mein likha hai. Gateway ke baad bhi service permission enforce kare; decision local code ya shared authorization service se aa sakta hai."
        },
        {
          "text": "Refund ki rakam order ki rakam se zyada na ho",
          "bin": "svc",
          "explain": "Business rule data par tika hai; service ke andar transaction ke saath jaancho."
        }
      ],
      "lesson": "Jo kaam user ke paas sasta, edge par. Baantna, routing, rate limit aur pehchaan load balancer/gateway par. Resource permission service har request par enforce kare."
    }
  ],
  "interview": {
    "title": "Interview Round — raasta aur darwaze",
    "instructions": "Pehle socho: faisla policy se hota hai ya doori se, aur kaunsa darwaza kya dekh sakta hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Anycast lagaya, phir bhi Dubai ke users Frankfurt PoP par pahunch rahe hain, jabki Mumbai PoP paas hai. Kya jaanchoge?",
        "choices": [
          "Dubai ke ISPs ke BGP raaste: kis PoP tak chhota AS path ya behtar policy hai",
          "Mumbai PoP ki CPU — bhara PoP anycast mein apne aap traffic lena band kar deta hai",
          "DNS ka TTL — lamba TTL Dubai ke users ko purane Frankfurt IP par rakhta hai",
          "Users ke browser — browser anycast mein sabse tez PoP khud naap ke chunta hai"
        ],
        "answer": 0,
        "explain": "Anycast mein IP ek hai; kaunsa PoP milega, user ka ISP BGP se tay karta hai — policy aur AS path, doori nahi. Lab ex6: Dubai ka ISP Frankfurt tak AS path 2, Mumbai tak 3 → Frankfurt. Ilaaj: Dubai ke ISPs ke saath peering, ya announcements tune karna.",
        "choiceExplanations": [
          "Anycast mein IP ek hai; kaunsa PoP milega, user ka ISP BGP se tay karta hai — policy aur AS path, doori nahi. Lab ex6: Dubai ka ISP Frankfurt tak AS path 2, Mumbai tak 3 → Frankfurt. Ilaaj: Dubai ke ISPs ke saath peering, ya announcements tune karna.",
          "BGP ko PoP ka load nahi dikhta; bhara PoP announcement waapas na le toh traffic aata rehta hai.",
          "Anycast mein teeno PoP ka IP ek hi hai; DNS TTL se PoP nahi badalta.",
          "Browser IP par bhejta hai; kaunsa PoP, network ke routers tay karte hain."
        ]
      },
      {
        "q": "Ek startup har request par: WAF ke 2,000 rules poori body par, L7 load balancer, gateway par JWT, aur service mein permission check. Image upload ~1 MB ke aur dheeme hain. Profiling: body scan ~540 ms CPU; JWT aur permission checks chhota hissa. Sabse pehle kya badloge?",
        "choices": [
          "Upload body par bekaar WAF text rules hatao ya seemit karo — size/type/headers jaancho",
          "Service ka permission check hatao — gateway JWT jaanch chuka, dohraav ki zaroorat nahi",
          "L7 ko L4 se badlo — L4 tez hai, aur path routing ki zaroorat image upload mein nahi",
          "JWT jaanch hatao — har request par signature check hi sabse bada kharcha hai"
        ],
        "answer": 0,
        "explain": "Profiling ke hisaab se sabse bada measured bill WAF scan ka (lab ex5: 1 MiB text par 2,000 rules ~539–545 ms CPU). Upload ke format par text signatures ka faayda kam. Permission check zaroori hai; L7 ka extra ~0.1 ms aur thoda CPU, upload ke bill ke saamne chhota.",
        "choiceExplanations": [
          "Profiling ke hisaab se sabse bada measured bill WAF scan ka (lab ex5: 1 MiB text par 2,000 rules ~539–545 ms CPU). Upload ke format par text signatures ka faayda kam. Permission check zaroori hai; L7 ka extra ~0.1 ms aur thoda CPU, upload ke bill ke saamne chhota.",
          "Permission check data ke paas zaroori hai; profiling mein bada bill WAF scan ka.",
          "L4 vs L7 ka farq lab mein ~0.1 ms; upload par WAF ke ~540 ms ke saamne chhota.",
          "Profiling mein JWT check chhota hissa hai; bada bill body scan ka."
        ]
      }
    ]
  },
  "success": [
    "BGP route selection aur forwarding ka longest-prefix match alag samjha sakte ho, aur anycast ki seema bhi",
    "Edge, WAF, L4, L7 aur gateway ka kaam aur keemat bata sakte ho",
    "Authorization ko service ke andar rakhne ki wajah samjha sakte ho"
  ],
  "cards": [
    {
      "front": "BGP aur forwarding raasta kaise chunte hain (model)?",
      "back": "Ek prefix ke raaston mein: sabse ooncha LOCAL_PREF (policy) → sabse chhota AS path. Packet bhejte waqt sabse lamba matching prefix. Latency input nahi. Lab: 200 ms ka sasta raasta jeeta."
    },
    {
      "front": "L4 vs L7 (lab 54)?",
      "back": "Ek keep-alive connection wale lab case mein: L4 connection par backend, path nahi dekhta, CPU ~59–62 ms / 1,000 req; L7 har request ka path, CPU ~134–157 ms. Keep-alive par L4 sab ek backend ko."
    },
    {
      "front": "WAF ka kharcha?",
      "back": "Lab ke saaf text aur linear rules par lagbhag rules × bytes: 1 KB × 2,000 rules 0.6 ms; 1 MiB text × 2,000 rules ~539–545 ms. Backtracking regex alag. Upload format par bekaar text rules hatao ya seemit karo."
    }
  ]
}
]);
})();
