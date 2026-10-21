# 🐳 Lab 40 — Disaster recovery: region gaya, ab kitni der aur kitna data?

System Gurukul → 🛡️ Resilience → **Disaster Recovery** ka lab. Zero dependency Node (18+).
Source video (credit): Software Developer Diaries — "This architecture will save your system.. here's how" (AWS ki chaar DR strategies).
(Is lab ka pehla roop sirf `ex1-dr-tiers` tha. Ab uske neeche do chhoti library files hain — copy ka niyam aur failover ka niyam — aur chaar slow motion tools.)

```bash
node tools/slowmo.js             # ex0 — slow motion 1: region A gaya        [--mode backup|pilot|warm|active] [--fast]
node tools/slowmo-sync.js        #       slow motion 2: pehle "ho gaya" ya pehle copy?   [--mode async|sync|async-b-down|sync-b-down] [--fast]
node tools/slowmo-dns.js         #       slow motion 3: failover ho gaya, par grahak purane pate par (MODEL)   [--mode lamba|chhota] [--fast]
node tools/slowmo-galti.js       #       slow motion 4: galti bhi copy ho jaati hai   [--mode replica|backup] [--fast]
node tools/mini.js [--sync]      #       sabse chhota chalta program: ek app + lib/replicator.js (port 5195)
npm start ex1-dr-tiers    → node tools/dr.js         # [--strategy backup|pilot|warm|active]        router 5190 · region A 5191 · region B 5192 · S3 5193
npm start ex2-sync-async  → node tools/syncrepl.js   # [--row async|sync|async-b-down|sync-b-down]  region A 5191 · region B 5192
docker compose --profile ex1-dr-tiers up --build     # (ya ex2-sync-async)
```

KhanaKart ek region (**A**) mein chalta hai. Doosra region (**B**) "disaster ke liye" rakha hai. Ek din region A gaya. Do number batate hain ki din kitna bura tha:

| Number | Matlab | Kisse banta hai |
|---|---|---|
| **RTO** | kitni der orders fail hote rahe | pata chalna (health check) + B ko jo banana / boot / bada karna pade (+ asli duniya mein: grahak kitni der purane pate par) |
| **RPO** | kitne orders ko "ho gaya" mila, par B mein nahi hain | woh orders jo copy ke **intezaar** mein the, jab A gaya |

Copy karna **har strategy mein ek hi tareeka** hai: `lib/replicator.js`. Strategy badalne par sirf yeh badalta hai ki order copy hone se pehle kitni der **jama** rehta hai:
snapshot mein 3 s · replication mein 1 s tak · sync mein 0 (B ka jawab aane tak "ho gaya" nahi bolte).
Aur **ek line** RPO tay karti hai — "ho gaya" copy se PEHLE bola, ya BAAD mein?

| File | Kya hai |
|---|---|
| `lib/replicator.js` | **Copy ka niyam, 43 line** (37 line ka asli kaam): `write()` · `tick()` · `pending()` · `apply()`. async: pehle "ho gaya", copy baad mein (list `waiting`). sync: pehle doosre region ka jawab, phir "ho gaya". **RPO yahin paida hota hai.** `services/region.js`, `tools/slowmo*.js` aur `tools/mini.js` yahi chalate hain. |
| `lib/failover.js` | **Router ka faisla, 16 line** (14 line ka asli kaam): lagataar kitne health check fail hue — threshold par `true`, sirf ek baar. `services/router.js` aur slow motion tools yahi chalate hain. |
| `services/region.js` | Ek region: app + orders ka DB. `POST /config {strategy}` tay karti hai B mein kya chalta hai (backup / pilot / warm / active). ex2 ke liye `mode`, `everyMs`, `rttMs` aur `POST /blackout`. |
| `services/router.js` | Route 53 jaisa router (har 500 ms A ka health check, lagataar 3 fail → B) + S3 jaisa bucket (batch par batch jama, koi overwrite nahi; `GET /restore`). |
| `tools/dr.js` | ex1: chaar strategies, asli raftaar. |
| `tools/syncrepl.js` | ex2: sync vs async, asli raftaar. |
| `tools/slowmo.js` · `slowmo-sync.js` · `slowmo-dns.js` · `slowmo-galti.js` | ex0: chaar slow motion — ek event ek line, ghadi tay. |
| `tools/sim.js` | Nakli ghadi (fixed clock): chaaron slow motion yahi chalate hain. |
| `tools/mini.js` | Sabse chhota chalta program: ek app + `lib/replicator.js`. |
| `docker-compose.yml` | Wahi services container mein. **Chala ke nahi dekhi gayi.** |

⏱️ **Samay chhota kiya hai.** Slow motion mein B ko banane ke 6.00 s, app boot ke 3.00 s, bada karne ke 2.00 s — asli duniya mein yeh ghante / minute hote hain. "Har 3 s snapshot" asli mein "har ghante". Kram (order) aur kaaran asli hain, seconds nahi.

Numbers ek laptop (WSL, Node v24.18.0) par 2026-10-10 ke runs ke hain. Slow motion tools aur `mini.js` mein ghadi tay hai — teen-teen run mein output **akshar-akshar wahi** aaya (ek asli raftaar par, do `--fast`).
`dr.js` aur `syncrepl.js` asli raftaar wale hain: number har run mein thode badalte hain, isliye neeche teen run ka **dayra** hai; **tarteeb wahi rehti hai**.
Docker aur AWS is machine par nahi hain: compose file chala ke **nahi dekhi gayi**, aur "AWS mein" wala hissa sirf documentation ke quote hain.

---

## ex0-slowmo — pehle yeh chalao

### Slow motion 1: region A gaya

KhanaKart ke orders: har 0.5 s par ek. Router har 0.5 s par region A se poochhta hai "theek ho?"; lagataar 3 baar "nahi" → saara traffic B par. Region A 4.00 s par gaya.
Ek hi pal par kram: copy ki ghadi → router ka check → order → (A ka jaana). Yaani 4.00 s wala order A ko mil jaata hai aur uska "ho gaya" bhi, phir A jaata hai.

```
$ node tools/slowmo.js --mode pilot
region A gaya · har 0.5 s par ek order · router har 0.5 s par A ko poochhta hai, lagataar 3 "nahi" → B par · A 4.00 s par gaya
ghadi nakli aur tay hai · copy: backup mein har 3 s, baaki mein har 1 s · B banane / boot / bada karne mein 6 / 3 / 2 s

=== pilot light — B ka DB chalu (copy har 1 s) · B ka app band, failover ke baad boot (3 s) ===
    0.00 s  #1  → A ✓   A mein: 1 · B tak pahunche: 0 · raaste mein: 1
    0.50 s  🩺 router ne A se poochha: theek ✓ (aage har 0.5 s par; sirf badlav dikhega)
    0.50 s  #2  → A ✓   A mein: 2 · B tak pahunche: 0 · raaste mein: 2
    1.00 s  📦 copy: A → B   #1, #2 (2 order)
    1.00 s  #3  → A ✓   A mein: 3 · B tak pahunche: 2 · raaste mein: 1
    1.50 s  #4  → A ✓   A mein: 4 · B tak pahunche: 2 · raaste mein: 2
    2.00 s  📦 copy: A → B   #3, #4 (2 order)
    2.00 s  #5  → A ✓   A mein: 5 · B tak pahunche: 4 · raaste mein: 1
    2.50 s  #6  → A ✓   A mein: 6 · B tak pahunche: 4 · raaste mein: 2
    3.00 s  📦 copy: A → B   #5, #6 (2 order)
    3.00 s  #7  → A ✓   A mein: 7 · B tak pahunche: 6 · raaste mein: 1
    3.50 s  #8  → A ✓   A mein: 8 · B tak pahunche: 6 · raaste mein: 2
    4.00 s  📦 copy: A → B   #7, #8 (2 order)
    4.00 s  #9  → A ✓   A mein: 9 · B tak pahunche: 8 · raaste mein: 1
    4.00 s  💥 region A gaya — jo orders sirf A mein the (raaste mein), woh ab kabhi nahi pahunchenge: #9
    4.50 s  🩺 A ✗ (lagataar fail 1/3)
    4.50 s  #10 → A ✗ (A band hai)
    5.00 s  🩺 A ✗ (lagataar fail 2/3)
    5.00 s  #11 → A ✗ (A band hai)
    5.50 s  🩺 A ✗ (lagataar fail 3/3) → FAILOVER: router ne B ko "activate" kaha, ab saara traffic B par
    5.50 s  🚀 B ka DB chal raha hai, app band — app boot mein 3 s (8.50 s par khulega)
    5.50 s  #12 → B ✗ (B ka app boot ho raha hai)
    6.00 s  #13 → B ✗ (B ka app boot ho raha hai)
    6.50 s  #14 → B ✗ (B ka app boot ho raha hai)
    7.00 s  #15 → B ✗ (B ka app boot ho raha hai)
    7.50 s  #16 → B ✗ (B ka app boot ho raha hai)
    8.00 s  #17 → B ✗ (B ka app boot ho raha hai)
    8.50 s  🚪 B ka app khul gaya
    8.50 s  #18 → B ✓   B mein: 9
    9.00 s  #19 → B ✓   B mein: 10
    9.50 s  #20 → B ✓   B mein: 11
   10.00 s  #21 → B ✓   B mein: 12
   10.50 s  #22 → B ✓   B mein: 13
   11.00 s  #23 → B ✓   B mein: 14
   11.50 s  #24 → B ✓   B mein: 15
   12.00 s  #25 → B ✓   B mein: 16
   12.50 s  #26 → B ✓   B mein: 17
   13.00 s  #27 → B ✓   B mein: 18
   nateeja → A 4.00 s par gaya · router ko pata 5.50 s par · orders phir se safal: 8.50 s par (A ke 4.50 s baad)
             fail hue: 8 order (#10–#17) · "ho gaya" mila par B mein nahi: #9 (1 order)
             aam din B mein: sirf DB chalu (copy leta rehta hai) · app band
```

Chaaron mode (`node tools/slowmo.js`):

| Strategy | Aam din B mein | Failover ke baad B ko kya karna pada | Orders phir se safal (A ke baad) | Fail hue order | "Ho gaya" mila, par B mein nahi |
|---|---|---|---|---|---|
| backup & restore | kuch nahi chalta; A har 3 s par S3 mein copy bhejta hai | machines + DB banao (6 s), phir S3 se restore | **11.50 s** (A ke 7.50 s baad) | 14 (#10–#23) | #7–#9 (3) |
| pilot light | DB chalu (copy har 1 s), app band | app boot (3 s) | **8.50 s** (A ke 4.50 s baad) | 8 (#10–#17) | #9 (1) |
| warm standby | DB + chhota app (1 s mein 1 order) | chhota app ko bada karo (2 s) | **7.50 s** (A ke 3.50 s baad) | 4 (#10, #11, #13, #15) | #9 (1) |
| active-active | poora region, aadha traffic | kuch nahi — A ka hissa bhi le lo | **5.50 s** (A ke 1.50 s baad) | 1 (#11) | #9 (1) |

👉 **RTO = pata chalna + B ka kaam.** Pata chalna: 1.50 s (3 × 0.5 s). Phir B ka kaam: 6.00 s (banao) / 3.00 s (boot) / 2.00 s (bada karo) / 0.
Jod: **7.50 / 4.50 / 3.50 / 1.50 s**.

👉 **RPO = jo copy ke intezaar mein tha.** 4.00 s par #9 ko "ho gaya" mila — aur usi pal A gaya. Woh `waiting` list mein tha, B tak nahi pahuncha tha.
Replication wale teen mode mein copy har 1 s par jaati hai: sirf #9 gaya. Backup mein snapshot har 3 s par: **#7–#9** (3 order).

👉 **Warm standby ki chhupi keemat**: B ka chhota app 1 s mein 1 order leta hai, isliye bade hone se pehle aadhe orders fail (#10, #11, #13, #15).
**Active-active**: B pehle se aadha traffic le raha tha, sirf A ka ek order (#11) fail hua.

### Slow motion 2: pehle "ho gaya" ya pehle copy?

Region A orders leta hai; B ka DB chalu hai. A se B tak ek chakkar 0.20 s (nakli). Ek line ka fark — `lib/replicator.js` ke `write()` mein:

```
async:  apply(change);          // pehle yahan rakho
        waiting.push(change);   // copy baad mein   → caller TURANT "ho gaya" bolta hai
sync:   await ship([change]);   // pehle wahan, fail = throw
        apply(change);          // phir yahan       → caller ab "ho gaya" bolta hai
```

```
$ node tools/slowmo-sync.js --mode async
pehle "ho gaya" ya pehle copy? · har 0.5 s par ek order · A se B tak ek chakkar 0.20 s (nakli) · async mein copy har 1 s

=== async — pehle "ho gaya", copy baad mein (har 1 s) ===
    0.00 s  #1  aaya → "ho gaya" ✓ turant   A mein: 1 · B mein: 0 · raaste mein: 1
    0.50 s  #2  aaya → "ho gaya" ✓ turant   A mein: 2 · B mein: 0 · raaste mein: 2
    1.00 s  📦 copy shuru: A → B   #1, #2
    1.00 s  #3  aaya → "ho gaya" ✓ turant   A mein: 3 · B mein: 0 · raaste mein: 3
    1.20 s  📬 B ne rakh liye: #1, #2   (B mein ab 2)
    1.50 s  #4  aaya → "ho gaya" ✓ turant   A mein: 4 · B mein: 2 · raaste mein: 2
    2.00 s  📦 copy shuru: A → B   #3, #4
    2.00 s  #5  aaya → "ho gaya" ✓ turant   A mein: 5 · B mein: 2 · raaste mein: 3
    2.20 s  📬 B ne rakh liye: #3, #4   (B mein ab 4)
    2.50 s  #6  aaya → "ho gaya" ✓ turant   A mein: 6 · B mein: 4 · raaste mein: 2
    3.00 s  📦 copy shuru: A → B   #5, #6
    3.00 s  #7  aaya → "ho gaya" ✓ turant   A mein: 7 · B mein: 4 · raaste mein: 3
    3.10 s  💥 region A gaya — "ho gaya" mil chuka par B tak nahi pahunche: #5–#7 (copy raaste mein thi: #5, #6 · list mein the: #7)
   nateeja → "ho gaya" mila: 7 order · ho gaya kehne mein: har baar 0.00 s
             A 3.10 s par gaya → "ho gaya" mila par B mein nahi: #5–#7 (3 order)

$ node tools/slowmo-sync.js --mode sync
pehle "ho gaya" ya pehle copy? · har 0.5 s par ek order · A se B tak ek chakkar 0.20 s (nakli) · async mein copy har 1 s

=== sync — pehle B ka jawab (0.2 s), phir "ho gaya" ===
    0.00 s  #1  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)
    0.20 s  #1  → "ho gaya" ✓ (0.20 s baad)   A mein: 1 · B mein: 1 · raaste mein: 0
    0.50 s  #2  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)
    0.70 s  #2  → "ho gaya" ✓ (0.20 s baad)   A mein: 2 · B mein: 2 · raaste mein: 0
    1.00 s  #3  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)
    1.20 s  #3  → "ho gaya" ✓ (0.20 s baad)   A mein: 3 · B mein: 3 · raaste mein: 0
    1.50 s  #4  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)
    1.70 s  #4  → "ho gaya" ✓ (0.20 s baad)   A mein: 4 · B mein: 4 · raaste mein: 0
    2.00 s  #5  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)
    2.20 s  #5  → "ho gaya" ✓ (0.20 s baad)   A mein: 5 · B mein: 5 · raaste mein: 0
    2.50 s  #6  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)
    2.70 s  #6  → "ho gaya" ✓ (0.20 s baad)   A mein: 6 · B mein: 6 · raaste mein: 0
    3.00 s  #7  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)
    3.10 s  💥 region A gaya — #7 B ke jawab ka intezaar kar raha tha: customer ko "ho gaya" nahi mila (fail), A mein bhi nahi tha. Jinko "ho gaya" mila, sab B mein hain
   nateeja → "ho gaya" mila: 6 order · ho gaya kehne mein: har baar 0.20 s
             A 3.10 s par gaya → "ho gaya" mila par B mein nahi: koi nahi (0 order)
```

Chaaron mode (`node tools/slowmo-sync.js`; `*-b-down` mein B 2.00 s se 4.00 s tak unreachable, A poora waqt theek):

| Mode | "Ho gaya" kehne mein | A 3.10 s par gaya: "ho gaya" mila, par B mein nahi | B 2 s unreachable: fail hue order | Sabse badi waiting list |
|---|---|---|---|---|
| async | har baar 0.00 s | **#5–#7** (3 order) | — | — |
| sync | har baar 0.20 s | **koi nahi** (0 order); #7 ko jawab hi nahi mila (fail) | — | 0 |
| async-b-down | har baar 0.00 s | (A poora waqt theek) | 0 | **7** order |
| sync-b-down | har baar 0.20 s (fail hone mein 0.40 s) | (A poora waqt theek) | **4** (#5–#8) | 0 |

👉 **async**: "ho gaya" turant. Par A 3.10 s par gaya toh jo B ke jawab ke intezaar mein tha — #5, #6 raaste mein, #7 list mein — woh A ke saath gaya: **#5–#7 (3 order)**.
👉 **sync**: har order mein ek poora chakkar. A gaya tab #7 B ke jawab ka intezaar kar raha tha — customer ko "ho gaya" **nahi** mila, aur A ke DB mein bhi nahi tha. Jis jis ko "ho gaya" mila, sab B mein hain.
👉 **B unreachable**: async mein koi order fail nahi, par waiting list 7 tak badhi — A usi pal jaata toh itne order jaate. sync mein 4 order fail (#5–#8), har ek B ka jawab 0.40 s dekh ke; A mein unka kuch bacha nahi.
👉 Sync ka RPO sasta nahi: har order mein ek chakkar, aur B nahi mila toh A orders lena band. Asli raftaar par yahi ex2 mein.

### Slow motion 3: failover ho gaya, par grahak purane pate par (MODEL)

⚠️ Yeh **model** hai, asli DNS resolver nahi. Teen grahak "khanakart.in kahan hai?" ka jawab TTL seconds tak yaad rakhte hain. Router 1.50 s mein pata kar leta hai aur DNS ka pata B par badal deta hai (5.50 s par).
Jinhone pichhli baar alag-alag waqt par poochha tha, woh alag-alag waqt par dobara poochhte hain. B pehle se tayyar hai — taaki sirf pate ka asar dikhe.

```
$ node tools/slowmo-dns.js --mode lamba
failover ho gaya, par grahak purane pate par · MODEL, asli DNS nahi · 3 grahak, har 0.5 s par ek-ek order · A 4.00 s par gaya

=== lamba TTL — grahak pata 6 s tak yaad rakhte hain (MODEL) ===
    3.00 s  yaad kiya hua pata: grahak-1 → A (5.00 s tak) · grahak-2 → A (7.00 s tak) · grahak-3 → A (9.00 s tak)
    3.00 s  grahak-1 → A ✓   grahak-2 → A ✓   grahak-3 → A ✓
    3.50 s  grahak-1 → A ✓   grahak-2 → A ✓   grahak-3 → A ✓
    4.00 s  grahak-1 → A ✓   grahak-2 → A ✓   grahak-3 → A ✓
    4.00 s  💥 region A gaya
    4.50 s  🩺 A ✗ (lagataar fail 1/3)
    4.50 s  grahak-1 → A ✗   grahak-2 → A ✗   grahak-3 → A ✗
    5.00 s  🩺 A ✗ (lagataar fail 2/3)
    5.00 s  🔎 grahak-1 ne DNS se dobara poochha → A (pata abhi badla nahi; A band hai) · ab 11.00 s tak yaad
    5.00 s  grahak-1 → A ✗   grahak-2 → A ✗   grahak-3 → A ✗
    5.50 s  🩺 A ✗ (lagataar fail 3/3) → FAILOVER: DNS ka pata ab B
    5.50 s  grahak-1 → A ✗   grahak-2 → A ✗   grahak-3 → A ✗
    6.00 s  grahak-1 → A ✗   grahak-2 → A ✗   grahak-3 → A ✗
    6.50 s  grahak-1 → A ✗   grahak-2 → A ✗   grahak-3 → A ✗
    7.00 s  🔎 grahak-2 ne DNS se dobara poochha → B (naya pata mila) · ab 13.00 s tak yaad
    7.00 s  grahak-1 → A ✗   grahak-2 → B ✓   grahak-3 → A ✗
    7.50 s  grahak-1 → A ✗   grahak-2 → B ✓   grahak-3 → A ✗
    8.00 s  grahak-1 → A ✗   grahak-2 → B ✓   grahak-3 → A ✗
    8.50 s  grahak-1 → A ✗   grahak-2 → B ✓   grahak-3 → A ✗
    9.00 s  🔎 grahak-3 ne DNS se dobara poochha → B (naya pata mila) · ab 15.00 s tak yaad
    9.00 s  grahak-1 → A ✗   grahak-2 → B ✓   grahak-3 → B ✓
    9.50 s  grahak-1 → A ✗   grahak-2 → B ✓   grahak-3 → B ✓
   10.00 s  grahak-1 → A ✗   grahak-2 → B ✓   grahak-3 → B ✓
   10.50 s  grahak-1 → A ✗   grahak-2 → B ✓   grahak-3 → B ✓
   11.00 s  🔎 grahak-1 ne DNS se dobara poochha → B (naya pata mila) · ab 17.00 s tak yaad
   11.00 s  grahak-1 → B ✓   grahak-2 → B ✓   grahak-3 → B ✓
   11.50 s  grahak-1 → B ✓   grahak-2 → B ✓   grahak-3 → B ✓
   12.00 s  grahak-1 → B ✓   grahak-2 → B ✓   grahak-3 → B ✓
   nateeja → DNS ka pata 5.50 s par B ho gaya (A ke 1.50 s baad) · B pehle se tayyar tha
             grahak-1: 13 order fail (4.50 s se 10.50 s tak) · phir safal 11.00 s se — DNS badalne ke 5.50 s baad
             grahak-2: 5 order fail (4.50 s se 6.50 s tak) · phir safal 7.00 s se — DNS badalne ke 1.50 s baad
             grahak-3: 9 order fail (4.50 s se 8.50 s tak) · phir safal 9.00 s se — DNS badalne ke 3.50 s baad
             kul 27 order fail · sabse der se laga: grahak-1 (DNS badalne ke 5.50 s baad)
```

Dono mode (`node tools/slowmo-dns.js`):

| Mode | grahak-1 | grahak-2 | grahak-3 | Kul fail | Sabse der se laga |
|---|---|---|---|---|---|
| lamba TTL (6 s) | 13 fail · safal 11.00 s se | 5 fail · safal 7.00 s se | 9 fail · safal 9.00 s se | **27** | grahak-1: DNS badalne ke 5.50 s baad |
| chhota TTL (1 s) | 2 fail · safal 5.50 s se | 3 fail · safal 6.00 s se | 3 fail · safal 6.00 s se | **8** | grahak-2: DNS badalne ke 0.50 s baad |

👉 **Pata badalne ke baad bhi order fail**: lamba TTL mein kul 27 order (13 / 5 / 9), chhota TTL mein 8 (2 / 3 / 3).
👉 **Sabse bura grahak**: grahak-1 ne 0.50 s nahi, DNS badalne se **thik pehle** (5.00 s par) poochha — jawab abhi purana (A) mila, aur woh poora TTL purane pate par raha: 13 order fail, safal 11.00 s se.
👉 **Chhota TTL bhi 0 nahi karta**: pata chalne ka 1.50 s tab bhi lagta hai (har grahak ke kam se kam 2 order fail). TTL sirf "pata badalne ke baad" ka intezaar chhota karta hai.

### Slow motion 4: galti bhi copy ho jaati hai

Region A poora waqt theek. Har 0.5 s par ek order. 7.75 s par kisi se galti ho gayi: A par "saare orders mita do" (DELETE) chal gaya.
Copy `lib/replicator.js` karta hai — use nahi pata ki badlav galti hai ya sahi: DELETE bhi ek "badlav" (`{ type: 'delete-all' }`) hai, order jaisa. Woh bhi B tak jaata hai.

```
$ node tools/slowmo-galti.js --mode backup
galti bhi copy ho jaati hai · har 0.5 s par ek order · A poora waqt theek · 7.75 s par A par "saare orders mita do" · replica ko copy har 1 s

=== replica + backup — B ko har 1 s par copy, S3 mein har 3 s par snapshot (jama hote jaate hain) ===
    0.00 s  #1  → A ✓   A mein: 1 · B mein: 0 · raaste mein: 1
    0.50 s  #2  → A ✓   A mein: 2 · B mein: 0 · raaste mein: 2
    1.00 s  📦 copy: A → B   #1, #2 (2 badlav)
    1.00 s  #3  → A ✓   A mein: 3 · B mein: 2 · raaste mein: 1
    1.50 s  #4  → A ✓   A mein: 4 · B mein: 2 · raaste mein: 2
    2.00 s  📦 copy: A → B   #3, #4 (2 badlav)
    2.00 s  #5  → A ✓   A mein: 5 · B mein: 4 · raaste mein: 1
    2.50 s  #6  → A ✓   A mein: 6 · B mein: 4 · raaste mein: 2
    3.00 s  📦 copy: A → B   #5, #6 (2 badlav)
    3.00 s  📸 snapshot #1: A → S3   6 order (#1–#6)
    3.00 s  #7  → A ✓   A mein: 7 · B mein: 6 · raaste mein: 1
    3.50 s  #8  → A ✓   A mein: 8 · B mein: 6 · raaste mein: 2
    4.00 s  📦 copy: A → B   #7, #8 (2 badlav)
    4.00 s  #9  → A ✓   A mein: 9 · B mein: 8 · raaste mein: 1
    4.50 s  #10 → A ✓   A mein: 10 · B mein: 8 · raaste mein: 2
    5.00 s  📦 copy: A → B   #9, #10 (2 badlav)
    5.00 s  #11 → A ✓   A mein: 11 · B mein: 10 · raaste mein: 1
    5.50 s  #12 → A ✓   A mein: 12 · B mein: 10 · raaste mein: 2
    6.00 s  📦 copy: A → B   #11, #12 (2 badlav)
    6.00 s  📸 snapshot #2: A → S3   12 order (#1–#12)
    6.00 s  #13 → A ✓   A mein: 13 · B mein: 12 · raaste mein: 1
    6.50 s  #14 → A ✓   A mein: 14 · B mein: 12 · raaste mein: 2
    7.00 s  📦 copy: A → B   #13, #14 (2 badlav)
    7.00 s  #15 → A ✓   A mein: 15 · B mein: 14 · raaste mein: 1
    7.50 s  #16 → A ✓   A mein: 16 · B mein: 14 · raaste mein: 2
    7.75 s  🗑️ GALTI: kisi ne A par "saare orders mita do" (DELETE) chala diya → A mein: 0 (pehle 16 the) · B mein abhi 14; DELETE copy ke intezaar mein hai
    8.00 s  📦 copy: A → B   #15, #16, 🗑️ DELETE (3 badlav)
    8.00 s  ☠️ DELETE B tak bhi pahunch gayi: B ke saare orders gaye (14 → 0) — B ne galti ko bhi sahi badlav maana
    8.00 s  #17 → A ✓   A mein: 1 · B mein: 0 · raaste mein: 1
    8.50 s  #18 → A ✓   A mein: 2 · B mein: 0 · raaste mein: 2
    9.00 s  📦 copy: A → B   #17, #18 (2 badlav)
    9.00 s  📸 snapshot #3: A → S3   2 order (#17, #18) — galti ke BAAD ka haal
    9.00 s  #19 → A ✓   A mein: 3 · B mein: 2 · raaste mein: 1
    9.50 s  #20 → A ✓   A mein: 4 · B mein: 2 · raaste mein: 2
   10.00 s  📦 copy: A → B   #19, #20 (2 badlav)
   10.00 s  #21 → A ✓   A mein: 5 · B mein: 4 · raaste mein: 1
   10.25 s  🔎 galti pakdi gayi. S3 mein 3 snapshot hain: 3.00 s (6 order) · 6.00 s (12 order) · 9.00 s (2 order)
   10.25 s  🛟 restore: sabse naya snapshot (9.00 s) galti ke BAAD ka hai, wapas nahi chalega. Galti se pehle ka aakhri: 6.00 s wala → 12 order wapas (#1–#12)
   10.25 s     nahi mil sakte: #13–#16 (4 order) — 6.00 s ke baad likhe gaye the, kisi snapshot mein gaye hi nahi
   10.50 s  #22 → A ✓   A mein: 18 · B mein: 4 · raaste mein: 14
   11.00 s  📦 copy: A → B   #21, #1–#12, #22 (14 badlav)
   11.00 s  #23 → A ✓   A mein: 19 · B mein: 18 · raaste mein: 1
   nateeja → galti (7.75 s) se pehle 16 orders · galti ke turant baad A mein 0 · B mein bhi 0 (8.00 s par DELETE B tak pahunchi)
             S3 se wapas aaye: 12 order · nahi mil sake: #13–#16 (4 order) · 11.00 s par A mein 19, B mein 18 (restore + naye orders)
```

Dono mode (`node tools/slowmo-galti.js`):

| Mode | Galti se pehle | Galti ke baad A mein | DELETE B tak | Wapas aaye | Nahi mil sake |
|---|---|---|---|---|---|
| replica | 16 order | 0 | 8.00 s par — B ke 14 order gaye | **0** (kuch nahi hai) | **16** (sab) |
| replica + backup | 16 order | 0 | 8.00 s par — B ke 14 order gaye | **12** (S3, 6.00 s ka snapshot) | **#13–#16** (4 order) |

👉 **Replica backup nahi hai**: DELETE 8.00 s par B tak pahunchi, aur B ke 14 orders bhi gaye. Replica ne galti ko bhi sahi badlav maana.
👉 **Backup ne bachaya — poora nahi**: galti 10.25 s par pakdi gayi. Sabse naya snapshot (9.00 s) galti ke BAAD ka hai — usse restore karte toh kuch nahi milta. Galti se pehle ka aakhri snapshot (6.00 s) se **12** order wapas aaye.
👉 **Jo nahi mile: #13–#16** (4 order) — 6.00 s ke baad likhe gaye the, galti 7.75 s par hui; kisi snapshot mein gaye hi nahi. Isliye asli duniya mein "backup + log" (point-in-time recovery) chahiye — yeh lab usse nahi chalata.

### mini.js — sabse chhota chalta program

Apne app mein itna likhoge (`tools/mini.js`, line 8–30):

```js
const { serve, json } = require('../lib/util');
const { createReplicator } = require('../lib/replicator');

const PORT = 5195;
const SYNC = process.argv.includes('--sync');

const rep = createReplicator({
  mode: SYNC ? 'sync' : 'async',
  everyMs: 2000,
  // asli app mein yahan fetch(...) hoga
  ship: batch => other.receive(batch),
});

async function order(req, res, url, params, body) {
  try {
    await rep.write(body);   // sync: yahin ruko
    return json(res, 201, { ok: true });   // ho gaya
  } catch (e) {
    return json(res, 503, { ok: false });  // copy nahi hui
  }
}

serve(PORT, { 'POST /order': order }, () => rep.start());
```

Har 0.5 s par ek order; phir yeh region "gaya". Doosre region mein kaun se order hain?

```
$ node tools/mini.js
app :5195 · lib/replicator.js · mode: async · copy har 2 s par

    samay   order  jawab  kitni der   A mein  doosre mein
   0.35 s   #1    201    0.0 s       1       0       ← "ho gaya" turant; copy abhi nahi gayi
   0.85 s   #2    201    0.0 s       2       0
   1.35 s   #3    201    0.0 s       3       0
   1.85 s   #4    201    0.0 s       4       0
   2.35 s   #5    201    0.0 s       5       4       ← 2.00 s par #1–#4 ki copy gayi (pahunchi 2.20 s par)
   2.85 s   #6    201    0.0 s       6       4
   3.35 s   #7    201    0.0 s       7       4

💥 3.80 s par yeh region gaya (jo kuch sirf yahan tha, woh gaya)

  "ho gaya" (201) mila:         #1–#7 (7 order)
  doosre region mein hain:      #1–#4 (4 order)
  "ho gaya" mila, par kho gaye: #5–#7 (3 order)

$ node tools/mini.js --sync
app :5195 · lib/replicator.js · mode: sync · har order doosre region ka jawab dekhta hai

    samay   order  jawab  kitni der   A mein  doosre mein
   0.35 s   #1    201    0.2 s       1       1       ← pehle doosre region ka jawab (0.2 s), phir "ho gaya"
   0.85 s   #2    201    0.2 s       2       2
   1.35 s   #3    201    0.2 s       3       3
   1.85 s   #4    201    0.2 s       4       4
   2.35 s   #5    201    0.2 s       5       5       ← har order mein wahi 0.2 s ka intezaar
   2.85 s   #6    201    0.2 s       6       6
   3.35 s   #7    201    0.2 s       7       7

💥 3.80 s par yeh region gaya (jo kuch sirf yahan tha, woh gaya)

  "ho gaya" (201) mila:         #1–#7 (7 order)
  doosre region mein hain:      #1–#7 (7 order)
  "ho gaya" mila, par kho gaye: koi nahi (0 order)
```

👉 async: "ho gaya" 0.0 s mein, par **#5–#7 (3 order)** kho gaye. sync: har order 0.2 s mein, kho gaye: **koi nahi (0 order)**.

---

## ex1-dr-tiers — t=4 s par region A khatam, asli raftaar

50 orders/second. "Ho gaya" (201) mila hua order agar B mein nahi hai → **kho gaya** (RPO). Health check 500 ms × 3 → pata chalne mein 1.0–1.5 s (kill health-check ke kis moment par aaya, us par nirbhar).
Aam din B mein: backup — sirf S3 snapshots (har 3 s) · pilot — DB (A se copy, 300 ms) · warm — DB + chhota app (25% capacity) · active — poora region, aadha traffic.

```
$ node tools/dr.js
50 orders/s · t=4s par region A khatam · health check 500 ms × 3 = 1.5 s mein pata chalta hai

strategy                    aam din B mein chalu               fail hote rahe (RTO)   fail orders   "ho gaya" par kho gaye (RPO)
backup & restore            sirf S3 snapshots (har 3 s)            16.3 s             680            50 / 295
pilot light                 DB (replica) chalu, app band            6.4 s             283             5 / 295
warm standby                DB + chhota app (25%)                   4.0 s             112             5 / 370
multi-site active-active    poora region, aadha traffic             1.5 s              36             3 / 331
```

**Teen run ka dayra:**

| Strategy | RTO (kitni der fail) | Fail order | "Ho gaya" par kho gaye (RPO) |
|---|---|---|---|
| backup & restore | 16.3–16.4 s | 680–689 | 50 (kul "ho gaya" 295–296) |
| pilot light | 6.4–6.5 s | 283–286 | 5 (kul "ho gaya" 295–296) |
| warm standby | 4.0–4.5 s | 112–133 | 5 (kul "ho gaya" 370–371) |
| multi-site active-active | 1.0–1.5 s | 25–37 | 2–3 (kul "ho gaya" 320–331) |

👉 **Backup & restore**: RTO 16.3–16.4 s = pata chalna + **15 s sab kuch banana** (asli duniya mein ghante). RPO 50 order — aakhri snapshot ke baad ka lagbhag 1 s.
👉 **Pilot light**: DB pehle se garam → sirf app boot (5 s). RTO 6.4–6.5 s, RPO 5 order (copy ka 300 ms).
👉 **Warm standby**: app pehle se chal raha hai, par 25% capacity — 3 s ke scale-up tak aadhe orders fail. RTO 4.0–4.5 s, RPO 5.
👉 **Active-active**: B pehle se aadha traffic le raha tha. RTO 1.0–1.5 s, RPO 2–3.
👉 **Replication wale teen mein kho gaye order 2–5**: jis pal region gaya, us pal `waiting` list mein kitna tha — yeh qismat hai (0 bhi aa sakta hai). Backup mein 50–50: snapshot ka antar 3 s hai, isliye lagbhag 1 s ka kaam nahi bachta.

## ex2-sync-async — pehle "ho gaya" ya pehle copy? asli raftaar

B ka DB chalu. 50 orders/second seedhe region A ko. Region A 2.5 s par khatam. Rows 3–4 mein B 1.0 s se 3.0 s tak (2 s) unreachable — yaani A usi 2 s ke beech mein gaya.
A se B tak copy ke raaste mein nakli cross-region round trip: **40 ms** (`sleep`). Async mein bhi wahi raasta hai, bas koi uska intezaar nahi karta.

```
$ node tools/syncrepl.js
50 orders/s · A se B tak nakli round trip 40 ms · region A 2.5 s par khatam · B-down rows: B 1 s se 3 s tak unreachable

setup                              median     p99   "ho gaya" par kho gaye   B unreachable mein fail   sabse badi waiting list   kill par waiting list
async (copy har 300 ms)               2 ms    4 ms          5 / 125                    —                        18                        5
sync (B ka jawab, phir "ho gaya")    45 ms   46 ms          0 / 123                    —                         0                        0
async + B 2 s unreachable             2 ms    4 ms         81 / 126               0 / 75                        81                       81
sync + B 2 s unreachable            542 ms  546 ms           0 / 48              75 / 75                         0                        0
```

**Teen run ka dayra:**

| Setup | Median | p99 | "Ho gaya" mila, B mein nahi | B unreachable ke dauraan fail | Sabse badi waiting list |
|---|---|---|---|---|---|
| async (copy har 300 ms) | 2 ms | 4–12 ms | 5 (kul 125) | — | 18–19 |
| sync (B ka jawab, phir "ho gaya") | 45 ms | 46–48 ms | 0 (kul 123) | — | 0 |
| async + B 2 s unreachable | 2 ms | 3–5 ms | 80–81 (kul 125–126) | 0 / 75 | 80–81 |
| sync + B 2 s unreachable | 542 ms | 545–554 ms | 0 (kul 48) | 75 / 75 | 0 |

👉 **sync**: "ho gaya" par kho gaye **0** — par har order ko ek round trip dena pada: median 45 ms (async: 2 ms).
👉 **async**: median 2 ms, par jo `waiting` list mein tha woh gaya: 5 order. Kho gaye order = A ki list kill ke pal par (5) — ek-ek order.
👉 **B unreachable, async**: koi order fail nahi (0 / 75), par list 80–81 tak badhi — aur A usi beech gaya: **80–81 order gaye**.
👉 **B unreachable, sync**: kho gaye 0, par 75 / 75 orders fail — har ek ~542 ms intezaar ke baad (B ka jawab 500 ms dekha, phir fail). Median ab 542 ms.
👉 **Seekh**: sync "data nahi khoya" kharidta hai **availability** ki keemat par; async availability kharidta hai **data** ki keemat par. Dono ek hi line ka fark hain.

---

## AWS mein (documentation se — is lab mein chalaya nahi gaya)

Neeche ke quote AWS ke official pages se hain; source links yahin diye hain (`FACTS.md` wala purana scratch folder ab nahi hai). Sources 2026-10-20 ko dobara check hue. Is lab ka router "0.5 s × 3" lab ka apna chhota roop hai — Route 53 ke number nahi.

- **Chaar strategies** ([AWS DR whitepaper](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)): backup & restore · pilot light · warm standby · multi-site active/active.
  > Disaster recovery strategies available to you within AWS can be broadly categorized into four approaches, ranging from the low cost and low complexity of making backups to more complex strategies using multiple active Regions.
  Usi page ke text ke mutabiq: backup & restore mein infrastructure, configuration aur app code recovery Region mein dobara deploy karte hain; failover par backup restore hota hai. Backup kitni baar liya, usse achievable recovery point tay hota hai. Active/active sabse complex aur mehenga tareeka hai; sahi technology aur implementation se recovery time near zero ho sakta hai, async replication se RPO near zero. Corruption ke liye backup phir bhi chahiye. **Figure 6 ki tasveer se koi RTO/RPO number nahi liya.** Lab ke seconds AWS ki performance ka daava nahi hain.
- **Pilot light vs warm standby** (whitepaper ka note):
  > The distinction is that pilot light cannot process requests without additional action taken first, whereas warm standby can handle traffic (at reduced capacity levels) immediately. The pilot light approach requires you to “turn on” servers, possibly deploy additional (non-core) infrastructure, and scale up, whereas warm standby only requires you to scale up (everything is already deployed and running).
- **RTO aur RPO ki paribhasha** (whitepaper):
  > Recovery Time Objective (RTO) is the maximum acceptable delay between the interruption of service and restoration of service. This objective determines what is considered an acceptable time window when service is unavailable and is defined by the organization.
  > Recovery Point Objective (RPO) is the maximum acceptable amount of time since the last data recovery point. This objective determines what is considered an acceptable loss of data between the last recovery point and the interruption of service and is defined by the organization.
- **RTO mein "pata chalna" bhi hai** (whitepaper, Detection):
  > It is critical to factor in incident detection, notification, escalation, discovery and declaration into your planning and objectives to provide realistic, achievable objectives that provide business value.
- **Route 53 health check** ([API reference](https://docs.aws.amazon.com/Route53/latest/APIReference/API_HealthCheckConfig.html)): failure threshold ka default 3, request interval ka default 30 s.
  > Otherwise, if you don't specify a value for FailureThreshold, the default value is three health checks.
  > If you don't specify a value for RequestInterval, the default value is 30 seconds.
  > Valid Range: Minimum value of 10. Maximum value of 30.
  API reference mein FailureThreshold ki range 1–10 hai. [Endpoint health ka guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html) interval ke do options deta hai: **10 s ya 30 s**, beech ka har number nahi. Har checker apna result banata hai; Route 53 kai checkers ke results jodta hai. [Health check settings](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html) ke mutabiq Fast (10 s) ka extra charge hai.
  **Hisaab:** 30 × 3 = lagbhag 90 s, Fast par 10 × 3 = lagbhag 30 s. Sirf interval × threshold ka rough hisaab: actual detection ka measurement, lower limit ya upper limit nahi. Check ka pal, response ki der aur kai checkers ka combined faisla alag hain; DNS cache bhi failover ko alag se prabhavit karta hai.
- **Failover record ka TTL** ([Route 53 Developer Guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover.html)) — slow motion 3 isi baat ka model hai:
  > However, if you specify a longer value for TTL, it takes longer for changes to the record (for example, a new IP address) to take effect. Recursive resolvers use the values in their cache for longer periods before they ask Route 53 for the latest information.
  > If you're associating this record with a health check, specify a TTL of 60 seconds or less so clients respond quickly to changes in health status.
- **Automatic failover ke baare mein savdhani** (whitepaper):
  > Automatically initiated failover based on health checks or alarms should be used with caution. Even using the best practices discussed here, recovery time and recovery point will be greater than zero, incurring some loss of availability and data.
- **Replication backup nahi hai** ([whitepaper](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/high-availability-is-not-disaster-recovery.html); slow motion 4):
  > If a file or files are deleted or corrupted on the primary storage device, those destructive changes can be replicated to the secondary storage device. In this scenario, despite high availability, the ability to fail over in case of data deletion or corruption will be compromised. Instead, a point-in-time backup is also required as part of a DR strategy.
  > Continuous data replication protects you against some types of disaster, but it may not protect you against data corruption or destruction unless your strategy also includes versioning of stored data or options for point-in-time recovery.
- **S3 replication aur delete** ([replication rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-what-is-isnot-replicated.html), [delete markers](https://docs.aws.amazon.com/AmazonS3/latest/userguide/delete-marker-replication.html)) — configuration ke version ke hisaab se alag:
  Delete-marker page ke mutabiq default mein marker sirf source mein lagta hai; delete marker replication enable ho toh marker destination mein bhi copy hota hai. Purane configuration version ke liye neeche V1 wala rule dekho. Version ID diye bina DELETE par versioning-enabled bucket marker lagata hai, object permanently nahi mitata.
  > If you are using the latest version of the replication configuration (that is, you specify the Filter element in a replication configuration rule), Amazon S3 does not replicate the delete marker by default. However, you can add delete marker replication to non-tag-based rules.
  > If you don't specify the Filter element, Amazon S3 assumes that the replication configuration is version V1, and it replicates delete markers that resulted from user actions. However, if Amazon S3 deletes an object due to a lifecycle action, the delete marker is not replicated to the destination buckets.
  > If you specify an object version ID to delete in a DELETE request, Amazon S3 deletes that object version in the source bucket. But it doesn't replicate the deletion in the destination buckets. In other words, it doesn't delete the same object version from the destination buckets. This protects data from malicious deletions.
- **S3 Versioning kis cheez se bachata hai** ([S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)):
  > Versioning-enabled buckets can help you recover objects from accidental deletion or overwrite. For example, if you delete an object, Amazon S3 inserts a delete marker instead of removing the object permanently.
  > By default, S3 Versioning is disabled on buckets, and you must explicitly enable it.
- **Ek managed cross-region database — Aurora Global Database** ke documented RTO/RPO ([switchover aur failover](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html)):
  > Recovery time objective (RTO) – The time it takes a system to return to a working state after a disaster or service outage. In other words, RTO measures downtime. For Aurora Global Database, RTO can be in the order of minutes.
  > Recovery point objective (RPO) – The amount of data that can be lost (measured in time) after a disaster or service outage. This data loss is usually due to asynchronous replication lag. For an Aurora global database, RPO is typically measured in seconds.
  > Because this feature synchronizes secondary DB clusters with the primary before making any other changes, RPO is 0 (no data loss).
  (Aakhri quote *planned switchover* ka hai, unplanned failover ka nahi: failover ka RPO "typically a non-zero value measured in seconds".)
  Usi page ke mutabiq unplanned failover mein data loss failure ke waqt Regions ke beech replication lag par nirbhar hai.

## ⚠️ Aam galatfehmi

- **"Backup hai toh hum bache hue hain."** Backup RPO ko "snapshot ka antar" tak le aata hai, aur RTO ko "B banane ka waqt" tak. Slow motion 1 mein backup ka RTO **7.50 s** (baaki: 4.50 / 3.50 / 1.50), RPO **3 order**. ex1 mein 16.3–16.4 s aur 50 order.
- **"Replication hi backup hai."** Slow motion 4: DELETE 8.00 s par B tak pahunchi, B ke 14 order gaye. Backup ke bina wapas laane ko kuch nahi; backup ke saath bhi #13–#16 (4 order) nahi mile.
- **"Active-active mein data kabhi nahi khota."** Slow motion 1 mein active-active mein bhi #9 gaya; ex1 mein 2–3 order. Copy async hai, toh `waiting` list hamesha ho sakti hai. (AWS bhi "near-zero RPO" likhta hai, "zero" nahi.)
- **"Sync copy laga di, ab RPO zero, kaam khatam."** ex2: "ho gaya" par kho gaye 0, par median 45 ms (async 2 ms), aur B 2 s unreachable hua toh 75 / 75 orders fail.
- **"Async mein B thodi der na mile toh koi baat nahi."** ex2: B 2 s unreachable aur usi beech A gaya → 80–81 order gaye (theek waqt par gaya hota toh 5).
- **"TTL chhota kar diya, ab failover turant."** Slow motion 3 (model): chhota TTL mein bhi 8 order fail — pata chalne ka 1.50 s TTL se nahi hatta. Lamba TTL mein 27.
- **"Failover ho gaya matlab kaam khatam."** Slow motion 3: grahak-1 DNS badalne ke 5.50 s baad tak purane pate par raha. Failover ke baad bhi ginti: kaun kab laut-ta hai.

## Khud try karo

1. `tools/slowmo.js` mein `A_DIES` 4000 se 3750 karo. `--mode pilot` mein ab kaun se order gaye? Phir 3500 karo. (Copy ki ghadi aur A ke jaane ka pal — yeh qismat hai; ex1 mein bhi RPO is liye har run mein badalta hai.)
2. `tools/slowmo-galti.js` mein `SNAP` 3000 se 1000 karo. `--mode backup` mein ab kaun se order nahi milte? Snapshot jitni baar, RPO utna chhota — par S3 mein snapshot bhi utne zyada. Kharcha kahan badha?
3. `tools/slowmo-sync.js` mein `RTT` 200 se 600 karo. `--mode sync` mein ab har order kitni der mein "ho gaya"? Order har 0.5 s par aate hain — jab ek order ka jawab agle order ke aane tak nahi aata, toh kya dikhta hai?
4. `tools/mini.js` mein `everyMs: 2000` ko `500` karo. async mein ab kitne order gaye? Zero kyun nahi hua? (Phir `--sync` chalao.)
5. `tools/syncrepl.js` mein `RTT` 40 se 120 karo. Sync ka median kitna? Async ka p99 badla? Kyun / kyun nahi?
