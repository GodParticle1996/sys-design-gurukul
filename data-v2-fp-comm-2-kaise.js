/* First Principles — FAANG Senior Engineer.
   Source credit: The Cost of Communication (YOR9hAFoe2o), numbered video 3/15.
   Evidence: docker-labs/53-communication-tax/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "📱", "label": "checkout page", "x": 140, "y": 105}, {"id": "net", "icon": "🌐", "label": "raasta 20 ms", "x": 445, "y": 105}, {"id": "srv", "icon": "🖥️", "label": "server", "x": 750, "y": 105}];
const EDGES = [{"from": "app", "to": "net"}, {"from": "net", "to": "srv"}];
VISUALS["fp-comm-kaise"] = { t: "Garam socket, phir bhi 50 maangein 1 second. Handshake ka ilaaj ho gaya — line ka ilaaj kya?", html: SD.viz.svg(HERO, EDGES, { nodes: { app: {tone:'acc',badge:'50 maang'}, net: {tone:'slow',badge:'1 socket: line'}, srv: {tone:'ok',badge:'kaam chhota'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-comm-kaise",
  "icon": "📡",
  "group": "📡 Cost of Communication",
  "title": "Communication 2 · Kaise — connection garam, line chhoti, darwaza paas",
  "badge": "Connection Saadhak",
  "objectives": [
    "Connection reuse kya bachata hai aur kya nahi?",
    "Pooling aur multiplexing mein farq kya hai?",
    "TLS 1.3, QUIC aur CDN edge round trips kaise ghatate hain?"
  ],
  "lesson": [
    "<h3>🍱 Dabbawala ki teen tarkeebein</h3><p>Ek dabbawala ki cycle pehle se tayyar hai, par dabbawala ek chakkar mein ek hi dabba le jaata hai — 50 dabbe, 50 chakkar. Doosra raasta: 50 dabbawale, har ek pehle apni cycle tayyar kare, phir sab saath niklein. Teesra: ek dabbawala, ek bada thaila, 50 dabbe ek chakkar mein.</p><p>KhanaKart ke checkout ko 50 daam ek saath chahiye. Dekho kaunsa tareeka kitna leta hai — lab mein asli connections par naapa.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📦 50 parcel, ek dabbawala?",
      "goal": "KhanaKart ke checkout page ko ek saath 50 cheezon ke daam chahiye. Server 20 ms door (RTT). Lab 53 ex1 B: delay proxy ka model, naye connection par +1 RTT.",
      "nodes": [
        {
          "id": "app",
          "icon": "📱",
          "label": "checkout page",
          "x": 140,
          "y": 105
        },
        {
          "id": "net",
          "icon": "🌐",
          "label": "raasta 20 ms",
          "x": 445,
          "y": 105
        },
        {
          "id": "srv",
          "icon": "🖥️",
          "label": "server",
          "x": 750,
          "y": 105
        }
      ],
      "edges": [
        {
          "from": "app",
          "to": "net"
        },
        {
          "from": "net",
          "to": "srv"
        }
      ],
      "viz": {
        "w": 890,
        "h": 215
      },
      "vars": [
        {
          "id": "way",
          "label": "Tareeka"
        },
        {
          "id": "conns",
          "label": "Naye connections"
        },
        {
          "id": "time",
          "label": "Samay (lab)"
        }
      ],
      "steps": [
        {
          "title": "50 maangein, ek pal",
          "clock": "0 ms",
          "say": "Page ko 50 daam ek saath chahiye. App ke paas HTTP/1.1 ka <b>ek khula socket</b> hai — pehle se garam, handshake ho chuka.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "50 maang"
            },
            "net": {
              "tone": "idle",
              "badge": ""
            },
            "srv": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "HTTP/1.1, 1 khula socket",
            "conns": "0",
            "time": "—"
          }
        },
        {
          "title": "Ek socket, ek waqt ek maang",
          "clock": "21 ms",
          "say": "Lab ka HTTP/1.1 client (aam browsers ki tarah) pipelining nahi karta: ek socket par ek waqt <b>ek</b> maang: maang 1 jaati hai, 20 ms baad jawab, tab maang 2. Dabbawala ek baar mein ek hi dabba le jaata hai.",
          "nodes": {
            "app": {
              "tone": "slow",
              "badge": "49 line mein"
            },
            "net": {
              "tone": "busy",
              "badge": "maang 1"
            },
            "srv": {
              "tone": "busy",
              "badge": "jawab 1"
            }
          },
          "vars": {
            "way": "HTTP/1.1, 1 khula socket",
            "conns": "0",
            "time": "maang 1: ~21 ms"
          },
          "flows": [
            {
              "from": "app",
              "to": "net",
              "label": "#1",
              "tone": "slow"
            },
            {
              "from": "net",
              "to": "srv",
              "label": "",
              "tone": "slow"
            }
          ],
          "ask": {
            "q": "Socket garam hai, handshake nahi lagta. 50 maangein kitne mein poori hongi?",
            "choices": [
              "~1,050 ms — 50 maangein ek line mein, har maang ~21 ms ki",
              "~21 ms — socket garam hai, toh saari maangein ek round trip mein",
              "~40 ms — garam socket par do round trips mein sab ho jaata hai"
            ],
            "answer": 0,
            "hint": "Ek socket par ek waqt kitni maangein chal sakti hain?",
            "explain": "Garam socket handshake bachata hai, line nahi. Ek waqt ek maang: 50 × ~21 ms ≈ 1,050 ms. Lab ex1 B: 1,052–1,055 ms.",
            "choiceExplanations": [
              "Garam socket handshake bachata hai, line nahi. Ek waqt ek maang: 50 × ~21 ms ≈ 1,050 ms. Lab ex1 B: 1,052–1,055 ms.",
              "Garam hone se handshake bacha, par HTTP/1.1 socket par maangein phir bhi ek-ek karke jaati hain.",
              "Do round trips mein sirf do maangein. Baaki 48 line mein."
            ]
          }
        },
        {
          "title": "50 naye sockets",
          "clock": "45–50 ms",
          "say": "Doosra tareeka: <b>50 naye sockets</b>, sab saath. Har socket pehle handshake (model: +1 RTT), phir apni maang. Model kehta hai 2 RTT = 40 ms; lab mein <b>45–50 ms</b> — 50 connections banane ka asli kaam bhi juda.",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": "50 sockets"
            },
            "net": {
              "tone": "busy",
              "badge": "50 handshake"
            },
            "srv": {
              "tone": "busy",
              "badge": "50 maang"
            }
          },
          "vars": {
            "way": "HTTP/1.1, 50 naye sockets",
            "conns": "50",
            "time": "45–50 ms"
          },
          "flows": [
            {
              "from": "app",
              "to": "net",
              "label": "×50",
              "tone": "acc"
            },
            {
              "from": "net",
              "to": "srv",
              "label": "",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Ek connection, 50 dabbe",
          "clock": "23 ms",
          "say": "Teesra tareeka: <b>HTTP/2</b>. Ek hi connection par 50 maangein saath — har maang ek alag <b>stream</b>. Connection pehle se garam: ek round trip, <b>23 ms</b>. Dabbawala ek thaila bhar ke 50 dabbe ek baar mein le gaya.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "50 ✓"
            },
            "net": {
              "tone": "ok",
              "badge": "1 RTT"
            },
            "srv": {
              "tone": "ok",
              "badge": "50 jawab"
            }
          },
          "vars": {
            "way": "HTTP/2, 1 khula connection",
            "conns": "0",
            "time": "23 ms"
          },
          "flows": [
            {
              "from": "app",
              "to": "net",
              "label": "50 streams",
              "tone": "ok"
            },
            {
              "from": "net",
              "to": "srv",
              "label": "",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "HTTP/2 connection thanda ho (abhi khulna baaki) toh lab mein kitna lagega?",
            "choices": [
              "~42–44 ms — ek handshake (+1 RTT), phir 50 maangein saath",
              "~1,050 ms — thanda connection pehle 50 maangon ki line banata hai",
              "~23 ms — HTTP/2 mein handshake ka samay lagta hi nahi"
            ],
            "answer": 0,
            "hint": "Thande connection ko maangon se pehle kya chahiye?",
            "explain": "Thanda connection ek baar handshake karta hai (model: +1 RTT), phir 50 streams saath: lab mein 42–44 ms. Garam connection par 23 ms. Lab ki 50 chhoti maangein HTTP/2 streams par saath chali, isliye HTTP/1.1 jaisi ek-ek wali line nahi lagi. Asli HTTP/2 mein stream ki hadd, flow control aur TCP packet loss phir bhi intezaar kara sakte hain.",
            "choiceExplanations": [
              "Thanda connection ek baar handshake karta hai (model: +1 RTT), phir 50 streams saath: lab mein 42–44 ms. Garam connection par 23 ms. Lab ki 50 chhoti maangein HTTP/2 streams par saath chali, isliye HTTP/1.1 jaisi ek-ek wali line nahi lagi. Asli HTTP/2 mein stream ki hadd, flow control aur TCP packet loss phir bhi intezaar kara sakte hain.",
              "Lab ka HTTP/1.1 client bina pipelining ek-ek maang bhejta hai; HTTP/2 ki 50 streams is run mein saath chali.",
              "HTTP/2 bhi TCP par chalta hai; naye connection par TCP handshake lagta hai (lab mein +1 RTT ka model, TLS nahi)."
            ]
          }
        },
        {
          "title": "Do alag ilaaj",
          "clock": "—",
          "say": "Kuch connections khule rakh ke dobara use karna: <b>connection pooling</b> (handshake bachata hai). Ek connection par kai maangein saath: <b>multiplexing</b> (line todta hai). Pool ka ek garam HTTP/1.1 socket: 1,050 ms. HTTP/2 multiplexing: 23 ms.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "pool + h2"
            },
            "net": {
              "tone": "ok",
              "badge": "kam RTT"
            },
            "srv": {
              "tone": "ok",
              "badge": ""
            }
          },
          "vars": {
            "way": "pool ≠ multiplexing",
            "conns": "—",
            "time": "1,050 vs 23 ms"
          }
        }
      ],
      "lesson": "Garam connection handshake bachata hai; multiplexing line todta hai. Bina pipelining ke HTTP/1.1 ka ek socket ek waqt ek maang chalata hai, chahe garam ho. Kai maangein saath chahiye toh HTTP/2 ka ek connection, ya HTTP/1.1 par kai sockets ka pool."
    },
    {
      "type": "cards",
      "title": "🌍 Doori ka ilaaj — kam round trips, paas wala darwaza",
      "goal": "San Francisco ka user, server London mein (RTT 86.2 ms). Pehle byte tak kitne round trips? Lab 53 ex4 ka model.",
      "lesson": "Doori nahi ghatti, round trips ghat sakte hain: TLS 1.3, QUIC, khula connection. CDN edge user ke paas handshake karta hai aur origin tak connection garam rakhta hai. 0-RTT data dobara chal sakta hai — sirf safe maangon ke liye.",
      "steps": [
        {
          "title": "1. Round trips gino",
          "say": "Naya connection, SF → London (RTT 86.2 ms):<br>• HTTP/1.1 + TLS 1.2: 4 RTT = <b>345 ms</b><br>• TCP + TLS 1.3: 3 RTT = <b>258 ms</b><br>• HTTP/3 (QUIC: transport ka set-up aur TLS 1.3 saath, UDP par): 2 RTT = <b>172 ms</b><br>• Khula connection: 1 RTT = <b>86 ms</b>"
        },
        {
          "title": "2. Darwaza paas lao",
          "say": "SF mein CDN ka edge server: user ↔ edge 5 ms. Edge ka London tak connection pehle se garam. Seedha London: 3 × 86 = 258 ms.",
          "ask": {
            "q": "Edge ke paas jawab nahi (cache miss) — maang London tak jaayegi. Phir bhi samay 258 ms se kitna?",
            "choices": [
              "~101 ms — handshakes 5 ms door edge par; edge → London ek garam round trip",
              "~258 ms — cache miss par maang London jaati hai, toh bill seedhe jitna",
              "~15 ms — edge har maang ka jawab de deta hai, cache ho ya na ho"
            ],
            "answer": 0,
            "hint": "Handshakes kahan hue, aur edge → London ka connection kaisa tha?",
            "explain": "Handshakes edge par: 2 × 5 ms. Maang user → edge 5 ms, edge → London garam connection par ek round trip 86 ms. Kul ~101 ms. Cache hit par London jaana hi nahi: 3 × 5 = 15 ms.",
            "choiceExplanations": [
              "Handshakes edge par: 2 × 5 ms. Maang user → edge 5 ms, edge → London garam connection par ek round trip 86 ms. Kul ~101 ms. Cache hit par London jaana hi nahi: 3 × 5 = 15 ms.",
              "Miss par bhi handshakes paas wale edge par hote hain; lamba raasta sirf ek baar, garam connection par.",
              "15 ms sirf cache hit par. Miss par edge ko London se laana padta hai."
            ]
          }
        },
        {
          "title": "3. 0-RTT ka khatra",
          "say": "Pichhle connection ka ticket bacha ho aur server early data maan le, toh QUIC <b>0-RTT</b> mein maang pehle packets ke saath chali jaati hai — lab ke model mein jawab 1 RTT, 86 ms. (TLS 1.3 ka early data naye TCP connection par TCP ka round trip phir bhi leta hai.)",
          "ask": {
            "q": "Kya \"₹500 ka payment karo\" maang 0-RTT data mein bhejni chahiye?",
            "choices": [
              "Nahi — 0-RTT data ko koi pakad ke dobara bhej sakta hai; sirf dobara chalne par safe maangein bhejo",
              "Haan — 0-RTT sabse tez hai, aur TLS ki encryption dobara bhejne se poori tarah bachati hai",
              "Haan — payment jaisi zaroori maang ko hi sabse tez raasta milna chahiye"
            ],
            "answer": 0,
            "hint": "Raaste mein koi 0-RTT packet copy karke server ko dobara de de toh?",
            "explain": "0-RTT data replay ho sakta hai: koi packet copy karke dobara bhej de toh server maang dobara chala sakta hai. TLS 1.3 ka RFC 8446 0-RTT ko sirf aisi maangon ke liye theek maanta hai jo dobara chalne par nuksaan na karein — jaise menu padhna. Payment nahi.",
            "choiceExplanations": [
              "0-RTT data replay ho sakta hai: koi packet copy karke dobara bhej de toh server maang dobara chala sakta hai. TLS 1.3 ka RFC 8446 0-RTT ko sirf aisi maangon ke liye theek maanta hai jo dobara chalne par nuksaan na karein — jaise menu padhna. Payment nahi.",
              "Encryption padhne se bachati hai, dobara bhejne (replay) se nahi.",
              "Tez raasta tabhi theek jab dobara chalne par nuksaan na ho. Payment do baar kat sakta hai."
            ]
          }
        },
        {
          "title": "4. Naam",
          "say": "Paas ka server jo jawab rakhta aur origin tak connection garam rakhta hai: <b>CDN edge</b>. UDP par transport ka set-up aur TLS 1.3 handshake saath karne wala protocol: <b>QUIC</b> (HTTP/3). Handshake ke saath maang: <b>0-RTT</b> (replay ka khatra). Kuch connections khule rakho: <b>connection pool</b>. Ek connection par kai maangein: <b>multiplexing</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Asli connections: naya, garam, HTTP/2",
      "project": "53-communication-tax",
      "exercise": "ex1-reuse",
      "goal": "A: loopback par 2,000 maangein ek ke baad ek — naya connection har maang vs keep-alive vs HTTP/2, aur dono taraf ka CPU. B: 20 ms RTT par 50 maangein saath. Phir doori ka model.",
      "why": "Node 22+ chahiye. ex1 asli run hai (asli TCP, HTTP/1.1 aur HTTP/2, alag server process) — samay har run mein badalta hai. B ka delay proxy model hai. ex4 haath ka hisaab hai.",
      "steps": [
        {
          "text": "Lab folder se: asli connections.",
          "cmd": "cd docker-labs/53-communication-tax && npm start -- ex1-reuse",
          "expect": "REAL RUN: Node v24.18.0; server is a separate process on 127.0.0.1; timings change run to run\n\nA) loopback, 2000 requests one after another (GET /order/:id, small JSON)\n   conns = TCP connections the server saw (HTTP/2: sessions); CPU in ms, user + kernel (system)\n   every way warmed up first (300 untimed requests); then 3 rounds in rotating order; each column = median\n   way                     wall      conns   client user+kernel   server user+kernel\n   new connection each       401 ms   2000         231 + 150 ms          139 + 78 ms\n   keep-alive (1 socket)     223 ms      1          119 + 55 ms           63 + 47 ms\n   HTTP/2 (1 connection)     246 ms      1          120 + 37 ms           85 + 47 ms\n\nB) through a delay proxy: RTT 20 ms; MODEL: TCP handshake = 1 extra RTT counted from accept (bytes sent at once wait for it); TLS not modelled\n   50 requests needed at the same moment; \"warm\" = the connection was opened before the clock started\n   an untimed burst of 50 connects to each proxy runs first (warm-up)\n   way                          wall      new connections\n   HTTP/1.1, 1 warm socket       1052 ms      0\n   HTTP/1.1, 50 new sockets        47 ms     50\n   HTTP/2, 1 cold connection       44 ms      1\n   HTTP/2, 1 warm connection       23 ms      0"
        },
        {
          "text": "Doori aur round trips ka model.",
          "cmd": "npm start -- ex4-geo",
          "expect": "MODEL: great-circle distance, light in fiber 200,000 km/s, DNS already cached, server work 0 ms.\nReal fiber routes are longer than the great circle, and routers add delay: these are lower bounds.\n\nroute                              distance   one RTT\nSan Francisco → London              8,616 km   86.2 ms\nMumbai → Singapore                  3,904 km   39.0 ms\nMumbai → Frankfurt                  6,564 km   65.6 ms\nMumbai → Ashburn (US-East)         12,854 km  128.5 ms\nDelhi → Bengaluru                   1,740 km   17.4 ms\n\ntime to first byte, San Francisco → London (one RTT 86.2 ms):\n  HTTP/1.1 + TLS 1.2, new connection       4 RTT = 345 ms   (TCP 1 + TLS 2 + request 1)\n  HTTP/1.1 or 2 + TLS 1.3, new connection  3 RTT = 258 ms   (TCP 1 + TLS 1 + request 1)\n  HTTP/3 (QUIC), new connection            2 RTT = 172 ms   (QUIC+TLS together 1 + request 1)\n  HTTP/3 (QUIC) 0-RTT resumption           1 RTT =  86 ms   (request rides with the handshake)\n  any protocol, reused (warm) connection   1 RTT =  86 ms   (request 1)\n\nwith a CDN edge in San Francisco (MODEL: user ↔ edge RTT 5 ms; edge keeps a warm connection to London):\n  TLS 1.3 to the edge, cache miss      2 × 5 (handshakes) + 5 + 86 (edge → London) = 101 ms\n  TLS 1.3 to the edge, cache hit       3 × 5 = 15 ms\n  direct to London, TLS 1.3            3 × 86 = 258 ms"
        }
      ],
      "observe": {
        "q": "A mein doori shunya hai (loopback), phir bhi har maang par naya connection: samay ~1.8–1.9× aur kernel CPU ~2×. Kyun?",
        "choices": [
          "Connection banana aur todna kernel ka kaam hai — socket, set-up ke packets, safai; doori na ho tab bhi",
          "Loopback par bhi roshni ko cable mein chalna padta hai, isliye har naya connection dheema",
          "Naye connections par server galti se har maang do baar chalata hai, isliye CPU dugna"
        ],
        "answer": 0,
        "hint": "Doori shunya hai, toh extra samay kis kaam ka hai?",
        "explain": "Har naye connection ke liye dono taraf kernel socket banata hai, handshake ke packets sambhalta hai, aur band hone par safai karta hai. Loopback par round trip lagbhag shunya, par kaam shunya nahi: lab mein samay ~1.8–1.9× (401–448 vs 223–242 ms) aur client ka kernel CPU 113–150 vs 55–62 ms.",
        "choiceExplanations": [
          "Har naye connection ke liye dono taraf kernel socket banata hai, handshake ke packets sambhalta hai, aur band hone par safai karta hai. Loopback par round trip lagbhag shunya, par kaam shunya nahi: lab mein samay ~1.8–1.9× (401–448 vs 223–242 ms) aur client ka kernel CPU 113–150 vs 55–62 ms.",
          "Loopback par packet cable mein nahi jaata; kernel ke andar hi pahunchta hai. Extra samay kaam ka hai.",
          "Server har maang ek baar chalata hai; lab server ki ginti 2,000 maangein, 2,000 connections dikhati hai."
        ]
      },
      "lesson": "Connection ka kharcha doori ke bina bhi hai: kernel ka kaam aur CPU. Garam connection kernel ka kaam aur CPU dono bachata hai. Kai maangein saath ho toh HTTP/2 ek connection par line todta hai; HTTP/1.1 ka ek socket nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — connection ka hisaab",
    "instructions": "Pehle socho: handshake ka kharcha hai, ya line ka, ya doori ka? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Service A har maang par service B se naya HTTPS connection kholti hai. Dono ek hi region mein (RTT 1 ms). Team kehti hai: \"Same region hai, connection ka kharcha kuch nahi.\" Kya kahoge?",
        "choices": [
          "Kharcha hai: har maang par 2 extra round trips, TLS ka CPU, kernel ka kaam — pool lagao",
          "Team sahi hai — RTT 1 ms hai, toh handshake ke 2 ms kisi ginti mein nahi aate",
          "Kharcha sirf B par hai — A ki taraf connection banana bilkul muft hai",
          "Kharcha tabhi jab payload bada ho — chhoti maangon par connection ka koi bill nahi"
        ],
        "answer": 0,
        "explain": "Round trips 1 ms ke hain, par har maang par 2 extra (TCP + TLS), aur TLS ki chaabi banana CPU khaata hai. Lab ex1 A: doori shunya par bhi naya connection har maang = samay ~1.8–1.9× aur kernel CPU ~2×, dono taraf. Pool mein connections khule rakho.",
        "choiceExplanations": [
          "Round trips 1 ms ke hain, par har maang par 2 extra (TCP + TLS), aur TLS ki chaabi banana CPU khaata hai. Lab ex1 A: doori shunya par bhi naya connection har maang = samay ~1.8–1.9× aur kernel CPU ~2×, dono taraf. Pool mein connections khule rakho.",
          "2 ms har maang par, plus CPU dono taraf. Hazaaron maangon par seedha bill banta hai.",
          "Lab mein client ka kernel CPU bhi ~2× badha (113–150 vs 55–62 ms). Dono taraf kaam hai.",
          "Connection ka kharcha payload se alag hai; lab mein chhoti JSON maangon par hi samay ~1.8–1.9× hua."
        ]
      },
      {
        "q": "HTTP/1.1 client ka pool sirf 1 connection rakhta hai. Page 50 images ek saath maangta hai, RTT 20 ms, aur page ~1 s le raha hai. Connection pehle se garam hai. Sabse seedha ilaaj?",
        "choices": [
          "Line todo — HTTP/2 par ek connection mein 50 streams saath, ya pool mein zyada sockets",
          "Keep-alive chalu karo — garam connection handshake bachakar line khatam kar dega",
          "Server ka CPU dugna karo — tez server har maang ka jawab aadhe samay mein dega",
          "Images ko gzip karo — kam bytes se har maang ka samay aadha ho jaayega"
        ],
        "answer": 0,
        "explain": "Connection garam hai, toh handshake samasya nahi. Samasya line hai: bina pipelining ke ek HTTP/1.1 socket par ek waqt ek maang, 50 × ~21 ms. Lab ex1 B: 1,052–1,055 ms; HTTP/2 garam connection par 23 ms. Ya pool mein zyada sockets (lab: 50 naye sockets 45–50 ms).",
        "choiceExplanations": [
          "Connection garam hai, toh handshake samasya nahi. Samasya line hai: bina pipelining ke ek HTTP/1.1 socket par ek waqt ek maang, 50 × ~21 ms. Lab ex1 B: 1,052–1,055 ms; HTTP/2 garam connection par 23 ms. Ya pool mein zyada sockets (lab: 50 naye sockets 45–50 ms).",
          "Connection pehle se garam hai. Keep-alive handshake bachata hai, line nahi todta.",
          "Server ka kaam chhota hai; har maang ka 20 ms round trip hai, jo server ki raftaar se nahi ghatta.",
          "Images pehle se compressed hoti hain, aur samay round trips ki line ka hai."
        ]
      }
    ]
  },
  "success": [
    "Bata sakte ho ki garam connection kya bachata hai aur kya nahi",
    "Pooling aur multiplexing ka farq lab ke numbers se samjha sakte ho",
    "TLS 1.3, QUIC, 0-RTT aur CDN edge ke round trips gin sakte ho"
  ],
  "cards": [
    {
      "front": "Connection pooling vs multiplexing?",
      "back": "Pooling: kuch connections khule rakho, dobara use karo (handshake bacha). Multiplexing: ek connection par kai maangein saath (line tooti). Lab: pool ka ek garam HTTP/1.1 socket, 50 maangein ~1,050 ms; HTTP/2 23 ms."
    },
    {
      "front": "Pehle byte tak round trips (naya connection, DNS pehle se pata)?",
      "back": "HTTP/1.1 + TLS 1.2: 4. TCP + TLS 1.3: 3. QUIC (HTTP/3): 2. Khula connection, ya QUIC 0-RTT resumption manzoor ho: 1. SF → London: 345 / 258 / 172 / 86 ms."
    },
    {
      "front": "0-RTT kab theek?",
      "back": "Sirf un maangon ke liye jo dobara chalne par nuksaan na karein (jaise menu padhna). 0-RTT data replay ho sakta hai — payment nahi (RFC 8446)."
    },
    {
      "front": "CDN edge cache miss par bhi kyun tez?",
      "back": "Handshakes paas wale edge par (5 ms), aur edge → origin connection pehle se garam: ek lamba round trip. Model: 258 ms se 101 ms; hit 15 ms."
    }
  ]
}
]);
})();
