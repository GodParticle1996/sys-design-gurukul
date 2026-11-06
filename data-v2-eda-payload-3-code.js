/* Playlist · EDA Core topic 2: event payloads. Source credit: Software Developer Diaries,
   A Beginner's Guide to Event-Driven Architecture (RojKJnF_WWQ); Martin Fowler, "What do you mean by Event-Driven?".
   Numbers: docker-labs/47-event-payloads/captures; source code byte-checked. */
(function () {
const HERO = [{"id": "event", "icon": "📨", "label": "event()", "x": 140, "y": 105}, {"id": "guard", "icon": "🔢", "label": "version check", "x": 445, "y": 105}, {"id": "copy", "icon": "📒", "label": "copy / resync", "x": 750, "y": 105}];
const EDGES = [{"from": "event", "to": "guard"}, {"from": "guard", "to": "copy"}];
VISUALS["ep-code"] = { t: "Teen chhoti files ki asli lines: khabar kaise banti hai, copy kab likhi jaati hai, gap kab pakda jaata hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { event: {tone:'acc',badge:'thin / fat / delta'}, guard: {tone:'slow',badge:'purana chhodo'}, copy: {tone:'ok',badge:'gap par resync'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "ep-code",
  "icon": "💻",
  "group": "📦 Event Payloads",
  "title": "Payload 3 · Code — event(), version check aur resync ki asli lines",
  "badge": "Version Lohaar",
  "objectives": [
    "Teeno tarah ki khabar code mein kaise banti hai?",
    "Version check kis line par purani khabar rokta hai?",
    "Delta mein gap ki shart aur resync kaise chalte hain?",
    "Apne system mein kya alag se sochna padega?"
  ],
  "lesson": [
    "<h3>💻 Lab 47 ki do chhoti files ka code</h3><p>Khabar banane wala <code>event()</code>, aur har consumer ka <code>accept()</code>. Chamakti line ko state ke saath padho — code panes mein asli lab files ki lines hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📨 Khabar ka dabba: event() kya bharta hai?",
      "goal": "lib/events.js ko HTTP services, slow motion aur tests teeno chalate hain. Order #42 v2 (pata 99 Mango Lane) ke liye teeno tarah ki khabar banao.",
      "code": {
        "title": "lib/events.js",
        "file": "docker-labs/47-event-payloads/lib/events.js",
        "from": 2,
        "text": "function event(mode, order, changes) {\n  const envelope = { type: 'OrderChanged', id: order.id, version: order.version };\n  if (mode === 'fat') envelope.state = structuredClone(order);\n  if (mode === 'delta') envelope.changes = structuredClone(changes);\n  return envelope;"
      },
      "vars": [
        {
          "id": "mode",
          "label": "mode"
        },
        {
          "id": "env",
          "label": "Khabar mein kya hai"
        },
        {
          "id": "bytes",
          "label": "v2 khabar ke bytes (lab)"
        }
      ],
      "steps": [
        {
          "title": "1. Har khabar ka khol",
          "say": "Line 3: har mode mein khabar ka khol ek hi hai — <code>type</code>, order ki <code>id</code> aur <code>version</code>. Patli khabar yahin ruk jaati hai.",
          "line": "3",
          "vars": {
            "mode": "thin",
            "env": "{type, id: 42, version: 2}",
            "bytes": "43"
          }
        },
        {
          "title": "2. Moti khabar: poora order",
          "say": "Line 4: mode <code>fat</code> ho toh khol mein <code>state</code> = poore order ki copy. structuredClone isliye ki baad mein owner ka object badle toh khabar na badle.",
          "line": "4",
          "vars": {
            "mode": "fat",
            "env": "{type, id, version, state: {pata, phone, thali}}",
            "bytes": "144"
          },
          "ask": {
            "q": "Moti khabar mein poora order hai: pata, phone aur thali. Kitchen ko sirf thali chahiye. Kitchen tak phone pahunchega?",
            "choices": [
              "Haan — line 4 poora order daalti hai, toh har subscriber ko phone bhi milta hai",
              "Nahi — broker har consumer ko sirf consumer ke kaam ka field chhaant ke deta hai",
              "Nahi — structuredClone sirf zaroori fields ki copy banata hai, baaki chhodta hai"
            ],
            "answer": 0,
            "hint": "Line 4 mein fields chunne ka koi code hai?",
            "explain": "Line 4 poore order ki copy daalti hai, chhaant-ne ka koi code nahi. Lab mein moti khabar se kitchen tak 12 baar phone pahuncha. Phone notify ko chahiye, kitchen ko nahi: kitchen ke liye alag payload aur sirf kitchen tak delivery ka raasta banao. Ek hi shared khabar se phone hataoge toh notify ka data bhi chhootega.",
            "choiceExplanations": [
              "Line 4 poore order ki copy daalti hai, chhaant-ne ka koi code nahi. Lab mein moti khabar se kitchen tak 12 baar phone pahuncha. Phone notify ko chahiye, kitchen ko nahi: kitchen ke liye alag payload aur sirf kitchen tak delivery ka raasta banao. Ek hi shared khabar se phone hataoge toh notify ka data bhi chhootega.",
              "Is lab ka broker khabar jaisi ki taisi har line mein rakhta hai; fields nahi chhaant-ta.",
              "structuredClone poore object ki gehri copy banata hai — har field ke saath."
            ]
          }
        },
        {
          "title": "3. Sirf badlaav: changes",
          "say": "Line 5: mode <code>delta</code> mein sirf badle fields: v2 ke liye <code>{address: '99 Mango Lane'}</code>. Chhoti khabar — par consumer ke paas pehle se copy honi chahiye.",
          "line": "5",
          "vars": {
            "mode": "delta",
            "env": "{type, id, version, changes: {address}}",
            "bytes": "81"
          }
        }
      ],
      "lesson": "Teeno khabron ka khol same hai: type, id, version. Farak sirf andar ke data mein: kuch nahi (thin), poora order (fat), ya sirf badle fields (delta). Version har mode mein hai — copy ki version jaanch event ke version par tiki hai."
    },
    {
      "type": "dryrun",
      "title": "🔢 accept(): pehle version, phir data kahan se?",
      "goal": "lib/consumer.js ka accept() har consumer ke andar chalta hai. Delivery ki copy v2 (99 Mango Lane) par hai; ab purani v1 moti khabar aayi.",
      "code": {
        "title": "lib/consumer.js",
        "file": "docker-labs/47-event-payloads/lib/consumer.js",
        "from": 11,
        "text": "      const before = copies.get(e.id);\n      if (mode !== 'thin' && guard && before && e.version <= before.version) {\n        skipped++;\n        return { status: 'ignored', eventVersion: e.version };\n      }\n      let state;\n      if (mode === 'thin') state = await load(e.id);\n      else if (mode === 'fat') state = structuredClone(e.state);"
      },
      "vars": [
        {
          "id": "copy",
          "label": "Delivery ki copy"
        },
        {
          "id": "event",
          "label": "Aayi khabar"
        },
        {
          "id": "result",
          "label": "Nateeja"
        }
      ],
      "steps": [
        {
          "title": "1. Pehle apni copy dekho",
          "say": "Line 11: is order ki maujooda copy nikaalo. Copy order id se rakhi hai, toh version bhi har order ka alag ginta hai.",
          "line": "11",
          "vars": {
            "copy": "v2 · 99 Mango Lane",
            "event": "fat v1 · 12 Neem Road",
            "result": "—"
          }
        },
        {
          "title": "2. Version ki shart",
          "say": "Line 12: mode thin nahi, guard chalu, copy maujood, aur khabar ka version copy ke version se bada nahi — chaaron shartein sach hon toh khabar chhodo.",
          "line": "12",
          "vars": {
            "copy": "v2 · 99 Mango Lane",
            "event": "fat v1 · 12 Neem Road",
            "result": "jaanch"
          },
          "ask": {
            "q": "Copy v2 par hai, khabar v1 ki hai. Line 12 ki shart ka kya nateeja hai?",
            "choices": [
              "Sach — 1 ≤ 2, toh lines 13–14 chalengi aur khabar chhod di jaayegi",
              "Jhooth — khabar moti hai, toh version dekhe bina copy par likh di jaayegi",
              "Sach — par line 17 phir bhi owner se taaza order le aayegi"
            ],
            "answer": 0,
            "hint": "e.version <= before.version: 1 <= 2?",
            "explain": "Line 12 ki shart sach hai: khabar ka version 1, copy ka 2. Lines 13–14 khabar ko ignored ginke lautati hain; copy v2 par hi rehti hai. Lab mein line 12 ki jaanch ne 24 purani aur duplicate khabrein roki.",
            "choiceExplanations": [
              "Line 12 ki shart sach hai: khabar ka version 1, copy ka 2. Lines 13–14 khabar ko ignored ginke lautati hain; copy v2 par hi rehti hai. Lab mein line 12 ki jaanch ne 24 purani aur duplicate khabrein roki.",
              "Line 12 thin ko chhod ke har mode par chalti hai, fat par bhi. Version dekha jaata hai.",
              "Line 14 par return ho jaata hai. Neeche ki line 17 tak code pahunchta hi nahi."
            ]
          }
        },
        {
          "title": "3. Purani khabar chhodi",
          "say": "Lines 13–14: skipped badha, aur <code>ignored</code> lauta. Copy ko haath nahi lagaya.",
          "line": "13-14",
          "vars": {
            "copy": "v2 · 99 Mango Lane",
            "event": "fat v1 · 12 Neem Road",
            "result": "ignored"
          }
        },
        {
          "title": "4. Patli khabar: owner ko call",
          "say": "Ab socho khabar patli thi. Line 12 thin ke liye kabhi sach nahi. Line 17: <code>await load(e.id)</code> — owner ko HTTP call, aur owner ka abhi ka order.",
          "line": "17",
          "vars": {
            "copy": "rakhi hi nahi (thin)",
            "event": "thin v1",
            "result": "owner ka v2"
          }
        },
        {
          "title": "5. Moti khabar: khabar se copy",
          "say": "Line 18: moti khabar ho toh data khabar se hi: <code>structuredClone(e.state)</code>. Owner ko call nahi.",
          "line": "18",
          "vars": {
            "copy": "v2 · 99 Mango Lane",
            "event": "fat v3",
            "result": "copy = khabar ka order"
          }
        }
      ],
      "lesson": "accept() pehle version jaanchta hai (line 12): purani ya duplicate khabar copy tak pahunchti hi nahi. Phir data ka raasta: patli khabar par owner ko call (line 17), moti khabar par khabar ki copy (line 18)."
    },
    {
      "type": "dryrun",
      "title": "✏️ Delta: gap pakdo, owner se resync",
      "goal": "Delivery ki copy v1 (12 Neem Road) par hai. v2 (pata badla) raaste mein gira; ab v3 aayi: sirf phone badla.",
      "code": {
        "title": "lib/consumer.js",
        "file": "docker-labs/47-event-payloads/lib/consumer.js",
        "from": 19,
        "text": "      else if (guard && e.version !== (before?.version || 0) + 1) {\n        state = await load(e.id);\n        if (state.version < e.version) throw Error('owner snapshot behind delta');\n        resyncs++;\n      } else state = { ...before, ...structuredClone(e.changes), id: e.id, version: e.version };\n      if (mode === 'thin' || (mode === 'delta' && guard && e.version !== (before?.version || 0) + 1)) {\n        exposure.count(state, 'callback');\n      }\n      if (mode !== 'thin') copies.set(e.id, state);"
      },
      "vars": [
        {
          "id": "copy",
          "label": "Delivery ki copy"
        },
        {
          "id": "event",
          "label": "Aayi khabar"
        },
        {
          "id": "reads",
          "label": "Owner par reads"
        }
      ],
      "steps": [
        {
          "title": "1. Agla version kya hona chahiye?",
          "say": "Line 19: copy v1 par hai, toh agli khabar v2 honi chahiye (<code>before.version + 1</code>). Aayi v3.",
          "line": "19",
          "vars": {
            "copy": "v1 · 12 Neem Road",
            "event": "delta v3 · phone",
            "reads": "0"
          },
          "ask": {
            "q": "Copy v1 par, khabar v3. Line 19 ki shart (version !== copy + 1) ka kya nateeja hai?",
            "choices": [
              "Sach — 3 ≠ 2, beech ka v2 chhoota; line 20 owner se poora order layegi",
              "Jhooth — v3 copy se bada hai, toh line 23 phone jod degi aur kaam khatam",
              "Sach — aur khabar ko purani maan ke line 13 par chhod diya jaayega"
            ],
            "answer": 0,
            "hint": "before.version + 1 = 2. Aaya kya?",
            "explain": "3 ≠ 2, toh shart sach: beech ka badlaav chhoota hai. Line 20 owner se poora order lati hai (resync). Bina is shart ke copy mein phone naya hota par pata 12 Neem Road hi rehta — lab mein 3 galat copies.",
            "choiceExplanations": [
              "3 ≠ 2, toh shart sach: beech ka badlaav chhoota hai. Line 20 owner se poora order lati hai (resync). Bina is shart ke copy mein phone naya hota par pata 12 Neem Road hi rehta — lab mein 3 galat copies.",
              "Bada version hona kaafi nahi; agla version theek ek bada hona chahiye. Warna beech ka badlaav kho jaata.",
              "Line 12 sirf purani ya barabar khabar rokti hai. v3 copy se nayi hai, isliye chhodi nahi jaati."
            ]
          }
        },
        {
          "title": "2. Owner se poora order",
          "say": "Line 20: <code>await load(e.id)</code> — owner ka abhi ka order: pata 99 Mango Lane, naya phone, version 3. Owner par ek read.",
          "line": "20",
          "vars": {
            "copy": "v1 · 12 Neem Road",
            "event": "delta v3 · phone",
            "reads": "1"
          }
        },
        {
          "title": "3. Owner peeche toh nahi?",
          "say": "Line 21: owner ka order khabar se purana nikle toh error — copy ko purane data se mat bharo. Yahan owner v3 par hai, sab theek.",
          "line": "21",
          "vars": {
            "copy": "v1 · 12 Neem Road",
            "event": "delta v3 · phone",
            "reads": "1"
          }
        },
        {
          "title": "4. Resync gina; naya order taiyaar",
          "say": "Line 22: resyncs ek badha. Temporary <code>state</code> mein owner ka v3 hai: 99 Mango Lane aur naya phone. Stored copy abhi bhi v1 hai.",
          "line": "22",
          "vars": {
            "copy": "v1 · 12 Neem Road",
            "event": "delta v3 · phone",
            "reads": "1"
          }
        },
        {
          "title": "5. Ab copy save",
          "say": "Line 27: <code>copies.set(e.id, state)</code> — naya order is order ki local copy mein save hua: v3, 99 Mango Lane. (Lines 24–26 sirf lab ki ginti ke liye hain.)",
          "line": "27",
          "vars": {
            "copy": "v3 · 99 Mango Lane",
            "event": "delta v3 · phone",
            "reads": "1"
          }
        },
        {
          "title": "6. Doosra raasta: gap na ho",
          "say": "Ek alag example: copy v3 par ho aur agli khabar theek v4 aaye, toh line 19 jhooth, aur line 23 sirf badle fields purani copy par jod deti hai — owner ko call nahi.",
          "line": "23",
          "vars": {
            "copy": "v3 · 99 Mango Lane",
            "event": "(example) delta v4",
            "reads": "1"
          }
        }
      ],
      "lesson": "Guard chalu ho toh purani aur barabar khabrein line 12 par laut jaati hain. Bachi delta khabar ka version line 19 par copy + 1 se milta hai. Gap dikhe toh owner se poora order (line 20) — har consumer ki apni copy, toh har consumer ki apni ek read. Gap na ho toh sirf badle fields jodo (line 23)."
    },
    {
      "type": "cards",
      "title": "🔧 Apne system mein lagaane se pehle",
      "lesson": "Version har order ka, ek owner; aakhri khoya delta gap check se nahi pakda jaata; resync abhi ka data laata hai, chhoota kaam nahi; copy aur version ek saath durable rakho.",
      "goal": "Lab ka code chhota hai. Asli system mein in baaton ka dhyaan rakho.",
      "steps": [
        {
          "title": "1. Version kiska?",
          "say": "Is lab mein version <b>har order ka</b> hai, aur ek hi owner us order ko badalta hai. Do jagah se ek hi order badle, ya owner restart par version dobara 1 se gine, toh version ka bharosa toot jaata hai. Gap check ko har order ka <b>lagataar</b> sequence chahiye: agar subscription jaan-boojhkar kuch badlaav chhodti hai, toh sirf version + 1 se loss mat maano."
        },
        {
          "title": "2. Aakhri delta kho jaaye toh?",
          "say": "Gap tab dikhta hai jab agli khabar aaye. v3 hi aakhri badlaav tha aur v3 kho gaya, toh koi agli khabar nahi aayegi.",
          "ask": {
            "q": "Aakhri delta kho gaya aur aage koi badlaav nahi hua. Line 19 ka gap check kab pakdega?",
            "choices": [
              "Kabhi nahi — agli khabar ke bina gap dikhta hi nahi; alag se mila-ke dekhna padega",
              "Turant — line 19 har second owner ka version khud jaanchti rehti hai",
              "Agle restart par — consumer restart hote hi saare chhoote delta wapas aa jaate hain"
            ],
            "answer": 0,
            "hint": "Line 19 kab chalti hai?",
            "explain": "Line 19 sirf khabar aane par chalti hai. Aakhri delta khoya toh koi khabar nahi, koi jaanch nahi. Aakhri khoye delta ke liye alag raasta chahiye: samay-samay par owner se mila-ke dekhna (reconciliation) ya broker se dobara padhna.",
            "choiceExplanations": [
              "Line 19 sirf khabar aane par chalti hai. Aakhri delta khoya toh koi khabar nahi, koi jaanch nahi. Aakhri khoye delta ke liye alag raasta chahiye: samay-samay par owner se mila-ke dekhna (reconciliation) ya broker se dobara padhna.",
              "Line 19 koi timer nahi; khabar aane par hi chalti hai.",
              "Is lab mein copy aur guard RAM mein hain; restart se khoye delta wapas nahi aate."
            ]
          }
        },
        {
          "title": "3. Resync abhi ka data laata hai",
          "say": "Line 20 owner ka <b>abhi</b> ka order laati hai, beech ka itihaas nahi. v2 par koi kaam hona tha (jaise \"pata badla\" ka SMS), toh resync us kaam ko wapas nahi laata."
        },
        {
          "title": "4. Guard ki yaad kahan hai?",
          "say": "Copies aur versions is lab mein RAM mein hain. Consumer restart toh yaad gayi. Asli system mein copy aur copy ka version ek saath durable store mein likho. Version check copy ko bachata hai; bahar ke kaam (SMS, payment) ko exactly-once nahi banata."
        }
      ]
    }
  ],
  "interview": {
    "title": "Interview Round — copy ka code",
    "instructions": "Code ki line socho, phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Consumer har moti khabar copy par likh deta hai: copies[id] = event.state. Production mein kabhi-kabhi purana pata dikh jaata hai. Sabse chhota sahi badlaav?",
        "choices": [
          "Likhne se pehle jaancho: khabar ka version copy ke version se bada ho tabhi likho",
          "Har khabar par owner se bhi order maango, aur dono mein zyada bytes wala order rakho",
          "Broker ko ek hi partition par daal do — phir khabrein kabhi do baar nahi aayengi",
          "Copy har ghante mita ke saari khabrein shuru se dobara padho, taaki copy sahi rahe"
        ],
        "answer": 0,
        "explain": "Khabrein ulte kram ya do baar aa sakti hain. Har order ke version se jaancho aur sirf bada version likho. Copy aur version ek saath save karo, taaki restart ke baad bhi jaanch chale.",
        "choiceExplanations": [
          "Khabrein ulte kram ya do baar aa sakti hain. Har order ke version se jaancho aur sirf bada version likho. Copy aur version ek saath save karo, taaki restart ke baad bhi jaanch chale.",
          "Har khabar par owner ko call karna moti khabar ka faayda khatam karta hai, aur \"lamba data\" sahi data nahi.",
          "Ek partition kram mein madad kar sakta hai, par retry se duplicate phir bhi aa sakte hain. Version check phir bhi chahiye.",
          "Baar-baar shuru se padhna bhaari hai aur replay ke baad bhi purani khabar nayi copy ko overwrite kar sakti hai."
        ]
      },
      {
        "q": "Consumer ne v7 ke baad v9 dekha aur resync kiya. v8 par ek zaroori SMS jaana tha. Ab SMS ka status kaise jaanchoge?",
        "choices": [
          "SMS ka delivery record jaancho; resync sirf order ki copy theek karta hai",
          "Local copy v9 par aa gayi hai, toh v8 wala SMS bhi poora hua maan lo",
          "resyncs counter ek badha hai, toh v8 ka SMS bhi successful gin lo",
          "Owner ki read successful thi, toh SMS ka alag record dekhna chhod do"
        ],
        "answer": 0,
        "explain": "Copy ka version aur SMS ka delivery record alag saboot hain. Snapshot se chhoote SMS ka status nahi milta. Zaroorat ho toh v8 ka kaam duplicate se bachakar dobara chalao.",
        "choiceExplanations": [
          "Copy ka version aur SMS ka delivery record alag saboot hain. Snapshot se chhoote SMS ka status nahi milta. Zaroorat ho toh v8 ka kaam duplicate se bachakar dobara chalao.",
          "v9 ki copy order ki abhi ki haalat dikhati hai; v8 ka SMS bhejne ka saboot nahi.",
          "resyncs owner se copy laane ki ginti hai, SMS delivery ki nahi.",
          "Successful read sirf order data milne ka saboot hai. SMS ka status alag jaancho."
        ]
      }
    ]
  },
  "success": [
    "event() ke teeno modes ka farak code mein dikha sakte ho",
    "Version check aur delta gap ki shart line se samjha sakte ho",
    "Resync ki seema (abhi ka data, chhoota kaam nahi) bata sakte ho"
  ],
  "cards": [
    {
      "front": "Fat ya delta mein purani khabar kab chhodte hain?",
      "back": "Guard chalu ho aur is order ki copy ho: khabar ka version copy se bada na ho toh lines 12–14 par chhod do. Thin mode owner se abhi ka order leta hai."
    },
    {
      "front": "Delta mein gap kaise dikhta hai?",
      "back": "Purani ya barabar khabar pehle hi chhoot jaati hai. Bachi khabar ka version copy + 1 na ho toh line 19 par gap: owner se poora order lo. Copy na ho toh pehla version 1 hona chahiye."
    },
    {
      "front": "Resync kya nahi karta?",
      "back": "Chhoote version ka kaam (jaise SMS) wapas nahi laata. Sirf copy theek karta hai."
    }
  ]
}
]);
})();
