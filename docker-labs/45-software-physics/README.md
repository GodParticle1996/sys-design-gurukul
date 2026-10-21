# 🧪 Lab 45 — Physics of Software

KhanaKart ka menu memory mein hai. Phir bhi ek-ek remote lookup ka wait judta hai.
Pehle call gino; phir data ka raasta aur kaam ka size badlo.

Node 18+; zero dependencies, `npm install` ki zaroorat nahi. Captures Node v24.18.0 par liye gaye.
Docker is machine par available nahi: Dockerfile/compose diye hain, **compose chalaya nahi gaya**.

## Chalao

```bash
cd docker-labs/45-software-physics
node tools/slowmo.js --fast
node tools/slowmo.js --batch --fast
node tools/compare.js
node tools/math.js
node tools/queue-slowmo.js
node tools/queue.js
node tools/mini.js
node tools/io.js
node test/core.test.js
```

`compare.js` apna cache child process ephemeral port par shuru karta hai aur sirf usi child ko band karta hai.
Koi pehle se service nahi chahiye. Wahi 12 items, output order, HTTP requests, peak active requests aur errors check hote hain.
`--url` dene par us URL ka lab cache use hota hai; tool us external service ko band nahi karta.

Manually server chalaane ke liye:

```bash
npm start ex1-http
# Doosre terminal mein, isi lab folder se:
node tools/compare.js --url http://127.0.0.1:5500
# Server wale terminal mein Ctrl+C.
```

Docker ka equivalent (untested):

```bash
docker compose --profile ex1-http up --build
# Host ke doosre terminal se:
node tools/compare.js --url http://127.0.0.1:5500
# Cleanup:
docker compose --profile ex1-http down
```

## Exercises aur sach ki boundary

| Exercise | Kya chalta hai | Kya conclude kar sakte ho |
|---|---|---|
| `ex0-slowmo` | `npm start ex0-slowmo -- --fast` / `node tools/slowmo.js --batch --fast` | MODEL: 4 keys, fixed 40 ms per request; wahi sequential/batched library |
| `ex1-http` | actual Node HTTP cache, in-memory Map, 40 ms artificial wait per request | Yeh loopback + timer experiment hai; WAN RTT, Redis ya production benchmark nahi |
| `ex2-math` | `npm start ex2-math` | HISAAB: ideal link, chosen CPU frequency and invented cost units; hardware/cloud prices nahi |
| `ex3-queue` | `npm start ex3-queue`; `node tools/queue-slowmo.js` | MODEL: finite FIFO schedule and exact residence-time accounting; load test nahi |
| `ex4-io` | `npm start ex4-io` | Actual file reads, deliberately warm OS page cache; SSD/HDD hardware timing nahi |

## ex0-slowmo — ek wait baar-baar, ya ek batch?

Clock virtual hai. 40 ms lab ka fixed input hai. Default animation wall clock par thoda rukti hai; `--fast` mein nahi.
`--json` se wahi trace milti hai. Dono functions `lib/lookups.js` se actual HTTP tool aur slow motion mein shared hain.

```text
0 ms | MODEL: har request ka fixed wait 40 ms; sequential | calls=0 ready=0/4
0 ms | bheje: dish-1 | calls=1 ready=0/4
40 ms | mile: dish-1 | calls=1 ready=1/4
40 ms | bheje: dish-2 | calls=2 ready=1/4
80 ms | mile: dish-2 | calls=2 ready=2/4
80 ms | bheje: dish-3 | calls=3 ready=2/4
120 ms | mile: dish-3 | calls=3 ready=3/4
120 ms | bheje: dish-4 | calls=4 ready=3/4
160 ms | mile: dish-4 | calls=4 ready=4/4
160 ms | Asha ka menu tayyar | calls=4 ready=4/4
```

```text
0 ms | MODEL: har request ka fixed wait 40 ms; batch | calls=0 ready=0/4
0 ms | bheje: dish-1, dish-2, dish-3, dish-4 | calls=1 ready=0/4
40 ms | mile: dish-1, dish-2, dish-3, dish-4 | calls=1 ready=4/4
40 ms | Asha ka menu tayyar | calls=1 ready=4/4
```

## ex1-http — teen actual runs

Har request par server **artificial 40 ms timer** wait karta hai, phir Map se items padhta hai.
Batch mein 4 keys/request, parallel mein max 2 requests; sabhi 12 items aur same order lautate hain.
Small JSON payload; bandwidth saturation, real distance, CPU load, production Redis aur cache invalidation test nahi hote.
Elapsed poore menu ka client wall time hai; item latency/p99 ya CPU time nahi.
Warmup lookup timing/counters se bahar hai. Metadata/reset/stat requests bhi reported lookup calls mein nahi hain.

Run 1 (raw `captures/http-1.txt`):

```text
ASLI HTTP; server par artificial wait 40 ms/request; 12 items
sequential: calls=12 items=12 peak=1 elapsed=518.0 ms
batch4: calls=3 items=12 peak=1 elapsed=129.0 ms
parallel2: calls=12 items=12 peak=2 elapsed=255.6 ms
```

Run 2 (raw `captures/http-2.txt`):

```text
ASLI HTTP; server par artificial wait 40 ms/request; 12 items
sequential: calls=12 items=12 peak=1 elapsed=519.7 ms
batch4: calls=3 items=12 peak=1 elapsed=127.1 ms
parallel2: calls=12 items=12 peak=2 elapsed=256.2 ms
```

Run 3 (raw `captures/http-3.txt`):

```text
ASLI HTTP; server par artificial wait 40 ms/request; 12 items
sequential: calls=12 items=12 peak=1 elapsed=513.9 ms
batch4: calls=3 items=12 peak=1 elapsed=126.5 ms
parallel2: calls=12 items=12 peak=2 elapsed=254.2 ms
```


Parallel overlap wait ko ghataata hai; calls ki ginti 12 hi rehti hai. Batch calls ko 3 karta hai.
Unlimited parallel requests nahi bhejte. Real dependency ki capacity, batch limits, error policy aur data dependencies check karo.
Fail hone par helpers reject karte hain; doosre workers baaki keys bhi le sakte hain. Parallel helper mein I/O cancellation ya fail-fast stop nahi hai.
Multi-key batch atomic snapshot ki guarantee nahi deta. Isi demo ke fixed Map mein data change nahi hota.

## ex2-math — units, payload aur cost ka hisaab

`fixed wait + bytes × 8 / bits-per-second` ek simplified completion model hai.
Fixed component yahan chosen 40 ms hai; real path mein propagation, handshakes, processing aur queue alag measure karte hain.
More bandwidth serialization/queue delays ghataa sakti hai; propagation distance apne aap nahi ghat-ti.
3 GHz aur 100 ns / 150 ms **maane hue scenario inputs** hain. CPU frequency measure nahi ki gayi.
CPU wait ka human-scale analogy `await` ko poora processor blocked rehna nahi banata.
Cost units kalpanik hain, currency nahi. Origin ki 100 GiB copy dono cases mein rehti hai; cache extra copy hai.

```text
HISAAB: decimal bytes; fixed wait 40 ms; ideal link; no overhead/queue
1000 B @ 100 Mbps: 40.080 ms
1000 B @ 1000 Mbps: 40.008 ms
1000000 B @ 100 Mbps: 120.000 ms
1000000 B @ 1000 Mbps: 48.000 ms
HISAAB: maana 3 GHz; 1 cycle ko 1 human second; 365-day year
1 cycle = 0.333 ns
100 ns = 300 human seconds
150 ms = 14.27 human years
YEH scenario inputs hain; hardware timings measure nahi kiye.
HISAAB: kalpanik cost units/GiB: origin=1, cache=20; AWS price NAHI
origin 100 GiB + sabka cache: 2100 units
origin 100 GiB + hot 5 GiB cache: 200 units
```

Cloud ka final cost RAM/SSD ratio se tay nahi: instance bundling, replica, request, transfer, backup aur minimum retention bhi dekhna padega.
Koi current AWS price ya dollar saving ka daava nahi.

## ex3-queue — pehle request ki poori zindagi, phir averages

Ek worker, 100 ms actual kaam **model ka input**. Arrival timestamps 0/50/100/150 ms.
`wait` = start − arrival. `total` = departure − arrival = waiting + service.
Queue+worker ko ek boundary maano. Model empty se shuru hota hai aur 400 ms par empty hota hai.
Isliye finite-window area identity yahan exact hai. General Little's Law suitable stable/long-run averages par use karo.
`lambda` is poore window ka completed flow rate hai; sirf shuru ki 150 ms burst ka offered rate nahi.

```text
MODEL: same queue.js schedule; equal clock par end, arrival, start
0 ms #1 aaya: wait=[1] active=[] done=0 inside=1
0 ms #1 shuru: wait=[] active=[1] done=0 inside=1
50 ms #2 aaya: wait=[2] active=[1] done=0 inside=2
100 ms #1 poora: wait=[2] active=[] done=1 inside=1
100 ms #3 aaya: wait=[2,3] active=[] done=1 inside=2
100 ms #2 shuru: wait=[3] active=[2] done=1 inside=2
150 ms #4 aaya: wait=[3,4] active=[2] done=1 inside=3
200 ms #2 poora: wait=[3,4] active=[] done=2 inside=2
200 ms #3 shuru: wait=[4] active=[3] done=2 inside=2
300 ms #3 poora: wait=[4] active=[] done=3 inside=1
300 ms #4 shuru: wait=[] active=[4] done=3 inside=1
400 ms #4 poora: wait=[] active=[] done=4 inside=0
poore window ka average=1.75; peak=3; dono alag
```

```text
MODEL: arrivals 0,50,100,150 ms; 1 worker; work 100 ms
#1: aaya=0 start=0 end=100 wait=0 total=100 ms
#2: aaya=50 start=100 end=200 wait=50 total=150 ms
#3: aaya=100 start=200 end=300 wait=100 total=200 ms
#4: aaya=150 start=300 end=400 wait=150 total=250 ms
poora window=400 ms; area=700 request-ms; peak=3
hisaab: lambda=10.00/s W=175.00 ms L=1.75
check: 1.75 = 1.75 (averages; har pal ki ginti nahi)
```

1.75 **time-average** inside hai; peak 3. Har pal 1.75 request nahi hoti.
W=175 ms mean end-to-end residence hai, p99 nahi aur sirf 100 ms service nahi.
Queue ka cap badhaane se worker ka 100 ms kaam tez nahi hota. Acceptance, rejection aur completions alag gino.
`lib/queue.js` simulation hai; actual worker service par measured capacity ka daava nahi.

## Chhota wiring example

```text
batch2: 1,2,3,4,5 calls=3
parallel2: 1,2,3,4,5 calls=5
```

`mini.js` memory functions ko wire karta hai, HTTP nahi. `compare.js` same helpers ko actual HTTP se wire karta hai.
Batch ke liye saari keys pehle pata honi chahiye. Pehli response se doosri key nikalti ho toh dependency ko seedhe batch nahi kar sakte.

## ex4-io — operation size aur benchmark ki hadd

Tool 4 MiB temporary file banata hai, har 4 KiB block mein repeatable bytes likhta hai, `readFile` se warm karta hai.
Same 1024 blocks: sequential 4 KiB, seeded shuffled 4 KiB, sequential 64 KiB.
Bytes aur sampled-block checksum match hone par hi result dikhata hai. File aur temporary directory finally mein delete hoti hain.
Reported `reads` Node read operations hain; physical device I/O count nahi. Short reads loop mein poore kiye jaate hain.

Run 1:

```text
ASLI file reads; warm page cache; 4 MiB; disk hardware benchmark NAHI
seq4k: reads=1024 bytes=4194304 checksum=125690 elapsed=44.42 ms
shuffle4k: reads=1024 bytes=4194304 checksum=125690 elapsed=43.15 ms
seq64k: reads=64 bytes=4194304 checksum=125690 elapsed=3.15 ms
```

Run 2:

```text
ASLI file reads; warm page cache; 4 MiB; disk hardware benchmark NAHI
seq4k: reads=1024 bytes=4194304 checksum=125690 elapsed=49.62 ms
shuffle4k: reads=1024 bytes=4194304 checksum=125690 elapsed=41.92 ms
seq64k: reads=64 bytes=4194304 checksum=125690 elapsed=3.79 ms
```

Run 3:

```text
ASLI file reads; warm page cache; 4 MiB; disk hardware benchmark NAHI
seq4k: reads=1024 bytes=4194304 checksum=125690 elapsed=43.60 ms
shuffle4k: reads=1024 bytes=4194304 checksum=125690 elapsed=42.70 ms
seq64k: reads=64 bytes=4194304 checksum=125690 elapsed=3.09 ms
```


Is environment mein shuffled 4 KiB reads sequential 4 KiB se dheemi nahi nikli. Dono normal filesystem/page-cache path par the.
64 KiB case mein requests 1024 se 64 hui; size aur ordering dono badalte hain. Is run se SSD random-vs-sequential ratio nahi milta.
Cold-device benchmark ke liye device, cache state, queue depth, block size, access pattern aur load control karne honge.
Lab kernel caches drop nahi karta, raw device nahi kholta, system configuration nahi badalta.

## Primary documentation — kya run nahi kiya

- [Redis pipelining](https://redis.io/docs/latest/develop/using-commands/pipelining/): multiple commands bhejne ke beech har reply ka wait hata sakte hain; bounded batches reply memory ko limit karte hain. **Redis is lab mein nahi chalaya**. HTTP `/many` endpoint Redis pipelining ka implementation nahi.
- [MIT OCW, Sliding Window Analysis / Little's Law](https://live.ocw.mit.edu/courses/6-02-introduction-to-eecs-ii-digital-communication-systems-fall-2012/40abf69fd6895d82e1e249f68e3eedbd_xa38Q2_pnlQ.pdf): average number inside = rate × average residence time, matching boundary/conditions.
- [Linux page cache](https://www.kernel.org/doc/html/latest/mm/page_cache.html): normal filesystem reads/writes page cache se guzarte hain; direct I/O bypass alag hai. Lab direct I/O nahi karta.
- [RocksDB Overview](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview): writes involve log/memtable, sorted files and compaction; LSM ko sirf append kehna adhoora hai. **RocksDB is lab mein nahi chalaya**.
- [AWS: Using load shedding to avoid overload](https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/): excess work/resource contention aur useful completions alag dekho. **AWS is lab mein nahi chalaya**.
- [Node performance.now](https://nodejs.org/api/perf_hooks.html#performancenow): local elapsed measurement; machine-independent latency constant nahi.

Documentation ko 2026-10-20 par padha. Lesson ke general claims in primary sources aur actual runs se alag labelled hain.

## Verification aur practice

Five behavioral tests: bounded in-flight requests/order, final partial batch, errors/invalid limits, queue wait-vs-service/area, invalid schedule.
Exact raw output `captures/` mein permanent hai. Slowmo/math/queue/mini teen runs mein byte-identical the; HTTP aur file reads teen runs.

1. `DELAY_MS=0 npm start ex1-http` aur manual `--url` run karo. 40 ms run se difference samjho; new results apne captures mein rakho.
2. `batched` ka size 4 se 2 karo. Calls badlenge. Values aur order badalne nahi chahiye.
3. `parallel` ka limit 2 se 1 karo. Calls wahi, overlap badlega. Limit 4 ke baad production safety assume mat karo.
4. Queue ka `workMs` 100 se 50 karo, phir slots 1 se 2 karo. Nayi waits aur averages dobara nikalo.
5. File case mein sirf order badal kar block size same rakho. Warm-cache result ko device benchmark mat kaho.
