/* First Principles — FAANG Senior Engineer.
   Source credit: How to Build Instagram from Scratch (ozWW5nIdzQM), numbered video 15/15.
   Evidence: docker-labs/65-instagram/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "tokyo", "icon": "🗾", "label": "Tokyo", "x": 140, "y": 90}, {"id": "fra", "icon": "🏰", "label": "Frankfurt", "x": 470, "y": 90}, {"id": "va", "icon": "🗽", "label": "Virginia", "x": 800, "y": 90}, {"id": "cells", "icon": "🧱", "label": "Cells", "x": 300, "y": 330}, {"id": "keys", "icon": "🔑", "label": "Key vault", "x": 650, "y": 330}];
const EDGES = [{"from": "tokyo", "to": "fra"}, {"from": "fra", "to": "va"}, {"from": "tokyo", "to": "cells"}, {"from": "keys", "to": "va"}];
VISUALS["fp-ig-kab"] = { t: "Har data ka apna faisla: async, CRDT, quorum — aur galti ka daayra cells se, bhoolna keys se.", html: SD.viz.svg(HERO, EDGES, { nodes: { tokyo: {tone:'ok',badge:'async'}, fra: {tone:'ok',badge:'CRDT'}, va: {tone:'busy',badge:'quorum'}, cells: {tone:'bad',badge:'1%'}, keys: {tone:'bad',badge:'shred'} } }, {w:900,h:420}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-ig-kab",
  "icon": "🌏",
  "group": "📸 Instagram: Sab Jodkar",
  "title": "Instagram 4 · Kab — duniya bhar, galti ka daayra, aur poori series",
  "badge": "System Ka Sutradhar",
  "objectives": [
    "Data ke hisaab se async, CRDT ya quorum chunna",
    "Cells aur crypto-shredding ki shartein",
    "Poori series ke auzaar: dikkat, ilaaj, keemat"
  ],
  "lesson": [
    "<h3>🏦 Bank ki teen branch</h3><p>Ek bank ki Mumbai, Delhi, Kolkata branch. Passbook ki photo badli — doosri branch ko kal pata chale, koi baat nahi. Par account ka balance? Teeno ko abhi ek hi number dikhna chahiye, chahe phone par thoda intezaar karna pade.</p><p>Aur ek branch mein galat niyam laga toh baaki do chalti rahein. Aaj Instagram ke har tarah ke data ke liye branch wala chunaav karte hain — aur 15 videos ka hisaab jodte hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🌏 Teen regions, ek sach — kab chalega, kab nahi?",
      "goal": "Lab 65 ex2, ex4, ex5 (models, maane hue round trips, aur asli merge/crypto code). Instagram ab Tokyo, Frankfurt, Virginia mein. Har tarah ke data ke liye alag faisla.",
      "nodes": [
        {
          "id": "tokyo",
          "icon": "🗾",
          "label": "Tokyo",
          "x": 140,
          "y": 90
        },
        {
          "id": "fra",
          "icon": "🏰",
          "label": "Frankfurt",
          "x": 470,
          "y": 90
        },
        {
          "id": "va",
          "icon": "🗽",
          "label": "Virginia",
          "x": 800,
          "y": 90
        },
        {
          "id": "cells",
          "icon": "🧱",
          "label": "Cells",
          "x": 300,
          "y": 330
        },
        {
          "id": "keys",
          "icon": "🔑",
          "label": "Key vault",
          "x": 650,
          "y": 330
        }
      ],
      "edges": [
        {
          "from": "tokyo",
          "to": "fra"
        },
        {
          "from": "fra",
          "to": "va"
        },
        {
          "from": "tokyo",
          "to": "cells"
        },
        {
          "from": "keys",
          "to": "va"
        }
      ],
      "viz": {
        "w": 900,
        "h": 420
      },
      "vars": [
        {
          "id": "data",
          "label": "Data"
        },
        {
          "id": "choice",
          "label": "Chunaav"
        },
        {
          "id": "cost",
          "label": "Keemat"
        }
      ],
      "steps": [
        {
          "title": "1. Profile photo",
          "clock": "async",
          "say": "Tokyo mein badli, local commit ~5 ms, baaki regions ko baad mein (async). London ka user Frankfurt se kuch der purani photo dekh sakta hai — Instagram ke liye chalta hai.",
          "nodes": {
            "tokyo": {
              "tone": "ok",
              "badge": "5 ms"
            },
            "fra": {
              "tone": "busy",
              "badge": "purana?"
            },
            "va": {
              "tone": "busy",
              "badge": "purana?"
            },
            "cells": {
              "tone": "idle",
              "badge": ""
            },
            "keys": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "data": "profile",
            "choice": "async (AP)",
            "cost": "thodi der purana"
          },
          "flows": [
            {
              "from": "tokyo",
              "to": "fra",
              "label": "baad mein",
              "tone": "busy"
            }
          ]
        },
        {
          "title": "2. Do jagah ek saath edit",
          "clock": "conflict",
          "say": "Business profile: Tokyo ne bio badla, Paris ne phone (Tokyo ki ghadi 5 ms aage — maana). Poori row ka LWW: Paris ka phone gaya. Har column ka LWW (Cassandra aise karta hai): dono bache. Same field par aage chalti ghadi pehle wale edit ko jita deti hai; vector clock \"saath-saath\" pakad leta hai.",
          "nodes": {
            "tokyo": {
              "tone": "busy",
              "badge": "bio"
            },
            "fra": {
              "tone": "busy",
              "badge": "phone"
            },
            "va": {
              "tone": "idle",
              "badge": ""
            },
            "cells": {
              "tone": "idle",
              "badge": ""
            },
            "keys": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "data": "profile fields",
            "choice": "column LWW / vector clock",
            "cost": "merge kaun likhe"
          },
          "ask": {
            "q": "Video: \"LWW poori row chunta hai, ek update mar jaata hai\". Cassandra ke saath sahi baat?",
            "choices": [
              "Cassandra har column par LWW karta hai; alag fields dono bachte",
              "Sahi — Cassandra poori row par sabse naya timestamp rakhta hai",
              "Cassandra conflict par dono rows hamesha alag-alag rakh leta hai"
            ],
            "answer": 0,
            "hint": "Cassandra timestamp kis cheez par lagata hai — row par ya har column par?",
            "explain": "Cassandra har column (cell) ko apna timestamp deta hai aur conflict usi column par last-write-wins se suljhaata hai. Toh bio aur phone dono bachte. Khatra same column par: aage chalti ghadi wale region ka purana edit jeet sakta hai (lab: \"hello Asia\" jeeta jabki \"bonjour\" baad mein tha).",
            "choiceExplanations": [
              "Cassandra har column (cell) ko apna timestamp deta hai aur conflict usi column par last-write-wins se suljhaata hai. Toh bio aur phone dono bachte. Khatra same column par: aage chalti ghadi wale region ka purana edit jeet sakta hai (lab: \"hello Asia\" jeeta jabki \"bonjour\" baad mein tha).",
              "Row par nahi — har column ka apna timestamp.",
              "Siblings Dynamo/Riak jaisi vector-clock systems rakhti hain; Cassandra LWW se chunta hai."
            ]
          }
        },
        {
          "title": "3. Likes",
          "clock": "crdt",
          "say": "Har region apne slot mein likes ginta hai (G-Counter); merge = har slot ka max. Messages dohraaye, ulte kram mein aaye — phir bhi har region 9,000 (lab ex2). LWW 7,012 deta, naye likes jodna 11–14 hazaar. Shart: har like ek hi region mein gina jaaye.",
          "nodes": {
            "tokyo": {
              "tone": "ok",
              "badge": "5,000"
            },
            "fra": {
              "tone": "ok",
              "badge": "3,000"
            },
            "va": {
              "tone": "ok",
              "badge": "1,000"
            },
            "cells": {
              "tone": "idle",
              "badge": ""
            },
            "keys": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "data": "like count",
            "choice": "G-Counter",
            "cost": "sirf badhta counter"
          }
        },
        {
          "title": "4. Password aur paise",
          "clock": "strong",
          "say": "Password aur paise mein purana sach nahi chalega. Spanner jaisa: majority regions ka Paxos \"haan\" + commit wait (~2ε; ε = 7 ms par ~14 ms). Leader Tokyo, round trips ~150 ms (Virginia) aur ~230 ms (Frankfurt) — maane hue: write ≈ 150 ms, video ka \"sirf 7 ms\" nahi.",
          "nodes": {
            "tokyo": {
              "tone": "busy",
              "badge": "leader"
            },
            "fra": {
              "tone": "idle",
              "badge": ""
            },
            "va": {
              "tone": "ok",
              "badge": "haan"
            },
            "cells": {
              "tone": "idle",
              "badge": ""
            },
            "keys": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "data": "password, billing",
            "choice": "quorum (CP)",
            "cost": "~150 ms write"
          },
          "flows": [
            {
              "from": "tokyo",
              "to": "fra",
              "label": "",
              "tone": "idle"
            }
          ],
          "ask": {
            "q": "Video: Spanner \"sirf 7 ms ka intezaar\" deta hai. Asal mein write ki keemat?",
            "choices": [
              "Majority regions ka Paxos round trip; commit wait saath",
              "Sirf 7 ms — TrueTime ke baad koi aur intezaar nahi",
              "Har region ka round trip — saare regions ka haan chahiye"
            ],
            "answer": 0,
            "hint": "Commit se pehle kitne replicas ne log kiya hona chahiye?",
            "explain": "Spanner har write ko Paxos se majority voting replicas tak bhejta hai — regions ke beech round trip. TrueTime ka commit wait (~2ε — interval ki chaudai; ε = 7 ms par ~14 ms) us ke saath-saath chalta hai. Lab: 3 voting regions, leader Tokyo → sabse paas wale doosre region ka ~150 ms. Isliye asli setups voting replicas paas-paas rakhte hain.",
            "choiceExplanations": [
              "Spanner har write ko Paxos se majority voting replicas tak bhejta hai — regions ke beech round trip. TrueTime ka commit wait (~2ε — interval ki chaudai; ε = 7 ms par ~14 ms) us ke saath-saath chalta hai. Lab: 3 voting regions, leader Tokyo → sabse paas wale doosre region ka ~150 ms. Isliye asli setups voting replicas paas-paas rakhte hain.",
              "7 ms ε hai, commit wait ~2ε; Paxos ka round trip alag.",
              "Majority chahiye, saare nahi (3 mein 2)."
            ]
          }
        },
        {
          "title": "5. Galat config",
          "clock": "cells",
          "say": "100 cells × 1 crore users. Galti 10 min mein pakdi: ek saath sab par → 100%; waves (1 → 5 → 25 → 100 cells, 30 min intezaar) → 1%. 45 min par pakdi → 5%.",
          "nodes": {
            "tokyo": {
              "tone": "idle",
              "badge": ""
            },
            "fra": {
              "tone": "idle",
              "badge": ""
            },
            "va": {
              "tone": "idle",
              "badge": ""
            },
            "cells": {
              "tone": "bad",
              "badge": "1 cell"
            },
            "keys": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "data": "config",
            "choice": "cells + waves",
            "cost": "rollout dheema"
          },
          "flows": [
            {
              "from": "tokyo",
              "to": "cells",
              "label": "canary",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "6. Account delete",
          "clock": "shred",
          "say": "Har user ki data key (DEK), master key se band. u2 ki DEK mitayi: db, kafka log, backup, cache — 4 encrypted copies mein se padhne layak 0; 1,000 random keys mein se 0 kaam aayi. Par ek debug log mein plaintext email abhi bhi.",
          "nodes": {
            "tokyo": {
              "tone": "idle",
              "badge": ""
            },
            "fra": {
              "tone": "idle",
              "badge": ""
            },
            "va": {
              "tone": "idle",
              "badge": ""
            },
            "cells": {
              "tone": "idle",
              "badge": ""
            },
            "keys": {
              "tone": "bad",
              "badge": "DEK mitayi"
            }
          },
          "vars": {
            "data": "user ka PII",
            "choice": "crypto-shredding",
            "cost": "plaintext leaks nahi bachte"
          },
          "flows": [
            {
              "from": "keys",
              "to": "va",
              "label": "",
              "tone": "bad"
            }
          ]
        }
      ],
      "lesson": "Ek system, kai faisle: photo aur likes ke liye async + CRDT, paise aur password ke liye quorum, config ke liye cells, delete ke liye crypto-shredding. Har faisle ki keemat naam lekar bolo."
    },
    {
      "type": "cards",
      "title": "🧭 Poori series ek page par — kab kya chuno",
      "goal": "15 videos ke auzaar, Instagram par lage hue. Har ek ek dikkat ka ilaaj, aur har ek ki keemat.",
      "lesson": "Auzaar ka naam yaad rakhna kaafi nahi: kis dikkat ka ilaaj, kis keemat par, aur kis shart par — teeno saath.",
      "steps": [
        {
          "title": "1. Data ki shakal",
          "say": "Photo (bada, na badalne wala) → object store + CDN. Metadata (chhota, query) → user id se sharded DB (FP7). Likes (garam counter) → counter rows ya memory + batch, regions mein G-Counter (FP8). Feed (fan-out) → hybrid push/pull. Social graph → aage aur peeche ki do lists."
        },
        {
          "title": "2. Raftaar aur poonch",
          "say": "Doori → edge POP, QUIC, local reads. Poonch (100 shards) → data locality (ek shard) ya hedge (jhatke alag hon tab). Line (busy %) → saturation par nazar, load test peak se upar (FP14). Cache ka jhund (thundering herd) → coalescing + TTL jitter (FP10).",
          "ask": {
            "q": "Profile page 100 shards se aata hai aur dheema hai. Sabse pehla design sudhaar?",
            "choices": [
              "User id se shard karo taaki profile ek shard se aaye",
              "Har shard par hedge lagao, 100 shards rehne do",
              "Shards 100 se 1,000 karo, har shard chhota aur tez"
            ],
            "answer": 0,
            "hint": "Video ka part 1: photo id se shard ya user id se?",
            "explain": "Sabse bada sudhaar fan-out hi hatana hai: user id se shard karo, profile ek shard se (video, Instagram). Phir 1% poonch 1% hi rehti hai, 63% nahi. Hedge tab kaam ka jab fan-out zaroori ho (search, explore) aur jhatke alag hon. Zyada shards = zyada fan-out = zyada poonch.",
            "choiceExplanations": [
              "Sabse bada sudhaar fan-out hi hatana hai: user id se shard karo, profile ek shard se (video, Instagram). Phir 1% poonch 1% hi rehti hai, 63% nahi. Hedge tab kaam ka jab fan-out zaroori ho (search, explore) aur jhatke alag hon. Zyada shards = zyada fan-out = zyada poonch.",
              "Hedge fan-out ki dawa hai, fan-out hataana behtar.",
              "1,000 shards par 1 − 0.99¹⁰⁰⁰ ≈ 100% pages dheeme."
            ]
          }
        },
        {
          "title": "3. Galti ka daayra",
          "say": "Retry → backoff + jitter, idempotent kaam (FP12). Bhaari bheed → deadline dekh kar load shedding; interactive kaam par line bhari ho toh adaptive LIFO (purani request ki deadline nikal chuki ho sakti hai) — CoDel jaisi wait-seema ke saath, taaki purani requests bhookhi na marein. Bimar dependency → circuit breaker. Galat config → cells + waves. Delete → crypto-shredding, plaintext copies dhoondho. Blameless postmortem (FP14).",
          "ask": {
            "q": "Retry storm ke baad DB metastable haalat mein atka. Recovery ka sahi kram?",
            "choices": [
              "Traffic rok kar thoda-thoda kholo; clients par backoff + jitter",
              "Saara traffic ek saath kholo taaki cache jaldi bhar jaaye",
              "DB restart karo aur retry ka timeout ghata do"
            ],
            "answer": 0,
            "hint": "Video ka cold start: cache khaali, DB gira — traffic kaise wapas laaya?",
            "explain": "Metastable haalat apne aap nahi chhoot-ti: retries khud bojh banate hain. Load balancer par traffic rok kar 1% → 5% → 20% → 100% kholo (cache garam hota jaaye), clients par exponential backoff + jitter, aur circuit breaker. Ek saath kholna same storm dobara laata hai (FP12).",
            "choiceExplanations": [
              "Metastable haalat apne aap nahi chhoot-ti: retries khud bojh banate hain. Load balancer par traffic rok kar 1% → 5% → 20% → 100% kholo (cache garam hota jaaye), clients par exponential backoff + jitter, aur circuit breaker. Ek saath kholna same storm dobara laata hai (FP12).",
              "Ek saath kholna storm dobara laata hai.",
              "Chhota timeout = zyada retries = aur bojh."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Galti ka daayra aur lab ki jaanch",
      "project": "65-instagram",
      "exercise": "ex5-blast",
      "goal": "Cells ka blast radius aur asli crypto-shredding; phir lab ki apni galti-daal jaanch (mutation).",
      "why": "Node 24+ chahiye. ex5 hisaab + asli AES-256-GCM. <code>npm run mutate</code> lab ki copy temp folder mein banakar pehle bina badle tests chalata hai, phir 39 galtiyan ek-ek karke daalta hai (~2–3 min). Jo galtiyan list mein hain unhi ka saboot — har sambhav galti ka nahi.",
      "steps": [
        {
          "text": "Cells aur crypto-shredding.",
          "cmd": "cd docker-labs/65-instagram && npm start -- ex5-blast",
          "expect": "ex5 — galti ka daayra aur bhoolne ka haq (cells: seedha hisaab; crypto: asli AES-256-GCM)\n\n1) 100 cells × 1 crore users. Ek galat config — kitne users par pade? (waves 1 → 5 → 25 → 100 cells, har wave ke baad 30 min intezaar)\n   galti kab pakdi gayi             ek saath sab cells (global)     waves mein\n    10 min baad                       100 crore (100%)                1 crore (1%)\n    45 min baad                       100 crore (100%)                5 crore (5%)\n    75 min baad                       100 crore (100%)                25 crore (25%)\n   100 min baad                       100 crore (100%)                100 crore (100%)\n   → cells tabhi bachaate hain jab cells sach mein alag hon: alag config, alag database, alag control plane. Saanjha DNS,\n     login ya config service sab cells ko saath gira sakta hai. User → cell ka naksha ek patli routing layer rakhti hai;\n     DNS (jaise Route 53) user ID nahi dekhta — video ka \"Route 53 user ID ko cell 42 par bhejta hai\" seedha aise nahi hota.\n\n2) Crypto-shredding: har user ki apni data key (DEK), DEK master key (KEK) se band. Email 4 jagah encrypted copy mein:\n   db, kafka log, backup tape, cache — u2 ki copy padhi: \"priya@example.com\"\n   u2 ne \"account delete\" dabaya → sirf u2 ki DEK mitayi (keys 3 → 2). Ab u2 ki 4 copies mein se padhne layak: 0\n   1,000 random 256-bit keys aazmaayi: kaam aayi 0 (AES-GCM ka tag har galat key pakad leta hai)\n   u1 abhi bhi theek: \"asha@example.com\"\n   par debug log mein plaintext: 1 line abhi bhi \"priya@example.com\" dikhati hai.\n   → ek key mitao, har encrypted copy bekaar — logs, backups, caches chhue bina. Shart: data kahin plaintext mein na gaya ho\n     (debug logs, analytics exports, search index), aur DEK khud kisi backup mein na bachi ho. GDPR (Art. 12, 17): jawab\n     \"bina der kiye, ek mahine ke andar\" — video ka \"30 din\" lagbhag; crypto-shredding ko sab regulators poora mitaana\n     maanenge, pakka nahi — legal team se poochho."
        },
        {
          "text": "39 jaan-boojh kar daali galtiyan — tests pakadte hain?",
          "cmd": "npm run mutate",
          "expect": "caught  per-second rate  (failed: ex0: budget sheet arithmetic)\ncaught  erasure-coding overhead  (failed: ex0: budget sheet arithmetic)\ncaught  TOAST chunk size  (failed: ex0: budget sheet arithmetic)\ncaught  presigned URL expiry  (failed: ex1: presigned upload, resume, orphan sweep, tampering (real HTTP))\ncaught  expiry is part of the signature  (failed: ex1: presigned upload, resume, orphan sweep, tampering (real HTTP))\ncaught  method is part of the signature  (failed: ex1: presigned upload, resume, orphan sweep, tampering (real HTTP))\ncaught  fresh AES-GCM nonce  (failed: ex5: blast radius and crypto-shredding)\ncaught  each user has a separate key  (failed: ex5: blast radius and crypto-shredding)\ncaught  resume at the stored offset  (failed: ex1: presigned upload, resume, orphan sweep, tampering (real HTTP))\ncaught  lifecycle rule matches only pending objects  (failed: ex1: presigned upload, resume, orphan sweep, tampering (real HTTP))\ncaught  commit removes the lifecycle tag  (failed: ex1: presigned upload, resume, orphan sweep, tampering (real HTTP))\ncaught  store throughput per ms  (failed: ex2: hot row vs counter rows, retries, region counters)\ncaught  set dedupes a retried like  (failed: ex2: hot row vs counter rows, retries, region counters)\ncaught  G-Counter merge = max  (failed: ex2: hot row vs counter rows, retries, region counters)\ncaught  VIP posts do not push  (failed: ex3: feed model calibration and hybrid trade)\ncaught  α calibration  (failed: ex3: feed model calibration and hybrid trade)\ncaught  a hedge starts only after the wait  (failed: ex4: hedging, quorum write, conflicts)\ncaught  correlated slowness  (failed: ex4: hedging, quorum write, conflicts)\ncaught  majority, not all  (failed: ex4: hedging, quorum write, conflicts)\ncaught  per-cell LWW compares timestamps  (failed: ex4: hedging, quorum write, conflicts)\ncaught  vector-clock concurrency  (failed: ex4: hedging, quorum write, conflicts)\ncaught  shredding deletes the key  (failed: ex5: blast radius and crypto-shredding)\ncaught  wave timing  (failed: ex5: blast radius and crypto-shredding)\ncaught  handshake round trips  (failed: ex0: budget sheet arithmetic)\ncaught  resume renews an expired URL  (failed: ex1: presigned upload, resume, orphan sweep, tampering (real HTTP))\ncaught  only a complete photo is published  (failed: ex1: presigned upload, resume, orphan sweep, tampering (real HTTP))\ncaught  a repeated commit returns the same row  (failed: ex1: presigned upload, resume, orphan sweep, tampering (real HTTP))\ncaught  published bytes are frozen  (failed: ex1: presigned upload, resume, orphan sweep, tampering (real HTTP))\ncaught  timeouts  (failed: ex2: hot row vs counter rows, retries, region counters)\ncaught  rejected vs timed-out accounting  (failed: ex2: hot row vs counter rows, retries, region counters)\ncaught  admission order  (failed: ex2: hot row vs counter rows, retries, region counters)\ncaught  largest-post service time per threshold  (failed: ex3: feed model calibration and hybrid trade)\ncaught  VIP population capped at N  (failed: ex3: feed model calibration and hybrid trade)\ncaught  commit wait  (failed: ex4: hedging, quorum write, conflicts)\ncaught  row LWW compares timestamps  (failed: ex4: hedging, quorum write, conflicts)\ncaught  deterministic tie-break  (failed: ex4: hedging, quorum write, conflicts)\ncaught  vector clock: b newer  (failed: ex4: hedging, quorum write, conflicts)\ncaught  vector clock: equal  (failed: ex4: hedging, quorum write, conflicts)\ncaught  page p99  (failed: ex4: hedging, quorum write, conflicts)\n39 / 39 mutations caught"
        }
      ],
      "observe": {
        "q": "u2 ki DEK mitane ke baad 4 encrypted copies bekaar, par debug log mein email bacha. Is nateeje se kya seekh?",
        "choices": [
          "Shredding sirf encrypted copies mitata; plaintext alag dhoondho",
          "Crypto-shredding kaam nahi karta — debug log ne saboot de diya",
          "Debug log bhi encrypted tha, bas key galat lag gayi thi"
        ],
        "answer": 0,
        "hint": "Kaunsi copy DEK se band thi, kaunsi nahi?",
        "explain": "DEK sirf us data ko bekaar banati hai jo DEK se encrypt hua tha. Debug log mein kisi ne email seedha likh diya — key mitane se plaintext nahi badalta. Isliye PII ko logs, analytics exports, search index mein plaintext jaane se rokna zaroori hai, aur DEK khud backups mein na bache.",
        "choiceExplanations": [
          "DEK sirf us data ko bekaar banati hai jo DEK se encrypt hua tha. Debug log mein kisi ne email seedha likh diya — key mitane se plaintext nahi badalta. Isliye PII ko logs, analytics exports, search index mein plaintext jaane se rokna zaroori hai, aur DEK khud backups mein na bache.",
          "Encrypted copies sach mein bekaar hui (0 of 4, 1,000 guesses mein 0).",
          "Log line plaintext thi — lab ne jaan-boojh kar aisa daala."
        ]
      },
      "lesson": "Galti hogi — daayra chhota rakho (cells), aur bhoolna ho toh key mitao. Aur apne tests ko bhi jaancho: galti daalo, dekho pakdi gayi ya nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — duniya bhar ke faisle",
    "instructions": "Pehle socho: is data ka purana dikhna chalega? Galti hui toh kitne log? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Creator payouts ka ledger teen regions mein chahiye. PM: \"Cassandra LWW se sab tez aur simple\". Tumhari salah?",
        "choices": [
          "Paise ke liye quorum (strong); cross-region der maano",
          "LWW theek hai — conflict kabhi-kabhi hota hai, chalega",
          "Har region apna ledger rakhe, mahine ke ant mein jod lena",
          "Async replication rakho, bas ghadiyan NTP se mila lo"
        ],
        "answer": 0,
        "explain": "Paise mein \"aakhri likha jeete\" ka matlab ek valid transaction ka gayab hona — ghadi ke farq se galat wala bhi jeet sakta hai (lab ex4). Ledger ke liye majority ka haan (Spanner jaisa quorum): write regions ke beech ek round trip (lab: ~150 ms) — paise ke liye sahi keemat. Likes jaise counter ke liye G-Counter, profile ke liye async theek.",
        "choiceExplanations": [
          "Paise mein \"aakhri likha jeete\" ka matlab ek valid transaction ka gayab hona — ghadi ke farq se galat wala bhi jeet sakta hai (lab ex4). Ledger ke liye majority ka haan (Spanner jaisa quorum): write regions ke beech ek round trip (lab: ~150 ms) — paise ke liye sahi keemat. Likes jaise counter ke liye G-Counter, profile ke liye async theek.",
          "Paise mein kabhi-kabhi bhi galat chalega nahi.",
          "Mahine ke ant tak alag sach = double payout ka khatra.",
          "NTP ghadi ko milliseconds tak hi milata hai; LWW ki dikkat bachi rehti."
        ]
      },
      {
        "q": "User ne account delete kiya. User ka data Kafka log, backup tapes, analytics export aur search index mein hai. Sabse achha plan?",
        "choices": [
          "Encrypted copies ke liye DEK mitao; plaintext copies (export, index) alag mitao",
          "Sirf primary DB ki row mitao — baaki copies apne aap purani ho jaayengi",
          "Saare backup tapes dobara likho, har jagah se user hatao",
          "Kuch mat karo — Kafka log immutable hai, mitana mumkin nahi"
        ],
        "answer": 0,
        "explain": "Crypto-shredding: jo copies user ki DEK se encrypted hain (log, backup, cache), DEK mitate hi bekaar. Plaintext mein gayi copies (analytics export, search index, debug logs) dhoondh kar alag mitani padti hain. GDPR jawab \"bina der, ek mahine ke andar\" maangta hai; crypto-shredding ko poora mitaana mana jaaye ya nahi — legal se poochho.",
        "choiceExplanations": [
          "Crypto-shredding: jo copies user ki DEK se encrypted hain (log, backup, cache), DEK mitate hi bekaar. Plaintext mein gayi copies (analytics export, search index, debug logs) dhoondh kar alag mitani padti hain. GDPR jawab \"bina der, ek mahine ke andar\" maangta hai; crypto-shredding ko poora mitaana mana jaaye ya nahi — legal se poochho.",
          "Copies purani hokar bhi padhi ja sakti hain.",
          "Petabytes ke tapes dobara likhna bahut mehnga — isi liye crypto-shredding.",
          "Immutable log mein bhi encrypted data DEK ke bina bekaar."
        ]
      }
    ]
  },
  "success": [
    "Har tarah ke data ke liye consistency chun sakte ho",
    "Cells aur crypto-shredding kab kaam karte hain bata sakte ho",
    "Series ke auzaar ko dikkat aur keemat se jod sakte ho"
  ],
  "cards": [
    {
      "front": "Spanner jaisa strong write (3 regions, maane hue RTT)?",
      "back": "Majority ka Paxos round trip (~150 ms) + commit wait ~2ε saath-saath — \"sirf 7 ms\" nahi; paas ke regions mein commit wait hi bada hissa."
    },
    {
      "front": "Cassandra conflict?",
      "back": "Har column par last-write-wins: alag fields dono bachte; same field par aage chalti ghadi jeet sakti hai."
    },
    {
      "front": "Crypto-shredding ki shart?",
      "back": "Sirf DEK-encrypted copies bekaar hoti hain; plaintext copies (logs, exports, index) aur DEK ke backups alag sambhalo."
    }
  ]
}
]);
})();
