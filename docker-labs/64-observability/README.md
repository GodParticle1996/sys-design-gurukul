# 🧪 Lab 64 — Observability: average ka jhooth, trace ka safar, signals ki keemat, line ka ganit aur error budget

System Gurukul → 🧪 First Principles → Observability: andhe mat udo (Kyun · Kaise · Code · Kab).
Node 24+, koi package install nahi. Captures Node v24.18.0 par, WSL2 machine par. ex1 apne hi process mein `127.0.0.1` ke random
ports par chaar chhote HTTP servers chalata hai (bahar kuch publish nahi); baaki exercises seedha hisaab ya seeded model hain.

🛡️ Resilience track ke `observability` aur `slo` levels RED/USE, metrics/traces/logs ka kaam, liveness vs readiness, symptoms par
alert aur error budget sikhate hain; lab 42 (chaos) aur lab 43 (health checks) un levels ke saath chalte hain. Lab 64 un baaton ko naapta hai
jo video bolta hai par dikhata nahi: average aur p99 asal mein kya chhupaate hain, trace header kaise safar karta hai aur kab
toot-ta hai, har signal ki keemat, "line kab phatti hai" ka ganit, aur kaunsa alert raat 3 baje jagaye.

```bash
npm start -- ex0-average   # Hisaab + seeded model: average vs p50/p99 (do definitions), ek user ke kai requests, p99 ka average
npm start -- ex1-trace     # ASLI HTTP (ek hi machine par): metric → trace → logs; ghadi ka farq; traceparent header gira toh
npm start -- ex2-cost      # Hisaab + seeded model: logs vs metrics ka size, labels se series, head vs tail sampling
npm start -- ex3-queue     # Seeded simulation: 1 cashier 50% / 80% / 92% / 99% / 100%+, fixed vs random, 8 cashier
npm start -- ex4-budget    # Model (30 din, minute-dar-minute): error budget, seedha threshold vs burn-rate alerts
npm test                   # 6 tests
npm run mutate             # 19 jaan-boojh kar daali galtiyan — har ek par tests fail hone chahiye (test/mutate.js)
docker compose --profile ex1-trace up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra (kya asli, kya model)

- **ex0:** video ka 100-request misaal seedha hisaab hai. "Teen hosts" wala hissa seeded log-normal latencies hai (koi asli server nahi).
- **ex1 asli:** chaar Node HTTP servers (gateway, auth, product, db), asli `traceparent` header (W3C Trace Context), asli timers.
  db ka 300 ms "join" ek **daala hua sleep** hai; product ki ghadi 50 ms peeche hona **maana** gaya hai. 200 requests, unmein 4
  bade catalog wale. Trace id seeded hain taaki capture dohraaya ja sake (asli mein random). Aane wala `traceparent` jaancha
  jaata hai (version `ff`, saare-zero ids, galat lambai/akshar → naya trace); version 00 ka subset, aage ke versions ke pehle chaar hisse padhe jaate hain.
- **ex2:** 10 lakh requests/minute aur ~1 KB log/request **maane** hue; 1–2 byte/sample Prometheus docs se. Sampling seeded model.
- **ex3:** ek-ek customer ka simulation (FIFO), seeded. "Random" = exponential gaps/times (textbook M/M/c). Formula aur simulation
  dono chhapte hain.
- **ex4:** ek 30 din ka mahina, traffic barabar, ek incident din 10 par, ek-ek minute ka hisaab ("1 min" = pehla minute, sub-minute
  naap nahi). Alert rules SRE Workbook ("Alerting on SLOs") se; video ka 1% rule alag column (V) mein, 10 min window maani hui.

## ex0-average — average kya chhupata hai

| 100 requests | Average | p50 | p99 (nearest-rank) | p99 (linear) | Max |
|---|---|---|---|---|---|
| 99 × 10 ms + 1 × 10 s (video) | 109.9 ms | 10 ms | **10 ms** | 109.9 ms | 10 s |
| 98 × 10 ms + 2 × 10 s | 209.8 ms | 10 ms | 10 s | 10 s | 10 s |

- Video ka hisaab (average ~110 ms) sahi. Par video ke apne misaal mein nearest-rank p99 = 10 ms: theek 1% dheeme hon toh dheeme requests p99 ke
  **upar** baithte hain. p99 "sabse bure 1%" ki seema hai, unka haal nahi; max (ya p99.9) aur dheeme requests ki ginti bhi dekho.
- Percentile requests ka hai, users ka nahi: har request 1% chance se dheemi ho (aazaad, maana), toh 20 requests wale user ko 18.2%,
  100 wale ko 63.4% chance ki kam se kam ek dheemi mile.
- Teen hosts ke p99 ka average koi percentile nahi: ek case mein asli p99 se 11.8× zyada, doosre mein 2.6× kam. Histogram ke buckets
  jodo (ginti judti hai), phir p99 nikaalo — jawab bucket ki chaudai jitna sahi (26.0 ms asli, 33.9 ms histogram se, bucket 25–50),
  **jab tak jawab kisi finite bucket mein ho**. Sabse upar wale (+Inf) bucket mein gira toh sirf aakhri finite seema milti hai: teen 20 s
  ki requests → "10 s". Khaali histogram → NaN (Prometheus jaisa). Lab har bucket ki apni ginti rakhta hai; Prometheus ke `_bucket`
  counts cumulative hote hain — same jaankari.
- **Flow ke `latency` level se takraav:** Flow mein 99 tez + 1 dheemi (5 s) request ko "p99 = 5,000 ms" kaha gaya hai, aur requests ko
  log gina gaya hai. Is lab ki definitions se same data nearest-rank p99 10 ms aur linear 59.9 ms deta hai; p99 = 5 s ke liye 100 mein
  2 dheemi chahiye. Flow wala level alag se sudhaarna baaki hai (definition likho, ya 2 dheemi requests lo).

## ex1-trace — waqt kahan gaya

3 runs (asli timing): gateway average 10.3–10.4 ms, p50 4.2 ms, p99 303.5–304.4 ms, 100 ms se upar 4 requests.

```text
gateway  /checkout   304.7 ms        Logs, timestamp se sort:         -47 ms  product  price dhoondh raha
  auth     /check      2.5 ms                                            0 ms  gateway  request aaya: big-7
  product  /price    301.1 ms                                            3 ms  db       join shuru: big-7
    db       /query  300.5 ms                                          254 ms  product  price mila
                                                                       304 ms  db       query khatam
```

- **Metric** batata hai KI kuch dheema hai (p99 ~303 ms, p50 ~4 ms). **Trace** (parent span id se joda) batata hai KAHAN: db mein.
- **Logs** trace_id se mil jaate hain, par timestamp ka kram jhooth bolta hai: product ki ghadi 50 ms peeche hai, toh "price dhoondh
  raha" request aane se pehle dikhta hai, aur "price mila" db ke "query khatam" se pehle — asambhav. Kaun kiske andar chala,
  parent span id batata hai; har span ki duration ek hi machine ki ghadi se naapi jaati hai, isliye ghadi ka farq duration nahi bigaadta.
- **Bahar se aaya trace:** caller ka `traceparent` aaye toh gateway caller ke trace mein judta hai aur caller ka parent id rakhta hai; ped
  gateway se shuru hota hai (test is case ko chalata hai).
- **Header gira:** product `traceparent` aage nahi bhejta, toh trace product ke 301 ms par ruk jaata hai; db ke 200 spans alag,
  akele traces mein chale jaate hain. OpenTelemetry jaisi library header apne aap aage bhejti hai; Istio ke docs bhi kehte hain ki
  har app ko aane wale headers jaane wali requests mein aage bhejne padte hain.

## ex2-cost — har signal ki keemat

| Signal | Maana hua | Ek din |
|---|---|---|
| Logs | 10 lakh req/min × ~1 KB | 1.44 TB (30 din: 43.2 TB) |
| Metrics (sirf samples, disk par compressed) | kul 300 series × har 15 s × ~2 byte | 3.5 MB |

- In maanyataon par ~4 lakh× ka farq (logs ka compression nahi joda; 10× dabaane par bhi ~42 hazaar×). Metric sasta isliye ki metric
  ginti hai, kahani nahi. 1–2 byte/sample **disk** ka hai; index, WAL aur RAM mein chalti series alag kharcha hain — video ka "saalon
  ke metrics memory mein" sahi nahi: RAM ka kharcha active series ki ginti se badhta hai.
- Metric tab tak sasta jab tak label values gine-chune hon: `{method, route, status}` = 300 series tak; `user_id` (10 lakh) jodo
  toh 30 crore tak. Prometheus docs: user ID, email jaise anginat values label mein mat daalo.
- Sampling (1,00,000 traces, 0.1% error, 1% dheemi): head sampling (1% sikka, shuru mein) ~1,000 rakhta hai par errors **0–1**;
  tail sampling (saare error + dheeme + baaki ka 1%) 2,126 rakhta hai aur **saare** errors — is aadarsh model mein, jahan har trace
  poora aur samay par collector tak pahunchta hai. Asli mein der se aaya error span pehle liye faisle ko nahi badal sakta, aur upstream
  head sampling ke phenke traces wapas nahi aate. Keemat: ek trace ke saare spans ek hi collector tak aane chahiye, faisle se pehle saare
  spans bhejne padte hain, aur collector faisle tak (OpenTelemetry mein default 30 s) spans memory mein rakhta hai.

## ex3-queue — line kab phatti hai

Ek cashier, checkout average 1 min, 10 lakh customers ("wait" = line mein, apna checkout chhod kar):

| Gap | Busy (ρ) | Formula ρ/(1−ρ)·S | Simulated wait | Kitne ruke | p99 wait | Ghante mein nikle |
|---|---|---|---|---|---|---|
| 120 s | 50% | 1.00 min | 1.00 min | **50.0%** | 7.92 min | 30.0 |
| 75 s | 80% | 4.00 min | 4.03 min | 79.9% | 22.3 min | 48.0 |
| 65 s | 92.3% | 12.0 min | 12.2 min | 92.2% | 63.9 min | 55.4 |

- 50% par "koi wait nahi karta" galat: aadhe log rukte hain, average wait = ek checkout (video ka apna formula bhi 50% par wait = service time deta hai).
  Fixed gap + fixed checkout (D/D/1) mein 50% aur 92.3% dono par koi nahi rukta — wait ki jad randomness hai. Random gap + fixed
  checkout (M/D/1): wait M/M/1 ka aadha (92.3% par 6.0 min).
- 99% par formula 99 min; chhe seeds (40 lakh customers har ek) 90–118 min. Bahut bada aur dheere tikta hai, par **anant nahi**.
  Bina had sirf 100% ya 100% se upar: wait run ki lambai ke saath badhta jaata hai (100%: 10,000 ke baad 40 min, 10 lakh ke baad 486 min).
- Throughput (ghante mein nikle) aane walon ke barabar, busy hisse ke saath seedha badhta hai — **utilization law** (U = X·S)
  bhi seedhi line kehta hai. Video ρ/(1−ρ) ko "utilization law" kehta hai; ρ/(1−ρ) asal mein M/M/1 ka wait formula hai. Seedhi line throughput ki hai; latency nahi.
- 85% busy par 1 cashier: wait 5.67 min; 8 cashier: 0.48 min. "70% par alert" single-cashier jaisa thumb rule hai; asli seema SLO,
  utaar-chadhaav aur pool ke size se nikalti hai — load test se naapo.

## ex4-budget — error budget aur kaunsa alert jagaye

Budget (30 din): 99.9% → 43.2 min · 99.95% → 21.6 min · 99.99% → 4.32 min. Video ka misaal: 5 min kharch → 38.2 bache; 2 hafte
mein 40 → 3.2 bache. Requests mein: 10 crore requests/mahina par 99.9% → 1,00,000 fail ho sakti hain.

SLO 99.9%. V = PAGE: error rate ≥ 1%, pichhle 10 min ka chalta average (video ka 1%; window video ne nahi di — maani). A = PAGE:
error rate ≥ SLO ki seema (0.1%), 10 min chalta average — SRE Workbook ka "approach 1". B = PAGE: burn > 14.4 (1 ghanta + 5 min).
C = PAGE: burn > 6 (6 ghante + 30 min). D = TICKET: burn > 1 (3 din + 6 ghante). B–D Workbook Table 5-8 ke numbers aur strict `>`;
V aur A `≥` (Workbook approach 1 jaisa). Cell = incident shuru hone ke kitne minute baad (tab tak budget kitna jala).

| Incident | Poora jala | V | A | B | C | D |
|---|---|---|---|---|---|---|
| Poora outage, 20 min | 46.30% | 1 min (2.31%) | 1 min (2.31%) | 1 min (2.31%) | 3 min (6.94%) | 5 min (11.57%) |
| 2% errors, 6 ghante | 16.67% | 5 min (0.23%) | 1 min (0.05%) | 44 min (2.04%) | 109 min (5.05%) | 217 min (10.05%) |
| 0.3% errors, 7 din | 70.00% | — | 4 min (0.03%) | — | — | 1441 min (10.01%) |
| 5% errors, 5 min | 0.58% | 2 min (0.23%) | 1 min (0.12%) | — | — | — |
| 0.2% errors, 10 min | 0.05% | — | 5 min (0.02%) | — | — | — |

Outage khatam hone ke baad alert kitni der bajta raha (reset time): V 9 · A 9 · B 4 · C 29 · D 359 min — chhoti window jaldi chup karati hai.

- Video ka 1% rule (V) 70% budget wali dheemi jalan (0.3%) aur 0.2% kabhi nahi pakadta, par 5 min ke 5% jhatke par 2 min mein jagata hai.
- Seedha threshold A har incident 5 min ke andar pakadta hai, par budget ke 0.58% aur 0.05% wale jhatkon par bhi page karta hai.
- Burn-rate alerts sirf tab page karte hain jab budget sach mein khatre mein ho; keemat: 2% wale incident par page 44 min baad. Dheemi
  jalan par page nahi, ticket. Chunaav precision, recall, detection time aur reset time ka tradeoff hai; Workbook ke numbers shuruaati
  maan hain, apne SLO aur traffic par tune karo.

## Source ke daave aur sudhaar

| Video kehta hai | Sach / sudhaar | Kahan se |
|---|---|---|
| 99 × 10 ms + 1 × 10 s → average ~110 ms | Sahi (109.9 ms). Par nearest-rank p99 = 10 ms: theek 1% dheeme p99 ke upar baithte hain | ex0 |
| "P90: 90% users P90 se tez", "P99: sabse bure 1% users" | Percentile **requests** ka hai; 100 requests wale user ke 63% chance ek dheemi mile (aazaadi maani) | ex0 |
| 10 services × 1% dheemi → ~10% requests dheemi | 1 − 0.99¹⁰ = 9.6%, jab har service zaroori ho aur jhatke aazaad hon (lab 63 ex1) | lab 63 |
| Trace id se saare logs "timestamp se sort" → ek timeline | Logs mil jaate hain; kram alag machines ki ghadi par tika. Parent span id se tree banta hai | ex1 |
| Har service header aage bhejti hai | Haan — aur ek bhi chhoota toh trace toot-ta hai. Library (OpenTelemetry) header aage bhejti hai; Istio mein bhi app ko bhejna padta hai | ex1 |
| Metrics "incredibly cheap", "saalon ka data memory mein" | Disk par sasti (1–2 byte/sample, compressed); RAM ka kharcha active series par. Har label-combination nayi series — user ID label sab bigaad deta hai | ex2 |
| Tail sampling se errors bachte hain (video ne nahi kaha, lab ka sujhaav) | Tabhi jab poora trace samay par ek collector tak pahunche; pehle saare spans bhejne ka kharcha | ex2 |
| Grocery: 50% busy → "nobody waits" | Random aane par aadhe rukte hain, wait ≈ ek checkout; "koi nahi rukta" sirf jab sab fixed ho | ex3 |
| 65 s par ek customer → ~92% busy | Sahi (92.3%); wait ~12 min (formula aur simulation) | ex3 |
| 99% par "queue grows without bound", "wait → infinity" | 99% par wait ~99× service time — bada par seemit. Bina had sirf ≥ 100% par | ex3 |
| ρ/(1−ρ) "utilization law" | ρ/(1−ρ) M/M/1 ka wait formula hai. Utilization law U = X·S hai — throughput seedha badhta hai | ex3 |
| "1000 rps @ 50% → 2000 @ 100% galat" | Throughput ke liye lagbhag theek (utilization law); seedha nahi badhta wait/latency | ex3 |
| 85% → 91% CPU par context switching, cache thrash se latency "explode" | Line ka ganit akela hi latency ka jhatka dikhata hai; OS ke asar upar se jud sakte hain. Curve hyperbolic hai, "exponential" nahi | ex3 |
| "70% par alert karo" | Single-server jaisa thumb rule. 8 servers 85% par bhi 1 server se ~12× kam wait; SLO aur load test se tay karo | ex3 |
| 99.9% → ~43 min/mahina; 5 kharch → 38 bache; 40 kharch → 3 bache, freeze | Sahi (43.2 min, 30 din). Budget requests mein bhi gin sakte ho | ex4 |
| "Error rate 1% se upar ho toh jagao" | 99.9% SLO par 0.3% (budget ka 70%) aur 0.2% kabhi nahi pakadta, 5 min ke 5% jhatke par jagata hai (V). SLO wala threshold (A) sab pakadta par chhote jhatkon par bhi; burn-rate alerts budget ke khatre par | ex4 |
| "0.1% errors theek, 5% crisis" | Gambhirta SLO, kitni der, kaunsa kaam (checkout ya like) aur users par asar se tay hoti hai. 99.99% SLO par lagataar 0.1% = burn 10; 5 min ka 5% budget ka 0.58% | ex4 |
| SLO SLA se kadak (SLA 99.9 → SLO 99.95) | Theek chalan; 99.95% ka budget 21.6 min | ex4 |
| Four golden signals: latency, traffic, errors, saturation (Google SRE) | Sahi (SRE book, "Monitoring Distributed Systems") | `observability` level |
| Blameless culture | Sahi (SRE book: contributing causes, kisi insaan ya team par ilzaam nahi) | — |
| "Monitoring reactive hai, observability batati hai kyun" | Farq kaam aur kshamata ka hai, kathor reactive/proactive nahi. Monitoring jaanch aur trend bhi karti hai; observability tabhi jab instrumentation kaafi ho | — |
| "Average bhool jao, p99 optimize karo" | p99 bhi chhupa sakta hai (ex0). Threshold aur kis set ka percentile, user ki zaroorat se chuno; failaav aur kharab requests ka hissa dekho. Average ke apne kaam hain (capacity, ex3 ka service time) | ex0 |
| "Jis metric par turant action nahi, hatao" | Page ke liye action zaroori. Jaanch aur planning wale graph bina turant action ke bhi kaam ke; video ka service → component → trace/log raasta sahi | — |

## Sources

- Google SRE book, *Monitoring Distributed Systems* (four golden signals) — https://sre.google/sre-book/monitoring-distributed-systems/
- Google SRE Workbook, *Alerting on SLOs* (burn rate, Table 5-8) — https://sre.google/workbook/alerting-on-slos/
- Google SRE book, *Postmortem Culture* — https://sre.google/sre-book/postmortem-culture/
- W3C, *Trace Context* (`traceparent`) — https://www.w3.org/TR/trace-context/
- OpenTelemetry Collector, tail sampling processor — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Istio, *Distributed tracing overview* (header propagation) — https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Prometheus, *Storage* (1–2 bytes/sample) — https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus, *Metric and label naming* (high-cardinality labels) — https://prometheus.io/docs/practices/naming/
- Peter Denning, Jeffrey Buzen, *The Operational Analysis of Queueing Network Models* (ACM Computing Surveys, 1978) — utilization law U = X·S
- Jeffrey Dean, Luiz André Barroso, *The Tail at Scale* (CACM, 2013) — https://research.google/pubs/the-tail-at-scale/

## Files

| File | Kya |
|---|---|
| `lib/stats.js` | Do percentile definitions (nearest-rank, linear) aur average |
| `lib/latency.js` | ex0: video ka misaal, user ka hisaab, hosts aur histogram |
| `lib/mesh.js` | ex1: chaar HTTP services, `traceparent`, spans, logs, tree |
| `lib/cost.js` | ex2: logs/metrics ka size, series, sampling |
| `lib/queue.js` | ex3: FIFO simulation (1 ya kai cashier) + M/M/1, M/D/1, M/M/c formulas |
| `lib/budget.js` | ex4: budget, alert rules, incidents |
| `tools/*.js` | Har exercise ka tool |
| `test/core.test.js` | 6 tests: numbers, percentile definitions, histogram ke kinare, `traceparent` ke kinare, queue formulas, har alert rule (positive, chup rehna, reset) |
| `test/mutate.js` | `npm run mutate`: 19 jaan-boojh kar daali galtiyan, har ek par tests fail hone chahiye |
| `captures/` | Har exercise ka output (ex1: 3 runs) + `test.txt` |

## Practice

1. ex0 mein dheeme requests 1 se 3 karo. Nearest-rank p99 aur linear p99 ab kya kehte hain?
2. ex1 mein product ki ghadi −50 ms se +50 ms karo. Logs ka kram kaise badla? Trace tree badla?
3. ex2 mein head sampling 1% se 10% karo. Kitne errors bache, aur kitna storage laga?
4. ex3 mein 4 cashier 92% busy par chalao. 1 cashier ke 12 min se tulna karo.
5. ex4 mein SLO 99.99% karo. 20 min ka outage budget ka kitna jalata hai?
