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
npm test                       # 5 tests
docker compose --profile ex0-ladder up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.** Container mein disk aur fsync ke numbers alag honge (overlay filesystem).

## Lab ka daayra (kya asli, kya model)

- **ex0 asli:** har row is laptop par naapi gayi. L1–RAM: pointer chasing (Sattolo ring, har hop ek random 64-byte line).
  Disk: temp folder mein 256 MB file, `O_DIRECT` se 4 KB random reads (OS page cache ke bina). Run ke baad file delete.
  150 ms doosre region wali row **model** hai (video ka number).
- **ex1 model:** 1 lakh keys, Zipf popularity, asli LRU code (Map). Part B seedha hisaab.
- **ex2 asli:** child process sach mein file mein likhta aur `fsync` karta hai; parent use sach mein `SIGKILL` karta hai.
  Power loss ya kernel crash **nahi** kiya ja sakta — woh row `sysctl` padhkar bataayi gayi hai.
- **ex3 model:** event simulation, ek hot key; reader ka pause random. Koi asli cache server nahi.
- **ex4 A model:** 10 ms ticks, DB ki queue aur timeout. **ex4 B asli:** Bloom filter sach mein 10 lakh ids par bana aur naapa.

## ex0-ladder — memory ki seedhi, asli naap

```
$ npm start -- ex0-ladder
CPU: Intel(R) Core(TM) Ultra 7 255U — 3.26 GHz (/proc/cpuinfo), 1 cycle = 0.31 ns

A. Pointer chasing: har hop ek random 64-byte line se agla pata padhta hai (CPU andaza nahi laga sakta).

data ka size     ns / hop
16 KB               1.7
32 KB               1.6
256 KB              4.9
1 MB                6.7
4 MB               50.3
8 MB              192.2
64 MB             182.4
256 MB            227.2

B. Spatial locality: wahi 3.2 crore ints (128 MB), ek baar seedhe kram mein, ek baar random kram mein.
seedha kram: 1.08 ns / int     random kram: 15.60 ns / int     → 14× farq

C. Ladder, "1 cycle = 1 second" scale par (3.26 GHz). ASLI = is machine par naapa, MODEL = maana hua.

                                                  asli samay     cycles          agar 1 cycle = 1 s
ASLI   L1 (32 KB data)                                1.6 ns              5   5.1 second
ASLI   L2 (1 MB data)                                 6.7 ns             22   22 second
ASLI   L3 (4 MB data)                                50.3 ns            164   2.7 minute
ASLI   RAM (256 MB data, TLB miss samet)            227.2 ns            741   12 minute
ASLI   4 KB read, OS page cache se (RAM)            719.0 ns          2,347   39 minute
ASLI   4 KB random read, disk se (O_DIRECT)         203.2 µs       6,63,401   7.7 din
ASLI   write + fsync (disk tak pakka)                 4.7 ms    1,54,13,237   5.9 mahine
ASLI   TCP round trip, isi machine par (loopback)     8.3 µs         27,232   7.6 ghante
MODEL  round trip doosre region tak (video: 150 ms)   150.0 ms   48,95,99,550   16 saal
```

Teen runs (`captures/ex0-ladder-1..3.txt`) ki range:

| Seedhi ka paaydaan | Asli samay (3 runs) | "1 cycle = 1 s" par | Video ka number |
|---|---|---|---|
| L1 | 1.5–1.8 ns | ~5–6 second | 0.5 second |
| L2 | 5.9–7.0 ns | ~20 second | 7 second |
| L3 | 19–50 ns | 1–3 minute | 25 second |
| RAM | 220–290 ns | 12–16 minute | 2 minute |
| Disk (SSD) 4 KB random read | 140–200 µs | 5–8 din | 4.5 ghante |
| write + fsync | 1.2–4.7 ms | 1.5–6 mahine | — (spinning disk: 2–5 mahine) |
| Loopback TCP | 8–10 µs | ~8 ghante | — |
| Doosra region 150 ms (model) | — | 16 saal | 2.5 saal |

- **Seedhi sach hai.** L1 se disk read tak lagbhag 1 lakh guna, L1 se doosre region tak ~9 crore guna.
- **Video ka scale label galat hai.** Video "1 cycle = 1 s" kehta hai, par uske numbers asal mein "1 ns = 1 s" wale hain
  (L1 0.5 ns → 0.5 s, RAM ~100 ns → 2 min, SSD ~16 µs → 4.5 ghante). Ek cycle 0.31 ns hai, isliye "1 cycle = 1 s" par
  sab ~3× lambe: L1 ~5 s, RAM ~12 min.
- **150 ms wali row dono scale par galat:** "1 ns = 1 s" par ~4.8 saal, "1 cycle = 1 s" par ~16 saal. Video 2.5 saal kehta hai.
- **Disk ka number disk par tika hai.** Video ka 16 µs ek tez NVMe SSD ka hai. Is laptop ki WSL virtual disk par 140–200 µs.
- **Cache ke kinaare dikhte hain:** 32 KB tak ~1.6 ns (L1), 1 MB tak ~6 ns (L2), 8 MB ke baad RAM (~200 ns).
- **Seedha kram 14–27× tez:** ek 64-byte line 16 ints laati hai aur CPU agli lines pehle mangwa leta hai (prefetch).
  Yahi spatial locality hai.
- **Disk ke numbers har run mein hilte hain** (WSL ki virtual disk). Pattern wahi: disk RAM se hazaar guna dheemi, fsync aur dheema.

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

- **"90/10" kanoon nahi.** Skew data par tika hai. s = 0.99 par top 10% ko 80%, s = 0.6 par 39%. Web caches par naapa
  gaya Zipf α ~0.64–0.83 tha (Breslau 1999). Apne logs se skew naapo.
- **Chhota cache bhi bahut pakad sakta hai** jab skew zyada ho: s = 1.2 par 0.1% keys ka cache 60% hits.
- **Miss hi load tay karta hai:** 95% se 99% hit rate = DB ka load 500 se 100 (5 guna kam). Isliye hit rate ke aakhri
  points ki keemat sabse zyada hai.

## ex2-writes — crash mein kaunsi "ho gaya" writes jaati hain

```
$ npm start -- ex2-writes
tareeka                                                       writes/sec   "ho gaya" bola   file mein   khoye
write-through: har write ka apna fsync, phir ack                    561              900         915        0
group commit: 256 pending writes, EK fsync, phir sabka ack       93,265         1,49,504    1,50,784        0
write-back: memory se ack, har 1 s flush + fsync                97,136*         1,56,000      98,000   58,000
write-back: memory se ack, har 100 ms flush + fsync             91,022*         1,46,000    1,45,000    1,000
OS page cache: write() karke ack, fsync kabhi nahi              98,381*         1,58,000    1,59,000        0

* write-back aur page cache ko 1,00,000 writes/sec diye gaye (memory se ack, isliye aur bhi le sakte the).
```

- **Write-through pakka par dheema:** har write ek fsync (~560–650/s is disk par, 3 runs). **Group commit** wahi pakkapan deta hai
  aur ~93k–142k/s karta hai, kyunki ek fsync sau writes mein bant jaata hai. Har write ko phir bhi ek fsync jitna rukna padta hai.
- **Write-back:** memory se "ho gaya", baad mein flush. Flush se pehle process crash = acked writes gayi
  (1 s flush par ~55–58k, 100 ms flush par ~1k). Flush ka interval hi khoye hue data ki had hai.
- **OS page cache alag khatra hai:** process mara, par data kernel ke paas tha → 0 khoye. Bijli jaaye ya kernel crash ho
  toh nahi bachta. Is machine par `vm.dirty_expire_centisecs` = 3000 (30 s) aur flusher har 5 s jaagta hai.
  Video ka "Word file" example yahi hai: process crash aur power loss do alag sawal hain.
- `file mein` kabhi `"ho gaya"` se zyada: ack report 20 ms par jaati hai, kuch writes report se pehle likh chuki hoti hain.

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

B. MODEL, 1 ghanta, ek hot key: 1,000 reads/sec, write har ~5 s (Poisson). DB read 2 ms, write 3 ms.
   1% readers ko DB read ke baad 200 ms ka pause. "Lambi galti" = 5 ms se lamba stale window.

tareeka                       delete message khota   stale reads           lambi galtiyan   sabse lambi
sirf delete                   kabhi nahi                 164 (0.005%)          0         0.0 s
sirf delete                   1%                      66,041 (1.834%)         11         28.0 s
delete + TTL 30 s             kabhi nahi               5,559 (0.154%)          2         4.1 s
delete + TTL 30 s             1%                      30,235 (0.840%)         10         9.8 s
delete + lease + TTL 30 s     kabhi nahi                 142 (0.004%)          0         0.0 s
delete + lease + TTL 30 s     1%                      68,053 (1.890%)         12         13.9 s
```

- **Race:** reader ne purana v1 padha, writer ne v2 likh kar delete kiya, phir reader ne v1 cache mein daal diya. Delete
  pehle ho chuka tha, isliye v1 tab tak rehta hai jab tak agla write delete na kare.
- **TTL** galti ki umar baandhta hai (yahan 30 s). Race nahi rokta.
- **Lease** (Facebook memcache, NSDI 2013): miss par cache ek token deta hai, delete token radd karta hai, purane token wala
  set thukra diya jaata hai. Race ruk jaati hai.
- **Khoya hua delete** (network, crash) lease bhi nahi rok sakta: 1% delete khone par stale reads ~2% tak. Uska ilaaj TTL
  ya change-log se invalidation (lab 33, CDC).
- Model ek key ka hai aur seeded hai; ek seed ke numbers hain, pattern dekho.

## ex4-herd — cache gira toh DB kyun gira, aur na-maujood ids

```
$ npm start -- ex4-herd
A. MODEL (10 ms ticks): 10,000 reads/sec, 1,00,000 keys (Zipf s = 1.2), LRU cache 10,000 keys (~92% hits).
   DB: 1,000 reads/sec. User 1 s baad haar maanta hai, par DB woh kaam karta rehta hai. Queue > 3 s ka kaam → DB crash,
   30 s mein wapas. t = 30 s par cache server crash, khaali wapas aaya. 300 s dekha.

tareeka                                                DB crash   requests serve hui   bekaar DB kaam   wapas ≥85% hits
kuch nahi                                                  2        96.1%              3,213        67 s baad
kuch nahi, aur har DB restart par cache bhi khaali         9        80.1%              2,580        kabhi nahi
request coalescing (ek key = ek DB read)                   1        98.0%              5,669        39 s baad
DB ke aage limiter (queue bhari → turant "baad mein")      0        99.9%                  0        4 s baad
limiter + coalescing                                       0        99.9%                  0        4 s baad
warming: users ko roko, hot keys pehle bharo               0        96.3%                  0        13 s baad

B. ASLI Bloom filter: users 1 … 10,00,000 DB mein. Filter: 10 bits/key, 7 probes. Cache penetration = na-maujood ids.

Filter: 1.25 MB. 10 lakh na-maujood ids mein "shayad hai": 0.83% (theory 0.82%). Ek lookup ~28 ns.

DB tak kitni queries (10 lakh requests)        attack: har id nayi     bug: wahi 1,000 ids baar-baar
kuch nahi                                       10,00,000                10,00,000
negative cache ("nahi mila" 60 s)               10,00,000                    1,000
Bloom filter                                        8,149                    8,000
Bloom + negative cache                              8,149                        8

Naye 1,000 users signup (1 lakh requests): filter update nahi kiya → 99,100 asli requests galti se "nahi hai"; signup par add kiya → 0.
```

(Poora output, timeline samet: `captures/ex4-herd.txt`.)

- **Loop:** cache gaya → misses ~8% se lagbhag 100% → DB ki queue → 1 s se purane jawab bekaar (user ja chuka) → DB gira.
  DB band = cache bhar nahi sakta. Har restart par cache bhi khaali ho toh loop chalta hi rehta hai (video ka scenario).
- **Limiter (load shedding) asli dhaal:** queue bhari ho toh turant "baad mein". DB zinda, cache bharta rehta hai, 4 s mein wapas.
- **Coalescing akele kaafi nahi:** ek key ke saare misses ek DB read ban jaate hain, par alag-alag keys ke misses phir bhi bahut.
- **Warming:** crash ke baad users ko rokna padta hai (yahan 13 s). Planned restart (deploy) mein naya cache purane ke
  chalte-chalte bharo — wahan warming sabse sasta.
- **Penetration hamesha attack nahi:** app ka bug bhi wahi ids baar-baar maang sakta hai. Wahan negative cache kaafi.
  Har baar nayi id ho toh Bloom filter ~99% rokta hai; Bloom ke "shayad" wale DB tak jaate hain.
- **Bloom ko har insert par update karo:** warna naye users ko "nahi hai" milta hai (99,100 galat jawab). Delete support nahi
  (counting Bloom ya rebuild chahiye).

## Source ke daave aur sudhaar

| Video kehta hai | Sach / sudhaar | Kahan se |
|---|---|---|
| 1 cycle = 1 s par L1 0.5 s, RAM 2 min, SSD 4.5 ghante, 150 ms = 2.5 saal | Seedhi (L1 se spinning disk ~7 orders of magnitude) sahi. Numbers asal mein "1 ns = 1 s" wale hain; "1 cycle = 1 s" par ~3× lambe (L1 ~5 s, RAM ~12 min). 150 ms dono scale par galat: ~4.8 ya ~16 saal | ex0 |
| 90% requests 10% data par | Kanoon nahi; skew par tika. Zipf 0.99 par 80%, web par α ~0.64–0.83 | ex1, Breslau 1999 |
| Redis LRU use karta hai | Default `maxmemory-policy` = `noeviction` (memory bhari toh writes par error). `allkeys-lru` chuno toh bhi LRU **approximate** (kuch keys sample karke) | Redis eviction docs |
| Write-through = kabhi stale nahi | DB write fail, do writers ki race, ya cache ko bypass karke DB likhne wala — tab bhi stale | ex3, Facebook memcache |
| Word file: likha hua memory mein, baad mein disk | Sahi; par page cache process crash sah leta hai, power loss nahi (Linux: 30 s dirty expire, 5 s flusher) | ex2, Linux `vm` sysctl docs |
| Query 2 s leti hai → bottleneck disk IO → Redis lagao | Pehle query plan dekho (index, sort): 2 s aksar missing index hai. Cache dheemi query chhupata hai; har miss phir bhi 2 s | Data track ka 🌳 B-tree level, perfsim `explain` |
| Cache penetration = attack | Bug bhi ho sakta hai; negative caching ka zikr nahi; Bloom ke false positives DB tak; Bloom insert par update | ex4 B |
| Thundering herd ka ilaaj: cache warming | Warming planned restart mein sabse sasta; achanak crash mein users ko rokna padta hai (13 s). DB ke aage limiter (load shedding) loop todta hai; coalescing akele kaafi nahi | ex4 A |
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
| `test/core.test.js` | 5 tests |
| `captures/` | Asli runs (ex0 aur ex2: 3-3 runs) + `test.txt` |

## Practice

1. ex1 mein cache 10% se 20% karo, s = 0.8 par. Hit rate kitna badha? Kya 2 guna cache = 2 guna hits?
2. ex2 mein write-back ka flush 10 ms karo. Kitni writes khoti hain, aur writes/sec par kya asar?
3. ex3 mein TTL 30 s se 5 s karo. Lambi galtiyan aur DB reads — dono par kya hota hai?
4. ex4 mein limiter ki queue 500 se 2,000 karo. DB phir bhi zinda rehta hai?
