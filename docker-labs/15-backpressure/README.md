# 🐳 Lab 15 — Backpressure: line kitni lambi, aur "dheere bhejo" kaun bolega?

System Gurukul → **Backpressure** levels ka lab (🛡️ Playlist · 1 Resilience → 🌊 Backpressure; purana level: Scale & Resilience → Backpressure).
Zero dependency Node (18+). Source videos (credit): Software Developer Diaries — "Backpressure in Software Development simply
explained"; Akhil Sharma — "Understanding BackPressure".

```bash
node tools/slowmo.js             # ex0 — slow motion: 5 orders/s aate hain, 1/s nikalta hai; line ke saat niyam
                                 #       [--mode unbounded|ram2x|drop-new|error|drop-oldest|block-server|block]
node tools/mini.js               #       sabse chhota program: lib/bounded-queue.js + ek bhejne wala + ek kaam karne wala
node tools/queue.js --policy unbounded                 # ex1 — asli raftaar: 10,000/s → 2,000/s, 30 s
node tools/queue.js --policy block --cap 20000         #       (block | drop-new | drop-oldest | error)
node tools/oom.js                #       asli crash: wahi tool, process ki memory par 100 MB ki hadd
PROPAGATE=0 npm start ex2-propagation                  # ex2 — C (4853) + B (4852)
node tools/client.js             #       doosre terminal mein — A: 150 workers, 15 s
node tools/hint.js               #       "kab aana hai" kitna ho: chhe jawab ek ke baad ek (~95 s)
node tools/streams-slowmo.js     # ex3 — Node streams, slow motion: 12 tukde   [--mode ignore|drain|pipeline|error]
node tools/streams.js            #       asli raftaar: 120 MB
node tools/chat.js               # ex4 — frontend: chat ki bheed   [--mode every|frame|cap]
docker compose --profile ex2-propagation up --build    # ya Docker se · tools: docker compose run --rm tools node tools/slowmo.js
```

| File | Kya hai |
|---|---|
| `lib/bounded-queue.js` | **Hadd wali line, 37 line**: `offer()` (bina ruke), `put()` (ruk ke), `take()`. Bhari hone par chaar jawab (`policy`). `queue.js`, `slowmo.js` aur `mini.js` yahi chalate hain. |
| `services/c.js` | Asli kaam karne wala (kahani mein: **order-service**): ek saath 4 kaam + 40 ki line = 44; bhari → `503`. |
| `services/b.js` | Beech wala (kahani mein: **app-api**): har request C ko deta hai. `PROPAGATE=1` par, 44 requests C ke paas hon toh C ko chhue bina `429` (+ `Retry-After`). `GET /config?propagate=1&retryAfterMs=250` se chalte-chalte badla ja sakta hai. |

Numbers ek laptop (WSL, Node v24.18.0) par 2026-10-10 ke runs ke hain. `slowmo.js`, `mini.js` aur `streams-slowmo.js` ka samay tay hai —
teen-teen run mein output akshar-akshar wahi aaya. Baaki tools mein number har run thode badalte hain; **pattern wahi rehta hai**.

Docker: `docker-compose.yml` pattern se likha gaya hai, par is machine par Docker nahi hai — compose file chala ke **nahi dekhi gayi**.
Saare tools seedhe Node se chalaye gaye hain.

---

## ex0-slowmo — pehle yeh chalao: line ke saat niyam, slow motion mein

KhanaKart, baarish wali shaam. **order-service** har 200 ms par ek order line mein daalti hai (5 orders/s). **dispatch-service** line
se ek order uthati hai aur rider dhoondhne mein 1 s lagati hai (1 order/s). Har second line mein 4 orders badhte hain. Saat tareeke —
wahi orders, wahi dispatch-service; sirf **line ka niyam** badalta hai. Line ka code: `lib/bounded-queue.js`.

```
$ node tools/slowmo.js
order-service: har 200 ms par ek order (5 orders/s) · dispatch-service: ek order par 1 s (1 order/s) · line har second 4 badhti hai

=== line ki koi hadd nahi · process ki memory mein 20 orders ki line aati hai ===
   ek-ek ghatna, 0.0 s se 1.1 s tak:
    0.0 s  #1 aaya → line 1
    0.1 s  dispatch-service: #1 uthaya (0.1 s se khada tha) → line 0
    0.2 s  #2 aaya → line 1
    0.4 s  #3 aaya → line 2
    0.6 s  #4 aaya → line 3
    0.8 s  #5 aaya → line 4
    1.0 s  #6 aaya → line 5
    1.1 s  dispatch-service: #1 ko rider mil gaya · #2 uthaya (0.9 s se khada tha) → line 4
   har second ka haal:
      pal   aaye   "confirm" bola   line mein   rider mila   line ka sabse purana   abhi aaye order ko rider
    0.9 s      5                5           4            0         0.7 s se khada                ~5.2 s baad
    1.9 s     10               10           8            1         1.5 s se khada                ~9.2 s baad
    2.9 s     15               15          12            2         2.3 s se khada               ~13.2 s baad
    3.9 s     20               20          16            3         3.1 s se khada               ~17.2 s baad
    4.9 s     25               25          20            4         3.9 s se khada               ~21.2 s baad
    5.0 s   #26 aaya → line 21 · memory mein jagah sirf 20 ki → 💥 process CRASH (out of memory)
   nateeja → "confirm" bola: 26 · rider mila: 4 · gayab: 22 (line ke 21 + jis par kaam chal raha tha 1)

=== line ki koi hadd nahi · memory dugni: 40 orders ki line aati hai ===
      pal   aaye   "confirm" bola   line mein   rider mila   line ka sabse purana   abhi aaye order ko rider
    0.9 s      5                5           4            0         0.7 s se khada                ~5.2 s baad
    1.9 s     10               10           8            1         1.5 s se khada                ~9.2 s baad
    2.9 s     15               15          12            2         2.3 s se khada               ~13.2 s baad
    3.9 s     20               20          16            3         3.1 s se khada               ~17.2 s baad
    4.9 s     25               25          20            4         3.9 s se khada               ~21.2 s baad
    5.9 s     30               30          24            5         4.7 s se khada               ~25.2 s baad
    6.9 s     35               35          28            6         5.5 s se khada               ~29.2 s baad
    7.9 s     40               40          32            7         6.3 s se khada               ~33.2 s baad
    8.9 s     45               45          36            8         7.1 s se khada               ~37.2 s baad
    9.9 s     50               50          40            9         7.9 s se khada               ~41.2 s baad
   10.0 s   #51 aaya → line 41 · memory mein jagah sirf 40 ki → 💥 process CRASH (out of memory)
   nateeja → "confirm" bola: 51 · rider mila: 9 · gayab: 42 (line ke 41 + jis par kaam chal raha tha 1)

=== line ki hadd 8 · bhari ho toh naya order chupchaap gira do (drop-new) ===
   ek-ek ghatna, 1.8 s se 3.1 s tak:
    1.8 s  #10 aaya → line 8/8 — BHARI
    2.0 s  #11 aaya → line bhari (8/8) → #11 chupchaap gira · customer ko phir bhi "order confirm"
    2.1 s  dispatch-service: #2 ko rider mil gaya · #3 uthaya (1.7 s se khada tha) → line 7/8
    2.2 s  #12 aaya → line 8/8 — BHARI
    2.4 s  #13 aaya → line bhari (8/8) → #13 chupchaap gira · customer ko phir bhi "order confirm"
    2.6 s  #14 aaya → line bhari (8/8) → #14 chupchaap gira · customer ko phir bhi "order confirm"
    2.8 s  #15 aaya → line bhari (8/8) → #15 chupchaap gira · customer ko phir bhi "order confirm"
    3.0 s  #16 aaya → line bhari (8/8) → #16 chupchaap gira · customer ko phir bhi "order confirm"
    3.1 s  dispatch-service: #3 ko rider mil gaya · #4 uthaya (2.5 s se khada tha) → line 7/8
   har second ka haal:
      pal   aaye   "confirm" bola   line mein   chupchaap gire   rider mila   line ka sabse purana
    0.9 s      5                5           4                0            0         0.7 s se khada
    1.9 s     10               10           8                0            1         1.5 s se khada
    2.9 s     15               15           8                4            2         2.3 s se khada
    3.9 s     20               20           8                8            3         3.1 s se khada
    4.9 s     25               25           8               12            4         3.9 s se khada
    5.9 s     30               30           8               16            5         4.7 s se khada
   dispatch-service ne jo order uthaya, woh kitni der se khada tha: #1 0.1 s · #2 0.9 s · #3 1.7 s · #4 2.5 s · #5 3.3 s · #6 4.1 s
   gire: #11 · #13–#16 · #18–#21 · #23–#26 · #28–#30
   nateeja → "confirm" bola: 30 · rider mila ya milega: 14 (5 ko mila, 1 par kaam chal raha, 8 line mein) · chupchaap gire: 16 · process zinda

=== line ki hadd 8 · bhari ho toh customer ko turant "abhi nahi" bolo (error) ===
   ek-ek ghatna, 1.8 s se 3.1 s tak:
    1.8 s  #10 aaya → line 8/8 — BHARI
    2.0 s  #11 aaya → line bhari (8/8) → customer ko turant "abhi nahi" (paisa nahi kata)
    2.1 s  dispatch-service: #2 ko rider mil gaya · #3 uthaya (1.7 s se khada tha) → line 7/8
    2.2 s  #12 aaya → line 8/8 — BHARI
    2.4 s  #13 aaya → line bhari (8/8) → customer ko turant "abhi nahi" (paisa nahi kata)
    2.6 s  #14 aaya → line bhari (8/8) → customer ko turant "abhi nahi" (paisa nahi kata)
    2.8 s  #15 aaya → line bhari (8/8) → customer ko turant "abhi nahi" (paisa nahi kata)
    3.0 s  #16 aaya → line bhari (8/8) → customer ko turant "abhi nahi" (paisa nahi kata)
    3.1 s  dispatch-service: #3 ko rider mil gaya · #4 uthaya (2.5 s se khada tha) → line 7/8
   har second ka haal:
      pal   aaye   "confirm" bola   line mein   "abhi nahi" bola   rider mila   line ka sabse purana
    0.9 s      5                5           4                  0            0         0.7 s se khada
    1.9 s     10               10           8                  0            1         1.5 s se khada
    2.9 s     15               11           8                  4            2         2.3 s se khada
    3.9 s     20               12           8                  8            3         3.1 s se khada
    4.9 s     25               13           8                 12            4         3.9 s se khada
    5.9 s     30               14           8                 16            5         4.7 s se khada
   dispatch-service ne jo order uthaya, woh kitni der se khada tha: #1 0.1 s · #2 0.9 s · #3 1.7 s · #4 2.5 s · #5 3.3 s · #6 4.1 s
   nateeja → "confirm" bola: 14 (5 ko rider mila, 1 par kaam chal raha, 8 line mein) · "abhi nahi" bola: 16 — turant, paisa kaatne se pehle · chupchaap gire: 0

=== line ki hadd 8 · bhari ho toh sabse purana order gira do (drop-oldest) ===
   ek-ek ghatna, 1.8 s se 3.1 s tak:
    1.8 s  #10 aaya → line 8/8 — BHARI
    2.0 s  #11 aaya → line bhari (8/8) → sabse purana #3 chupchaap gira, #11 andar
    2.1 s  dispatch-service: #2 ko rider mil gaya · #4 uthaya (1.5 s se khada tha) → line 7/8
    2.2 s  #12 aaya → line 8/8 — BHARI
    2.4 s  #13 aaya → line bhari (8/8) → sabse purana #5 chupchaap gira, #13 andar
    2.6 s  #14 aaya → line bhari (8/8) → sabse purana #6 chupchaap gira, #14 andar
    2.8 s  #15 aaya → line bhari (8/8) → sabse purana #7 chupchaap gira, #15 andar
    3.0 s  #16 aaya → line bhari (8/8) → sabse purana #8 chupchaap gira, #16 andar
    3.1 s  dispatch-service: #4 ko rider mil gaya · #9 uthaya (1.5 s se khada tha) → line 7/8
   har second ka haal:
      pal   aaye   "confirm" bola   line mein   chupchaap gire   rider mila   line ka sabse purana
    0.9 s      5                5           4                0            0         0.7 s se khada
    1.9 s     10               10           8                0            1         1.5 s se khada
    2.9 s     15               15           8                4            2         1.5 s se khada
    3.9 s     20               20           8                8            3         1.5 s se khada
    4.9 s     25               25           8               12            4         1.5 s se khada
    5.9 s     30               30           8               16            5         1.5 s se khada
   dispatch-service ne jo order uthaya, woh kitni der se khada tha: #1 0.1 s · #2 0.9 s · #4 1.5 s · #9 1.5 s · #14 1.5 s · #19 1.5 s
   gire: #3 · #5–#8 · #10–#13 · #15–#18 · #20–#22
   nateeja → "confirm" bola: 30 · rider mila ya milega: 14 (5 ko mila, 1 par kaam chal raha, 8 line mein) · chupchaap gire: 16 · process zinda

=== line ki hadd 8 · bhari ho toh order-service ka handler rukta hai (block) — customers aate rehte hain ===
   ek-ek ghatna, 1.8 s se 3.1 s tak:
    1.8 s  #10 aaya → line 8/8 — BHARI
    2.0 s  #11 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone "Placing order…"
    2.1 s  dispatch-service: #2 ko rider mil gaya · #3 uthaya (1.7 s se khada tha) → line 7/8
    2.1 s  #11 line mein gaya (0.1 s ruk ke) → line 8/8
    2.2 s  #12 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone "Placing order…"
    2.4 s  #13 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone "Placing order…"
    2.6 s  #14 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone "Placing order…"
    2.8 s  #15 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone "Placing order…"
    3.0 s  #16 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone "Placing order…"
    3.1 s  dispatch-service: #3 ko rider mil gaya · #4 uthaya (2.5 s se khada tha) → line 7/8
    3.1 s  #12 line mein gaya (0.9 s ruk ke) → line 8/8
   har second ka haal:
      pal   aaye   line mein   handler ruke hue (customer ka spinner)   rider mila
    0.9 s      5           4                                        0            0
    1.9 s     10           8                                        0            1
    2.9 s     15           8                                        4            2
    3.9 s     20           8                                        8            3
    4.9 s     25           8                                       12            4
    5.9 s     30           8                                       16            5
   nateeja → gire: 0 · line mein: 8 · par 16 customers ka phone "Placing order…" par atka hai, aur yeh ginti har second 4 badh rahi hai
             bina hadd ki line wapas aa gayi — bas ek kadam peeche: line se nikal ke order-service ke andar

=== line ki hadd 8 · bhejne wala EK program hai jo ruk sakta hai (block) — 30 orders ki bulk file ===
   ek-ek ghatna, 1.8 s se 4.1 s tak:
    1.8 s  bhejne wale ne #10 diya → line 8/8 — BHARI
    2.0 s  bhejne wala #11 dena chahta hai → line bhari (8/8) → bhejne wala RUK gaya
    2.1 s  dispatch-service: #2 ko rider mil gaya · #3 uthaya (1.7 s se khada tha) → line 7/8
    2.1 s  #11 line mein gaya (0.1 s ruk ke) → line 8/8
    2.2 s  bhejne wala #12 dena chahta hai → line bhari (8/8) → bhejne wala RUK gaya
    3.1 s  dispatch-service: #3 ko rider mil gaya · #4 uthaya (2.5 s se khada tha) → line 7/8
    3.1 s  #12 line mein gaya (0.9 s ruk ke) → line 8/8
    3.1 s  bhejne wala #13 dena chahta hai → line bhari (8/8) → bhejne wala RUK gaya
    4.1 s  dispatch-service: #4 ko rider mil gaya · #5 uthaya (3.3 s se khada tha) → line 7/8
    4.1 s  #13 line mein gaya (1.0 s ruk ke) → line 8/8
    4.1 s  bhejne wala #14 dena chahta hai → line bhari (8/8) → bhejne wala RUK gaya
   har second ka haal:
      pal   line mein daale   line mein             bhejne wala   rider mila
    0.9 s                 5           4               chal raha            0
    1.9 s                10           8               chal raha            1
    2.9 s                11           8   RUKA hua (line bhari)            2
    3.9 s                12           8   RUKA hua (line bhari)            3
    4.9 s                13           8   RUKA hua (line bhari)            4
    5.9 s                14           8   RUKA hua (line bhari)            5
   nateeja → line mein daale: 14 · gire: 0 · ruka hua: sirf bhejne wala khud · baaki 16 orders file mein hi hain — na gire, na kho gaye
             bhejne wale ki raftaar: pehle 5 orders/s, line bharne ke baad 1 order/s — dispatch-service ki raftaar
```

| Line ka niyam | Kya hua | Kisko pata chala |
|---|---|---|
| Koi hadd nahi (memory 20) | 5.0 s par crash · 26 "confirm", **22 gayab** | kisi ko nahi |
| Koi hadd nahi (memory 40) | 10.0 s par crash · 51 "confirm", **42 gayab** — badi memory = der se crash, zyada nuksaan | kisi ko nahi |
| Hadd 8 · naya chupchaap girao | process zinda · 30 "confirm", **16 chupchaap gire** | kisi ko nahi |
| Hadd 8 · "na" bolo | 14 "confirm" · 16 ko turant "abhi nahi" (paisa nahi kata) · chupchaap gire 0 | bhejne wale ko, turant |
| Hadd 8 · sabse purana girao | 16 gire · par jo order utha woh hamesha ~1.5 s purana (naya girane par 4.1 s aur badhta hua) | kisi ko nahi |
| Hadd 8 · rok lo, customers aate rehte hain | gire 0 · par **16 ruke hue** order-service ke andar, har second 4 aur — line bas ek kadam peeche khisak gayi | kisi ko nahi |
| Hadd 8 · rok lo, bhejne wala ruk sakta hai | gire 0 · kahin kuch jama nahi · bhejne wale ki raftaar 5/s → **1/s** | bhejne wale ko — woh ruka hua hai |

👉 Dispatch-service saaton mein utna hi kaam karti hai (1 order/s). Farak do sawaalon ka hai: **kiska kaam nahi hoga**, aur **kya bhejne
wale ko pata chalega**. Jis niyam mein bhejne wale ko pata chalta hai aur woh dheema hota hai, wahi backpressure hai.

("Memory mein 20 orders ki line aati hai" slow motion ka niyam hai. Asli crash: `node tools/oom.js`, neeche.)

### mini.js — sabse chhota chalta program

`lib/bounded-queue.js` + ek bhejne wala (8 kaam, jitni jaldi ho sake) + ek kaam karne wala (ek kaam = 400 ms). Line mein 3 ki jagah.
Bhejne wale ke code mein kahin `sleep` nahi hai — raftaar `await line.put()` se aati hai.

```
$ node tools/mini.js
line mein 3 ki jagah · bhejne wala: 8 kaam, jitni jaldi ho sake · kaam karne wala: ek kaam = 400 ms

 0.0 s  #1 line mein                       line: [#1]
 0.0 s  #2 line mein                       line: [#1 #2]
 0.0 s  #3 line mein                       line: [#1 #2 #3]
 0.0 s  #4 dena hai · line bhari → RUKA    line: [#1 #2 #3]
 0.1 s  #1 uthaya                          line: [#2 #3]
 0.1 s  #4 line mein                       line: [#2 #3 #4]
 0.1 s  #5 dena hai · line bhari → RUKA    line: [#2 #3 #4]
 0.5 s  #2 uthaya                          line: [#3 #4]
 0.5 s  #5 line mein                       line: [#3 #4 #5]
 0.5 s  #6 dena hai · line bhari → RUKA    line: [#3 #4 #5]
 0.9 s  #3 uthaya                          line: [#4 #5]
 0.9 s  #6 line mein                       line: [#4 #5 #6]
 0.9 s  #7 dena hai · line bhari → RUKA    line: [#4 #5 #6]
 1.3 s  #4 uthaya                          line: [#5 #6]
 1.3 s  #7 line mein                       line: [#5 #6 #7]
 1.3 s  #8 dena hai · line bhari → RUKA    line: [#5 #6 #7]
 1.7 s  #5 uthaya                          line: [#6 #7]
 1.7 s  #8 line mein                       line: [#6 #7 #8]
 2.1 s  #6 uthaya                          line: [#7 #8]
 2.5 s  #7 uthaya                          line: [#8]
 2.9 s  #8 uthaya                          line: []

Bhejne wale ne pehle 3 kaam ek saath diye. Uske baad har 400 ms par ek — kaam karne wale ki raftaar par.
Line kabhi 3 se upar nahi gayi · gire: 0 · "na" bola: 0
```

---

## ex1-bounded-queue — asli raftaar: producer 10,000/s, consumer 2,000/s

Wahi 5 aur 1 ka hisaab, asli raftaar par, ek process mein. 30 second chalao aur dekho line aur memory ka kya hota hai.

```bash
node tools/queue.js --policy unbounded
node tools/queue.js --policy block       --cap 20000
node tools/queue.js --policy drop-new    --cap 20000
node tools/queue.js --policy drop-oldest --cap 20000
node tools/queue.js --policy error       --cap 20000
```

```
t=10s  queue=  78560  rss= 108 MB  consumed=19640
t=20s  queue= 157360  rss= 166 MB  consumed=39340
t=30s  queue= 236000  rss= 252 MB  consumed=59000
policy=unbounded: producer ki asli raftaar 9832/s, queue mein 236000, dropped 0, errors (producer ko bataya) 0, sabse purana event 24 s purana
t=10s  queue=  19980  rss=  75 MB  consumed=19700
t=20s  queue=  19980  rss=  94 MB  consumed=39440
t=30s  queue=  19980  rss=  94 MB  consumed=59160
policy=block cap=20000: producer ki asli raftaar 2638/s, queue mein 19980, dropped 0, errors (producer ko bataya) 0, sabse purana event 10 s purana
t=10s  queue=  19980  rss=  75 MB  consumed=19700
t=20s  queue=  19980  rss=  94 MB  consumed=39420
t=30s  queue=  19980  rss=  94 MB  consumed=59180
policy=drop-new cap=20000: producer ki asli raftaar 9863/s, queue mein 19980, dropped 216740, errors (producer ko bataya) 0, sabse purana event 10 s purana
t=10s  queue=  19980  rss=  98 MB  consumed=19660
t=20s  queue=  19980  rss= 123 MB  consumed=39400
t=30s  queue=  19980  rss= 133 MB  consumed=59180
policy=drop-oldest cap=20000: producer ki asli raftaar 9858/s, queue mein 19980, dropped 216740, errors (producer ko bataya) 0, sabse purana event 2 s purana
t=10s  queue=  19980  rss=  75 MB  consumed=19700
t=20s  queue=  19980  rss=  94 MB  consumed=39440
t=30s  queue=  19980  rss=  94 MB  consumed=59140
policy=error cap=20000: producer ki asli raftaar 9857/s, queue mein 19980, dropped 0, errors (producer ko bataya) 216580, sabse purana event 10 s purana
```

👉 **Unbounded**: 30 second mein line 2,36,000, memory 252 MB, aur badhti hui (har second ~7,900 kaam). Line ka sabse purana kaam
24 s purana. Poore run mein error 0.

👉 **Bounded** line ek **faisla** maangti hai jab bhar jaaye:
- `block` — producer ruk gaya: uski asli raftaar **2,638/s** (bina roke 9,832/s). Kuch nahi gira. (Shuru ke 20,000 line bharne mein gaye, isliye 2,000 se thoda upar.)
- `drop-new` — 2,16,740 kaam chupchaap gire; producer ko pata nahi.
- `drop-oldest` — 2,16,740 gire, par line ka sabse purana kaam sirf **2 s** purana (baaki mein 10 s). Location, bhaav, live feed.
- `error` — producer ko 2,16,580 baar "na" bola; aage ka faisla producer ka.

### oom.js — asli crash

Wahi `tools/queue.js` ek alag process mein, par us process ki memory par hadd (`node --max-old-space-size=100`). Pehle bina hadd
ki line, phir hadd wali.

```
$ node tools/oom.js
tools/queue.js alag process mein · producer 10,000/s, consumer 2,000/s · process ki memory hadd: 100 MB (V8 heap)

=== line ki koi hadd nahi ===
   t= 5s  queue=  39360  rss=  80 MB  consumed=9840
   t=10s  queue=  78800  rss= 109 MB  consumed=19700
   t=15s  queue= 118240  rss= 152 MB  consumed=29560
   t=20s  queue= 157200  rss= 156 MB  consumed=39300
   t=25s  queue= 194720  rss= 148 MB  consumed=48680
   t=29s  queue= 222320  rss= 155 MB  consumed=55580
   💥 35.9 s par process mar gaya: "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory"
      marne se pehle 6.9 s process ne kuch nahi chhapa — memory khaali karne (garbage collection) mein atka raha
      aakhri baar line mein 2,22,320 events dikhe — sab gaye · consumer sirf 55,580 kar paya

=== line ki hadd 20,000 · bhari ho toh producer ruke (block) · wahi memory hadd · 40 s ===
   t= 5s  queue=  19980  rss=  75 MB  consumed=9840
   t=10s  queue=  19980  rss=  76 MB  consumed=19700
   t=15s  queue=  19980  rss=  81 MB  consumed=29560
   t=20s  queue=  19980  rss=  88 MB  consumed=39420
   t=25s  queue=  19980  rss=  93 MB  consumed=49300
   t=30s  queue=  19980  rss=  93 MB  consumed=59140
   t=35s  queue=  19980  rss=  94 MB  consumed=69060
   t=40s  queue=  19980  rss=  99 MB  consumed=78920
   ✅ 40 s baad bhi zinda · line 19,980 par ruki hui · memory 99 MB · consumer ne 78,920 kiye · gira: 0
```

👉 Bina hadd: process **mar gaya**, aur line ke 2.2 lakh se zyada kaam uske saath gaye. Marne se pehle ~7 second process jama raha (memory
khaali karne ki koshish) — na naya kaam, na purana. Hadd wali line: wahi memory hadd, wahi load, 40 s baad bhi zinda.

Teen run: process 35.9 · 36.1 · 37.1 s par mara · marne se pehle 6.9 · 7.1 · 8.0 s jama · aakhri baar line mein 2,22,320 · 2,21,840 · 2,21,680.

---

## ex2-propagation — A → B → C, aur C bhar gaya

C ~200 kaam/second kar sakta hai (4 kaam ek saath + 40 ki line; bhari → `503`). A ke 150 workers poori taaqat se bhejte hain.
Kahani mein: A = phones, B = app-api, C = order-service.

- `PROPAGATE=0`: C ne 503 diya → B wahi 503 lautata hai → A **turant** dobara bhejta hai.
- `PROPAGATE=1`: B jaanta hai C ek saath 44 leta hai. Itni pehle se C ke paas hon → B **C ko chhue bina** A ko `429` +
  `Retry-After: 250 ms` deta hai → A utna ruk kar (±20% random) dobara bhejta hai.

```
$ PROPAGATE=0 npm start ex2-propagation      (doosre terminal mein:)  $ node tools/client.js
A: 72166 requests bheje → 2757 kaam poore (26.2 tries per success) | p50 274 ms p99 6932 ms
B: C ko 72166 bheje, C ne 69409 thukraye (bekaar kaam), 0 ko 429 bina C chhue | C: 2757 kiye, 69409 rejected
A ke 150 workers: ek worker ke kaam — sabse kam 1, beech wala 17, sabse zyada 52 | jin workers ka ek bhi kaam poora nahi hua: 0 | ek kaam par sabse lamba intezaar 14.0 s

$ PROPAGATE=1 npm start ex2-propagation      $ node tools/client.js
A: 9374 requests bheje → 2979 kaam poore (3.1 tries per success) | p50 224 ms p99 8236 ms
B: C ko 2979 bheje, C ne 0 thukraye (bekaar kaam), 6395 ko 429 bina C chhue | C: 2979 kiye, 0 rejected
A ke 150 workers: ek worker ke kaam — sabse kam 0, beech wala 17, sabse zyada 67 | jin workers ka ek bhi kaam poora nahi hua: 18 | ek kaam par sabse lamba intezaar 15.3 s
```

👉 Bina signal ke C ka waqt "na" bolne mein gaya, aur asli kaam bhi kam hua. Signal ke saath A ne 7–8 guna kam bheja, C ne ek
bhi request nahi thukrayi, aur kaam zyada hua. (Teesri line: kaam workers mein kaise banta — neeche dekho.)

### hint.js — "kab aana hai" kitna ho?

Services chalti rahein (`npm start ex2-propagation`). `tools/hint.js` B ka jawab chalte-chalte badalta hai (`GET /config`) aur har
baar `tools/client.js` chalata hai.

```
$ node tools/hint.js
A (150 workers) → B → C (~200 kaam/s, ek saath 44) · har tareeka 15 s

C bhara ho toh B ka jawab                 A ne bheje   kaam poore   tries/kaam   C ne thukraye   B ne 429 diye   ek worker ke kaam: kam / beech / zyada   khaali haath workers   sabse lamba intezaar
503 aage badha diya (koi signal nahi)          73571         2745         26.8           70826               0                              3 / 17 / 46                      0                 12.0 s
429, par Retry-After nahi                     602805         2975        202.6               0          599830                             12 / 20 / 30                      0                  5.4 s
429 + Retry-After 50 ms                        34719         2985         11.6               0           31734                              0 / 20 / 49                      1                 15.0 s
429 + Retry-After 250 ms                        9391         2990          3.1               0            6401                              0 / 17 / 68                     24                 15.3 s
429 + Retry-After 1000 ms                       4622         2990          1.5               0            1632                               0 / 5 / 68                     66                 15.9 s
429 + Retry-After 3000 ms                       3568         2988          1.2               0             580                               0 / 0 / 68                     96                 18.4 s
```

| B ka jawab | tries/kaam (teen run) | 150 mein se khaali haath workers (teen run) |
|---|---|---|
| 429, bina Retry-After | 179–209 | 0 |
| 429 + Retry-After 50 ms | 11.6–11.7 | 0–2 |
| 429 + Retry-After 250 ms | 3.1 | 13–24 |
| 429 + Retry-After 1000 ms | 1.5 | 66–78 |
| 429 + Retry-After 3000 ms | 1.2 | 89–99 |

👉 **Khaali 429** C ko bachata hai (C ne 0 thukraye), par A darwaze par hi khada rehta hai: ek kaam par ~200 requests.

👉 **Retry-After** bekaar requests ghatata hai — par **baari bigadti hai**. Jis worker ka kaam abhi hua, woh agla usi pal bhejta hai
jis pal jagah bani; jo bahar ruka tha, woh laut-ta hai toh jagah phir bhari milti hai. Kul kaam har baar lagbhag barabar (~2,990).

👉 Retry-After utna rakho jitni der mein jagah sach mein banegi: line ÷ raftaar (yahan 44 ÷ 200 ≈ 0.2 s). Jahan baari zaroori ho,
wahan intezaar karne walon ki apni line chahiye. (Lab ke workers lalchi hain — kaam hote hi agla bhejte hain — isliye yahan farak asli
duniya se bada dikhta hai.)

---

## ex3-streams — Node streams: `write()` ka jawab suno

### Slow motion — 12 tukde

Asli Node streams (`Readable`, `Writable`, `pipeline`); sirf ghadi dheemi. Reader har 100 ms par ek tukda deta hai, writer ko ek
tukde par 300 ms lagte hain, writer ka nishaan (`highWaterMark`) 4 tukde.

```
$ node tools/streams-slowmo.js
asli Node streams, slow motion · reader: har 100 ms par ek tukda (kul 12) · writer: ek tukda 300 ms, highWaterMark 4 tukde
Node v24.18.0 · highWaterMark na do toh default: 65536 bytes · object mode mein 16 objects

=== write() ka jawab nazarandaaz ===
    0.10 s  #1: source se padha → write() → true  · writer ke andar 1/4
    0.20 s  #2: source se padha → write() → true  · writer ke andar 2/4
    0.30 s  #3: source se padha → write() → true  · writer ke andar 3/4
    0.40 s  #4: source se padha → write() → false · writer ke andar 4/4   ← "ruk ja"
    0.50 s  #5: source se padha → write() → false · writer ke andar 4/4   ← "ruk ja"
    0.60 s  #6: source se padha → write() → false · writer ke andar 5/4   ← hadd ke upar
    0.70 s  #7: source se padha → write() → false · writer ke andar 6/4   ← hadd ke upar
    0.80 s  #8: source se padha → write() → false · writer ke andar 6/4   ← hadd ke upar
    0.90 s  #9: source se padha → write() → false · writer ke andar 7/4   ← hadd ke upar
    1.00 s  #10: source se padha → write() → false · writer ke andar 8/4   ← hadd ke upar
    1.10 s  #11: source se padha → write() → false · writer ke andar 8/4   ← hadd ke upar
    1.20 s  #12: source se padha → write() → false · writer ke andar 9/4   ← hadd ke upar
   nateeja → writer ke andar sabse zyada: 9 (hadd 4) · source se aakhri tukda 1.20 s par padha · sab likhne mein 3.75 s

=== write() false → reader.pause() · 'drain' → reader.resume() ===
    0.10 s  #1: source se padha → write() → true  · writer ke andar 1/4
    0.20 s  #2: source se padha → write() → true  · writer ke andar 2/4
    0.30 s  #3: source se padha → write() → true  · writer ke andar 3/4
    0.40 s  #4: source se padha → write() → false · writer ke andar 4/4   ← "ruk ja"
    0.40 s           reader.pause() — reader ruka
    0.45 s           writer ne #1 likh diya · writer ke andar 3/4
    0.50 s  #5: source se padha → reader ke andar ruka hua (write nahi hua)
    0.75 s           writer ne #2 likh diya · writer ke andar 2/4
    1.05 s           writer ne #3 likh diya · writer ke andar 1/4
    1.35 s           writer khaali (writer ke andar 0/4) → 'drain' → reader phir chalu
    1.35 s  #5: reader ke andar se nikla → write() → true  · writer ke andar 1/4
    1.40 s  #6: source se padha → write() → true  · writer ke andar 2/4
    1.50 s  #7: source se padha → write() → true  · writer ke andar 3/4
    1.60 s  #8: source se padha → write() → false · writer ke andar 4/4   ← "ruk ja"
    1.60 s           reader.pause() — reader ruka
    1.65 s           writer ne #5 likh diya · writer ke andar 3/4
    1.70 s  #9: source se padha → reader ke andar ruka hua (write nahi hua)
    1.95 s           writer ne #6 likh diya · writer ke andar 2/4
    2.25 s           writer ne #7 likh diya · writer ke andar 1/4
    2.55 s           writer khaali (writer ke andar 0/4) → 'drain' → reader phir chalu
    2.55 s  #9: reader ke andar se nikla → write() → true  · writer ke andar 1/4
    2.60 s  #10: source se padha → write() → true  · writer ke andar 2/4
    2.70 s  #11: source se padha → write() → true  · writer ke andar 3/4
    2.80 s  #12: source se padha → write() → false · writer ke andar 4/4   ← "ruk ja"
    2.80 s           reader.pause() — reader ruka
    2.85 s           writer ne #9 likh diya · writer ke andar 3/4
    3.15 s           writer ne #10 likh diya · writer ke andar 2/4
    3.45 s           writer ne #11 likh diya · writer ke andar 1/4
    3.75 s           writer khaali (writer ke andar 0/4) → 'drain' → reader phir chalu
   nateeja → writer ke andar sabse zyada: 4 (hadd 4) · source se aakhri tukda 2.80 s par padha · sab likhne mein 3.75 s

=== stream.pipeline(reader, writer) ===
    0.10 s  #1: source se padha → write() → true  · writer ke andar 1/4
    0.20 s  #2: source se padha → write() → true  · writer ke andar 2/4
    0.30 s  #3: source se padha → write() → true  · writer ke andar 3/4
    0.40 s  #4: source se padha → write() → false · writer ke andar 4/4   ← "ruk ja"
    0.40 s           reader.pause() — reader ruka
    0.45 s           writer ne #1 likh diya · writer ke andar 3/4
    0.50 s  #5: source se padha → reader ke andar ruka hua (write nahi hua)
    0.75 s           writer ne #2 likh diya · writer ke andar 2/4
    1.05 s           writer ne #3 likh diya · writer ke andar 1/4
    1.35 s           writer khaali (writer ke andar 0/4) → 'drain' → reader phir chalu
    1.35 s  #5: reader ke andar se nikla → write() → true  · writer ke andar 1/4
    1.40 s  #6: source se padha → write() → true  · writer ke andar 2/4
    1.50 s  #7: source se padha → write() → true  · writer ke andar 3/4
    1.60 s  #8: source se padha → write() → false · writer ke andar 4/4   ← "ruk ja"
    1.60 s           reader.pause() — reader ruka
    1.65 s           writer ne #5 likh diya · writer ke andar 3/4
    1.70 s  #9: source se padha → reader ke andar ruka hua (write nahi hua)
    1.95 s           writer ne #6 likh diya · writer ke andar 2/4
    2.25 s           writer ne #7 likh diya · writer ke andar 1/4
    2.55 s           writer khaali (writer ke andar 0/4) → 'drain' → reader phir chalu
    2.55 s  #9: reader ke andar se nikla → write() → true  · writer ke andar 1/4
    2.60 s  #10: source se padha → write() → true  · writer ke andar 2/4
    2.70 s  #11: source se padha → write() → true  · writer ke andar 3/4
    2.80 s  #12: source se padha → write() → false · writer ke andar 4/4   ← "ruk ja"
    2.80 s           reader.pause() — reader ruka
    2.85 s           writer ne #9 likh diya · writer ke andar 3/4
    3.15 s           writer ne #10 likh diya · writer ke andar 2/4
    3.45 s           writer ne #11 likh diya · writer ke andar 1/4
    3.75 s           writer khaali (writer ke andar 0/4) → 'drain' → reader phir chalu
   nateeja → writer ke andar sabse zyada: 4 (hadd 4) · source se aakhri tukda 2.80 s par padha · sab likhne mein 3.75 s

=== writer #3 likhte hue fail ho jaaye — reader ka kya hota hai? ===
   reader.pipe(writer)      → error mila: "disk bhar gayi" · writer.destroyed = true · reader.destroyed = false ← reader khula reh gaya (file / DB cursor / socket ka leak)
   pipeline(reader, writer) → error mila: "disk bhar gayi" · writer.destroyed = true · reader.destroyed = true  ← dono band
```

👉 `write()` ka `false` "nahi liya" nahi hai — tukda **le liya jaata hai** (nishaan 4, andar 9). `false` ka matlab: "ab aur mat bhejo".

👉 `'drain'` tab aata hai jab writer **poora khaali** ho (0/4), nishaan se zara neeche aane par nahi.

👉 Dono tareekon mein sab likhne mein 3.75 s. Reader ko rokne se kaam dheema nahi hua — bas source der se padha gaya (1.20 s ki jagah 2.80 s tak).

👉 Writer fail ho jaaye toh `reader.pipe(writer)` reader ko **khula** chhod deta hai; `pipeline()` dono band karta hai.

### Asli raftaar — 120 MB

Tez reader (64 KB ke tukde) → dheema writer (har 64 KB par 4 ms ≈ 16 MB/s). Writer ka nishaan 1 MB. Har tareeka alag process mein,
taaki memory ka hisaab saaf rahe.

```
$ node tools/streams.js
tez reader → dheema writer (~16 MB/s) · 120 MB · writer ka highWaterMark 1 MB

tareeka                               writer mein sabse zyada jama   process ki extra memory (peak)   kul samay
write() ka jawab nazarandaaz                120 MB                    129 MB                8.0 s
pause() / drain par resume()                  1 MB                     45 MB                8.0 s
stream.pipeline()                             1 MB                     49 MB                8.0 s
```

```js
// khud likhna ho
reader.on('data', chunk => {
  if (!writer.write(chunk)) { reader.pause(); writer.once('drain', () => reader.resume()); }
});
// ya bas
pipeline(reader, writer, err => { … });   // pause/resume + galti par dono band
```

👉 Jawab nazarandaaz: poori file (**120 MB**) writer ke andar RAM mein. Sunne par: 1 MB. **Kul samay teeno mein wahi** (8.0 s) — raftaar
hamesha sabse dheemi kadi (writer) ki thi.

---

## ex4-chat — frontend: chat ki bheed

5,000 messages/second. `tools/chat.js` browser nahi hai: yeh browser ke akele dhaage (main thread) ki nakal Node mein karta hai. Ek
message dikhana = 0.2 ms ka kaam, har screen update ke baad 1 ms layout. 60 fps = har frame 16.7 ms. Saath mein har 50 ms par ek "click".

```
$ node tools/chat.js
5000 messages/s · ek message 0.2 ms + har DOM update par 1 ms layout · 60 fps = 16.7 ms/frame · 5 s

tareeka                            fps   sabse lamba frame   click ki der (p99)   message kitna purana dikha (p99)   dikhaye / chhode / abhi line mein
har message turant (apna layout)    61        17 ms              1 ms              4131 ms                     4116 / 0 / 20874
frame mein ek baar, sab              5       393 ms            341 ms               408 ms                     23200 / 0 / 0
frame mein ek baar, naye 20         47        22 ms              6 ms                11 ms                     4740 / 20230 / 0
```

👉 **Har message turant**: page smooth, par chat **4.1 second peeche** aur **20,874 messages line mein**, badhte hue. Bina hadd ki line.

👉 **Frame mein ek baar, sab**: 5 fps, click 341 ms — page atka hua. Sab kuch dikhane ki zid ne sab kuch dheema kar diya.

👉 **Frame mein naye 20, baaki chhodo**: 47 fps, click 6 ms, message sirf 11 ms purana. ~81% messages chhode — aur koi insaan
5,000 messages/second padh bhi nahi sakta.

---

## ⚠️ Aam galatfehmi

- **"Queue badi kar do."** Badi line sirf der badhati hai, aur girne par nuksaan bhi (slow motion: 22 → 42 gayab).
- **"Koi error nahi, matlab sab theek."** Bina hadd ki line marne tak error nahi deti (ex1: error 0, line 2,36,000).
- **"`write()` false = data nahi liya."** Liya gaya; `false` sirf "ruk ja" hai (ex3).
- **"Backpressure se kaam dheema hota hai."** Raftaar hamesha sabse dheemi kadi ki thi (ex3: teeno tareeke 8.0 s).
- **"429 bhej diya, kaam ho gaya."** Bina Retry-After ke client turant laut-ta hai (ex2: ek kaam par ~200 requests).

## Khud try karo

1. `tools/mini.js` ki line 12 se `await` hata do. Ab `say()` kya chhapta hai, aur `line.waiting.length` kitna hota hai?
2. `tools/slowmo.js` mein hadd 8 ki jagah 16 karo (`MODES` mein `cap`). "Na" kab shuru hota hai? Line ka aakhri order rider ke liye kitna rukta hai?
3. `tools/queue.js` mein consumer 2,000 se 9,000 karo. Unbounded line ab bhi badhti hai? Kitni der mein 2 lakh tak pahunchegi?
4. `tools/client.js` mein random hata do (`0.8 + Math.random() * 0.4` → `1`). 429 ke baad saare workers ek saath lautte hain?
