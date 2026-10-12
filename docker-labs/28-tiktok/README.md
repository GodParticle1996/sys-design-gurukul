# 🐳 Lab 28 — TikTok: 3 swipe mein tumhe pehchaan lena

System Gurukul → 🤖 AI Companies → **TikTok** levels ka lab. Zero dependency Node (18+).

```bash
node tools/embeddings.js          # ex1 — hashed vs cuckoo embedding table + expiry (koi server nahi)
npm start ex2-join                # joiner (5051) — streaming join
node tools/stream.js              # window 0.5 / 2 / 5 / 9 sec
node tools/tasteflip.js           # ex3 — nightly batch vs online update
docker compose --profile ex2-join up --build
```

## ex1 — har user ka embedding: table kaisi ho?

```
$ node tools/embeddings.js
1,000,000 users, embedding = 16 floats (64 bytes)

A) fixed-size hashed table
   table   500000 rows ( 31 MB):  86.5% users kisi aur ke saath row share karte hain
   table  1000000 rows ( 61 MB):  63.2% users kisi aur ke saath row share karte hain
   table  2000000 rows (122 MB):  39.4% users kisi aur ke saath row share karte hain
   table  4000000 rows (244 MB):  22.2% users kisi aur ke saath row share karte hain

B) cuckoo hash table (load 50%, 2 jagah per key)
   table 2000000 rows (122 MB): 0% sharing (har user ki apni row), avg dhakke 0.27, sabse lambi chain 366, fail 0

C) expiry — 30 din se inactive users hatao
   372,554 / 1,000,000 users pichhle 30 din mein aaye → table 61 MB → 23 MB (63% memory bachi)
```

- **Hashed table**: users jitni rows ho tab bhi **63%** users kisi anjaan ke saath ek row (ek taste) share karte hain.
  4× rows par bhi 22%. Tumhara cooking + kisi ka gym = ek mila-jula vector.
- **Cuckoo** (ByteDance ke Monolith paper wala idea): har key ki 2 jagah; bhari ho toh purane ko uski dusri jagah dhakelo →
  **0% sharing**, lookup hamesha 2 jagah. Average 0.27 dhakke; 50% load ke paas kabhi-kabhi lambi chain (366) — isliye table ko
  aur bhara nahi jaata.
- **Expiry**: 30 din se nahi aaye users ki row hatao → **63%** memory bachi.

## ex2-join — features + action = training example

2,000 videos dikhe, sach mein 45% poore dekhe gaye. Action aane mein delay: 80% ka 0.2–2 sec, 20% ka 2–8 sec.
Window tak action nahi aaya → **negative**. Window ke baad aaya → **LATE** (positive ko negative bol chuke).

```
$ node tools/stream.js
window    positive   negative   LATE (galat negative)   sach mein positive the   joiner memory (peak pending)
  500 ms      130       1870          746 (85.2%)              876                321
 2000 ms      695       1305          163 (19.0%)              858                917
 5000 ms      796       1204           94 (10.6%)              890                1516
 9000 ms      902       1098            0 (0.0%)              902                1472
```

500 ms: model ko turant example milta hai, par **85%** positives galat label ke saath ("user ko pasand nahi aaya").
9 sec: labels 100% sahi, par example 9 sec der se aur joiner ki memory ~5× zyada. Beech ka raasta chunna padta hai —
aur late actions ke liye correction bhejna padta hai.

## ex3 — taste achaanak badla

Kal tak sirf cooking. Aaj World Cup — pehli video se sirf cricket chahiye. Model 90% apni pasand wala dikhata hai, 10% explore.

```
$ node tools/tasteflip.js
model              agle 20 videos mein poore dekhe   model kab samjha (cricket top par)   (500 users ka average)
nightly batch         0.3 / 20                     aaj kabhi nahi
online (lr 0.05)      2.6 / 20                     video #17.9 (96% users)
online (lr 0.2)      11.2 / 20                     video #6.4 (99% users)
```

Batch model poore session "cooking wala banda" samajhta raha → **0.3/20**. Online update (har swipe ke baad user ka vector
hilao) → **11.2/20**, model 6th video tak samajh gaya. TikTok ka "isne mujhe itni jaldi kaise pehchaana" yahi hai.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Crore users ki embedding table | Hashed = 63% sharing; cuckoo = 0%; expiry = 63% memory bachi |
| Label kab pakka karein? | Window chhoti = 85% galat negatives; badi = der aur memory |
| Taste badla | Nightly 0.3/20 vs online 11.2/20 |
