# 🐳 Lab 03 — Jira: tenants, index drift, permissions

```bash
npm start <exercise>
docker compose --profile <exercise> up --build
```

Numbers asli run ke hain (Node 24, ek laptop) — tumhare machine par thode alag aayenge.

---

## ex1-tenant-isolation — data isolation aur resource isolation do alag cheezein hain

`services/api.js` do modes mein chalti hai. `/search` endpoint mein jaan-boojh kar
**tenant filter chhoda gaya hai** — dekho kis mode mein leak hota hai.

```bash
npm start ex1-tenant-isolation                 # TENANCY=shared
node tools/leak-test.js
node tools/noisy.js --monster 25 --others 10 --for 3

TENANCY=perdb npm start ex1-tenant-isolation
node tools/leak-test.js
node tools/noisy.js --monster 25 --others 10 --for 3

TENANCY=perdb CAP=8 npm start ex1-tenant-isolation
node tools/noisy.js --monster 25 --others 10 --for 3
```

```
TENANCY=shared  /search?q=salary → 200 rows   (150 rows DOOSRE tenants ke)   ❌ leak
TENANCY=perdb   /search?q=salary →  50 rows   (0 rows doosre tenants ke)     ✅

TENANCY=perdb          others p99: 992 ms   monster p99:  1020 ms   monster ne max 40/40 connections liye
TENANCY=perdb  CAP=8   others p99:  64 ms   monster p99: 12442 ms   monster ne max  8/40 connections liye
```

👉 Alag database **data** alag karta hai. Connections, CPU aur I/O phir bhi shared hain —
unke liye **per-tenant cap** chahiye. Aur cap ki keemat monster tenant khud bharta hai.

---

## ex2-index-reconcile — har copy drift karti hai

`services/index-api.js` mein ek issue store hai aur ek alag "search index".
`DROP_RATE=0.1` yaani 10% index writes gir jaati hain.

```bash
npm start ex2-index-reconcile                  # RECONCILE=off
node tools/drift.js --writes 5000
node tools/reconcile-on.js && node tools/drift.js --wait 1500
node tools/reindex.js --mode in-place
node tools/reindex.js --mode swap
```

```
wrote 5000 issues   db: 5000   index: 4521   drift: 479 missing / 0 stale   ❌ search 9.6% issues galat dikha raha hai
reconcile: on
db: 5000   index: 5000   drift: 0 missing / 0 stale   ✅   (reconcile passes: 2, repaired: 479)

reindex mode=in-place time: 1022 ms   docs: 5000   searches ok: 87    searches GALAT: 71
reindex mode=swap     time: 1027 ms   docs: 5000   searches ok: 154   searches GALAT:  0
```

👉 Database index ka **checklist** hai (har document ka expected version). Aur rebuild
karna ho toh **alag banao → replay → ek atomic switch**.

---

## ex3-permission-search — permissions kahan lagti hain

3,00,000 issues, 2,000 projects, 64 shards. `analyst` ko sirf 80 projects dikhte hain.

```bash
npm start ex3-permission-search                # PERM=after
node tools/search.js --user analyst
node tools/search.js --user analyst --project 7

PERM=inside npm start ex3-permission-search
node tools/search.js --user analyst
node tools/search.js --user analyst --project 7
```

```
PERM=after   matched: 2,00,000   permission checks: 2,00,000   time: 699 ms   returned: 20
PERM=after   (project 7)  matched: 100   permission checks: 100   shards touched: 1/64   time: 69 ms

PERM=inside  matched: 8,000      permission checks: 20          time:  63 ms   returned: 20
PERM=inside  (project 7)  matched: 100   permission checks:  0   shards touched: 1/64   time: 41 ms
```

👉 `after` mein kaam **result-set ke size** par nirbhar hai (2 lakh checks, 20 rows ke liye).
`inside` mein sirf woh 20 checks bache jo issue-level security ke liye zaroori the.
Aur project-scoped query 64 mein se **1** shard chhoo kar nikal jaati hai.

---

## Ports

| Kya | Port |
|---|---|
| api (ex1) | 4301 |
| index-api (ex2) | 4310 |
| search (ex3) | 4320 |
