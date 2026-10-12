# 🐳 Lab 25 — WhatsApp: 50 engineers, 90 crore users, aur ek event loop

System Gurukul → 🏢 Real Company Stories → **WhatsApp** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-connections              # registry (5013) + chat1 (5011, stats 5111)
node tools/conns.js --conns 20000      # 20,000 idle phones ek process par
node tools/threads.js --threads 200    # "har connection ka apna thread" — asli threads bana ke naapo
node tools/contention.js               # ex2 — ek taala vs 256 taale, asli worker_threads
npm start ex3-store-forward            # registry + chat1 + chat2 (5012)
node tools/offline.js                  # offline queue, dusre server se wapas aana
node tools/groupcrypt.js               # ex4 — group encryption: pairwise vs sender key (koi server nahi)
docker compose --profile ex1-connections up --build     # profiles: ex1-connections, ex3-store-forward
```

## ex1-connections — ek phone = ek connection, jo hamesha khula rehta hai

```
$ node tools/conns.js --conns 20000
    5000 connections → server RSS 70 MB
   10000 connections → server RSS 83 MB
   15000 connections → server RSS 95 MB
   20000 connections → server RSS 109 MB

20000 idle connections, ek process, ek event loop:
  server RSS 47 MB → 109 MB  = 3.2 KB per connection

$ node tools/threads.js --threads 200
200 threads (har "connection" ka apna thread):
  poore system ka RSS 45 MB → 1105 MB = 5427 KB per thread
  20,000 connections ke liye extrapolate: 103.5 GB
```

Event loop par idle connection sirf ek socket + thoda buffer: **3.2 KB**. Thread-per-connection mein har connection ka apna
stack aur runtime. (Imaandari: Node ka `worker_thread` poora V8 isolate leke aata hai, isliye 5.4 MB — C/Java ka OS thread
isse sasta hai, par phir bhi KB mein nahi, aur 20 lakh threads ka context switching alag dard.) Erlang ka process bhi isi
soch ka hai: kuch KB ka, lakhon ek machine par — WhatsApp ne ek server par **20 lakh+ connections** isi se chalaye.

## ex2 — ek taala vs baante hue taale (asli threads, asli shared memory)

Har operation = "is user ka session update karo" — taale ke andar thoda kaam. 14-core laptop:

```
$ node tools/contention.js
threads   one-lock ops/sec     partitioned (256 locks) ops/sec
    1      2.57 M  (1.0x)          2.14 M  (1.0x)
    2      1.80 M  (0.7x)          4.09 M  (1.9x)
    4      1.43 M  (0.6x)          6.88 M  (3.2x)
    8      1.15 M  (0.4x)          9.02 M  (4.2x)
```

**Ek taala: threads badhaye, kaam GHATA** (1.0× → 0.4×) — sab ek darwaaze par, upar se cache line ek core se doosre par
bhaagti rehti hai. 256 taale (user ke hisaab se): 8 threads par **4.2×**. WhatsApp ne FreeBSD aur Erlang (BEAM) mein
yahi kiya — jahan bhi ek global lock mila, use tod ke baanta. Note: taale alag-alag 64-byte cache lines par hain;
ek hi line par rakhoge toh "false sharing" phir se sab dheema kar deta hai.

## ex3-store-forward — server dakiya hai, library nahi

```
$ node tools/offline.js
1) Dono online (alag servers): Aman ko mile 3: ["riya live message 1","riya live message 2","riya live message 3"]
   Riya ko ACKs: ["OK via chat2","OK via chat2","OK via chat2"]   registry mein stored: 0

2) Aman ka phone band. Riya ne 5 bheje → ACKs ["OK queued","OK queued"]…   registry mein stored: 5

3) Aman wapas (is baar chat1 par): READY ke saath mile 5: [...5 messages...]
   registry mein ab stored: 0   (kabhi 5 store hue, 5 deliver hoke mitaaye)
```

Online hai → seedha (chahe dusre server par ho — registry batati hai kahan). Offline hai → queue mein.
Wapas aaya (kisi bhi server par) → queue khaali karke **server se mita do**. History phone par rehti hai →
server ki storage users ke saath nahi badhti, sirf "abhi raaste mein" wale messages ke saath.

## ex4 — group encryption: pairwise vs sender key

Asli AES-256-GCM (Node `crypto`), 200 messages × 1 KB.

```
$ node tools/groupcrypt.js
members   tareeka      encryptions   bytes upload (sender)   time        join/leave par
   100    pairwise        19800       19.9 MB               466 ms   kuch nahi
   100    sender key        299       0.21 MB                 7 ms   99 naye key bhejo (rotate)
  1000    pairwise       199800      200.5 MB              4475 ms   kuch nahi
  1000    sender key       1199       0.26 MB                28 ms   999 naye key bhejo (rotate)
```

**Pairwise**: har message har member ke liye alag encrypt → 1,000 logon ke group mein ek message = 999 encryptions aur 999 copies
upload. **Sender key** (Signal/WhatsApp groups): har member apni sender key ek baar sabko (pairwise) bhejta hai; phir har message
**ek baar** encrypt, ek sealed copy, server fan-out karta hai (par padh nahi sakta). 200 MB → 0.26 MB. Keemat: **key management** —
koi group chhode toh sender keys rotate karo, taaki woh aage ke messages na padh sake.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Laakhon phones hamesha connected | Event loop: 3.2 KB per connection vs thread: MBs |
| Zyada cores, zyada speed? | Sirf tab jab taale bante hon: 0.4× vs 4.2× |
| Offline user | Store and forward — deliver hote hi server se gayab (stored 5 → 0) |
| Bade group mein E2E | Sender key: 199,800 → 1,199 encryptions, 200 MB → 0.26 MB |
