# 🐳 Lab 05 — Airtable: RAM ki speed, RAM ki chhat, diffs aur dual run

```bash
npm start <exercise>
docker compose --profile <exercise> up --build
```

Numbers asli run ke hain — tumhare machine par thode alag aayenge.

---

## ex1-in-memory-base — speed ke badle ek machine ki chhat

`MODE=disk`: har filter par store se rows chunks mein padho (round trip + parse).
`MODE=memory`: poora base ek baar memory mein, phir sab wahin.

```bash
RECORDS=100000 npm start ex1-in-memory-base              # MODE=disk
node tools/filter-load.js --queries 100
RECORDS=100000 MODE=memory npm start ex1-in-memory-base
node tools/filter-load.js --queries 100
RECORDS=1500000 MODE=memory npm start ex1-in-memory-base # chhat
```

```
MODE=disk   p50: 27 ms   p99: 474 ms   rss:  95 MB   (1,00,000 records)
MODE=memory p50:  3 ms   p99:  65 ms   rss: 110 MB   (1,00,000 records)

loading base…  15,00,000 records
❌ worker refused: base ko ~5.1 GB chahiye, limit 4.0 GB (MAX_BASE_MB)
   → yahi woh jagah hai jahan product mein "record limit" likhni padti hai
```

---

## ex2-live-views — har view dobara chalao vs sirf diff bhejo

40 viewers, har ek ki apni filter. 20 writes/second, 5 second.

```bash
npm start ex2-live-views                                 # VIEWS=rerun
node tools/views.js --viewers 40 --wps 20 --for 5
VIEWS=diff npm start ex2-live-views
node tools/views.js --viewers 40 --wps 20 --for 5
node tools/deps.js                                       # dependency chain
```

```
VIEWS=rerun viewers: 40   view queries run: 3,360   rows sent: 99,45,600   diffs sent:   0   write p99: 19 ms
VIEWS=diff  viewers: 40   view queries run:    40   rows sent:  1,19,024   diffs sent: 624   write p99:  4 ms

changed: rows[4].qty
  → formula line_total      (1 record)
  → rollup  order_total     (1 record)
  → lookup  customer_spend  (1 record)
recomputed: 3 records · views touched: 1 · rows sent: 1
```

(diff mode ke 1.19 lakh rows mein se lagbhag sab shuruaati view-load hain — writes ke dauraan sirf 624 diffs gaye.)

---

## ex3-dual-run — naya engine, purane ke saath chala kar

`legacy` primary hai, `next` shadow. `next` mein do chhote bugs hain:
banker's rounding (sirf `.xx5` wale averages par alag) aur khaali cell par `sum()` = `null`.

```bash
npm start ex3-dual-run
node tools/dual-run.js --ops 5000
node tools/dual-run.js --ops 5000 --fix 1       # dono bug theek
node tools/cutover.js --to next
node tools/dual-run.js --ops 1000
node tools/cutover.js --to legacy               # rollback
```

```
primary=legacy   ops: 5000   mismatches: 213   (4.26%)
  rollup(avg) rounding   ×88    e.g. avg: legacy=26.13 next=26.12
  empty-cell in sum()    ×125   e.g. sum: legacy=23.37 next=null
primary=legacy   ops: 5000   mismatches: 0   (0.00%)   ✅ dono engines ka jawab same
{"primary":"next"}
primary=next     ops: 1000   mismatches: 0   (0.00%)   ✅
{"primary":"legacy"}
```

---

## Ports

| Kya | Port |
|---|---|
| worker (ex1) | 4501 |
| base-worker (ex2) | 4502 |
| dual-api (ex3) | 4503 |
