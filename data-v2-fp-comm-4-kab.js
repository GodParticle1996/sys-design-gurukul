/* First Principles — FAANG Senior Engineer.
   Source credit: The Cost of Communication (YOR9hAFoe2o), numbered video 3/15.
   Evidence: docker-labs/53-communication-tax/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "pool", "icon": "🔌", "label": "connection", "x": 140, "y": 105}, {"id": "batch", "icon": "🧺", "label": "jodo", "x": 445, "y": 105}, {"id": "fmt", "icon": "📦", "label": "format", "x": 750, "y": 105}];
const EDGES = [{"from": "pool", "to": "batch"}, {"from": "batch", "to": "fmt"}];
VISUALS["fp-comm-kab"] = { t: "Handshake, round trips, kernel ke safar, bytes ya CPU — bill kis cheez ka hai?", html: SD.viz.svg(HERO, EDGES, { nodes: { pool: {tone:'ok',badge:'garam'}, batch: {tone:'acc',badge:'kam baat'}, fmt: {tone:'slow',badge:'pehle naapo'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-comm-kab",
  "icon": "📡",
  "group": "📡 Cost of Communication",
  "title": "Communication 4 · Kab — connection, jodna, ya format badalna?",
  "badge": "Sanchaar Siddh",
  "objectives": [
    "JSON vs Protobuf: bytes, gzip aur CPU alag-alag kaise tolein?",
    "Chhote writes itne mehnge kyun, aur ilaaj kya?",
    "Kab connection garam karo, kab baat kam karo, kab pehle naapo?"
  ],
  "lesson": [
    "<h3>💌 Shaadi ke 1,000 card</h3><p>Har card par poora pata likhna: \"Shri Ramesh Kumar Sharma, Flat 4B, …\". Ek tareeka: mehmaanon ki list sabke paas ho, card par sirf mehmaan ka number. Card chhote ho gaye — par list sabke paas honi chahiye, aur number padh ke naam dhoondna bhi kaam hai.</p><p>Aur card bhejne ke liye 1,000 baar dakghar jaana, ya ek baar mein saare? KhanaKart ke orders, bytes aur writes ke saath bhi yahi sawal — lab mein asli bill naapa.</p>"
  ],
  "stages": [
    {
      "type": "cards",
      "title": "📦 JSON ya binary? Bytes aur CPU do alag sawal",
      "goal": "KhanaKart ke 1,00,000 orders: JSON mein bhejo ya Protobuf ke binary format mein? Lab 53 ex2 ne asli bytes aur asli CPU naapa.",
      "lesson": "Protobuf bina compression ke bytes saaf bachata hai. Gzip ke baad farq response ke size par tika: ek order par 62%, poori list par 98%. CPU ka nateeja library aur language par tika hai — apne stack par naapo, maan ke mat chalo.",
      "steps": [
        {
          "title": "1. Har baar poora pata",
          "say": "Ek order JSON mein: <code>{\"id\":1000000,\"userId\":32157,\"amountPaise\":124034,\"city\":\"Bengaluru\",…}</code> = <b>147 bytes</b>. Har order mein \"userId\", \"amountPaise\" jaise naam dobara likhe jaate hain. Protobuf mein wahi order <b>77 bytes</b>.",
          "ask": {
            "q": "Protobuf mein wahi order 77 bytes kaise?",
            "choices": [
              "Field ke naam ki jagah chhota field number, aur number text ki jagah binary (varint)",
              "Protobuf order ke kuch fields chhod deta hai — sirf zaroori fields bhejta hai",
              "Protobuf andar se gzip karta hai, isliye har order apne aap chhota ho jaata hai"
            ],
            "answer": 0,
            "hint": "\"amountPaise\" ka naam har order mein kitni baar jaata hai?",
            "explain": "Protobuf naam nahi bhejta: dono taraf ek schema hai, aur har field ka sirf number (jaise 3) jaata hai. Numbers text ke bajaye varint mein: 124034 ke 6 characters ki jagah 3 bytes. Lab ne round trip jaancha: decode(encode(order)) asli order ke barabar.",
            "choiceExplanations": [
              "Protobuf naam nahi bhejta: dono taraf ek schema hai, aur har field ka sirf number (jaise 3) jaata hai. Numbers text ke bajaye varint mein: 124034 ke 6 characters ki jagah 3 bytes. Lab ne round trip jaancha: decode(encode(order)) asli order ke barabar.",
              "Lab ka round trip test har field wapas laata hai. Kuch nahi chhoota.",
              "Protobuf mein compression nahi. Bytes schema aur binary numbers se bachte hain."
            ]
          }
        },
        {
          "title": "2. Gzip ke baad",
          "say": "Poore 1,00,000 orders: JSON <b>12.57 MB</b>, Protobuf <b>5.77 MB</b> (46%). Gzip ke baad poori list: JSON 1.57 MB, Protobuf 1.54 MB (<b>98%</b>). Par ek order wale response par gzip ke baad bhi JSON 138 bytes, Protobuf 86 (<b>62%</b>).",
          "ask": {
            "q": "Lab ki poori list (1,00,000 orders) ek gzip response hai. Protobuf par jaane se compressed bytes kitne bache?",
            "choices": [
              "Lagbhag 2% — 1.57 MB se 1.54 MB; doosre response size aur data par dobara naapo",
              "Aadhe — Protobuf JSON ka 46% hai, toh gzip ke baad bhi 46% hi rahega",
              "Bytes badh jaayenge — gzip binary data ko hamesha sikodne ki jagah bada kar deta hai"
            ],
            "answer": 0,
            "hint": "Gzip dohraaye hue text ke saath kya karta hai?",
            "explain": "Poori list mein JSON ke naam baar-baar dohraate hain, aur gzip dohraav sikod deta hai: 1.57 vs 1.54 MB. Par yahi bachat har response par nahi — ek order wale response par gzip ke baad bhi Protobuf 62%. Ek gzip mein jitna data, utna farq: apne asli responses par naapo.",
            "choiceExplanations": [
              "Poori list mein JSON ke naam baar-baar dohraate hain, aur gzip dohraav sikod deta hai: 1.57 vs 1.54 MB. Par yahi bachat har response par nahi — ek order wale response par gzip ke baad bhi Protobuf 62%. Ek gzip mein jitna data, utna farq: apne asli responses par naapo.",
              "46% bina compression ka hai. Poori list par gzip ke baad 98%.",
              "Lab mein Protobuf ka gzip 1.54 MB, JSON ke gzip 1.57 MB se thoda chhota. Gzip binary ko bhi sikodta hai."
            ]
          }
        },
        {
          "title": "3. CPU ka sawal",
          "say": "Objects se bytes aur wapas, median samay: JSON 31–33 / 42–45 ms, Protobuf 35–36 / 70–74 ms; CPU bhi JSON ka kam. JSON tez nikla — V8 ka JSON C++ mein hai, lab ka Protobuf JavaScript mein. Gzip ka compress 120–126 ms: JSON encode ka ~4×.",
          "ask": {
            "q": "Video kehta hai \"JSON high-performance systems ke liye disaster, 30% CPU parsing mein\". Lab ke baad kya kahoge?",
            "choices": [
              "CPU ka nateeja implementation par tika — apna profile lo; 30% ka source video nahi deta",
              "Video sahi hai — binary format ka CPU hamesha JSON se kam hota hai, har language mein",
              "Lab galat hai — Protobuf ka decode JSON se dheema ho hi nahi sakta, kahin bug hai"
            ],
            "answer": 0,
            "hint": "Lab mein JSON kis language mein chala, aur Protobuf kis mein?",
            "explain": "Bytes mein Protobuf saaf jeeta. CPU par Node ke andar V8 ka C++ JSON JavaScript Protobuf se tez nikla. Doosri language ya doosri library mein nateeja ulta ho sakta hai. Isliye profile lo: parsing sach mein CPU kha raha hai? Video 30% ka koi source nahi deta.",
            "choiceExplanations": [
              "Bytes mein Protobuf saaf jeeta. CPU par Node ke andar V8 ka C++ JSON JavaScript Protobuf se tez nikla. Doosri language ya doosri library mein nateeja ulta ho sakta hai. Isliye profile lo: parsing sach mein CPU kha raha hai? Video 30% ka koi source nahi deta.",
              "Lab mein Node par JSON encode 31–33 ms aur Protobuf 35–36 ms. \"Hamesha\" ka daava naapne se toota.",
              "Lab ka round trip test dono formats ko sahi jaanchta hai. Farq implementation ka hai: C++ vs JavaScript."
            ]
          }
        },
        {
          "title": "4. Naam aur kab",
          "say": "Data ko bytes mein badalna: <b>serialization</b>. Field number + binary wala format: <b>Protocol Buffers</b> (Protobuf), jiska number format <b>varint</b>. Dono taraf ka tay kiya hua dhaancha: <b>schema</b>. Binary format tab chuno jab bytes ka bill bada ho (gzip na lag sake, chhote messages bahut), ya schema ka pakka contract chahiye. CPU ke liye pehle naapo."
        }
      ]
    },
    {
      "type": "cards",
      "title": "🥄 Chammach-chammach ya poora katora?",
      "goal": "8 MB data socket par bhejna hai. Lab 53 ex3: 100-byte tukdon mein, ya ek baar mein. Asli loopback TCP.",
      "lesson": "Har chhota write() JavaScript, runtime aur kernel ka kaam hai. Chhote tukde aur har tukde ka intezaar = hazaaron baar ka kaam. Data jodo, phir ek baar bhejo — ya library ko jodne do.",
      "steps": [
        {
          "title": "1. 83,887 write() calls",
          "say": "8 MB ko 100-byte tukdon mein bhejo = <b>83,887</b> write() calls. Har tukda bhej ke intezaar: <b>63–65 ms</b>. Ek hi 8 MB write: <b>3.2–4.1 ms</b> — ~15–20× tez.",
          "ask": {
            "q": "Bina intezaar ke wahi 83,887 chhote writes 27–31 ms mein. Intezaar wale se tez kyun?",
            "choices": [
              "Callback ka baar-baar intezaar hata, aur Node ko writes queue karke jodne ka mauka mila",
              "Bina intezaar wale writes mein data aadha hi gaya — baaki tukde raaste mein gir gaye",
              "Intezaar wale run mein CPU dheema tha — dono runs alag machines par chale"
            ],
            "answer": 0,
            "hint": "Intezaar na ho toh Node ke paas tukde kahan jama hote hain?",
            "explain": "Intezaar wale run mein har 100 bytes ke baad callback ka intezaar. Bina intezaar Node tukdon ko queue karta hai aur jod sakta hai (writev). Lab sirf JavaScript calls aur poora samay ginta hai — kitni kernel calls hui aur farq ka kitna hissa kernel ka tha, alag tracing se pata chalega.",
            "choiceExplanations": [
              "Intezaar wale run mein har 100 bytes ke baad callback ka intezaar. Bina intezaar Node tukdon ko queue karta hai aur jod sakta hai (writev). Lab sirf JavaScript calls aur poora samay ginta hai — kitni kernel calls hui aur farq ka kitna hissa kernel ka tha, alag tracing se pata chalega.",
              "Receiver ne poore 8 MB gine; koi tukda nahi gira.",
              "Teeno tareeke ek hi machine aur ek hi process mein chale."
            ]
          }
        },
        {
          "title": "2. Syscall ≠ context switch",
          "say": "Video dono ko ek kehta hai. <b>Syscall</b>: CPU user mode se kernel mode jaata hai (jaise write()). <b>Context switch</b>: CPU ek thread ya process chhod ke doosre par jaata hai. Dono ka kharcha hai, par dono alag cheezein. Lab ex3 JavaScript write() calls ka samay naapta hai; syscalls alag nahi ginta."
        },
        {
          "title": "3. Naam",
          "say": "Data jama karke ek baar bhejna: <b>batching / buffering</b>. Program ka kernel se kaam karwana: <b>system call (syscall)</b>. Batching ka poora hisaab First Principles topic 1 (lab 45) mein."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Bytes, CPU aur chhote writes — asli runs",
      "project": "53-communication-tax",
      "exercise": "ex2-serialize",
      "goal": "1,00,000 orders JSON aur Protobuf mein: bytes, gzip aur CPU. Phir 8 MB: chhote writes vs ek write.",
      "why": "Node 22+ chahiye. Dono asli runs hain — samay har run mein badalta hai. Protobuf haath ka likha wire format hai, library nahi.",
      "steps": [
        {
          "text": "Lab folder se: serialization.",
          "cmd": "cd docker-labs/53-communication-tax && npm start -- ex2-serialize",
          "expect": "REAL RUN: Node v24.18.0; 1,00,000 seeded orders; each time = median of 5; timings change run to run\nprotobuf = hand-written Protobuf wire format (varint + length-delimited) in plain JavaScript, no library\nround trip: decode(encode(orders)) equals the original for both formats\n\none order, JSON : {\"id\":1000000,\"userId\":32157,\"amountPaise\":124034,\"city\":\"Bengaluru\",\"items\":[\"masala dosa\",\"dal makhani\",\"masala dosa\",\"gulab jamun\"],\"paid\":true}\none order bytes: JSON 147, protobuf 77\n\ntimes = elapsed/CPU ms (CPU = user + system of the whole process); objects ↔ wire bytes for both formats\nformat     bytes      gzip bytes   encode     decode\nJSON        12.57 MB     1.57 MB   30/30 ms   39/59 ms\nprotobuf     5.77 MB     1.54 MB   37/46 ms  70/119 ms\n\nprotobuf ÷ JSON bytes: 46%; after gzip: 98%\ngzip of the JSON: 122/123 ms to compress, 13/13 ms to decompress (elapsed/CPU)\n\ngzip depends on how much goes in ONE compressed response (bytes, same seeded orders):\norders per response   JSON gzip   protobuf gzip   protobuf ÷ JSON\n                  1         138              86               62%\n                 10         379             351               93%\n                100       1,925           1,941              101%\n              1,000      16,270          15,992               98%\n           1,00,000   15,73,156       15,37,532               98%"
        },
        {
          "text": "Chhote writes ka kharcha.",
          "cmd": "npm start -- ex3-writes",
          "expect": "REAL RUN: Node v24.18.0; 8 MB from one process to a receiver in the same process over loopback TCP\nclient CPU = user + kernel (system) time of this whole process, so the receiver is included; median of 3 runs\n\nway                                  write() calls   wall      user + kernel CPU\n100-byte writes, wait for each               83887   64.5 ms         50 + 24 ms\n100-byte writes, no waiting                  83887   27.2 ms         20 + 19 ms\none 8 MB write                                   1    4.0 ms           0 + 4 ms"
        }
      ],
      "observe": {
        "q": "Gzip ne JSON ko 12.57 MB se 1.57 MB kiya, par compress mein ~120–126 ms lage — encode ka ~4×. Gzip kab nuksaan karega?",
        "choices": [
          "Jab network tez aur sasta ho (data center ka LAN) aur CPU pehle se bhara — CPU ka bill bhari padta hai",
          "Kabhi nahi — kam bytes ka matlab hamesha kam samay hai, chahe network kitna bhi tez kyun na ho",
          "Jab data JSON ho — gzip sirf binary data par kaam karta hai, text par ulta bada karta hai"
        ],
        "answer": 0,
        "hint": "Bytes bachane ka fayda kab bada, aur CPU ka bill kab bhari?",
        "explain": "Gzip bytes ke badle CPU kharchta hai. Mobile ya mehnge network par bytes ka bill bada, toh gzip jeetta hai. Tez LAN par jahan CPU pehle se bhara ho, compress ka CPU bytes ki bachat se mehnga pad sakta hai. Dono naapo: network ka samay aur CPU.",
        "choiceExplanations": [
          "Gzip bytes ke badle CPU kharchta hai. Mobile ya mehnge network par bytes ka bill bada, toh gzip jeetta hai. Tez LAN par jahan CPU pehle se bhara ho, compress ka CPU bytes ki bachat se mehnga pad sakta hai. Dono naapo: network ka samay aur CPU.",
          "Compress ka samay bhi samay hai. Tez network par ~11 MB kam bhejne se bacha samay 120–126 ms ke compress se kam ho sakta hai.",
          "Lab mein gzip ne JSON text ko 12.57 se 1.57 MB kiya — text par gzip sabse accha kaam karta hai."
        ]
      },
      "lesson": "Bytes, CPU aur kernel ke safar teen alag bill hain. Protobuf bytes bachata hai, gzip bhi — CPU ke badle. Chhote writes kernel ke safar badhate hain; jodo, phir bhejo."
    },
    {
      "type": "bins",
      "title": "⚖️ Kya karoge: connection garam, baat kam, ya pehle naapo?",
      "instructions": "Har baar naya connection ya naye connection ka kharcha dikhe toh 🔌 chuno. Baar-baar chhoti baat (round trips, writes, services ki chatter) dikhe toh 🧺 chuno. Format ya compression badalne ka faisla bina naape ho raha ho toh 🔬 chuno.",
      "bins": [
        {
          "id": "reuse",
          "label": "🔌 Connection garam rakho"
        },
        {
          "id": "batch",
          "label": "🧺 Baat kam karo (jodo)"
        },
        {
          "id": "measure",
          "label": "🔬 Pehle naapo"
        }
      ],
      "items": [
        {
          "text": "Service A har request par B se naya HTTPS connection kholti hai; profile mein TLS handshake ka CPU 25%",
          "bin": "reuse",
          "explain": "Handshake har request par ho raha hai. Connection pool mein connections khule rakho — handshake ek baar. Lab ex1 A: naya connection har maang = samay ~1.8–1.9×, kernel CPU ~2×."
        },
        {
          "text": "Serverless function har invocation par database ka naya connection kholti hai; DB ki connection limit bhar rahi hai",
          "bin": "reuse",
          "explain": "Har invocation naya connection = handshakes aur DB par connection ka bojh. Connection ko invocations ke beech dobara use karo, ya beech mein connection pool (proxy) lagao."
        },
        {
          "text": "App ki screen 8 calls ek ke baad ek karti hai; har call agli call ke liye ek ID laati hai",
          "bin": "batch",
          "explain": "Tiki hui calls saath nahi ja sakti — 8 round trips. Ek chunky call banao jo server ke paas data ke saath jode: 1 round trip."
        },
        {
          "text": "Logger har log line par alag write() karta hai aur har write ka intezaar; 10 lakh lines/minute",
          "bin": "batch",
          "explain": "Har line par alag write aur har write ke callback ka intezaar. Lines buffer mein jodo, phir ek baar likho. Lab ex3: 100-byte writes ka intezaar ek bade write se ~15–20× dheema."
        },
        {
          "text": "Order aur pricing service har checkout par 40 baar baat karti hain; ek hi team, ek saath deploy, ek saath girti hain",
          "bin": "batch",
          "explain": "Itni chatter aur team, deploy, failure sab saath — dono ko ek service banana theek ho sakta hai. Seemaayein alag hon toh pehle chunky call se baat kam karo. Prime Video ke monitoring example (lab 16) mein components ek process mein laaye gaye taaki frames ka storage se aana-jaana aur orchestration ka bill ghate."
        },
        {
          "text": "Team JSON se Protobuf par jaana chahti hai \"CPU bachega\"; responses pehle se gzip; parsing ka profile kabhi nahi liya",
          "bin": "measure",
          "explain": "Badi gzip responses par bytes lagbhag barabar (lab ki poori list: 98%), aur CPU ka nateeja implementation par tika (lab mein V8 JSON tez). Pehle profile: parsing sach mein CPU kha raha hai?"
        },
        {
          "text": "Data center ke andar 300-byte responses; network khaali, CPU 80% bhara; ek engineer saare responses par gzip lagana chahta hai",
          "bin": "measure",
          "explain": "Chhote responses aur khaali network par bytes ki bachat chhoti; gzip ka CPU (lab: compress encode ka ~4×) bhare CPU par aur bojh. Pehle naapo: rukawat network hai ya CPU?"
        }
      ],
      "lesson": "Pehle poochho: bill kis cheez ka hai — handshake, round trips, kernel ke safar, bytes ya CPU? Handshake ke liye connection garam. Chatter ke liye jodo. Format aur compression ke liye pehle naapo."
    }
  ],
  "interview": {
    "title": "Interview Round — bill kis cheez ka?",
    "instructions": "Pehle socho: samay handshake mein, round trips mein, bytes mein, ya CPU mein ja raha hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Ek senior engineer kehta hai: \"Saari APIs JSON se Protobuf karo, 30% CPU bachega.\" Responses gzip hote hain. Pehle kya poochhoge?",
        "choices": [
          "Hamare profile mein parsing ka CPU kitna hai, aur gzip ke baad bytes kitne bachenge?",
          "Kuch nahi — binary format har language mein JSON se kam CPU leta hai, seedha badlo",
          "Sirf Protobuf ki kaunsi library lein — format badalna toh pakka faayda hai",
          "Kya JSON ke saath gzip band karke bytes ka farq aur bada dikhaya ja sakta hai?"
        ],
        "answer": 0,
        "explain": "30% ka koi naapa hua aadhaar chahiye. Lab ex2: Node mein V8 ka JSON JavaScript Protobuf se CPU par tez nikla, aur poori list par gzip ke baad bytes 98%. Pehle profile lo aur apne data par bytes naapo. Schema ka pakka contract chahiye toh format badalne ka alag, achha kaaran hai.",
        "choiceExplanations": [
          "30% ka koi naapa hua aadhaar chahiye. Lab ex2: Node mein V8 ka JSON JavaScript Protobuf se CPU par tez nikla, aur poori list par gzip ke baad bytes 98%. Pehle profile lo aur apne data par bytes naapo. Schema ka pakka contract chahiye toh format badalne ka alag, achha kaaran hai.",
          "Lab mein Node par JSON encode/decode Protobuf se tez nikla. \"Har language mein\" naapne se pehle mat maano.",
          "Faayda pakka nahi — gzip ke baad bytes lagbhag barabar, aur CPU implementation par tika.",
          "Gzip band karna asli faisle ko chhupata hai; users ko compression ka faayda abhi mil raha hai."
        ]
      },
      {
        "q": "Order aur pricing service har checkout par 30 baar baat karti hain (same data center, RTT 0.5 ms); checkout ke samay ka 40% in calls mein jaata hai. Kisi ne kaha: \"Dono ko ek service bana do.\" Kya kahoge?",
        "choices": [
          "Pehle chunky call se baat kam karo; jodna tab theek jab team, deploy aur failure bhi saath hon",
          "Turant jodo — har network call 11 din jitni mehngi hai, isliye services kabhi alag nahi honi chahiye",
          "Kabhi mat jodo — chhoti services hamesha behtar hain, chahe kitni bhi baat karein",
          "Kuch mat karo — 0.5 ms ka RTT itna chhota hai ki 30 calls ka koi asar ho hi nahi sakta"
        ],
        "answer": 0,
        "explain": "30 round trips ka bill asli hai (40% samay). Pehla ilaaj baat kam karna: chunky call ya batch. Services jodna physics ki taraf sahi disha hai, par teams, deploy aur failure ki seemaayein bhi faisla karti hain. Prime Video ke monitoring example mein S3 ke frame transfers aur Step Functions ke orchestration ka bill ghataane ke liye components ek process mein laaye gaye (lab 16).",
        "choiceExplanations": [
          "30 round trips ka bill asli hai (40% samay). Pehla ilaaj baat kam karna: chunky call ya batch. Services jodna physics ki taraf sahi disha hai, par teams, deploy aur failure ki seemaayein bhi faisla karti hain. Prime Video ke monitoring example mein S3 ke frame transfers aur Step Functions ke orchestration ka bill ghataane ke liye components ek process mein laaye gaye (lab 16).",
          "\"11 din\" sirf paimana hai (L1 = 1 second). Jodne ka faisla team aur deploy ki seemaon se bhi juda hai.",
          "Physics kehti hai baat ka bill hai; 40% samay usi bill ka. Seemaayein alag hon tab bhi baat kam karni chahiye.",
          "Sawal mein hi likha hai ki 40% samay in calls mein jaata hai. 30 round trips aur har call ka CPU judta hai."
        ]
      }
    ]
  },
  "success": [
    "JSON vs Protobuf ko bytes, gzip aur CPU par alag-alag tol sakte ho",
    "Chhote writes ka kharcha samjha sakte ho, aur syscall ko context switch se alag kar sakte ho",
    "Bata sakte ho kab connection garam karo, kab baat jodo, kab pehle naapo"
  ],
  "cards": [
    {
      "front": "JSON vs Protobuf (lab 53, 1,00,000 orders)?",
      "back": "Bytes: Protobuf 46%. Gzip ke baad: poori list par 98%, ek order par 62%. CPU: Node mein V8 ka C++ JSON JavaScript Protobuf se tez. CPU ka nateeja implementation par tika — naapo."
    },
    {
      "front": "Chhote writes ka kharcha?",
      "back": "8 MB, 100-byte writes, har ek ka intezaar: 63–65 ms. Ek 8 MB write: 3.2–4.1 ms (~15–20×). Har write() mein JavaScript, runtime aur kernel ka kaam; lab syscalls alag nahi ginta."
    },
    {
      "front": "Chatty services ko kab jodo?",
      "back": "Baat ka bill bada ho toh jodne par socho; team ownership, deploy aur failure isolation bhi jaancho. Warna pehle chunky call ya batch se baat kam karo. Lab 16 orchestration aur data transfer ka bill dikhata hai."
    }
  ]
}
]);
})();
