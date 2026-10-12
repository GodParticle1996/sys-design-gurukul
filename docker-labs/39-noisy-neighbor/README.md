# 🐳 Lab 39 — Noisy neighbour: ek tenant ka shor, sabki neend kharab

System Gurukul → **Noisy Neighbour** levels ka lab (🛡️ Playlist · 1 Resilience → 🔊 Noisy Neighbour; purana level: Scale & Resilience → Bulkhead).
Zero dependency Node (18+) — sirf `tools/express-rate-limit.js` ko npm ki do libraries chahiye.
Source video (credit): Software Developer Diaries — "How to avoid the Noisy Neighbor problem in your software architecture?"

```bash
node tools/slowmo.js             # ex0 — slow motion: 2 khidkiyan, ek shaant tenant, ek ka 12 ka burst   [--mode fifo|quota|fair|pool]
node tools/mini.js               #       sabse chhota program: baari-baari wali line + token wali baalti
node tools/express-rate-limit.js #       wahi hadd, asli library se (pehle: npm install express express-rate-limit)
npm start ex1-fairness    → node tools/tenants.js                      # shared service (5181)   [--policy fifo|quota|fair]
                          → node tools/tenants.js --scenario average   # teen ausat tenants, jod chhat se upar
npm start ex2-autoscale   → node tools/autoscale.js                    # [--setup fifo-auto|fair|fair-auto]
npm start ex3-batch       → node tools/batch.js                        # [--setup same|low|low1|offpeak]
docker compose --profile ex1-fairness up --build       # (ya ex2-autoscale / ex3-batch) · tools: docker compose run --rm tools node tools/slowmo.js
```

| File | Kya hai |
|---|---|
| `lib/fair-queue.js` | **Baari-baari wali line, 33 line**: har tenant ki apni line + baari ka kram (`push`, `next`). Service, `slowmo.js` aur `mini.js` yahi chalate hain. |
| `lib/token-bucket.js` | **Token wali baalti, 18 line**: `rate` (har second kitne tokens) + `burst` (baalti kitni badi); `take()`. Koi timer nahi. |
| `services/shared.js` | Ek saajhi (multi-tenant) service: **4 workers × 20 ms = 200 requests/second**. `POST /config {policy}`: `fifo` (sab ek line, 200 se lambi → 503) · `quota` (har tenant ki baalti 80/s; zyada → 429) · `fair` (har tenant ki apni line, hadd 100; baari-baari). Autoscaler aur batch job bhi isi mein. |

Tools **open-loop** load bhejte hain — jawab ka intezaar kiye bina, jaise asli users.

Numbers ek laptop (WSL, Node v24.18.0) par 2026-10-10 ke runs ke hain. `slowmo.js`, `mini.js` aur `express-rate-limit.js` ka output teen-teen
run mein akshar-akshar wahi aaya. Baaki tools mein number har run thode badalte hain; **pattern wahi rehta hai**.

Docker: `docker-compose.yml` pattern se likha gaya hai, par is machine par Docker nahi hai — compose file chala ke **nahi dekhi gayi**.
Saare tools seedhe Node se chalaye gaye hain.

---

## ex0-slowmo — pehle yeh chalao: ek shor karne wala, ek shaant

KhanaKart ka **partner-api**: restaurants ke system isi se baat karte hain. Yahan 2 khidkiyan (workers), har request 500 ms.

- **B = Bholu Dhaba** (chhota restaurant): har second ek "order accept" (0.25 s, 1.25 s, … kul 7). Tablet 1.5 s tak jawab ka intezaar karta hai.
- **A = Annapurna Foods** (bada chain): 1.00 s par menu-sync script 12 requests ek saath bhej deti hai.

Chaar niyam — wahi requests, wahi khidkiyan; sirf **"agla kaam kiska"** badalta hai. Ghadi tay hai, isliye har run mein wahi output.

```
$ node tools/slowmo.js
partner-api: 2 khidkiyan, har request 500 ms (4 requests/second) · B: har second 1 request, tablet 1.5 s rukta hai · A: 1.00 s par 12 requests ek saath

=== sab ek hi line mein (FIFO) ===
          0.25 s  B#1 aaya → khidki 1 par (turant)
          0.75 s  khidki 1: B#1 ho gaya ✅ (0.50 s mein) → khidki khaali · line khaali
     1.00–1.22 s  A ke 12 requests aaye (menu sync): 2 seedhe khidki par, 10 line mein · line [A A A A A A A A A A]
          1.25 s  B#2 aaya → line mein · line [A A A A A A A A A A B]
          1.50 s  khidki 1: A#1 ho gaya → agla: A#3 · line [A A A A A A A A A B]
          1.52 s  khidki 2: A#2 ho gaya → agla: A#4 · line [A A A A A A A A B]
          2.00 s  khidki 1: A#3 ho gaya → agla: A#5 · line [A A A A A A A B]
          2.02 s  khidki 2: A#4 ho gaya → agla: A#6 · line [A A A A A A B]
          2.25 s  B#3 aaya → line mein · line [A A A A A A B B]
          2.50 s  khidki 1: A#5 ho gaya → agla: A#7 · line [A A A A A B B]
          2.52 s  khidki 2: A#6 ho gaya → agla: A#8 · line [A A A A B B]
          2.75 s  B#2 ❌ 1.5 s ho gaye, jawab nahi aaya — tablet ne haar maan li (B#2 abhi bhi line mein khada hai)
          3.00 s  khidki 1: A#7 ho gaya → agla: A#9 · line [A A A B B]
          3.02 s  khidki 2: A#8 ho gaya → agla: A#10 · line [A A B B]
          3.25 s  B#4 aaya → line mein · line [A A B B B]
          3.50 s  khidki 1: A#9 ho gaya → agla: A#11 · line [A B B B]
          3.52 s  khidki 2: A#10 ho gaya → agla: A#12 · line [B B B]
          3.75 s  B#3 ❌ 1.5 s ho gaye, jawab nahi aaya — tablet ne haar maan li (B#3 abhi bhi line mein khada hai)
          4.00 s  khidki 1: A#11 ho gaya → agla: B#2 · line [B B]
          4.02 s  khidki 2: A#12 ho gaya → agla: B#3 · line [B]
          4.25 s  B#5 aaya → line mein · line [B B]
          4.50 s  khidki 1: B#2 ka kaam poora — par tablet 2.75 s par haar maan chuka tha (bekaar kaam) → agla: B#4 · line [B]
          4.52 s  khidki 2: B#3 ka kaam poora — par tablet 3.75 s par haar maan chuka tha (bekaar kaam) → agla: B#5 · line khaali
          4.75 s  B#4 ❌ 1.5 s ho gaye, jawab nahi aaya — tablet ne haar maan li (B#4 abhi khidki par hai)
          5.00 s  khidki 1: B#4 ka kaam poora — par tablet 4.75 s par haar maan chuka tha (bekaar kaam) → khidki khaali · line khaali
          5.02 s  khidki 2: B#5 ho gaya ✅ (0.77 s mein) → khidki khaali · line khaali
          5.25 s  B#6 aaya → khidki 1 par (turant)
          5.75 s  khidki 1: B#6 ho gaya ✅ (0.50 s mein) → khidki khaali · line khaali
          6.25 s  B#7 aaya → khidki 1 par (turant)
          6.75 s  khidki 1: B#7 ho gaya ✅ (0.50 s mein) → khidki khaali · line khaali
   nateeja → B (Bholu Dhaba): 7 mein se 4 ✅, 3 ❌ · jo poore hue unka sabse lamba intezaar 0.77 s
             A (Annapurna Foods): 12 mein se 12 ✅ · A ka aakhri kaam 4.02 s par poora
             khidkiyon ne kaam kiya 9.50 s (do khidki × 7.50 s = 15.00 s mein se) · usme se bekaar kaam: 3 requests (1.50 s)

=== ek line + har tenant ki token wali baalti: 2 requests/second (quota) ===
          0.25 s  B#1 aaya → khidki 1 par (turant)
          0.75 s  khidki 1: B#1 ho gaya ✅ (0.50 s mein) → khidki khaali · line khaali
     1.00–1.22 s  A ke 12 requests aaye (menu sync): 2 seedhe khidki par, 10 ko 429 (mana) — baalti mein 2 hi tokens the · line khaali
          1.25 s  B#2 aaya → line mein · line [B]
          1.50 s  khidki 1: A#1 ho gaya → agla: B#2 · line khaali
          1.52 s  khidki 2: A#2 ho gaya → khidki khaali · line khaali
          2.00 s  khidki 1: B#2 ho gaya ✅ (0.75 s mein) → khidki khaali · line khaali
          2.25 s  B#3 aaya → khidki 1 par (turant)
          2.75 s  khidki 1: B#3 ho gaya ✅ (0.50 s mein) → khidki khaali · line khaali
          3.25 s  B#4 aaya → khidki 1 par (turant)
          3.75 s  khidki 1: B#4 ho gaya ✅ (0.50 s mein) → khidki khaali · line khaali
          4.25 s  B#5 aaya → khidki 1 par (turant)
          4.75 s  khidki 1: B#5 ho gaya ✅ (0.50 s mein) → khidki khaali · line khaali
          5.25 s  B#6 aaya → khidki 1 par (turant)
          5.75 s  khidki 1: B#6 ho gaya ✅ (0.50 s mein) → khidki khaali · line khaali
          6.25 s  B#7 aaya → khidki 1 par (turant)
          6.75 s  khidki 1: B#7 ho gaya ✅ (0.50 s mein) → khidki khaali · line khaali
   nateeja → B (Bholu Dhaba): 7 mein se 7 ✅, 0 ❌ · jo poore hue unka sabse lamba intezaar 0.75 s
             A (Annapurna Foods): 12 mein se 2 ✅, 10 ko 429 (mana) — jabki khidkiyan khaali thi
             khidkiyon ne kaam kiya 4.50 s (do khidki × 7.50 s = 15.00 s mein se)

=== har tenant ki apni line, khidkiyan baari-baari (fair queue) ===
          0.25 s  B#1 aaya → khidki 1 par (turant)
          0.75 s  khidki 1: B#1 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 0 · B ki line: 0
     1.00–1.22 s  A ke 12 requests aaye (menu sync): 2 seedhe khidki par, 10 line mein · A ki line: 10 · B ki line: 0
          1.25 s  B#2 aaya → line mein · A ki line: 10 · B ki line: 1
          1.50 s  khidki 1: A#1 ho gaya → agla: B#2 (baari B ki) · A ki line: 10 · B ki line: 0
          1.52 s  khidki 2: A#2 ho gaya → agla: A#3 (baari A ki) · A ki line: 9 · B ki line: 0
          2.00 s  khidki 1: B#2 ho gaya ✅ (0.75 s mein) → agla: A#4 (baari B ki thi, par B ki line khaali) · A ki line: 8 · B ki line: 0
          2.02 s  khidki 2: A#3 ho gaya → agla: A#5 (baari B ki thi, par B ki line khaali) · A ki line: 7 · B ki line: 0
          2.25 s  B#3 aaya → line mein · A ki line: 7 · B ki line: 1
          2.50 s  khidki 1: A#4 ho gaya → agla: B#3 (baari B ki) · A ki line: 7 · B ki line: 0
          2.52 s  khidki 2: A#5 ho gaya → agla: A#6 (baari A ki) · A ki line: 6 · B ki line: 0
          3.00 s  khidki 1: B#3 ho gaya ✅ (0.75 s mein) → agla: A#7 (baari B ki thi, par B ki line khaali) · A ki line: 5 · B ki line: 0
          3.02 s  khidki 2: A#6 ho gaya → agla: A#8 (baari B ki thi, par B ki line khaali) · A ki line: 4 · B ki line: 0
          3.25 s  B#4 aaya → line mein · A ki line: 4 · B ki line: 1
          3.50 s  khidki 1: A#7 ho gaya → agla: B#4 (baari B ki) · A ki line: 4 · B ki line: 0
          3.52 s  khidki 2: A#8 ho gaya → agla: A#9 (baari A ki) · A ki line: 3 · B ki line: 0
          4.00 s  khidki 1: B#4 ho gaya ✅ (0.75 s mein) → agla: A#10 (baari B ki thi, par B ki line khaali) · A ki line: 2 · B ki line: 0
          4.02 s  khidki 2: A#9 ho gaya → agla: A#11 (baari B ki thi, par B ki line khaali) · A ki line: 1 · B ki line: 0
          4.25 s  B#5 aaya → line mein · A ki line: 1 · B ki line: 1
          4.50 s  khidki 1: A#10 ho gaya → agla: B#5 (baari B ki) · A ki line: 1 · B ki line: 0
          4.52 s  khidki 2: A#11 ho gaya → agla: A#12 (baari A ki) · A ki line: 0 · B ki line: 0
          5.00 s  khidki 1: B#5 ho gaya ✅ (0.75 s mein) → khidki khaali · A ki line: 0 · B ki line: 0
          5.02 s  khidki 2: A#12 ho gaya → khidki khaali · A ki line: 0 · B ki line: 0
          5.25 s  B#6 aaya → khidki 1 par (turant)
          5.75 s  khidki 1: B#6 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 0 · B ki line: 0
          6.25 s  B#7 aaya → khidki 1 par (turant)
          6.75 s  khidki 1: B#7 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 0 · B ki line: 0
   nateeja → B (Bholu Dhaba): 7 mein se 7 ✅, 0 ❌ · jo poore hue unka sabse lamba intezaar 0.75 s
             A (Annapurna Foods): 12 mein se 12 ✅ · A ka aakhri kaam 5.02 s par poora
             khidkiyon ne kaam kiya 9.50 s (do khidki × 7.50 s = 15.00 s mein se)

=== har tenant ki apni khidki: khidki 1 sirf A ki, khidki 2 sirf B ki (pool) ===
          0.25 s  B#1 aaya → khidki 2 par (turant)
          0.75 s  khidki 2: B#1 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 0 · B ki line: 0
     1.00–1.22 s  A ke 12 requests aaye (menu sync): 1 seedhe khidki par, 11 line mein · A ki line: 11 · B ki line: 0
          1.25 s  B#2 aaya → khidki 2 par (turant)
          1.50 s  khidki 1: A#1 ho gaya → agla: A#2 · A ki line: 10 · B ki line: 0
          1.75 s  khidki 2: B#2 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 10 · B ki line: 0
          2.00 s  khidki 1: A#2 ho gaya → agla: A#3 · A ki line: 9 · B ki line: 0
          2.25 s  B#3 aaya → khidki 2 par (turant)
          2.50 s  khidki 1: A#3 ho gaya → agla: A#4 · A ki line: 8 · B ki line: 0
          2.75 s  khidki 2: B#3 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 8 · B ki line: 0
          3.00 s  khidki 1: A#4 ho gaya → agla: A#5 · A ki line: 7 · B ki line: 0
          3.25 s  B#4 aaya → khidki 2 par (turant)
          3.50 s  khidki 1: A#5 ho gaya → agla: A#6 · A ki line: 6 · B ki line: 0
          3.75 s  khidki 2: B#4 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 6 · B ki line: 0
          4.00 s  khidki 1: A#6 ho gaya → agla: A#7 · A ki line: 5 · B ki line: 0
          4.25 s  B#5 aaya → khidki 2 par (turant)
          4.50 s  khidki 1: A#7 ho gaya → agla: A#8 · A ki line: 4 · B ki line: 0
          4.75 s  khidki 2: B#5 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 4 · B ki line: 0
          5.00 s  khidki 1: A#8 ho gaya → agla: A#9 · A ki line: 3 · B ki line: 0
          5.25 s  B#6 aaya → khidki 2 par (turant)
          5.50 s  khidki 1: A#9 ho gaya → agla: A#10 · A ki line: 2 · B ki line: 0
          5.75 s  khidki 2: B#6 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 2 · B ki line: 0
          6.00 s  khidki 1: A#10 ho gaya → agla: A#11 · A ki line: 1 · B ki line: 0
          6.25 s  B#7 aaya → khidki 2 par (turant)
          6.50 s  khidki 1: A#11 ho gaya → agla: A#12 · A ki line: 0 · B ki line: 0
          6.75 s  khidki 2: B#7 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 0 · B ki line: 0
          7.00 s  khidki 1: A#12 ho gaya → khidki khaali · A ki line: 0 · B ki line: 0
   nateeja → B (Bholu Dhaba): 7 mein se 7 ✅, 0 ❌ · jo poore hue unka sabse lamba intezaar 0.50 s
             A (Annapurna Foods): 12 mein se 12 ✅ · A ka aakhri kaam 7.00 s par poora
             khidkiyon ne kaam kiya 9.50 s (do khidki × 7.50 s = 15.00 s mein se)
```

| Niyam | Bholu Dhaba (B) | Annapurna (A) | Khidkiyon ka kaam (15 s mein se) |
|---|---|---|---|
| Sab ek line mein | 7 mein se **3 ❌** | 12 ✅ · 4.02 s | 9.50 s, usme 1.50 s bekaar |
| Har tenant 2 / second (quota) | 0 ❌ | **2 ✅, 10 × 429** | **4.50 s** — khaali jagah bekaar |
| Baari-baari (fair queue) | **0 ❌** · ≤ 0.75 s | **12 ✅** · 5.02 s | 9.50 s, bekaar 0 |
| Har tenant ki apni khidki (pool) | 0 ❌ · 0.50 s | 12 ✅ · 7.00 s | 9.50 s — B ki khidki aadhe samay khaali |

👉 **Ek line**: A ne 0.22 second shor kiya; B 3.5 second tak bhugta (1.25 s → 4.75 s). Aur partner-api ne 3 aisi requests par kaam kiya
jinka tablet pehle hi haar maan chuka tha.

👉 **Hadd**: B bach gaya, par A ki 10 requests mana — jabki khidkiyan khaali thi. Hadd sirf ginti dekhti hai.

👉 **Baari-baari**: B bhi bacha, A ka kaam bhi poora. Keemat A ne di: 1 second der.

👉 **Alag khidki**: B par A ka koi asar hi nahi (0.50 s), par A ka kaam 7.00 s tak — aur B ki khidki aadhe samay khaali baithi.

### mini.js — sabse chhota chalta program

`lib/fair-queue.js` aur `lib/token-bucket.js`, seedhe haath mein. Teesra hissa: baari ke kram mein A ka naam do baar → A ko do baari.

```
$ node tools/mini.js
aane ka kram:     A#1  A#2  A#3  A#4  A#5  B#1  B#2
uthane ka kram:   A#1  B#1  A#2  B#2  A#3  A#4  A#5
B#1 doosre number par utha, saatven par nahi — jabki A ke paanchon kaam pehle aaye the.

ek saath 5 requests:   true  true  false  false  false
0.6 s ruk ke 2 aur:    true  false
5 s ruk ke 4 aur:      true  true  false  false   ← 5 second ruke, phir bhi 2 hi: baalti mein 2 se zyada jama nahi hote

baari ke kram mein A do baar:   A#1  B#1  A#2  A#3  B#2  A#4  A#5  B#3  A#6
```

### express-rate-limit.js — wahi hadd, asli library se

```bash
npm install express express-rate-limit      # sirf is tool ke liye
node tools/express-rate-limit.js
```

Tool apna chhota Express server khud chalata hai. A aur B dono isi machine se bhejte hain, isliye server ko dono ka IP ek hi dikhta hai —
jaise ek hi office ke peeche ke log, ya load balancer ke peeche ki har request.

```
express-rate-limit 8.7.1 · Express 5.3.0 · A aur B dono ka IP: 127.0.0.1

=== 1. limit: 4 requests / second — ginti kiski? library ka default: IP ki ===
   0.0 s  B#1 → 200 (is second mein bache: 3)
   0.2 s  A ke 12 requests → 3 × 200, 9 × 429
   0.4 s  B#2 → 429 · Retry-After: 1   ← B ne sirf 2 requests bheji thi
   1.2 s  B#3 → 200 (is second mein bache: 3)   (naya second)

=== 2. wahi limit — ginti x-api-key ki (har tenant ki apni) ===
   0.0 s  B#1 → 200 (is second mein bache: 3)
   0.2 s  A ke 12 requests → 4 × 200, 8 × 429
   0.4 s  B#2 → 200 (is second mein bache: 2)
   1.2 s  B#3 → 200 (is second mein bache: 3)   (naya second)

=== 3. rateLimit() — koi setting nahi ===
   6 requests (A aur B ki mili-juli) → 5 × 200, 1 × 429 · chhathi par: 429 · Retry-After: 60
   default: ek IP se 1 minute mein 5 requests (windowMs 60000 · limit 5 · key = IP)

=== 4. wahi 8 requests: 0.0 s par 1 · 0.9 s par 3 · 1.1 s par 4 (limit 4/second) ===
   express-rate-limit (har second nayi ginti):  1 + 3 + 4 = 8 andar   ← 0.9 s se 1.1 s ke beech 7 andar
   lib/token-bucket.js (tapakte tokens):        1 + 3 + 1 = 5 andar
```

👉 **Ginti kiski?** Library ka default IP hai. A aur B ka IP ek hi → A ne dono ka hissa kha liya, aur B ki **doosri** request ko 429.
Limiter khud "ek line" ban gaya. `keyGenerator` mein tenant ki pehchaan do → B ko 200.

👉 **Default**: `rateLimit()` = ek IP se 1 minute mein 5 requests. (Library ke source se: `windowMs: 60 * 1e3`, `limit: 5`, key = `request.ip`.)

👉 **Hisaab alag**: library har key ki ginti ek second tak rakhti hai, phir zero. Do second ke kinare par wahi 8 requests poori andar
(0.2 s mein 7). Token wali baalti: 5.

---

## ex1-fairness — asli raftaar: A ka burst, B aur C ki saza

A (shor karne wala) t=2s se t=7s tak **400 req/s** (chhat ka dugna). B aur C (shaant) 30 req/s har ek.

```
$ node tools/tenants.js
Service: 4 workers × 20 ms = 200 req/s · A: 50 req/s, t=2–7s par 400 req/s · B, C: 30 req/s har ek · 10 s

niyam                         B+C (shaant) p50   p99       error      A: safal / 429 / 503
ek line (FIFO)                   93 ms   1031 ms    233/578      1376 /    0 / 790   (A ne bheje 2166)
har tenant quota 80/s            22 ms    322 ms      0/580       721 / 1453 / 0   (A ne bheje 2174)
fair queuing (baari-baari)       24 ms     41 ms      0/580      1046 /    0 / 1121   (A ne bheje 2167)
```

👉 **Ek line**: B aur C ki **578 mein se 233 requests fail** (40%), sabse dheemi 1% ko 1,031 ms. B aur C ne kuch galat nahi kiya.

👉 **Quota (80/s har tenant)**: B, C bach gaye (0 error). Par A ki **1,453** requests 429 se lauti — jabki 200 mein se 140 khaali tha.

👉 **Fair queuing**: B, C ka p99 **41 ms**, 0 error — **aur** A ko quota se zyada mila (1,046 banaam 721). A ke 503 A ki apni line bharne se.

Teen run: ek line mein fail 234/578 · 233/578 · 240/580 · quota mein A ko 429 1,449 · 1,453 · 1,450 · fair mein A ki safal 1,043 · 1,046 · 1,047.

### --scenario average — koi shor nahi karta, par jod chhat se upar

A, B, C teeno **80 req/s** (kul 240, chhat 200). Kisi ka burst nahi.

```
$ node tools/tenants.js --scenario average
Service: 4 workers × 20 ms = 200 req/s · A, B, C: teeno 80 req/s (kul 240) · 10 s

niyam                         A: fail / bheje      B: fail / bheje      C: fail / bheje      safal p50      p99
ek line (FIFO)                   1 / 774  ( 0%)      20 / 774  ( 3%)     117 / 774  (15%)     796 ms   1030 ms
har tenant quota 80/s            2 / 776  ( 0%)      37 / 776  ( 5%)     109 / 776  (14%)     817 ms   1032 ms
fair queuing (baari-baari)      14 / 776  ( 2%)      14 / 776  ( 2%)      15 / 776  ( 2%)     846 ms   1533 ms
```

👉 Teeno niyamon mein **sab dheeme** (aadhi requests ~0.8 s; aam din ~20 ms). Hadd ne kuch nahi kiya (koi 80 ke upar gaya hi nahi; 3 × 80 = 240 > 200).
Ek line mein takleef kisi ek par zyada padi — yahan C par, kyunki tool har 10 ms par A, phir B, phir C bhejta hai. Fair queuing ne takleef barabar
baant di. **Isolation takleef baant-ti hai, jagah nahi banati.**

---

## ex2-autoscale — autoscaling ki der

A t=2s se **300 req/s** (lambe samay tak). Autoscaler: 3 s tak 80% busy dekhe → 5 s boot → naye 4 workers (chhat 400).

```
$ node tools/autoscale.js
A: 50 req/s, t=2s se 300 req/s · B, C: 30 req/s · 16 s · chhat 200 req/s → autoscale ke baad 400

setup                          naye workers kab   B+C error (scale se pehle / baad)   B+C p99 (pehle / baad)   A safal / bheje
ek line + autoscale               t=10.1s           354/472  /    0/342                1032 ms / 513 ms         3500 / 4171
fair queuing, autoscale nahi   kabhi nahi             0/814  /    -                  41 ms / -         2162 / 4168
fair queuing + autoscale          t=10.1s             0/470  /    0/346                  39 ms / 32 ms         3058 / 4183
```

👉 Autoscaling **aaya** (t=10.1 s) — par us se pehle ke ~8 second mein B aur C ki **472 mein se 354 requests fail** (75%).
Teen run: 354–377 (472 mein se).

👉 Fair queuing ke saath B, C ko **0 error** — scale se pehle bhi, aur bina kisi nayi machine ke bhi. Autoscale ka kaam sirf A ko zyada dena reh gaya
(2,162 → 3,058). **Isolation pehle, autoscale uske upar.**

---

## ex3-batch — cleanup job din mein chal gaya

"Fraud users hatao" cleanup: 300 tukde, har tukda **100 ms** ka DB kaam. Users: 110 req/s (chhat 200). Job t=2s par.

```
$ node tools/batch.js
Service 200 req/s · cleanup: 300 chunks × 100 ms, t=2s se · 12 s

job kab / kaise                          users p50 (job ke dauraan)   users p99   users error   job khatam hone mein
peak par, users ki line mein                 141 ms                 166 ms        0/1070    10 s mein 189/300
peak par, low priority                        42 ms                 100 ms        0/1073    10 s mein 184/300
peak par, low priority + max 1 worker         22 ms                  24 ms        0/1068    10 s mein 100/300
off-peak par (users 20 req/s)                 73 ms                 119 ms        0/164     8.4 s
```

👉 **Users ki line mein**: users ka jawab ~20 ms se **141 ms**.
👉 **Low priority** (tukda tabhi uthta hai jab users ki line khaali ho): 42 ms — 22 nahi. Jo 100 ms ka tukda worker par chadh chuka, use
roka nahi ja sakta.
👉 **Low priority + max 1 worker**: users ko pata bhi nahi chala (**22 ms**). Keemat: job aadhi raftaar (100/300).
👉 **Off-peak**: job 8.4 s mein khatam, aur sirf 164 requests par asar — par jo us waqt aaye, unhe 73 ms.

---

## ⚠️ Aam galatfehmi

- **"Autoscaling laga do."** Nayi machines der se aati hain (ex2: 75% fail us der mein). Isolation pehle.
- **"Beech mein queue laga do."** Ek saajhi line bheed ko sokhti hai, baant-ti nahi (ex0, ex1 ki pehli line).
- **"Rate limit mein koi nuksaan nahi."** Hadd khaali jagah nahi dekhti (ex1: A ki 1,453 ko 429).
- **"Rate limit IP par."** Ek IP ke peeche bahut log (ex0, express-rate-limit: B ki doosri request ko 429).
- **"Kubernetes ki QoS class noisy neighbour ko rokti hai."** QoS class tangi mein nikaalne ka kram hai. Hadd = CPU limit, baari ka wazan = CPU request.

## Khud try karo

1. `tools/slowmo.js` mein quota ki baalti badi karo (`TokenBucket({ rate: 2, burst: 6, … })`). A ki kitni requests andar jaati hain? B par kya asar?
2. `tools/mini.js` ke teesre hisse mein B ka naam bhi do baar daalo. Kram kya banta hai?
3. `services/shared.js` mein `TENANT_QMAX` 100 se 10 karo. Fair queuing mein A ke 503 badhte hain ya B, C ke?
4. `tools/tenants.js --scenario average` mein C ko 40 req/s kar do (jod 200). Ab kaun dheema hai?
