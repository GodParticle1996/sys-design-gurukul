/* First Principles — FAANG Senior Engineer.
   Source credit: The Cost of Communication (YOR9hAFoe2o), numbered video 3/15.
   Evidence: docker-labs/53-communication-tax/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "phone", "icon": "📱", "label": "phone", "x": 140, "y": 105}, {"id": "net", "icon": "🌐", "label": "raasta 40 ms", "x": 445, "y": 105}, {"id": "srv", "icon": "🖥️", "label": "server", "x": 750, "y": 105}];
const EDGES = [{"from": "phone", "to": "net"}, {"from": "net", "to": "srv"}];
VISUALS["fp-comm-kyun"] = { t: "Server ka kaam 5 ms, phir bhi home screen 225 ms. Samay raaste mein kahan gaya?", html: SD.viz.svg(HERO, EDGES, { nodes: { phone: {tone:'acc',badge:'home screen'}, net: {tone:'slow',badge:'5 round trips'}, srv: {tone:'ok',badge:'kaam 5 ms'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-comm-kyun",
  "icon": "📡",
  "group": "📡 Cost of Communication",
  "title": "Communication 1 · Kyun — server 5 ms, screen 225 ms kyun?",
  "badge": "Round Trip Shishya",
  "objectives": [
    "Ek network call ka bill kin hisson se banta hai?",
    "Server tez karne se call tez kyun nahi hoti?",
    "Chatty calls itni mehngi kyun, aur doori ki hadd kya hai?"
  ],
  "lesson": [
    "<h3>🛒 Paanch cheezein, paanch chakkar</h3><p>Mummy ne Raju ko dukaan bheja: cheeni laao. Raju cheeni le aaya. \"Ab chai patti.\" Phir doodh, phir biscuit, phir anda. Dukaan wala har cheez 10 second mein de deta hai, par har chakkar 10 minute ka. Paanch cheezein, <b>50 minute</b> — samay dukaan mein nahi, raaste mein gaya.</p><p>KhanaKart ka server har maang 5 ms mein poori karta hai, phir bhi home screen 225 ms leti hai. Dekho samay kahan jaata hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🧾 Ek call ka bill — samay kahan gaya?",
      "goal": "KhanaKart ka phone order 42 maangta hai. Server 40 ms door hai (jaana + aana = 40 ms), server ka kaam 5 ms. Naya connection, DNS pehle se pata. Lab 53 ka ex0-slowmo bill.",
      "nodes": [
        {
          "id": "phone",
          "icon": "📱",
          "label": "phone",
          "x": 140,
          "y": 105
        },
        {
          "id": "net",
          "icon": "🌐",
          "label": "raasta 40 ms",
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
          "from": "phone",
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
          "id": "clock",
          "label": "Ghadi"
        },
        {
          "id": "trips",
          "label": "Aana-jaana"
        },
        {
          "id": "work",
          "label": "Server ka kaam"
        }
      ],
      "steps": [
        {
          "title": "Phone ko order 42 chahiye",
          "clock": "0 ms",
          "say": "Phone aur server ke beech abhi koi connection nahi. Server tak jaana aur jawab ka lautna: <b>40 ms</b>. Is aane-jaane ka naam <b>round trip</b> (RTT).",
          "nodes": {
            "phone": {
              "tone": "acc",
              "badge": "order 42?"
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
            "clock": "0 ms",
            "trips": "0",
            "work": "0 ms"
          }
        },
        {
          "title": "Pehle connection banao",
          "clock": "40 ms",
          "say": "Phone: \"baat karein?\" Server: \"haan\". Phone: \"theek\". TCP ka teen-kadam wala set-up — <b>TCP handshake</b>. Ek round trip: <b>40 ms</b>.",
          "nodes": {
            "phone": {
              "tone": "busy",
              "badge": "SYN …"
            },
            "net": {
              "tone": "busy",
              "badge": "1 RTT"
            },
            "srv": {
              "tone": "busy",
              "badge": "SYN-ACK"
            }
          },
          "vars": {
            "clock": "40 ms",
            "trips": "1",
            "work": "0 ms"
          },
          "flows": [
            {
              "from": "phone",
              "to": "net",
              "label": "SYN",
              "tone": "acc"
            },
            {
              "from": "net",
              "to": "srv",
              "label": "",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "40 ms beet gaye. Order 42 ke baare mein server ko ab tak kya pata chala?",
            "choices": [
              "Kuch nahi — sirf connection bana, order ki maang ka ek byte bhi nahi gaya",
              "Poori maang — connection ke pehle packet ke saath maang bhi chali gayi",
              "Aadhi maang — set-up ke teen packets mein maang ka pehla hissa chala gaya"
            ],
            "answer": 0,
            "hint": "Teen packets mein kya likha tha: \"baat karein?\", \"haan\", \"theek\"?",
            "explain": "TCP handshake sirf connection banata hai. Is model mein maang ek bhi byte nahi gayi — 40 ms sirf \"baat karein?\" mein gaye.",
            "choiceExplanations": [
              "TCP handshake sirf connection banata hai. Is model mein maang ek bhi byte nahi gayi — 40 ms sirf \"baat karein?\" mein gaye.",
              "Is lab ke model mein maang handshake ke baad jaati hai. (TCP Fast Open jaisi tarkeebein hain, par aam raaste par maang baad mein jaati hai.)",
              "Teeno packets sirf set-up ke hain. Maang ka koi hissa teeno packets mein nahi."
            ]
          }
        },
        {
          "title": "Taala-chaabi: TLS",
          "clock": "80 ms",
          "say": "Ab dono taraf ek gupt chaabi banti hai, taaki raaste mein koi padh na sake: <b>TLS 1.3 handshake</b>. Ek aur round trip: <b>80 ms</b> tak.",
          "nodes": {
            "phone": {
              "tone": "busy",
              "badge": "chaabi?"
            },
            "net": {
              "tone": "busy",
              "badge": "2 RTT"
            },
            "srv": {
              "tone": "busy",
              "badge": "chaabi ✓"
            }
          },
          "vars": {
            "clock": "80 ms",
            "trips": "2",
            "work": "0 ms"
          },
          "flows": [
            {
              "from": "phone",
              "to": "net",
              "label": "TLS",
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
          "title": "Ab asli maang",
          "clock": "125 ms",
          "say": "Phone: \"order 42 do\". Maang server tak 20 ms mein, server ka kaam <b>5 ms</b>, jawab wapas 20 ms mein. Kul <b>125 ms</b>.",
          "nodes": {
            "phone": {
              "tone": "ok",
              "badge": "order 42 ✓"
            },
            "net": {
              "tone": "busy",
              "badge": "3 RTT"
            },
            "srv": {
              "tone": "ok",
              "badge": "kaam 5 ms"
            }
          },
          "vars": {
            "clock": "125 ms",
            "trips": "3",
            "work": "5 ms"
          },
          "flows": [
            {
              "from": "phone",
              "to": "net",
              "label": "GET",
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
            "q": "125 ms mein server ka apna kaam kitna tha?",
            "choices": [
              "Sirf 5 ms — baaki 120 ms teen round trips (40 ms har ek) ke the",
              "Lagbhag 60 ms — aadha samay raasta, aadha samay server ka kaam",
              "Lagbhag 85 ms — handshakes ka hisaab-kitaab bhi server ka CPU kaam hai"
            ],
            "answer": 0,
            "hint": "Ghadi par teen round trips kitne ke the?",
            "explain": "Server ne sirf 5 ms kaam kiya — 125 ms ka 4%. Baaki 120 ms teen round trips the: TCP, TLS aur maang-jawab. Server ka code 5× tez karo, tab bhi bill 121 ms.",
            "choiceExplanations": [
              "Server ne sirf 5 ms kaam kiya — 125 ms ka 4%. Baaki 120 ms teen round trips the: TCP, TLS aur maang-jawab. Server ka code 5× tez karo, tab bhi bill 121 ms.",
              "Raasta 3 × 40 = 120 ms ka tha. Server ka kaam sirf 5 ms.",
              "Is model mein har handshake ka 40 ms network round trip hai; handshake ka CPU alag nahi gina. Asli HTTPS mein crypto ka CPU bhi lagta hai."
            ]
          }
        },
        {
          "title": "Wahi connection dobara",
          "clock": "45 ms",
          "say": "Agli maang usi khule connection par: koi handshake nahi. <b>40 + 5 = 45 ms</b>. Connection khula rakhne ka naam <b>connection reuse</b> (keep-alive).",
          "nodes": {
            "phone": {
              "tone": "ok",
              "badge": "order 43 ✓"
            },
            "net": {
              "tone": "ok",
              "badge": "1 RTT"
            },
            "srv": {
              "tone": "ok",
              "badge": "kaam 5 ms"
            }
          },
          "vars": {
            "clock": "45 ms (nayi call)",
            "trips": "1",
            "work": "5 ms"
          },
          "flows": [
            {
              "from": "phone",
              "to": "net",
              "label": "GET",
              "tone": "ok"
            },
            {
              "from": "net",
              "to": "srv",
              "label": "",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Home screen: 5 cheezein",
          "clock": "225 ms",
          "say": "Home screen ko 5 cheezein chahiye: naam, photo, bio, orders, offers. Phone ek ke baad ek 5 calls karta hai (connection khula): 45, 90, 135, 180, <b>225 ms</b>. Har call ek round trip.",
          "nodes": {
            "phone": {
              "tone": "slow",
              "badge": "5 calls"
            },
            "net": {
              "tone": "slow",
              "badge": "5 RTT"
            },
            "srv": {
              "tone": "ok",
              "badge": "5 × 5 ms"
            }
          },
          "vars": {
            "clock": "225 ms",
            "trips": "5",
            "work": "25 ms"
          },
          "flows": [
            {
              "from": "phone",
              "to": "net",
              "label": "×5",
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
            "q": "Ek nayi call banao jo server ke paas paanchon cheezein jode (kaam 5 × 5 = 25 ms). Home screen ab kitne mein?",
            "choices": [
              "65 ms — ek round trip (40) + poora kaam (25); 160 ms bache",
              "225 ms — kaam utna hi hai, toh samay bhi utna hi lagega",
              "45 ms — ek call ka samay, call ke andar kaam kitna bhi ho"
            ],
            "answer": 0,
            "hint": "Round trips 5 se kitne hue? Server ka kaam kitna raha?",
            "explain": "Kaam wahi 25 ms, par round trips 5 se 1: 40 + 25 = 65 ms. Bache 4 × 40 = 160 ms. Baar-baar chhoti maang wali API: <b>chatty</b>; ek baar mein sab dene wali: <b>chunky</b>.",
            "choiceExplanations": [
              "Kaam wahi 25 ms, par round trips 5 se 1: 40 + 25 = 65 ms. Bache 4 × 40 = 160 ms. Baar-baar chhoti maang wali API: <b>chatty</b>; ek baar mein sab dene wali: <b>chunky</b>.",
              "Kaam ka samay 25 ms hi hai. Bacha samay round trips ka hai — 5 se 1.",
              "Ek call mein paanchon cheezein jodna 25 ms ka kaam hai; 45 ms ek cheez wali call ka tha."
            ]
          }
        }
      ],
      "lesson": "Ek call ka bill: round trips × RTT + server ka kaam. Naye connection par TCP aur TLS ke do round trips pehle. Server tez karne se round trips nahi ghatte; connection dobara use karo aur chunky calls se round trips ghatao."
    },
    {
      "type": "cards",
      "title": "📏 Doori ka bill — roshni bhi waqt leti hai",
      "goal": "Round trip kitna chhota ho sakta hai? Fiber mein roshni ki raftaar ek hadd hai; koi code roshni se tez nahi.",
      "lesson": "Fiber mein roshni ~2,00,000 km/s: har 1,000 km ka aana-jaana kam se kam 10 ms. Server ka code tez karne se doori ka bill nahi ghatta; round trips kam karo ya server paas lao.",
      "steps": [
        {
          "title": "1. Roshni ki raftaar",
          "say": "Fiber cable mein roshni ~<b>2,00,000 km/s</b> chalti hai (khule aasmaan ka do-tihai). Mumbai → Ashburn (US-East) seedhi doori 12,854 km. Jaana + aana: 25,708 km ÷ 2,00,000 = <b>128.5 ms</b> — kam se kam. Asli cable ka raasta lamba hota hai.",
          "ask": {
            "q": "Mumbai ka user, server Ashburn mein. Naya connection: poora TCP + TLS 1.3 handshake, DNS pehle se pata, koi early data nahi. Pehle byte tak kam se kam kitna?",
            "choices": [
              "~386 ms — teen round trips (TCP, TLS, maang), har ek 128.5 ms ka",
              "~129 ms — ek round trip kaafi, handshake ka samay alag nahi lagta",
              "~10 ms — server tez ho toh doori ka asar milliseconds mein hota hai"
            ],
            "answer": 0,
            "hint": "Naye connection par kitne round trips gine the?",
            "explain": "TCP 1 + TLS 1.3 1 + maang 1 = 3 round trips: 3 × 128.5 ≈ 386 ms, server ne kuch bhi na kiya ho tab bhi. Asli raasta lamba hai, toh asli number aur zyada.",
            "choiceExplanations": [
              "TCP 1 + TLS 1.3 1 + maang 1 = 3 round trips: 3 × 128.5 ≈ 386 ms, server ne kuch bhi na kiya ho tab bhi. Asli raasta lamba hai, toh asli number aur zyada.",
              "Ek round trip sirf khule connection par. Naye connection par handshakes pehle.",
              "Server ki raftaar doori ka bill nahi ghatati. Roshni 12,854 km 10 ms mein do baar paar nahi kar sakti."
            ]
          }
        },
        {
          "title": "2. Paimana badlo",
          "say": "CPU ka L1 cache ~0.5 ns. L1 ke 0.5 ns ko 1 second maano. Data center ke andar ek network call ~0.5 ms = 10 lakh guna = 10 lakh second ≈ <b>11.6 din</b>. Har network call ek lambi yatra hai."
        },
        {
          "title": "3. Code tez, bill wahi",
          "say": "Naye connection wali call 125 ms ki thi, server ka kaam 5 ms.",
          "ask": {
            "q": "Team ne server ka kaam 5 ms se 1 ms kar diya (5× tez). Naye connection wali call ab kitne ki?",
            "choices": [
              "121 ms — sirf 4 ms bache; 120 ms round trips ke waise hi",
              "25 ms — kaam 5× tez, toh poori call bhi 5× tez",
              "45 ms — tez server handshake bhi jaldi kar deta hai"
            ],
            "answer": 0,
            "hint": "125 ms mein se kitna server ka kaam tha?",
            "explain": "Bill = 3 × 40 + kaam. Kaam 5 se 1: 121 ms. Samay round trips mein hai, code mein nahi. Pehle dekho samay kahan ja raha hai, phir tez karo.",
            "choiceExplanations": [
              "Bill = 3 × 40 + kaam. Kaam 5 se 1: 121 ms. Samay round trips mein hai, code mein nahi. Pehle dekho samay kahan ja raha hai, phir tez karo.",
              "Poori call ka 120 ms raasta hai; code tez karne se raasta chhota nahi hota.",
              "Is model ke handshake round trips server ka code tez karne se nahi ghatte; asli TLS ka CPU alag naapo."
            ]
          }
        },
        {
          "title": "4. Naam",
          "say": "Jaana + aana: <b>round trip time (RTT)</b>. Connection ka set-up: <b>handshake</b> (TCP 1 RTT, TLS 1.3 1 RTT, purana TLS 1.2 2 RTT). Khula connection dobara: <b>keep-alive / connection reuse</b>. Baar-baar chhoti maang: <b>chatty API</b>; ek baar mein sab: <b>chunky API</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Bill ka hisaab, chatty vs chunky",
      "project": "53-communication-tax",
      "exercise": "ex0-slowmo",
      "goal": "Ek call ka poora bill, aur home screen ki 5 cheezein — ek ke baad ek, ek chunky call, aur saath-saath.",
      "why": "Node 22+ chahiye. ex0 haath ka hisaab hai (model): koi network nahi, har run same.",
      "steps": [
        {
          "text": "Lab folder se: ek call ka bill.",
          "cmd": "cd docker-labs/53-communication-tax && npm start -- ex0-slowmo bill",
          "expect": "== bill: one call to a server 40 ms away (round trip), new connection, DNS cached ==\n  TCP handshake (SYN, SYN-ACK, ACK)  + 40 ms   total  40 ms\n  TLS 1.3 handshake                  + 40 ms   total  80 ms\n  request goes, response comes       + 40 ms   total 120 ms\n  server work                        +  5 ms   total 125 ms\n  same call on a reused connection:  40 + 5 = 45 ms (no handshakes)"
        },
        {
          "text": "Home screen ki 5 cheezein: chatty, chunky, saath-saath.",
          "cmd": "npm start -- ex0-slowmo chatty",
          "expect": "== chatty vs chunky: home screen needs name, avatar, bio, orders, offers (reused connection, 40 ms RTT) ==\n  chatty call 1 (name  ) after  45 ms\n  chatty call 2 (avatar) after  90 ms\n  chatty call 3 (bio   ) after 135 ms\n  chatty call 4 (orders) after 180 ms\n  chatty call 5 (offers) after 225 ms\n  chunky: one call, server gathers all 5 next to its data: 40 + 25 = 65 ms\n  chatty but parallel (5 calls at once): about 45 ms, but 5 requests of server work (and 5 connections for an HTTP/1.1 client that does not pipeline)"
        }
      ],
      "observe": {
        "q": "Lab mein 5 calls saath-saath ~45 ms, chunky call 65 ms. Saath-saath jeeta. Phir chunky call kab zaroori hai?",
        "choices": [
          "Jab calls ek doosre par tiki hon — photo ka URL naam wali call se aaye, toh saath nahi ja sakti",
          "Kabhi nahi — saath-saath hamesha tez hai, kyunki ek call ka bill kabhi nahi badhta",
          "Jab server tez ho — tez server par 5 alag calls ka bill chunky se zyada ho jaata hai"
        ],
        "answer": 0,
        "hint": "Call 2 ko call 1 ka jawab chahiye toh call 2 kab nikal sakti hai?",
        "explain": "Saath-saath tabhi jab calls ek doosre ka jawab na maangein. Tiki hui calls ek ke baad ek hi jaati hain — har call ek round trip. Saath-saath ki keemat bhi hai: 5 requests ka server kaam, aur pipelining na karne wale HTTP/1.1 client par 5 connections. Chunky call tiki hui maangon ko server ke paas jod deti hai: ek round trip.",
        "choiceExplanations": [
          "Saath-saath tabhi jab calls ek doosre ka jawab na maangein. Tiki hui calls ek ke baad ek hi jaati hain — har call ek round trip. Saath-saath ki keemat bhi hai: 5 requests ka server kaam, aur pipelining na karne wale HTTP/1.1 client par 5 connections. Chunky call tiki hui maangon ko server ke paas jod deti hai: ek round trip.",
          "Tiki hui calls saath nahi ja sakti, aur saath-saath 5 requests aur (pipelining na karne wale HTTP/1.1 client par) 5 connections ka kharcha bhi hai.",
          "Server ki raftaar round trips ki ginti nahi badalti. Farq round trips ka hai, server ka nahi."
        ]
      },
      "lesson": "Model mein bill ka har hissa dikhta hai: 125 ms mein 120 ms raasta. Saath-saath calls samay bachati hain par kaam aur connections badhati hain; tiki hui maangon ke liye chunky call round trips ghatati hai."
    }
  ],
  "interview": {
    "title": "Interview Round — round trips gino",
    "instructions": "Pehle socho: kitne round trips, har ek kitne ka, aur server ka kaam kitna? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Mumbai ke users ka checkout 900 ms leta hai. Server US-East (Ashburn) mein hai; server traces mein handler sirf 30 ms. Sabse pehle kya jaanchoge?",
        "choices": [
          "Ek checkout mein kitne round trips hain (naye connections, ek ke baad ek calls) — har ek ≥ 128 ms",
          "Handler ka CPU profile chalao aur 30 ms ko 10 ms karo — code hi asli rukawat hai",
          "Database ke index jaancho — handler ke andar ki query hi checkout ko dheema karti hai",
          "Response ko gzip karo — bytes kam honge toh checkout ka samay bhi utna hi ghatega"
        ],
        "answer": 0,
        "explain": "900 − 30 = 870 ms handler ke bahar hain. Server door hai aur har round trip ≥ 128.5 ms, isliye naye connections aur ek ke baad ek calls pehle jaanchne layak hain. Trace mein DNS, TCP/TLS, line ka intezaar aur response transfer alag naapo — sirf 900 aur 30 se round trips ki ginti pata nahi chalti. Handler 30 se 10 ms karna sirf 20 ms bachata hai.",
        "choiceExplanations": [
          "900 − 30 = 870 ms handler ke bahar hain. Server door hai aur har round trip ≥ 128.5 ms, isliye naye connections aur ek ke baad ek calls pehle jaanchne layak hain. Trace mein DNS, TCP/TLS, line ka intezaar aur response transfer alag naapo — sirf 900 aur 30 se round trips ki ginti pata nahi chalti. Handler 30 se 10 ms karna sirf 20 ms bachata hai.",
          "Handler 900 mein se sirf 30 ms hai; 10 ms karne se 20 ms bachenge.",
          "Query handler ke 30 ms ke andar hi hai; trace dikhata hai ki baaki 870 ms bahar gaye.",
          "Payload ka size aur transfer ka samay diye nahi gaye. Gzip ka faayda payload aur trace se naapo; pehle handler ke bahar ka samay todkar dekho."
        ]
      },
      {
        "q": "Mobile app ki home screen 6 API calls ek ke baad ek karti hai (connection pehle se khula). RTT 80 ms, har call ka server kaam 10 ms. Ek naya endpoint 6 cheezein server ke paas jod ke ek baar mein deta hai. Kitna samay bachega?",
        "choices": [
          "~400 ms — pehle 6 × (80 + 10) = 540 ms, ab sirf 80 + 60 = 140 ms",
          "~60 ms — sirf server ka kaam bachta hai, round trips utne hi rehte hain",
          "Kuch nahi — kul kaam utna hi hai, toh kul samay bhi utna hi rahega",
          "~480 ms — 6 round trips bachte hain, aur server ka kaam bhi bachta hai"
        ],
        "answer": 0,
        "explain": "Pehle: 6 round trips + 6 × 10 ms = 540 ms. Ab: 1 round trip + 60 ms kaam = 140 ms. Bache 5 round trips = 400 ms. Server ka kaam 60 ms waise hi rehta hai.",
        "choiceExplanations": [
          "Pehle: 6 round trips + 6 × 10 ms = 540 ms. Ab: 1 round trip + 60 ms kaam = 140 ms. Bache 5 round trips = 400 ms. Server ka kaam 60 ms waise hi rehta hai.",
          "Server ka kaam 60 ms dono baar hai. Bachat round trips ki hai: 6 se 1.",
          "Kaam utna hi hai, par round trips 6 se 1 hue — 400 ms bache.",
          "6 mein se ek round trip toh lagega hi, aur server ka 60 ms kaam bhi. 540 − 140 = 400 ms."
        ]
      }
    ]
  },
  "success": [
    "Ek call ka bill round trips × RTT + kaam mein tod sakte ho",
    "Bata sakte ho ki server tez karne se bill kitna ghatega",
    "Chatty vs chunky aur doori ki hadd ka hisaab laga sakte ho"
  ],
  "cards": [
    {
      "front": "Naye HTTPS connection par ek call ka bill (RTT 40 ms, TLS 1.3, kaam 5 ms)?",
      "back": "TCP 40 + TLS 40 + maang-jawab 40 + kaam 5 = 125 ms. Khule connection par sirf 40 + 5 = 45 ms."
    },
    {
      "front": "Chatty vs chunky (RTT 40 ms, 5 cheezein, kaam 5 ms har ek)?",
      "back": "Ek ke baad ek 5 calls = 5 round trips = 225 ms. Ek call jo server ke paas paanchon jode = 40 + 25 = 65 ms."
    },
    {
      "front": "Doori ki hadd?",
      "back": "Fiber mein roshni ~2,00,000 km/s: har 1,000 km ka aana-jaana kam se kam 10 ms. Mumbai → Ashburn ≥ 128.5 ms RTT; asli raasta lamba."
    }
  ]
}
]);
})();
