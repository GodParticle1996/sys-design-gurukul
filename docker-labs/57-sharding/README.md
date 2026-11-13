# 🧪 Lab 57 — Sharding: shard key, hot key, IDs, co-location, backfill race

System Gurukul → 🧪 First Principles → Sharding (Kyun · Kaise · Code · Kab).
Node 24+ (SQLite Node ke andar hai: `node:sqlite`), koi package install nahi. Captures Node v24.18.0 + SQLite 3.53.1 par,
WSL2 machine (14 CPU threads) par. Har **shard = ek worker thread** jiski apni SQLite file hai (OS ke temp folder mein, run
ke baad mit jaati hai). Main thread router hai. Ek thread ek waqt mein ek kaam karta hai — ek chhote server jaisa.
Koi port nahi.

```bash
npm start -- ex0-moves       # ASLI ginti: 10 lakh keys — hash % N vs ring (150 vnodes), shard joda / hataya
npm start -- ex1-shard-key   # ASLI: 4 shards — mahine se (range) vs id ke hash se; live writes, range query, id lookup, fsync
npm start -- ex2-hot-key     # ASLI: 8 shards — ek viral vote counter, key ko 1 / 10 / 40 sub-keys mein todo; total padhna
npm start -- ex3-ids         # ASLI: 10 lakh inserts, 6 tarah ki primary key; Snowflake: duplicates, ghadi peeche, order
npm start -- ex4-colocate    # ASLI: 4 shards — orders user ke shard par vs order id se; join, bina shard key, transfer crash
npm start -- ex5-backfill    # ASLI (seeded): purana DB → 4 shards, backfill + live writes; 4 likhne ke tareeke; sample, repair
npm test                     # 9 tests
docker compose --profile ex1-shard-key up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.** Samay (µs, ms, writes/sec) machine ke saath badlenge. ex0 aur
ex5 ki ginti har run same (seeded). ex1–ex4 ke rows aur ginti same, samay badalte hain; README mein 3 runs ka range hai.

## Lab ka daayra (kya asli, kya nahi)

- **Shards ek hi laptop par hain.** Network nahi hai: ek "shard call" worker thread ko message hai (~20–50 µs aana-jaana).
  Asli shards alag machines par hote hain, har call mein network ka safar judta. Isliye lab **shards ka op-samay** alag se
  naapta hai: worker ke andar op (SQL + JS loop) ka samay, sab shards ka jod. Message kholna-bandh karna op-samay mein shaamil
  nahi, aur op-samay poora CPU bhi nahi — par shards par padne wale kaam ka achha naap hai.
- **Saare shards ek disk share karte hain.** ex1 hissa D dikhata hai: durable commits (fsync) 4 shards se badh sakte hain (ek run mein ~1.5–1.7×), par 4× ka vaada nahi.
  Isliye ex1–ex4 ke writes `synchronous = OFF` par hain (fsync ka intezaar nahi; file mein likhna aur WAL checkpoint
  phir bhi hote hain). Lab shard ka CPU alag se nahi naapta: op-samay mein SQL, JS loop aur beech ka koi bhi wait aata hai.
- **Router ek hi hai** (main thread). ex1 aur ex2 mein router 8 batch tak ek saath hawa mein rakhta hai (pipeline), aur
  ex2 ke votes timing se pehle, compact typed arrays mein bante hain. Dono tools **router CPU %** chhaapte hain (main
  thread ka CPU ÷ samay; ~100% = rukawat router). Captures mein router 8–46% (ex1) aur 2–30% (ex2) par hai, aur sabse
  busy shard ka op-samay 91–99% — shard wala raasta bhara hai, router nahi.
- ex5 ek thread mein seeded order se chalta hai (asli SQLite, memory mein): race ka **kram** tay hai, taaki har run same
  ginti de. Asli backfill mein kram har baar alag hoga.

## ex0-moves — ek shard joda ya hataya, kitni keys hilin?

```
$ npm start -- ex0-moves
10,00,000 keys (user:0 … user:999999), hash = MD5 ke pehle 4 bytes

badlaav             hash % N      formula               ring+vnodes      ideal (sirf zaroori)
  4 → 5   joda      80.0%        N/(N+1) =  80.0%       17.4%           1/5 =  20.0%
  5 → 6   joda      83.3%        N/(N+1) =  83.3%       15.5%           1/6 =  16.7%
100 → 101 joda      99.0%        N/(N+1) =  99.0%        1.0%           1/101 =   1.0%
  5 → 4   hataya    80.0%        (N-1)/N =  80.0%       17.4%           1/5 =  20.0%
100 → 99  hataya    99.0%        (N-1)/N =  99.0%        1.0%           1/100 =   1.0%

N = pehle kitne shards the. Jodne par hash % N mein N/(N+1) keys hilti hain; hatane par (N-1)/N.
Ring par sirf naye shard ka hissa (jodna) ya mare shard ka hissa (hatana) hilta hai — baaki keys apni jagah.
```

- `hash % N`: 4 → 5 par **80%**, 100 → 101 par **99%** keys ka shard badla. Jodne par N/(N+1), hatane par (N−1)/N.
  Har hili key = ek copy network par, aur copy hone tak galat shard par lookup.
- Ring (150 vnodes): sirf naye shard ka hissa hila (4 → 5: 17.4%, 100 → 101: 1.0%). Ideal 1/(N+1) ke paas, barabar nahi.
- Lab 34 ring aur vnodes ko cache ke saath dikhata hai (node mara → cache miss, load skew 28.6× bina vnodes). ex0 sirf keys ginta hai.

## ex1-shard-key — mahine se ya id ke hash se?

```
$ npm start -- ex1-shard-key
Itihaas: 3,00,000 events, 1 Jan – 31 Mar 2026 (dono layouts mein same rows)
  range: rows per shard [103334, 93333, 103333, 0]   (shard 3 = April, abhi khaali)
  hash:  rows per shard [74967, 74972, 74857, 75204]

A. Live writes — 12 April, 2,00,000 events per round, 3 round, router 2000 ke batch bhejta hai, 8 batch tak ek saath hawa mein
   router CPU = main thread ka CPU / samay (~100% = rukawat router). shard op-samay = worker ke andar SQL + loop ka samay.
  range  1,52,288–3,05,005 writes/sec   router CPU 8–14%   aakhri round: rows per shard [0, 0, 0, 200000]   shard op-samay % [0, 0, 0, 97]
  hash   4,64,336–6,72,629 writes/sec   router CPU 29–44%   aakhri round: rows per shard [49875, 50145, 49947, 50033]   shard op-samay % [92, 93, 93, 96]

B. Range query — "Feb ke ek ghante ke saare events", 300 alag ghante
  range  shards poochhe 1   rows 139 per query   shards ka op-samay  54 µs   median 159 µs   p99 347 µs
  hash   shards poochhe 4   rows 139 per query   shards ka op-samay 159 µs   median 185 µs   p99 381 µs

C. Ek event, event ke id se — 300 ids
  range  shards poochhe 4   shards ka op-samay  38 µs   median 110 µs   p99 343 µs
  hash   shards poochhe 1   shards ka op-samay   8 µs   median 52 µs   p99 115 µs

range layout ko id se mahina pata nahi, isliye chaaron shards se poochta hai. hash layout ko ghante se shard pata nahi.

D. Durable commits (har event ka alag commit + fsync), 1000 per shard, 3 round, saare shards is laptop ki EK disk par
  1 shard   1,496–1,565 commits/sec kul
  4 shards  2,390–2,525 commits/sec kul
```

3 runs: range 1,34,623–3,05,005 writes/sec, hash 4,24,137–6,72,629 writes/sec. Range query: shards ka op-samay range 54–60 µs vs hash 159–177 µs.
id lookup: range 38–50 µs vs hash 8–10 µs. fsync: 1 shard 266–1,619, 4 shards 634–2,653 commits/sec.

- **A. Hot tail:** aaj ke saare writes April wale shard par (200,000 / 200,000), baaki teen 0% busy. 4 machines ka
  cluster, likhne ki taakat ek machine ki (April shard 97% busy). Hash layout chaaron par ~50,000 baant'ta hai: har run
  mein range se ~2–3× tez. Chaaron shards ka op-samay 91–96% aur router CPU 29–46%, toh shard wala raasta bhara hai. 4× nahi: har hash
  shard akele April shard se dheema likh raha tha (har shard ko ~500 rows per transaction milti hain, April shard ko
  2,000; aur laptop ke cores share hote hain). Lab is farq ki wajah alag se nahi naapta.
- **B. Range query:** "Feb ka ek ghanta" — range layout 1 shard, hash layout 4 shards. Latency lagbhag barabar (chaar
  calls parallel), par shards ka op-samay ~3×. Bhari traffic mein shards ka kaam hi capacity khaata hai.
- **C. id lookup:** ulta. Range layout ko id se mahina pata nahi → 4 shards (kaam ~4–5×). Shard key = jo sawaal sabse zyada
  aata hai.
- **D. Ek disk:** durable commit (har event ka fsync) 1 shard 266–1,619/sec, 4 shards 634–2,653/sec — ek run mein ~1.5–1.7×, 4× ka vaada nahi, aur
  run ke saath bahut hilta hai. Shards ek disk par = disk ki seema ek. Asli shards ki alag disks hoti hain.

## ex2-hot-key — ek viral vote counter

```
$ npm start -- ex2-hot-key
A. Writes — 3,00,000 votes per round, 3 round, 8 shards, 4000 votes ke batch, 8 batch tak ek saath hawa mein
split   shards jinhe sub-keys mili   sabse bhara shard   writes/sec            router CPU %   shard op-samay % (aakhri round)
    1    1 / 8                        1 sub-keys (100%)    11,78,284–12,01,651   2–3            [0, 0, 0, 0, 0, 99, 0, 0]
   10    5 / 8                        4 sub-keys ( 40%)    22,13,719–25,24,318   15–18          [77, 0, 35, 39, 0, 0, 98, 36]
   40    8 / 8                       10 sub-keys ( 25%)    27,09,896–32,55,640   29–30          [53, 40, 63, 50, 41, 62, 58, 96]
router CPU % = main thread ka CPU / samay. ~100% ho toh rukawat router hai, shard nahi.
shard op-samay % = worker ke andar op (SQL + loop) ka samay / kul samay; message kholna-bandh karna shaamil nahi.

B. Total padhna — 300 baar, har baar saare sub-keys ka jod (aakhri round ke counters)
split   tareeka                          shard calls   shards ka op-samay   median     p99      total sahi?
    1   ek key, ek call                      1             5 µs             43 µs    179 µs   haan (3,00,000)
   10   ek ek karke (serial)                10            69 µs            516 µs   1610 µs   haan (3,00,000)
   10   sab ek saath (parallel)             10            95 µs            173 µs    393 µs   haan (3,00,000)
   10   shard-wise ek call (parallel)        5            57 µs            119 µs    222 µs   haan (3,00,000)
   40   ek ek karke (serial)                40           317 µs           2196 µs   5254 µs   haan (3,00,000)
   40   sab ek saath (parallel)             40           346 µs            371 µs   1247 µs   haan (3,00,000)
   40   shard-wise ek call (parallel)        8           124 µs            166 µs    258 µs   haan (3,00,000)
```

Sub-key ke naam teeno rounds mein same hain, toh har round mein shards par same jagah (har round se pehle counters
khaali, timing ke bahar). Router CPU 2–30%; sabse busy shard ka op-samay 96–99% — shard wala raasta bhara hai.

- **Split 1:** saare votes ek key par → ek shard 98–99% busy, baaki 7 khaali. 11.3–12.4 lakh writes/sec. Vnodes aur 8 shards
  kuch kaam nahi aate: ek key ek hi jagah rehti hai.
- **Split 10:** 10 sub-keys 8 mein se sirf **5** shards par giri; ek shard ke paas 4 (40% votes). 18.3–26.0 lakh writes/sec,
  split 1 se ~1.5–2.2× — 10× nahi, kyunki 40% votes wala shard (97–98% busy) seema tay karta hai. **Split 40:** sab 8
  shards, sabse bhare par 10 sub-keys (25%); 25.8–33.6 lakh, ~2.1–2.8×.
- **Total padhna:** 1 call ki jagah 10 ya 40. Shards ka op-samay 1 key par 5–8 µs; 10 par 56–95 µs; 40 par 124–346 µs
  (tareeke par). Latency tareeke par: 40 calls ek ek karke 2.1–2.2 ms; ek saath 0.35–0.37 ms; har shard ko ek call
  (`key IN (…)`, 8 calls) ~0.17 ms (1 key: 0.04–0.07 ms). Video ka "reads 10× dheeme" kaam ke liye sahi, latency ke liye nahi.
- Aur raaste (lab mein nahi): writes ko app mein jodo aur har 100 ms ek baar `n = n + 4000` (coalescing); ya total ka cache.

## ex3-ids — B-tree mein kaunsi ID?

```
$ npm start -- ex3-ids
A. 10,00,000 rows (body 80–119 chars), 10,000 rows per transaction, synchronous = OFF

primary key                   cache 2 MB    cache 512 MB    file      leaf pages (kitne % bhare)
auto-increment INTEGER          0.75 s       0.63 s      106 MB   table 27,137 (99%)
Snowflake INTEGER               0.59 s       0.69 s      112 MB   table 28,651 (99%)
UUIDv7 BLOB                     1.14 s       1.33 s      132 MB   table 32,647 (89%)
UUIDv4 BLOB                     7.77 s       5.45 s      135 MB   table 33,330 (87%)
UUIDv4 TEXT (36 chars)          8.71 s       6.24 s      159 MB   table 38,949 (86%)
UUIDv4 BLOB, rowid + index      4.16 s       2.80 s      150 MB   index 6,725 (90%) + table 31,502 (98%)

2 MB = SQLite ka default cache: B-tree RAM mein nahi samaata. 512 MB: poora B-tree RAM mein.
"rowid + index" = rows integer rowid ki B-tree mein aakhir mein judti hain, UUID ek alag index mein.
(Postgres se milta-julta sirf itna: table ka data aur primary key ka index alag. Postgres heap B-tree nahi hai.)
UUIDv7: har ms ke 10 IDs ka random hissa alag hai, toh ek ms ke andar kram random; ms ke beech badhta hai.

B. Snowflake: 1 bit khaali | 41 bit ms (custom epoch 2020-01-01) | 10 bit machine | 12 bit sequence
  41 bit ms = 21,99,02,32,55,552 ms = 69.7 saal   10 bit = 1,024 machine ids   12 bit = 4,096 IDs per ms per machine
  ek ID: 830955375820951552  →  2026-04-12T00:00:00.000Z  machine 37  seq 0

  1. Do machines, 4,00,000 IDs: machine ids 1 aur 2 → duplicates 0;  galti se dono ko id 1 → duplicates 2,00,000
  2. Clock 5 ms peeche (20,000 IDs, beech mein): guard band → duplicates 50;  guard chalu (Twitter jaisa: mana karo) → duplicates 0, 40 requests mana
  3. Asli clock, 0.5 s tak jitni tez ho sake: 39,37,013 IDs/sec; 477 baar 4096 khatam → agle ms ka intezaar (seema 40,96,000/sec)
  4. Machine B ki ghadi 30 ms peeche, A aur B baari baari (1 lakh events): 50,000 jagah agla event chhota ID paata hai;
     ID ke order mein kuch events un events ke peeche aate hain jo asal mein 29 ms BAAD hue the
     → Snowflake "lagbhag" time-order (k-sorted) hai; ek chalte generator ke andar pakka badhta hai.
  5. Generator restart (same machine id 9, same ms): pehle 10 IDs, restart ke baad 10 → duplicates 10
     → guard sirf EK chalte generator ko bachata hai. Restart par aakhri ms yaad rakho (disk par) ya us ms ke guzarne tak ruko.
```

- **UUIDv4 random hai:** har insert B-tree ke kisi random leaf par. 10 lakh inserts, 2 MB cache: 7.60–7.81 s (UUIDv4 BLOB) vs
  0.75–0.78 s (auto-increment), ~10×. B-tree poora RAM mein (512 MB) ho tab bhi 5.45–5.69 s vs 0.57–0.63 s, ~9×. Text UUID (36 chars) aur bada: 159 MB vs 106 MB.
- **Snowflake aur UUIDv7 samay ke saath badhte hain:** ek chalte Snowflake generator ka naya ID hamesha sabse bada → B-tree ka
  daayan kinara. UUIDv7 naye ms ke paas judta hai, par lab ke 10 IDs per ms ke andar kram random (random hissa) — isliye
  "lagbhag" kinara. UUIDv7 0.98–1.14 s, Snowflake 0.58–0.59 s (2 MB cache).
- **Pages kitne bhare (SQLite ka sach):** integer rowid table par badhti key = 99% bhare (SQLite ka "aakhir mein jodo" tez
  raasta sirf rowid tables par). WITHOUT ROWID table mein UUIDv7 bhi 89%, UUIDv4 87% — farq bharaav se zyada **locality**
  ka hai: random insert har baar alag page chhoota hai. (InnoDB ka bartav alag hai; har engine naapo.)
- **Rowid + index:** rows integer rowid ki B-tree mein aakhir mein judti hain (98% bhare), sirf UUID index random → beech ka
  samay. Postgres se milta-julta sirf itna ki table ka data aur PK index alag hain; Postgres ki table heap hai, B-tree nahi,
  aur heap khaali jagah dobara bhar sakta hai. Lab ke numbers SQLite ke hain.
- **Snowflake:** 41 bit = 69.7 saal, 1,024 machine ids, 4,096 IDs/ms. Do machines ko same id → **2,00,000 duplicates**.
  Ghadi 5 ms peeche aur guard band → **50 duplicates**; guard chalu → 0 duplicates, 40 requests mana (Twitter ka code bhi
  mana karta hai). Ek thread JS mein ~40 lakh IDs/sec banata hai — seema (40.96 lakh) ke paas, isliye ~480 baar agle ms ka
  intezaar. Machine B ki ghadi 30 ms peeche → 50,000 jagah ulta order: Snowflake **lagbhag** time-order hai. Generator
  restart (same machine id, same ms) → **10 duplicates**: guard sirf ek chalte generator ki yaad hai. Restart par aakhri ms
  disk par rakho aur us ms ke guzarne tak ruko, ya machine id ka lease lo. Samay 41-bit khidki (epoch se ~69.7 saal) ke bahar
  ho toh generator RangeError deta hai.

## ex4-colocate — data saath rakho

```
$ npm start -- ex4-colocate
1,00,000 users, 5,00,000 orders, 4 shards. Users hamesha mix32(user_id) % 4 par.

Q1. Ek user + user ke 5 orders, 500 users
  layout A  shard calls 1   join shard ke andar (SQL)   shards ka op-samay  17 µs   median 68 µs   p99 212 µs
  layout B  shard calls 5   join app mein (JS)          shards ka op-samay  79 µs   median 140 µs   p99 386 µs
  user 777: dono layouts ka jawab ek jaisa? haan

Q2. "Pune ke users ke kitne biryani orders?" — shard key sawaal mein nahi, dono layouts chaaron shards se poochte hain
  layout A  19797 orders   shard calls 4   har shard apne andar join   bheje gaye ids 0        7.7 ms   shards ka op-samay 28.2 ms
  layout B  19797 orders   shard calls 8   pehle Pune ids, phir har shard ko list   bheje gaye ids 79,872   27.3 ms   shards ka op-samay 75.9 ms

Transfer: 2,000 baar ₹1 ek user se dusre ko; 2% baar app beech mein crash
  ek hi shard par: 498 transfers, 9 crash → ek transaction, crash par dono steps wapas
  do shards par:   1502 transfers, 38 crash → do alag commits, crash ke baad sirf debit hua
  kul paisa pehle ₹1,00,00,000, baad mein ₹99,99,962 → ₹38 gayab
```

- **Q1 (user + orders):** layout A ek call, join shard ke andar. Layout B 5 calls (user + chaaron shards se orders),
  join app mein; shards ka kaam ~4.5×, latency ~2×. Jawab dono ka ek jaisa.
- **Q2 (bina shard key):** dono layouts chaaron shards se poochte hain (scatter-gather). Layout A har shard par local join.
  Layout B ko pehle Pune ke ~20,000 user ids chahiye, phir Pune ki poori list chaaron shards ko (79,872 ids bheje); ~3× samay.
- **Transfer:** ek shard par dono steps ek transaction → crash (asli ROLLBACK) par kuch nahi bigda. Do shards par do alag
  commits → 38 crash = **₹38 gayab** (debit hua, credit nahi). Ilaaj lab mein nahi: 2PC, saga (wapas karne wala step),
  ya dono wallets ek shard par.

## ex5-backfill — purana DB → shards, traffic chalte hue

```
$ npm start -- ex5-backfill

A. Sirf race (dual write kabhi fail nahi)
   20,000 rows · backfill ke dauraan live: 4,185 update, 1,212 delete, 603 naye
   backfill kaise likhta hai     backfill ke baad: gayab  purani  zinda-hui    1000 ka sample   dobara backfill     + ulta sweep
   overwrite                                   0     98      30        3 pakde ( 1%: 0)    30 galat            0 galat
   if-absent                                   0      0      30        0 pakde (100%: 0)    30 galat            0 galat
   version                                     0      0      30        0 pakde (100%: 0)    30 galat            0 galat
   version+tombstone                           0      0       0        0 pakde (100%: 0)     0 galat            0 galat

B. Race + dual write 1% baar fail (log hua, dobara nahi bheja)
   20,000 rows · backfill ke dauraan live: 4,185 update, 1,212 delete, 603 naye · dual write fail: 55
   backfill kaise likhta hai     backfill ke baad: gayab  purani  zinda-hui    1000 ka sample   dobara backfill     + ulta sweep
   overwrite                                   5    120      34        4 pakde ( 0%: 0)    34 galat            0 galat
   if-absent                                   5     22      34        1 pakde (25%: 0)    56 galat           22 galat
   version                                     5     22      34        1 pakde (25%: 0)    34 galat            0 galat
   version+tombstone                           5     22       7        1 pakde (25%: 0)     7 galat            0 galat

gayab = purane mein hai, naye mein nahi · purani = naye mein purana version · zinda-hui = purane se delete, naye mein zinda
"(x%: 0)" = itne % chance ki 1000 ka random sample ek bhi galti na pakde (gayab + purani rows ke hisaab se)
sample sirf PURANE DB ke ids se chunta hai, isliye sample ko "zinda-hui" rows kabhi nahi dikhti. Zinda-hui rows ke liye ulta sweep chahiye.
```

Ek chunk ki kahani: backfill ne row 1234 **v1** padhi → beech mein user ne naam badla (**v2**, dual write se naye shard
par bhi v2) → backfill ab v1 likhta hai.

- **overwrite** (`INSERT OR REPLACE`): v1 ne v2 ko mita diya → **98 purani rows**; delete ke baad copy → **30 zinda-hui**.
- **if-absent** (`INSERT OR IGNORE`) aur **version** (`ON CONFLICT … WHERE excluded.version > version`): purani rows 0. Par
  zinda-hui 30 — delete ke baad naye shard mein row hi nahi, toh milane ko version nahi bacha.
- **version + tombstone:** delete = `deleted = 1` wali row, naye version ke saath. Purani copy ka version chhota → ignore.
  **0 galat.**
- **Compare poori row ka:** version aur naam dono milaaye jaate hain. Sirf version milaana galat data (same version, alag
  naam) chhod deta hai; test `corruptEvery` se galat naam pakadta hai, aur repair (purana DB jeetta hai, `>=`) theek karta hai.
- **B. 1% dual writes fail:** "log karo, aage badho" se 55 writes kabhi nahi pahunche. overwrite: 5 gayab, 120 purani,
  34 zinda-hui; sample ne 4 pakde. Baaki teen tareekon mein 5 gayab + 22 purani; zinda-hui if-absent/version mein 34,
  tombstone mein 7. **Sample check** (purane DB ki 19,391 rows se 1000 draws, replacement ke saath) ne in teen mein sirf 1
  pakda; ek bhi na pakadne ka chance (1 − 27/19391)^1000 ≈ 25% tha. Aur sample purane DB se chunta hai, isliye sample ko
  zinda-hui rows dikh hi nahi sakti.
- **Repair (lab mein live writes rok ke):** poori row ka compare, backfill dobara (version tareekon mein `>=`: purana DB
  jeetta hai) + ulta sweep (naye mein jo purane mein nahi, mitao) → version tareekon mein 0.
  if-absent mein 22 bache: un 22 ids ki row naye shard mein maujood thi, bas purani — insert-if-absent maujood row ko chhoota hi nahi. Asli system mein traffic
  rukta nahi; isliye durable replay (CDC — lab 10) ya outbox chahiye, "log" nahi.

## Kya seekha

| Sawaal | Lab ka jawab |
|---|---|
| `hash % N` mein shard jodna? | 4 → 5: 80% keys hilin; 100 → 101: 99%. Ring: sirf naye ka hissa |
| Time / badhti key se range shard? | Aaj ke saare writes ek shard par; baaki khaali |
| Hash shard ki keemat? | Range query har shard par (kaam ~2.8–3×) |
| Ek key par bheed? | Vnodes kaam nahi aate. Key todo — par collisions, aur padhna k calls |
| UUIDv4 primary key? | 8–10× dheeme inserts, badi file. UUIDv7 / Snowflake time se badhte hain |
| Snowflake kab duplicate? | Same machine id, ya ghadi peeche aur guard band |
| Joins aur transactions? | Saath rakho (co-location) toh shard ke andar. Shards ke beech crash = ₹ gayab |
| Backfill race? | Version check atomic + tombstone. Best-effort dual write + sample check = chhupi galtiyan |

## Files

| File | Kya |
|---|---|
| `lib/cluster.js`, `lib/shard-worker.js` | N shards = N worker threads, har ek ki SQLite file; `run`, `each`, `steps` (ek transaction) |
| `lib/hash.js`, `lib/ring.js` | MD5 ke 4 bytes, MurmurHash3 finalizer; `hash % N`, ring + vnodes |
| `lib/ids.js` | Snowflake (guard, sequence, decode), UUIDv4, UUIDv7 |
| `lib/backfill.js` | ex5 ka race: dual write, chunked backfill, 4 likhne ke tareeke, compare, sample, repair |
| `tools/*.js` | Har exercise ka tool (`moves`, `keys`, `hotkey`, `ids`, `colocate`, `backfill`) |
| `test/core.test.js` | 9 tests (mod N ka formula, ring jodna/hatana, Snowflake + 41-bit khidki + restart, UUID bits + same-ms kram, backfill + galat data, sample check aur chance, rollback, split counter, page fill) |
| `captures/` | Har tool ke asli runs (ex1–ex4: 3 runs; `ex3-ids-b.txt` = sirf Snowflake hissa) + `test.txt` |

## Practice

1. ex2 mein `SPLITS` mein 8 daalo. Kya har shard ko ek sub-key milti hai? (Hash ko tumhara "8" pata nahi.)
2. ex1 mein shard key `user` karo. Kaunsa sawaal sasta hua, kaunsa mehnga?
3. ex5 mein `gapOps` 0 karo. Race kyun gaayab hui? Asli system mein gap kab 0 hota hai?
4. ex3 mein `PER_MS` 1000 karo. UUIDv7 ke pages par kya asar? (Ek ms ke andar UUIDv7 random hai.)

## Source ke daave aur sudhaar

Video 7 ke daave, lab aur primary sources se jaanche (Codex ne sources check kiye: `sdg-codex-xp/jobs/fp7/CLAIMS-REVIEW.md`).

| Video kehta hai | Sach / sudhaar | Kahan se |
|---|---|---|
| `hash % N`: N se N+1 par (N−1)/N keys hilti hain | Jodne par **N/(N+1)** hilti hain (N = pehle ki ginti): 4→5 = 80%, 100→101 = 99.0%. (N−1)/N **hatane** ka formula hai (5→4 = 80%). Video ke examples naye N se sahi aate hain | ex0 + test 1 |
| Ring par ek server jodo toh 1/N data hilta hai | Ausat **1/(N+1)** (naye server ka hissa). Kisi ek ring par kam-zyada: lab mein 4→5 par 17.4% (ideal 20%) | ex0, Karger 1997, Dynamo §4.2 |
| Ring A=12, B=1, C=2 baje: C ke paas lagbhag poora ring | Clockwise niyam se lamba hissa (2 → 12) **A** ka hai; C ke paas sirf 1 → 2 | Dynamo §4.2 ka successor niyam |
| SHA-1 ring: upar 0, neeche 2^160 | Values 0 … 2^160−1; 2^160 wapas 0 par. Neeche (6 baje) 2^159 | RFC 3174 |
| Vnodes se load "perfectly" barabar | Barabar ke **kareeb**, poora nahi (lab 34: 1.2×). Hot key aur alag row sizes vnodes se theek nahi hote | lab 34, ex2 |
| Consistent hashing: Cassandra, DynamoDB, Discord, Redis, Akamai | Cassandra (token ring), Discord (Elixir ring), Akamai (cluster ke andar): haan. **Redis Cluster: nahi** — 16,384 hash slots, CRC16(key) mod 16384. Ring **Dynamo (2007 paper)** mein hai; DynamoDB service ka andar ka tareeka docs mein ring nahi bataata | Cassandra docs, Discord blog, Akamai paper, Redis cluster spec, DynamoDB paper 2022 |
| Memcached hash mod N use karta hai | Memcached servers khud shard nahi karte; **clients** karte hain. Purane clients mod N, phir 2007 mein libketama (consistent hashing) | memcached docs, libketama announcement |
| Hash se "saare servers barabar busy" | Hash **alag keys** ko barabar baant'ta hai; ek key par bheed (hot key) wahin rehti hai | ex2 (split 1 = ek shard) |
| Alphabet: A–M shelf overflow, kyunki S naam zyada | S, X, Z teeno **N–Z** shelf par hain; example ulta hai. Skew asli ginti se naapo | video ka apna example |
| Range sharding "usually a trap" | Time jaisi badhti key hotspot banati hai (ex1: April shard 97% busy, baaki 0%). Par range ka faayda bhi asli: ek ghante ki query 1 shard, hash par 4 (shards ka op-samay ~3×) | ex1 |
| Key 10 mein todo: writes 10× tez, reads 10× dheeme | 10 sub-keys 8 shards mein se sirf 5 par giri (ek par 40%); writes ~1.5–2.2× tez. Reads 10 calls, par latency tareeke par: serial 0.51–0.55 ms, parallel 0.16–0.17 ms, shard-wise (5 calls) 0.11–0.12 ms (1 key: 0.04–0.07 ms) | ex2 |
| UUIDv4: random page, random disk IO | Haan, random keys locality tod'ti hain: 10 lakh inserts 5.4 s vs 0.6 s (B-tree poora RAM mein hone par bhi). Par "disk" tabhi jab page RAM mein na ho. Postgres mein rows heap mein, sirf PK index random | ex3, InnoDB / SQLite / Postgres docs |
| Snowflake: 41 bit time = 69 saal, 10 bit = 1,024 shards, 12 bit sequence | 69.7 saal; 1,024 **generator ids** (Twitter: 5 bit datacenter + 5 bit worker), shards nahi; 4,096 IDs per ms per generator | Twitter README + IdWorker.scala, ex3 B |
| Do servers kabhi same ID nahi banaate; IDs hamesha badhte hain | Sirf tab jab machine id **alag** ho, ghadi **peeche na jaaye**, aur restart ke baad generator aakhri ms ke baad se chale. Twitter ka code ghadi peeche jaane par mana karta hai. Machines ke beech order sirf **lagbhag** (k-sorted) | ex3 B (2 lakh duplicates, 50 duplicates, 29 ms ulta order, restart par 10 duplicates) |
| "UUIDv4 band karo, ULID ya Snowflake lo" | **UUIDv7** bhi (RFC 9562, May 2024): pehle 48 bit Unix ms; ek ms ke andar random (jab tak monotonic counter na lagao). ex3 mein UUIDv7 ~1 s vs UUIDv4 ~7.7 s | ex3, RFC 9562 |
| Backfill race ka ilaaj: naya timestamp ho tabhi likho | Version check **ek atomic statement** mein (ON CONFLICT … WHERE). Par delete ke liye tombstone chahiye: row hi nahi toh version kisse milaoge? | ex5 A (version: 30 rows zinda; + tombstone: 0) |
| Random sample se verify, "100% consistency" tak | Sample saabit nahi karta: ex5 B mein 27 galat rows par 1000 ka sample 25% baar kuch nahi pakadta; aur sample purane DB se chuna toh zinda-hui rows kabhi nahi dikhti | ex5 B |
| Rollback safe, "DB old ke paas saare latest writes" | Tabhi tak jab har write (delete bhi) pehle old mein pakka ho. Best-effort dual write ke fail "log" se theek nahi hote — durable replay (CDC, outbox) chahiye | ex5 B, lab 10 |
| Shard karo toh joins aur ACID gaye | Ek shard key par saath rakhi rows (co-location) ke join aur transaction **shard ke andar** chalte hain. Shards ke beech 2PC jaise tareeke hain, mehnge | ex4 |
| Do guna tez server paanch guna mehnga; 4 TB RAM DB ko restart mein ek ghanta | Bina source ke numbers. AWS par aaj 32 TiB RAM wali machines hain (u7in-32tb) | AWS EC2 docs |

## Sources

- Karger et al., *Consistent Hashing and Random Trees*, STOC 1997 — https://people.csail.mit.edu/karger/Papers/web.pdf
- DeCandia et al., *Dynamo: Amazon's Highly Available Key-value Store*, SOSP 2007, §4.2 — https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf
- Cassandra architecture (token ring) — https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- Redis Cluster spec (16,384 hash slots) — https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Discord, *How Discord Scaled Elixir to 5,000,000 Concurrent Users* — https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users
- libketama announcement (2007) — https://www.metabrew.com/article/libketama-consistent-hashing-algo-memcached-clients
- Twitter Snowflake README + IdWorker.scala — https://github.com/twitter-archive/snowflake/tree/snowflake-2010
- RFC 9562 (UUIDv7) — https://www.rfc-editor.org/rfc/rfc9562.html
- SQLite WITHOUT ROWID — https://www.sqlite.org/withoutrowid.html · InnoDB clustered index — https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html
- DynamoDB write sharding (random suffix) — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
- Stripe, *Online migrations at scale* — https://stripe.com/blog/online-migrations
- PostgreSQL INSERT … ON CONFLICT — https://www.postgresql.org/docs/current/sql-insert.html
- Citus co-location — https://docs.citusdata.com/en/stable/sharding/data_modeling.html
