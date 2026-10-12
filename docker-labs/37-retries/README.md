# 🐳 Lab 37 — Retries: madad bhi, aag mein ghee bhi

System Gurukul → **Retries** levels ka lab. Zero dependency Node (18+) — sirf `tools/p-retry.js` ko npm ki ek library chahiye.
Source videos (credit): Software Developer Diaries — "Every engineer should know this (retries with jitter)", "This is how you
protect your backend from a Retry Storm", "Retry Mechanisms and Patterns #Shorts", "The Secret Weapon Behind Resilient Distributed Systems".

```bash
npm start ex0-slowmo    → node tools/slowmo.js     # slow motion: 6 phones, chaar tareeke   [--mode turant|backoff|jitter|retryafter]
                        → node tools/mini.js       # sabse chhota program: lib/retry.js + ek fetch
                        → node tools/p-retry.js    # wahi kahani, asli library se (pehle: npm install p-retry)
npm start ex1-jitter    → node tools/jitter.js     # gateway (5161)
npm start ex2-storm     → node tools/storm.js      # fragile service (5165)   [--mode immediate|backoff|retryafter|budget]
npm start ex3-layers    → node tools/layers.js     # A → B → C (5162–5164)
docker compose --profile ex1-jitter up --build     # (ya ex0-slowmo / ex2-storm / ex3-layers)
```

| File | Kya hai |
|---|---|
| `lib/retry.js` | **Poora retry, ek chhoti file**: intezaar ke chaar formule (`WAITS`), "kis failure par dobara bhejein" (`worthRetrying`), aur `retry()` ka loop. Is lab ke tools yahi chalate hain. |
| `services/fragile.js` | Naazuk service (kahani mein: **payment-service**): ek saath hadd se zyada requests → crash → kuch der band → thandi. `POST /config` se hadd chhoti ki ja sakti hai (slow motion). |
| `services/gateway.js` | Payment gateway jaisa: ek waqt mein sirf 10 charges, baaki ko turant `503`. |
| `services/hop.js` | A → B → C ki ek kadi; neeche wali fail ho toh N baar koshish. |

Numbers ek laptop (WSL) par 2026-10-10 ke runs ke hain. Jahan random intezaar hai, wahan har run thoda alag aayega — **pattern wahi rahega**.

---

## ex0-slowmo — pehle yeh chalao: retry storm slow motion mein

payment-service yahan ek saath sirf **5 orders** sambhal sakti hai (har order 300 ms); 6vi ek saath aayi toh **crash**. t = 1.0 s par ek
kharab deploy se crash: 1.4 s band (2.4 s par wapas). **6 phones** 1.3–1.4 s par "Order place" dabate hain. Chaar tareeke — wahi phones,
wahi service; sirf "fail hone par kya karein" badalta hai. (Jitter ka random yahan tay-beej wala hai, taaki har run mein wahi dikhe.)

```
$ node tools/slowmo.js
payment-service: ek saath 5 orders (har ek 300 ms), 6vi ek saath → CRASH · 1.0 s par deploy se crash, 1.4 s band · 6 phones 1.3–1.4 s par "Order place" · run 8 s

=== turant retry — har 300 ms, koi limit nahi ===
       0.20 s  ek aur user ka order                     → ✅ 303 ms  (aam din)
       1.00 s  💥 kharab deploy: payment-service CRASH #1 · 1.4 s band (2.40 s par wapas)
  1.30–1.40 s  6 phones: "Order place" → ❌ service band · 300 ms ruk ke phir
  1.60–2.30 s  6 phones: 3 aur round retry (18 calls) → ❌ service band · 300 ms ruk ke phir
       2.40 s  🟢 payment-service wapas aayi
  2.50–2.60 s  6 phones ek saath laute (koshish 5) → 5 andar, 6vi par hadd paar → 💥 CRASH #2 · 4.00 s tak band · andar wali 5 bhi gayi · 300 ms ruk ke phir
  2.90–3.80 s  6 phones: 4 aur round retry (24 calls) → ❌ service band · 300 ms ruk ke phir
       4.00 s  🟢 payment-service wapas aayi
       4.10 s  6 phones ek saath laute (koshish 10) → 5 andar, 6vi par hadd paar → 💥 CRASH #3 · 5.50 s tak band · andar wali 5 bhi gayi · 300 ms ruk ke phir
  4.40–5.30 s  6 phones: 4 aur round retry (24 calls) → ❌ service band · 300 ms ruk ke phir
       5.50 s  🟢 payment-service wapas aayi
       5.60 s  6 phones ek saath laute (koshish 15) → 5 andar, 6vi par hadd paar → 💥 CRASH #4 · 7.00 s tak band · andar wali 5 bhi gayi · 300 ms ruk ke phir
  5.90–6.80 s  6 phones: 4 aur round retry (24 calls) → ❌ service band · 300 ms ruk ke phir
       7.00 s  🟢 payment-service wapas aayi
       7.10 s  6 phones ek saath laute (koshish 20) → 5 andar, 6vi par hadd paar → 💥 CRASH #5 · 8.50 s tak band · andar wali 5 bhi gayi · 300 ms ruk ke phir
  7.40–7.70 s  6 phones: 2 aur round retry (12 calls) → ❌ service band · 300 ms ruk ke phir
   nateeja → order lage: 0/6 · payment-service CRASH: 5 baar · payment-service par calls: 132 · aakhri baar 8.50 s par uthi

=== har baar dugna ruko — 300, 600, 1200, 2400 ms · 5 koshish ===
       0.20 s  ek aur user ka order                     → ✅ 304 ms  (aam din)
       1.00 s  💥 kharab deploy: payment-service CRASH #1 · 1.4 s band (2.40 s par wapas)
  1.30–1.40 s  6 phones: "Order place" → ❌ service band · 300 ms ruk ke phir
  1.60–1.70 s  6 phones: koshish 2 → ❌ service band · 600 ms ruk ke phir
  2.20–2.30 s  6 phones: koshish 3 → ❌ service band · 1200 ms ruk ke phir
       2.40 s  🟢 payment-service wapas aayi
  3.40–3.50 s  6 phones ek saath laute (koshish 4) → 5 andar, 6vi par hadd paar → 💥 CRASH #2 · 4.90 s tak band · andar wali 5 bhi gayi · 2400 ms ruk ke phir
       4.90 s  🟢 payment-service wapas aayi
       5.90 s  6 phones ek saath laute (koshish 5) → 5 andar, 6vi par hadd paar → 💥 CRASH #3 · 7.30 s tak band · andar wali 5 bhi gayi · haar maan li
       7.30 s  🟢 payment-service wapas aayi
   nateeja → order lage: 0/6 · payment-service CRASH: 3 baar · payment-service par calls: 30 · aakhri baar 7.30 s par uthi

=== dugni hadd ke andar RANDOM ruko (jitter) · 5 koshish ===
       0.20 s  ek aur user ka order                     → ✅ 305 ms  (aam din)
       1.00 s  💥 kharab deploy: payment-service CRASH #1 · 1.4 s band (2.40 s par wapas)
       1.30 s  Asha    koshish 1 → ❌ service band · random(0–300) = 151 ms ruk ke phir
       1.32 s  Bilal   koshish 1 → ❌ service band · random(0–300) = 297 ms ruk ke phir
       1.34 s  Chitra  koshish 1 → ❌ service band · random(0–300) = 139 ms ruk ke phir
       1.36 s  Dev     koshish 1 → ❌ service band · random(0–300) = 12 ms ruk ke phir
       1.37 s  Dev     koshish 2 → ❌ service band · random(0–600) = 580 ms ruk ke phir
       1.38 s  Esha    koshish 1 → ❌ service band · random(0–300) = 250 ms ruk ke phir
       1.40 s  Farhan  koshish 1 → ❌ service band · random(0–300) = 43 ms ruk ke phir
       1.44 s  Farhan  koshish 2 → ❌ service band · random(0–600) = 294 ms ruk ke phir
       1.45 s  Asha    koshish 2 → ❌ service band · random(0–600) = 550 ms ruk ke phir
       1.48 s  Chitra  koshish 2 → ❌ service band · random(0–600) = 592 ms ruk ke phir
       1.62 s  Bilal   koshish 2 → ❌ service band · random(0–600) = 482 ms ruk ke phir
       1.63 s  Esha    koshish 2 → ❌ service band · random(0–600) = 23 ms ruk ke phir
       1.65 s  Esha    koshish 3 → ❌ service band · random(0–1200) = 359 ms ruk ke phir
       1.74 s  Farhan  koshish 3 → ❌ service band · random(0–1200) = 265 ms ruk ke phir
       1.95 s  Dev     koshish 3 → ❌ service band · random(0–1200) = 278 ms ruk ke phir
       2.00 s  Asha    koshish 3 → ❌ service band · random(0–1200) = 830 ms ruk ke phir
       2.00 s  Farhan  koshish 4 → ❌ service band · random(0–2400) = 1700 ms ruk ke phir
       2.01 s  Esha    koshish 4 → ❌ service band · random(0–2400) = 494 ms ruk ke phir
       2.07 s  Chitra  koshish 3 → ❌ service band · random(0–1200) = 582 ms ruk ke phir
       2.10 s  Bilal   koshish 3 → ❌ service band · random(0–1200) = 120 ms ruk ke phir
       2.22 s  Bilal   koshish 4 → ❌ service band · random(0–2400) = 1149 ms ruk ke phir
       2.23 s  Dev     koshish 4 → ❌ service band · random(0–2400) = 1986 ms ruk ke phir
       2.40 s  🟢 payment-service wapas aayi
       2.51 s  Esha    koshish 5 → ✅ order laga (303 ms) · us pal service ke andar 1/5
       2.65 s  Chitra  koshish 4 → ✅ order laga (303 ms) · us pal service ke andar 2/5
       2.83 s  Asha    koshish 4 → ✅ order laga (303 ms) · us pal service ke andar 2/5
       3.37 s  Bilal   koshish 5 → ✅ order laga (304 ms) · us pal service ke andar 1/5
       3.70 s  Farhan  koshish 5 → ✅ order laga (303 ms) · us pal service ke andar 1/5
       4.22 s  Dev     koshish 5 → ✅ order laga (303 ms) · us pal service ke andar 1/5
   nateeja → order lage: 6/6 · payment-service CRASH: 1 baar · payment-service par calls: 28 · 2.40 s se theek

=== turant retry, par service "503 + Retry-After: 1" bolti hai ===
       0.20 s  ek aur user ka order                     → ✅ 303 ms  (aam din)
       1.00 s  💥 kharab deploy: payment-service CRASH #1 · 1.4 s band (2.40 s par wapas)
  1.30–1.40 s  6 phones: "Order place" → ❌ service band · 300 ms ruk ke phir
  1.60–2.30 s  6 phones: 3 aur round retry (18 calls) → ❌ service band · 300 ms ruk ke phir
       2.40 s  🟢 payment-service wapas aayi
  2.50–2.58 s  Asha, Bilal, Chitra, Dev, Esha: koshish 5 → ✅ order laga (302–304 ms)
       2.60 s  Farhan: service bhari (5/5) → 🟡 503 "Retry-After: 1" — crash nahi · 1043 ms ruk ke phir
       3.64 s  Farhan: koshish 6 → ✅ order laga (304 ms)
   nateeja → order lage: 6/6 · payment-service CRASH: 1 baar · payment-service par calls: 31 · 503 (mana kiya): 1 · 2.40 s se theek
```

👉 **Turant retry**: service jaise hi uthi, chhe phones ki atki hui retries 100 ms ke andar ek saath pahunchi → 6vi par crash → phir wahi.
8 second mein **5 crash, 132 calls, 0 order**. 1.4 second ki gadbad kabhi khatam hi nahi hui.

👉 **Har baar dugna ruko (backoff)**: calls 132 se 30. Par chhe phones ek hi pal fail hue the, ek hi formula se ruke → **phir ek saath laute**.
**3 crash, 0 order**, aur paanchvi koshish ke baad sabne haar maan li. Backoff ne intezaar badhaya, bheed nahi todi.

👉 **Random ruko (jitter)**: wahi dugni hadd, par har phone us hadd ke andar apna random waqt chunta hai. Wapas aane par service ke andar
kabhi 2 se zyada orders nahi the. **6/6 order, koi doosra crash nahi, 28 calls.**

👉 **Service khud bole (503 + Retry-After)**: phones "turant" wale hi the. Service ne 6vi request par crash hone ke bajaye
`503 Retry-After: 1` bola; Farhan ka phone 1.04 s ruka, phir order lag gaya. **6/6 order, koi doosra crash nahi.**

### mini.js — sabse chhota chalta program

Sirf ek phone (Asha). `placeOrder()` ek fetch hai; `retry(placeOrder, {…})` usse `lib/retry.js` se gherta hai.

```
$ node tools/mini.js
retry: 5 koshish · intezaar random(0 … 300 × 2ⁿ ms), hadd 2400 ms

  1.01 s  💥 payment-service CRASH · 1.4 s band
  1.30 s  Asha ne "Order place" dabaya
  1.31 s  koshish 1 fail → random(0–300) = 151 ms ruk ke phir
  1.46 s  koshish 2 fail → random(0–600) = 550 ms ruk ke phir
  2.01 s  koshish 3 fail → random(0–1200) = 830 ms ruk ke phir
  2.40 s  🟢 payment-service wapas aayi
  3.15 s  ✅ order lag gaya
```

### p-retry.js — wahi kahani, asli library se

```
$ npm install p-retry        # ek baar, isi folder mein (p-retry 8 ko Node 22+ chahiye)
$ node tools/p-retry.js

=== (1) hamari settings: retries 4 · minTimeout 300 · maxTimeout 2400 · randomize true ===
  1.01 s  💥 payment-service CRASH · 1.4 s band
  1.30 s  Asha ne "Order place" dabaya
  1.31 s  koshish 1 fail → 451 ms ruk ke phir · bachi retries: 4
  1.76 s  koshish 2 fail → 1150 ms ruk ke phir · bachi retries: 3
  2.40 s  🟢 payment-service wapas aayi
  3.22 s  ✅ order lag gaya

=== (2) library ke DEFAULT: retries 10 · minTimeout 1000 · maxTimeout Infinity · randomize false ===
  1.01 s  💥 payment-service CRASH · 1.4 s band
  1.30 s  Asha ne "Order place" dabaya
  1.30 s  koshish 1 fail → 1000 ms ruk ke phir · bachi retries: 10
  2.31 s  koshish 2 fail → 2000 ms ruk ke phir · bachi retries: 9
  2.40 s  🟢 payment-service wapas aayi
  4.61 s  ✅ order lag gaya
```

| | haath ka `lib/retry.js` | `p-retry` 8.0.1 |
|---|---|---|
| Kul koshish | `attempts: 5` | `retries: 4` (retries ginta hai, koshish nahi) — **default 10** |
| Pehla intezaar | `base: 300` | `minTimeout: 300` — **default 1000 ms** |
| Hadd | `cap: 2400` | `maxTimeout: 2400` — **default Infinity** |
| Random | `wait: 'full'` → 0 se hadd tak | `randomize: true` → intezaar × (1 se 2) — 0 se shuru nahi hota. **Default false** |
| Kis par dobara bhejein | `worthRetrying` (jawab nahi / 429 / 5xx) | default: **har error par**; rokne ke liye `AbortError` phenko ya `shouldRetry` do |
| Is kahani mein | 4 koshish, order 3.15 s par | (1) hamari settings: 3 koshish, 3.22 s · (2) default: 4.61 s — service 2.40 s par theek ho chuki thi |

Default ke saath 10 retries ka intezaar 1 + 2 + 4 + … + 512 second = 1023 second (~17 minute) tak ja sakta hai, aur bina random ke.
(Docker image mein p-retry install nahi hota — yeh ek tool seedha Node se chalao.)

---

## ex1-jitter — 200 clients, ek hi pal, gateway ek waqt mein 10

200 clients (jaise 200 AI agents) ek saath payment gateway ko charge bhejte hain. Gateway ek waqt mein sirf **10 charges**
chala sakta hai (har ek 50 ms) — bhara ho toh `503 at capacity`. Har client max **8 koshish**, phir haar maan leta hai.

```
$ node tools/jitter.js
200 clients ek saath · gateway ek waqt mein 10 charges (50 ms har ek) · har client max 8 koshish · base 50 ms, cap 2000 ms

tareeka                     gateway par calls   503 mile   charge ho gaye   haar maani   aakhri charge (ms)
turant (bina ruke)               1374         1322           52/200        148            428
exp backoff, bina jitter         1320         1240           80/200        120           5272
exp ±20% (Kafka jaisa)            981          781          200/200          0           3541
full jitter                       996          797          199/200          1           2518
equal jitter                      949          749          200/200          0           2734
decorrelated jitter               782          583          199/200          1           2137

Gateway ki chhat: 10 × (1000 ms / 50 ms) = 200 charges/second — yaani 200 clients ko kam se kam ~1 second lagega.
```

| Tareeka | Agli koshish kab (n = kitni baar fail) |
|---|---|
| exp backoff, bina jitter | `50 × 2ⁿ` ms — 50, 100, 200, 400 … (cap 2000) |
| exp ±20% (Kafka ka `randomization factor` 0.2) | `50 × 2ⁿ × (0.8 … 1.2)` |
| full jitter | `random(0, 50 × 2ⁿ)` |
| equal jitter | `50 × 2ⁿ / 2 + random(0, 50 × 2ⁿ / 2)` — hamesha ek kam se kam intezaar |
| decorrelated jitter | `random(50, pichhla intezaar × 3)` |

👉 **Turant retry**: 8 koshish kuch hi milliseconds mein khatam → **~150 clients ne haar maani**, gateway ko sirf dhakka.

👉 **Exp backoff bina jitter**: sab clients ek hi pal mein fail hue → ek hi pal mein wapas aaye → phir 10 hi jeete. Har
"lehar" mein 10 — isliye **120 ne haar maani** aur aakhri charge 5.3 second par. (Yeh line har run mein wahi aati hai: isme random hai hi nahi.)

👉 **Koi bhi jitter** (random): wahi clients, wahi gateway → **0–1 ne haar maani**. Equal jitter thoda dheema — kyunki hamesha ek floor
intezaar hai (jab API turant retry bardasht na kare, tab kaam ka). Kafka ka ±20% bhi kaafi hai — thoda sa random hi lehar tod deta hai.

## ex2-storm — crash, restart, crash: retry storm (asli raftaar)

50 clients, har client har 100 ms ek user action (~500 requests/second). Service ek saath **40 se zyada** requests par
crash ho jaati hai. t = 2 s par ek kharab deploy se crash → **2 s down** (connections toot-te hain) → **3 s thandi**
(cache khaali, har request 2× dheemi). Chaar tarah ke clients:

```
$ node tools/storm.js
50 clients × har 100 ms ek action · t=2s par crash · 12 s ka run · crash ki hadd: 40 requests ek saath

clients ka tareeka                   crash (pehla forced)   theek hua (s)   server par calls   503 (shed)   actions safal   user ko error   calls / action
turant retry, koi limit nahi               5                15.1           20213          0         988/1038          0        19.5
exp backoff + jitter, 3 koshish            1                 7.0            6879          0        5007/5605        598        1.2
turant retry, par Retry-After maano        1                 7.0            8665         27        4787/4787          0        1.8
retry budget (10%), turant                 1                 7.0            6113          0        4990/5994       1004        1.0

Akela forced crash ho toh service t=7.0 s par theek (2 s down + 3 s thandi). Usse zyada = retries ne dobara giraya.
```

(Tool chaaron ek ke baad ek chalata hai, ~50 s. Ek hi chalana ho: `--mode immediate|backoff|retryafter|budget`.)

👉 **Turant retry, koi limit nahi**: service wapas aayi → saare 50 clients ki atki hui request ek saath → 50 > 40 →
**phir crash**. 5 crash, 12 second ke run mein service kabhi theek nahi hui (15.1 s), **~19 calls har user action par**.

👉 **Backoff + jitter, 3 koshish phir error**: sirf pehla (forced) crash. ~600 users ko "thodi der baad try karo" mila —
par service 7.0 s par theek, aur ~5,000 actions safal.

👉 **Server ki taraf se bachav** (`503 + Retry-After: 1`): clients bhi turant retry wale the, bas `Retry-After` maante
the. Restart ke pal kuch hi requests shed hui → koi doosra crash nahi, **0 user errors**.

👉 **Retry budget** (retries ≤ asli requests ka 10%): bina backoff ke bhi storm nahi bana — budget khatam hote hi retry
band. Keemat: sabse zyada user errors (~1,000). AWS SDK ka "retry quota" aur gRPC ka "retry throttling" isi idea par chalte hain.

## ex3-layers — 3 × 3 × 3 = 27

Client → A → B → C. Har layer par "3 koshish" wala retry — jaise har team ne apne HTTP client mein laga diya.

```
$ node tools/layers.js
=== C poori tarah band (100% 503) · 100 user requests ===
tareeka                              A par calls   B par calls   C par calls   C par / user request
har layer 3 koshish (client, A, B)        300           900          2700            27×
sirf edge par 3 koshish (client)          300           300           300             3×
koi retry nahi                            100           100           100             1×

=== C thoda bimaar (30% requests par 503) · 100 user requests ===
tareeka                              user ko jawab mila   C par calls   C par / user request
har layer 3 koshish (client, A, B)        100/100            136           1.36×
sirf edge par 3 koshish (client)           98/100            135           1.35×
koi retry nahi                             73/100            100           1.00×

Retry EK layer par (sabse bahar, jahan user hai) — andar ki har layer par nahi. 3 × 3 × 3 = 27 guna bojh usi service par jo pehle se bimaar hai.
```

👉 Chhoti gadbad (30%) mein har-layer retry **sasta aur accha dikhta hai** (C par ~1.3–1.5× calls, lagbhag sabko jawab) — isi liye har
team laga deti hai. (30% wala hissa random hai: har run mein thode alag number.)
👉 Asli outage mein wahi setup C par **27 guna** bojh daalta hai — usi service par jo pehle se gir rahi hai. Retry **ek hi
layer** par (sabse bahar, jahan user hai), andar wali layers turant fail karein.

## ⚠️ Aam galatfehmi

| Galatfehmi | Sach |
|---|---|
| "1 s, 2 s, 3 s ruko — yeh exponential backoff hai" | Yeh **linear** hai. Exponential = har baar dugna: 1, 2, 4, 8 s |
| "Backoff laga diya toh storm nahi banega" | Bina random ke sab ek saath lautte hain (slow motion: 3 crash; ex1: 120/200 ne haar maani) |
| "Server bhara ho toh status 420 bhejo" | Asli jode: `503 Service Unavailable` ya `429 Too Many Requests`, saath mein `Retry-After` |

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Exp backoff kaafi hai? | Nahi — bina jitter 120/200 ne haar maani; jitter ke saath 0–1 |
| Kaunsa jitter? | Full ya decorrelated (kam calls, jaldi khatam); equal tab jab floor chahiye |
| Retry storm kaise banta hai? | Restart par atki hui saari retries ek saath → phir crash (5 crash, ~19× calls) |
| Server kaise bachaye? | Crash se pehle `503 + Retry-After` (koi doosra crash nahi, 0 user errors) |
| Client kaise bachaye? | Backoff + jitter + cap + koshish ki hadd, ya retry budget (≤ 10%) |
| Har layer par retry? | Outage mein 27× — retry sirf edge par |
| Kab retry hi mat karo? | 400 / 401 / 403 / 404 / validation error — kabhi nahi. Jawab nahi aaya / 429 / 5xx — haan, jitter ke saath |
