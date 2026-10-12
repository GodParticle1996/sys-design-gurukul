# 🐳 Lab 10 — Live migration: dual write vs CDC, state vs delta, shadow cutover

System Gurukul → 🗄️ Data & Storage → **Migration** level ka lab ("Migrating 50TB at 100k RPS" video).

`source` purana DB hai (50,000 rows) jo har write ko ek **append-only log** mein bhi likhta hai —
Oracle redo log / Postgres WAL jaisa. `target` naya DB hai.

```bash
npm start <exercise>
docker compose --profile <exercise> up --build
```

Numbers asli run ke hain (Node 24, ek laptop).

---

## ex1-dual-write-vs-cdc — kaunsa raasta drift karta hai

```bash
npm start ex1-dual-write-vs-cdc          # source + target
node tools/scenario.js dual              # backfill + app dual writes (2% fail, 1% retry-duplicate)
node tools/scenario.js cdc-state         # snapshot + log tail, poori row ki STATE, 10% redelivery
node tools/scenario.js cdc-delta         # snapshot + log tail, sirf DELTA, 10% redelivery
```

Har scenario 8 second tak 400 writes/second chalata hai, phir source aur target ki har row compare karta hai.

```
== scenario: dual
  writer → band: 3200 writes, target par fail 62, dobara 31
compare: source 50000 rows · target 50000 rows · missing 0 · galat balance 93   ❌ drift
== scenario: cdc-state
compare: source 50000 rows · target 50000 rows · missing 0 · galat balance 0    ✅ match
== scenario: cdc-delta
compare: source 50000 rows · target 50000 rows · missing 0 · galat balance 280  ❌ drift
```

👉 Teen sabak ek saath:
1. App dual write mein har fail aur har retry-duplicate ek **permanent** farq hai (62 + 31 ≈ 93).
2. CDC log ko offset se padhta hai, isliye kuch chhootta nahi — aur **state** events redelivery
   par bhi safe hain (purana version ignore).
3. Wahi CDC **delta** events ke saath redelivery par galat ho jaata hai ("10 ghatao" do baar).

---

## ex2-shadow-cutover — shadow compare, 1% → 100%, rollback

CDC (state) chalu hai, writer 200 writes/second. Proxy har read ko source se serve karta hai aur
**shadow** mein target se bhi poochh kar compare karta hai. Phir user id ke hisaab se shift.

```bash
npm start ex2-shadow-cutover
node tools/shadow.js
```

```
shift   0%   source se: 1000   target se:    0   shadow compare: 1000   mismatch: 0
shift   1%   source se:  990   target se:   10   shadow compare:  990   mismatch: 0
shift  10%   source se:  899   target se:  101   shadow compare:  899   mismatch: 0
shift  50%   source se:  485   target se:  515   shadow compare:  485   mismatch: 0
shift 100%   source se:    0   target se: 1000   shadow compare:    0   mismatch: 0
rollback → shift 0%  (2 ms, ek flag)
```

Tulna ke liye — agar target dual writes se bhara ho (bugs ke saath), wahi shadow compare
mismatch pakad leta hai (humare run mein 1,000 reads par 1–2), **kisi user ko galat jawab diye bina**.

---

## Ports

| Kya | Port |
|---|---|
| proxy | 5000 |
| source · target | 5001 · 5002 |
