/* First Principles — FAANG Senior Engineer.
   Source credit: How to Build Instagram from Scratch (ozWW5nIdzQM), numbered video 15/15.
   Evidence: docker-labs/65-instagram/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "arr", "icon": "❤️", "label": "Likes", "x": 140, "y": 120}, {"id": "pool", "icon": "🖥️", "label": "Worker pool", "x": 470, "y": 210}, {"id": "store", "icon": "🔒", "label": "Store", "x": 800, "y": 120}, {"id": "feed", "icon": "📰", "label": "Feed", "x": 140, "y": 320}];
const EDGES = [{"from": "arr", "to": "pool"}, {"from": "feed", "to": "pool"}, {"from": "pool", "to": "store"}];
VISUALS["fp-ig-code"] = { t: "Raftaar aamad se kam → line → saanjha pool bhara → baaki app fail.", html: SD.viz.svg(HERO, EDGES, { nodes: { arr: {tone:'busy',badge:'10/ms'}, pool: {tone:'bad',badge:'2,000'}, store: {tone:'bad',badge:'perMs'}, feed: {tone:'busy',badge:'20/ms'} } }, {w:900,h:420}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-ig-code",
  "icon": "⏱️",
  "group": "📸 Instagram: Sab Jodkar",
  "title": "Instagram 3 · Code — viral photo aur hedge ka hisaab",
  "badge": "Model Ka Paarkhi",
  "objectives": [
    "viral() ke teen rishte: raftaar, aamad, saanjha pool",
    "page() mein hedge ka intezaar, juda jhatka aur extra load",
    "Model ke numbers ko code ki line tak le jaana"
  ],
  "lesson": [
    "<h3>🚕 Taxi stand</h3><p>Stand par 2,000 taxis. Ek VIP hotel ke gate par sabko lambi line mein lagna padta hai — gate ek baar mein ek gaadi. Taxis line mein phansi, toh station ke yatriyon ko taxi hi nahi milti.</p><p>Aur jaldi pahunchna ho toh doosri taxi bhi bula lo — par tabhi faayda jab doosri usi jam mein na phansi ho. Aaj in dono baaton ka code padhte hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "⏱️ likes.js: ek-ek millisecond, ek viral photo",
      "goal": "lib/likes.js viral() (model): har millisecond likes aate hain, store kuch nipta-ta hai, aur feed requests bhi usi saanjhe worker pool se worker maangti hain. Kaun pehle worker le — model ki ek setting.",
      "code": {
        "title": "lib/likes.js",
        "file": "docker-labs/65-instagram/lib/likes.js",
        "from": 10,
        "text": "function viral({ perMs, seconds = 10, likesPerS = 10000, feedsPerS = 20000, feedMs = 20, workers = 2000, timeoutMs = 5000, admit = 'likes-first' } = {}) {\n  const queue = [];                    // arrival ms of waiting likes (FIFO)\n  let head = 0, ok = 0, timedOut = 0, noWorker = 0, maxWait = 0, feedOk = 0, feedFail = 0, firstFeedFail = null, total = 0;\n  const feedBusy = new Int32Array(seconds * 1000 + feedMs + 1);  // feed workers that free up at each ms\n  let feedsActive = 0, likeCarry = 0, feedCarry = 0;\n  const free = () => queue.length - head + feedsActive < workers;\n  const like = t => { total++; if (free()) queue.push(t); else noWorker++; };      // no worker free: the like fails at once\n  const feed = t => { if (free()) { feedsActive++; feedBusy[t + feedMs]++; feedOk++; } else { feedFail++; if (firstFeedFail === null) firstFeedFail = t; } };\n  for (let t = 0; t < seconds * 1000; t++) {\n    feedsActive -= feedBusy[t];\n    while (head < queue.length && t - queue[head] >= timeoutMs) { head++; timedOut++; }\n    for (let k = 0; k < perMs && head < queue.length; k++) { maxWait = Math.max(maxWait, t - queue[head]); head++; ok++; }\n    likeCarry += likesPerS / 1000; feedCarry += feedsPerS / 1000;\n    const L = Math.floor(likeCarry), F = Math.floor(feedCarry); likeCarry -= L; feedCarry -= F;\n    if (admit === 'likes-first') { for (let i = 0; i < L; i++) like(t); for (let i = 0; i < F; i++) feed(t); }\n    else if (admit === 'feeds-first') { for (let i = 0; i < F; i++) feed(t); for (let i = 0; i < L; i++) like(t); }\n    else for (let l = 0, f = 0; l < L || f < F;) { if (f >= F || (l < L && l * F <= f * L)) { like(t); l++; } else { feed(t); f++; } }\n  }\n  return { total, ok, timedOut, noWorker, waiting: queue.length - head, maxWaitMs: maxWait, feedOk, feedFail, firstFeedFailMs: firstFeedFail };\n}"
      },
      "vars": [
        {
          "id": "part",
          "label": "Hissa"
        },
        {
          "id": "what",
          "label": "Kya hota"
        }
      ],
      "steps": [
        {
          "title": "1. Saanjha pool",
          "say": "Line 15: worker khaali tab, jab line mein khade likes + chalti feeds 2,000 se kam hon. Line 16: like ko worker na mile toh turant fail (noWorker). Line 17: feed ko na mile toh feed fail.",
          "line": "15-17",
          "vars": {
            "part": "pool",
            "what": "likes + feeds < workers"
          }
        },
        {
          "title": "2. Ghadi aur timeout",
          "say": "Line 18: 10 second = 10,000 kadam, har kadam ek millisecond. Line 19: 20 ms poore karne wali feed requests ke workers khaali. Line 20: 5 s se line mein khada like chhod do (timedOut).",
          "line": "18-20",
          "vars": {
            "part": "ghadi",
            "what": "1 ms ka kadam, 5 s timeout"
          }
        },
        {
          "title": "3. Store ki raftaar",
          "say": "Line 21: store har millisecond <code>perMs</code> likes nipta-ta hai. Ek row ka lock: 1/ms. 100 counter rows + 100 connections: 100/ms.",
          "line": "21",
          "vars": {
            "part": "store",
            "what": "perMs"
          },
          "ask": {
            "q": "Ek row aur 100 rows ke beech model mein asal farq kis line ka hai?",
            "choices": [
              "Line 21: har millisecond kitne likes nipte — 1 ya 100 (perMs)",
              "Line 15: worker ki ginti — 100 rows par zyada workers milte",
              "Line 20: timeout — 100 rows par timeout lamba ho jaata hai"
            ],
            "answer": 0,
            "hint": "Dono runs mein kaunsa parameter badla gaya?",
            "explain": "Sirf perMs badla (1 → 100). Workers (2,000) aur timeout (5 s) dono runs mein same. Store ki raftaar likes ki aamad (10/ms) se kam ho toh line badhti hai aur workers bharte hain; zyada ho toh line banti hi nahi.",
            "choiceExplanations": [
              "Sirf perMs badla (1 → 100). Workers (2,000) aur timeout (5 s) dono runs mein same. Store ki raftaar likes ki aamad (10/ms) se kam ho toh line badhti hai aur workers bharte hain; zyada ho toh line banti hi nahi.",
              "Workers dono runs mein 2,000 hain.",
              "Timeout dono mein 5 s."
            ]
          }
        },
        {
          "title": "4. Kaun pehle worker le",
          "say": "Line 22–23: is millisecond ke 10 likes aur 20 feeds. Line 24–26: <code>admit</code> tay karta hai kram — likes pehle, feed pehle, ya baari-baari. Lab: likes pehle → 1,96,188 feed fail; feed pehle → 0 (likes turant mana); baari-baari → 1,76,186.",
          "line": "22-26",
          "vars": {
            "part": "admission",
            "what": "kram = niyam"
          },
          "ask": {
            "q": "Garam row same, workers same — sirf kram badla aur feed fail 1,96,188 se 0. Is se kya seekh?",
            "choices": [
              "Row ki raftaar ek baat; baaki app ka girna pool ke niyam par tika",
              "Model galat hai — kram se nateeja nahi badalna chahiye tha",
              "Feed pehle rakhne se garam row ki raftaar 10 guna ho gayi"
            ],
            "answer": 0,
            "hint": "Dono runs mein kitne likes hue?",
            "explain": "Dono mein 9,999 likes hue — garam row ki raftaar same. Badla sirf khaali worker ka pehla haqdaar. Saanjha pool ek photo ki dikkat ko poori app mein faila sakta hai; likes ko alag pool (bulkhead) do, aur asli ilaaj store ki raftaar badhana.",
            "choiceExplanations": [
              "Dono mein 9,999 likes hue — garam row ki raftaar same. Badla sirf khaali worker ka pehla haqdaar. Saanjha pool ek photo ki dikkat ko poori app mein faila sakta hai; likes ko alag pool (bulkhead) do, aur asli ilaaj store ki raftaar badhana.",
              "Model ka nateeja niyam par tika hai — seekh bhi niyam ki hai.",
              "Likes dono runs mein 9,999 hi hue."
            ]
          }
        }
      ],
      "lesson": "Teen cheezein: store ki raftaar (line 21), aamad (line 22), aur saanjha worker pool ka niyam (line 15, 24–26). Raftaar aamad se kam → line; line pool bhare ya nahi aur kaun bhooka rahe, pool ka niyam tay karta hai. Model hai, par same rishta asli systems mein dikhta hai."
    },
    {
      "type": "dryrun",
      "title": "🏎️ global.js: 100 shards, ek page, aur hedge",
      "goal": "lib/global.js page() (seeded model): page ko 100 shards ka jawab chahiye. Har shard median 10 ms, 1% chance 200 ms ka jhatka.",
      "code": {
        "title": "lib/global.js",
        "file": "docker-labs/65-instagram/lib/global.js",
        "from": 15,
        "text": "function page({ shards = 100, pages = 20000, hedgeAfterMs = null, correlated = 0, seed = 21 } = {}) {\n  const r = rng(seed), out = []; let sent = 0;\n  for (let p = 0; p < pages; p++) {\n    let worst = 0;\n    for (let s = 0; s < shards; s++) {\n      const prim = shardLatency(r).ms; let t = prim; sent++;\n      if (hedgeAfterMs !== null && prim > hedgeAfterMs) {\n        sent++;\n        let rep = shardLatency(r).ms;\n        if (prim > 100 && r() < correlated) rep = Math.max(rep, prim);       // the replica shares the slow cause\n        t = Math.min(prim, hedgeAfterMs + rep);\n      }\n      worst = Math.max(worst, t);\n    }\n    out.push(worst);\n  }\n  return { p50: percentile(out, 50), p99: percentile(out, 99), slowPages: out.filter(x => x > 100).length / pages, extraLoad: sent / (shards * pages) - 1 };\n}"
      },
      "vars": [
        {
          "id": "part",
          "label": "Hissa"
        },
        {
          "id": "what",
          "label": "Kya hota"
        }
      ],
      "steps": [
        {
          "title": "1. Ek page",
          "say": "Line 19–20: 100 shards, har ek ki latency. Line 27: page utna hi tez jitna sabse dheema shard. Hedge ke bina: 63.25% pages 100 ms se dheeme (1 − 0.99¹⁰⁰).",
          "line": "19-20",
          "vars": {
            "part": "page",
            "what": "max of 100"
          }
        },
        {
          "title": "2. Hedge",
          "say": "Line 21–25: primary 20 ms mein na aaye toh replica se bhi poochho; jawab = jo pehle aaye: min(primary, 20 + replica).",
          "line": "21-25",
          "vars": {
            "part": "hedge",
            "what": "20 ms baad replica"
          },
          "ask": {
            "q": "Line 25 mein replica ke samay mein 20 kyun joda?",
            "choices": [
              "Replica ko request 20 ms baad hi bheji gayi thi",
              "Replica hamesha primary se 20 ms dheema hota hai",
              "20 ms network ka kiraya hai jo har request mein lagta hai"
            ],
            "answer": 0,
            "hint": "Hedge kab bheja jaata hai?",
            "explain": "Hedge tab jaata hai jab primary 20 ms tak na aaye. Toh replica ka jawab 20 ms + replica ki apni latency par aata hai. Isliye hedge ke saath page ka p50 ~30 ms ho jaata hai: 100 shards mein lagbhag hamesha koi na koi 20 ms paar karta hai.",
            "choiceExplanations": [
              "Hedge tab jaata hai jab primary 20 ms tak na aaye. Toh replica ka jawab 20 ms + replica ki apni latency par aata hai. Isliye hedge ke saath page ka p50 ~30 ms ho jaata hai: 100 shards mein lagbhag hamesha koi na koi 20 ms paar karta hai.",
              "Replica bhi same distribution se aata hai — dheema nahi.",
              "Network ka samay latency ke andar hi hai; 20 intezaar ka hai."
            ]
          }
        },
        {
          "title": "3. Juda jhatka",
          "say": "Line 24: <code>correlated</code> — jhatke ka kaaran replica par bhi ho (same hot partition, same buri query). 0.5 par 39.91% pages dheeme; 1 par 63.75% — hedge bekaar.",
          "line": "24",
          "vars": {
            "part": "correlated",
            "what": "replica bhi dheema"
          }
        },
        {
          "title": "4. Keemat",
          "say": "Line 22: har hedge ek extra request (sent++). Line 31: extraLoad = 5.1% — sirf jo 20 ms paar kare unhi par.",
          "line": "22",
          "vars": {
            "part": "extra load",
            "what": "5.1%"
          }
        }
      ],
      "lesson": "Hedge = thoda intezaar, phir doosra raasta. Kaam tab karta hai jab doosre raaste ka jhatka alag ho. Keemat: kuch % extra requests aur har page par hedge ki deri."
    },
    {
      "type": "docker",
      "title": "🧪 Duniya bhar ke model chalao",
      "project": "65-instagram",
      "exercise": "ex4-global",
      "goal": "Hedging, quorum write aur conflicts; phir lab ke tests.",
      "why": "Node 24+ chahiye. Seeded model aur asli merge code — har baar same output.",
      "steps": [
        {
          "text": "Hedging, quorum, conflicts.",
          "cmd": "cd docker-labs/65-instagram && npm start -- ex4-global",
          "expect": "ex4 — duniya bhar mein (hedging: seeded model; RTT maane hue; conflicts: asli merge code)\n\n1) Ek page = 100 shards se jawab (sab chahiye). Har shard: median 10 ms, p95 ~20 ms, 1% chance 200 ms ka jhatka. 20,000 pages:\n   tareeka                                          page p50    page p99    100 ms se dheeme pages    extra requests\n   hedge nahi                                        208.3 ms    225.3 ms                   63.25%            0.0%\n   20 ms baad replica se bhi poochho (jhatke aazaad)   29.8 ms    204.8 ms                    1.03%            5.1%\n     … par aadhe jhatkon ka kaaran replica par bhi    32.6 ms    222.7 ms                   39.91%            5.1%\n     … har jhatka replica par bhi                    208.3 ms    225.2 ms                   63.75%            5.1%\n   Video: (1%)² → \"0.001 ya 0.01%\" — sahi 0.0001 = 0.01%; 100 shards par 1 − 0.9999¹⁰⁰ = 0.995% — model se mel.\n   → Hedge ~5% extra requests mein 200 ms ke jhatke kaat deta hai — par tabhi jab replica ka jhatka alag ho. Saath hi page ka p50\n     ~30 ms ho jaata hai: 100 shards mein lagbhag hamesha koi na koi 20 ms paar karta hai, aur hedge 20 ms ke baad hi jaata hai.\n     Replica thoda purana data de sakta hai (replication lag); jo request dobara chalna safe nahi, use hedge mat karo.\n\n2) Strongly consistent write (Spanner jaisa, ek Paxos group): majority ka \"haan\" + commit wait (~2ε, Paxos ke saath-saath).\n   TrueTime [now − ε, now + ε] deta hai; ε = 7 ms maano toh commit wait ~14 ms — ε khud nahi, interval ki poori chaudai.\n   Maane hue round trips: Tokyo↔Virginia ~150 ms, Tokyo↔Frankfurt ~230 ms. Leader Tokyo, 3 voting regions:\n   write ≈ 150 ms (sabse paas wale doosre region ka round trip) — video ka \"sirf 7 ms\" nahi.\n   Regions paas-paas (round trip 2–3 ms): write ≈ 14 ms — tab commit wait (2ε) hi bada hissa.\n   (Disk, CPU aur kai Paxos groups wale transaction ka kharcha is hisaab mein nahi.)\n   Async replication (video ka AP raasta): local commit ~5 ms, baaki regions baad mein.\n   → Spanner ka synchronous Paxos cross-region round trip deta hai; TrueTime ka commit wait us ke saath-saath chalta hai. Isliye asli setups\n     voting replicas ek-do paas ke regions mein rakhte hain. Lock-free snapshot reads local ho sakte hain jab replica utna up-to-date ho.\n\n3) Ek business profile, do regions, lagbhag ek saath (Tokyo ki ghadi 5 ms aage — maana):\n   alag field — bio (Tokyo), phone (Paris):\n     poori row, LWW (video ka model): bio \"hello Asia\", phone \"+33 111\" → Paris ka phone gaya\n     har column ka LWW (Cassandra aise karta hai): bio \"hello Asia\", phone \"+33 222\" → dono bache\n   same field — Tokyo \"hello Asia\" (asli 1000), Paris \"bonjour\" (asli 1003, yaani baad mein):\n     LWW: \"hello Asia\" jeeta — ghadi 5 ms aage thi, isliye pehle wala jeet gaya\n     vector clock: Tokyo {tokyo:1} vs Paris {paris:1} → saath-saath hue (concurrent) → dono rakho, app ya user tay kare\n     baad ka edit jisne pehla dekha tha: {tokyo:1, paris:1} vs {tokyo:1} → pehla naya (doosre ko dekh chuka)\n   barabar timestamp (1000 = 1000): A pehle aaye toh \"A\", B pehle aaye toh \"A\" — writer id se tay, har replica par same\n   → LWW ka nuksaan poori row par lagao toh zyada; Cassandra column-level hai. Ghadi ka farq jeet tay kar deta hai,\n     aur barabar timestamp par ek pakka niyam chahiye (lab: writer id; Cassandra: value ki tulna) — warna replicas alag rahenge.\n     Vector clock \"saath-saath hua\" pakad leta hai; merge phir bhi kisi ko likhna padta hai (likes jaise counter ke liye G-Counter, ex2)."
        },
        {
          "text": "Lab ke 6 tests.",
          "cmd": "npm test",
          "expect": "✔ ex0: budget sheet arithmetic (1.202238ms)\n✔ ex1: presigned upload, resume, orphan sweep, tampering (real HTTP) (69.154859ms)\n✔ ex2: hot row vs counter rows, retries, region counters (197.986387ms)\n✔ ex3: feed model calibration and hybrid trade (88.390442ms)\n✔ ex4: hedging, quorum write, conflicts (333.738198ms)\n✔ ex5: blast radius and crypto-shredding (3.498699ms)\nℹ tests 6\nℹ suites 0\nℹ pass 6\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 1344.633396"
        }
      ],
      "observe": {
        "q": "Page p50: bina hedge 208.3 ms, hedge ke saath 29.8 ms. Par ek shard ka median 10 ms — page ~30 ms kyun?",
        "choices": [
          "Lagbhag har page mein koi shard 20 ms paar karta, phir hedge ka intezaar",
          "Hedge ki extra requests se shards dheeme ho gaye, isliye page dheema",
          "Model galat hai — hedge ke saath page 10 ms par aana chahiye tha"
        ],
        "answer": 0,
        "hint": "100 shards mein se kam se kam ek ke 20 ms (p95) paar karne ka chance?",
        "explain": "Har shard 5% chance se 20 ms paar karta hai; 100 shards mein 1 − 0.95¹⁰⁰ ≈ 99.4% pages mein kam se kam ek. Us shard ka jawab 20 ms + replica ki latency par aata hai, toh page ka median ~30 ms. Page ek shard nahi, 100 shards ka sabse dheema hai — bina hedge 208.3 ms (lagbhag har page mein ek 200 ms jhatka), hedge ke saath 29.8 ms.",
        "choiceExplanations": [
          "Har shard 5% chance se 20 ms paar karta hai; 100 shards mein 1 − 0.95¹⁰⁰ ≈ 99.4% pages mein kam se kam ek. Us shard ka jawab 20 ms + replica ki latency par aata hai, toh page ka median ~30 ms. Page ek shard nahi, 100 shards ka sabse dheema hai — bina hedge 208.3 ms (lagbhag har page mein ek 200 ms jhatka), hedge ke saath 29.8 ms.",
          "Model mein extra requests kisi shard ko dheema nahi karti.",
          "Page ka 10 ms tabhi jab koi shard 20 ms paar na kare — 100 shards mein lagbhag kabhi nahi."
        ]
      },
      "lesson": "Code padh kar rishte dekho: raftaar vs aamad, saanjha pool, hedge ka intezaar aur keemat."
    }
  ],
  "interview": {
    "title": "Interview Round — model se faisla",
    "instructions": "Pehle socho: kaunsa parameter faisla kar raha hai — raftaar, aamad, pool ya jhatkon ka rishta? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Search page 40 shards poochhta hai; p99 bura hai. Team hedging lagana chahti hai. Pehle kya jaanchoge?",
        "choices": [
          "Dheemapan replica par bhi hota hai kya — jhatke ka kaaran saanjha hai?",
          "Shards ki ginti 40 se 400 karo taaki har shard chhota ho jaaye",
          "Har request turant do replicas ko bhejo, intezaar bilkul nahi",
          "Timeout 1 s se 100 ms kar do, dheemi requests apne aap kat jaayengi"
        ],
        "answer": 0,
        "explain": "Hedge tabhi kaam karta hai jab replica ka jhatka alag ho (lab: juda kaaran par 39.91% → 63.75% dheeme). Agar dheemapan ek hot key, buri query ya saanjhe disk se hai, toh replica bhi dheema — hedge sirf load badhata hai. Pehle traces se kaaran dekho. Turant do jagah bhejna load dugna karta hai; chhota timeout dheemi requests ko fail banata hai.",
        "choiceExplanations": [
          "Hedge tabhi kaam karta hai jab replica ka jhatka alag ho (lab: juda kaaran par 39.91% → 63.75% dheeme). Agar dheemapan ek hot key, buri query ya saanjhe disk se hai, toh replica bhi dheema — hedge sirf load badhata hai. Pehle traces se kaaran dekho. Turant do jagah bhejna load dugna karta hai; chhota timeout dheemi requests ko fail banata hai.",
          "Zyada shards = har page mein zyada chance ki koi dheema ho.",
          "Bina intezaar ke dugna load; p95 ke baad hedge ~5% mein kaam.",
          "Timeout jawab tez nahi karta, sirf fail karta hai."
        ]
      },
      {
        "q": "Viral photo ke time app ke saare workers bhar gaye. Ek dev kehta hai: \"workers 2,000 se 20,000 kar do\". Model ke hisaab se?",
        "choices": [
          "Line sirf der se bharegi; jab tak raftaar aamad se kam, pool bharega",
          "Theek hai — 20,000 workers kabhi nahi bharenge, dikkat khatam",
          "Workers badhane se DB ki raftaar bhi 10 guna ho jaayegi",
          "Workers ghatao — kam workers matlab kam likes, kam bojh"
        ],
        "answer": 0,
        "explain": "Model mein line 9,000 likes/s se badhti hai (aamad 10/ms, raftaar 1/ms). 2,000 workers 177 ms mein bhare; 20,000 ~2 s mein bharenge — 5 s ke timeout ke andar. 60,000 par pool nahi bharta, par 40,002 likes 5 s baad timeout. Likes ki raftaar 9,999 hi rehti hai. Ilaaj raftaar badhana (counter rows, memory counter) ya likes ko alag pool dena (bulkhead) hai.",
        "choiceExplanations": [
          "Model mein line 9,000 likes/s se badhti hai (aamad 10/ms, raftaar 1/ms). 2,000 workers 177 ms mein bhare; 20,000 ~2 s mein bharenge — 5 s ke timeout ke andar. 60,000 par pool nahi bharta, par 40,002 likes 5 s baad timeout. Likes ki raftaar 9,999 hi rehti hai. Ilaaj raftaar badhana (counter rows, memory counter) ya likes ko alag pool dena (bulkhead) hai.",
          "9,000/s ki badhti line 20,000 ko ~2 s mein bhar degi.",
          "DB ki raftaar lock se bandhi hai, workers se nahi.",
          "Kam workers jaldi bharenge; feed aur jaldi girega."
        ]
      }
    ]
  },
  "success": [
    "viral() ke rishte code ki line se bata sakte ho",
    "Hedge kab kaam karta hai aur keemat kya hai, bata sakte ho",
    "Model ke number ko parameter tak trace kar sakte ho"
  ],
  "cards": [
    {
      "front": "viral() mein ek row vs 100 rows ka farq?",
      "back": "Sirf perMs (1 → 100). Raftaar aamad (10/ms) se kam ho toh line badhti; feed girta hai ya nahi, saanjhe pool ke niyam (admit) par tika."
    },
    {
      "front": "100 shards ka page: hedge se p50?",
      "back": "208.3 → 29.8 ms. ~99% pages mein koi shard 20 ms (p95) paar karta; us shard ka jawab 20 ms + replica par — isliye ~30 ms, ek shard ka 10 ms nahi."
    },
    {
      "front": "Hedge kab bekaar?",
      "back": "Jab replica ka jhatka bhi same kaaran se ho (lab: correlated 1 → 63.75% dheeme, jaise bina hedge)."
    }
  ]
}
]);
})();
