# 🐳 Lab 12 — Google Colab: sandbox ka tax aur GPU ka rashan

System Gurukul → 🤖 AI Companies → **Colab** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-syscall-tax        # sentry (4811)
npm start ex2-gpu-pool           # pool simulator (4812)
docker compose --profile ex1-syscall-tax up --build      # ya Docker se
```

## ex1-syscall-tax — overhead kis kaam par padta hai?

`services/sentry.js` gVisor ke **sentry** ka khilona hai: "untrusted" code file operation seedha OS se nahi karta, ek message
sentry ko bhejta hai; sentry check karta hai (sirf `data/` ke andar, sirf write/read/unlink) aur khud karta hai.
`tools/workload.js` do tarah ka kaam do tarah se chalata hai:

| kind | kya | syscalls |
|---|---|---|
| `compute` | 200×200 matrix multiply × 40 (ML jaisa) | 4 (checkpoint) |
| `io` | 4,000 chhoti file write/read + 50 delete (database/log server jaisa) | 4,050 |

```bash
node tools/workload.js --kind compute --mode direct
node tools/workload.js --kind compute --mode sentry
node tools/workload.js --kind io --mode direct
node tools/workload.js --kind io --mode sentry
```

Asli run (do baar chalaya):

```
kind=compute mode=direct syscalls=   4  time= 1750 ms        kind=compute mode=direct ...  time= 1913 ms
kind=compute mode=sentry syscalls=   4  time= 1610 ms        kind=compute mode=sentry ...  time= 1828 ms
kind=io      mode=direct syscalls=4050  time=  680 ms        kind=io      mode=direct ...  time=  507 ms
kind=io      mode=sentry syscalls=4050  time= 5787 ms        kind=io      mode=sentry ...  time= 5766 ms
```

👉 **Compute par sandbox ka tax zero** (1750 vs 1610 ms — yeh sirf noise hai, har run mein upar-neeche). Hot loop mein OS ko
koi pukaar hi nahi.

👉 **IO par 8–11× dheema.** Har file operation ab ek extra hop hai. Hamara sentry ek alag process + TCP hop hai (~1.4 ms per call
is laptop par) — asli gVisor bahut tez hai (video: syscall-heavy kaam par ~10–30%). Numbers ka size mat pakdo, **pattern** pakdo:
wahi sandbox database ke liye bhaari, ML ke liye lagbhag muft. Colab ka kaam compute-bound hai, isliye Google itni mazboot
deewar almost muft mein laga paata hai.

## ex2-gpu-pool — free GPUs ka rashan

`lib/pool-sim.js`: ek din (1,440 minute), har minute ek kadam, seeded random (har run same number):

- 👩‍🎓 900 interactive users — 20–120 min cells chalate hain, phir **tab khula chhod dete hain** (0–8 ghante idle)
- 🏋️ 40 trainers — 10–30 ghante lagataar training
- ⛏️ 30 miners — 24 ghante 100% GPU, koi cell nahi (free GPU farm)

| policy | rules |
|---|---|
| `none` | pehle aao pehle pao, GPU tab tak tumhara jab tak khud na jao |
| `idle` | sirf: 90 min idle → GPU wapas |
| `colab` | 90 min idle reclaim + 12 ghante ki hadd + miner pakdo (60 min bina interaction, 100% util) + interactive ko pehle |

```bash
node tools/pool-report.js              # 150 GPUs
node tools/pool-report.js --gpus 100   # kami ho toh?
```

```
150 GPUs
policy | interactive 5 min mein GPU | kabhi nahi mila | avg wait | GPU time: kaam / idle pakda / miner / khaali | reclaimed
none   |                      12.6% |             412 |  319 min | 29.1% / 46.4% / 19.2% / 5.2% | 0
idle   |                      20.7% |              19 |   74 min | 45% / 30.3% / 19.2% / 5.4% | 617
colab  |                       100% |               0 |    0 min | 41.9% / 33.5% / 0.8% / 23.7% | 770

100 GPUs
none   |                       7.7% |             619 |  428 min | 24.7% / 43.1% / 28.8% / 3.2% | 0
idle   |                       7.7% |             428 |  305 min | 43.2% / 24.6% / 28.9% / 3.2% | 350
colab  |                      12.2% |               0 |   48 min | 46.9% / 48.4% / 1.3% / 3.4% | 701
```

👉 `none`: GPU ka **46%** waqt log sirf **khula tab** pakde baithe hain, **19%** miners kha rahe hain. 412 students ko din bhar GPU
mila hi nahi.

👉 Sirf idle reclaim se "kabhi nahi mila" 412 → 19. Poore Colab rules (hadd + abuse + priority) se har interactive user ko
5 minute ke andar GPU. **Scheduler hi product hai.**

👉 100 GPUs par Colab rules bhi sabko turant nahi de paate (12.2% in 5 min), par koi khaali haath nahi lauta — avg 48 min wait.
Isliye free tier "no guarantees" kehta hai, aur paid tier (priority) usi line mein aage ki jagah bechta hai.

## Khud try karo

1. `lib/pool-sim.js` mein idle reclaim `90` ko `30` karo. "idle pakda" kitna gira? Interactive users ko kya bura lagega?
   (Chai peene gaye, wapas aaye — runtime gaya, variables gaye.)
2. Miners 30 se 100 kar do. `colab` policy kitna sambhalti hai?
3. ex1 mein `io` loop ke andar har 10 file ops ko ek batch mein bhejo (ek message, 10 kaam). Sentry ka tax kitna gira?
   (Yahi wajah hai ki syscall-heavy software sandbox ke andar batching se bachta hai.)
