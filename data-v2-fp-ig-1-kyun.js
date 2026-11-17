/* First Principles — FAANG Senior Engineer.
   Source credit: How to Build Instagram from Scratch (ozWW5nIdzQM), numbered video 15/15.
   Evidence: docker-labs/65-instagram/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "phone", "icon": "📱", "label": "Phone", "x": 130, "y": 210}, {"id": "app", "icon": "🖥️", "label": "App server", "x": 470, "y": 80}, {"id": "store", "icon": "🗄️", "label": "Object store", "x": 470, "y": 340}, {"id": "db", "icon": "🐘", "label": "Metadata DB", "x": 800, "y": 80}, {"id": "cdn", "icon": "🌍", "label": "CDN", "x": 800, "y": 340}];
const EDGES = [{"from": "phone", "to": "app"}, {"from": "phone", "to": "store"}, {"from": "app", "to": "db"}, {"from": "store", "to": "cdn"}];
VISUALS["fp-ig-kyun"] = { t: "Ek photo ek baar likhi, ~1,000 baar padhi: bojh delivery ka. Photo store mein, DB mein sirf URL, app server sirf permission.", html: SD.viz.svg(HERO, EDGES, { nodes: { phone: {tone:'busy',badge:'upload'}, app: {tone:'ok',badge:'138 byte'}, store: {tone:'ok',badge:'photo'}, db: {tone:'ok',badge:'URL'}, cdn: {tone:'bad',badge:'231 GB/s'} } }, {w:900,h:430}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-ig-kyun",
  "icon": "🧮",
  "group": "📸 Instagram: Sab Jodkar",
  "title": "Instagram 1 · Kyun — budget sheet aur seedha upload",
  "badge": "Hisaab Ka Architect",
  "objectives": [
    "Video ka budget sheet: uploads, storage, views, egress, likes",
    "Photo DB se bahar kyun; copies vs erasure coding",
    "Presigned URL, resumable upload, orphan aur lifecycle"
  ],
  "lesson": [
    "<h3>🍬 Mithai ki dukaan</h3><p>Ek halwai roz 1,000 dabbe banata hai. Har dabba 1,000 ghar jaata hai. Rasoi chhoti ho sakti hai — asli kaam delivery ka hai: gaadiyan, raste, aur har mohalle mein ek chhota godaam.</p><p>Aur dabba seedha godaam mein rakhwao, galle par baithe munshi ke haath se nahi. Aaj Instagram ka hisaab dekhte hain: kitna banta hai, kitna jaata hai, aur kaun kya uthata hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🧮 Budget sheet: ek photo, ek din, poori duniya",
      "goal": "Lab 65 ex0 (seedha hisaab, video ke maane hue numbers): 50 crore daily users, 1/5 roz ek photo, 3 MB/photo (saare size), 200 photos roz dekhte hain, 200 KB har view.",
      "nodes": [
        {
          "id": "phone",
          "icon": "📱",
          "label": "Phone",
          "x": 130,
          "y": 210
        },
        {
          "id": "app",
          "icon": "🖥️",
          "label": "App server",
          "x": 470,
          "y": 80
        },
        {
          "id": "store",
          "icon": "🗄️",
          "label": "Object store",
          "x": 470,
          "y": 340
        },
        {
          "id": "db",
          "icon": "🐘",
          "label": "Metadata DB",
          "x": 800,
          "y": 80
        },
        {
          "id": "cdn",
          "icon": "🌍",
          "label": "CDN",
          "x": 800,
          "y": 340
        }
      ],
      "edges": [
        {
          "from": "phone",
          "to": "app"
        },
        {
          "from": "phone",
          "to": "store"
        },
        {
          "from": "app",
          "to": "db"
        },
        {
          "from": "store",
          "to": "cdn"
        }
      ],
      "viz": {
        "w": 900,
        "h": 430
      },
      "vars": [
        {
          "id": "what",
          "label": "Kya"
        },
        {
          "id": "num",
          "label": "Number"
        },
        {
          "id": "means",
          "label": "Matlab"
        }
      ],
      "steps": [
        {
          "title": "1. Upload",
          "clock": "upload",
          "say": "10 crore photos/din ÷ 86,400 s = 1,157/s average; peak ×3 = 3,472/s. Storage: 300 TB/din, 109.5 PB/saal.",
          "nodes": {
            "phone": {
              "tone": "busy",
              "badge": "1,157/s"
            },
            "app": {
              "tone": "idle",
              "badge": ""
            },
            "store": {
              "tone": "busy",
              "badge": "300 TB/din"
            },
            "db": {
              "tone": "idle",
              "badge": ""
            },
            "cdn": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "what": "uploads",
            "num": "1,157/s · 109.5 PB/saal",
            "means": "bada storage"
          },
          "flows": [
            {
              "from": "phone",
              "to": "store",
              "label": "",
              "tone": "busy"
            }
          ]
        },
        {
          "title": "2. Dekhna",
          "clock": "views",
          "say": "50 crore × 200 = 10,000 crore views/din = 11.6 lakh/s. × 200 KB = 231 GB/s (1.85 Tbps). Read : write = 1,000 : 1.",
          "nodes": {
            "phone": {
              "tone": "ok",
              "badge": "dekh raha"
            },
            "app": {
              "tone": "idle",
              "badge": ""
            },
            "store": {
              "tone": "busy",
              "badge": ""
            },
            "db": {
              "tone": "idle",
              "badge": ""
            },
            "cdn": {
              "tone": "bad",
              "badge": "231 GB/s"
            }
          },
          "vars": {
            "what": "views",
            "num": "11.6 lakh/s",
            "means": "1,000 : 1"
          },
          "flows": [
            {
              "from": "store",
              "to": "cdn",
              "label": "",
              "tone": "busy"
            }
          ],
          "ask": {
            "q": "Uploads 1,157/s, views 11.6 lakh/s. Architecture ka asli bojh kahan?",
            "choices": [
              "Photos bahar pahunchana — egress aur CDN; storage doosre number par",
              "Storage — 110 PB/saal sabse bada aur sabse mehnga number hai",
              "Uploads — har photo 3 MB ki hai, isliye likhna sabse bhaari"
            ],
            "answer": 0,
            "hint": "Har photo ek baar likhi jaati hai. Kitni baar padhi jaati hai?",
            "explain": "Har photo ~1,000 baar dekhi jaati hai. 231 GB/s bahar jaana roz ~20 PB egress hai — list price $0.05/GB par ~$10 lakh/din. Video: \"storage company nahi, delivery company\". Isliye CDN, ISP ke andar cache, aur chhote image formats (30% chhoti = ~$3 lakh/din bachat).",
            "choiceExplanations": [
              "Har photo ~1,000 baar dekhi jaati hai. 231 GB/s bahar jaana roz ~20 PB egress hai — list price $0.05/GB par ~$10 lakh/din. Video: \"storage company nahi, delivery company\". Isliye CDN, ISP ke andar cache, aur chhote image formats (30% chhoti = ~$3 lakh/din bachat).",
              "110 PB bada hai, par roz ka 20 PB egress aur bhi bada bill hai.",
              "1,157 uploads/s ke saamne 11.6 lakh views/s — likhna chhota hissa."
            ]
          }
        },
        {
          "title": "3. Photo DB mein?",
          "clock": "blob",
          "say": "5 MB photo Postgres row mein: 8 KB page mein nahi aati, TOAST photo ko 2,506 tukdon mein baantta hai. Har upload WAL mein 5 MB: 1,157/s × 5 MB = 5.8 GB/s (peak 17.4 GB/s). Buffer pool photos se bhar jaata hai.",
          "nodes": {
            "phone": {
              "tone": "busy",
              "badge": ""
            },
            "app": {
              "tone": "bad",
              "badge": "5 MB"
            },
            "store": {
              "tone": "idle",
              "badge": ""
            },
            "db": {
              "tone": "bad",
              "badge": "WAL 5.8 GB/s"
            },
            "cdn": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "what": "blob in DB",
            "num": "5.8 GB/s WAL",
            "means": "DB ka gala ghuta"
          },
          "flows": [
            {
              "from": "phone",
              "to": "app",
              "label": "5 MB",
              "tone": "bad"
            },
            {
              "from": "app",
              "to": "db",
              "label": "5 MB",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "4. Alag karo",
          "clock": "split",
          "say": "Photo object store mein, DB mein sirf ~150 byte ki row (id, user, time, URL). 1 GiB mein ~72 lakh aisi rows (Postgres header ke saath ~61 lakh; video: \"1 crore\" — thoda zyada).",
          "nodes": {
            "phone": {
              "tone": "busy",
              "badge": ""
            },
            "app": {
              "tone": "ok",
              "badge": "150 byte"
            },
            "store": {
              "tone": "ok",
              "badge": "photo"
            },
            "db": {
              "tone": "ok",
              "badge": "sirf URL"
            },
            "cdn": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "what": "metadata alag",
            "num": "150 byte/row",
            "means": "DB RAM mein"
          },
          "flows": [
            {
              "from": "app",
              "to": "db",
              "label": "150 B",
              "tone": "ok"
            },
            {
              "from": "phone",
              "to": "store",
              "label": "photo",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "5. 110 PB ko bachaao",
          "clock": "erasure",
          "say": "3 copies = 330 PB disk. Erasure coding 10 data + 4 parity = 154 PB (1.4×), koi bhi 4 tukde kho sakte ho. Keemat: ek tukda dobara banane ko 10 tukde network se padhne padte hain (lab 14 asli Reed-Solomon chalata hai).",
          "nodes": {
            "phone": {
              "tone": "idle",
              "badge": ""
            },
            "app": {
              "tone": "idle",
              "badge": ""
            },
            "store": {
              "tone": "ok",
              "badge": "10 + 4"
            },
            "db": {
              "tone": "idle",
              "badge": ""
            },
            "cdn": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "what": "durability",
            "num": "154 vs 330 PB",
            "means": "kam disk, mehnga repair"
          },
          "ask": {
            "q": "3 copies ki jagah 10+4 erasure coding. Kya kho diya?",
            "choices": [
              "Repair sasta nahi — ek tukda banane ko 10 tukde network se padho",
              "Durability — 4 disk girne par photo hamesha ke liye chali jaati hai",
              "Kuch nahi — erasure coding har haal mein 3 copies se behtar hai"
            ],
            "answer": 0,
            "hint": "Ek disk mari. 3 copies mein naya copy kahan se aata hai, erasure coding mein kahan se?",
            "explain": "3 copies mein ek bachi copy padh kar nayi bana lo. 10+4 mein gaya tukda banane ke liye 10 bache tukde padhne padte hain — repair ke waqt network aur disk ka bojh. Badle mein 330 PB ki jagah 154 PB, aur koi bhi 4 tukde kho sakte ho. Isliye garam data aksar copies mein, thanda data erasure coding mein.",
            "choiceExplanations": [
              "3 copies mein ek bachi copy padh kar nayi bana lo. 10+4 mein gaya tukda banane ke liye 10 bache tukde padhne padte hain — repair ke waqt network aur disk ka bojh. Badle mein 330 PB ki jagah 154 PB, aur koi bhi 4 tukde kho sakte ho. Isliye garam data aksar copies mein, thanda data erasure coding mein.",
              "10+4 mein koi bhi 4 tukde kho sakte ho — photo bachi rehti hai.",
              "Har haal nahi: repair aur padhne ki keemat badhti hai."
            ]
          }
        }
      ],
      "lesson": "Pehle hisaab: 1,157 uploads/s, 11.6 lakh views/s, 1,000:1. Bojh delivery ka hai. Photo DB se bahar, DB mein sirf metadata. Durability ke liye copies ya erasure coding — disk vs repair ka sauda."
    },
    {
      "type": "cards",
      "title": "📤 Photo seedha storage mein — presigned URL",
      "goal": "Lab 65 ex1 (asli HTTP, ek hi machine par; chhota object store aur app server; ghadi nakli): photo app server ko chhuye bina.",
      "lesson": "App server permission deta hai, bytes nahi dhota. Upload toote toh offset se aage. Commit se pehle phone mar jaaye toh pending tag wala object lifecycle se hat jaata hai.",
      "steps": [
        {
          "title": "1. Presigned URL",
          "say": "Phone app server se poochhta hai \"upload karna hai\" (chhota JSON). Server ek URL deta hai jis par ek file, ek method (PUT) aur 15 min ki expiry ka HMAC signature hai. Phone seedha object store ko 1 MB bhejta hai. Lab: app server ne 138 byte (sirf JSON body) padhe, store ne 10,00,000.",
          "ask": {
            "q": "Upload ke liye presigned URL kyun, app server se hokar kyun nahi?",
            "choices": [
              "Photo ke bytes app se hokar nahi jaate — app ka bandwidth bachta",
              "Presigned URL se photo apne aap compress ho jaati hai, bandwidth bachti",
              "App server photo nahi padh sakta, isliye store ko hi bhejna padta hai"
            ],
            "answer": 0,
            "hint": "1 MB photo app server se hokar jaaye toh app ko kya-kya sambhalna padta hai?",
            "explain": "App se hokar jaaye toh har photo ke bytes app ka bandwidth, connection aur memory leti hai. Video kehta hai dheema upload ek worker pakadta hai — blocking (har request ek worker) wale server par sahi; Node jaise async server par thread nahi rukta, par bandwidth aur connections phir bhi lagte hain. Presigned URL se app sirf permission deta hai (lab: 138 byte JSON), photo seedhe store mein. Signature file ka naam, method aur expiry baandhta hai — lab mein doosra naam ya 16 min baad dono par 403.",
            "choiceExplanations": [
              "App se hokar jaaye toh har photo ke bytes app ka bandwidth, connection aur memory leti hai. Video kehta hai dheema upload ek worker pakadta hai — blocking (har request ek worker) wale server par sahi; Node jaise async server par thread nahi rukta, par bandwidth aur connections phir bhi lagte hain. Presigned URL se app sirf permission deta hai (lab: 138 byte JSON), photo seedhe store mein. Signature file ka naam, method aur expiry baandhta hai — lab mein doosra naam ya 16 min baad dono par 403.",
              "Compression phone karta hai (video: 5 MB → 1 MB), URL nahi.",
              "App server padh sakta hai — sawaal bandwidth aur app ke resources ka hai."
            ]
          }
        },
        {
          "title": "2. Tunnel mein upload toota",
          "say": "5 MB, 500 KB ke tukde, 9 tukde (4.5 MB) ke baad connection gaya. Phone <code>HEAD</code> se poochhta hai kitne pahunche (45 lakh byte), baaki 5 lakh bhejta hai. URL beech mein expire ho jaaye toh app se same upload ka naya URL. App size + SHA-256 yaad rakhta hai: adhoori photo ka commit 409, reply kho jaane par dobara commit → same photo id (lab ka contract — presigned URL akela aisa nahi karta). Dhyan: S3 multipart mein har part 5 MiB se 5 GiB (aakhri chhota chal sakta) — 500 KB ke tukde seedhe S3 multipart se nahi chalenge; apna resumable endpoint ya GCS jaisa resumable API (256 KiB ke multiple)."
        },
        {
          "title": "3. Orphan photo",
          "say": "Photo store mein pahunchi, phone ne \"ho gaya\" bolne se pehle band ho gaya — DB mein row nahi. Upload ke waqt tag <code>status=pending</code>, commit par <code>final</code>. Lifecycle rule pending + 24 ghante purane hataata hai: lab mein 23 ghante par kuch nahi gaya, 25 par sirf orphan.",
          "ask": {
            "q": "Video: \"24 ghante se purani har file hatao jab tak permanent tag na ho\". S3 par seedha kyun nahi banta?",
            "choices": [
              "Lifecycle filter tag/prefix/size se objects chunta hai; \"tag nahi\" filter nahi",
              "S3 lifecycle sirf 30 din se purane objects hata sakta hai, 24 ghante nahi",
              "S3 mein tags hote hi nahi, isliye lifecycle file ka naam dekhta hai"
            ],
            "answer": 0,
            "hint": "Rule kin objects par lagta hai — jinke paas tag HAI, ya jinke paas NAHI?",
            "explain": "S3 lifecycle filter prefix, tags aur size se objects chunta hai (saath mein AND). \"Jis par permanent tag NAHI\" jaisa ulta filter docs mein nahi. Isliye ulta socho: upload par pending tag, rule pending ko hataaye, commit par tag final. (tmp/ prefix wala raasta alag hai: commit par photo ko tmp/ se bahar final key par copy karna padta hai — warna tag badalne par bhi tmp/ wala rule photo mita dega.)",
            "choiceExplanations": [
              "S3 lifecycle filter prefix, tags aur size se objects chunta hai (saath mein AND). \"Jis par permanent tag NAHI\" jaisa ulta filter docs mein nahi. Isliye ulta socho: upload par pending tag, rule pending ko hataaye, commit par tag final. (tmp/ prefix wala raasta alag hai: commit par photo ko tmp/ se bahar final key par copy karna padta hai — warna tag badalne par bhi tmp/ wala rule photo mita dega.)",
              "Expiration din ke hisaab se bhi hota hai — 1 din bhi chalta hai.",
              "S3 objects par tags hote hain; lifecycle unse filter karta hai."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Budget sheet aur seedha upload",
      "project": "65-instagram",
      "exercise": "ex0-budget",
      "goal": "Video ka poora budget sheet dobara gino, phir presigned upload asli HTTP par chalao.",
      "why": "Node 24+ chahiye. ex0 seedha hisaab. ex1 apne process mein 127.0.0.1 ke random ports par do servers chalata hai (bahar kuch publish nahi); ghadi nakli hai taaki expiry aur lifecycle turant dikhein.",
      "steps": [
        {
          "text": "Budget sheet.",
          "cmd": "cd docker-labs/65-instagram && npm start -- ex0-budget",
          "expect": "ex0 — Instagram ka budget sheet (seedha hisaab; saare inputs video ke maane hue numbers)\n\n1) Traffic aur storage                     video kehta        hisaab\n   Uploads/din (50 crore DAU × 1/5)       10 crore           10,00,00,000\n   Uploads/second (average)               ~1,150             1,157\n   Uploads/second (peak, ×3)              3,500              3,472\n   Naya storage/din (× 3 MB)              300 TB             300 TB\n   Naya storage/saal                      110 PB             109.5 PB\n   Photo views/second (× 200/din)         1.2 million        11,57,407\n   Egress (× 200 KB)                      240 GB/s, 1.9 Tbps 231.5 GB/s, 1.85 Tbps\n   Read : write                           1,000 : 1          1,000 : 1\n   Likes/second (× 10/din), peak ×3       57,000 · 170,000   57,870 · 1,73,611\n   → hisaab sahi. Likes photo uploads se ~50× zyada writes: asli write load chhota sa \"like\" hai.\n\n2) Egress ka bill (list price $0.05/GB — maana; itne bade paimaane par asli daam contract ya apne network par tike):\n   20 PB/din × $0.05/GB = $10,00,000/din. Images 30% chhoti → $3,00,000/din bachat.\n   → storage company nahi, delivery company. Isliye CDN aur ISP ke andar cache.\n\n3) Photo database ke andar rakho toh (Postgres):\n   WAL mein likhna: 1,157 uploads/s × 5 MB = 5.8 GB/s average (peak ×3 = 17.4 GB/s). Video: \"6 GB/s\" — sahi.\n   5 MB photo = 2,506 TOAST chunks (har chunk 1,996 byte, 8 KB page).\n   Sirf metadata (150 byte row): 1 GiB mein 71,58,278 rows; Postgres ke 27 byte tuple header/pointer ke saath ~60,66,337.\n   Video ka \"1 GB mein 1 crore rows\" thoda zyada; mudda sahi — photo bahar (object storage), DB mein sirf URL.\n\n4) 110 PB ko bachaana (lab 14 asli Reed-Solomon chalata hai):\n   3 copies: 330 PB disk · erasure coding 10 data + 4 parity: 154 PB disk (1.4×), koi bhi 4 fragment kho sakte ho.\n   Keemat: ek fragment dobara banane ke liye 10 bache hue fragments network se padhne padte hain (copy wale mein 1).\n\n5) New York ↔ Tokyo (~10,850 km), fibre mein roshni ~2 lakh km/s:\n   kam se kam 54.3 ms ek taraf, 108.5 ms round trip. Asli raasta lamba: ~180 ms (video, maana).\n   Pehle byte se pehle handshakes          seedha NY (180 ms RTT)    paas ka edge POP (15 ms RTT)\n   TCP + TLS 1.2                            540 ms                    45 ms\n   TCP + TLS 1.3                            360 ms                    30 ms\n   QUIC (HTTP/3)                            180 ms                    15 ms\n   → edge POP handshakes paas mein kar leta hai; data phir bhi warm connection par samundar paar jaata hai (ek round trip).\n     Video: TLS 1.2 = 2 round trip — sahi; TCP ke saath kul 3."
        },
        {
          "text": "Presigned upload, resume, orphan, chhed-chhaad.",
          "cmd": "npm start -- ex1-upload",
          "expect": "ex1 — photo seedha storage mein (asli HTTP, ek hi machine par; object store aur app server dono chhote Node servers; ghadi nakli)\n\n1) Ek photo (1 MB), 500 KB ke chunks, presigned URL se:\n   app server ne padhe: 138 byte (sirf JSON body) · object store ne padhe: 10,00,000 byte · metadata rows: 1\n   → 1 MB app server ko chhoota hi nahi: app ka bandwidth, connection aur memory bachi. (Video ka \"dheema upload ek worker\n\n     pakadta hai\" blocking server par sahi; Node jaisa async server thread nahi rokta, par bytes ka bojh phir bhi uthata.)\n\n2) Tunnel: 5 MB, 500 KB ke chunks, 9 chunk (4.5 MB) ke baad connection gaya:\n   HEAD se pata chala store ke paas 45,00,000 byte hain → baaki 5,00,000 byte bheje (shuru se: 50,00,000).\n   Dhyan: Amazon S3 multipart mein har part kam se kam 5 MiB (aakhri chhod kar) — 500 KB ke chunks ke liye apna\n   resumable upload (ya Google Cloud Storage jaisa resumable API, 256 KiB ke multiples) chahiye.\n\n3) Phone upload ke baad, \"ho gaya\" bolne se pehle band ho gaya (orphan):\n   objects: 3 (2 final, 1 pending) → 25 ghante baad lifecycle sweep ne 1 hataya; bache 2, sab final.\n   orphan object gaya: true · rows: 2 (orphan ki row kabhi bani hi nahi)\n   → rule \"status=pending\" tag ko pakadta hai: upload par tag pending, commit par final. S3 lifecycle filter tag/prefix se\n     objects CHUNTA hai; \"jis par tag NAHI\" jaisa ulta filter nahi hota — isliye tag upload ke waqt hi lagao.\n\n     (tmp/ prefix wala rule chuno toh commit par photo ko final key par copy karo — tag badalne se prefix rule nahi rukta.)\n\n4) URL ke saath chhed-chhaad:\n   doosri file ka naam daala → HTTP 403 · 16 min baad (URL 15 min ka) → HTTP 403 · store ne mana kiya: 2\n   → signature ek file, ek method aur ek expiry ke liye hai. Server ne permission di, bytes nahi dhoye.\n\n5) Upload ka contract (app ka apna niyam — presigned URL akela aisi guarantee nahi deta):\n   URL beech mein expire (900 / 1,000 byte ke baad): naya URL same key ke liye → mila, baaki 100 byte, photo id 3\n   adhoori photo (600 / 1,000) ka commit → HTTP 409; same upload ka dobara commit (reply kho gaya tha) → same id 3\n   publish ke baad same URL se bytes jodna → HTTP 409\n   → app server size + SHA-256 yaad rakhta hai aur poori, sahi photo par hi row banata hai. S3 ka presigned URL expiry tak\n     dobara chal sakta hai aur same key ko badal sakta hai — isliye final object ko alag key/version par rakhna app ka kaam.\n     Presigned URL banane ke liye S3 se poochhna zaroori nahi: app ka SDK apni credentials se local sign karta hai (jaise is lab ka sign())."
        }
      ],
      "observe": {
        "q": "ex0: TCP + TLS 1.2 par seedha New York tak 540 ms, edge POP par 45 ms. Edge POP ne kya bachaya?",
        "choices": [
          "Handshakes ke round trips paas mein; data phir bhi samundar paar",
          "Poora data — edge POP ke baad New York jaana hi nahi padta",
          "Kuch nahi — roshni ki raftaar same hai, toh samay bhi same"
        ],
        "answer": 0,
        "hint": "Pehle byte se pehle kitne round trip, aur kahan tak?",
        "explain": "TCP (1) + TLS 1.2 (2) = 3 round trip. 180 ms ke raaste par 540 ms, 15 ms wale paas ke POP par 45 ms. POP pehle se khule, garam connection par request New York bhejta hai — ek round trip ka samundar wala safar phir bhi lagta hai, par handshakes ka tax nahi.",
        "choiceExplanations": [
          "TCP (1) + TLS 1.2 (2) = 3 round trip. 180 ms ke raaste par 540 ms, 15 ms wale paas ke POP par 45 ms. POP pehle se khule, garam connection par request New York bhejta hai — ek round trip ka samundar wala safar phir bhi lagta hai, par handshakes ka tax nahi.",
          "Cache na ho toh data New York se hi aata hai.",
          "Roshni same, par round trips ki ginti aur doori badli."
        ]
      },
      "lesson": "Hisaab se architecture: delivery ka bojh CDN aur edge par, photos object store mein, app server sirf chhote JSON par."
    }
  ],
  "interview": {
    "title": "Interview Round — budget sheet",
    "instructions": "Pehle hisaab: per second kitna, kitne bytes, kitni baar padha? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Naye photo app ka plan: \"photos Postgres ki bytea column mein, ek hi jagah sab simple\". 1,000 uploads/s, 5 MB har photo. Tumhari salah?",
        "choices": [
          "Photos object store mein, DB mein sirf metadata aur URL rakho",
          "Postgres theek hai, bas bada SSD aur zyada RAM wala server lo",
          "Photos ko base64 karke JSON column mein rakho, padhna aasaan",
          "Har photo ke liye alag database banao, taaki bojh bant jaaye"
        ],
        "answer": 0,
        "explain": "1,000 × 5 MB = 5 GB/s WAL mein; 5 MB TOAST mein ~2,500 tukde; buffer pool photos se bhar kar metadata ko RAM se nikaal deta hai. Object store bade, na badalne wale blobs ke liye bana hai; DB mein ~150 byte ki row (id, user, time, URL). Lab 65 ex0.",
        "choiceExplanations": [
          "1,000 × 5 MB = 5 GB/s WAL mein; 5 MB TOAST mein ~2,500 tukde; buffer pool photos se bhar kar metadata ko RAM se nikaal deta hai. Object store bade, na badalne wale blobs ke liye bana hai; DB mein ~150 byte ki row (id, user, time, URL). Lab 65 ex0.",
          "Bada hardware WAL aur buffer pool ki dikkat sirf aage khiskaata hai.",
          "Base64 size ~33% badha deta hai — aur bura.",
          "Hazaron databases chalana alag musibat; blob ki jagah object store hai."
        ]
      },
      {
        "q": "CFO: \"egress ka bill $10 lakh/din!\" Engineering ke paas ek hafta hai. Sabse bada asar kis kadam ka?",
        "choices": [
          "Chhote image formats aur CDN cache — har view ke bytes ghatao",
          "Database ko bade server par le jao, saari queries tez hongi",
          "Uploads ka size ghatao — likhne ka bojh hi sabse bada hai",
          "Photos ki teen ki jagah do copies rakho, storage bachega"
        ],
        "answer": 0,
        "explain": "Egress = views × bytes per view. 11.6 lakh views/s × 200 KB. Bytes 30% ghate toh bill ~30% ghata (~$3 lakh/din). CDN/ISP ke andar cache se origin ka egress aur ghatta. Uploads read ka 1/1,000 hain; copies storage ka sawaal hai, egress ka nahi.",
        "choiceExplanations": [
          "Egress = views × bytes per view. 11.6 lakh views/s × 200 KB. Bytes 30% ghate toh bill ~30% ghata (~$3 lakh/din). CDN/ISP ke andar cache se origin ka egress aur ghatta. Uploads read ka 1/1,000 hain; copies storage ka sawaal hai, egress ka nahi.",
          "DB egress ka bill nahi banata — photos ka delivery banata hai.",
          "Uploads views ke saamne chhote (1,000 : 1).",
          "Copies storage ka kharcha hain; egress bahar jaane wale bytes ka."
        ]
      }
    ]
  },
  "success": [
    "Budget sheet ke numbers khud nikaal sakte ho",
    "Photo DB se bahar kyun aur durability ke do raaste bata sakte ho",
    "Presigned upload, resume aur orphan cleanup samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Instagram budget sheet (video ke maane hue numbers)?",
      "back": "1,157 uploads/s (peak 3,472), 109.5 PB/saal, 11.6 lakh views/s, 231 GB/s egress, read:write 1,000:1, likes 57,870/s."
    },
    {
      "front": "3 copies vs 10+4 erasure coding (110 PB)?",
      "back": "330 vs 154 PB disk; 10+4 koi bhi 4 tukde jhel leta, par repair 10 tukde padhta hai."
    },
    {
      "front": "Orphan photo ka ilaaj?",
      "back": "Upload par pending tag, commit par final; lifecycle pending + 24 ghante purane hataaye. \"Tag nahi\" wala filter S3 mein nahi. tmp/ prefix chuno toh commit par final key par copy karo."
    }
  ]
}
]);
})();
