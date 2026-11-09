# 🧪 Lab 52 — Math of Scale: ausat ka jhooth, fan-out, knee, Amdahl aur hedging

System Gurukul → 🧪 First Principles → Math of Scale (Kyun · Kaise · Code · Kab).
Zero dependency, Node 22+. `ex0`–`ex3` aur `ex5` seeded simulations hain (koi server ya network nahi). `ex4` is machine ke
asli CPU par worker threads chalata hai. Captures Node v24.18.0 par, 14 logical CPUs wali machine par liye gaye.

```bash
npm start -- ex0-slowmo       # teen chhote udaharan, har number ke saath (tail | fanout | queue)
npm start -- ex1-tail         # 1,00,000 requests, 1.5% bahut dheemi: mean vs p50 vs p99
npm start -- ex2-fanout       # page N services ko saath bulaata hai: independent vs shared dheemapan
npm start -- ex3-knee         # ek worker, ek line: load 30% se 95% tak, random vs fixed kaam
npm start -- ex4-amdahl       # ASLI worker threads: 5% kaam akele chale toh speed-up kitna?
npm start -- ex5-hedge        # do servers, p95 ke baad doosri copy  (heavy: request khud bhaari)
npm test                      # 13 tests (asli worker threads wale do tests samet)
docker compose --profile ex1-tail up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra

- `ex0`, `ex1`, `ex2`, `ex3`, `ex5` seed 52 se chalte hain. Teen runs mein captures byte-identical rahe (`captures/`).
  Captures ek seed ke samples hain: dusre seed par numbers thode alag aayenge.
- Simulation sirf kaam aur line (queue) ka hisaab hai. Asli network, GC, disk ya OS scheduling nahi.
- `ex4` asli hai: timing har run mein badalti hai. README mein teen runs ki range hai. Container ko jitne CPU milenge, utna
  hi speed-up dikhega.
- Percentile ka niyam: nearest rank. Sorted list mein rank = ⌈p% × N⌉ wala number (`lib/stats.js`).

## ex0-slowmo — haath se ginne layak

10 requests (ms): 16, 12, 25, 15, 900, 14, 19, 15, 21, 18. Mean 1055 ÷ 10 = **105.5 ms**, p50 **16 ms**, p90 **25 ms**,
max 900 ms. Mean ke ±20% (84–127 ms) mein ek bhi request nahi.

Teen service wala page: page B ki ek call 1000 ms ki, toh page B 1000 ms ka — page sabse dheemi call ka intezaar karta hai.
Har call 1% dheemi ho toh page saaf rehne ka chance 0.99^N: 3 calls par 3.0% pages dheeme, 100 calls par **63.4%**.

Ek worker, har request 10 ms. 6 requests 0, 3, 6, 9, 40, 65 ms par: 60 ms ka saara kaam 0–75 ms ke andar, yaani 0–75 ms ki window
mein worker 80% busy. Pehli chaar requests ek saath aayi: waits 0, 7, 14, 21 ms — kul 42 ms. 6 requests har 12.5 ms par
aati toh kisi request ko intezaar nahi hota.

## ex1-tail — mean kisi ki kahani nahi

| | |
|---|---|
| dheemi requests | 1,522 / 1,00,000 |
| mean | **121 ms** |
| p50 | **40.6 ms** |
| p95 | 80.0 ms |
| p99 | **4143 ms** |
| p99.9 | 7619 ms |
| mean ke ±20% mein | sirf 1,064 requests (1.1%) |
| sirf tez requests ka mean | 45.0 ms |
| p99 ÷ mean | 34.3× |

Mean 121 ms par graph theek dikhta hai, jabki 1.5% log 2–8 s ruk rahe hain. 10 lakh requests roz par 1.5% = **15,000 dheemi
requests har din**. Mean na tez logon ki kahani hai (45 ms), na dheeme logon ki (2–8 s).

## ex2-fanout — har call 1% dheemi, page kitna dheema?

20,000 pages har row. Ek call: 10 ms + random (avg 5 ms); dheemi call ~1 s, chance 1%.

| calls | independent: dheeme pages | formula 1 − 0.99^N | shared: dheeme pages | independent page p50 |
|---:|---:|---:|---:|---:|
| 1 | 1.2% | 1.0% | 1.2% | 13.5 ms |
| 10 | 9.4% | 9.6% | 1.0% | 24.3 ms |
| 50 | 39.3% | 39.5% | 1.1% | 37.9 ms |
| 100 | **62.8%** | 63.4% | **1.0%** | **1003 ms** |

- Independent: har call apne aap 1% dheemi. 100 calls par 1% wala dheema hissa aadhe se zyada pages mein aa gaya, aur page ka
  median 1 s ho gaya. Aadhe se zyada pages tab dheeme hote hain jab 1 − 0.99^N > 50%, yaani N ≥ 69. Component ka p99 aur page
  ka p50 exactly barabar nahi hote: N independent calls par page ka CDF F(t)^N hai.
- Shared: ek hi wajah (jaise saari services ki ek hi slow dependency) ek page ki saari calls ko saath dheema karti hai. Har
  call ab bhi ~1% dheemi, par pages bhi sirf ~1% dheeme. Formula 1 − 0.99^N tabhi chalta hai jab dheemapan alag-alag ho.

## ex3-knee — load badha, intezaar kitna badha?

Ek worker, FIFO line, random (Poisson) arrivals, har row 5,00,000 requests. Random kaam = avg 10 ms (M/M/1);
fixed kaam = theek 10 ms (M/D/1).

| load | random: mean | theory 10 ÷ (1 − load) | random: p99 | fixed: mean | fixed: p99 |
|---:|---:|---:|---:|---:|---:|
| 30% | 14.3 ms | 14.3 ms | 65.5 ms | 12.2 ms | 29.0 ms |
| 50% | 20.0 ms | 20.0 ms | 91.2 ms | 15.0 ms | 43.6 ms |
| 70% | 33.1 ms | 33.3 ms | 150 ms | 21.8 ms | 76.1 ms |
| 80% | 49.4 ms | 50.0 ms | 222 ms | 30.2 ms | 115 ms |
| 90% | 96.3 ms | 100 ms | 438 ms | 56.1 ms | 228 ms |
| 95% | 186 ms | 200 ms | 849 ms | 108 ms | 454 ms |

- 50% se 90% load (1.8× kaam) par mean 20 → 96 ms (~5×), p99 91 → 438 ms. 90% se 95% par mean phir lagbhag dugna.
- Badhna `1 ÷ (1 − load)` jaisa hai: load 100% ke paas, (1 − load) shunya ke paas, intezaar bina hadd. Badhne ka aakaar
  exponential nahi hai.
- Fixed kaam (kam variance) har load par lagbhag aadha intezaar: 90% par 56 ms vs 96 ms. Variance ghatana bhi capacity hai.
- 95% load par finite sample mein theory se farq bada ho sakta hai: is run ka mean 186 ms, theory 200 ms. Warmup hata kar,
  kai seeds aur lambi runs se comparison karo; ek run se farq ki wajah tay nahi hoti.

## ex4-amdahl — asli threads, 5% akela kaam

2000 CPU units; main thread akele: 484–523 ms (teen runs). Har time teen baar ka median; workers pehle se chalu aur garam.
Units globally numbered hain, toh har worker count par locked units barabar: 5% = 100, 20% = 400.

- **phase 5%**: 5% units pehle main thread par akele (neev), phir 95% workers mein baante.
- **lock 5%**: saare units workers mein; har 20th unit ek shared lock pakad ke.
- **lock 20%**: har 5th unit lock ke andar.

| workers | Amdahl 5% | phase 5% | lock 5% | Amdahl 20% | lock 20% |
|---:|---:|---:|---:|---:|---:|
| 2 | 1.90× | 1.77–1.89× | 1.84–1.98× | 1.67× | 1.87–1.95× |
| 4 | 3.48× | 3.02–3.33× | 3.39–3.76× | 2.50× | 3.06–3.45× |
| 8 | 5.93× | 4.77–5.48× | 6.26–6.82× | 3.33× | 3.65–4.05× |
| 12 | 7.74× | 6.28–6.64× | 8.48–9.03× | 3.75× | 3.74–3.87× |

Lock ki detail (median run; lock ke andar ka samay unlock se pehle naapa): 20% lock 8 aur 12 workers par wall time ka
88–89% held raha; har lock ka ausat intezaar 1.08–1.12 ms se 2.16–2.28 ms. 5% lock 12 workers par 49–53% held.

- Phase wala run Amdahl ki line se **neeche**: threads ko kaam bhejna aur jodna bhi samay leta hai.
- Lock wala run 5% par line se **upar**: jab ek worker lock mein hai, baaki workers apna bina-lock kaam karte rehte hain.
  Amdahl ka formula maanta hai ki serial hisse mein sab rukte hain. Lock ka kul kaam (100 units) phir bhi kabhi saath nahi
  chalta, toh speed-up ki chhat 1 ÷ 0.05 = 20× rehti hai.
- 20% lock: 8 se 12 workers par speed-up nahi badha (3.65–4.05× → 3.74–3.87×). Lock 88–89% samay held tha, aur lock ka
  intezaar dugna hua — shared lock ab bottleneck hai. Chhat 5×; 5× se neeche rukne ki poori wajah (lock handoff, CPU sharing)
  is lab mein alag se nahi naapi.

Model (formula): 5% serial par 8 → 5.9×, 64 → 15.4×, 1024 → 19.6×, anant workers par 20×.

## ex5-hedge — doosri copy kab madad, kab nuksaan

Do servers, har ek par ek worker aur apni line. Normal kaam avg 8 ms. Hedge wait = har row ke load par bina hedge wali p95.
Budget = har pal tak aayi requests ka zyada se zyada 5% doosri copy le sakta hai. Cancel = line mein khadi doosri copy hata
do jab pehli jawab de de (chalti copy nahi rukti). Columns: copies sent = bheji gayi doosri copies; copies run = jo sach mein
chali; extra ms = extra copies ka service time ÷ pehli copies ka service time. 1,00,000 requests har row.

**Independent dheemapan** (1% copies copy chalaane wale server par 200 ms ruk jaati — GC ya background kaam):

| load | policy | p50 | p99 | p99.9 | copies sent | copies run | extra ms |
|---:|---|---:|---:|---:|---:|---:|---:|
| 30% | no hedge | 8.3 ms | 201 ms | 308 ms | 0% | 0% | 0% |
| 30% | hedge | 8.5 ms | 146 ms | 211 ms | 5.3% | 5.3% | 5.6% |
| 30% | hedge + budget + cancel | 8.3 ms | **138 ms** | 199 ms | 4.3% | 1.5% | 1.6% |
| 60% | no hedge | 15.8 ms | 361 ms | 532 ms | 0% | 0% | 0% |
| 60% | hedge | **59.2 s** | **143.5 s** | 144.4 s | 89.3% | 89.3% | 90.1% |
| 60% | hedge + budget | 18.2 ms | 441 ms | 766 ms | 5.0% | 5.0% | 5.0% |
| 60% | hedge + budget + cancel | 16.3 ms | **254 ms** | 379 ms | 4.2% | 1.3% | 1.3% |
| 85% | no hedge | 73.9 ms | 785 ms | 968 ms | 0% | 0% | 0% |
| 85% | hedge + budget | 187 ms | **2758 ms** | 3876 ms | 5.0% | 5.0% | 5.0% |
| 85% | hedge + budget + cancel | 73.4 ms | 677 ms | 948 ms | 3.9% | 0.4% | 0.4% |

- Kam load par hedging kaam ki: p99 201 → 138 ms.
- 60% par bina budget hedging bhaag nikli: doosri copies ne load badhaya → line lambi → zyada requests p95 wait se aage →
  aur copies. 89% requests ki doosri copy, p50 59 s. Fixed p95 wait tabhi ~5% copies deta hai jab copies khud latency na badlein.
- Budget runaway rokta hai, par bina cancel ke bhare system par p99 bigaadta hai (85%: 785 ms → 2758 ms).
- Budget + cancel ne har load par p99 sudhaara, par load badhne par fayda chhota (85%: 785 → 677 ms).

**Request khud bhaari** (`ex5-hedge heavy`: 1% requests dono servers par 200 ms). Seed 52 ke captured runs mein har policy
ka overall p99 bigda: 30% load par 204 → 227–299 ms. Bhaari request ka 200 ms service time doosri copy se chhota nahi hota;
doosri copy sirf line ka intezaar bacha sakti hai, aur doosre server ka kaam badhati hai. 30% par budget + cancel: copies run
sirf 1.2%, par extra ms **18.2%** — bhaari duplicate ginti mein chhote, kaam mein bade.

## Source ke daave aur sudhaar

Video: *System Design First Principles: Master the Math of Scale [2/15]* (`04ip8kPZXsM`).

- **Ausat ka jhooth.** Baat sahi: mean tail chhupa sakta hai (ex1: mean 121 ms, p50 40.6 ms, p99 4.1 s). Par video ka
  opening udaharan hisaab mein nahi baithta, agar mean aur 1% ek hi request set se hain: 1% × 15,000 ms = mean mein
  kam-se-kam 150 ms, jabki video mean 100 ms batata hai. User count aur request count alag hon toh daayra saaf batao.
- **1 mein 1000 roz 10 lakh baar.** Sahi: 1 arab requests ÷ 1000 = 10 lakh.
- **0.99^100 ≈ 0.36, 64% users ka page dheema.** Sahi, aur Dean & Barroso ka udaharan bhi 100-server fan-out ka hai: "If a
  user request must collect responses from 100 such servers in parallel, then 63% of user requests will take more than one
  second" ([The Tail at Scale](https://research.google/pubs/the-tail-at-scale/), CACM 2013). Shart: dheemapan har call ka
  alag ho. ex2 shared: 100 calls par bhi 1.0%.
- **"Component ki P99 system ki P50 ban jaati hai."** Andaaze ke taur par: 100 independent calls par 1% dheema hissa aadhe
  se zyada pages mein aa jaata hai (N ≥ 69 par). Values exactly barabar nahi hoti — page ka CDF F(t)^N hai. 50 calls par
  page p50 abhi 37.9 ms.
- **Queue ka intezaar 100% ke paas "exponentially" badhta hai, Little's law se.** Galat naam. Little's law (L = λ × W) sirf
  averages ko jodta hai; badhne ka aakaar queueing theory se aata hai — M/M/1 mein `S ÷ (1 − load)`. ex3 theory se milta hai.
- **60–70% par throttle / autoscale.** Thumb rule hai, kanoon nahi: fixed kaam 90% par bhi 56 ms deta hai, random kaam
  70% par 33 ms. Asli hadd SLO, variance aur scale-up ke samay se tay karo.
- **Amdahl: 5% serial → chhat 20×.** Sahi. ex4: asli phase run formula se neeche; lock wala run curve se upar par chhat 20×;
  20% lock 3.7× par ruka.
- **Hedging ka hisaab "0.01 × 0.01 = 0.1".** Galat: 0.01 × 0.01 = 0.0001, yaani 0.01% — dono independent copies ke apne-apne
  dheeme hone ka chance. Par hedge d ms baad jaata hai: total latency t ms se zyada hone ka chance
  P(T1 > t) × P(T2 > t − d) hai (t ≥ d). Probability 100× ghatne ka matlab latency 100× ghatna nahi.
- **"Tail latency 100× ghati."** Zyada daava. Paper ka asli number: "sending a hedging request after a 10ms delay reduces
  the 99.9th-percentile latency for retrieving all 1,000 values from 1,800ms to 74ms while sending just 2% more requests" —
  ek benchmark, ~24×. Paper ki shart: "The technique works because the source of latency is often not inherent in the
  particular request but rather due to other forms of interference." Aur: "Although naive implementations of this
  technique typically add unacceptable additional load, many variations exist that give most of the latency-reduction
  effects while increasing load only modestly." p95 tak rukne par: "This approach limits the additional load to
  approximately 5% while substantially shortening the latency tail." Paper cancel par bhi zor deta hai: "The client cancels
  remaining outstanding requests once the first result is received." ex5 teeno shartein naapta hai: bhaari request par
  seed 52 runs mein hedging se p99 bigda, bina budget runaway hua, bina cancel bhare system par nuksaan hua.
- **Errors aur traffic.** Video kehta hai: errors utni hi, traffic kam → users service tak pahunch hi nahi pa rahe. Error count
  same aur traffic kam hone par error percentage zaroor badhta hai. Par sirf error percentage se requests ka na pahunchna prove
  nahi hota (demand bhi gir sakti hai); client metrics, load balancer metrics aur bahar se probes bhi dekho.
- **Four golden signals.** Google SRE book: "The four golden signals of monitoring are latency, traffic, errors, and
  saturation." Saturation: "How "full" your service is." "Note that many systems degrade in performance before they achieve
  100% utilization, so having a utilization target is essential." "Latency increases are often a leading indicator of
  saturation." Errors par: "It’s important to distinguish between the latency of successful requests and the latency of
  failed requests." ([Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/))

## Files

- `lib/stats.js` — seeded random (mulberry32), nearest-rank percentile, summary.
- `lib/sim.js` — `tailSample`, `fanout`, `queueRun` (Lindley recursion), `hedgeRun` (do servers ka event simulation), `amdahl`.
- `lib/work.js` — CPU kaam ki ek unit, aur `Atomics` wala lock.
- `lib/pool.js` — ex4 ka worker pool: contiguous global numbering, lock ka held/wait samay jodta hai.
- `services/worker.js` — ex4 ka worker thread; lock ka held time unlock se pehle padhta hai.
- `tools/*.js` — har exercise ka tool. `start.js` naam se tool chalata hai.
- `test/core.test.js` — 13 tests: percentile niyam (rounding samet), seed, tail, fan-out formula, queue theory (M/M/1 aur
  M/D/1 ±5%), hedging ke seed 52 samples, budget kabhi paar nahi (chhote samples par bhi), cancel line mein khadi copy
  hatata hai aur 85% par budget-only se behtar, bhaari duplicates ka extra ms, pool mein locked units har worker count par
  barabar, heap ka kram, Amdahl formula, aur 4 asli threads saath shuru karke lock ki sahi ginti (bina lock 4-thread run
  4 lakh mein se ~1.4–1.6 lakh hi ginta hai). Mutation check: purana budget niyam aur band cancel, dono par naye tests fail.

## Practice

1. `ex3-knee` mein kaam 10 ms se 5 ms karo. 90% load par mean kya hoga? Pehle formula se socho.
2. `tools/fanout.js` mein shared mode ka chance 1% se 0.1% karo. 100 calls par kitne pages dheeme?
3. `tools/hedge.js` mein budget 5% se 1% karo. 60% load par p99 kya hua?
