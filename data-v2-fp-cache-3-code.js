/* First Principles — FAANG Senior Engineer.
   Source credit: Caching (t9jtxlu7k4k), numbered video 10/15.
   Evidence: docker-labs/60-caching/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "r", "icon": "📖", "label": "reader", "x": 160, "y": 120}, {"id": "w", "icon": "✏️", "label": "writer + delete", "x": 450, "y": 120}, {"id": "l", "icon": "🎟️", "label": "lease", "x": 740, "y": 120}];
const EDGES = [{"from": "r", "to": "w"}, {"from": "w", "to": "l"}];
VISUALS["fp-cache-code"] = { t: "Delete ke baad purana set: race. Lease token race rokta hai; Bloom na-maujood ids rokta hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { r: {tone:'bad',badge:'v1 set'}, w: {tone:'ok',badge:'v2 + delete'}, l: {tone:'acc',badge:'set thukraya'} } }, {w:900,h:240}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-cache-code",
  "icon": "🧩",
  "group": "⚡ Caching",
  "title": "Caching 3 · Code — delete ki race, lease aur Bloom filter",
  "badge": "Race Pakadne Wala",
  "objectives": [
    "Delete ke baad bhi purana value kaise aata hai (code mein)",
    "Lease: token, radd, thukraya hua set",
    "Bloom filter ka code: m, k, double hashing, false positive"
  ],
  "lesson": [
    "<h3>📋 Notice board</h3><p>Office ke notice board par meeting ka samay likha hai: 3 baje. Manager samay badal kar 4 karta hai aur peon ko bolta hai \"board saaf karo\". Peon saaf kar deta hai. Par ek purana clerk, jo 3 baje wala parcha pehle utha chuka tha, chai pee kar lautta hai aur board par \"3 baje\" chipka deta hai.</p><p>Board saaf hua tha, phir bhi purana samay wapas. Cache mein bilkul aisi race hoti hai. Aaj code mein race dekhenge, aur ek token se race rokenge.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🏁 invalidation.js: delete ke baad bhi purana value — aur lease",
      "goal": "lib/invalidation.js (model). Cache-aside ek hot key par: reader miss par DB padhta hai, kabhi-kabhi set se pehle ruk jaata hai (GC pause); writer DB likh kar cache delete karta hai. Lab 60 ex3 isi code ko 1 ghanta chalata hai.",
      "code": {
        "title": "lib/invalidation.js",
        "file": "docker-labs/60-caching/lib/invalidation.js",
        "from": 19,
        "text": "  const read = () => {\n    reads++;\n    if (cache && now < cache.until) { if (cache.v !== db) stale++; return; }\n    const token = lease ? (leaseHolder === null ? (leaseHolder = ++leaseId) : null) : 0;   // only one filler per lease\n    if (lease && token === null) return;                  // another reader is filling: this one waits / reads DB (not counted stale)\n    q.push(now + 2, () => {                               // DB read 2 ms\n      const v = db;\n      const delay = r() < pauseP ? pauseMs : 0.1;         // GC pause or slow network before the set\n      q.push(now + delay, () => {\n        if (lease && leaseHolder !== token) return;       // a delete cancelled this lease: drop the old value\n        if (lease) leaseHolder = null;\n        cache = { v, until: now + ttl }; checkStale();\n      });\n    });\n  };\n  const write = () => {\n    q.push(now + 3, () => {                               // DB write 3 ms\n      db++; checkStale();\n      q.push(now + 0.2, () => {\n        if (r() < lostDelete) return;                     // delete message lost\n        cache = null; leaseHolder = null; checkStale();\n      });\n    });\n  };"
      },
      "vars": [
        {
          "id": "db",
          "label": "DB"
        },
        {
          "id": "cache",
          "label": "Cache"
        },
        {
          "id": "lease",
          "label": "Lease token"
        }
      ],
      "steps": [
        {
          "title": "1. Hit",
          "say": "Line 21: cache mein value hai aur TTL baaki → seedha jawab. Value DB se alag ho toh <code>stale++</code>: user ne purana data dekha.",
          "line": "21",
          "vars": {
            "db": "v1",
            "cache": "khaali",
            "lease": "—"
          }
        },
        {
          "title": "2. Miss: DB padho",
          "say": "Reader R ko miss mila. Line 24–25: 2 ms baad DB se <code>v = db</code> = v1. Line 26: 1% baar 200 ms ka pause (GC ya dheema network) set se pehle.",
          "line": "24-26",
          "vars": {
            "db": "v1",
            "cache": "khaali",
            "lease": "— (lease band)"
          }
        },
        {
          "title": "3. Writer beech mein",
          "say": "Pause ke dauraan writer W: line 36 <code>db++</code> (v2), line 39 cache delete. Cache pehle se khaali tha — delete ne kuch nahi mitaaya.",
          "line": "34-41",
          "vars": {
            "db": "v2",
            "cache": "khaali",
            "lease": "—"
          }
        },
        {
          "title": "4. Purana set",
          "say": "R jaaga. Line 30: <code>cache = { v: v1, … }</code>. DB mein v2, cache mein v1. Agla write delete na kare tab tak har reader ko v1 (ttl = Infinity par).",
          "line": "30",
          "vars": {
            "db": "v2",
            "cache": "v1 ✗",
            "lease": "—"
          },
          "ask": {
            "q": "TTL 30 s lagaya. Race ruki?",
            "choices": [
              "Nahi; race same, bas v1 ab 30 s mein khud mit jaata hai",
              "Haan; TTL ke saath set purane value ko DB se milaakar dekhta hai",
              "Haan; TTL ki wajah se delete pause ke baad dobara chalta hai"
            ],
            "answer": 0,
            "hint": "Line 30 TTL ke saath kya alag karti hai?",
            "explain": "TTL sirf <code>until</code> set karta hai: galti ki umar 30 s. Race phir bhi hoti hai. Lab 60 ex3 A: TTL 30 s par 1 s aur 10 s par v1, 1 min par v2.",
            "choiceExplanations": [
              "TTL sirf <code>until</code> set karta hai: galti ki umar 30 s. Race phir bhi hoti hai. Lab 60 ex3 A: TTL 30 s par 1 s aur 10 s par v1, 1 min par v2.",
              "Set DB se kuch milaata nahi; line 30 seedha likhti hai.",
              "Delete ek hi baar chalta hai (line 37–40); TTL delete dobara nahi bhejta."
            ]
          }
        },
        {
          "title": "5. Lease on",
          "say": "lease = true. Line 22: miss par reader ko token milta hai (sirf ek filler). Line 39: delete <code>leaseHolder = null</code> — token radd. Line 28: R ka token ab holder nahi → set thukraya.",
          "line": "22-28",
          "vars": {
            "db": "v2",
            "cache": "khaali (set thukraya)",
            "lease": "radd"
          },
          "ask": {
            "q": "Lease ke saath line 23 doosre readers ko seedha lauta deti hai. Kyun?",
            "choices": [
              "Ek key par ek hi filler: baaki ruk kar dobara poochte hain, DB par herd nahi",
              "Doosre readers ke paas token nahi, isliye un readers ko hamesha purana value milta",
              "Line 23 bas gin'ti chhupaati hai; asli memcache mein sab DB padhte hain"
            ],
            "answer": 0,
            "hint": "Facebook memcache (NSDI 2013) mein lease do kaam karta hai. Doosra kaam kya?",
            "explain": "Lease token ek waqt mein ek hi reader ko milta hai. Baaki readers thoda ruk kar dobara cache poochte hain. Token se stale set bhi rukta hai aur hot key par thundering herd bhi (sab ek saath DB nahi jaate). Model mein token ke bina wale readers stale nahi gine jaate.",
            "choiceExplanations": [
              "Lease token ek waqt mein ek hi reader ko milta hai. Baaki readers thoda ruk kar dobara cache poochte hain. Token se stale set bhi rukta hai aur hot key par thundering herd bhi (sab ek saath DB nahi jaate). Model mein token ke bina wale readers stale nahi gine jaate.",
              "Token na milne par purana value nahi milta; reader ko \"thoda ruko\" milta hai.",
              "Memcache paper mein lease ka doosra kaam herd rokna hi hai."
            ]
          }
        },
        {
          "title": "6. Khoya hua delete",
          "say": "Line 38: <code>lostDelete</code> chance se delete message kho jaata hai (network, crash). Tab na delete hua, na lease radd. Lab 60 ex3 B: 1% delete khone par stale reads ~2% tak, lease ke saath bhi.",
          "line": "38",
          "vars": {
            "db": "v3",
            "cache": "v2 ✗",
            "lease": "radd nahi hua"
          }
        }
      ],
      "lesson": "Delete race: purana reader delete ke baad purana value set kar deta hai. TTL galti ki umar baandhta hai; lease race rokta hai; khoye hue delete ke liye TTL ya change-log se invalidation."
    },
    {
      "type": "dryrun",
      "title": "🌸 bloom.js: \"pakka nahi\" aur \"shayad\"",
      "goal": "lib/bloom.js. 10 lakh user ids. Har id ke liye k bits on. Na-maujood id ke k mein se ek bhi bit off mila → pakka nahi hai, DB mat jao. Lab 60 ex4 B isi filter ko naapta hai.",
      "code": {
        "title": "lib/bloom.js",
        "file": "docker-labs/60-caching/lib/bloom.js",
        "from": 3,
        "text": "const mix = x => { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; };\nfunction bloom(n, bitsPerKey = 10) {\n  const m = n * bitsPerKey, k = Math.max(1, Math.round(bitsPerKey * Math.LN2)), bits = new Uint8Array(Math.ceil(m / 8));\n  const probe = (id, fn) => { const h1 = mix(id), h2 = mix(id ^ 0x9e3779b9) | 1; for (let i = 0; i < k; i++) if (fn(((h1 + Math.imul(i, h2)) >>> 0) % m) === false) return false; return true; };\n  return {\n    add: id => probe(id, b => { bits[b >> 3] |= 1 << (b & 7); }),\n    has: id => probe(id, b => (bits[b >> 3] & (1 << (b & 7))) !== 0),\n    k, m, bytes: bits.length,\n    theory: () => Math.pow(1 - Math.exp(-k * n / m), k),\n  };\n}"
      },
      "vars": [
        {
          "id": "m",
          "label": "m (bits)"
        },
        {
          "id": "k",
          "label": "k (probes)"
        },
        {
          "id": "ans",
          "label": "Jawab"
        }
      ],
      "steps": [
        {
          "title": "1. Size",
          "say": "Line 5: <code>m = n × 10</code> = 1 crore bits = 1.25 MB. <code>k = round(10 × ln 2)</code> = 7.",
          "line": "5",
          "vars": {
            "m": "1,00,00,000",
            "k": "7",
            "ans": "—"
          }
        },
        {
          "title": "2. Do hash, saat jagah",
          "say": "Line 6: <code>h1</code>, <code>h2</code> do hash; i-wi jagah = <code>(h1 + i·h2) mod m</code>. Saat alag hash functions ki jagah do (double hashing). <code>| 1</code> h2 ko odd rakhta hai, taaki h2 kabhi 0 na ho.",
          "line": "6",
          "vars": {
            "m": "1 crore",
            "k": "7",
            "ans": "7 bit positions"
          }
        },
        {
          "title": "3. add",
          "say": "Line 8: saaton bits on. 10 lakh ids ke baad lagbhag aadhe bits on (1 − e^(−0.7) ≈ 50%).",
          "line": "8",
          "vars": {
            "m": "1 crore",
            "k": "7",
            "ans": "~50% bits on"
          }
        },
        {
          "title": "4. has",
          "say": "Line 9: koi bhi bit off → <code>false</code> turant (line 6 ka <code>=== false</code>). Saaton on → \"shayad\".",
          "line": "9",
          "vars": {
            "m": "1 crore",
            "k": "7",
            "ans": "off = pakka nahi"
          },
          "ask": {
            "q": "Kya maujood user ko kabhi \"nahi hai\" mil sakta hai?",
            "choices": [
              "Nahi, agar add hua ho: add ne saaton bits on kiye, koi bit off nahi hota",
              "Haan, ~0.8% baar; Bloom dono taraf barabar galti karta hai har haal mein",
              "Haan, jab doosri id ke bits us user ke bits ko off kar dete hain"
            ],
            "answer": 0,
            "hint": "Line 8 bits sirf on karti hai. Koi line bit off karti hai?",
            "explain": "Bits sirf on hote hain, kabhi off nahi. Jo id add hui, us id ke saaton bits on hain: false negative nahi. Shart: id add hui ho. Lab ex4 B: naye signup filter mein nahi jode → 99,100 asli requests ko \"nahi hai\". Isliye har insert par add.",
            "choiceExplanations": [
              "Bits sirf on hote hain, kabhi off nahi. Jo id add hui, us id ke saaton bits on hain: false negative nahi. Shart: id add hui ho. Lab ex4 B: naye signup filter mein nahi jode → 99,100 asli requests ko \"nahi hai\". Isliye har insert par add.",
              "Galti sirf ek taraf: na-maujood id ko \"shayad\" (false positive).",
              "Doosri ids bits sirf on karti hain; off karne wala code hi nahi hai."
            ]
          }
        },
        {
          "title": "5. Theory vs naap",
          "say": "Line 11: false positive = (1 − e^(−kn/m))^k = 0.82%. Lab ne 10 lakh na-maujood ids par 0.83% naapa. Ek lookup ~25–33 ns.",
          "line": "11",
          "vars": {
            "m": "1 crore",
            "k": "7",
            "ans": "0.83% (theory 0.82%)"
          }
        }
      ],
      "lesson": "Bloom: \"nahi\" pakka, \"shayad\" ~0.8% galat (10 bits/key). Delete nahi hota, aur har insert par add zaroori."
    },
    {
      "type": "docker",
      "title": "🧪 Race ko naapo",
      "project": "60-caching",
      "exercise": "ex3-invalidation",
      "goal": "Hissa A: ek race, haath se, teen tareekon par. Hissa B: 1 ghanta, ek hot key, delete khone ke saath aur bina.",
      "why": "Node 24+ chahiye. Seeded model, har run same; koi asli cache server nahi. Asli Redis + CDC: lab 33.",
      "steps": [
        {
          "text": "Race aur 1 ghante ka model.",
          "cmd": "cd docker-labs/60-caching && npm start -- ex3-invalidation",
          "expect": "A. Script (ek hi race, haath se): DB = v1, cache khaali.\n   t=1 ms   reader R: cache miss → DB se v1 padha → GC pause\n   t=5 ms   writer W: DB = v2\n   t=6 ms   writer W: cache delete (abhi cache mein kuch nahi)\n   t=105 ms reader R jaaga: cache = v1  ← purana value, DB mein v2\n\ntareeka                        1 s        10 s       1 min      10 min  baad reader ko kya mila\nsirf delete (koi TTL nahi)   v1 ✗       v1 ✗       v1 ✗       v1 ✗      \ndelete + TTL 30 s            v1 ✗       v1 ✗       v2 ✓       v2 ✓      \ndelete + lease + TTL 30 s    v2 ✓       v2 ✓       v2 ✓       v2 ✓      \n\n→ Bina TTL: purana v1 tab tak jab tak koi agla write delete na kare — price roz badalta hai toh poora din.\n  TTL: galti ki umar TTL tak. Lease (Facebook memcache, NSDI 2013): miss par cache ek token deta hai; delete token\n  cancel karta hai; purane token wala set thukra diya jaata hai.\n\nB. MODEL, 1 ghanta, ek hot key: 1,000 reads/sec, write har ~5 s (Poisson). DB read 2 ms, write 3 ms.\n   1% readers ko DB read ke baad 200 ms ka pause. \"Lambi galti\" = 5 ms se lamba stale window.\n\ntareeka                       delete message khota   stale reads           lambi galtiyan   sabse lambi\nsirf delete                   kabhi nahi                 164 (0.005%)          0         0.0 s\nsirf delete                   1%                      66,041 (1.834%)         11         28.0 s\ndelete + TTL 30 s             kabhi nahi               5,559 (0.154%)          2         4.1 s\ndelete + TTL 30 s             1%                      30,235 (0.840%)         10         9.8 s\ndelete + lease + TTL 30 s     kabhi nahi                 142 (0.004%)          0         0.0 s\ndelete + lease + TTL 30 s     1%                      68,053 (1.890%)         12         13.9 s\n\n→ Har write ke baad DB commit se delete tak (0.2 ms) thode stale reads hamesha — woh \"lambi galti\" mein nahi gine.\n→ TTL ke saath race thoda zyada (expiry par naye miss = naye mauke), par har galti TTL ke andar khatam.\n→ Lease race rokta hai; khoya hua delete lease bhi nahi rok sakta — uske liye TTL (ya change-log se invalidation, lab 33).\n→ Model ek key ka hai; bahut saari keys par yahi chhote chance jud kar asli galtiyan bante hain."
        },
        {
          "text": "Lab ke 5 tests (race, lease, Bloom aur herd ke guards samet).",
          "cmd": "npm test",
          "expect": "✔ ladder: a big random ring is far slower than an L1-sized one; random order is slower than sequential\n✔ zipf + LRU: uniform gives top 10% = 10%; more skew, more hits; bigger cache, more hits; LRU keeps its size\n✔ writes: after SIGKILL, write-back loses acked writes; through, group commit and the OS page cache lose none\n✔ invalidation: the delete race leaves old data forever without TTL, until TTL with it, and never with a lease\n✔ herd + penetration: a limiter keeps the DB alive; Bloom has no false negatives and blocks unique-id attacks\nℹ tests 5\nℹ suites 0\nℹ pass 5\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 14459.172433"
        }
      ],
      "observe": {
        "q": "Hissa B: lease + TTL par bhi 1% delete khone se ~68 hazaar stale reads. Lease kyun nahi bacha paaya?",
        "choices": [
          "Delete hi nahi pahuncha, toh lease radd nahi hua; purana value TTL tak rehta hai",
          "Lease sirf pehle reader ko bachata hai, baaki readers ko hamesha stale milta hai",
          "Lease ke saath TTL kaam nahi karta, isliye purana value hamesha ke liye rehta hai"
        ],
        "answer": 0,
        "hint": "Lease kis cheez par radd hota hai? (line 39)",
        "explain": "Lease delete par radd hota hai. Delete kho gaya → na cache mita, na lease radd. Bachaav: TTL (is model mein sabse lambi galti 13.9 s, 30 s se kam), ya DB ke change log se invalidation (CDC, lab 33), jo khoye delete ko dobara bhej sake.",
        "choiceExplanations": [
          "Lease delete par radd hota hai. Delete kho gaya → na cache mita, na lease radd. Bachaav: TTL (is model mein sabse lambi galti 13.9 s, 30 s se kam), ya DB ke change log se invalidation (CDC, lab 33), jo khoye delete ko dobara bhej sake.",
          "Baaki readers ruk kar dobara poochte hain; un readers ko stale nahi gina gaya.",
          "TTL chal raha hai: sabse lambi galti 13.9 s, TTL 30 s ke andar."
        ]
      },
      "lesson": "Har cache invalidation ke liye do sawaal: race kaise rukegi (lease, version), aur khoya delete kaise sudhrega (TTL, change log)."
    }
  ],
  "interview": {
    "title": "Interview Round — invalidation ka code",
    "instructions": "Pehle socho: kaun purana value laaya, aur delete ke baad kaun aaya? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Product price update ke baad bhi kuch users ko ghanton purana price dikh raha hai. Code: DB update, phir cache delete. Koi TTL nahi. Sabse sambhav kaaran?",
        "choices": [
          "Delete race: purane reader ne delete ke baad purana price set kiya; TTL nahi",
          "Redis ne delete command ko chupchaap ignore kar diya, kyunki key bahut garam thi",
          "DB update commit nahi hua, isliye cache ne purana price DB se dobara padha",
          "Browser ne purana price local storage mein hamesha ke liye rakh liya hai"
        ],
        "answer": 0,
        "explain": "Ghanton tak = koi cheez purane value ko mitaa nahi rahi. Reader ne v1 padha, writer ne v2 likh kar delete kiya, phir reader ne v1 set kiya (lab 60 ex3 A). TTL na ho toh agla write hi bachaata hai. Ilaaj: TTL + lease (ya version check).",
        "choiceExplanations": [
          "Ghanton tak = koi cheez purane value ko mitaa nahi rahi. Reader ne v1 padha, writer ne v2 likh kar delete kiya, phir reader ne v1 set kiya (lab 60 ex3 A). TTL na ho toh agla write hi bachaata hai. Ilaaj: TTL + lease (ya version check).",
          "Redis delete ko key ki garmi ke hisaab se ignore nahi karta.",
          "DB mein naya price hai (doosre users ko dikh raha hai); problem cache mein hai.",
          "Kuch hi users aur ghanton tak = cache ki galti; browser cache ki baat alag hai."
        ]
      },
      {
        "q": "Signup service: \"username lene se pehle Bloom filter dekho; 'shayad hai' toh DB check\". Naya user add hua par filter mein add karna bhool gaye. Kya hoga?",
        "choices": [
          "Naye username ko filter \"nahi hai\" bolega; doosra user same naam le sakta hai",
          "Kuch nahi; Bloom filter ka false negative kabhi hota hi nahi, chahe kuch bhi ho",
          "Filter \"shayad hai\" bolega; DB check pakad lega, koi nuksaan nahi hoga",
          "Filter ke saare bits off ho jaayenge aur har username \"nahi hai\" bolega"
        ],
        "answer": 0,
        "explain": "\"Koi false negative nahi\" tabhi jab har insert filter mein add ho. Add bhoole toh naye naam ke bits off reh sakte hain → filter \"nahi hai\" → DB check chhoot gaya → duplicate username. Lab 60 ex4 B: update na karne par 99,100 asli requests galat. Unique constraint DB mein bhi rakho.",
        "choiceExplanations": [
          "\"Koi false negative nahi\" tabhi jab har insert filter mein add ho. Add bhoole toh naye naam ke bits off reh sakte hain → filter \"nahi hai\" → DB check chhoot gaya → duplicate username. Lab 60 ex4 B: update na karne par 99,100 asli requests galat. Unique constraint DB mein bhi rakho.",
          "Shart: id add hui ho. Add nahi hui toh filter ko pata hi nahi.",
          "\"Shayad hai\" tab jab saare bits on hon; naye naam ke bits add hi nahi hue.",
          "Bits kabhi off nahi hote; baaki naam theek kaam karte rahenge."
        ]
      }
    ]
  },
  "success": [
    "Delete race code mein dikha sakte ho",
    "Lease kaise race aur herd rokta hai, bata sakte ho",
    "Bloom ke m, k aur false positive gin sakte ho"
  ],
  "cards": [
    {
      "front": "Delete race?",
      "back": "Reader v1 padhta hai → ruka → writer v2 + delete → reader v1 set. TTL ke bina agla write tak stale (lab 60 ex3 A)."
    },
    {
      "front": "Lease (memcache)?",
      "back": "Miss par token; delete token radd karta hai; purane token ka set thukraya. Ek key par ek filler = herd bhi ruka. Khoya delete nahi rokta → TTL."
    },
    {
      "front": "Bloom 10 bits/key?",
      "back": "k = 7, false positive ~0.82% (lab: 0.83%). \"Nahi\" pakka sirf tab jab har insert add ho. Delete support nahi."
    }
  ]
}
]);
})();
