/* First Principles — FAANG Senior Engineer.
   Source credit: CAP Theorem & PACELC (Ub9yZucpwC0), numbered video 8/15.
   Evidence: docker-labs/58-cap/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "a", "icon": "🅰️", "label": "Replica A", "x": 160, "y": 120}, {"id": "m", "icon": "🔀", "label": "merge()", "x": 450, "y": 120}, {"id": "b", "icon": "🅱️", "label": "Replica B", "x": 740, "y": 120}];
const EDGES = [{"from": "a", "to": "m"}, {"from": "b", "to": "m"}];
VISUALS["fp-cap-code"] = { t: "Har replica apna khaana likhta hai; merge = max per khaana. Kram ya dohraav se nateeja nahi badalta.", html: SD.viz.svg(HERO, EDGES, { nodes: { a: {tone:'ok',badge:'A: 300'}, m: {tone:'acc',badge:'max'}, b: {tone:'ok',badge:'B: 200'} } }, {w:900,h:240}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-cap-code",
  "icon": "🧮",
  "group": "🔀 CAP & PACELC",
  "title": "CAP 3 · Code — bina boss ke milaana (CRDT)",
  "badge": "Merge Ka Mistri",
  "objectives": [
    "G-Counter: merge mein max kyun, jod kyun nahi",
    "OR-Set: hataya item wapas kyun nahi aata",
    "LWW vs version vectors vs CRDT, lab ke numbers se"
  ],
  "lesson": [
    "<h3>🏏 Do scorer, ek match</h3><p>Do scorer alag-alag stands se runs gin rahe hain, phone band. Agar dono apna <b>total</b> likhein toh match ke baad kaunsa total maanein? Agar har scorer sirf <b>apne dekhe runs</b> apne khaane mein likhe, toh baad mein khaane jodna aasaan hai — bas ek hi ball do baar na gin jaaye.</p><p>CRDT data ko aisa shape dete hain. Aaj code line-by-line chalaate hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🧮 Bina boss ke milaana: G-Counter aur OR-Set",
      "goal": "lib/crdt.js. Replicas A aur B 60 s ke liye alag the, dono likhte rahe. Ab jode jaate hain — koi central server nahi, aur merge kisi bhi kram mein, kitni bhi baar ho, nateeja same chahiye (CRDT, Shapiro et al. 2011).",
      "code": {
        "title": "lib/crdt.js",
        "file": "docker-labs/58-cap/lib/crdt.js",
        "from": 8,
        "text": "// G-Counter: one slot per replica; a replica bumps only its own slot.\nconst gcounter = () => dict();\nconst gInc = (c, node, n = 1) => { c[node] = (c[node] || 0) + n; return c; };\nfunction gMerge(a, b) {                    // merge = the bigger number in each slot\n  const out = copy(a);\n  for (const k of Object.keys(b)) out[k] = Math.max(out[k] || 0, b[k]);\n  return out;\n}\nconst gValue = c => Object.values(c).reduce((s, v) => s + v, 0);\n\n// OR-Set (observed-remove, add wins): every add gets a unique tag;\n// a remove deletes only the tags it has SEEN. state = { adds: {item: [tags]}, removed: Set }\nconst orset = () => ({ adds: dict(), removed: new Set() });\nlet tagSeq = 0;\nfunction orAdd(s, item, node) {\n  (s.adds[item] ||= []).push(`${node}:${++tagSeq}`);\n  return s;\n}\nfunction orRemove(s, item) {\n  for (const t of s.adds[item] || []) s.removed.add(t);\n  return s;\n}\nfunction orMerge(a, b) {                   // union of tags, union of removed tags\n  const out = orset();\n  for (const src of [a, b]) for (const item of Object.keys(src.adds)) {\n    out.adds[item] = [...new Set([...(out.adds[item] || []), ...src.adds[item]])];\n  }\n  out.removed = new Set([...a.removed, ...b.removed]);\n  return out;\n}\nconst orValue = s => Object.keys(s.adds)\n  .filter(item => s.adds[item].some(t => !s.removed.has(t))).sort();"
      },
      "vars": [
        {
          "id": "a",
          "label": "Replica A"
        },
        {
          "id": "b",
          "label": "Replica B"
        },
        {
          "id": "m",
          "label": "Merge ke baad"
        }
      ],
      "steps": [
        {
          "title": "1. Har replica ka khaana",
          "say": "Line 9–10: G-Counter ek dictionary hai: har replica ka apna khaana (slot). Replica sirf apna khaana badhata hai. Split se pehle: base = 1,000 likes.",
          "line": "9-10",
          "vars": {
            "a": "{base: 1000}",
            "b": "{base: 1000}",
            "m": "—"
          }
        },
        {
          "title": "2. Split mein likes",
          "say": "A par 300 likes → A ka khaana 300. B par 200 → B ka khaana 200. Koi bhi doosre ka khaana nahi chhoota.",
          "line": "10",
          "vars": {
            "a": "{base: 1000, A: 300}",
            "b": "{base: 1000, B: 200}",
            "m": "—"
          },
          "ask": {
            "q": "LWW mein dono taraf ne ginti likhi thi (1,300 aur 1,200). G-Counter mein kya alag hai?",
            "choices": [
              "Har replica apna khaana likhta; jodne par dono khaane bache",
              "G-Counter mein bhi baad wali ginti jeet'ti hai",
              "G-Counter har like ko sabhi replicas par turant bhejta hai"
            ],
            "answer": 0,
            "hint": "Ginti ek value hai ya khaanon ka jod?",
            "explain": "LWW ke liye ginti ek value thi — ek rakhi, ek mitayi (lab ex4: 1,200, yaani 300 likes gayab). G-Counter mein value = khaanon ka jod; A aur B alag khaanon mein likhte hain, isliye takraav hi nahi.",
            "choiceExplanations": [
              "LWW ke liye ginti ek value thi — ek rakhi, ek mitayi (lab ex4: 1,200, yaani 300 likes gayab). G-Counter mein value = khaanon ka jod; A aur B alag khaanon mein likhte hain, isliye takraav hi nahi.",
              "G-Counter mein koi timestamp nahi; kuch jeet'ta ya haarta nahi.",
              "Split mein bhejna mumkin hi nahi tha; G-Counter baad mein jodta hai."
            ]
          }
        },
        {
          "title": "3. Merge = max",
          "say": "Line 11–15: har khaane mein dono taraf ka <b>bada</b> number lo.",
          "line": "11-15",
          "vars": {
            "a": "{base: 1000, A: 300}",
            "b": "{base: 1000, B: 200}",
            "m": "{base: 1000, A: 300, B: 200}"
          },
          "ask": {
            "q": "Merge mein khaane ka max kyun, jod kyun nahi?",
            "choices": [
              "Dohra message aaye toh jod dohri ginti kare; max nahi",
              "Max tez hai; jod karne mein zyada CPU lagta hai",
              "Jod karne par numbers 32-bit ki seema paar kar jaate"
            ],
            "answer": 0,
            "hint": "A ki state B tak do baar pahunch jaaye (network ne dohra bheja). Jod mein base kitna hoga?",
            "explain": "Network messages dohra sakta hai, alag kram mein la sakta hai. Max idempotent hai: merge(a, a) = a. Jod karte toh dohra message base ko 2,000 bana deta. Har khaane ko sirf khaane ka replica badhata hai, isliye bada number hi sabse naya hai.",
            "choiceExplanations": [
              "Network messages dohra sakta hai, alag kram mein la sakta hai. Max idempotent hai: merge(a, a) = a. Jod karte toh dohra message base ko 2,000 bana deta. Har khaane ko sirf khaane ka replica badhata hai, isliye bada number hi sabse naya hai.",
              "Speed wajah nahi; dohraav mein sahi rehna wajah hai.",
              "Lab ke numbers chhote hain; seema ka sawaal nahi."
            ]
          }
        },
        {
          "title": "4. Value = jod",
          "say": "Line 16: likes = saare khaanon ka jod = 1,000 + 300 + 200 = <b>1,500</b>. Lab ex4: G-Counter 1,500, LWW 1,200.",
          "line": "16",
          "vars": {
            "a": "1,300",
            "b": "1,200",
            "m": "1,500"
          }
        },
        {
          "title": "5. OR-Set: har add ka tag",
          "say": "Line 20–25: cart. Har add ek naya tag paata hai (<code>X:1</code>). Cart mein apple (X:1), bread (X:2).",
          "line": "20-25",
          "vars": {
            "a": "apple{X:1}, bread{X:2}",
            "b": "apple{X:1}, bread{X:2}",
            "m": "—"
          }
        },
        {
          "title": "6. A ne apple hataya",
          "say": "Line 26–29: remove apple ke <b>dekhe hue</b> tags (X:1) ko removed mein daalta hai. A ne chai joda (A:3), B ne dal joda (B:4).",
          "line": "26-29",
          "vars": {
            "a": "removed {X:1}; chai{A:3}",
            "b": "dal{B:4}",
            "m": "—"
          }
        },
        {
          "title": "7. Merge aur value",
          "say": "Line 30–37: tags ka union, removed ka union. Line 38–39: item tabhi dikhe jab item ka kam se kam ek tag removed mein na ho.",
          "line": "30-39",
          "vars": {
            "a": "",
            "b": "",
            "m": "bread, chai, dal"
          },
          "ask": {
            "q": "Split mein A ne apple hataya, par B ne split ke dauraan apple dobara joda (naya tag B:5). Merge ke baad?",
            "choices": [
              "Apple rehta hai — A ne sirf X:1 dekha tha; B ka naya tag B:5 hataya hi nahi",
              "Apple jaata hai — remove hamesha add se jeet'ta hai",
              "Merge fail hota hai — ek item par do ulte kaam ek saath nahi chal sakte"
            ],
            "answer": 0,
            "hint": "Remove ne kaunse tags removed mein daale?",
            "explain": "OR-Set mein remove sirf dekhe hue tags hataata hai. B ka naya tag B:5 A ne dekha hi nahi, toh apple ka ek tag zinda → apple dikhta hai (add jeet'ta hai). Union (Dynamo jaisa) mein hataya apple wapas aaya tha (ex4: 500 mein 500); OR-Set mein bina naye add ke apple wapas nahi aata.",
            "choiceExplanations": [
              "OR-Set mein remove sirf dekhe hue tags hataata hai. B ka naya tag B:5 A ne dekha hi nahi, toh apple ka ek tag zinda → apple dikhta hai (add jeet'ta hai). Union (Dynamo jaisa) mein hataya apple wapas aaya tha (ex4: 500 mein 500); OR-Set mein bina naye add ke apple wapas nahi aata.",
              "OR-Set ka niyam ulta hai: dekha hua tag hi hat'ta hai, naya add bach jaata hai.",
              "CRDT merge kabhi fail nahi hota; har kram mein ek hi nateeja."
            ]
          }
        }
      ],
      "lesson": "CRDT mein data ka shape aisa banate hain ki merge kisi bhi kram mein, dohraane par bhi, same nateeja de: counter ke liye har replica ka khaana + max, set ke liye har add ka tag + dekhe hue tags hataana."
    },
    {
      "type": "cards",
      "title": "🔀 Teen merge, teen nateeje",
      "goal": "Lab 58 ex4 (seeded): replicas A aur B 60 s alag, dono writes lete rahe, phir jude.",
      "lesson": "LWW chupchaap ek write mitata hai (aur skew mein galat wala). Version vectors takraav pakadte hain, faisla app par chhodte hain. CRDT data ke shape se takraav hi khatam karte hain — par sirf un types ke liye jo CRDT ban sakte hain.",
      "steps": [
        {
          "title": "1. Naam aur ghadi",
          "say": "1,000 users, har user ka naam dono taraf badla; B ki ghadi 5 s peeche. LWW: har user ka ek write chupchaap gaya, aur 69 baar (6.9%) asal mein <b>pehle</b> wala write jeeta (hisaab se ~8%: s/T − s²/2T²). Version vectors: 1,000 conflicts pakde.",
          "ask": {
            "q": "Version vectors ne 1,000 conflicts pakde. Ab kya?",
            "choices": [
              "Dono versions rakho; app ya user tay kare",
              "Version vector apne aap sahi naam chun leta hai",
              "Ghadi theek karo; phir conflicts khatam ho jaayenge"
            ],
            "answer": 0,
            "hint": "Version vector kya batata hai: kaun jeeta, ya ki takraav hua?",
            "explain": "Version vector sirf itna batata hai ki dono versions ne ek-doosre ka update nahi dekha — koi bhi doosre ka descendant nahi (concurrent). Writes ghadi par alag samay par bhi ho sakte hain. Kaunsa sahi hai, business ka sawaal hai. Dynamo (2007) dono versions app ko deta tha. LWW same faisla chupchaap timestamp se karta — aur skew mein galat.",
            "choiceExplanations": [
              "Version vector sirf itna batata hai ki dono versions ne ek-doosre ka update nahi dekha — koi bhi doosre ka descendant nahi (concurrent). Writes ghadi par alag samay par bhi ho sakte hain. Kaunsa sahi hai, business ka sawaal hai. Dynamo (2007) dono versions app ko deta tha. LWW same faisla chupchaap timestamp se karta — aur skew mein galat.",
              "Version vector jeetne wala nahi chunta; concurrent versions batata hai.",
              "Ghadi theek karne se missing causal dependency nahi banti; dono versions phir bhi takraate hain."
            ]
          }
        },
        {
          "title": "2. Cart",
          "say": "500 carts {apple, bread}; A ne apple hataya + chai joda, B ne dal joda. Iraada {bread, chai, dal}. LWW: har cart mein joda item gayab (500). Union: kuch nahi khoya, par hataya apple wapas (500) — Dynamo paper ki anomaly. OR-Set: dono 0."
        },
        {
          "title": "3. Video ki galti: Figma aur Google Docs",
          "say": "Video kehta hai dono CRDT use karte hain. Figma (2019 blog): central server rakhta hai, CRDT se prerit apna system — khud kehta hai \"true CRDT nahi\". Google Docs (2010): operational transformation (OT). CRDT ek tareeka hai, collaboration ka akela tareeka nahi."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Teen merge, ek split",
      "project": "58-cap",
      "exercise": "ex4-conflicts",
      "goal": "Likes (LWW vs G-Counter), naam (LWW + skew vs version vectors), cart (LWW vs union vs OR-Set). Phir lab ke tests.",
      "why": "Node 24+ chahiye. ex4 seeded hai, har run same.",
      "steps": [
        {
          "text": "Lab folder se: conflicts.",
          "cmd": "cd docker-labs/58-cap && npm start -- ex4-conflicts",
          "expect": "a) Likes counter — pehle 1,000; split mein A par 300, B par 200 (sach: 1,500)\n   LWW (har taraf ne GINTI likhi, baad wali jeeti)   1,200  → 300 likes gayab\n   G-Counter CRDT (har replica ka apna khaana)        1,500\n\nb) Naam — 1,000 users, har user ka naam dono taraf badla; B ki ghadi 5 s peeche\n   LWW                     har user ka ek write chupchaap gaya (1,000);  69 baar (6.9%) asal mein PEHLE wala write jeeta\n   version vectors         1,000 conflicts pakde — dono versions rakhe, app/user tay kare\n\nc) Cart — 500 carts {apple, bread}; split mein A ne apple hataya + chai joda, B ne dal joda. Iraada: {bread, chai, dal}\n   LWW (poora cart, baad wala jeeta)       joda hua item gayab: 500   hataya apple wapas: 254\n   dono versions ka union (Dynamo jaisa)   joda hua item gayab:   0   hataya apple wapas: 500\n   OR-Set CRDT (add jeetta hai)            joda hua item gayab:   0   hataya apple wapas:   0"
        },
        {
          "text": "Lab ke tests (CRDT ke niyam, ajeeb naam wale keys bhi).",
          "cmd": "npm test",
          "expect": "✔ CRDT merges: order and repeats do not change the result (G-Counter, OR-Set); version vectors spot concurrency (5.753274ms)\n✔ bank split: CP refuses the small side and never overpays; LWW loses withdrawals from the books; offline limit bounds the loss (4.252657ms)\n✔ lag model: replicas apply in order; read-your-writes misses match the lag ranges; fixes remove the anomalies (38.246311ms)\n✔ conflicts: LWW loses likes and cart adds; the union brings back a removed item; CRDTs keep the intent (5.263998ms)\n✔ split brain: without a quorum the small side's acked writes are lost; fencing stops a woken old leader (0.524248ms)\n✔ PACELC: sync writes are on at least one replica when acked; async can lose acked writes in flight (238.155241ms)\nℹ tests 6\nℹ suites 0\nℹ pass 6\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 334.308432"
        }
      ],
      "observe": {
        "q": "Union merge ne kuch nahi khoya, phir bhi hataya apple 500 carts mein wapas aaya. Kyun?",
        "choices": [
          "Hataane ka koi nishaan nahi bacha tha",
          "B ne har cart mein apple dobara joda",
          "Union bug hai; Dynamo mein aisa kabhi nahi hota"
        ],
        "answer": 0,
        "hint": "A ke cart mein \"apple hataya\" kahan likha tha?",
        "explain": "A ka cart sirf {bread, chai} tha — apple ka na hona, hataane ka nishaan nahi. Union ne B ke {apple, bread, dal} ke saath joda toh apple laut aaya. Dynamo paper bhi kehta hai ki hataye items wapas aa sakte hain. OR-Set hataane ka nishaan (removed tags) rakhta hai.",
        "choiceExplanations": [
          "A ka cart sirf {bread, chai} tha — apple ka na hona, hataane ka nishaan nahi. Union ne B ke {apple, bread, dal} ke saath joda toh apple laut aaya. Dynamo paper bhi kehta hai ki hataye items wapas aa sakte hain. OR-Set hataane ka nishaan (removed tags) rakhta hai.",
          "B ne sirf dal joda; apple pehle se B ke cart mein tha.",
          "Dynamo paper khud is anomaly ka zikr karta hai."
        ]
      },
      "lesson": "Merge ka niyam data ke shape se chuno: counter ke liye G-Counter, set ke liye OR-Set. LWW chupchaap mitata hai; version vectors takraav dikhate hain."
    }
  ],
  "interview": {
    "title": "Interview Round — merge",
    "instructions": "Pehle socho: data ka shape kya hai (ginti, set, ek value), aur takraav mein kaun faisla karega? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Multi-region shopping cart: user do devices se ek saath items jodta aur hataata hai. Merge ka niyam?",
        "choices": [
          "OR-Set: har add ka tag, remove sirf dekhe tags hataaye",
          "LWW: poora cart baad wale timestamp se badlo",
          "Union: dono carts ke saare items jod do",
          "Har change par dono regions ka lock lo, phir likho"
        ],
        "answer": 0,
        "explain": "LWW poora cart badalta hai → jode items gayab (ex4: 500 mein 500). Union hataaye items wapas laata hai (500 mein 500). OR-Set dono iraade rakhta hai (0 aur 0). Lock lena partition mein cart band karta hai — cart jaisi cheez ke liye zaroorat nahi.",
        "choiceExplanations": [
          "LWW poora cart badalta hai → jode items gayab (ex4: 500 mein 500). Union hataaye items wapas laata hai (500 mein 500). OR-Set dono iraade rakhta hai (0 aur 0). Lock lena partition mein cart band karta hai — cart jaisi cheez ke liye zaroorat nahi.",
          "LWW mein ek device ka poora cart mit jaata hai.",
          "Union mein hataaye items laut aate hain (Dynamo ki anomaly).",
          "Har change par cross-region lock = cart mein latency aur partition mein ruk jaana."
        ]
      },
      {
        "q": "Ek bank balance ko G-Counter CRDT bana do taaki har region likh sake. Sahi?",
        "choices": [
          "Nahi — G-Counter sirf badhta hai; withdrawal wala balance nahi",
          "Haan — CRDT hamesha sahi balance deta hai, partition mein bhi",
          "Haan — bas G-Counter ko PN-Counter bana do, sab theek",
          "Nahi — CRDT sirf strings ke liye hote hain"
        ],
        "answer": 0,
        "explain": "G-Counter sirf badh sakta hai, toh withdrawal dikha hi nahi sakta. Saadharan PN-Counter ya ledger merge apne aap overdraft nahi rokta: do regions ek saath kharch karein toh jodne par minus (lab ex1 ledger: 579 accounts minus). Balance ki seema bachaani ho toh kharch ke haq (spending rights) pehle regions mein baanto — bounded-counter CRDT haq pehle se baant'ta hai, haq khatam toh withdrawal rukta hai — ya coordination (CP) karo. Lab ex1 spending-rights protocol nahi chalata.",
        "choiceExplanations": [
          "G-Counter sirf badh sakta hai, toh withdrawal dikha hi nahi sakta. Saadharan PN-Counter ya ledger merge apne aap overdraft nahi rokta: do regions ek saath kharch karein toh jodne par minus (lab ex1 ledger: 579 accounts minus). Balance ki seema bachaani ho toh kharch ke haq (spending rights) pehle regions mein baanto — bounded-counter CRDT haq pehle se baant'ta hai, haq khatam toh withdrawal rukta hai — ya coordination (CP) karo. Lab ex1 spending-rights protocol nahi chalata.",
          "CRDT \"sab jod do\" karta hai; \"₹0 se neeche nahi\" ka niyam nahi.",
          "Saadharan PN-Counter minus balance nahi rokta; sirf ginti sahi jodta hai.",
          "CRDT counters, sets, maps, text sab ke liye hote hain."
        ]
      }
    ]
  },
  "success": [
    "G-Counter ka merge = max samjha sakte ho",
    "OR-Set ka add-wins bartav samjha sakte ho",
    "Saadharan counter CRDT kab kaafi nahi (seema wala niyam) bata sakte ho"
  ],
  "cards": [
    {
      "front": "G-Counter?",
      "back": "Har replica ka apna khaana; merge = har khaane ka max; value = jod. Lab 58 ex4: 1,500 likes sahi (LWW: 1,200)."
    },
    {
      "front": "OR-Set?",
      "back": "Har add ko naya tag; remove sirf dekhe hue tags hataata hai; concurrent add jeet'ta hai. Lab 58 ex4: union ne hataya apple 500 carts mein wapas laaya, OR-Set ne 0."
    },
    {
      "front": "Saadharan counter CRDT kab kaafi nahi?",
      "back": "Jab niyam ho jaise \"balance ≥ 0\". Saadharan counter/ledger converge karta hai par niyam nahi rokta (lab 58 ex1: 579 accounts minus). Seema ke liye bounded counter (pehle se baante haq) ya coordination."
    }
  ]
}
]);
})();
