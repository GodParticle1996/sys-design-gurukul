/* First Principles — FAANG Senior Engineer.
   Source credit: Mathematics of the Second Attempt (s5HWkMyRRcA), numbered video 12/15.
   Evidence: docker-labs/62-second-attempt/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "c", "icon": "📱", "label": "client", "x": 160, "y": 120}, {"id": "s", "icon": "🔑", "label": "key store", "x": 450, "y": 120}, {"id": "p", "icon": "💳", "label": "charge", "x": 740, "y": 120}];
const EDGES = [{"from": "c", "to": "s"}, {"from": "s", "to": "p"}];
VISUALS["fp-retry-code"] = { t: "Same key → same jawab, ek hi charge. Running → 409. Alag params → error. Key ki umar seemit.", html: SD.viz.svg(HERO, EDGES, { nodes: { c: {tone:'busy',badge:'retry'}, s: {tone:'ok',badge:'done: ch_1'}, p: {tone:'ok',badge:'1 charge'} } }, {w:900,h:240}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-retry-code",
  "icon": "🔑",
  "group": "🔁 Retries: Doosri Koshish",
  "title": "Retries 3 · Code — idempotency key ke kinaare",
  "badge": "Chaabi Ka Chowkidaar",
  "objectives": [
    "Idempotency key store: line by line",
    "In-flight lock, parameter check, key ki umar",
    "Delete aur id reuse; increment vs shart wala set"
  ],
  "lesson": [
    "<h3>🧾 Bank ki parchi</h3><p>Bank mein tum ₹100 jama karne ki parchi dete ho, number 4521. Cashier paise le leta hai, par counter ki light chali jaati hai — tumhe raseed nahi milti. Tum phir se parchi 4521 dete ho.</p><p>Achha cashier register dekhta hai: \"4521 ho chuka\" — same raseed dobara. Par agar register mein sirf kal tak ka record ho? Ya do counter par ek saath 4521 pahunche? Aaj code mein idempotency ke teen kinaare dekhenge.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🔑 idem.js: idempotency key, line by line",
      "goal": "lib/idem.js (asli code, memory mein; sirf success-path, Stripe API v1 se prerit). begin() key dekhta hai; finish() paise kaat'ta hai aur jawab ki copy key ke saath yaad rakhta hai. Lab 62 ex3 isi code par saat scenarios chalata hai.",
      "code": {
        "title": "lib/idem.js",
        "file": "docker-labs/62-second-attempt/lib/idem.js",
        "from": 13,
        "text": "  const begin = (key, params, now) => {\n    if (useKeys && key) {\n      const e = store.get(key);\n      const alive = e && (e.state === 'done' ? now - e.at < ttlMs : now - e.at < leaseMs);\n      if (alive) {\n        if (e.params !== norm(params)) return { status: 422, body: 'same key, different parameters' };\n        if (e.state === 'running' && lockInFlight) return { status: 409, body: 'same key still running' };\n        if (e.state === 'done') return { status: 200, body: copy(e.response), replay: true };\n      }\n      const token = nextToken++;\n      store.set(key, { state: 'running', params: norm(params), at: now, token });\n      return { status: 'started', key, token };\n    }\n    return { status: 'started', key, token: null };\n  };\n  const finish = (key, params, token, now = 0) => {\n    if (useKeys && key) {\n      const e = store.get(key);\n      if (ownership && (!e || e.token !== token || e.state !== 'running')) return { status: 409, body: 'stale owner: not charged' };\n      charges++;\n      const response = { id: `ch_${nextId++}`, amount: params.amount };\n      if (e) Object.assign(e, { state: 'done', response: copy(response), at: now });\n      return { status: 200, body: response };\n    }\n    charges++;\n    return { status: 200, body: { id: `ch_${nextId++}`, amount: params.amount } };\n  };\n  const charge = (key, params, now) => { const b = begin(key, params, now); return b.status === 'started' ? finish(key, params, b.token, now) : b; };"
      },
      "vars": [
        {
          "id": "key",
          "label": "Key ki haalat"
        },
        {
          "id": "charges",
          "label": "Charges"
        },
        {
          "id": "reply",
          "label": "Jawab"
        }
      ],
      "steps": [
        {
          "title": "1. Pehli request",
          "say": "Line 15–16: key store mein nahi. Line 22–23: naya owner token, key \"running\". Line 31–34: token sahi → charge, aur jawab ki copy key ke saath yaad.",
          "line": "13-34",
          "vars": {
            "key": "k1: done",
            "charges": "1",
            "reply": "200 ch_1"
          }
        },
        {
          "title": "2. Jawab khoya, retry",
          "say": "Network ne jawab gira diya; client same key se dobara. Line 20: key \"done\" → yaad kiya hua jawab (copy), line 32 chalti hi nahi. Lab: bina key 2 charge, key ke saath 1.",
          "line": "20",
          "vars": {
            "key": "k1: done",
            "charges": "1",
            "reply": "200 ch_1 (same)"
          }
        },
        {
          "title": "3. Double click",
          "say": "Pehli request abhi chal rahi (\"running\"), doosri aa gayi. Line 19: 409 — \"abhi chal raha hai\".",
          "line": "19",
          "vars": {
            "key": "k2: running",
            "charges": "1",
            "reply": "409"
          },
          "ask": {
            "q": "Line 19 (in-flight lock) aur line 31 (token check) dono hata do. Double click par kya hoga?",
            "choices": [
              "Doosri bhi line 23 se running banegi aur charge karegi — 2 charges",
              "Line 20 doosri request ko pakad legi, kyunki key store mein hai hi",
              "Kuch nahi — key hai toh duplicate kabhi nahi ho sakta"
            ],
            "answer": 0,
            "hint": "Pehli request abhi \"done\" hai ya \"running\"?",
            "explain": "Line 20 sirf \"done\" key ka jawab deta hai. Pehli abhi \"running\" hai, toh lock ke bina doosri bhi aage badhti aur charge karti. Lab: lock/token nahi → 2 charges. Key + lock dono chahiye.",
            "choiceExplanations": [
              "Line 20 sirf \"done\" key ka jawab deta hai. Pehli abhi \"running\" hai, toh lock ke bina doosri bhi aage badhti aur charge karti. Lab: lock/token nahi → 2 charges. Key + lock dono chahiye.",
              "Line 20 \"done\" maangti hai; key abhi \"running\" hai.",
              "Sirf key race nahi rokti; lock (ya token) chahiye."
            ]
          }
        },
        {
          "title": "4. Same key, alag amount",
          "say": "Client ke bug ne k3 ko ₹250 ke liye phir bheja (pehle ₹100). Line 18: parameters (keys ke kram ke bina, copy) alag → 422 (lab ka chuna hua code; Stripe ek error deta hai).",
          "line": "18",
          "vars": {
            "key": "k3: done",
            "charges": "1",
            "reply": "422"
          }
        },
        {
          "title": "5. Atka hua owner",
          "say": "Pehla worker 90 s atka. Line 16: running entry ka lease 60 s; lease ke baad doosri request naya token leti hai (line 22). Purana worker lautta hai: line 31 — token purana → 409, na charge, na record badla.",
          "line": "16-31",
          "vars": {
            "key": "k5: naya owner",
            "charges": "1",
            "reply": "purane ko 409"
          }
        },
        {
          "title": "6. 25 ghante baad",
          "say": "Line 16: done key 24 ghante baad mitti (lab ka niyam). Naya charge. Stripe v1 key ko 24 ghante ke baad kabhi bhi hata sakta hai. Lab: DLQ se 25 ghante baad redrive = 2 charges.",
          "line": "16",
          "vars": {
            "key": "k4: mit gayi",
            "charges": "2",
            "reply": "200 ch_2 (naya!)"
          },
          "ask": {
            "q": "Order DLQ mein 3 din pada raha, phir redrive hua. Same idempotency key se payment. Kya hoga?",
            "choices": [
              "Provider key bhool chuka ho sakta — naya charge; apna record jaancho",
              "Kuch nahi — idempotency key hamesha ke liye duplicate rokti hai",
              "Provider 409 dega, kyunki key pehle hi use ho chuki hai"
            ],
            "answer": 0,
            "hint": "Line 16 ki shart 3 din par kya kehti hai?",
            "explain": "Key ki umar seemit hai (Stripe v1: 24 ghante ke baad hat sakti hai). 3 din baad provider ke paas key na ho toh naya charge. Redrive se pehle apne DB mein dekho \"is order ka payment ho chuka?\" (durable record), ya provider se reconcile karo.",
            "choiceExplanations": [
              "Key ki umar seemit hai (Stripe v1: 24 ghante ke baad hat sakti hai). 3 din baad provider ke paas key na ho toh naya charge. Redrive se pehle apne DB mein dekho \"is order ka payment ho chuka?\" (durable record), ya provider se reconcile karo.",
              "Key ki umar hai; ttlMs ke baad line 16 key ko naya maanti hai.",
              "Purani key akele 409 nahi deti: request replay ho sakti, chal rahe kaam se takra sakti, ya purane owner ke roop mein roki ja sakti."
            ]
          }
        }
      ],
      "lesson": "Idempotency key = retry safe. Saath mein in-flight lock (409), parameter check, owner token aur key ki umar yaad rakho. Lambi der ke redrive ke liye apna durable record."
    },
    {
      "type": "dryrun",
      "title": "🗑️ \"Delete idempotent hai\" — kab nahi?",
      "goal": "lib/idem.js users(): ids dobara mil sakti hain (reuseIds). Video: \"delete user 10 idempotent hai — ek baar ya 10 baar, user gaya\".",
      "code": {
        "title": "lib/idem.js",
        "file": "docker-labs/62-second-attempt/lib/idem.js",
        "from": 44,
        "text": "function users({ reuseIds = true } = {}) {\n  const rows = new Map(); let next = 10, version = 0;\n  return {\n    create(name) { const id = reuseIds ? 10 : `u_${next++}`; rows.set(id, { name, v: ++version }); return id; },\n    del(id, ifVersion) { const r = rows.get(id); if (!r) return 404; if (ifVersion !== undefined && r.v !== ifVersion) return 412; rows.delete(id); return 204; },\n    get: id => rows.get(id),\n  };\n}"
      },
      "vars": [
        {
          "id": "rows",
          "label": "Users"
        },
        {
          "id": "reply",
          "label": "DELETE /users/10"
        },
        {
          "id": "note",
          "label": "Baat"
        }
      ],
      "steps": [
        {
          "title": "1. Pehla delete",
          "say": "Asha (id 10) delete. Line 48: 204. Jawab khoya, client retry karega.",
          "line": "48",
          "vars": {
            "rows": "—",
            "reply": "204",
            "note": "jawab khoya"
          }
        },
        {
          "title": "2. Id dobara mili",
          "say": "Beech mein Bilal ne signup kiya; line 47: id 10 dobara mili.",
          "line": "47",
          "vars": {
            "rows": "10 = Bilal",
            "reply": "—",
            "note": "id reuse"
          }
        },
        {
          "title": "3. Purana retry",
          "say": "Client ka retry: DELETE /users/10. Line 48: row hai, 204 — Bilal mit gaya!",
          "line": "48",
          "vars": {
            "rows": "—",
            "reply": "204",
            "note": "galat user mita"
          },
          "ask": {
            "q": "Kaun si do cheezein Bilal ko bachaati hain?",
            "choices": [
              "Version ki shart (If-Match) ya kabhi na dohraayi id (UUID)",
              "Delete se pehle 1 s rukna, aur retry par backoff lagaana",
              "Delete ko POST bana dena, kyunki POST idempotent nahi hota"
            ],
            "answer": 0,
            "hint": "Purana retry kis user ke liye tha, aur id kya kehti hai?",
            "explain": "Retry Asha ke liye tha, par id 10 ab Bilal ki hai. Version ki shart (line 48: <code>ifVersion</code>) — Asha ka version alag, toh 412, kuch nahi mita. Ya ids kabhi dobara na do (UUID). Video ka \"delete idempotent\" asar par sahi hai, par jawab badalta hai (204 phir 404), aur id reuse par toot'ta hai.",
            "choiceExplanations": [
              "Retry Asha ke liye tha, par id 10 ab Bilal ki hai. Version ki shart (line 48: <code>ifVersion</code>) — Asha ka version alag, toh 412, kuch nahi mita. Ya ids kabhi dobara na do (UUID). Video ka \"delete idempotent\" asar par sahi hai, par jawab badalta hai (204 phir 404), aur id reuse par toot'ta hai.",
              "Rukne se race chhoti hoti hai, khatam nahi.",
              "Method ka naam idempotency nahi deta; shart ya unique id deti hai."
            ]
          }
        }
      ],
      "lesson": "Idempotent = asar same. Par jawab badal sakta hai, aur id dobara mile toh purana retry naya row badal deta hai. Version ki shart ya kabhi na dohraayi jaane wali id."
    },
    {
      "type": "docker",
      "title": "🧪 Saat scenarios",
      "project": "62-second-attempt",
      "exercise": "ex3-idempotent-ops",
      "goal": "Khoya jawab, double click, alag parameters, key expiry, atka hua owner, delete + id reuse, +100 vs conditional set.",
      "why": "Node 24+ chahiye. Asli code memory mein; koi Stripe ya DB nahi. Asli processes + SQLite par idempotency: lab 49.",
      "steps": [
        {
          "text": "Scenarios.",
          "cmd": "cd docker-labs/62-second-attempt && npm start -- ex3-idempotent-ops",
          "expect": "ASLI code (lib/idem.js, memory mein): sirf success-path, Stripe API v1 ke idempotency niyamon se prerit. Har row ek scenario.\nLab ke chune hue niyam: key theek 24 ghante par mitti, alag parameters par 422.\n\nscenario                                                   bina suraksha                        suraksha ke saath\njawab khoya, client ne retry kiya                          2 charge                             1 charge (same jawab dobara)\ndouble click: pehla abhi chal raha, doosra aaya            2 charge (key thi, lock/token nahi)  1 charge, doosre ko 409\nsame key, alag amount (bug)                                —                                    422: same key, different parameters\n25 ghante baad retry (DLQ se redrive)                      —                                    2 charge — key mit chuki thi\npehla worker 90 s atka, 60 s lease ke baad doosre ne liya  —                                    1 charge; purane ko 409 (token purana)\nDELETE /users/10 retry, beech mein id 10 naye user ko mili naya user Bilal mit gaya             412 — version alag, kuch nahi mita\n\"balance +100\" retry vs \"balance = 600 (agar version 0)\"   700 (₹100 zyada)                     600, retry ko 412\n\n→ Idempotency key: khoye jawab par retry safe. Par key ke saath \"chal raha hai\" ka lock (409) bhi chahiye, warna double click\n  par do charge. Alag parameters par same key = bug, server mana kare (Stripe bhi error deta hai).\n→ Key hamesha nahi rehti: Stripe v1 key ko 24 ghante ke baad kabhi bhi hata sakta hai — tab din baad ka redrive naya charge bana\n  sakta hai. Apna durable record (\"is order ka payment hua?\") aur reconciliation rakho.\n→ Video: \"delete idempotent hai\". Asar same, par jawab badalta hai (204 phir 404), aur id dobara mile toh purana retry naya row\n  mita deta hai. Version wali shart (If-Match) ya kabhi dobara na milne wali id (UUID) bachaati hai.\n→ \"+100\" retry par do baar judta hai; \"= 600 agar version 0\" ek hi baar lagta hai (doosre ko 412)."
        },
        {
          "text": "Lab ke 5 tests.",
          "cmd": "npm test",
          "expect": "npm notice run lab-62-second-attempt@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ metastable: short backoff and immediate retries stay stuck; long backoff and a token bucket recover; accounting holds (8.288598ms)\n✔ jitter: with zero network variance no-jitter needs N(N+1)/2 calls; jittered strategies need far fewer calls and less time (8.069964ms)\n✔ deadline: retries without cancellation keep slow work running after the user left; propagation alone is not enough (0.497782ms)\n✔ idempotency: key + in-flight lock + parameter check; snapshots; ownership tokens; expiry; delete; add vs set (1.314823ms)\n✔ DLQ retention (standard: from first send; FIFO: reset); availability = MTBF / (MTBF + MTTR) (0.784559ms)\nℹ tests 5\nℹ suites 0\nℹ pass 5\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 58.6445"
        }
      ],
      "observe": {
        "q": "\"balance +100\" retry par 700 hua, \"balance = 600 agar version 0\" par 600 raha. Fark kya hai?",
        "choices": [
          "+100 har baar jodta hai; shart wala set ek hi baar lagta, doosri baar 412",
          "+100 dheema hai, isliye do baar chal gaya; set tez hai, ek baar chala",
          "Set mein jitter tha, +100 mein nahi — isliye set ek baar chala"
        ],
        "answer": 0,
        "hint": "Doosri baar \"version 0\" ki shart kya kehti hai?",
        "explain": "Increment idempotent nahi: har koshish ₹100 aur. \"= 600\" bina shart ke bhi do baar 600 deta, par beech mein kisi aur ka update mita sakta tha. Version ki shart dono rokti hai: pehla set version 1 bana deta hai, retry ko 412.",
        "choiceExplanations": [
          "Increment idempotent nahi: har koshish ₹100 aur. \"= 600\" bina shart ke bhi do baar 600 deta, par beech mein kisi aur ka update mita sakta tha. Version ki shart dono rokti hai: pehla set version 1 bana deta hai, retry ko 412.",
          "Raftaar se farq nahi; operation ka swabhaav alag hai.",
          "Is scenario mein jitter nahi; farq operation ka hai."
        ]
      },
      "lesson": "Retry tabhi safe jab operation idempotent ho: key, shart wala set, ya unique id. Increment aur id reuse sabse aam jaal."
    }
  ],
  "interview": {
    "title": "Interview Round — idempotency",
    "instructions": "Pehle socho: dobara aane par kya badlega — paise, row, ya sirf jawab? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Mobile app \"Pay\" button par double-tap se kabhi-kabhi do charge ho rahe hain. Server idempotency key check karta hai (\"done\" key par saved jawab). Kya chhoot gaya?",
        "choices": [
          "Pehli request \"running\" ho tab doosri ko 409 — in-flight lock",
          "Key ko UUID ki jagah order id banao, taaki hamesha unique ho",
          "Client par 2 s ka debounce, server par kuch badalne ki zaroorat nahi",
          "Retries band karo, taaki doosri request server tak na pahunche"
        ],
        "answer": 0,
        "explain": "\"Done\" check tab kaam karta hai jab pehli khatam ho chuki. Double-tap mein dono ek saath \"running\" — lock ke bina dono charge (lab 62 ex3). Server par lock (409) chahiye; client debounce madad karta hai par server ki guarantee nahi.",
        "choiceExplanations": [
          "\"Done\" check tab kaam karta hai jab pehli khatam ho chuki. Double-tap mein dono ek saath \"running\" — lock ke bina dono charge (lab 62 ex3). Server par lock (409) chahiye; client debounce madad karta hai par server ki guarantee nahi.",
          "Key ka format nahi, race ka intezaam problem hai.",
          "Debounce client ki madad; server ko phir bhi do requests mil sakti hain.",
          "Double-tap retry nahi, do alag requests hain."
        ]
      },
      {
        "q": "Wallet: \"POST /wallet/credit {amount: 100}\" timeout par retry hota hai. Kabhi-kabhi ₹200 jud jaate hain. Sabse seedha ilaaj?",
        "choices": [
          "Request mein idempotency key; server key ke saath credit ek baar likhe",
          "Credit ko PUT bana do, kyunki PUT hamesha idempotent hota hai",
          "Retry hata do — timeout par user ko error dikha do",
          "Credit se pehle balance padh kar check karo ki 100 pehle juda ya nahi"
        ],
        "answer": 0,
        "explain": "Increment idempotent nahi. Key (ya client ka diya transaction id) ke saath server credit ko ek hi baar lagaye — same key, same jawab. Lab 62 ex3: \"+100\" retry = 700.",
        "choiceExplanations": [
          "Increment idempotent nahi. Key (ya client ka diya transaction id) ke saath server credit ko ek hi baar lagaye — same key, same jawab. Lab 62 ex3: \"+100\" retry = 700.",
          "Method ka naam idempotency nahi deta; server ko key/shart chahiye.",
          "Retry hataane se khoye jawab par paisa pakka hai ya nahi, user nahi jaanta.",
          "Balance padh kar andaza race chhodta hai; do retries dono \"nahi juda\" dekh sakte."
        ]
      }
    ]
  },
  "success": [
    "Idempotency key store ka code samjha sakte ho",
    "In-flight lock, parameter check aur key ki umar bata sakte ho",
    "Delete/id reuse aur increment ke jaal pehchaan sakte ho"
  ],
  "cards": [
    {
      "front": "Idempotency key ke niyam?",
      "back": "Done → saved jawab (copy). Running → 409 (lease ke saath; purana owner token se roka). Same key, alag params → error. Lab 62 ex3."
    },
    {
      "front": "Key kab tak?",
      "back": "Stripe API v1 key ko 24 ghante ke baad hata sakta hai. Key hat chuki ho toh din baad ka redrive dobara charge kar sakta hai. Purane adhoore kaam se pehle reconcile karo; apna durable record rakho."
    },
    {
      "front": "Delete idempotent?",
      "back": "Asar same, jawab badalta (204 → 404). Id reuse par purana retry naya row mitata. Version ki shart (If-Match) ya UUID."
    }
  ]
}
]);
})();
