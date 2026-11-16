# 🧪 Lab 62 — Doosri koshish ka hisaab: metastable failure, jitter, deadline, idempotency, DLQ

System Gurukul → 🧪 First Principles → Retries (Kyun · Kaise · Code · Kab).
Node 24+, koi package install nahi. Captures Node v24.18.0 par, WSL2 machine par. Koi port nahi. Saari exercises seedha
hisaab, model ya asli code hain — har run same.

Resilience track pehle se asli servers par dikhata hai: lab 37 (retry storm, jitter ke saath 200 clients, 3 × 3 × 3 = 27 layers)
aur lab 38 (circuit breaker: cascade, counting, half-open). Lab 62 un "maths" ko naapta hai jo video bolta hai par dikhata nahi:
trigger khatam hone ke baad bhi retries system ko kyun gira hua rakhte hain, chaar jitter strategies ka mukabla, deadline ke
andar kitne retries fit hote hain, idempotency key ke kinaare, aur DLQ ki retention.

```bash
npm start -- ex0-metastable      # MODEL: spike ke baad retries ka loop; turant retry, backoff (chhota/bada), token bucket
npm start -- ex1-jitter          # MODEL (seeded, saral slot model): jitter nahi / chhota / equal / full / decorrelated
npm start -- ex2-deadline        # ASLI ginti: user → A → B → C; timeouts, retries, deadline propagation aur cancel
npm start -- ex3-idempotent-ops  # ASLI code: idempotency key store, double click, key expiry, delete + id reuse, +100 vs set
npm start -- ex4-dlq-mttr        # Arithmetic: SQS standard vs FIFO DLQ retention; MTBF / MTTR se availability
npm test                         # 5 tests
docker compose --profile ex0-metastable up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra (kya asli, kya model)

- **ex0 model:** 1 s ke kadam; overload par kaam ki raftaar `1,000 × 1,000 / load` **maani gayi** (timeout wali requests ka kaam bekaar).
  Ye curve kisi asli system ka naap nahi. "Wapas" = bojh lagaataar 10 s tak kshamata ke andar.
- **ex1 model:** saral "slot" model, Brooker (AWS, 2015) ke OCC simulation se prerit — uski nakal nahi. Ek 1 ms slot mein kai calls
  aayein toh ek jeetti hai; har retry par 0–4 ms ka random network delay; 20 seeds ka ausat.
- **ex2 asli ginti:** ek request ki timeline, har layer ke timeout, retry, deadline aur cancel niyam se; koi asli server nahi.
- **ex3 asli code:** memory mein success-path payment API aur idempotency store, Stripe API v1 se prerit (Stripe nahi chalaya).
- **ex4 arithmetic:** SQS standard/FIFO ke retention niyam (barabar faile failure samay maan kar) aur MTBF/MTTR ka formula.

## ex0-metastable — trigger gaya, girawat rahi

```
$ npm start -- ex0-metastable
A. MODEL (1 s ke kadam): server 1,000 kaam/sec karta hai. 1,000 se zyada aayein toh har request shuru hoti hai, par timeout
   wali requests ka kaam bekaar — kaam ki raftaar girti hai (maana hua: useful = 1,000 × 1,000 / load). Naye requests 800/sec;
   t = 10–20 s par spike 1,500/sec. Ek request kul 4 koshish tak. 120 s dekha. "Wapas" = bojh lagaataar 10 s ≤ 1,000.

tareeka                                          serve hui   calls ÷ naye   spike ke baad wapas   t = 80 s par bojh
retry nahi                                         91.9%       1.00×      0 s baad               800/sec
turant retry                                       48.3%       3.03×      120 s mein nahi      2,521/sec
backoff + full jitter, windows 2 / 4 / 8 s         48.0%       2.99×      120 s mein nahi      2,521/sec
backoff + full jitter, windows 32 / 64 / 128 s     99.6%       1.24×      61 s baad            1,001/sec
retry token bucket: har naya request 0.1 token     91.6%       1.01×      0 s baad               800/sec
```

```
B. MODEL: naye requests kitne hon toh system 120 s ke andar wapas aaye?

naye/sec   turant retry      backoff 2/4/8 s     token bucket
    500               6 s              15 s              0 s
    600               9 s              23 s              0 s
    700              26 s              69 s              0 s
    800   120 s mein nahi   120 s mein nahi              0 s
    900   120 s mein nahi   120 s mein nahi              0 s
```

- **Metastable failure:** spike sirf 10 s ka tha, par turant retries ke saath bojh ~2,500/sec par atka — naye requests sirf 800/sec,
  kshamata 1,000/sec. Trigger aur loop ka ye dhaancha Bronson et al. (HotOS 2021) ka hai; Amazon Builders' Library bhi kehti hai ki
  retries recovery ko der karwa sakte hain. Kaam ki raftaar ka curve is lab ka maana hua hai, kisi system ka naap nahi.
- **Backoff samay phailaata hai:** chhote windows (2 / 4 / 8 s) is 120 s ke run mein loop nahi todte; bade windows (32 / 64 / 128 s)
  todte hain aur aakhir mein zyada requests serve hoti hain — par user ko jawab minuton baad.
- **Token bucket ginti baandhta hai:** har naya request 0.1 token deta hai, har bheja gaya retry 1 token leta hai (bucket max 100).
  Turant wapas, par kuch requests retry ke bina fail. AWS SDK ka retry quota bhi token bucket hai. Backoff aur bucket alag auzaar hain.
- **"10% fail → seconds mein 100% outage"**: ek layer par 10% fail = bojh sirf 1.11×. Khatra tab jab overload se fail ka hissa khud badhe,
  ya kai layers retry karein (3 × 3 × 3 = 27×, lab 37 ex3).

## ex1-jitter — paanch strategies, ek bheed (saral model)

```
$ npm start -- ex1-jitter
tareeka                                                   20 clients: calls / samay     100 clients: calls / samay
jitter nahi (sirf exponential)                                69 /   617 ms           737 /    8.1 s
chhota jitter: backoff × 0.8–1.2 (video ka "2 s + thoda")     51 /   157 ms           391 /   753 ms
equal jitter: aadha + random(0, aadha)                        50 /   112 ms           371 /   492 ms
full jitter: random(0, backoff)                               46 /    68 ms           350 /   346 ms
decorrelated: random(10 ms, pichhla × 3)                      46 /   100 ms           326 /   297 ms

Network delay 0 ho toh bina jitter: 100 clients = 5,050 calls (N(N+1)/2 — sab har baar bilkul ek saath; model ki banawat).
```

- **Bina jitter sabse bura** (video sahi; Brooker ne bhi "clear loser" kaha): sab ek jaisa rukte, saath lautte. Network delay 0 ho toh
  100 clients = 5,050 calls (N(N+1)/2) — ye model ki banawat se aata hai; 0–4 ms ki variance ke saath 737.
- **Jitter wali strategies aapas mein kareeb hain.** Unka kram is model mein slot ki chaudai par tika hai; Brooker ke asli simulation mein
  decorrelated ne full jitter se zyada kaam kiya. Full jitter `random(0, backoff)` ek achha default hai. Video ka chhota (±20%) jitter
  bhi bheed bahut todta hai.

## ex2-deadline — retries ka samay, aur zombie kaam

```
$ npm start -- ex2-deadline
A. Arithmetic: user 10 s rukta hai. Har koshish ka timeout 3 s. Backoff video wala: 2 s, 4 s, 8 s.

  koshish 1: 0–3 s ✓ deadline ke andar
  koshish 2: 5–8 s ✓ deadline ke andar
  koshish 3: 12–15 s ✗ user ja chuka (bekaar)
  koshish 4: 23–26 s ✗ user ja chuka (bekaar)
→ 10 s ki deadline mein sirf 2 koshishein fit. Retries ka total samay deadline se bada ho toh baaki retries bekaar kaam hain.

B. ASLI ginti (ek request ki timeline): user → A → B → C. C ek baar 20 s latak gaya. User 10 s par chala jaata hai.
   Har layer 3 koshish, beech mein 100 ms backoff. "Deadline aage" = caller ka intezaar khatam hone ka samay call ke saath jaata hai.
   "Cancel" = neeche wala us samay par apna kaam rok deta hai (cooperative cancellation).

tareeka                                                C par calls   thread-samay A / B / C        C ka bekaar kaam   user ke jaane ke baad
lambe timeouts (30 s)                                       1       20.0 s / 20.0 s /  20.0 s        0.0 s         30.0 s
chhote timeouts (A→B 3 s, B→C 1 s)                          9        9.2 s /  9.6 s / 180.0 s      180.0 s        127.8 s
chhote timeouts + deadline aage, C cancel nahi maanta       9        9.2 s /  9.0 s / 180.0 s      180.0 s        127.8 s
chhote timeouts + deadline aage + C cancel maanta           9        9.2 s /  9.0 s /   8.4 s        8.4 s          0.0 s
```

- **Retries deadline ke andar hi kaam ke:** 10 s ki deadline, 3 s timeout aur video ke 2/4/8 s backoff mein sirf 2 koshishein fit.
- **Timeout sirf caller ka intezaar khatam karta hai.** C ko pata nahi: har retry C par naya 20 s ka kaam — 9 calls, ~128 s kaam user ke
  jaane ke baad (zombie processing, video ka shabd).
- **Deadline aage bhejna akele kaafi nahi:** C cancel na maane toh utna hi bekaar kaam. C apni deadline par ruke (cooperative cancellation)
  tabhi bekaar kaam 0 — is run mein C har call ki 1 s ki deadline par rukta hai. gRPC deadline bhejta hai, par kaam rokna application ki
  zimmedari hai (gRPC docs).

## ex3-idempotent-ops — idempotency key ke kinaare

```
$ npm start -- ex3-idempotent-ops
scenario.
Lab ke chune hue niyam: key theek 24 ghante par mitti, alag parameters par 422.

scenario                                                   bina suraksha                        suraksha ke saath
jawab khoya, client ne retry kiya                          2 charge                             1 charge (same jawab dobara)
double click: pehla abhi chal raha, doosra aaya            2 charge (key thi, lock/token nahi)  1 charge, doosre ko 409
same key, alag amount (bug)                                —                                    422: same key, different parameters
25 ghante baad retry (DLQ se redrive)                      —                                    2 charge — key mit chuki thi
pehla worker 90 s atka, 60 s lease ke baad doosre ne liya  —                                    1 charge; purane ko 409 (token purana)
DELETE /users/10 retry, beech mein id 10 naye user ko mili naya user Bilal mit gaya             412 — version alag, kuch nahi mita
"balance +100" retry vs "balance = 600 (agar version 0)"   700 (₹100 zyada)                     600, retry ko 412
```

- **Key se retry safe** (video sahi). Saath mein "chal raha hai" ka lock (409) chahiye, warna double click par do charge.
- **Store copy rakhta hai:** parameters (keys ke kram ke bina) aur jawab ki copy — caller baad mein object badle toh bhi replay same.
- **Same key, alag parameters** = bug; server mana kare. 422 lab ka chuna hua code hai; Stripe ek error deta hai.
- **Running ka lease aur owner token:** pehla worker lease (60 s) se zyada atka toh doosra le sakta hai; purana token na charge kar sakta,
  na record badal sakta (token check aur charge ek transaction mein).
- **Key hamesha nahi rehti:** Stripe API v1 key ko 24 ghante ke baad kabhi bhi hata sakta hai; tab din baad ka redrive naya charge bana
  sakta hai. Lab theek 24 ghante par mitaata hai. Stripe v1 pehle jawab (500 bhi) ko save karta hai; lab sirf success-path dikhata hai.
  API v2 ke niyam alag hain.
- **"Delete idempotent hai"** (video): asar same, par jawab badalta hai (204, phir 404). Id dobara mile toh purana retry naye user ko
  mita deta hai. Version ki shart (If-Match) ya kabhi dobara na milne wali id (UUID) bachaati hai.
- **"+100" retry par do baar** judta hai; "= 600 agar version 0" ek baar.

## ex4-dlq-mttr — DLQ ki retention, aur MTTR ka hisaab

```
$ npm start -- ex4-dlq-mttr
queue): message DLQ mein jaakar bhi apna PEHLA bheja-gaya samay rakhta hai, isliye DLQ ki
   retention pehli baar bheje jaane se ginti hai. Maana: messages pehle 72 ghante mein barabar faile hue samay par DLQ mein
   aate hain, aur har message ko DLQ mein aane ke itne ghante baad koi dekhta hai. Source retention 4 din.

queue      DLQ retention   koi dekhta hai (DLQ mein aane ke baad)   jaanch se pehle mit gaye
standard      4 din          48 ghante baad                            33%
standard      4 din          12 ghante baad                             0%
standard     14 din          48 ghante baad                             0%
standard     14 din         300 ghante baad                            50%
FIFO          4 din          48 ghante baad                             0%

B. Arithmetic: availability ≈ MTBF ÷ (MTBF + MTTR)  (MTBF = do girawaton ke beech ausat samay, MTTR = theek hone ka samay)

saal mein ek baar gira, 24 ghante mein theek       99.72678%   saal mein band:   1436.1 min
roz gira, 100 ms mein khud theek                   99.99988%   saal mein band:      0.6 min
mahine mein ek baar, 1 ghanta                      99.86130%   saal mein band:    729.0 min
hafte mein ek baar, 5 minute                       99.95042%   saal mein band:    260.6 min
```

- **DLQ mein bhi data khota hai:** SQS **standard** queue mein message ka pehla bheja-gaya samay DLQ mein bhi rehta hai, toh retention
  pehle bheje gaye samay se ginti hai. FIFO queue mein samay DLQ mein dobara shuru hota hai. 33% sirf in maanyataon par: messages pehle
  72 ghante mein barabar faile samay par fail hue, DLQ ki retention 4 din, aur har message ko DLQ mein aane ke 2 din baad dekha.
  AWS docs: DLQ ki retention source se lambi rakho (max 14 din); DLQ ki depth aur umar par alert.
- **MTBF vs MTTR** (video): hisaab sahi — roz 100 ms ki girawat (99.9999%) saal mein ek baar 24 ghante (99.73%) se bahut behtar.
  Availability dono par tiki hai; aur "khud jaldi theek" tabhi jab retries ka loop (ex0) MTTR ko lamba na kare.

## Source ke daave aur sudhaar

| Video kehta hai | Sach / sudhaar | Kahan se |
|---|---|---|
| 500 aaya, "glitch, phir try karo" | Pehle error ki kism dekho: sirf asthaayi errors (timeout, 503, 429) aur sirf jab dohraana safe ho; deadline aur retry budget ke andar. Server ka Retry-After (seconds ya HTTP date) maano | AWS SDK retry docs, RFC 9110 / 6585, Retries track (`rt-*`) |
| Turant retry: 10% fail seconds mein 100% outage | Ek layer par 10% = bojh 1.11×. Asli khatra: overload se fail badhna (metastable) aur layers ka guna (27×) | ex0, lab 37 |
| Backoff server ko saans leta hai | Chhote windows (2/4/8 s) loop nahi todte; bade windows todte par user ka intezaar minuton mein. Retry token bucket ginti baandhta hai | ex0 |
| AWS ne retries se recovery der hoti dekhi (EBS) | Retries recovery ko der karwa sakte hain — Builders' Library ki baat; uska EBS/Lambda udaharan synchronized (ek saath) requests ka hai | Builders' Library, Bronson et al. |
| Backoff cap "AWS guidance 30–60 s" | Cap app par tika hai; AWS SDK standard mode ka computed backoff max 20 s | AWS SDK retry docs |
| Jitter = "2 s plus thoda" | Thoda jitter bhi madad karta; full jitter `random(0, backoff)` achha default | ex1, Brooker 2015 |
| Jitter wala backoff hamesha behtar ("no exceptions") | Brooker ke simulation ka nateeja; jitter strategies ka aapsi kram workload par tika | ex1 |
| Har write operation idempotent ho | Jo write retry ho sakta hai, us write ko dohraane ka safe niyam chahiye: swabhaav se idempotent, version ki shart, ya idempotency key jiski umar retries ko dhake. Har jagah idempotency thopna bhi galat (AWS) | ex3, AWS Well-Architected REL04-BP04 |
| Delete idempotent hai | Asar same, jawab badalta (204 → 404); id reuse par purana retry naya row mitata | ex3 |
| Idempotency key: Stripe dekh leta hai | Key + in-flight lock + parameter check; key ki umar (Stripe v1: 24 h ke baad kabhi bhi) | ex3, Stripe docs |
| Circuit breaker: 50% fail par khulo, 30 s, ek scout | Achha khaaka; kam traffic par minimum request ginti aur half-open ke niyam chahiye | lab 38 |
| DLQ: koi data kabhi nahi khota | DLQ ki retention (1 min–14 din; standard queue mein pehle bheje samay se); alert aur redrive ke bina khota hai | ex4, AWS SQS docs |
| Deadline propagation, zombie processing | Sahi — par neeche wala cancel maane tabhi kaam rukta hai | ex2, gRPC docs |
| MTTR > MTBF; Netflix fallback | Hisaab sahi; dono milkar availability. Netflix ka popular-list fallback — sahi misaal | ex4, Netflix tech blog (2010) |

## Sources

- Marc Brooker, *Exponential Backoff And Jitter* (AWS Architecture Blog, 2015) — https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- Marc Brooker, *Timeouts, retries, and backoff with jitter* (Amazon Builders' Library) — https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- AWS SDKs and Tools, *Retry behavior* — https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- Stripe, *Idempotent requests* — https://docs.stripe.com/api/idempotent_requests
- AWS, *Amazon SQS dead-letter queues* — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Bronson et al., *Metastable Failures in Distributed Systems* (HotOS 2021) — https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf
- gRPC, *Deadlines* — https://grpc.io/docs/guides/deadlines/
- RFC 9110 §10.2.3 (Retry-After) — https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3
- AWS Well-Architected, *REL04-BP04 Make mutating operations idempotent* — https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html
- Netflix Tech Blog, *5 Lessons We've Learned Using AWS* (2010) — https://netflixtechblog.com/5-lessons-weve-learned-using-aws-1f2a28588e4c

## Files

| File | Kya |
|---|---|
| `lib/metastable.js` | ex0 retry loop model (turant, backoff + jitter, token bucket) |
| `lib/jitter.js` | ex1 contention model, paanch strategies |
| `lib/deadline.js` | ex2 user → A → B → C timeline |
| `lib/idem.js` | ex3 payment API, idempotency store, users, balance |
| `lib/dlq.js` | ex4 DLQ retention aur availability |
| `tools/*.js` | Har exercise ka tool |
| `test/core.test.js` | 5 tests |
| `captures/` | Har exercise ka output + `test.txt` |

## Practice

1. ex0 mein retry budget 10% se 50% karo. Kya 800/sec par phir bhi wapas aata hai?
2. ex1 mein cap 1 s se 100 ms karo. Bina jitter ka nateeja kya hota hai?
3. ex2 mein B→C ka timeout 1 s se 5 s karo (deadline ke bina). C par kitna bekaar kaam?
4. ex3 mein key ki umar 24 ghante se 7 din karo. Redrive wali row ka kya hota hai?
