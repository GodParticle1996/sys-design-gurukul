/* First Principles — FAANG Senior Engineer.
   Source credit: The Anatomy of a Request (kt1tW0El6Gg), numbered video 4/15.
   Evidence: docker-labs/54-request-anatomy/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "name", "icon": "🔤", "label": "naam", "x": 140, "y": 105}, {"id": "dns", "icon": "📒", "label": "DNS", "x": 445, "y": 105}, {"id": "pkt", "icon": "✉️", "label": "packets", "x": 750, "y": 105}];
const EDGES = [{"from": "name", "to": "dns"}, {"from": "dns", "to": "pkt"}];
VISUALS["fp-req-kyun"] = { t: "Enter dabaya: pehle naam se number, phir data packets mein — server ka kaam abhi shuru bhi nahi hua.", html: SD.viz.svg(HERO, EDGES, { nodes: { name: {tone:'acc',badge:'api.khanakart.com'}, dns: {tone:'busy',badge:'95 ms cold'}, pkt: {tone:'ok',badge:'1,460 B / packet'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-req-kyun",
  "icon": "🛣️",
  "group": "🛣️ Anatomy of a Request",
  "title": "Request 1 · Kyun — Enter dabaya, server se pehle kya-kya?",
  "badge": "Packet Shishya",
  "objectives": [
    "Naam se IP tak DNS ki chain kaise chalti hai?",
    "Cold aur warm lookup mein samay ka farq kyun?",
    "Ek packet mein kitna data, aur headers ka bojh kitna?"
  ],
  "lesson": [
    "<h3>📮 Ramesh, Pune — itna kaafi nahi</h3><p>Dost ko parcel bhejna hai, par sirf naam pata hai: \"Ramesh, Pune\". Pehle pata dhoondo: Pune ki daak line se mohalla, mohalle se ghar ka number. Phir parcel ko courier ke lifaafe mein daalo, aur courier apne contracts se raasta chunta hai.</p><p>Browser mein URL daal ke Enter dabana bhi aisa hi hai. KhanaKart ka server request ko chhoone se pehle kai kadam ho chuke hote hain. Pehle kadam se shuru karte hain: naam se number.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📒 Naam diya, number chahiye — DNS ka safar",
      "goal": "Laptop ko api.khanakart.com ka IP chahiye. Resolver ki copy khaali hai. Lab 54 ka model: laptop ↔ resolver 5 ms, root 20 ms, TLD 30 ms, khanakart.com ka server 40 ms.",
      "nodes": [
        {
          "id": "lap",
          "icon": "💻",
          "label": "laptop",
          "x": 120,
          "y": 185
        },
        {
          "id": "res",
          "icon": "📒",
          "label": "resolver",
          "x": 360,
          "y": 185
        },
        {
          "id": "root",
          "icon": "🌐",
          "label": "root (.)",
          "x": 700,
          "y": 60
        },
        {
          "id": "tld",
          "icon": "🏷️",
          "label": "TLD (.com)",
          "x": 700,
          "y": 185
        },
        {
          "id": "auth",
          "icon": "🏠",
          "label": "khanakart.com",
          "x": 700,
          "y": 310
        }
      ],
      "edges": [
        {
          "from": "lap",
          "to": "res"
        },
        {
          "from": "res",
          "to": "root"
        },
        {
          "from": "res",
          "to": "tld"
        },
        {
          "from": "res",
          "to": "auth"
        }
      ],
      "viz": {
        "w": 890,
        "h": 380
      },
      "vars": [
        {
          "id": "clock",
          "label": "Ghadi"
        },
        {
          "id": "know",
          "label": "Resolver ko pata"
        },
        {
          "id": "ans",
          "label": "Jawab"
        }
      ],
      "steps": [
        {
          "title": "Laptop ka sawaal",
          "clock": "0 ms",
          "say": "Browser ke paas sirf naam hai: <b>api.khanakart.com</b>. Packet par number (IP) likhna padta hai. Laptop apne <b>resolver</b> se poochhta hai — ISP ka, ya 1.1.1.1 jaisa.",
          "nodes": {
            "lap": {
              "tone": "acc",
              "badge": "IP?"
            },
            "res": {
              "tone": "busy",
              "badge": "copy khaali"
            },
            "root": {
              "tone": "idle",
              "badge": ""
            },
            "tld": {
              "tone": "idle",
              "badge": ""
            },
            "auth": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "clock": "0 ms",
            "know": "kuch nahi",
            "ans": "—"
          },
          "flows": [
            {
              "from": "lap",
              "to": "res",
              "label": "",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Sabse upar se shuru",
          "clock": "20 ms",
          "say": "Resolver <b>root</b> server se poochhta hai (20 ms). Duniya mein 13 root naam hain, A se M.",
          "nodes": {
            "lap": {
              "tone": "idle",
              "badge": "intezaar"
            },
            "res": {
              "tone": "busy",
              "badge": "poochh raha"
            },
            "root": {
              "tone": "busy",
              "badge": "?"
            },
            "tld": {
              "tone": "idle",
              "badge": ""
            },
            "auth": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "clock": "20 ms",
            "know": "—",
            "ans": "—"
          },
          "flows": [
            {
              "from": "res",
              "to": "root",
              "label": "",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Root server api.khanakart.com ke baare mein kya batata hai?",
            "choices": [
              "IP nahi — sirf .com ke servers ka pata; aage .com ke servers se poochho",
              "Seedha IP — root ke paas duniya ke saare naamon ki poori list hai",
              "Kuch nahi — root sirf .in jaise desh ke naam sambhalta hai"
            ],
            "answer": 0,
            "hint": "Itne naam ek jagah rakhna mumkin hai?",
            "explain": "Root ko sirf itna pata hai ki .com kaun sambhalta hai. Jawab: \"main nahi jaanta, .com ke servers se poochho\" — saath mein .com servers ka address. Jitna upar ka server, utna kam detail.",
            "choiceExplanations": [
              "Root ko sirf itna pata hai ki .com kaun sambhalta hai. Jawab: \"main nahi jaanta, .com ke servers se poochho\" — saath mein .com servers ka address. Jitna upar ka server, utna kam detail.",
              "Root ke paas har naam ki list nahi; sirf top-level (.com, .in, .org) ke servers ka pata.",
              "Root .com, .in, .org — sab top-level ke servers ka pata deta hai."
            ]
          }
        },
        {
          "title": ".com se poochho",
          "clock": "50 ms",
          "say": "Resolver <b>.com</b> ke TLD server se poochhta hai (30 ms). Jawab: \"khanakart.com ka apna server hai: ns1.khanakart.com, address 127.0.0.4.\"",
          "nodes": {
            "lap": {
              "tone": "idle",
              "badge": "intezaar"
            },
            "res": {
              "tone": "busy",
              "badge": ".com ✓"
            },
            "root": {
              "tone": "ok",
              "badge": "bataya"
            },
            "tld": {
              "tone": "busy",
              "badge": "?"
            },
            "auth": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "clock": "50 ms",
            "know": ".com ka server",
            "ans": "—"
          },
          "flows": [
            {
              "from": "res",
              "to": "tld",
              "label": "",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Asli maalik",
          "clock": "90 ms",
          "say": "Resolver <b>khanakart.com</b> ke apne server (authoritative) se poochhta hai (40 ms). Lab mein sirf khanakart.com ke authoritative server ke paas asli record hai: <b>10.0.0.12, TTL 300</b> — 300 second tak copy rakh sakte ho.",
          "nodes": {
            "lap": {
              "tone": "idle",
              "badge": "intezaar"
            },
            "res": {
              "tone": "ok",
              "badge": "IP ✓"
            },
            "root": {
              "tone": "ok",
              "badge": ""
            },
            "tld": {
              "tone": "ok",
              "badge": "bataya"
            },
            "auth": {
              "tone": "ok",
              "badge": "10.0.0.12"
            }
          },
          "vars": {
            "clock": "90 ms",
            "know": ".com, khanakart.com, IP",
            "ans": "10.0.0.12 (TTL 300 s)"
          },
          "flows": [
            {
              "from": "res",
              "to": "auth",
              "label": "",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Resolver jawab laptop ko deta hai (5 ms). Laptop ne kul kitna intezaar kiya, aur abhi koi data gaya?",
            "choices": [
              "~95 ms, aur data abhi nahi — ab jaake TCP handshake shuru hoga",
              "~40 ms — sirf aakhri server ka jawab ginta hai, baaki pehle se pata tha",
              "~95 ms, aur saath mein order ka data bhi server tak pahunch gaya"
            ],
            "answer": 0,
            "hint": "Ghadi par 5 + 20 + 30 + 40?",
            "explain": "5 + 20 + 30 + 40 = 95 ms, aur ab tak sirf address mila. Asli request ke liye ab TCP aur TLS handshakes (topic 3) baaki hain. Lab ex1 ke asli UDP run mein cold lookup 100–101 ms.",
            "choiceExplanations": [
              "5 + 20 + 30 + 40 = 95 ms, aur ab tak sirf address mila. Asli request ke liye ab TCP aur TLS handshakes (topic 3) baaki hain. Lab ex1 ke asli UDP run mein cold lookup 100–101 ms.",
              "Resolver ki copy khaali thi; teeno servers se poochhna pada.",
              "DNS sirf naam se number banata hai. Order ka data alag connection par jaata hai."
            ]
          }
        },
        {
          "title": "Doosri baar",
          "clock": "5 ms",
          "say": "Agla user api.khanakart.com maangta hai: resolver copy se jawab deta hai — <b>~5 ms</b>, kisi server se nahi poochha. img.khanakart.com maange toh .com aur khanakart.com ke pate copy mein hain: sirf aakhri server, 5 + 40 = <b>45 ms</b>.",
          "nodes": {
            "lap": {
              "tone": "ok",
              "badge": "IP ✓"
            },
            "res": {
              "tone": "ok",
              "badge": "copy se"
            },
            "root": {
              "tone": "idle",
              "badge": ""
            },
            "tld": {
              "tone": "idle",
              "badge": ""
            },
            "auth": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "clock": "5 ms (nayi lookup)",
            "know": "sab copy mein",
            "ans": "10.0.0.12 (TTL ab kam)"
          },
          "flows": [
            {
              "from": "lap",
              "to": "res",
              "label": "",
              "tone": "ok"
            }
          ]
        }
      ],
      "lesson": "DNS ek chain hai: resolver root se .com, .com se khanakart.com ka server, aur khanakart.com ke authoritative server se IP. Har kadam ek round trip. Copy (cache) TTL tak chalti hai — doosri baar sirf laptop ↔ resolver."
    },
    {
      "type": "cards",
      "title": "✉️ Ek request, kitne lifaafe?",
      "goal": "IP mil gaya. Ab kernel data ko packets mein todta hai. Har packet par patte ke lifaafe (headers) chadhte hain. Lab 54 ex0 ka hisaab.",
      "lesson": "Aam Ethernet MTU 1,500 bytes; IPv4 + TCP headers (bina options) ke baad 1,460 data. Bada data kai packets, chhote messages par headers ka bada hissa. Bahut chhote messages ko jodna headers bachata hai.",
      "steps": [
        {
          "title": "1. Ek lifaafe ki hadd",
          "say": "Lab ka hisaab: aam Ethernet MTU <b>1,500 bytes</b>. Packet mein IPv4 header 20 bytes (kahan se, kahan tak) aur TCP header 20 bytes (ports, kram number, ack), bina options. Data ke liye bache <b>1,460</b>.",
          "ask": {
            "q": "10,000 bytes ka JSON jawab bhejna hai. Kitne packets?",
            "choices": [
              "7 — 10,000 ÷ 1,460 = 6.85, toh poore 7 packets",
              "1 — kernel poora jawab ek bade packet mein bhej deta hai",
              "10 — har packet mein theek 1,000 bytes jaate hain"
            ],
            "answer": 0,
            "hint": "Har packet mein kitna data jaata hai?",
            "explain": "Har packet mein 1,460 bytes data: 6 bhare packets = 8,760, baaki 1,240 saatwein mein. Kul 7. (TCP ka timestamps option laga ho toh 1,448 — tab bhi 7.)",
            "choiceExplanations": [
              "Har packet mein 1,460 bytes data: 6 bhare packets = 8,760, baaki 1,240 saatwein mein. Kul 7. (TCP ka timestamps option laga ho toh 1,448 — tab bhi 7.)",
              "1,500 se bada packet raaste ke Ethernet links par nahi jaata; kernel todta hai.",
              "Data ka hissa 1,460 bytes hai, 1,000 nahi."
            ]
          }
        },
        {
          "title": "2. Lifaafe ka bojh",
          "say": "Har packet par IP 20 + TCP 20 + Ethernet header 14 = <b>54 bytes</b> headers. Ethernet checksum (FCS), ACK, retry aur HTTP/TLS ke bytes is hisaab mein nahi.",
          "ask": {
            "q": "200 bytes ki API request. Bheje gaye bytes mein headers ka hissa kitna?",
            "choices": [
              "~21% — 54 ÷ (200 + 54); har 5 mein 1 byte header",
              "~3% — headers hamesha bahut chhota hissa hote hain",
              "~54% — 54 bytes ka header, toh 54%"
            ],
            "answer": 0,
            "hint": "Kul bheje gaye bytes kitne hue?",
            "explain": "54 ÷ 254 ≈ 21%. 1 MB par 685 packets × 54 = 37 KB, sirf 3.6%. Chhote messages par lifaafa bhaari; isliye bahut chhote messages ko jod ke bhejna (batching) bytes bachata hai.",
            "choiceExplanations": [
              "54 ÷ 254 ≈ 21%. 1 MB par 685 packets × 54 = 37 KB, sirf 3.6%. Chhote messages par lifaafa bhaari; isliye bahut chhote messages ko jod ke bhejna (batching) bytes bachata hai.",
              "3.6% bade data (1 MB) par hai. 200 bytes par lifaafa 21%.",
              "Percent kul bytes (200 + 54) ka nikalta hai, 100 ka nahi."
            ]
          }
        },
        {
          "title": "3. Naam",
          "say": "Naam se IP: <b>DNS</b>. Laptop ki taraf se poochhne wala: <b>recursive resolver</b>. Upar se neeche: <b>root</b> → <b>TLD</b> (.com) → <b>authoritative</b> server. Copy rakhne ki muddat: <b>TTL</b>. Packet ki hadd: <b>MTU</b>; data ka hissa: <b>MSS</b>; upar ki jaankari: <b>headers</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Lifaafe ka hisaab, aur asli DNS packets",
      "project": "54-request-anatomy",
      "exercise": "ex1-dns",
      "goal": "Pehle packet ka hisaab. Phir asli UDP DNS: root, .com aur khanakart.com ke servers loopback par, ek resolver copy ke saath.",
      "why": "Node 22+ chahiye. ex0 haath ka hisaab hai. ex1 asli UDP packets bhejta hai (DNS wire format); har server ka round trip model hai, samay thoda badalta hai.",
      "steps": [
        {
          "text": "Lab folder se: packet ka hisaab.",
          "cmd": "cd docker-labs/54-request-anatomy && npm start -- ex0-slowmo packet",
          "expect": "== packet: Ethernet MTU 1500 bytes; IPv4 header 20 + TCP header 20 (no options) → 1460 bytes of data per segment ==\n        200 bytes of data →   1 segment ; headers     54 bytes (IP + TCP + Ethernet 54 each) = 21.3% of what is sent\n     10,000 bytes of data →   7 segments; headers    378 bytes (IP + TCP + Ethernet 54 each) = 3.6% of what is sent\n  10,00,000 bytes of data → 685 segments; headers 36,990 bytes (IP + TCP + Ethernet 54 each) = 3.6% of what is sent\n  with the common TCP timestamps option (+12 bytes) a segment carries 1448 bytes; Ethernet also adds a 4-byte checksum"
        },
        {
          "text": "Asli DNS chain.",
          "cmd": "npm start -- ex1-dns",
          "expect": "REAL RUN: Node v24.18.0; real UDP packets in DNS wire format; MODEL delays: you ↔ resolver 5 ms, root 20, TLD 30, authoritative 40 ms\n\nlookups through the resolver (as your laptop would):\n  api.khanakart.com     100 ms  resolver asked 3 server(s)  → 10.0.0.12 (TTL 300 s)   cold: root → TLD → authoritative\n  api.khanakart.com       6 ms  resolver asked 0 server(s)  → 10.0.0.12 (TTL 300 s)   warm: from the resolver cache\n  img.khanakart.com      46 ms  resolver asked 1 server(s)  → 10.0.0.13 (TTL 300 s)   sibling: .com and khanakart.com referrals cached\n  nope.khanakart.com     47 ms  resolver asked 1 server(s)  → NXDOMAIN   name does not exist (this lab does not cache NXDOMAIN)\n\n1,000 more lookups of api.khanakart.com within its TTL: resolver asked 0 upstream servers (root +0, authoritative +0)\nNode's own resolver (c-ares) via this resolver: khanakart.com → [{\"address\":\"10.0.0.10\",\"ttl\":300}]\nqueries seen: root 1, TLD 1, authoritative 4"
        }
      ],
      "observe": {
        "q": "1,000 aur lookups ke baad bhi root aur khanakart.com ke server tak 0 naye sawaal gaye. Kyun?",
        "choices": [
          "Jawab TTL (300 s) ke andar resolver ki copy se aaya — upar jaana hi nahi pada",
          "Root server ne 1,000 sawaal ek saath jod ke ek hi baar mein jawab de diya",
          "Lab ne lookups ginna band kar diya — 1,000 ke baad counter ruk jaata hai"
        ],
        "answer": 0,
        "hint": "Pehli lookup ke baad resolver ke paas kya bacha?",
        "explain": "Pehli lookup ne jawab TTL 300 s ke saath copy mein rakha. Agle 1,000 lookups 300 s ke andar the, toh resolver ne copy se diya — upstream servers tak 0 sawaal. Resolver ka cache root aur .com servers ko duniya bhar ke traffic se bachati hai.",
        "choiceExplanations": [
          "Pehli lookup ne jawab TTL 300 s ke saath copy mein rakha. Agle 1,000 lookups 300 s ke andar the, toh resolver ne copy se diya — upstream servers tak 0 sawaal. Resolver ka cache root aur .com servers ko duniya bhar ke traffic se bachati hai.",
          "Har lookup alag sawaal hai; servers sawaal nahi jodte. Bachat resolver ki copy ki hai.",
          "Counter chalta raha: resolver ne upstream ke 0 sawaal gine, kyunki copy se jawab diya."
        ]
      },
      "lesson": "Packet ka lifaafa chhote messages par bhaari. DNS ki chain cold par ~100 ms, copy par ~5 ms — aur copy hi poore internet ka bojh sambhalti hai."
    }
  ],
  "interview": {
    "title": "Interview Round — request ka pehla hissa",
    "instructions": "Pehle socho: server ka kaam shuru hone se pehle kaun se kadam hue, aur kaunse kadam cache se poore hue? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Pehli aur agli responses ka size aur transfer time barabar hai; server queueing aur handler time bhi normal. Phir bhi naye region ki pehli request ~300 ms dheemi, agli tez. Pehle kya compare karoge?",
        "choices": [
          "Pehli request ke extra kadam: cold DNS lookup aur naya connection, aur resolver ki doori",
          "Handler ka CPU profile — pehli request par code ka koi hissa dheema chal raha hoga",
          "Database ka cache — pehli query hamesha disk se padhti hai, isliye dheemi",
          "Response ka size — pehla response bada hoga, isliye network par dheema pahuncha"
        ],
        "answer": 0,
        "explain": "Queueing, handler aur transfer barabar hain, toh farq connection banne se pehle ke kadmon mein hai. Cold DNS (resolver ki khaali copy par root → .com → domain server), connect aur TLS ki timings compare karo; agli requests copy aur khule connection par chalti hain. Resolver ki user se doori bhi naapo.",
        "choiceExplanations": [
          "Queueing, handler aur transfer barabar hain, toh farq connection banne se pehle ke kadmon mein hai. Cold DNS (resolver ki khaali copy par root → .com → domain server), connect aur TLS ki timings compare karo; agli requests copy aur khule connection par chalti hain. Resolver ki user se doori bhi naapo.",
          "Handler time har baar normal hai; farq handler ke bahar hai.",
          "Database handler ke andar aata hai, aur handler time normal hai.",
          "Sawaal mein responses ka size aur transfer time barabar diya hai."
        ]
      },
      {
        "q": "Ek telemetry service har second 50,000 messages bhejti hai, har message 100 bytes ka, alag-alag packet mein. Link par bheje ja rahe bytes ummeed se zyada hain. Kya dikhega?",
        "choices": [
          "Headers ka bada hissa — 54 ÷ (100 + 54) ≈ 35%; messages ko jod ke bhejo",
          "Headers ka koi farq nahi — 54 bytes har packet par, chahe message kitna bhi bada ho",
          "Sirf data ke bytes jaate hain — headers link par gine hi nahi jaate",
          "Message ko 200 bytes kar do — bade messages par headers apne aap gayab ho jaate hain"
        ],
        "answer": 0,
        "explain": "Har chhote message par 54 bytes ka lifaafa: 54 ÷ 154 ≈ 35% bytes headers ke. 10 messages ek packet mein jodo (1,000 bytes data) toh headers ~5%. Isliye batching.",
        "choiceExplanations": [
          "Har chhote message par 54 bytes ka lifaafa: 54 ÷ 154 ≈ 35% bytes headers ke. 10 messages ek packet mein jodo (1,000 bytes data) toh headers ~5%. Isliye batching.",
          "54 bytes har packet par hain — 100-byte message par bada hissa, 1 MB par chhota.",
          "Link par headers bhi bandwidth lete hain; provider bill mein kaunse bytes ginta hai, contract par depend karta hai.",
          "Headers har packet par rehte hain; bada message sirf headers ka hissa ghatata hai."
        ]
      }
    ]
  },
  "success": [
    "DNS ki chain (resolver → root → TLD → authoritative) gin sakte ho",
    "Cold aur warm lookup ka samay samjha sakte ho",
    "Packet aur headers ka hisaab laga sakte ho"
  ],
  "cards": [
    {
      "front": "Cold DNS lookup ke kadam?",
      "back": "Laptop → resolver; resolver → root (.com kaun?) → TLD (khanakart.com kaun?) → authoritative (IP + TTL). Lab model: 5 + 20 + 30 + 40 = 95 ms; asli UDP run 100–101 ms."
    },
    {
      "front": "Warm lookup?",
      "back": "Resolver ki copy TTL tak chalti hai: sirf laptop ↔ resolver (~5 ms). Lab: 1,000 lookups, upstream servers par 0 sawaal."
    },
    {
      "front": "MTU aur headers?",
      "back": "Lab ka hisaab: MTU 1,500; IPv4 20 + TCP 20 (bina options) → 1,460 data. Ethernet header 14 jodo: 54 bytes har packet. 200-byte request par 21%, 1 MB par 3.6%. FCS, ACK aur TLS bytes is hisaab mein nahi."
    }
  ]
}
]);
})();
