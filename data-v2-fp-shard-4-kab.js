/* First Principles — FAANG Senior Engineer.
   Source credit: Sharding (X72epD9Qn3U), numbered video 7/15.
   Evidence: docker-labs/57-sharding/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "🧾", "label": "App (dual write)", "x": 200, "y": 55}, {"id": "old", "icon": "🗄️", "label": "Purana DB (asli sach)", "x": 200, "y": 280}, {"id": "bf", "icon": "🚚", "label": "Backfill worker", "x": 530, "y": 280}, {"id": "new", "icon": "🗂️", "label": "Naye 4 shards", "x": 760, "y": 160}];
const EDGES = [{"from": "app", "to": "old"}, {"from": "app", "to": "new"}, {"from": "old", "to": "bf"}, {"from": "bf", "to": "new"}];
VISUALS["fp-shard-kab"] = { t: "Backfill ne v1 padha, user ne v2 likha, backfill ne v1 likh diya. Version check + tombstone rokte hain.", html: SD.viz.svg(HERO, EDGES, { nodes: { app: {tone:'acc',badge:'v2'}, old: {tone:'ok',badge:'sach'}, bf: {tone:'bad',badge:'v1'}, new: {tone:'ok',badge:'v2'} } }, {w:900,h:360}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-shard-kab",
  "icon": "🛑",
  "group": "🔪 Sharding",
  "title": "Sharding 4 · Kab — saath rakho, dhyaan se le jaao, ya ruko",
  "badge": "Migration Ka Surgeon",
  "objectives": [
    "Co-location se join aur transaction kaise bachte hain?",
    "Backfill race aur delete se zinda rows: version check + tombstone",
    "Shard karne se pehle kaunse sasti raaste?"
  ],
  "lesson": [
    "<h3>🏠 Ghar badalna, saamaan chalte hue</h3><p>Purane ghar se naye ghar mein saamaan le ja rahe ho, par ghar wale abhi bhi purane ghar mein rehte hain. Tumne almaari ki tasveer li, ek ghante baad truck se naye ghar mein waisi hi almaari saja di. Beech mein didi ne ek kitaab badli aur ek kurta phenk diya. Naye ghar mein purani kitaab aur phenka hua kurta wapas aa gaye.</p><p>Database migration mein bhi aisi hi race hoti hai. Aaj naapte hain: kaunse niyam purani tasveer ko naye data ko mitane se rokte hain, aur kab shard karna hi nahi chahiye.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🚚 Backfill chal raha hai, user naam badal raha hai",
      "goal": "Lab 57 ex5 (asli SQLite, seeded kram). 20,000 profiles purane DB se 4 naye shards par. App har write pehle purane DB mein, phir naye shard par bhejti hai (dual write). Backfill 500 ids ka chunk padhta hai, beech mein 150 live writes hote hain, phir pehle padha hua chunk likhta hai. Backfill ke dauraan: 4,185 updates, 1,212 deletes, 603 naye profiles.",
      "nodes": [
        {
          "id": "app",
          "icon": "🧾",
          "label": "App (dual write)",
          "x": 200,
          "y": 55
        },
        {
          "id": "old",
          "icon": "🗄️",
          "label": "Purana DB (asli sach)",
          "x": 200,
          "y": 280
        },
        {
          "id": "bf",
          "icon": "🚚",
          "label": "Backfill worker",
          "x": 530,
          "y": 280
        },
        {
          "id": "new",
          "icon": "🗂️",
          "label": "Naye 4 shards",
          "x": 760,
          "y": 160
        }
      ],
      "edges": [
        {
          "from": "app",
          "to": "old"
        },
        {
          "from": "app",
          "to": "new"
        },
        {
          "from": "old",
          "to": "bf"
        },
        {
          "from": "bf",
          "to": "new"
        }
      ],
      "viz": {
        "w": 900,
        "h": 360
      },
      "vars": [
        {
          "id": "old",
          "label": "Purane mein row 1234"
        },
        {
          "id": "new",
          "label": "Naye mein row 1234"
        },
        {
          "id": "bad",
          "label": "Galat rows"
        }
      ],
      "steps": [
        {
          "title": "1. Chunk padha",
          "clock": "read",
          "say": "Kalpanik chhota kram, ex5 ki race samajhne ke liye (lab ke asli naam <code>name1234-v1</code> jaise hain): backfill ne ids 1001–1500 padhe. Row 1234 = <b>v1</b>, naam Asha maano.",
          "nodes": {
            "app": {
              "tone": "idle",
              "badge": ""
            },
            "old": {
              "tone": "ok",
              "badge": "v1"
            },
            "bf": {
              "tone": "acc",
              "badge": "v1 haath mein"
            },
            "new": {
              "tone": "idle",
              "badge": "abhi nahi"
            }
          },
          "vars": {
            "old": "v1",
            "new": "—",
            "bad": "—"
          },
          "flows": [
            {
              "from": "old",
              "to": "bf",
              "label": "v1",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "2. User ne naam badla",
          "clock": "live",
          "say": "Chunk padhne aur likhne ke beech Asha ne naam badla: purane DB mein <b>v2</b>, aur dual write se naye shard par bhi v2.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "v2"
            },
            "old": {
              "tone": "ok",
              "badge": "v2"
            },
            "bf": {
              "tone": "acc",
              "badge": "v1 haath mein"
            },
            "new": {
              "tone": "ok",
              "badge": "v2"
            }
          },
          "vars": {
            "old": "v2",
            "new": "v2",
            "bad": "0"
          },
          "flows": [
            {
              "from": "app",
              "to": "old",
              "label": "v2",
              "tone": "acc"
            },
            {
              "from": "app",
              "to": "new",
              "label": "v2",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "3. Backfill likhta hai",
          "clock": "overwrite",
          "say": "Backfill ab apna padha hua v1 likhta hai: <code>INSERT OR REPLACE</code> (overwrite).",
          "nodes": {
            "app": {
              "tone": "idle",
              "badge": ""
            },
            "old": {
              "tone": "ok",
              "badge": "v2"
            },
            "bf": {
              "tone": "bad",
              "badge": "v1 likha"
            },
            "new": {
              "tone": "bad",
              "badge": "v1 ✗"
            }
          },
          "vars": {
            "old": "v2",
            "new": "v1",
            "bad": "98 purani + 30 zinda-hui"
          },
          "flows": [
            {
              "from": "bf",
              "to": "new",
              "label": "",
              "tone": "bad"
            }
          ],
          "ask": {
            "q": "Naye shard mein row 1234 ab kya hai, aur kyun?",
            "choices": [
              "v1 — backfill ka padha hua purana version, dual write ke naye v2 ke upar likh diya",
              "v2 — naya shard hamesha sabse naya version rakhta hai, backfill ka v1 ignore hota hai",
              "Kuch nahi — do writes takraaye toh shard ne row 1234 hi hata di, dobara copy hogi"
            ],
            "answer": 0,
            "hint": "INSERT OR REPLACE kya dekhta hai: version, ya bas key?",
            "explain": "Overwrite sirf key dekhta hai, version nahi. Backfill ne v1 padha, beech mein v2 aaya, phir v1 ne v2 ko mita diya. User ka naya naam gaya — data loss, aur kisi ne error nahi dekha. Lab: 98 rows purane version par.",
            "choiceExplanations": [
              "Overwrite sirf key dekhta hai, version nahi. Backfill ne v1 padha, beech mein v2 aaya, phir v1 ne v2 ko mita diya. User ka naya naam gaya — data loss, aur kisi ne error nahi dekha. Lab: 98 rows purane version par.",
              "Lab ke overwrite mein koi version check nahi tha; shard bas key se replace karta hai.",
              "INSERT OR REPLACE conflicting row hata kar incoming row daalta hai; row gayab nahi rehti, bas purana payload v1 wapas aa gaya."
            ]
          }
        },
        {
          "title": "4. Ilaaj: version check",
          "clock": "version",
          "say": "Backfill ka likhna atomic shart ke saath: <code>ON CONFLICT(id) DO UPDATE … WHERE excluded.version &gt; profiles.version</code>. v1 &lt; v2, toh kuch nahi badla. Ek hi statement mein — alag se padh ke phir likhna race dobara laata.",
          "nodes": {
            "app": {
              "tone": "idle",
              "badge": ""
            },
            "old": {
              "tone": "ok",
              "badge": "v2"
            },
            "bf": {
              "tone": "ok",
              "badge": "v1 ignore"
            },
            "new": {
              "tone": "ok",
              "badge": "v2"
            }
          },
          "vars": {
            "old": "v2",
            "new": "v2",
            "bad": "0 purani, 30 zinda-hui"
          }
        },
        {
          "title": "5. Delete wali race",
          "clock": "delete",
          "say": "Row 5678: backfill ne v1 padha. Beech mein user ne account delete kiya: purane DB se gaya; naye shard par delete ko row mili hi nahi (abhi copy nahi hui thi). Phir backfill v1 likhta hai.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "delete"
            },
            "old": {
              "tone": "ok",
              "badge": "row nahi"
            },
            "bf": {
              "tone": "acc",
              "badge": "v1 haath mein"
            },
            "new": {
              "tone": "bad",
              "badge": "v1 zinda"
            }
          },
          "vars": {
            "old": "row 5678 nahi",
            "new": "row 5678 v1 ✗",
            "bad": "30 zinda-hui"
          },
          "ask": {
            "q": "Version check (step 4) ne row 5678 ko kyun nahi roka?",
            "choices": [
              "Naye shard mein row thi hi nahi; milaane ke liye koi version nahi tha, toh insert ho gaya",
              "Delete ka version v1 se chhota hota hai, isliye backfill ka v1 hamesha jeet jaata hai",
              "Version check sirf update par chalta hai; backfill ka likhna insert nahi ginta"
            ],
            "answer": 0,
            "hint": "ON CONFLICT ki shart kab chalti hai — jab row ho, ya jab na ho?",
            "explain": "Shart sirf takraav par chalti hai, yaani jab row maujood ho. Delete ne row hata di, toh backfill ka v1 seedha insert hua: deleted user wapas zinda. Ilaaj: <b>tombstone</b> — delete ko <code>deleted = 1</code> wali row banao, naye version ke saath. Tombstone v2 &gt; v1, toh v1 ignore. Lab: version + tombstone = 0 galat. Tombstone tab tak rakho jab tak purana backfill ya replay aa sakta hai.",
            "choiceExplanations": [
              "Shart sirf takraav par chalti hai, yaani jab row maujood ho. Delete ne row hata di, toh backfill ka v1 seedha insert hua: deleted user wapas zinda. Ilaaj: <b>tombstone</b> — delete ko <code>deleted = 1</code> wali row banao, naye version ke saath. Tombstone v2 &gt; v1, toh v1 ignore. Lab: version + tombstone = 0 galat. Tombstone tab tak rakho jab tak purana backfill ya replay aa sakta hai.",
              "Lab mein delete version badhaata hai (v2); dikkat: row hi nahi bachi.",
              "Backfill ka likhna INSERT … ON CONFLICT hai; row na ho toh seedha insert."
            ]
          }
        },
        {
          "title": "6. Sample se jaanch",
          "clock": "verify",
          "say": "Ab version + tombstone tareeka, aur 1% dual writes fail (log hua, dobara nahi gaye): 55 writes. Nateeja: 5 rows gayab, 22 purani, 7 zinda-hui. Jaanch: purane DB ki 19,391 rows se 1000 random draws (replacement ke saath), poori row milaao.",
          "nodes": {
            "app": {
              "tone": "bad",
              "badge": "55 fail"
            },
            "old": {
              "tone": "ok",
              "badge": "sach"
            },
            "bf": {
              "tone": "idle",
              "badge": ""
            },
            "new": {
              "tone": "bad",
              "badge": "27 galat + 7 zinda"
            }
          },
          "vars": {
            "old": "—",
            "new": "—",
            "bad": "sample ne 1 pakda"
          },
          "ask": {
            "q": "Sample ne 1 galti pakdi. Kya ab \"100% sahi\" maan sakte hain?",
            "choices": [
              "Nahi — 27 galat rows par 1000 ka sample 25% baar kuch nahi pakadta; aur zinda-hui rows dikhti hi nahi",
              "Haan — 1000 rows 5% se zyada hain, aur statistics ke hisaab se itna sample kaafi hai",
              "Haan — jo 1 galti mili, sirf us row ko theek kar do, baaki rows sahi hongi kyunki sample random tha"
            ],
            "answer": 0,
            "hint": "Sample kis DB se chuna gaya? Jo row purane DB mein hai hi nahi, sample us row ko kaise chunega?",
            "explain": "Sample andaaza deta hai, saboot nahi: 27 galat rows (19,391 mein) par 1000 draws ka sample (1 − 27/19391)^1000 ≈ 25% chance se ek bhi nahi pakadta. Aur sample purane DB ke ids se aata hai — naye mein 7 faltu zinda rows kabhi chuni hi nahi jaati. Lab mein live writes rok kar poora compare (poori row), repair (purana DB jeetta hai, <code>&gt;=</code>) aur ulta sweep → 0. Asli cutover mein writes nahi rukte: best-effort ki jagah durable replay (CDC, lab 10) ya outbox ko ek tay log position tak catch up karao, deletes samet.",
            "choiceExplanations": [
              "Sample andaaza deta hai, saboot nahi: 27 galat rows (19,391 mein) par 1000 draws ka sample (1 − 27/19391)^1000 ≈ 25% chance se ek bhi nahi pakadta. Aur sample purane DB ke ids se aata hai — naye mein 7 faltu zinda rows kabhi chuni hi nahi jaati. Lab mein live writes rok kar poora compare (poori row), repair (purana DB jeetta hai, <code>&gt;=</code>) aur ulta sweep → 0. Asli cutover mein writes nahi rukte: best-effort ki jagah durable replay (CDC, lab 10) ya outbox ko ek tay log position tak catch up karao, deletes samet.",
              "Sample ka size kaafi ho tab bhi chhoti galat ginti chhoot jaati hai; ex5 B mein 25% chance.",
              "1 theek karne se baaki 26 gayab-purani rows aur 7 zinda rows bachi rehti hain."
            ]
          }
        },
        {
          "title": "7. Read switch, phir write switch",
          "clock": "switch",
          "say": "Pehle replay (CDC/outbox) ko tay log position tak catch up karao aur poora compare saaf ho. Phir feature flag se reads naye shards se. Dual write chalu rakho: naya kuch tode toh flag wapas, purana DB poora hai — <b>tabhi</b> jab har write (delete bhi) pehle purane DB mein pakka hua. Hafte bhar sab theek, tab dual write band, purana DB retire.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "flag"
            },
            "old": {
              "tone": "ok",
              "badge": "rollback ka raasta"
            },
            "bf": {
              "tone": "idle",
              "badge": "khatam"
            },
            "new": {
              "tone": "ok",
              "badge": "reads naye par"
            }
          },
          "vars": {
            "old": "poora (har write pehle purane mein)",
            "new": "reads",
            "bad": "0 (catch-up + compare ke baad)"
          }
        }
      ],
      "lesson": "Backfill ke dauraan purani copy naye data ko mita sakti hai. Version check ek atomic statement mein, aur delete ke liye tombstone. Best-effort dual write ki galtiyan log se theek nahi hoti — poora compare, repair, ya CDC."
    },
    {
      "type": "cards",
      "title": "🤝 Saath rakho toh join bachta hai",
      "goal": "Lab 57 ex4: 4 shards, 1 lakh users, 5 lakh orders, har user ka wallet. Layout A: orders user ke shard par. Layout B: orders apne order id ke hash se.",
      "lesson": "Shard karne se joins aur transactions khatam nahi hote — shard ke andar bache rehte hain, agar saath padhe-likhe jaane wale rows ek hi shard key par ho. Shards ke beech kaam = zyada calls, zyada kaam, aur crash par aadha kaam.",
      "steps": [
        {
          "title": "1. User + orders",
          "say": "Layout A: 1 call, join shard ke andar (SQL), shards ka op-samay 16–17 µs, median 68–70 µs. Layout B: 5 calls (user + chaaron shards se orders), join app mein, op-samay 71–79 µs, median 127–145 µs. Jawab dono ka ek jaisa."
        },
        {
          "title": "2. Bina shard key ka sawaal",
          "say": "\"Pune ke users ke kitne biryani orders?\" (19,797.) Dono layouts chaaron shards se poochte hain. A: har shard apne andar join, 7.7–9.0 ms. B: pehle Pune ke ~20,000 user ids lao, phir Pune ki list chaaron shards ko (79,872 ids bheje), 27.0–28.6 ms; shards ka op-samay ~2.6–2.8×.",
          "ask": {
            "q": "Layout B ko Pune ke ids har shard ko kyun bhejne pade?",
            "choices": [
              "User ke saare orders user ke shard par hon, aisi koi guarantee nahi; orders kahin bhi",
              "SQLite ek shard par JOIN nahi chalata jab table mein 1 lakh se zyada rows ho",
              "Pune ke users sirf ek shard par hain, isliye baaki shards ko Pune users ki list chahiye thi"
            ],
            "answer": 0,
            "hint": "Layout B mein ek user ke orders kitne shards par hain?",
            "explain": "Layout B mein order apne order id se shard hota hai, user apne user id se. Kuch orders sanyog se user ke shard par hain, baaki kahin bhi. Pune ke user ka order kisi bhi shard par ho sakta hai, toh har shard ko poori Pune list chahiye. Layout A mein user aur user ke orders ek shard par: join local, koi list nahi bhejni.",
            "choiceExplanations": [
              "Layout B mein order apne order id se shard hota hai, user apne user id se. Kuch orders sanyog se user ke shard par hain, baaki kahin bhi. Pune ke user ka order kisi bhi shard par ho sakta hai, toh har shard ko poori Pune list chahiye. Layout A mein user aur user ke orders ek shard par: join local, koi list nahi bhejni.",
              "Layout A mein same SQLite join har shard par chala.",
              "Users mix32(user_id) % 4 se chaaron shards par bikhre hain."
            ]
          }
        },
        {
          "title": "3. Paisa transfer, beech mein crash",
          "say": "2,000 transfers (₹1), 2% par crash ka model: ek shard par SQL error (asli ROLLBACK), do shards par debit ke baad credit chhod do. Process sach mein nahi marta. Ek shard par: debit + credit ek transaction (498 transfers, 9 crash) → SQL error par asli ROLLBACK, kuch nahi bigda. Do shards par: do alag commits (1,502 transfers, 38 crash) → debit hua, credit nahi: <b>₹38 gayab</b>.",
          "ask": {
            "q": "Do shards ke beech transfer ko safe karne ka sabse seedha raasta?",
            "choices": [
              "Dono wallets ek shard par (jaise family id), ya distributed transaction / 2PC",
              "Har transfer ko do baar chalao — ek baar fail ho toh doosri baar paisa pahunch jaayega",
              "Debit ko credit ke baad chalao — tab crash par paisa banega, gayab nahi hoga"
            ],
            "answer": 0,
            "hint": "Ek shard par transfer safe kyun tha?",
            "explain": "Ek shard par ek transaction: sab ya kuch nahi. Do shards par do commits, beech mein crash = aadha kaam. Turant sab-ya-kuch-nahi ke raaste: saath rakho (shard key aisi ki dono rows ek shard par), ya 2PC (do-phase commit: dono shards pehle vaada, phir commit — mehnga, coordinator chahiye). Saga alag cheez hai: steps alag commit hote hain aur galti par ulta step (idempotent, durable retries ke saath) baad mein hisaab theek karta hai; beech ki adhuri haalat dikh sakti hai.",
            "choiceExplanations": [
              "Ek shard par ek transaction: sab ya kuch nahi. Do shards par do commits, beech mein crash = aadha kaam. Turant sab-ya-kuch-nahi ke raaste: saath rakho (shard key aisi ki dono rows ek shard par), ya 2PC (do-phase commit: dono shards pehle vaada, phir commit — mehnga, coordinator chahiye). Saga alag cheez hai: steps alag commit hote hain aur galti par ulta step (idempotent, durable retries ke saath) baad mein hisaab theek karta hai; beech ki adhuri haalat dikh sakti hai.",
              "Do baar chalane se kabhi do debit ho jaayenge; bina idempotency ke aur bigdega.",
              "Kram ulta karne se crash par paisa banta hai — galti ki disha badli, galti nahi gayi."
            ]
          }
        }
      ]
    },
    {
      "type": "cards",
      "title": "🛑 Shard karne se pehle",
      "goal": "Video ka aakhri sabak: sharding zaroori buraai hai. Shards ke baad: cross-shard joins aur transactions mushkil, har shard ka alag backup, aur har badlaav (shard jodna, key badalna) ek migration.",
      "lesson": "Pehle sasti cheezein: purana data hatao, queries aur indexes theek karo, cache, read replicas, bada server. Sharding tab jab writes ya data ek machine ki had paar kar jaayein — aur shard key sawaalon se chuno.",
      "steps": [
        {
          "title": "1. Pehle sasti cheezein jaancho",
          "say": "<b>Purana data hata sakte hain?</b> (archive) · <b>Dheemi query ka index?</b> · <b>Cache?</b> (reads ke liye) · <b>Read replicas?</b> (reads baanto; writes nahi) · <b>Bada server?</b> AWS par 32 TiB RAM wali machines bhi hain. · <b>Ek hi DB mein partitioning?</b> (purani partition drop karna sasta).",
          "ask": {
            "q": "Dashboard dheema hai: 95% reads, writes kam, data 800 GB. Pehla kadam?",
            "choices": [
              "Dheemi queries ka plan dekho aur index/cache/read replica — writes ki samasya hi nahi",
              "Abhi 16 shards bana lo — aage chalke data badhega, tab migration aur mushkil hogi",
              "Database badal ke NoSQL lo — NoSQL apne aap shard hota hai, toh kabhi dheema nahi hoga"
            ],
            "answer": 0,
            "hint": "Bojh reads ka hai ya writes ka? Sharding kis cheez ko baant'ti hai?",
            "explain": "Bojh reads ka hai. Reads ke liye sasti cheezein pehle: query plan, index, cache, read replicas. Sharding writes aur data ko baant'ti hai — aur saath mein cross-shard joins, transactions aur migrations ka kharcha laati hai. Sirf 800 GB se faisla nahi hota: query plan, working set, write rate aur latency naapo; writes kam hain, toh sharding abhi zaroori nahi lagti.",
            "choiceExplanations": [
              "Bojh reads ka hai. Reads ke liye sasti cheezein pehle: query plan, index, cache, read replicas. Sharding writes aur data ko baant'ti hai — aur saath mein cross-shard joins, transactions aur migrations ka kharcha laati hai. Sirf 800 GB se faisla nahi hota: query plan, working set, write rate aur latency naapo; writes kam hain, toh sharding abhi zaroori nahi lagti.",
              "Bina zaroorat 16 shards = abhi se har feature mein scatter-gather aur cross-shard dard.",
              "Engine badalne se access pattern nahi badalta; NoSQL mein bhi hot key aur scatter-gather hote hain."
            ]
          }
        },
        {
          "title": "2. Sharding ka bill",
          "say": "Shards ke baad: cross-shard join app mein (ex4 Q1: 5 calls vs 1) · cross-shard transaction ke liye 2PC (mehnga) ya saga (baad mein hisaab theek; beech mein adhuri haalat dikhti hai) (ex4: ₹38 gayab) · har shard ka alag backup aur restore · shard jodna = keys ki copy (ex0) · shard key badalna = poori migration (ex5)."
        },
        {
          "title": "3. Kab sach mein shard karo",
          "say": "Jab <b>writes</b> ya <b>data</b> sabse badi sensible machine se aage nikal jaayein, ya ek machine ka fail hona bahut bada blast radius ho. Tab shard key sabse zyada aane wale sawaal se chuno, related rows ko ek key par saath rakho (co-location), aur migration ke liye version + tombstone + poora compare taiyaar rakho.",
          "ask": {
            "q": "Write-heavy IoT app: 2 lakh devices, har second readings, ek Postgres ki disk aur WAL ki had aa gayi. Shard key?",
            "choices": [
              "device_id ka hash — writes baante; ek device ki readings ek shard par, device ke sawaal ek shard tak",
              "Reading ka samay — har ghante ka data ek shard par, purane ghante sasti machines par chale jaayenge",
              "Abhi shard mat karo — read replicas lagao, replicas writes ka bojh bhi baant lete hain"
            ],
            "answer": 0,
            "hint": "Bojh writes ka hai. Read replicas writes baant'te hain? Samay key par aaj ke writes kahan jaayenge?",
            "explain": "Bojh writes ka hai, aur ek machine ki had aa gayi — sharding ka asli case. device_id ka hash writes baant'ta hai (ex1 hash layout), aur \"ek device ka graph\" jaisa sawaal ek shard par rukta hai. Samay key par har ghante ke saare writes ek shard par (ex1: April 97%). Read replicas har write khud bhi likhte hain; writes nahi baant'te.",
            "choiceExplanations": [
              "Bojh writes ka hai, aur ek machine ki had aa gayi — sharding ka asli case. device_id ka hash writes baant'ta hai (ex1 hash layout), aur \"ek device ka graph\" jaisa sawaal ek shard par rukta hai. Samay key par har ghante ke saare writes ek shard par (ex1: April 97%). Read replicas har write khud bhi likhte hain; writes nahi baant'te.",
              "Samay key par har ghante ke saare writes ek shard par: hot tail.",
              "Har replica primary ke saare writes dohraata hai; write ka bojh nahi bant'ta."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Co-location aur backfill race",
      "project": "57-sharding",
      "exercise": "ex5-backfill",
      "goal": "ex4: 4 shards, orders saath vs bikhre; bina shard key ka sawaal; transfer crash. ex5: purana DB → 4 shards, 4 likhne ke tareeke, 1% dual write fail, sample, repair.",
      "why": "Node 24+ chahiye. ex4 ka samay machine ke saath badlega; ex5 ki ginti har run same (seeded).",
      "steps": [
        {
          "text": "Lab folder se: co-location.",
          "cmd": "cd docker-labs/57-sharding && npm start -- ex4-colocate",
          "expect": "1,00,000 users, 5,00,000 orders, 4 shards. Users hamesha mix32(user_id) % 4 par.\n\nQ1. Ek user + user ke 5 orders, 500 users\n  layout A  shard calls 1   join shard ke andar (SQL)   shards ka op-samay  17 µs   median 68 µs   p99 212 µs\n  layout B  shard calls 5   join app mein (JS)          shards ka op-samay  79 µs   median 140 µs   p99 386 µs\n  user 777: dono layouts ka jawab ek jaisa? haan\n\nQ2. \"Pune ke users ke kitne biryani orders?\" — shard key sawaal mein nahi, dono layouts chaaron shards se poochte hain\n  layout A  19797 orders   shard calls 4   har shard apne andar join   bheje gaye ids 0        7.7 ms   shards ka op-samay 28.2 ms\n  layout B  19797 orders   shard calls 8   pehle Pune ids, phir har shard ko list   bheje gaye ids 79,872   27.3 ms   shards ka op-samay 75.9 ms\n\nTransfer: 2,000 baar ₹1 ek user se dusre ko; 2% baar app beech mein crash\n  ek hi shard par: 498 transfers, 9 crash → ek transaction, crash par dono steps wapas\n  do shards par:   1502 transfers, 38 crash → do alag commits, crash ke baad sirf debit hua\n  kul paisa pehle ₹1,00,00,000, baad mein ₹99,99,962 → ₹38 gayab"
        },
        {
          "text": "Backfill race.",
          "cmd": "npm start -- ex5-backfill",
          "expect": "\nA. Sirf race (dual write kabhi fail nahi)\n   20,000 rows · backfill ke dauraan live: 4,185 update, 1,212 delete, 603 naye\n   backfill kaise likhta hai     backfill ke baad: gayab  purani  zinda-hui    1000 ka sample   dobara backfill     + ulta sweep\n   overwrite                                   0     98      30        3 pakde ( 1%: 0)    30 galat            0 galat\n   if-absent                                   0      0      30        0 pakde (100%: 0)    30 galat            0 galat\n   version                                     0      0      30        0 pakde (100%: 0)    30 galat            0 galat\n   version+tombstone                           0      0       0        0 pakde (100%: 0)     0 galat            0 galat\n\nB. Race + dual write 1% baar fail (log hua, dobara nahi bheja)\n   20,000 rows · backfill ke dauraan live: 4,185 update, 1,212 delete, 603 naye · dual write fail: 55\n   backfill kaise likhta hai     backfill ke baad: gayab  purani  zinda-hui    1000 ka sample   dobara backfill     + ulta sweep\n   overwrite                                   5    120      34        4 pakde ( 0%: 0)    34 galat            0 galat\n   if-absent                                   5     22      34        1 pakde (25%: 0)    56 galat           22 galat\n   version                                     5     22      34        1 pakde (25%: 0)    34 galat            0 galat\n   version+tombstone                           5     22       7        1 pakde (25%: 0)     7 galat            0 galat\n\ngayab = purane mein hai, naye mein nahi · purani = naye mein purana version · zinda-hui = purane se delete, naye mein zinda\n\"(x%: 0)\" = itne % chance ki 1000 ka random sample ek bhi galti na pakde (gayab + purani rows ke hisaab se)\nsample sirf PURANE DB ke ids se chunta hai, isliye sample ko \"zinda-hui\" rows kabhi nahi dikhti. Zinda-hui rows ke liye ulta sweep chahiye."
        }
      ],
      "observe": {
        "q": "ex5 B mein if-absent tareeke ke repair ke baad bhi 22 galat bache. Version tareeke mein 0. Farq kya hai?",
        "choices": [
          "Un 22 ids ki row naye shard mein thi par purani; insert-if-absent maujood row ko chhoota hi nahi",
          "if-absent tareeka deletes ko tombstone mein badal deta hai, isliye 22 rows chhupi reh gayi",
          "Repair sirf version tareeke ke liye chala; if-absent ka repair lab ne chhod diya"
        ],
        "answer": 0,
        "hint": "INSERT OR IGNORE kab kuch nahi karta?",
        "explain": "22 bachi rows ke update dual write mein fail hue the: naye shard mein row thi, par purana version. Repair ka backfill <code>INSERT OR IGNORE</code> se likhta hai — row maujood hai, toh ignore. Version tareeka <code>WHERE excluded.version &gt; version</code> se naya version likh deta hai. Isliye repair ke liye version check chahiye, sirf \"na ho toh daalo\" nahi.",
        "choiceExplanations": [
          "22 bachi rows ke update dual write mein fail hue the: naye shard mein row thi, par purana version. Repair ka backfill <code>INSERT OR IGNORE</code> se likhta hai — row maujood hai, toh ignore. Version tareeka <code>WHERE excluded.version &gt; version</code> se naya version likh deta hai. Isliye repair ke liye version check chahiye, sirf \"na ho toh daalo\" nahi.",
          "Tombstone sirf version+tombstone tareeke mein hai.",
          "Repair chaaron tareekon par chala; table ka aakhri column dekho."
        ]
      },
      "lesson": "Saath rakho toh join aur transaction shard ke andar. Backfill race: version check + tombstone. Sample se andaaza, saboot nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — migration aur co-location",
    "instructions": "Pehle socho: sach kahan hai, aur beech mein koi write aaye toh kya hoga? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Postgres (5 TB) se sharded cluster par jaana hai, bina downtime. Team ka plan: \"dual write (fail ho toh log karo), backfill, 1% sample check, switch\". Tumhara sudhaar?",
        "choices": [
          "Durable replay (CDC ya outbox), versioned upsert + tombstones, aur poora dono-taraf compare",
          "Sample 1% se 10% kar do — bade sample se saari galtiyan pakdi jaayengi, baaki plan theek hai",
          "Backfill pehle, dual write baad mein — tab backfill aur live writes kabhi nahi takraayenge",
          "Maintenance window lo — online migration hamesha data kho deti hai, koi aur raasta nahi"
        ],
        "answer": 0,
        "explain": "Fail hua dual write \"log\" se theek nahi hota (ex5 B: 55 fail → 5 gayab + 22 purani). Durable log (CDC/outbox) har write dobara chalata hai. Backfill ka likhna atomic version check se, deletes tombstone se. Sample andaaza hai (25% chance ki 27 galat rows mein se kuch na mile) — cutover se pehle poora compare dono taraf.",
        "choiceExplanations": [
          "Fail hua dual write \"log\" se theek nahi hota (ex5 B: 55 fail → 5 gayab + 22 purani). Durable log (CDC/outbox) har write dobara chalata hai. Backfill ka likhna atomic version check se, deletes tombstone se. Sample andaaza hai (25% chance ki 27 galat rows mein se kuch na mile) — cutover se pehle poora compare dono taraf.",
          "Bada sample bhi zinda-hui rows nahi dekhta, kyunki ids purane DB se aate hain.",
          "Backfill ke baad dual write shuru = backfill ke dauraan ke writes kabhi naye mein nahi pahunche.",
          "Online migration sahi niyamon ke saath chalti hai (Stripe ka 4-phase pattern)."
        ]
      },
      {
        "q": "E-commerce (kalpanik): zyadatar traffic ek hi desh se, har request mein user_id hai. Sabse zyada sawaal \"ek user ke orders + payments\". Shard key?",
        "choices": [
          "user_id teeno tables mein — ek user ka sab ek shard par; join aur transaction shard ke andar",
          "order_id orders ke liye, payment_id payments ke liye — har table apni key se barabar baant'ti hai",
          "Order ki date — har mahine ka data ek shard par, purane mahine sasti machines par",
          "Country — har desh ka data alag shard par, taaki sab users paas wale shard par ho"
        ],
        "answer": 0,
        "explain": "Sabse zyada aane wala sawaal user ke andar hai. Teeno tables ko user_id par shard karo (co-location): ek call, local join, ek transaction. Lab ex4: co-located 1 call vs bikhra hua 5 calls, kaam ~4.5×; bina shard key ke sawaal (Q2) mein bikhre layout ne ~80,000 ids bheje.",
        "choiceExplanations": [
          "Sabse zyada aane wala sawaal user ke andar hai. Teeno tables ko user_id par shard karo (co-location): ek call, local join, ek transaction. Lab ex4: co-located 1 call vs bikhra hua 5 calls, kaam ~4.5×; bina shard key ke sawaal (Q2) mein bikhre layout ne ~80,000 ids bheje.",
          "Alag keys = ek user ke orders har shard par; har page scatter-gather.",
          "Date key = aaj ke saare writes ek shard par (hot tail, ex1).",
          "Is app mein zyadatar traffic ek desh se hai: country key us desh ki saari bheed ek shard par rakhegi."
        ]
      }
    ]
  },
  "success": [
    "Co-location ka faayda lab ke numbers se bata sakte ho",
    "Backfill race aur zinda-hui rows ka ilaaj samjha sakte ho",
    "Sharding se pehle ke sasti raaste gin sakte ho"
  ],
  "cards": [
    {
      "front": "Backfill race ka ilaaj?",
      "back": "Atomic version check (ON CONFLICT … WHERE excluded.version > version) + delete ke liye tombstone. Lab 57 ex5: overwrite 98 purani + 30 zinda-hui; version 30 zinda-hui; version + tombstone 0."
    },
    {
      "front": "Sample check kitna bharosemand?",
      "back": "Andaaza, saboot nahi. Lab 57 ex5 B: 27 galat rows par 1000 ka sample 25% baar kuch nahi pakadta; purane DB se chuna sample zinda-hui rows dekhta hi nahi."
    },
    {
      "front": "Co-location?",
      "back": "Saath padhe jaane wale rows ek shard key par (user_id). Lab 57 ex4: 1 call vs 5, kaam ~4.5×; shards ke beech transfer crash = ₹38 gayab, ek shard par ROLLBACK."
    }
  ]
}
]);
})();
