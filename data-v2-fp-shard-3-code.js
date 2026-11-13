/* First Principles — FAANG Senior Engineer.
   Source credit: Sharding (X72epD9Qn3U), numbered video 7/15.
   Evidence: docker-labs/57-sharding/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "gen", "icon": "❄️", "label": "snowflake()", "x": 140, "y": 120}, {"id": "ids", "icon": "🔢", "label": "time | machine | seq", "x": 520, "y": 120}];
const EDGES = [{"from": "gen", "to": "ids"}];
VISUALS["fp-shard-code"] = { t: "Ek ID = samay (41 bit) | machine (10 bit) | sequence (12 bit). Samay aage, toh ek chalte generator ka baad ka ID bada.", html: SD.viz.svg(HERO, EDGES, { nodes: { gen: {tone:'acc',badge:'next()'}, ids: {tone:'ok',badge:'64 bit'} } }, {w:720,h:240}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-shard-code",
  "icon": "❄️",
  "group": "🔪 Sharding",
  "title": "Sharding 3 · Code — bina counter ke unique ID",
  "badge": "ID Ka Darzi",
  "objectives": [
    "Shards par auto-increment kyun toot'ta hai?",
    "Snowflake ke bits aur guards line-by-line",
    "UUIDv4 vs UUIDv7 vs Snowflake: B-tree par asar, numbers se"
  ],
  "lesson": [
    "<h3>🎟️ Mele ke token</h3><p>Mele mein ek hi token counter tha: har token par agla number. Phir 10 counters khule. Har counter apna 1, 2, 3 likhne laga — ab \"token 5\" das logon ke paas hai. Har baar mukhya counter se poochna? Line wapas lambi.</p><p>Hal: token par counter ka number bhi likho, aur samay bhi. \"10:05 · counter 3 · 7va\" kisi aur counter par nahi ban sakta. Snowflake ID bilkul aisa hai. Aaj code padhte hain, aur dekhte hain ki galat ID database ke B-tree ko kitna dheema karti hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "❄️ snowflake(): ek ID kaise banta hai",
      "goal": "lib/ids.js. Shards ek doosre se poochhe bina unique IDs chahiye — auto-increment ka ek counter ab nahi hai. Snowflake (Twitter, 2010): 64-bit number = 1 bit khaali | 41 bit ms (custom epoch se) | 10 bit machine | 12 bit sequence. Lab ka epoch 2020-01-01.",
      "code": {
        "title": "lib/ids.js",
        "file": "docker-labs/57-sharding/lib/ids.js",
        "from": 9,
        "text": "function snowflake({ machine, clock = Date.now, guard = true }) {\n  if (!Number.isInteger(machine) || machine < 0 || machine > 1023) {\n    throw new RangeError('machine id must be 0–1023');\n  }\n  let last = -1, seq = 0;\n  const stats = { waits: 0 };\n  const m = BigInt(machine);\n  function next() {\n    let t = clock(), s = 0;\n    // Twitter's IdWorker also refuses when the clock goes back\n    if (t < last && guard) throw new Error(`clock moved backwards by ${last - t} ms`);\n    if (t === last) {\n      s = (seq + 1) & MAX_SEQ;\n      if (s === 0) {                       // 4096 IDs used in this ms\n        stats.waits++;\n        while ((t = clock()) <= last) { }  // spin until the next ms\n      }\n    }\n    if (!Number.isInteger(t) || t < EPOCH || t - EPOCH >= MAX_MS) {\n      throw new RangeError(`time ${t} is outside the 41-bit window`);\n    }\n    seq = s; last = t;                     // only a good ID changes state\n    return (BigInt(t - EPOCH) << 22n) | (m << 12n) | BigInt(seq);\n  }\n  next.stats = stats;\n  return next;\n}"
      },
      "vars": [
        {
          "id": "t",
          "label": "t − EPOCH (ms)"
        },
        {
          "id": "seq",
          "label": "seq"
        },
        {
          "id": "id",
          "label": "ID"
        }
      ],
      "steps": [
        {
          "title": "1. Machine id",
          "say": "Line 10–12: machine id 0 se 1023 tak (10 bit). Har generator ko alag id deni hai; Twitter ke code mein 5 bit datacenter + 5 bit worker. Machine id shards ki ginti nahi, generators ki hai.",
          "line": "10-12",
          "vars": {
            "t": "—",
            "seq": "—",
            "id": "—"
          }
        },
        {
          "title": "2. Naya ms",
          "say": "Kalpanik kram: screen par <code>t − EPOCH</code> dikha rahe hain (asli <code>t</code> = EPOCH + 1000). Line 17: ghadi padho, naya sequence <code>s = 0</code>. Pichhle ID se naya ms hai, toh line 20 ka block nahi chalta; line 30: <code>seq = 0</code>, <code>last = t</code>.",
          "line": "17-30",
          "vars": {
            "t": "1000",
            "seq": "0",
            "id": "…"
          }
        },
        {
          "title": "3. Same ms",
          "say": "Line 20–21: same ms mein doosra ID → <code>s = seq + 1</code> (line 30 par <code>seq</code> ban jaata hai). 12 bit = 4,096 IDs per ms per machine.",
          "line": "20-21",
          "vars": {
            "t": "1000",
            "seq": "1",
            "id": "pichhle se +1"
          }
        },
        {
          "title": "4. 4,096 khatam",
          "say": "Line 22–24: temporary <code>s</code> ghoom ke 0 hua matlab is ms ke 4,096 IDs ho gaye; <code>seq</code> abhi 4095 hai. Agle ms tak ghoomo (spin); line 30 par <code>seq = s</code> hota hai.",
          "line": "22-24",
          "vars": {
            "t": "1000 → 1001",
            "seq": "0",
            "id": "agle ms ka"
          },
          "ask": {
            "q": "Lab ex3 mein ek JS thread ~40 lakh IDs/sec banata hai. 0.5 s mein ~480 baar line 23 chali. Kyun?",
            "choices": [
              "Seema 4,096 × 1,000 = 40.96 lakh/sec hai; thread itna tez hai ki kai ms mein 4,096 khatam hue",
              "Ghadi har 0.5 s mein ek baar peeche jaati hai, isliye generator ko ruk ke intezaar karna pada",
              "Machine id 1023 se upar chala gaya, isliye generator naya machine id milne tak ruka"
            ],
            "answer": 0,
            "hint": "4,096 IDs per ms ko per second mein badlo.",
            "explain": "4,096 IDs per ms = 40.96 lakh per second per generator. Lab ka thread ~40 lakh/sec bana raha tha — seema ke bilkul paas. Jis ms mein 4,096 pehle hi ban gaye, agle ms ka intezaar (~480 baar 0.5 s mein). Aur IDs chahiye toh aur generators (alag machine ids).",
            "choiceExplanations": [
              "4,096 IDs per ms = 40.96 lakh per second per generator. Lab ka thread ~40 lakh/sec bana raha tha — seema ke bilkul paas. Jis ms mein 4,096 pehle hi ban gaye, agle ms ka intezaar (~480 baar 0.5 s mein). Aur IDs chahiye toh aur generators (alag machine ids).",
              "Lab ki asli ghadi peeche nahi gayi; peeche jaane par line 19 error deti.",
              "Machine id line 10 par jaancha jaata hai; 1023 se upar ka generator banta hi nahi."
            ]
          }
        },
        {
          "title": "5. Ghadi peeche",
          "say": "NTP ne ghadi 5 ms peeche ki: <code>t &lt; last</code>. Line 19: guard chalu hai toh error — ID nahi banta.",
          "line": "19",
          "vars": {
            "t": "995 (last 1000)",
            "seq": "—",
            "id": "error"
          },
          "ask": {
            "q": "Guard band ho (<code>guard: false</code>) toh kya hota? (Lab ex3 B2.)",
            "choices": [
              "Line 30 last ko EPOCH + 995 par le jaati hai; 995–999 ms ke IDs dobara bante — 50 duplicates",
              "Kuch nahi — sequence number har baar badhta hai, isliye ID kabhi dobara nahi ban sakta",
              "Generator ruk jaata hai jab tak ghadi 1000 tak wapas nahi aati, isliye koi ID nahi banta"
            ],
            "answer": 0,
            "hint": "995 ms par seq kya hoga — line 17 aur 30 dekho.",
            "explain": "Guard band: 995 naya ms lagta hai (t ≠ last), toh line 17 <code>s = 0</code>, aur line 30 <code>seq = 0</code>, <code>last = EPOCH + 995</code>. 995–999 ms ke same (ms, machine, seq) dobara bante hain. Lab: 20,000 IDs mein 50 duplicates. Guard chalu: 0 duplicates, 40 requests mana. Twitter ka IdWorker bhi mana karta hai. Dhyaan: guard sirf ek chalte generator ki yaad hai — restart ke baad same ms mein same machine id phir same IDs banati hai (lab B5: 10 duplicates).",
            "choiceExplanations": [
              "Guard band: 995 naya ms lagta hai (t ≠ last), toh line 17 <code>s = 0</code>, aur line 30 <code>seq = 0</code>, <code>last = EPOCH + 995</code>. 995–999 ms ke same (ms, machine, seq) dobara bante hain. Lab: 20,000 IDs mein 50 duplicates. Guard chalu: 0 duplicates, 40 requests mana. Twitter ka IdWorker bhi mana karta hai. Dhyaan: guard sirf ek chalte generator ki yaad hai — restart ke baad same ms mein same machine id phir same IDs banati hai (lab B5: 10 duplicates).",
              "Naye ms par seq 0 se shuru hota hai (line 17, 30); 995 ms ke seq 0–9 pehle ban chuke the.",
              "Rukna guard chalu hone par bhi nahi hota; guard error deta hai, intezaar nahi karta."
            ]
          }
        },
        {
          "title": "6. Bits jodo",
          "say": "Line 27–29: samay epoch se pehle ya 41 bit (~69.7 saal) ke baad ho toh error — aur <code>seq</code>/<code>last</code> nahi badalte, kyunki line 30 sirf achhe ID par chalti hai. Line 31: <code>(t − EPOCH) &lt;&lt; 22</code> | <code>machine &lt;&lt; 12</code> | <code>seq</code>. Samay sabse aage.",
          "line": "27-31",
          "vars": {
            "t": "1000",
            "seq": "0",
            "id": "time | machine | seq"
          },
          "ask": {
            "q": "Samay ko sabse oonche bits mein kyun rakha?",
            "choices": [
              "Number ka bada hissa samay hai, toh baad ka ID hamesha bada — B-tree mein naya ID aakhir mein",
              "Samay ke bits sabse zyada badalte hain, aur oonche bits mein rakhne se ID chhota rehta hai",
              "Machine id ko neeche rakhna zaroori hai warna 1,024 se zyada machines ki jagah nahi bachti"
            ],
            "answer": 0,
            "hint": "Do IDs ka comparison pehle kaunse bits dekhta hai?",
            "explain": "Number ki tulna oonche bits se shuru hoti hai. Samay sabse aage hai, toh ek chalte generator ka baad wala ID hamesha bada. B-tree mein naya ID daayein kinare judta hai. Dhyaan: alag machines ki ghadiyan alag ho sakti hain — lab ex3: B ki ghadi 30 ms peeche, toh order sirf lagbhag (k-sorted).",
            "choiceExplanations": [
              "Number ki tulna oonche bits se shuru hoti hai. Samay sabse aage hai, toh ek chalte generator ka baad wala ID hamesha bada. B-tree mein naya ID daayein kinare judta hai. Dhyaan: alag machines ki ghadiyan alag ho sakti hain — lab ex3: B ki ghadi 30 ms peeche, toh order sirf lagbhag (k-sorted).",
              "ID hamesha 64 bit ka hai; bits ki jagah se size nahi badalta.",
              "Machine ke 10 bit kahin bhi ho, 1,024 hi ids milti hain."
            ]
          }
        }
      ],
      "lesson": "Snowflake = samay | machine | sequence. Unique tab tak jab machine id alag ho, ghadi peeche na jaaye (guard), aur restart ke baad generator aakhri ms ke baad se shuru kare. 4,096 per ms per machine. Order ek chalte generator ke andar pakka, machines ke beech lagbhag."
    },
    {
      "type": "cards",
      "title": "🌳 Kaunsi ID B-tree ko pasand?",
      "goal": "Lab 57 ex3 A: 10 lakh rows, 6 tarah ki primary key, asli SQLite file. 2 MB cache (SQLite ka default; B-tree RAM mein nahi samaata) aur 512 MB cache (poora RAM mein). Captures ke 3 runs.",
      "lesson": "Random ID (UUIDv4) har insert ko B-tree ke kisi random page par bhejta hai: locality khatam, insert ~9–10× dheema, file badi. Snowflake (ek chalta generator) naye rows ko B-tree ke aakhir mein jodta hai; UUIDv7 naye ms ke paas jodta hai (ek ms ke andar kram random). Pages ka bharaav engine par hai — har engine naapo.",
      "steps": [
        {
          "title": "1. Samay",
          "say": "2 MB cache: auto-increment 0.75–0.78 s · Snowflake 0.58–0.59 s · UUIDv7 0.98–1.14 s · <b>UUIDv4 7.60–7.81 s</b> · UUIDv4 text 8.71–8.74 s. 512 MB cache par bhi UUIDv4 5.45–5.69 s vs auto-increment 0.57–0.63 s.",
          "ask": {
            "q": "Poora B-tree RAM mein (512 MB) hai, koi disk read nahi. Phir bhi UUIDv4 ~9× dheema kyun?",
            "choices": [
              "Har insert alag random page par jaata hai; CPU cache aur page splits ka kharcha har baar",
              "UUIDv4 banana mehnga hai; 10 lakh random numbers ginne mein hi 5 second lag jaate hain",
              "UUIDv4 ke saath SQLite har insert par poori table dobara sort karta hai"
            ],
            "answer": 0,
            "hint": "Badhti ID ka naya row B-tree mein kahan judta hai, aur random ID ka?",
            "explain": "Badhti ID har baar daayein kinare ke usi page par judti hai — page garam rehta hai. Random ID har insert par jad se kisi bhi leaf tak naya raasta leti hai: alag pages, CPU cache miss, beech mein page splits. Disk ke bina bhi locality ka kharcha. RAM se bada B-tree ho toh disk reads bhi judte.",
            "choiceExplanations": [
              "Badhti ID har baar daayein kinare ke usi page par judti hai — page garam rehta hai. Random ID har insert par jad se kisi bhi leaf tak naya raasta leti hai: alag pages, CPU cache miss, beech mein page splits. Disk ke bina bhi locality ka kharcha. RAM se bada B-tree ho toh disk reads bhi judte.",
              "Lab mein IDs timing se pehle ban jaate hain; samay sirf inserts ka hai.",
              "SQLite poori table sort nahi karta; B-tree ek page mein jagah banata hai."
            ]
          }
        },
        {
          "title": "2. File aur pages",
          "say": "File: auto-increment 106 MB · Snowflake 112 MB · UUIDv7 132 MB · UUIDv4 135 MB · UUIDv4 text <b>159 MB</b>. Leaf pages bhare: integer rowid table 99%; WITHOUT ROWID table mein UUIDv7 89%, UUIDv4 87%. (InnoDB alag tareeke se bharta hai.)"
        },
        {
          "title": "3. Rowid table + UUID index",
          "say": "Rows integer rowid ki B-tree mein aakhir mein judti hain (table pages 98% bhare), UUID ek alag index mein: 4.11–4.16 s (2 MB cache). Postgres se milta-julta sirf itna: table ka data aur primary key ka index alag. (Postgres ki table heap hai, B-tree nahi.)",
          "ask": {
            "q": "Rowid + index layout UUIDv4 clustered (7.6–7.8 s) se tez (4.1 s), par auto-increment (0.8 s) se dheema kyun?",
            "choices": [
              "Badi row aakhir mein judti hai; random jagah sirf 16 byte ki index entry jaati hai",
              "Heap mein rows compress hoti hain, isliye kam pages likhne padte hain",
              "Index sirf query ke waqt banta hai, insert ke waqt nahi, isliye insert sasta"
            ],
            "answer": 0,
            "hint": "Random jagah par kya likha ja raha hai: poori row ya sirf 16 byte ki key?",
            "explain": "Badi row (body ke saath) rowid table ke aakhir mein judti hai. Random jagah par sirf index entry (16 byte UUID + rowid) jaati hai — chhota random kaam. Isliye beech ka samay. Postgres par bhi UUIDv4 primary key index ko random banati hai; table ka data alag rehta hai.",
            "choiceExplanations": [
              "Badi row (body ke saath) rowid table ke aakhir mein judti hai. Random jagah par sirf index entry (16 byte UUID + rowid) jaati hai — chhota random kaam. Isliye beech ka samay. Postgres par bhi UUIDv4 primary key index ko random banati hai; table ka data alag rehta hai.",
              "Lab ke rows compressed nahi; table pages 98% bhare hain kyunki rowid se append hai.",
              "UNIQUE index har insert par update hota hai — warna duplicate kaise pakdega."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 10 lakh inserts aur Snowflake ke paanch demos",
      "project": "57-sharding",
      "exercise": "ex3-ids",
      "goal": "A: 6 tarah ki primary key, 10 lakh inserts, do cache sizes, dbstat se pages. B: Snowflake — do machines, galti se same machine id, ghadi peeche, 4,096 ki seema, machines ke beech order, generator restart.",
      "why": "Node 24+ chahiye. Hissa A ~45 second leta hai. Samay machine ke saath badlega; pages aur duplicates ki ginti same rahegi.",
      "steps": [
        {
          "text": "Lab folder se chalao.",
          "cmd": "cd docker-labs/57-sharding && npm start -- ex3-ids",
          "expect": "A. 10,00,000 rows (body 80–119 chars), 10,000 rows per transaction, synchronous = OFF\n\nprimary key                   cache 2 MB    cache 512 MB    file      leaf pages (kitne % bhare)\nauto-increment INTEGER          0.75 s       0.63 s      106 MB   table 27,137 (99%)\nSnowflake INTEGER               0.59 s       0.69 s      112 MB   table 28,651 (99%)\nUUIDv7 BLOB                     1.14 s       1.33 s      132 MB   table 32,647 (89%)\nUUIDv4 BLOB                     7.77 s       5.45 s      135 MB   table 33,330 (87%)\nUUIDv4 TEXT (36 chars)          8.71 s       6.24 s      159 MB   table 38,949 (86%)\nUUIDv4 BLOB, rowid + index      4.16 s       2.80 s      150 MB   index 6,725 (90%) + table 31,502 (98%)\n\n2 MB = SQLite ka default cache: B-tree RAM mein nahi samaata. 512 MB: poora B-tree RAM mein.\n\"rowid + index\" = rows integer rowid ki B-tree mein aakhir mein judti hain, UUID ek alag index mein.\n(Postgres se milta-julta sirf itna: table ka data aur primary key ka index alag. Postgres heap B-tree nahi hai.)\nUUIDv7: har ms ke 10 IDs ka random hissa alag hai, toh ek ms ke andar kram random; ms ke beech badhta hai.\n\nB. Snowflake: 1 bit khaali | 41 bit ms (custom epoch 2020-01-01) | 10 bit machine | 12 bit sequence\n  41 bit ms = 21,99,02,32,55,552 ms = 69.7 saal   10 bit = 1,024 machine ids   12 bit = 4,096 IDs per ms per machine\n  ek ID: 830955375820951552  →  2026-04-12T00:00:00.000Z  machine 37  seq 0\n\n  1. Do machines, 4,00,000 IDs: machine ids 1 aur 2 → duplicates 0;  galti se dono ko id 1 → duplicates 2,00,000\n  2. Clock 5 ms peeche (20,000 IDs, beech mein): guard band → duplicates 50;  guard chalu (Twitter jaisa: mana karo) → duplicates 0, 40 requests mana\n  3. Asli clock, 0.5 s tak jitni tez ho sake: 39,37,013 IDs/sec; 477 baar 4096 khatam → agle ms ka intezaar (seema 40,96,000/sec)\n  4. Machine B ki ghadi 30 ms peeche, A aur B baari baari (1 lakh events): 50,000 jagah agla event chhota ID paata hai;\n     ID ke order mein kuch events un events ke peeche aate hain jo asal mein 29 ms BAAD hue the\n     → Snowflake \"lagbhag\" time-order (k-sorted) hai; ek chalte generator ke andar pakka badhta hai.\n  5. Generator restart (same machine id 9, same ms): pehle 10 IDs, restart ke baad 10 → duplicates 10\n     → guard sirf EK chalte generator ko bachata hai. Restart par aakhri ms yaad rakho (disk par) ya us ms ke guzarne tak ruko."
        },
        {
          "text": "Sirf Snowflake wala hissa B (hissa A poora skip hota hai, ~1 second).",
          "cmd": "node tools/ids.js 1000 b",
          "expect": "\nB. Snowflake: 1 bit khaali | 41 bit ms (custom epoch 2020-01-01) | 10 bit machine | 12 bit sequence\n  41 bit ms = 21,99,02,32,55,552 ms = 69.7 saal   10 bit = 1,024 machine ids   12 bit = 4,096 IDs per ms per machine\n  ek ID: 830955375820951552  →  2026-04-12T00:00:00.000Z  machine 37  seq 0\n\n  1. Do machines, 4,00,000 IDs: machine ids 1 aur 2 → duplicates 0;  galti se dono ko id 1 → duplicates 2,00,000\n  2. Clock 5 ms peeche (20,000 IDs, beech mein): guard band → duplicates 50;  guard chalu (Twitter jaisa: mana karo) → duplicates 0, 40 requests mana\n  3. Asli clock, 0.5 s tak jitni tez ho sake: 40,44,211 IDs/sec; 488 baar 4096 khatam → agle ms ka intezaar (seema 40,96,000/sec)\n  4. Machine B ki ghadi 30 ms peeche, A aur B baari baari (1 lakh events): 50,000 jagah agla event chhota ID paata hai;\n     ID ke order mein kuch events un events ke peeche aate hain jo asal mein 29 ms BAAD hue the\n     → Snowflake \"lagbhag\" time-order (k-sorted) hai; ek chalte generator ke andar pakka badhta hai.\n  5. Generator restart (same machine id 9, same ms): pehle 10 IDs, restart ke baad 10 → duplicates 10\n     → guard sirf EK chalte generator ko bachata hai. Restart par aakhri ms yaad rakho (disk par) ya us ms ke guzarne tak ruko."
        }
      ],
      "observe": {
        "q": "B1 mein galti se do servers ko same machine id (1) mili. Duplicates 2,00,000 kyun?",
        "choices": [
          "Dono ek hi ms mein same seq se shuru karte hain; samay, machine aur seq teeno same — har ID dobara",
          "Do generator ek hi ghadi padhte hain, isliye ek generator ka har ID doosre ka ID mita deta hai",
          "Machine id 1 reserved hai; generator machine id 1 ko galat number se badal deta hai aur takraav hota hai"
        ],
        "answer": 0,
        "hint": "Snowflake ke teen hisse kaunse hain? Do servers par kaunsa hissa alag reh gaya?",
        "explain": "Snowflake mein uniqueness machine id se aati hai. Dono servers ki ghadi same, seq dono jagah 0 se, aur machine id bhi same — toh har ID dono jagah bana: 2 lakh IDs dobara. Machine ids alag (1 aur 2) par: 0 duplicates. Machine id baantna (config, ZooKeeper, lease) design ka hissa hai.",
        "choiceExplanations": [
          "Snowflake mein uniqueness machine id se aati hai. Dono servers ki ghadi same, seq dono jagah 0 se, aur machine id bhi same — toh har ID dono jagah bana: 2 lakh IDs dobara. Machine ids alag (1 aur 2) par: 0 duplicates. Machine id baantna (config, ZooKeeper, lease) design ka hissa hai.",
          "Generator kuch mitaata nahi; dono apne IDs lautate hain, bas same.",
          "Lab mein koi id reserved nahi; 0–1023 sab chalti hain."
        ]
      },
      "lesson": "Random primary key B-tree ki locality todti hai. Snowflake aur UUIDv7 samay ke saath badhte hain (UUIDv7 ek ms ke andar random). Snowflake ke duplicates: same machine id, ghadi peeche aur guard band, ya restart."
    }
  ],
  "interview": {
    "title": "Interview Round — IDs",
    "instructions": "Pehle socho: ID unique kaise rahega bina poochhe, aur database mein naya ID kahan judega? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Orders table (InnoDB, primary key = UUIDv4 string). Inserts dheeme, table badi. Team kehti hai \"bada server lo\". Tumhara sujhaav?",
        "choices": [
          "Time-ordered ID lo (UUIDv7 ya Snowflake, binary form mein) — naye rows naye samay ke paas judenge",
          "UUIDv4 ko text ki jagah aur lamba string karo — lambe string mein takraav ka chance kam",
          "Primary key hata do — bina primary key ke inserts sabse tez hote hain",
          "Har insert ke baad table OPTIMIZE karo — random gaps roz bhar jaayenge"
        ],
        "answer": 0,
        "explain": "InnoDB rows ko primary key ke kram mein rakhta hai (clustered). Random UUIDv4 har insert ko random page par bhejta hai. Lab ex3 (SQLite WITHOUT ROWID, clustered jaisa): UUIDv4 7.6–7.8 s vs UUIDv7 ~1 s; text form 159 MB vs 135 MB binary. Time-ordered ID + binary column.",
        "choiceExplanations": [
          "InnoDB rows ko primary key ke kram mein rakhta hai (clustered). Random UUIDv4 har insert ko random page par bhejta hai. Lab ex3 (SQLite WITHOUT ROWID, clustered jaisa): UUIDv4 7.6–7.8 s vs UUIDv7 ~1 s; text form 159 MB vs 135 MB binary. Time-ordered ID + binary column.",
          "Lamba string = bada index; takraav UUIDv4 mein pehle hi bahut kam hai, samasya kram hai.",
          "InnoDB bina primary key ke chhupa hua key banata hai; aur rows ko dhoondhna mushkil.",
          "Har insert ke baad OPTIMIZE = poori table dobara likhna; inserts aur dheeme."
        ]
      },
      {
        "q": "Snowflake generator 3 regions mein chal raha hai. Ek din kuch orders ke IDs takraaye. Pehla shak kis par?",
        "choices": [
          "Machine id ka baantna — do generators ko same id mili; phir ghadi ka peeche jaana",
          "41 bit ka samay khatam — ab har ID pehle wale IDs ko dobara bana raha hai",
          "Sequence ke 12 bit kam hain — 4,096 ke baad IDs ek doosre ke upar likhe jaate hain",
          "Database ka B-tree — bade IDs B-tree mein purane IDs ko mita dete hain"
        ],
        "answer": 0,
        "explain": "Snowflake ke unique hone ki shartein: har generator ki machine id alag, ghadi peeche na jaaye (ya guard mana kare), aur restart ke baad generator aakhri ms ke baad se chale. Lab ex3: same id → 2,00,000 duplicates; ghadi 5 ms peeche + guard band → 50; restart same ms mein → 10. 41 bit 69.7 saal chalte hain; 4,096 ke baad generator agle ms ka intezaar karta hai.",
        "choiceExplanations": [
          "Snowflake ke unique hone ki shartein: har generator ki machine id alag, ghadi peeche na jaaye (ya guard mana kare), aur restart ke baad generator aakhri ms ke baad se chale. Lab ex3: same id → 2,00,000 duplicates; ghadi 5 ms peeche + guard band → 50; restart same ms mein → 10. 41 bit 69.7 saal chalte hain; 4,096 ke baad generator agle ms ka intezaar karta hai.",
          "41 bit = 69.7 saal custom epoch se; lab ka epoch 2020, toh ~2089 tak.",
          "4,096 ke baad generator agle ms ka intezaar karta hai (line 22–24); overwrite nahi.",
          "B-tree IDs nahi mitaata; duplicate key ko primary key reject karti hai."
        ]
      }
    ]
  },
  "success": [
    "Snowflake ke bits aur dono guards samjha sakte ho",
    "Snowflake duplicates ke do kaaran bata sakte ho",
    "UUIDv4 primary key ki keemat numbers se bata sakte ho"
  ],
  "cards": [
    {
      "front": "Snowflake ke bits?",
      "back": "1 khaali | 41 bit ms (custom epoch se, 69.7 saal) | 10 bit machine (1,024 generators) | 12 bit sequence (4,096 per ms). Twitter: 5 bit datacenter + 5 bit worker."
    },
    {
      "front": "Snowflake duplicate kab?",
      "back": "Do generators ko same machine id (lab 57 ex3: 2,00,000 duplicates), ghadi peeche aur guard band (50), ya restart ke baad same ms (10). Guard chalu: mana karo (Twitter ka IdWorker bhi); restart par aakhri ms yaad rakho ya ruko."
    },
    {
      "front": "UUIDv4 primary key ki keemat?",
      "back": "Lab 57 ex3, 10 lakh inserts: UUIDv4 7.60–7.81 s vs auto-increment 0.75–0.78 s (512 MB cache par bhi ~9×). UUIDv7 (RFC 9562, May 2024) samay se badhta hai: ~1 s."
    }
  ]
}
]);
})();
