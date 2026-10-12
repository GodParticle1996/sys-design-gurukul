# 🐳 Lab 13 — Stripe: rewrite nahi, tooling

System Gurukul → 🏢 Company Stories → **Stripe** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-selective-tests                    # CI server (4821)
WORKERS=4 npm start ex2-gil                      # charge API (4822) + receipt worker (4823)
docker compose --profile ex1-selective-tests up --build   # ya Docker se
```

## ex1-selective-tests — 1,500 tests mein se sirf kaam ke

`lib/repo.js` ek nakli monolith banata hai: **3,000 functions, 1,500 tests**, 30-30 functions ke modules, kuch shared "core"
functions (0–99) jinhe sab bulaate hain. 5,720 **static** calls (Sorbet jaisa tool inhe dekh sakta hai) aur kuch **dynamic**
calls (Ruby ka `send` — naam string se banta hai, static analysis ko nahi dikhta).

Ek function mein bug daalo. `all` = saare tests. `selective` = static call graph ulta chalo (changed function ko kaun,
seedha ya ghuma ke, bulaata hai) aur sirf un tests ko chalao.

```bash
node tools/ci.js --changed 1234      # aam function
node tools/ci.js --changed 57        # shared core function
node tools/ci.js --sample 300        # 300 random changes ka average
node tools/ci.js --blindspots        # dynamic calls ki wajah se kya chhoota
DYNAMIC_EDGES=5 npm start ex1-selective-tests    # dynamic calls kam karo, phir --sample
```

Asli run:

```
change fn 1234 | all       | tests 1500 (100.0%) |  6068 ms | failed 10/10 | missed 0
change fn 1234 | selective | tests   10 (0.7%) |    42 ms | failed 10/10 | missed 0

change fn 57 | all       | tests 1500 (100.0%) |  6051 ms | failed 595/595 | missed 0
change fn 57 | selective | tests  452 (30.1%) |  1825 ms | failed 452/595 | missed 143

300 random changes | selective avg 1.1% of suite | changes jahan failing test chhoota: 91 (2628 tests)   [dynamic edges: 60]
300 random changes | selective avg 1.1% of suite | changes jahan failing test chhoota: 4 (68 tests)     [dynamic edges: 5]
300 random changes | selective avg 1.1% of suite | changes jahan failing test chhoota: 0 (0 tests)      [dynamic edges: 0]

  change fn 300: 59 tests fail hone chahiye, selective sirf 18 pakadta hai
```

👉 Aam change par **0.7% tests, 42 ms** — aur har failing test pakda. Microservices wala "sirf apne tests" faayda, bina
network boundaries ke. (Stripe ka number ~5% hai; hamara nakli repo zyada modular hai.)

👉 Shared core function badla → 30% tests. Selective runner ka size code ki **banawat** batata hai.

👉 **Blind spot:** sirf 60 dynamic calls (static ka ~1%) se 300 mein se **91 changes** mein failing tests chhoot gaye. 5 dynamic
calls → 4 changes. 0 → 0. Isliye Stripe ki shart: "dependency graph itna saaf rakho ki trace ho sake" — har `send` / metaprogramming
ek chhupa raasta hai. Yahi Sorbet ka asli kaam hai: graph ko sach bolne layak banana.

## ex2-gil — ek thread, kai processes

`services/charge.js` — har `/charge` ~12 ms CPU (fraud score, auth, authorize, ledger). Node ek process mein JavaScript ek hi
thread par chalata hai — Ruby ke **GIL** jaisa: 14 cores hon, ek process ek waqt mein ek core. Receipt email + analytics (8 ms)
ya toh request ke **andar** (`EXTRAS=sync`) ya **alag worker process** ko job (`EXTRAS=queue`).

```bash
WORKERS=1 EXTRAS=sync  npm start ex2-gil   &&  node tools/load.js --concurrency 16 --requests 800
WORKERS=1 EXTRAS=queue npm start ex2-gil   &&  node tools/load.js ...
WORKERS=4 npm start ex2-gil                &&  node tools/load.js ...
WORKERS=8 npm start ex2-gil                &&  node tools/load.js ...
```

```
WORKERS=1 EXTRAS=sync   800 charges, concurrency 16:  46 charges/s | p50 296 ms | p99 682 ms
WORKERS=1 EXTRAS=queue  800 charges, concurrency 16:  73 charges/s | p50 189 ms | p99 399 ms
WORKERS=4 EXTRAS=queue  800 charges, concurrency 16: 258 charges/s | p50  50 ms | p99 175 ms
WORKERS=8 EXTRAS=queue  800 charges, concurrency 16: 420 charges/s | p50  30 ms | p99 142 ms
```

👉 Ek process ki chhat: 1000 ms ÷ (12 + 8) ms ≈ 50/s — machine mein 14 cores hone se koi farak nahi.

👉 Pehla kadam: jo kaam charge ke liye zaroori nahi (receipt, analytics) **request path se bahar** — 46 → 73/s.

👉 Doosra: **process level parallelism** — 4 processes 258/s, 8 processes 420/s. Language nahi badli, architecture badla.
Stripe yahi karta hai: bahut saare Ruby processes, load balancer, aur parallel kaam non-Ruby systems par.

## Khud try karo

1. `WORKERS=16` (cores se zyada) — throughput badha ya gira? Kyun?
2. `lib/repo.js` mein core functions (0–99) ko call hone ka chance 20% se 50% karo. Selective ka average % kitna badha?
   (Sab kuch ek "utils" par tika ho toh selective testing kamzor ho jaata hai.)
3. `--concurrency 64` par `WORKERS=1` ka p99 dekho. Line kahan lag rahi hai?
