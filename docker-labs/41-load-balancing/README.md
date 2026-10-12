# 🐳 Lab 41 — Load balancing: request kis server par jaaye?

System Gurukul → **Randomness** levels ka lab (🛡️ Playlist · 1 Resilience → 🎲 Randomness; purana level: Flow → Network).
Zero dependency Node (18+). Source video (credit): Software Developer Diaries — "The Secret Weapon Behind Resilient
Distributed Systems" (randomness; yahan uska "server chunna" wala hissa).

```bash
node tools/slowmo.js             # ex0 — slow motion: 3 servers, har 0.25 s par ek request; chhe tareeke + ek dheema server
                                 #       [--mode stale|rr|random|two|live|two-live] [--slow]
node tools/mini.js               #       sabse chhota program: ek hi purana haal, chaaron tareeke, 1,000 requests
npm start ex1-algorithms   → node tools/algos.js      # asli raftaar: LB 5201 → servers 5202–5206   [--scenario same|slow]
docker compose --profile ex1-algorithms up --build   # ya Docker se · tools: docker compose run --rm tools node tools/slowmo.js
```

| File | Kya hai |
|---|---|
| `lib/pick.js` | **Chunne ke chaar tareeke, 32 line**: `roundRobin` (baari-baari) · `anyOne` (koi bhi ek) · `leastLoaded` (sabse kam load wala) · `bestOfTwo` (do mein se behtar). Load balancer, `slowmo.js` aur `mini.js` yahi chalate hain. |
| `services/lb.js` | Load balancer. Chhe algorithms = chaar tareeke × jaankari kahan se: `leastconn` aur `p2c-live` load balancer ki **apni ginti** dekhte hain (bheji − lauti: hamesha taaza); `resource` aur `p2c` servers ka **bheja haal** dekhte hain (har 500 ms: 500 ms tak purana). |
| `services/backend.js` | Ek server: 4 workers, baaki line mein. 90% requests 10 ms, 10% requests 200 ms. `GET /load` ek **load average** deta hai (pichhle ~1/4 second ka ausat, dashamlav wali sankhya — jaise asli servers CPU % bhejte hain). |

Numbers ek laptop (WSL, Node v24.18.0) par 2026-10-10 ke runs ke hain. `slowmo.js` aur `mini.js` mein sikkon ka beej aur ghadi tay hai —
teen-teen run mein output akshar-akshar wahi aaya. `algos.js` ke number har run mein badalte hain; **tarteeb wahi rehti hai**.

Docker: `docker-compose.yml` pattern se likha gaya hai, par is machine par Docker nahi hai — compose file chala ke **nahi dekhi gayi**.

---

## ex0-slowmo — pehle yeh chalao: jhund, aur do sikke

KhanaKart ki menu-service ke 3 servers (S1, S2, S3) aur unke aage load balancer (LB). Har server ek waqt mein ek request karta hai
(600 ms); baaki us server ki line mein. Requests har 250 ms par (kul 24). Shuru mein S1 par 2 kaam, S2 par 1, S3 khaali.

```
$ node tools/slowmo.js
3 servers, har ek ek waqt mein 1 request (600 ms) · requests har 250 ms par (kul 24) · shuru mein S1 par 2 kaam, S2 par 1, S3 khaali

=== sabse kam load wala · jaankari har 1 s par aati hai (beech mein purani) ===
    0.00 s  📋 servers ne apna haal bheja: S1 2 · S2 1 · S3 0
    0.00 s  #1  → S3   (LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 1
    0.25 s  #2  → S3   (LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 2
    0.50 s  #3  → S3   (LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 3
    0.75 s  #4  → S3   (LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 1 · S2 0 · S3 3
    1.00 s  📋 servers ne apna haal bheja: S1 1 · S2 0 · S3 3
    1.00 s  #5  → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 1 · S2 1 · S3 3
    1.25 s  #6  → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 0 · S2 2 · S3 2
    1.50 s  #7  → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 0 · S2 3 · S3 2
    1.75 s  #8  → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 0 · S2 3 · S3 2
    2.00 s  📋 servers ne apna haal bheja: S1 0 · S2 3 · S3 1
    2.00 s  #9  → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 1 · S2 3 · S3 1
    2.25 s  #10 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 1
    2.50 s  #11 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 3 · S2 2 · S3 0
    2.75 s  #12 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 3 · S2 2 · S3 0
    3.00 s  📋 servers ne apna haal bheja: S1 3 · S2 1 · S3 0
    3.00 s  #13 → S3   (LB ko dikha: S1 3 · S2 1 · S3 0)   asal mein ab: S1 3 · S2 1 · S3 1
    3.25 s  #14 → S3   (LB ko dikha: S1 3 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 2
    3.50 s  #15 → S3   (LB ko dikha: S1 3 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 0 · S3 3
    3.75 s  #16 → S3   (LB ko dikha: S1 3 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 0 · S3 3
    4.00 s  📋 servers ne apna haal bheja: S1 1 · S2 0 · S3 3
    4.00 s  #17 → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 1 · S2 1 · S3 3
    4.25 s  #18 → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 1 · S2 2 · S3 2
    4.50 s  #19 → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 0 · S2 3 · S3 2
    4.75 s  #20 → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 0 · S2 3 · S3 2
    5.00 s  📋 servers ne apna haal bheja: S1 0 · S2 3 · S3 1
    5.00 s  #21 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 1 · S2 3 · S3 1
    5.25 s  #22 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 1
    5.50 s  #23 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 3 · S2 2 · S3 0
    5.75 s  #24 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 3 · S2 2 · S3 0
    6.00 s  📋 servers ne apna haal bheja: S1 3 · S2 1 · S3 0
    7.00 s  📋 servers ne apna haal bheja: S1 1 · S2 0 · S3 0
   nateeja → requests: S1 8 · S2 8 · S3 8 · ek request ka ausat samay 1.13 s · sabse lamba 1.65 s (#4, S3) · sabse lambi line 2

=== baari-baari (round robin) · koi jaankari nahi ===
    0.00 s  #1  → S1   (baari)   asal mein ab: S1 3 · S2 1 · S3 0
    0.25 s  #2  → S2   (baari)   asal mein ab: S1 3 · S2 2 · S3 0
    0.50 s  #3  → S3   (baari)   asal mein ab: S1 3 · S2 2 · S3 1
    0.75 s  #4  → S1   (baari)   asal mein ab: S1 3 · S2 1 · S3 1
    1.00 s  #5  → S2   (baari)   asal mein ab: S1 3 · S2 2 · S3 1
    1.25 s  #6  → S3   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    1.50 s  #7  → S1   (baari)   asal mein ab: S1 3 · S2 1 · S3 1
    1.75 s  #8  → S2   (baari)   asal mein ab: S1 3 · S2 2 · S3 1
    2.00 s  #9  → S3   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    2.25 s  #10 → S1   (baari)   asal mein ab: S1 3 · S2 1 · S3 1
    2.50 s  #11 → S2   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    2.75 s  #12 → S3   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    3.00 s  #13 → S1   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    3.25 s  #14 → S2   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    3.50 s  #15 → S3   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    3.75 s  #16 → S1   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    4.00 s  #17 → S2   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    4.25 s  #18 → S3   (baari)   asal mein ab: S1 1 · S2 1 · S3 1
    4.50 s  #19 → S1   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    4.75 s  #20 → S2   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    5.00 s  #21 → S3   (baari)   asal mein ab: S1 1 · S2 1 · S3 1
    5.25 s  #22 → S1   (baari)   asal mein ab: S1 2 · S2 1 · S3 1
    5.50 s  #23 → S2   (baari)   asal mein ab: S1 1 · S2 1 · S3 1
    5.75 s  #24 → S3   (baari)   asal mein ab: S1 1 · S2 1 · S3 1
   nateeja → requests: S1 8 · S2 8 · S3 8 · ek request ka ausat samay 0.85 s · sabse lamba 1.80 s (#1, S1) · sabse lambi line 2

=== koi bhi ek (random) · koi jaankari nahi ===
    0.00 s  #1  → S1   (sikka)   asal mein ab: S1 3 · S2 1 · S3 0
    0.25 s  #2  → S1   (sikka)   asal mein ab: S1 4 · S2 1 · S3 0
    0.50 s  #3  → S3   (sikka)   asal mein ab: S1 4 · S2 1 · S3 1
    0.75 s  #4  → S3   (sikka)   asal mein ab: S1 3 · S2 0 · S3 2
    1.00 s  #5  → S2   (sikka)   asal mein ab: S1 3 · S2 1 · S3 2
    1.25 s  #6  → S2   (sikka)   asal mein ab: S1 2 · S2 2 · S3 1
    1.50 s  #7  → S2   (sikka)   asal mein ab: S1 2 · S2 3 · S3 1
    1.75 s  #8  → S1   (sikka)   asal mein ab: S1 3 · S2 2 · S3 0
    2.00 s  #9  → S2   (sikka)   asal mein ab: S1 2 · S2 3 · S3 0
    2.25 s  #10 → S3   (sikka)   asal mein ab: S1 2 · S2 2 · S3 1
    2.50 s  #11 → S1   (sikka)   asal mein ab: S1 2 · S2 2 · S3 1
    2.75 s  #12 → S1   (sikka)   asal mein ab: S1 3 · S2 2 · S3 1
    3.00 s  #13 → S3   (sikka)   asal mein ab: S1 2 · S2 1 · S3 1
    3.25 s  #14 → S2   (sikka)   asal mein ab: S1 2 · S2 2 · S3 1
    3.50 s  #15 → S1   (sikka)   asal mein ab: S1 3 · S2 1 · S3 1
    3.75 s  #16 → S2   (sikka)   asal mein ab: S1 2 · S2 2 · S3 0
    4.00 s  #17 → S1   (sikka)   asal mein ab: S1 3 · S2 1 · S3 0
    4.25 s  #18 → S2   (sikka)   asal mein ab: S1 2 · S2 2 · S3 0
    4.50 s  #19 → S1   (sikka)   asal mein ab: S1 3 · S2 2 · S3 0
    4.75 s  #20 → S3   (sikka)   asal mein ab: S1 3 · S2 1 · S3 1
    5.00 s  #21 → S1   (sikka)   asal mein ab: S1 3 · S2 1 · S3 1
    5.25 s  #22 → S3   (sikka)   asal mein ab: S1 3 · S2 0 · S3 2
    5.50 s  #23 → S1   (sikka)   asal mein ab: S1 3 · S2 0 · S3 1
    5.75 s  #24 → S1   (sikka)   asal mein ab: S1 4 · S2 0 · S3 1
   nateeja → requests: S1 11 · S2 7 · S3 6 · ek request ka ausat samay 1.17 s · sabse lamba 2.15 s (#2, S1) · sabse lambi line 3

=== do mein se behtar · wahi purani jaankari (har 1 s) ===
    0.00 s  📋 servers ne apna haal bheja: S1 2 · S2 1 · S3 0
    0.00 s  #1  → S3   (do sikke: S1, S3 · LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 1
    0.25 s  #2  → S3   (do sikke: S3, S2 · LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 2
    0.50 s  #3  → S2   (do sikke: S2, S1 · LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 2 · S3 2
    0.75 s  #4  → S3   (do sikke: S2, S3 · LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 1 · S2 1 · S3 2
    1.00 s  📋 servers ne apna haal bheja: S1 1 · S2 1 · S3 2
    1.00 s  #5  → S1   (do sikke: S1, S3 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 1 · S3 2
    1.25 s  #6  → S2   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 1 · S3 1
    1.50 s  #7  → S2   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 1
    1.75 s  #8  → S2   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 3 · S3 1
    2.00 s  📋 servers ne apna haal bheja: S1 0 · S2 2 · S3 0
    2.00 s  #9  → S3   (do sikke: S3, S1 · LB ko dikha: S1 0 · S2 2 · S3 0)   asal mein ab: S1 0 · S2 2 · S3 1
    2.25 s  #10 → S3   (do sikke: S3, S1 · LB ko dikha: S1 0 · S2 2 · S3 0)   asal mein ab: S1 0 · S2 2 · S3 2
    2.50 s  #11 → S1   (do sikke: S1, S2 · LB ko dikha: S1 0 · S2 2 · S3 0)   asal mein ab: S1 1 · S2 1 · S3 2
    2.75 s  #12 → S3   (do sikke: S3, S1 · LB ko dikha: S1 0 · S2 2 · S3 0)   asal mein ab: S1 1 · S2 1 · S3 2
    3.00 s  📋 servers ne apna haal bheja: S1 1 · S2 1 · S3 2
    3.00 s  #13 → S2   (do sikke: S3, S2 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 2
    3.25 s  #14 → S2   (do sikke: S2, S3 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 0 · S2 2 · S3 1
    3.50 s  #15 → S2   (do sikke: S3, S2 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 0 · S2 3 · S3 1
    3.75 s  #16 → S1   (do sikke: S3, S1 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 1
    4.00 s  📋 servers ne apna haal bheja: S1 1 · S2 2 · S3 0
    4.00 s  #17 → S1   (do sikke: S1, S2 · LB ko dikha: S1 1 · S2 2 · S3 0)   asal mein ab: S1 2 · S2 2 · S3 0
    4.25 s  #18 → S1   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 2 · S3 0)   asal mein ab: S1 3 · S2 1 · S3 0
    4.50 s  #19 → S3   (do sikke: S1, S3 · LB ko dikha: S1 1 · S2 2 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 1
    4.75 s  #20 → S3   (do sikke: S2, S3 · LB ko dikha: S1 1 · S2 2 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 2
    5.00 s  📋 servers ne apna haal bheja: S1 1 · S2 0 · S3 2
    5.00 s  #21 → S1   (do sikke: S3, S1 · LB ko dikha: S1 1 · S2 0 · S3 2)   asal mein ab: S1 2 · S2 0 · S3 2
    5.25 s  #22 → S2   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 0 · S3 2)   asal mein ab: S1 2 · S2 1 · S3 1
    5.50 s  #23 → S1   (do sikke: S1, S3 · LB ko dikha: S1 1 · S2 0 · S3 2)   asal mein ab: S1 3 · S2 1 · S3 1
    5.75 s  #24 → S2   (do sikke: S1, S2 · LB ko dikha: S1 1 · S2 0 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 0
    6.00 s  📋 servers ne apna haal bheja: S1 2 · S2 1 · S3 0
    7.00 s  📋 servers ne apna haal bheja: S1 0 · S2 0 · S3 0
   nateeja → requests: S1 7 · S2 9 · S3 8 · ek request ka ausat samay 0.89 s · sabse lamba 1.35 s (#15, S2) · sabse lambi line 2

=== sabse kam load wala · LB ki apni taaza ginti ===
    0.00 s  #1  → S3   (LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 1
    0.25 s  #2  → S2   (LB ko dikha: S1 2 · S2 1 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 1
    0.50 s  #3  → S3   (LB ko dikha: S1 2 · S2 2 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 2
    0.75 s  #4  → S3   (LB ko dikha: S1 1 · S2 1 · S3 1)   asal mein ab: S1 1 · S2 1 · S3 2
    1.00 s  #5  → S2   (LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 2
    1.25 s  #6  → S1   (LB ko dikha: S1 0 · S2 1 · S3 1)   asal mein ab: S1 1 · S2 1 · S3 1
    1.50 s  #7  → S2   (LB ko dikha: S1 1 · S2 1 · S3 1)   asal mein ab: S1 1 · S2 2 · S3 1
    1.75 s  #8  → S1   (LB ko dikha: S1 1 · S2 2 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 1
    2.00 s  #9  → S3   (LB ko dikha: S1 1 · S2 1 · S3 0)   asal mein ab: S1 1 · S2 1 · S3 1
    2.25 s  #10 → S3   (LB ko dikha: S1 1 · S2 1 · S3 1)   asal mein ab: S1 1 · S2 1 · S3 2
    2.50 s  #11 → S1   (LB ko dikha: S1 0 · S2 0 · S3 2)   asal mein ab: S1 1 · S2 0 · S3 2
    2.75 s  #12 → S2   (LB ko dikha: S1 1 · S2 0 · S3 1)   asal mein ab: S1 1 · S2 1 · S3 1
    3.00 s  #13 → S3   (LB ko dikha: S1 1 · S2 1 · S3 1)   asal mein ab: S1 1 · S2 1 · S3 2
    3.25 s  #14 → S1   (LB ko dikha: S1 0 · S2 1 · S3 1)   asal mein ab: S1 1 · S2 1 · S3 1
    3.50 s  #15 → S2   (LB ko dikha: S1 1 · S2 0 · S3 1)   asal mein ab: S1 1 · S2 1 · S3 1
    3.75 s  #16 → S2   (LB ko dikha: S1 1 · S2 1 · S3 1)   asal mein ab: S1 1 · S2 2 · S3 1
    4.00 s  #17 → S1   (LB ko dikha: S1 0 · S2 2 · S3 0)   asal mein ab: S1 1 · S2 2 · S3 0
    4.25 s  #18 → S3   (LB ko dikha: S1 1 · S2 1 · S3 0)   asal mein ab: S1 1 · S2 1 · S3 1
    4.50 s  #19 → S1   (LB ko dikha: S1 1 · S2 1 · S3 1)   asal mein ab: S1 2 · S2 1 · S3 1
    4.75 s  #20 → S2   (LB ko dikha: S1 1 · S2 0 · S3 1)   asal mein ab: S1 1 · S2 1 · S3 1
    5.00 s  #21 → S3   (LB ko dikha: S1 1 · S2 1 · S3 0)   asal mein ab: S1 1 · S2 1 · S3 1
    5.25 s  #22 → S1   (LB ko dikha: S1 0 · S2 1 · S3 1)   asal mein ab: S1 1 · S2 1 · S3 1
    5.50 s  #23 → S2   (LB ko dikha: S1 1 · S2 0 · S3 1)   asal mein ab: S1 1 · S2 1 · S3 1
    5.75 s  #24 → S3   (LB ko dikha: S1 1 · S2 1 · S3 0)   asal mein ab: S1 1 · S2 1 · S3 1
   nateeja → requests: S1 7 · S2 8 · S3 9 · ek request ka ausat samay 0.70 s · sabse lamba 1.05 s (#4, S3) · sabse lambi line 1

=== baari-baari (round robin) · koi jaankari nahi · S3 teen guna dheema ===
    0.00 s  #1  → S1   (baari)   asal mein ab: S1 3 · S2 1 · S3 0
    0.25 s  #2  → S2   (baari)   asal mein ab: S1 3 · S2 2 · S3 0
    0.50 s  #3  → S3   (baari)   asal mein ab: S1 3 · S2 2 · S3 1
    0.75 s  #4  → S1   (baari)   asal mein ab: S1 3 · S2 1 · S3 1
    1.00 s  #5  → S2   (baari)   asal mein ab: S1 3 · S2 2 · S3 1
    1.25 s  #6  → S3   (baari)   asal mein ab: S1 2 · S2 1 · S3 2
    1.50 s  #7  → S1   (baari)   asal mein ab: S1 3 · S2 1 · S3 2
    1.75 s  #8  → S2   (baari)   asal mein ab: S1 3 · S2 2 · S3 2
    2.00 s  #9  → S3   (baari)   asal mein ab: S1 2 · S2 1 · S3 3
    2.25 s  #10 → S1   (baari)   asal mein ab: S1 3 · S2 1 · S3 3
    2.50 s  #11 → S2   (baari)   asal mein ab: S1 2 · S2 1 · S3 2
    2.75 s  #12 → S3   (baari)   asal mein ab: S1 2 · S2 1 · S3 3
    3.00 s  #13 → S1   (baari)   asal mein ab: S1 2 · S2 1 · S3 3
    3.25 s  #14 → S2   (baari)   asal mein ab: S1 2 · S2 1 · S3 3
    3.50 s  #15 → S3   (baari)   asal mein ab: S1 2 · S2 1 · S3 4
    3.75 s  #16 → S1   (baari)   asal mein ab: S1 2 · S2 1 · S3 4
    4.00 s  #17 → S2   (baari)   asal mein ab: S1 2 · S2 1 · S3 4
    4.25 s  #18 → S3   (baari)   asal mein ab: S1 1 · S2 1 · S3 4
    4.50 s  #19 → S1   (baari)   asal mein ab: S1 2 · S2 1 · S3 4
    4.75 s  #20 → S2   (baari)   asal mein ab: S1 2 · S2 1 · S3 4
    5.00 s  #21 → S3   (baari)   asal mein ab: S1 1 · S2 1 · S3 5
    5.25 s  #22 → S1   (baari)   asal mein ab: S1 2 · S2 1 · S3 5
    5.50 s  #23 → S2   (baari)   asal mein ab: S1 1 · S2 1 · S3 5
    5.75 s  #24 → S3   (baari)   asal mein ab: S1 1 · S2 1 · S3 6
   nateeja → requests: S1 8 · S2 8 · S3 8 · ek request ka ausat samay 1.46 s · sabse lamba 4.95 s (#12, S3) · sabse lambi line 5 · 8.00 s par adhoori requests: 4

=== sabse kam load wala · LB ki apni taaza ginti · S3 teen guna dheema ===
    0.00 s  #1  → S3   (LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 1
    0.25 s  #2  → S2   (LB ko dikha: S1 2 · S2 1 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 1
    0.50 s  #3  → S3   (LB ko dikha: S1 2 · S2 2 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 2
    0.75 s  #4  → S2   (LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 2
    1.00 s  #5  → S1   (LB ko dikha: S1 1 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    1.25 s  #6  → S1   (LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 1 · S3 2
    1.50 s  #7  → S2   (LB ko dikha: S1 2 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    1.75 s  #8  → S1   (LB ko dikha: S1 2 · S2 2 · S3 2)   asal mein ab: S1 3 · S2 2 · S3 2
    2.00 s  #9  → S3   (LB ko dikha: S1 2 · S2 1 · S3 1)   asal mein ab: S1 2 · S2 1 · S3 2
    2.25 s  #10 → S2   (LB ko dikha: S1 2 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    2.50 s  #11 → S1   (LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 1 · S3 2
    2.75 s  #12 → S2   (LB ko dikha: S1 2 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    3.00 s  #13 → S2   (LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 2
    3.25 s  #14 → S1   (LB ko dikha: S1 1 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    3.50 s  #15 → S1   (LB ko dikha: S1 2 · S2 2 · S3 2)   asal mein ab: S1 3 · S2 2 · S3 2
    3.75 s  #16 → S2   (LB ko dikha: S1 2 · S2 1 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 1
    4.00 s  #17 → S3   (LB ko dikha: S1 2 · S2 2 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 2
    4.25 s  #18 → S2   (LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 2
    4.50 s  #19 → S1   (LB ko dikha: S1 1 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    4.75 s  #20 → S3   (LB ko dikha: S1 2 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 3
    5.00 s  #21 → S1   (LB ko dikha: S1 1 · S2 1 · S3 3)   asal mein ab: S1 2 · S2 1 · S3 3
    5.25 s  #22 → S2   (LB ko dikha: S1 2 · S2 1 · S3 3)   asal mein ab: S1 2 · S2 2 · S3 3
    5.50 s  #23 → S1   (LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 1 · S3 2
    5.75 s  #24 → S2   (LB ko dikha: S1 2 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
   nateeja → requests: S1 9 · S2 10 · S3 5 · ek request ka ausat samay 1.33 s · sabse lamba 3.40 s (#9, S3) · sabse lambi line 2 · 8.00 s par adhoori requests: 1

=== do mein se behtar · LB ki apni taaza ginti · S3 teen guna dheema ===
    0.00 s  #1  → S3   (do sikke: S1, S3 · LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 1
    0.25 s  #2  → S3   (do sikke: S3, S2 · LB ko dikha: S1 2 · S2 1 · S3 1)   asal mein ab: S1 2 · S2 1 · S3 2
    0.50 s  #3  → S2   (do sikke: S2, S1 · LB ko dikha: S1 2 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    0.75 s  #4  → S2   (do sikke: S2, S3 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 2
    1.00 s  #5  → S1   (do sikke: S1, S3 · LB ko dikha: S1 1 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    1.25 s  #6  → S2   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 2
    1.50 s  #7  → S1   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    1.75 s  #8  → S2   (do sikke: S2, S1 · LB ko dikha: S1 2 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 3 · S3 2
    2.00 s  #9  → S3   (do sikke: S3, S1 · LB ko dikha: S1 1 · S2 2 · S3 1)   asal mein ab: S1 1 · S2 2 · S3 2
    2.25 s  #10 → S1   (do sikke: S3, S1 · LB ko dikha: S1 1 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    2.50 s  #11 → S1   (do sikke: S1, S2 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 1 · S3 2
    2.75 s  #12 → S3   (do sikke: S3, S1 · LB ko dikha: S1 2 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 1 · S3 3
    3.00 s  #13 → S2   (do sikke: S3, S2 · LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 1 · S2 1 · S3 3
    3.25 s  #14 → S2   (do sikke: S2, S3 · LB ko dikha: S1 1 · S2 1 · S3 3)   asal mein ab: S1 1 · S2 2 · S3 3
    3.50 s  #15 → S2   (do sikke: S3, S2 · LB ko dikha: S1 1 · S2 2 · S3 3)   asal mein ab: S1 1 · S2 3 · S3 3
    3.75 s  #16 → S1   (do sikke: S3, S1 · LB ko dikha: S1 0 · S2 2 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 2
    4.00 s  #17 → S1   (do sikke: S1, S2 · LB ko dikha: S1 1 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    4.25 s  #18 → S2   (do sikke: S2, S1 · LB ko dikha: S1 2 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    4.50 s  #19 → S1   (do sikke: S1, S3 · LB ko dikha: S1 1 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    4.75 s  #20 → S2   (do sikke: S2, S3 · LB ko dikha: S1 2 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 3 · S3 2
    5.00 s  #21 → S1   (do sikke: S3, S1 · LB ko dikha: S1 1 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
    5.25 s  #22 → S2   (do sikke: S2, S1 · LB ko dikha: S1 2 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 3 · S3 2
    5.50 s  #23 → S3   (do sikke: S1, S3 · LB ko dikha: S1 2 · S2 2 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 2
    5.75 s  #24 → S1   (do sikke: S1, S2 · LB ko dikha: S1 1 · S2 2 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 2
   nateeja → requests: S1 9 · S2 10 · S3 5 · ek request ka ausat samay 1.39 s · sabse lamba 4.45 s (#12, S3) · sabse lambi line 2 · 8.00 s par adhoori requests: 1
```

| Tareeka | Jaankari | Ausat samay | Sabse lamba | Kya dikha |
|---|---|---|---|---|
| Sabse kam load wala | servers se, 1 s purani | 1.13 s | 1.65 s | **jhund**: #1–#4 → S3, #5–#8 → S2, #9–#12 → S1 … |
| Baari-baari | — | 0.85 s | 1.80 s | #1 seedha S1 par, jahan pehle se 2 kaam the |
| Koi bhi ek | — | 1.17 s | 2.15 s | S1 ko 11, S3 ko 6 |
| Do mein se behtar | servers se, 1 s purani | 0.89 s | 1.35 s | wahi purani jaankari, par dher nahi |
| Sabse kam load wala | LB ki apni taaza ginti | **0.70 s** | **1.05 s** | niyam wahi jo sabse upar; sirf jaankari taaza |
| Baari-baari · S3 teen guna dheema | — | 1.46 s | 4.95 s | S3 ko barabar hissa (8); 8 s par 4 adhoori |
| Sabse kam load wala · S3 dheema | LB ki apni ginti | 1.33 s | 3.40 s | S3 ko sirf 5; 1 adhoori |
| Do mein se behtar · S3 dheema | LB ki apni ginti | 1.39 s | 4.45 s | S3 ko sirf 5; 1 adhoori |

👉 **Jhund**: jaankari purani ho aur sab usi par ek hi niyam lagaayein, toh sab ek hi server par pahunchte hain. Ginti barabar (8 · 8 · 8),
bojh nahi.

👉 **Do ilaaj**: jaankari taaza karo (LB ki apni ginti) — ya faisle mein random milao (do sikke). Do sikke purani jaankari par bhi kaam karte hain.

### mini.js — sabse chhota chalta program

```
$ node tools/mini.js
LB ko dikh raha hai:  S1 3 · S2 0 · S3 1   (yeh jaankari agli 12 requests tak nahi badlegi)

tareeka             agli 12 requests kahan gayi                       1,000 requests: S1 / S2 / S3
baari-baari         S1 S2 S3 S1 S2 S3 S1 S2 S3 S1 S2 S3   334 / 333 / 333
koi bhi ek          S1 S1 S3 S3 S2 S2 S2 S1 S2 S3 S1 S1   299 / 340 / 361
sabse kam load      S2 S2 S2 S2 S2 S2 S2 S2 S2 S2 S2 S2   0 / 1000 / 0
do mein se behtar   S2 S3 S2 S2 S2 S2 S3 S2 S2 S2 S2 S2   0 / 694 / 306

"Sabse kam load" ne saari requests ek hi server (S2) par bhej di — jab tak nayi jaankari na aaye.
"Do mein se behtar" ne S1 (sabse bhara) ko kabhi nahi chuna, aur baaki do mein baant diya.

LB ko dikh raha hai:  S1 0 · S2 0 · S3 0   (teeno barabar)
barabari mein hamesha pehla server:   1000 / 0 / 0
barabari mein sikka (lib/pick.js):    318 / 352 / 330
```

---

## ex1-algorithms — asli raftaar

**5 servers**, har ek mein 4 workers. 300 requests/second, 8 s. Pehle sab ek jaise; phir server 5 teen guna dheema (kharab disk, ya
shor karne wala padosi).

```
$ node tools/algos.js

=== 5 ek jaise backends · 300 req/s · 8 s ===
algorithm                                p50       p99      sabse lambi line   requests har backend (1…5)
round robin                                14 ms    204 ms          9           480 / 480 / 480 / 480 / 480
random                                     13 ms    204 ms         12           502 / 456 / 488 / 436 / 518
least connections (LB ki apni ginti)       13 ms    204 ms          0           416 / 466 / 482 / 473 / 563
resource-based (heartbeat 500 ms)         252 ms    629 ms         92           476 / 486 / 485 / 464 / 489
power of two choices (wahi 500 ms)         14 ms    246 ms         29           471 / 458 / 452 / 459 / 560
power of two choices (LB ki apni ginti)    13 ms    204 ms          1           490 / 502 / 475 / 436 / 497

=== backend 5 teen guna dheema · 300 req/s · 8 s ===
algorithm                                p50       p99      sabse lambi line   requests har backend (1…5)
round robin                                13 ms   3000 ms        113           480 / 480 / 480 / 480 / 480
random                                     14 ms   2865 ms        150           510 / 489 / 463 / 458 / 480
least connections (LB ki apni ginti)       13 ms    205 ms          1           529 / 572 / 511 / 575 / 213
resource-based (heartbeat 500 ms)         335 ms   2202 ms        123           485 / 485 / 612 / 480 / 338
power of two choices (wahi 500 ms)         14 ms    494 ms         25           552 / 514 / 539 / 509 / 286
power of two choices (LB ki apni ginti)    13 ms    602 ms          2           525 / 565 / 545 / 525 / 240
```

**"Sabse lambi line", teen run ka dayra:**

| Algorithm | Jaankari | Sab ek jaise | Server 5 dheema |
|---|---|---|---|
| round robin | — | 8–9 | 91–113 |
| random | — | 8–12 | 139–152 |
| least connections | LB ki apni ginti | 0 | 0–1 |
| resource-based | servers ka load average, 500 ms purana | **92–106** | 111–132 |
| power of two choices | wahi 500 ms purana | 29–32 | 22–39 |
| power of two choices | LB ki apni ginti | 0–1 | 1–2 |

👉 **Sab ek jaise**: round robin, random, least connections — teeno theek. **Resource-based** sabse bura: 500 ms tak sab requests ko wahi
"sabse khaali" server dikhta hai (~150 requests). Dhyaan do: resource-based ke "requests har backend" lagbhag barabar hain — har server ko barabar mila,
bas dher mein.

👉 **Ek server dheema**: round robin aur random dheeme server ko **barabar hissa** dete rehte hain (round robin: 480 requests) → round robin ki
line 91–113, sabse dheemi 1% requests 1.8–3.0 s. Least connections dheeme server ko khud kam bhejta hai (201–245 requests):
dheeme server ki requests der tak lauti nahi, toh LB ki ginti mein dheema server bhara dikhta hai.

👉 **Power of two choices**: wahi purani jaankari, par line 29–32 (resource-based: 92–106). Sabse bhara server kabhi nahi chuna jaata, aur sab
ek hi server par nahi pahunchte.

**p99 ke baare mein:** sab-ek-jaise wale scene mein p99 lagbhag 204 ms se neeche nahi ja sakta (10% requests khud 200 ms ki hain). Dheeme
server wale scene mein LB ki apni ginti wale dono tareekon ka p99 do hi jagah baithta hai — ~205 ms ya ~600 ms (teen run: least connections
205 · 205 · 602 ms · power of two choices 602 · 602 · 205 ms). Wajah: dheeme server ki bhaari requests 600 ms ki hain, aur yeh bhaari requests kul
requests ka ~1% hi hain — kabhi 1% ki lakeer ke andar, kabhi bahar. Isliye yahan "sabse lambi line" dekho, p99 nahi.

**Is lab mein kya badla (2026-10-10):** pehle "resource-based" servers ki poori sankhya wali ginti dekhta tha aur barabari mein hamesha pehla
server chunta tha — tab ek server ko 0 requests milti thi. "0 requests" wala nateeja aadha barabari todne ke tareeke se aa raha tha. Ab servers load
average bhejte hain (jaise asli CPU %), aur barabari sikke se toot-ti hai. Jhund ab bhi utna hi saaf hai (line 92–106), par har server ko
barabar milta hai.

### Asli load balancers mein (documentation se — is lab mein chalaye nahi gaye)

- **NGINX**: default weighted round-robin · `least_conn;` · `random;` · `random two least_conn;` (do random, phir un do mein kam connections wala).
- **Envoy**: "least request" barabar wazan par N random servers (default 2) mein se sabse kam chalti requests wala chunta hai (P2C);
  documentation ke mutabiq yeh herding se bachta hai.

---

## ⚠️ Aam galatfehmi

- **"Random sabse achha hai."** Random jhund nahi banata, par andha hai: dheeme server ke saath line 139–152.
- **"Sabse khaali ko bhejna sabse samajhdaar hai."** Tabhi, jab jaankari taaza ho. Purani jaankari par line 92–106 (round robin: 8–9).
- **"Round robin bojh barabar baant-ta hai."** Ginti barabar, bojh nahi (dheeme server ki line 91–113).
- **"Zyada servers dekh ke chuno."** Sab ko dekhna = jhund (mini.js: 0 / 1000 / 0). Do kaafi (0 / 694 / 306).

## Khud try karo

1. `tools/slowmo.js` mein `REPORT_EVERY` 1000 se 250 karo (har request se pehle taaza haal). `--mode stale` ka jhund bachta hai?
2. `lib/pick.js` ke `bestOfTwo` mein line 36 (`while (b === a) …`) hata do. `node tools/mini.js` mein "do mein se behtar" ke number kaise badle?
3. `services/lb.js` mein heartbeat 500 ms se 2000 ms karo. `resource-based` ki line kitni hui? `power of two choices (wahi …)` ki?
4. `tools/algos.js --scenario slow` mein server 5 ko 3 ki jagah 10 guna dheema karo. Kaunsa algorithm sabse pehle toot-ta hai?
