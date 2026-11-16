# 🧪 Lab 60 — Caching: latency ki seedhi, skew, writes ka pakkapan, invalidation race, herd aur penetration

System Gurukul → 🧪 First Principles → Caching (Kyun · Kaise · Code · Kab).
Node 24+, koi package install nahi. Captures Node v24.18.0 par, WSL2 machine par (Intel Core Ultra 7 255U, 3.26 GHz). Koi port nahi.

Lab 33 (cache invalidation, CDC, stampede) aur lab 01 (Reddit hot cache) asli Redis jaisa server chalate hain. Lab 60 un
cheezon ko naapta hai jo video bolta hai par dikhata nahi: memory ki seedhi asli is laptop par, "90/10" kitna sach hai, crash
mein kaunsi writes jaati hain, delete ke baad bhi purana data kaise bachta hai, aur cache girne par DB kyun girta hai.

```bash
npm start -- ex0-ladder        # ASLI: L1 → L2 → L3 → RAM → page cache → disk → fsync → loopback; "1 cycle = 1 s" scale
npm start -- ex1-zipf          # MODEL (seeded): Zipf skew × LRU cache size; hit rate ka DB load par asar
npm start -- ex2-writes        # ASLI: child process ko SIGKILL — write-through, group commit, write-back, OS page cache
npm start -- ex3-invalidation  # MODEL (seeded): delete ki race, TTL, lease (Facebook memcache), khoya hua delete
npm start -- ex4-herd          # MODEL: cache crash → DB crash loop; coalescing, limiter, warming. ASLI: Bloom filter
npm test                       # 6 tests
docker compose --profile ex0-ladder up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.** Container mein disk aur fsync ke numbers alag honge (overlay filesystem).

## Lab ka daayra (kya asli, kya model)

- **ex0 asli:** har row is laptop par naapi gayi. L1–RAM: pointer chasing (Sattolo ring, har hop ek random 64-byte line).
  Disk: temp folder mein 256 MB file, `O_DIRECT` se 400 random 4 KB reads (399 alag blocks). Node buffer ki alignment aur WSL
  host/disk ki caching jaanchi nahi gayi, isliye row "is machine ka direct-I/O raasta" hai, pakka "physical SSD" nahi.
  Run ke baad file delete. 150 ms doosre region wali row **model** hai (video ka number).
- **ex1 model:** 1 lakh keys, Zipf popularity, asli LRU code (Map). Part B seedha hisaab.
- **ex2 asli, sirf process crash:** child process sach mein file mein likhta (poore bytes tak loop) aur `fsync` karta hai; naya file
  aur uska folder bhi `fsync`. Parent use sach mein `SIGKILL` karta hai. Power loss ya kernel crash **nahi** kiya gaya.
- **ex3 model:** event simulation, ek hot key; arrivals, writes, pause aur delete-loss ke alag random streams (har tareeke par same
  traffic). Lease ek saral model hai. Koi asli cache server nahi.
- **ex4 A model:** 10 ms ticks, DB ki queue, har user ki apni deadline. **ex4 B:** Bloom filter asli (10 lakh ids par bana aur naapa);
  DB queries aur negative cache ki ginti model hai (koi asli DB nahi).

## ex0-ladder — memory ki seedhi, asli naap

```
$ npm start -- ex0-ladder
A. Pointer chasing: har hop ek random 64-byte line se agla pata padhta hai (CPU andaza nahi laga sakta).

data ka size     ns / hop
16 KB               1.5
32 KB               1.4
256 KB              4.0
1 MB                5.2
4 MB               21.4
8 MB               94.3
64 MB             143.3
256 MB            161.6

B. Spatial locality: same 3.2 crore ints (128 MB), ek baar seedhe kram mein, ek baar random kram mein.
seedha kram: 0.95 ns / int     random kram: 10.89 ns / int     → 11× farq
Seedhe kram mein ek 64-byte line 16 ints laati hai aur CPU agli lines pehle se mangwa leta hai (prefetch).

C. Ladder, "1 cycle = 1 second" scale par (3.26 GHz). ASLI = is machine par naapa, MODEL = maana hua.

                                                  asli samay     cycles          agar 1 cycle = 1 s
ASLI   L1 (32 KB data)                                1.4 ns              5   4.6 second
ASLI   L2 (1 MB data)                                 5.2 ns             17   17 second
ASLI   L3 (4 MB data)                                21.4 ns             70   1.2 minute
ASLI   RAM (256 MB data, TLB miss samet)            161.6 ns            527   8.8 minute
ASLI   4 KB read, OS page cache se (RAM)            447.0 ns          1,459   24 minute
ASLI   4 KB random read, O_DIRECT (WSL path)        115.3 µs       3,76,257   4.4 din
ASLI   write + fsync (disk tak pakka)                 1.2 ms      39,79,070   1.5 mahine
ASLI   TCP round trip, isi machine par (loopback)     8.0 µs         26,213   7.3 ghante
MODEL  round trip doosre region tak (video: 150 ms)   150.0 ms   48,95,99,550   16 saal
```

Teen runs (`captures/ex0-ladder-1..3.txt`) ki range. Numbers machine ke power mode aur run ke saath badalte hain:

| Seedhi ka paaydaan | Asli samay (3 runs) | "1 cycle = 1 s" par | Video ka number |
|---|---|---|---|
| L1 | 1.2–1.4 ns | ~4–5 second | 0.5 second |
| L2 | 4.7–5.2 ns | 15–17 second | 7 second |
| L3 | 21–32 ns | 1.2–1.7 minute | 25 second |
| RAM | 157–162 ns | ~9 minute | 2 minute |
| 4 KB random read, O_DIRECT (WSL) | 102–115 µs | ~4 din | SSD: 4.5 ghante |
| write + fsync (128 bytes) | 1.1–1.2 ms | ~1.5 mahine | — (spinning disk: 2–5 mahine) |
| Loopback TCP | 7.6–8.0 µs | ~7 ghante | — |
| Doosra region 150 ms (model) | — | ~15.5 saal (tool "16 saal" dikhata hai) | 2.5 saal |

- **Seedhi sach hai.** L1 se disk read tak lagbhag 80 hazaar guna, L1 se doosre region tak ~10 crore guna.
- **Video ka scale apne andar mel nahi khaata.** "1 cycle = 1 s" par L1 0.5 s ka matlab aadha cycle — L1 hit kabhi ek cycle se tez
  nahi hota (is laptop par ~4–5 cycles). Video ke kai numbers "1 ns = 1 s" wali analogy jaise lagte hain — ye andaza hai,
  video apne asli ns numbers nahi batata. Is laptop ke naap alag hain: L1 ~4 s, RAM ~9 min.
- **150 ms wali row dono scale par galat:** "1 ns = 1 s" par ~4.8 saal, "1 cycle = 1 s" (3.26 GHz) par ~15.5 saal. Video 2.5 saal kehta hai.
- **Cache ke kinaare dikhte hain:** 32 KB tak ~1.4 ns (L1), 1 MB tak ~5 ns (L2), 8 MB ke baad RAM (~150 ns).
- **Seedha kram 11–12× tez:** ek 64-byte line 16 ints laati hai aur CPU agli lines pehle mangwa leta hai (prefetch).
  Is asar ka naam spatial locality hai.
- **Disk ke numbers har run mein hilte hain** (WSL ki virtual disk). Pattern same: disk RAM se hazaar guna dheemi, fsync aur dheema.

## ex1-zipf — "90% requests 10% data par" kitna sach

```
$ npm start -- ex1-zipf
A. MODEL: 1,00,000 keys, popularity Zipf (key k ka weight 1/k^s). LRU cache, 3 lakh requests warm-up, phir 10 lakh gine.

s             top 10% keys ki       LRU hit rate, cache = keys ka
              requests              0.1%      1%       10%
0 (barabar)     10.0%               0.1%     1.0%    10.0%
0.6             39.3%               0.8%     5.4%    25.3%
0.8             59.5%               6.8%    20.4%    46.9%
0.99            80.0%              27.5%    49.0%    72.4%
1.2             94.3%              60.6%    79.5%    91.7%

B. Hit rate ka hisaab: 10,000 reads/sec. Hit = 0.5 ms (cache). Miss = 0.5 ms + 10 ms (DB). (arithmetic)

hit rate    DB par reads/sec    ausat read
  80.0%          2000         2.50 ms
  90.0%          1000         1.50 ms
  95.0%           500         1.00 ms
  99.0%           100         0.60 ms
  99.9%            10         0.51 ms
```

- **"90/10" kanoon nahi.** Skew data par tika hai. s = 0.99 par top 10% ko 80%, s = 0.6 par 39%. Breslau 1999 ke chhe
  web proxy traces mein Zipf α ~0.64–0.83 tha (purane traces; har system ka alag). Apne logs se skew naapo.
- **Chhota cache bhi bahut pakad sakta hai** jab skew zyada ho: s = 1.2 par 0.1% keys ka cache 60% hits.
- **Miss hi load tay karta hai:** 95% se 99% hit rate = DB ka load 500 se 100 (5 guna kam). Isliye hit rate ke aakhri
  points ki keemat sabse zyada hai.

## ex2-writes — process crash mein kaunsi "ho gaya" writes jaati hain

```
$ npm start -- ex2-writes
tareeka                                                       writes/sec   "ho gaya" bola   file mein   khoye
write-through: har write ka apna fsync, phir ack                    811            1,300       1,302        0
group commit: 256 pending writes, EK fsync, phir sabka ack     1,76,260         2,82,368    2,83,904        0
write-back: memory se ack, har 1 s flush + fsync                98,504*         1,58,000      98,000   60,000
write-back: memory se ack, har 100 ms flush + fsync             99,127*         1,59,000    1,58,000    1,000
OS page cache: write() karke ack, fsync kabhi nahi              99,127*         1,59,000    1,60,000        0

* write-back aur page cache ko 1,00,000 writes/sec diye gaye (memory se ack, isliye aur bhi le sakte the).
```

- **Ye sirf process crash (SIGKILL) ka test hai.** Bijli ya kernel crash ka test nahi hua. Store poore bytes likhne tak loop karta hai,
  aur naya file aur uska folder `fsync` karta hai; recovery sirf poore 16-byte records ginti hai.
- **Write-through pakka par dheema:** har write ek fsync (~760–810/s is disk par, 3 runs). **Group commit** ek fsync ko sau writes mein
  baantta hai: ~1.71–1.86 lakh/s, crash par 0 khoye. Har write ko kam se kam ek fsync (~1 ms) rukna padta hai, batch banne ka intezaar alag.
- **Write-back:** memory se "ho gaya", baad mein flush. Flush se pehle process crash = acked writes gayi
  (1 s flush par ~60k, 100 ms flush par ~1k, teeno runs). Flush ka interval hi is test mein khoye data ki had hai.
- **OS page cache alag khatra hai:** process mara, par data kernel ke paas tha → 0 khoye. Bijli jaaye ya kernel crash ho toh bina
  fsync ka data ja sakta hai. Is machine par `vm.dirty_expire_centisecs` = 3000 (30 s) aur flusher har 5 s jaagta hai — ye writeback
  ki settings hain, khone ki pakki had nahi. Video ka "Word file" example ek misaal hai; asli app kab fsync karti hai, us par sab tika hai.
- `file mein` kabhi `"ho gaya"` se zyada: parent ko ack ki ginti har ~20 ms milti hai, kuch writes report se pehle likh chuki hoti hain.

## ex3-invalidation — delete ke baad bhi purana data

```
$ npm start -- ex3-invalidation
A. Script (ek hi race, haath se): DB = v1, cache khaali.
   t=1 ms   reader R: cache miss → DB se v1 padha → GC pause
   t=5 ms   writer W: DB = v2
   t=6 ms   writer W: cache delete (abhi cache mein kuch nahi)
   t=105 ms reader R jaaga: cache = v1  ← purana value, DB mein v2

tareeka                        1 s        10 s       1 min      10 min  baad reader ko kya mila
sirf delete (koi TTL nahi)   v1 ✗       v1 ✗       v1 ✗       v1 ✗      
delete + TTL 30 s            v1 ✗       v1 ✗       v2 ✓       v2 ✓      
delete + lease + TTL 30 s    v2 ✓       v2 ✓       v2 ✓       v2 ✓      

→ Bina TTL: purana v1 tab tak jab tak koi agla write delete na kare — price roz badalta hai toh poora din.
  TTL: purani value set hone ke 30 s baad mitti. Lease (Facebook memcache, NSDI 2013, saral model): miss par cache token
  deta hai; delete token radd karta hai; purane token wala set thukra diya jaata hai.

B. MODEL, 1 ghanta, ek hot key: 1,000 reads/sec, write har ~5 s (Poisson). DB read 2 ms, write 3 ms.
   1% readers ko DB read ke baad 200 ms ka pause. "Lambi galti" = 5 ms se lamba stale window.
   Har tareeke par same arrivals aur writes (alag random streams). Lease: token na mile toh reader 10 ms ruk kar dobara poochta hai.

tareeka                       delete message khota   stale cache hits      lambi galtiyan   sabse lambi
sirf delete                   kabhi nahi               1,334 (0.037%)          1         1.1 s
sirf delete                   1%                      50,807 (1.411%)          7         27.0 s
delete + TTL 30 s             kabhi nahi               1,683 (0.047%)          1         1.5 s
delete + TTL 30 s             1%                      46,121 (1.281%)          8         21.2 s
delete + lease + TTL 30 s     kabhi nahi                 150 (0.004%)          0         0.0 s
delete + lease + TTL 30 s     1%                      43,404 (1.205%)          6         21.2 s
```

- **Race:** reader ne purana v1 padha, writer ne v2 likh kar delete kiya, phir reader ne v1 cache mein daal diya. Delete
  pehle ho chuka tha, isliye v1 tab tak rehta hai jab tak agla write delete na kare.
- **TTL har entry ki umar hai, set hone ke waqt se** — DB badalne ke waqt se nahi. Race nahi rokta. Dheemi fill purani value der se set
  kare toh galti TTL se lambi bhi ho sakti hai (test: 30 s TTL, 60 s pause wali fill → ~60 s stale). Freshness ki guarantee ke liye
  version ya token jaanch chahiye. Data track ka cache-invalidation level bhi same baat kehta hai.
- **Lease** (Facebook memcache, NSDI 2013 §3.2.1; yahan saral model): miss par cache ek token deta hai, delete token radd karta hai,
  purane token wala set thukra diya jaata hai. Token na mile toh reader 10 ms ruk kar dobara poochta hai. Race ruk jaati hai.
- **Khoya hua delete** (network, crash) lease bhi nahi rok sakta: 1% delete khone par stale cache hits ~1.2–1.4%. Uska ilaaj TTL
  ya change-log se invalidation (lab 33, CDC).
- Har tareeke par same arrivals aur writes (alag random streams), isliye rows aapas mein comparable hain. Ek seed, ek key: pattern dekho.

## ex4-herd — cache gira toh DB kyun gira, aur na-maujood ids

```
$ npm start -- ex4-herd
A. MODEL (10 ms ticks): 10,000 reads/sec, 1,00,000 keys (Zipf s = 1.2), LRU cache 10,000 keys (~92% hits).
   DB: 1,000 reads/sec. Har user 1 s baad haar maanta hai (apni deadline), par DB queue ka kaam karta rehta hai. Queue > 3 s ka
   kaam → DB crash, 30 s mein wapas. t = 30 s par cache server crash, khaali wapas aaya. 300 s dekha. Har tareeke par same requests.
   "late fill" = timeout ke baad pahuncha DB jawab bhi cache bharta hai (jab handler cancel nahi hota); "phenka" = jawab bekaar.

tareeka                                                DB crash   requests serve hui   bekaar DB reads   wapas ≥85% hits
kuch nahi (late fill)                                      1        97.4%             14,491        48 s baad
kuch nahi (late jawab phenka)                              2        96.1%              3,213        67 s baad
kuch nahi + har DB restart par cache bhi khaali*           9        81.3%              2,707        kabhi nahi
request coalescing (late fill)                             0        99.7%              8,941        11 s baad
request coalescing (late jawab phenka)                     0        98.2%             46,917        51 s baad
DB ke aage limiter (queue bhari → turant "baad mein")      0        99.9%                  0        4 s baad
limiter + coalescing                                       0        99.9%                  0        4 s baad
warming: users ko mana, hot keys pehle bharo               0        96.3%                  0        13 s baad

* Video kehta hai cache cold rehta hai; "har restart par khaali" ek alag maana hua scenario hai. Warming: users 11.1 s tak mana.
"Bekaar DB reads" = DB ne padha, par us waqt koi user intezaar mein nahi tha.

B. ASLI Bloom filter: users 1 … 10,00,000 DB mein. Filter: 10 bits/key, 7 probes. Cache penetration = na-maujood ids.

Filter: 1.25 MB. 10 lakh na-maujood ids mein se "shayad hai": 0.83% (theory 0.82%). Ek lookup ~21 ns.

MODEL ginti (koi asli DB nahi; 1,000 requests/sec, 10 lakh requests = ~17 minute):
DB tak kitni queries                            attack: har id nayi     bug: same 1,000 ids baar-baar
kuch nahi                                       10,00,000                10,00,000
negative cache ("nahi mila" 60 s)               10,00,000                   17,000
Bloom filter                                        8,149                    8,000
Bloom + negative cache                              8,149                      136

Naye 1,000 users signup (1 lakh requests): filter update nahi kiya → 99,100 asli requests galti se "nahi hai"; signup par add kiya → 0.
Negative cache ka khatra: id X "nahi mila" cache hua, phir X ne signup kiya — create par negative entry na mitaayi toh 60 s tak "nahi hai".
```

(Poora output, timeline samet: `captures/ex4-herd.txt`.)

- **Loop:** cache gaya → misses ~8% se lagbhag 100% → DB ki queue → 1 s se purane users ja chuke → DB gira. DB band = cache
  bhar nahi sakta. Har restart par cache bhi khaali ho (ek alag maana hua scenario) toh loop chalta hi rehta hai.
- **Limiter (load shedding) sabse tez dhaal:** queue bhari ho toh turant "baad mein". DB zinda, cache bharta rehta hai, 4 s mein
  wapas — late jawab cache bhare ya na bhare. Limiter ki queue (500) crash ki had (3,000) se chhoti rakhi gayi hai, isliye 0 crash
  is model mein design se aata hai; asli system mein had naap kar rakho.
- **Coalescing bhi bahut madad karta hai** (hot keys ke dohraaye misses ek read): is model mein 0 crash. Par wapsi is par tiki hai ki
  timeout ke baad pahuncha DB jawab cache bharta hai ya phenka jaata hai (11 s vs 51 s).
- **Warming:** crash ke baad users ko mana karna padta hai (yahan 11.1 s; hit rate 13 s par wapas). Planned restart (deploy) mein
  naya cache purane ke chalte-chalte bharo — wahan warming sabse sasta.
- **Penetration hamesha attack nahi:** app ka bug bhi same ids baar-baar maang sakta hai. Wahan negative cache (60 s) har id ko har
  minute ek DB query tak laata hai (17,000 vs 10 lakh). Har baar nayi id ho toh Bloom filter ~99% rokta hai.
- **Bloom ke "shayad" ka matlab:** 10 lakh na-maujood ids mein se 0.83% ko "shayad hai" mila. Is traffic mein har "shayad" galat tha —
  isliye har "shayad" ko DB se jaancho. Jo id add hui, use kabhi "nahi" nahi milta.
- **Dono ko insert par update karo:** Bloom update na ho toh naye users ko "nahi hai" (99,100 galat jawab). Negative entry signup par
  na mitaayi toh naye user ko 60 s tak "nahi hai". Bloom delete support nahi karta (counting Bloom ya rebuild).

## Source ke daave aur sudhaar

| Video kehta hai | Sach / sudhaar | Kahan se |
|---|---|---|
| 1 cycle = 1 s par L1 0.5 s, RAM 2 min, SSD 4.5 ghante, 150 ms = 2.5 saal | Seedhi (L1 se spinning disk ~7 orders of magnitude) sahi. Scale apne andar mel nahi khaata: 1 cycle par L1 0.5 s = aadha cycle, jo mumkin nahi; kai numbers "1 ns = 1 s" analogy jaise lagte hain (andaza). Laptop par: L1 ~4 s, RAM ~9 min. 150 ms: ~4.8 saal (1 ns scale) ya ~15.5 saal (1 cycle) | ex0 |
| 90% requests 10% data par | Kanoon nahi; skew par tika. Zipf 0.99 par 80%; Breslau 1999 ke chhe proxy traces mein α 0.64–0.83 | ex1, Breslau 1999 |
| Cache-aside: Redis gire toh app DB se chalti rahegi | Tabhi jab DB poora bojh utha sake, ya aage limiter ho. Warna DB bhi girta hai | ex4 A |
| Eviction (LRU/LFU) invalidation ke tools mein | Eviction jagah banata hai, freshness nahi deta. Purani value LRU mein bhi rehti hai jab tak TTL ya delete na ho | Data track ka eviction level |
| Redis LRU use karta hai | Memory limit par default `maxmemory-policy` = `noeviction` (writes par error). `allkeys-lru` chuno toh bhi LRU **approximate** (sample karke) | Redis eviction docs, redis.conf |
| Write-through = kabhi stale nahi | DB write fail, do writers ki race, ya cache ko bypass karke DB likhne wala — tab bhi stale | ex3, Facebook memcache |
| TTL = stale data ki max umar | TTL entry ki umar hai, set hone se. Dheemi fill ke saath galti TTL se lambi ho sakti hai | ex3 |
| Word file: likha hua memory mein, baad mein disk | Misaal theek, par app ka asli fsync behaviour alag ho sakta hai. Page cache process crash sah leta hai, bijli/kernel crash nahi; Linux ki 30 s / 5 s settings khone ki had nahi | ex2, Linux `vm` sysctl docs |
| Query 2 s leti hai → bottleneck disk IO → Redis lagao | Pehle query plan aur waits naapo (index, sort, locks). Cache dheemi query chhupata hai; har miss phir bhi 2 s | Data track ka 🌳 B-tree level, perfsim `explain` |
| Cache penetration = attack | Bug bhi ho sakta hai; negative caching ka zikr nahi; Bloom ke "shayad" DB se jaancho; Bloom aur negative cache dono insert par update | ex4 B |
| Thundering herd ka ilaaj: cache warming | Warming planned restart mein sabse sasta; achanak crash mein users ko mana karna padta hai (11 s). Limiter loop todta hai (4 s); coalescing bhi madad karta hai | ex4 A |
| "Phil Carlton" ka quote | Phil **Karlton** (Netscape): "There are only two hard things…" | Martin Fowler, TwoHardThings |
| Netflix Open Connect, Postgres `shared_buffers`, InnoDB buffer pool | Sahi | Netflix, Postgres, MySQL docs |

## Sources

- Breslau, Cao, Fan, Phillips, Shenker, *Web Caching and Zipf-like Distributions: Evidence and Implications* (INFOCOM 1999) — https://pages.cs.wisc.edu/~cao/papers/zipf-implications.html
- Nishtala et al., *Scaling Memcache at Facebook* (NSDI 2013) — https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala
- Redis, *Key eviction* — https://redis.io/docs/latest/develop/reference/eviction/
- Linux kernel, *Documentation for /proc/sys/vm* (dirty_expire_centisecs, dirty_writeback_centisecs) — https://docs.kernel.org/admin-guide/sysctl/vm.html
- Martin Fowler, *TwoHardThings* — https://martinfowler.com/bliki/TwoHardThings.html

## Files

| File | Kya |
|---|---|
| `lib/ladder.js` | Sattolo ring, pointer chasing, seedha vs random sweep |
| `lib/human.js` | ns → "1 cycle = 1 s" scale |
| `lib/zipf.js`, `lib/lru.js`, `lib/amat.js` | Zipf sampler, Map wala LRU, hit rate ka hisaab |
| `lib/store-child.js`, `lib/writes.js` | ex2 ka store (child) aur SIGKILL karne wala parent |
| `lib/heap.js`, `lib/invalidation.js` | Event queue; ex3 race model (delete, TTL, lease) |
| `lib/herd.js` | ex4 A cache crash / DB queue model |
| `lib/bloom.js`, `lib/penetration.js` | Bloom filter (double hashing); ex4 B scenarios |
| `tools/*.js` | Har exercise ka tool |
| `test/core.test.js` | 6 tests |
| `captures/` | Asli runs (ex0 aur ex2: 3-3 runs) + `test.txt` |

## Practice

1. ex1 mein cache 10% se 20% karo, s = 0.8 par. Hit rate kitna badha? Kya 2 guna cache = 2 guna hits?
2. ex2 mein write-back ka flush 10 ms karo. Kitni writes khoti hain, aur writes/sec par kya asar?
3. ex3 mein TTL 30 s se 5 s karo. Lambi galtiyan aur DB reads — dono par kya hota hai?
4. ex4 mein limiter ki queue 500 se 2,000 karo. DB phir bhi zinda rehta hai?
