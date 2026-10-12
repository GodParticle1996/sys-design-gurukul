# 🐳 Lab 38 — Circuit breaker: kisko bachata hai, kya ginta hai, aur khulne ke baad kya

System Gurukul → **Circuit Breaker** levels ka lab. Zero dependency Node (18+) — sirf `tools/opossum.js` ko npm ki ek library chahiye.
Source video (credit): Software Developer Diaries — "How to use a Circuit Breaker to make your API more resilient?"

```bash
npm start ex0-slowmo      → node tools/slowmo.js      # slow motion: 4 workers, 18 requests   [--protect none|timeout|breaker]
                          → node tools/mini.js        # sabse chhota program: lib/breaker.js + ek fetch
                          → node tools/opossum.js     # wahi calls, asli library se (pehle: npm install opossum)
npm start ex1-cascade     → node tools/cascade.js     # A (5171) → B (5172)   [--protect none|timeout|breaker]
npm start ex2-counting    → node tools/counting.js
npm start ex3-half-open   → node tools/halfopen.js    # [--policy naive|trials|slowstart]
docker compose --profile ex1-cascade up --build       # (ya ex0-slowmo / ex2-counting / ex3-half-open)
```

| File | Kya hai |
|---|---|
| `lib/breaker.js` | **Poora breaker, ek chhoti class**: `allow()` (call se pehle) + `record(ok)` (call ke baad). Service A aur `tools/mini.js` dono yahi chalate hain. |
| `services/a.js` | User ki taraf wali service (kahani mein: **app-api**). **Workers ka pool** (default 20; baaki requests line mein, line 200 se lambi → 503), jaise Java/Spring ke threads. `GET /pool` aur `GET /breaker` se andar jhaank sakte ho. |
| `services/b.js` | Dependency (kahani mein: **recs-service**): `/recs` (latak / band ho sakta hai), `/price`, aur outage ke baad **thanda** uthna. |

Breaker ki default settings: pichhli 20 calls mein ≥ 50% fail (kam se kam 10 calls) → **OPEN 2 s** → 3 trial calls.
Numbers ek laptop (WSL) par 2026-10-09 ke runs ke hain — timing thodi alag aayegi, pattern wahi rahega.

---

## ex0-slowmo — pehle yeh chalao: wahi kahani slow motion mein

A ke paas sirf **4 workers**. 16 `/home` requests (recs chahiye) aur 2 `/profile` requests (recs se **koi matlab nahi**, 5 ms ka
apna kaam) ek-ek karke aati hain. recs-service t=0.8 s se t=5.6 s tak **latki** rehti hai (har `/recs` call 5 s). Asha ka phone
`/profile` par 2 s intezaar karta hai. Breaker chhota rakha hai taaki har call dikhe: pichhli 6 calls, ≥ 50% fail → OPEN 2 s → 2 trial calls.

```
$ node tools/slowmo.js
A: 4 workers · recs-service (B) t=0.8 s se t=5.6 s tak latki (har /recs call 5 s) · breaker: pichhli 6 calls, ≥ 50% fail → OPEN 2 s → 2 trial calls

=== koi bachav nahi ===
 kab     kaun          kya hua                                          us pal ka haal
 0.0 s  #1 /home      → ✅ live recs, 24 ms                             workers 0/4 busy · line 0 · B par latki 0
 0.2 s  #2 /home      → ✅ live recs, 27 ms                             workers 0/4 busy · line 0 · B par latki 0
 0.4 s  #3 /home      → ✅ live recs, 25 ms                             workers 0/4 busy · line 0 · B par latki 0
 0.6 s  #4 /home      → ✅ live recs, 26 ms                             workers 0/4 busy · line 0 · B par latki 0
 0.8 s  recs-service  ⚠️  LATAK gayi: ab har /recs call 5 s legi
 1.0 s  #5 /home      bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 1
 1.5 s  #6 /home      bheji … jawab abhi nahi aaya                     workers 2/4 busy · line 0 · B par latki 2
 2.0 s  #7 /home      bheji … jawab abhi nahi aaya                     workers 3/4 busy · line 0 · B par latki 3
 2.5 s  #8 /home      bheji … jawab abhi nahi aaya                     workers 4/4 busy · line 0 · B par latki 4
 3.0 s  #9 /home      bheji … jawab abhi nahi aaya                     workers 4/4 busy · line 1 · B par latki 4
 3.5 s  Asha /profile bheji … jawab abhi nahi aaya                     workers 4/4 busy · line 2 · B par latki 4
 4.0 s  #10 /home     bheji … jawab abhi nahi aaya                     workers 4/4 busy · line 3 · B par latki 4
 4.5 s  #11 /home     bheji … jawab abhi nahi aaya                     workers 4/4 busy · line 4 · B par latki 4
 5.0 s  #12 /home     bheji … jawab abhi nahi aaya                     workers 4/4 busy · line 5 · B par latki 4
 5.5 s  Asha /profile → ❌ phone ne 2000 ms baad haar maan li           workers 4/4 busy · line 5 · B par latki 4
 5.6 s  recs-service  ✅ theek ho gayi: nayi /recs calls phir 20 ms
 6.0 s  #5 /home      → ✅ live recs, 5006 ms                           workers 4/4 busy · line 4 · B par latki 4
 6.0 s  #9 /home      → ✅ live recs, 3027 ms                           workers 4/4 busy · line 2 · B par latki 4
 6.1 s  #10 /home     → ✅ live recs, 2056 ms                           workers 4/4 busy · line 1 · B par latki 4
 6.1 s  #11 /home     → ✅ live recs, 1576 ms                           workers 4/4 busy · line 0 · B par latki 4
 6.1 s  #12 /home     → ✅ live recs, 1099 ms                           workers 3/4 busy · line 0 · B par latki 3
 6.2 s  #13 /home     → ✅ live recs, 25 ms                             workers 3/4 busy · line 0 · B par latki 3
 6.5 s  #6 /home      → ✅ live recs, 5005 ms                           workers 2/4 busy · line 0 · B par latki 2
 7.0 s  #7 /home      → ✅ live recs, 5004 ms                           workers 2/4 busy · line 0 · B par latki 2
 7.0 s  #14 /home     → ✅ live recs, 25 ms                             workers 1/4 busy · line 0 · B par latki 1
 7.2 s  #15 /home     → ✅ live recs, 25 ms                             workers 1/4 busy · line 0 · B par latki 1
 7.5 s  #8 /home      → ✅ live recs, 5006 ms                           workers 1/4 busy · line 0 · B par latki 1
 7.5 s  #16 /home     → ✅ live recs, 24 ms                             workers 0/4 busy · line 0 · B par latki 0
 8.0 s  Asha /profile → ✅ profile mila, 9 ms                           workers 0/4 busy · line 0 · B par latki 0
   nateeja → Asha ka /profile (5 ms ka kaam): ❌ error (2000 ms intezaar ke baad)  phir  ✅ 9 ms
             /home: live 16 · cache 0 · error 0 · sabse lamba intezaar 5006 ms
             latki recs-service ko bheji calls: 4 · recs-service par ek saath latki (max): 4

=== sirf timeout (300 ms) ===
 kab     kaun          kya hua                                          us pal ka haal
 0.0 s  #1 /home      → ✅ live recs, 24 ms                             workers 0/4 busy · line 0 · B par latki 0
 0.2 s  #2 /home      → ✅ live recs, 26 ms                             workers 0/4 busy · line 0 · B par latki 0
 0.4 s  #3 /home      → ✅ live recs, 28 ms                             workers 0/4 busy · line 0 · B par latki 0
 0.6 s  #4 /home      → ✅ live recs, 25 ms                             workers 0/4 busy · line 0 · B par latki 0
 0.8 s  recs-service  ⚠️  LATAK gayi: ab har /recs call 5 s legi
 1.0 s  #5 /home      bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 1
 1.3 s  #5 /home      → 🟡 cache se, 305 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 1
 1.5 s  #6 /home      bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 2
 1.8 s  #6 /home      → 🟡 cache se, 304 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 2
 2.0 s  #7 /home      bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 3
 2.3 s  #7 /home      → 🟡 cache se, 305 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 3
 2.5 s  #8 /home      bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 4
 2.8 s  #8 /home      → 🟡 cache se, 303 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 4
 3.0 s  #9 /home      bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 5
 3.3 s  #9 /home      → 🟡 cache se, 305 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 5
 3.5 s  Asha /profile → ✅ profile mila, 9 ms                           workers 0/4 busy · line 0 · B par latki 5
 4.0 s  #10 /home     bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 6
 4.3 s  #10 /home     → 🟡 cache se, 303 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 6
 4.5 s  #11 /home     bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 7
 4.8 s  #11 /home     → 🟡 cache se, 305 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 7
 5.0 s  #12 /home     bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 8
 5.3 s  #12 /home     → 🟡 cache se, 304 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 8
 5.6 s  recs-service  ✅ theek ho gayi: nayi /recs calls phir 20 ms
 6.2 s  #13 /home     → ✅ live recs, 25 ms                             workers 0/4 busy · line 0 · B par latki 7
 7.0 s  #14 /home     → ✅ live recs, 25 ms                             workers 0/4 busy · line 0 · B par latki 5
 7.2 s  #15 /home     → ✅ live recs, 26 ms                             workers 0/4 busy · line 0 · B par latki 5
 7.5 s  #16 /home     → ✅ live recs, 26 ms                             workers 0/4 busy · line 0 · B par latki 4
 8.0 s  Asha /profile → ✅ profile mila, 8 ms                           workers 0/4 busy · line 0 · B par latki 3
   nateeja → Asha ka /profile (5 ms ka kaam): ✅ 9 ms  phir  ✅ 8 ms
             /home: live 8 · cache 8 · error 0 · sabse lamba intezaar 305 ms
             latki recs-service ko bheji calls: 8 · recs-service par ek saath latki (max): 8

=== timeout + circuit breaker ===
 kab     kaun          kya hua                                          us pal ka haal
 0.0 s  #1 /home      → ✅ live recs, 24 ms                             workers 0/4 busy · line 0 · B par latki 0 · breaker CLOSED ✓ (0/1 fail)
 0.2 s  #2 /home      → ✅ live recs, 26 ms                             workers 0/4 busy · line 0 · B par latki 0 · breaker CLOSED ✓✓ (0/2 fail)
 0.4 s  #3 /home      → ✅ live recs, 25 ms                             workers 0/4 busy · line 0 · B par latki 0 · breaker CLOSED ✓✓✓ (0/3 fail)
 0.6 s  #4 /home      → ✅ live recs, 27 ms                             workers 0/4 busy · line 0 · B par latki 0 · breaker CLOSED ✓✓✓✓ (0/4 fail)
 0.8 s  recs-service  ⚠️  LATAK gayi: ab har /recs call 5 s legi
 1.0 s  #5 /home      bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 1 · breaker CLOSED ✓✓✓✓ (0/4 fail)
 1.3 s  #5 /home      → 🟡 cache se, 302 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 1 · breaker CLOSED ✓✓✓✓✗ (1/5 fail)
 1.5 s  #6 /home      bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 2 · breaker CLOSED ✓✓✓✓✗ (1/5 fail)
 1.8 s  #6 /home      → 🟡 cache se, 304 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 2 · breaker CLOSED ✓✓✓✓✗✗ (2/6 fail)
 2.0 s  #7 /home      bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 3 · breaker CLOSED ✓✓✓✓✗✗ (2/6 fail)
 2.3 s  #7 /home      → 🟡 cache se, 304 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 3 · breaker OPEN (2.0 s baaki)
 2.5 s  #8 /home      → 🟡 cache se, 3 ms (breaker ne roki)            workers 0/4 busy · line 0 · B par latki 3 · breaker OPEN (1.7 s baaki)
 3.0 s  #9 /home      → 🟡 cache se, 2 ms (breaker ne roki)            workers 0/4 busy · line 0 · B par latki 3 · breaker OPEN (1.2 s baaki)
 3.5 s  Asha /profile → ✅ profile mila, 7 ms                           workers 0/4 busy · line 0 · B par latki 3 · breaker OPEN (0.7 s baaki)
 4.0 s  #10 /home     → 🟡 cache se, 3 ms (breaker ne roki)            workers 0/4 busy · line 0 · B par latki 3 · breaker OPEN (0.2 s baaki)
 4.5 s  #11 /home     bheji … jawab abhi nahi aaya                     workers 1/4 busy · line 0 · B par latki 4 · breaker HALF_OPEN (trial 0/2 safal)
 4.8 s  #11 /home     → 🟡 cache se, 304 ms (recs ka jawab nahi aaya)  workers 0/4 busy · line 0 · B par latki 4 · breaker OPEN (2.0 s baaki)
 5.0 s  #12 /home     → 🟡 cache se, 2 ms (breaker ne roki)            workers 0/4 busy · line 0 · B par latki 4 · breaker OPEN (1.7 s baaki)
 5.6 s  recs-service  ✅ theek ho gayi: nayi /recs calls phir 20 ms
 6.2 s  #13 /home     → 🟡 cache se, 3 ms (breaker ne roki)            workers 0/4 busy · line 0 · B par latki 3 · breaker OPEN (0.5 s baaki)
 7.0 s  #14 /home     → ✅ live recs, 26 ms                             workers 0/4 busy · line 0 · B par latki 1 · breaker HALF_OPEN (trial 1/2 safal)
 7.2 s  #15 /home     → ✅ live recs, 27 ms                             workers 0/4 busy · line 0 · B par latki 1 · breaker CLOSED (window khaali)
 7.5 s  #16 /home     → ✅ live recs, 26 ms                             workers 0/4 busy · line 0 · B par latki 1 · breaker CLOSED ✓ (0/1 fail)
 8.0 s  Asha /profile → ✅ profile mila, 9 ms                           workers 0/4 busy · line 0 · B par latki 1 · breaker CLOSED ✓ (0/1 fail)
   nateeja → Asha ka /profile (5 ms ka kaam): ✅ 7 ms  phir  ✅ 9 ms
             /home: live 7 · cache 9 · error 0 · sabse lamba intezaar 304 ms
             latki recs-service ko bheji calls: 4 · recs-service par ek saath latki (max): 4 · breaker ne roki: 5 · breaker khula: 2 baar
```

👉 **Koi bachav nahi**: #5–#8 ne charon workers pakad liye (har ek 5 s recs ke intezaar mein). Asha ka `/profile` — jise recs se
matlab hi nahi — line mein khada raha aur phone ne 2 s baad **error** dikha diya. 5 ms ka kaam, 2000 ms mein bhi nahi hua.

👉 **Sirf timeout**: A ke workers 300 ms mein chhoot gaye, `/profile` 9 ms. Par "B par latki" dekho: **1 → 8**. A ne intezaar chhod
diya, recs-service un calls par abhi bhi kaam kar rahi hai — aur A har nayi request phir bhi bhejta raha (8 calls, sab bekaar).

👉 **Timeout + breaker**: #5, #6, #7 fail → window `✓✓✓✗✗✗` = 3/6 → **OPEN**. #8, #9, #10 recs-service tak gayi hi nahi (2–3 ms mein cache).
2 s baad #11 **trial call** bani — fail → phir OPEN. recs-service 5.6 s par theek hui, par breaker ko 7.0 s par pata chala (#14, #15
trial safal → CLOSED). Latki service ko sirf **4 calls** (timeout akela: 8).

### mini.js — sabse chhota chalta program

`tools/mini.js` mein service A nahi hai: ek `getRecs()` function `lib/breaker.js` ke saath seedha recs-service ko call karta hai.
Wahi 16 calls, par har line par **breaker ke andar** ka haal:

```
$ node tools/mini.js
breaker: pichhli 6 calls · kam se kam 6 calls · ≥ 50% fail → OPEN 2 s → 2 trial calls

  #   kab     nateeja                         der      breaker ke andar (is call ke baad)
  1   0.0 s  ✅ live                           23 ms   CLOSED · ✓ = 0/1 fail (6 calls se pehle faisla nahi)
  2   0.2 s  ✅ live                           24 ms   CLOSED · ✓✓ = 0/2 fail (6 calls se pehle faisla nahi)
  3   0.4 s  ✅ live                           26 ms   CLOSED · ✓✓✓ = 0/3 fail (6 calls se pehle faisla nahi)
  4   0.6 s  ✅ live                           24 ms   CLOSED · ✓✓✓✓ = 0/4 fail (6 calls se pehle faisla nahi)
       0.8 s  ⚠️  recs-service LATAK gayi (har /recs call 5 s)
  5   1.0 s  🟡 cache · recs ka jawab nahi   302 ms   CLOSED · ✓✓✓✓✗ = 1/5 fail (6 calls se pehle faisla nahi)
  6   1.5 s  🟡 cache · recs ka jawab nahi   302 ms   CLOSED · ✓✓✓✓✗✗ = 2/6 fail
  7   2.0 s  🟡 cache · recs ka jawab nahi   302 ms   OPEN ← ✓✓✓✗✗✗ = 3/6 fail (hadd 50%) · 2.0 s calls band
  8   2.5 s  🟡 cache · breaker ne roki        0 ms   OPEN · 1.8 s baaki
  9   3.0 s  🟡 cache · breaker ne roki        0 ms   OPEN · 1.3 s baaki
 10   4.0 s  🟡 cache · breaker ne roki        0 ms   OPEN · 0.3 s baaki
 11   4.5 s  🟡 cache · recs ka jawab nahi   303 ms   OPEN ← trial call fail · phir 2.0 s calls band
 12   5.0 s  🟡 cache · breaker ne roki        0 ms   OPEN · 1.8 s baaki
       5.6 s  ✅ recs-service theek ho gayi
 13   6.2 s  🟡 cache · breaker ne roki        0 ms   OPEN · 0.6 s baaki
 14   7.0 s  ✅ live                           23 ms   HALF_OPEN · trial 1/2 safal
 15   7.2 s  ✅ live                           30 ms   CLOSED ← 2/2 trial safal · window khaali
 16   7.5 s  ✅ live                           25 ms   CLOSED · ✓ = 0/1 fail (6 calls se pehle faisla nahi)
```

### opossum.js — wahi calls, asli library se

```
$ npm install opossum        # ek baar, isi folder mein (opossum 10 ko Node 22+ chahiye)
$ node tools/opossum.js
opossum: timeout 300 ms · window 10 s · kam se kam 6 calls · 50% se ZYADA fail → OPEN 2 s → 1 trial call

  #   kab     nateeja                         der      opossum ke events        state      window (pichhle 10 s)
  1   0.0 s  ✅ live                           23 ms   success                  CLOSED     1 calls, 0 fail = 0%
  2   0.2 s  ✅ live                           24 ms   success                  CLOSED     2 calls, 0 fail = 0%
  3   0.4 s  ✅ live                           25 ms   success                  CLOSED     3 calls, 0 fail = 0%
  4   0.6 s  ✅ live                           23 ms   success                  CLOSED     4 calls, 0 fail = 0%
       0.8 s  ⚠️  recs-service LATAK gayi (har /recs call 5 s)
  5   1.0 s  🟡 cache · recs ka jawab nahi   301 ms   timeout                  CLOSED     5 calls, 1 fail = 20%
  6   1.5 s  🟡 cache · recs ka jawab nahi   299 ms   timeout                  CLOSED     6 calls, 2 fail = 33%
  7   2.0 s  🟡 cache · recs ka jawab nahi   300 ms   timeout                  CLOSED     7 calls, 3 fail = 43%
  8   2.5 s  🟡 cache · recs ka jawab nahi   301 ms   timeout                  CLOSED     8 calls, 4 fail = 50%
  9   3.0 s  🟡 cache · recs ka jawab nahi   301 ms   timeout → open           OPEN       9 calls, 5 fail = 56%
 10   4.0 s  🟡 cache · breaker ne roki        1 ms   reject                   OPEN       10 calls, 5 fail = 50%
 11   4.5 s  🟡 cache · breaker ne roki        0 ms   reject                   OPEN       11 calls, 5 fail = 45%
 12   5.0 s  🟡 cache · breaker ne roki        0 ms   reject                   OPEN       12 calls, 5 fail = 42%
       5.6 s  ✅ recs-service theek ho gayi
              (timer: resetTimeout 2 s poora → opossum ne khud HALF_OPEN kiya)
 13   6.2 s  ✅ live                           25 ms   close → success          CLOSED     13 calls, 5 fail = 38%
 14   7.0 s  ✅ live                           23 ms   success                  CLOSED     14 calls, 5 fail = 36%
 15   7.2 s  ✅ live                           24 ms   success                  CLOSED     15 calls, 5 fail = 33%
 16   7.5 s  ✅ live                           25 ms   success                  CLOSED     16 calls, 5 fail = 31%
```

| | haath ka `lib/breaker.js` | `opossum` 10.0.0 |
|---|---|---|
| Window | pichhli 6 **calls** | pichhle 10 **second** (`rollingCountTimeout`) |
| Kab khula | #7 par: 3/6 = 50% (hadd **≥** 50%) | #9 par: 5/9 = 56% (hadd **>** 50%; #8 par theek 50% tha, nahi khula) |
| Latki service ko gayi calls | 4 (3 + 1 trial) | 5 |
| Trial calls | 2 (`trials`) | 1 (badal nahi sakte) |
| HALF-OPEN kab | agli call aane par | timer se, khud (`halfOpen` event) |
| Wapas live | #14 (7.0 s), CLOSED #15 par | #13 (6.2 s) |

Library ke niyam thode alag hain, sawaal wahi paanch: kitni calls dekhun, kam se kam kitni, hadd kya, kitni der band, kitni trial calls.
(Docker image mein opossum install nahi hota — yeh ek tool seedha Node se chalao.)

---

## ex1-cascade — B latka, A ka unrelated endpoint kyun mara?

B ka `/recs` t=2s se t=8s tak **latak** jaata hai (har call 5 s). A par 50/s `/home` (B chahiye) aur 50/s `/profile`
(B se **koi lena-dena nahi**, 5 ms ka apna kaam). Fallback: `/home` pichhla accha jawab (cache) deta hai.

```
$ node tools/cascade.js
A: 20 workers · 50/s /home + 50/s /profile · 12 s · B /recs latka: t=2s se t=8s (har call 5 s)

tareeka                     /profile p50   /profile p99   /profile error   /home: live / cache / error   latke B ko calls   B bojh se gira   B theek → live wapas     A ki line (max)
koi bachav nahi                 10 ms      9226 ms        360/600       241 /    0 / 359               41              0      run khatam tak nahi           200
sirf timeout (300 ms)            7 ms         9 ms          0/600       107 /  493 / 0                300              3                  1140 ms           0
timeout + circuit breaker        7 ms         9 ms          0/600       243 /  357 / 0                 30              0                  1120 ms           0
```

(⚠️ "koi bachav nahi" wali line ka `/profile p50` har run mein badalta hai — kabhi ~10 ms, kabhi ~4600 ms. Safal requests do
jhund mein bati hain (latakne se pehle wali tez, line mein phansi wali dheemi) aur beech ka number kabhi idhar girta hai kabhi udhar.
p99 aur error ginti har run mein wahi rehti hai — unhe dekho.)

👉 **Koi bachav nahi**: `/home` ki latki calls ne A ke saare 20 workers pakad liye → `/profile` (jise B se matlab hi nahi)
**p99 9.2 s, 360/600 error**. B t=8 s par theek ho gaya, par A 12 s tak nahi sambhla — workers abhi bhi purani latki calls
par atke the. Yahi **cascade** hai: ek dheemi dependency poori service kha gayi.

👉 **Sirf timeout**: A bach gaya (`/profile` p99 9 ms, cache fallback). Par A ne latke hue B par **300 calls** phenki —
B par latki requests jama hoti gayi aur **B 3 baar bojh se gira**. Timeout A ko bachata hai, B ko nahi.

👉 **Timeout + breaker**: A bhi bacha, aur B par sirf **30 calls** (10 fail → breaker khula; har 2 s par 3 trial calls).
B ek baar bhi nahi gira. B theek hone ke ~1.1 s baad breaker ne khud pakda ki B wapas aa gaya.

## ex2-counting — do galtiyan jo breaker ko hi outage bana deti hain

```
$ node tools/counting.js
=== (a) purana app version (70% traffic) B par 400 khata hai — B khud theek hai · 50 req/s /price · 6 s ===
breaker kya ginta hai               naye app ki price requests   safal   breaker ne roki   breaker khula (baar)
4xx bhi failure                                90               3           87               3
sirf 5xx + timeout                             90              90            0               0

=== (b) B ka /recs band (503), /price bilkul theek · 25 req/s /home + 25 req/s /price · 6 s ===
breaker kiske liye                  price requests   safal   breaker ne roki   /home: cache se
poore B ka ek breaker                     150          6          144           150
har endpoint ka alag breaker              150        150            0           150
```

👉 **(a)** Purane app ki kharab requests (400) client ki galti hain, B ki nahi. Unhe failure gina → breaker khula →
**naye app ke users ko bhi price nahi mila** (90 mein se 3). Breaker sirf **dependency ki bimaari** gine: 5xx, timeout,
connection error. 400/404/401/409 nahi.

👉 **(b)** `/recs` band tha, `/price` theek. Poore B ka ek breaker → `/recs` ki wajah se `/price` bhi band (**144/150 roki**).
Breaker **resource ke hisaab se** (endpoint / operation) hona chahiye.

## ex3-half-open — breaker khulne ke baad kya?

B t=1s par 3 s ke liye band. Wapas aata hai **thanda**: pehle 3 s mein ek saath sirf 5 → 50 requests jhel sakta hai,
aur har request 200 → 20 ms. A par 200 req/s `/home`.

```
$ node tools/halfopen.js
200 req/s /home · 14 s · B t=1s par 3 s ke liye band, phir 3 s thanda

half-open niyam                    B phir gira (bojh se)   B poora theek (s)   /home: live / cache   breaker khula (baar)
naive: timer → seedha closed               3                19.6            269 / 2531            7
half-open: 3 trial calls                   3                19.9            283 / 2517            7
trials + slow start (3 s ramp)             0                 7.0           1666 / 1134            2

Sirf ek (forced) outage ho toh B t=7 s par poora theek (3 s band + 3 s thanda).
```

👉 **Naive** (timer khatam → seedha closed): poora 200 req/s thande B par → B phir gira → breaker phir khula → … **7 baar**
khula, B 14 s ke run ke baad bhi theek nahi (19.6 s). Yeh "flapping" hai.

👉 **Half-open, 3 trial calls**: is run mein naive jitna hi bura — B **3 baar phir gira**. Teen trial safal hote hi poora traffic
ek saath, aur B abhi thanda tha. Trials sirf yeh poochhte hain "B zinda hai?", yeh nahi "B poora bojh utha sakta hai?"
(2026-10-09 ke 9 runs mein har baar 3 baar gira; 2026-09-30 ke ek run mein 2 baar. Trial calls ka faayda tab dikhta hai jab B
abhi bhi **latka** ho — ex0 mein #11: sirf ek call ne 300 ms khoye, poora traffic nahi.)

👉 **Trials + slow start**: closed ke baad 3 s mein 10% → 100% traffic. B garam hota gaya, **ek baar bhi nahi gira**,
7.0 s par theek — aur 6 guna zyada live jawab. (Load balancers ka "slow start" / "warm-up" mode yahi karta hai.)

## ⚠️ Aam galatfehmi: states ka kram

Kai jagah (source video mein bhi) kram closed → **half-open** → open bataya jaata hai, aur half-open ko "aadhi requests" samjha
jaata hai. Asli state machine:

| Se | Kab | Kahan |
|---|---|---|
| CLOSED | failure rate hadd se upar (kam se kam N calls) | **OPEN** |
| OPEN | timer khatam | **HALF-OPEN** |
| HALF-OPEN | kuch (jaise 3) trial calls safal | CLOSED (behtar: slow start ke saath) |
| HALF-OPEN | ek bhi trial fail | OPEN (timer phir se) |

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Breaker kisko bachata hai? | Pehle A ko (pool nahi bharta), phir B ko (30 vs 300 calls, 0 vs 3 baar gira) |
| Sirf timeout kaafi? | A bachta hai, B nahi — latki calls B par jama hoti hain (slow motion: 8 vs 4) |
| Kya gino? | 5xx, timeout, connection error. 4xx nahi (warna 87/90 roki) |
| Ek breaker ya kai? | Har endpoint / operation ka alag (warna 144/150 roki) |
| Khulne ke baad? | Trial calls + slow start — naive reset flapping karta hai, aur trials akele thande B ko nahi bachate |
| Fallback? | Cache → default → error. Breaker bina fallback = sirf tez error |
