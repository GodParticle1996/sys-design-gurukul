# 🧪 Lab 55 — Persistence: fsync, WAL, crash, bit rot, B-tree vs LSM, SSD

System Gurukul → 🧪 First Principles → Persistence (Kyun · Kaise · Code · Kab).
Zero dependency, Node 22+. `ex1`, `ex2`, `ex3` asli runs hain (asli files, asli `fsync`, asli process jo `SIGKILL` se
marta hai); `ex0`, `ex4`, `ex5`, `ex6` model hain (seeded, har run same). Captures Node v24.18.0 par, ext4 wali WSL2
machine par (Linux ka disk ek virtual disk hai, toh fsync ke numbers asli SSD se alag honge).

```bash
npm start -- ex0-slowmo    # MODEL: ek KV store — page cache vs disk, checkpoint, app crash vs power cut
npm start -- ex1-fsync     # ASLI: write() vs fsync har record par / har 10 / har 100; group commit 1, 8, 64 clients
npm start -- ex2-crash     # ASLI: writer process ko SIGKILL; restart par kitne "done" orders bache; torn tail
npm start -- ex3-bitrot    # ASLI files: ek bit palto — plain text chup, CRC32 pakad leta hai, replica theek karti hai
npm start -- ex4-btree     # MODEL: B+tree ki oonchai, buffer pool, page writes per row, cold lookup
npm start -- ex5-lsm       # MODEL: LSM-tree — bytes written, files, bloom filter ke saath/bina lookups
npm start -- ex6-ssd       # MODEL: SSD ka FTL — drive kitni bhari hai, utna write amplification
npm test                   # 14 tests (asli fsync, asli SIGKILL, adhoore writes, fail-stop samet)
docker compose --profile ex1-fsync up --build   # supplied, untested
```

Files sirf OS ke temp folder mein bante hain aur run ke baad mit jaate hain. Koi port nahi. **Is machine par Docker nahi;
compose chalaya nahi gaya.** Container mein fsync ke numbers host ke disk aur Docker ke storage driver par tike honge.

## Lab ka daayra

- **KV store** (`lib/kv.js`): har badlaav pehle write-ahead log (`wal.log`) mein append hota hai. `sync=commit` mein
  "done" kehne se pehle `fsync`; `sync=none` mein `write()` ke turant baad "done". `checkpoint()` poori table ko temp file
  mein likh ke fsync, rename aur folder fsync karta hai, phir log khaali karta hai. Restart par table load hoti hai aur log
  upar se replay hota hai.
- **Log ka format** (`lib/wal.js`): har record `[lambai 4 bytes][header CRC32 4 bytes][data CRC32 4 bytes][data]`.
  Header ka apna checksum lambai ko bachata hai: lambai ka ek bit palte toh reader "header checksum mismatch" par rukta
  hai, use "aadha record" nahi samajhta. Reader pehle adhoore record ya kisi bhi checksum mismatch par ruk jaata hai.
  **Lab ki shart:** header sahi ho par data ke bytes kam hon, toh lab maanta hai ki append crash ke beech ruka aur us record
  ko kabhi "done" nahi mila. Tab `open()` us poonchh ko kaat deta hai, warna naye records poonchh ke peeche chhup jaate (ex2).
  Agar koi bug ya disk pehle se "done" bytes kaat de, toh kati hui file bhi adhoore tail jaisi dikhegi; jahan aisa khatra ho, auto-trim mat karo.
  **Checksum mismatch** (header ya data, aakhri record mein bhi) bit rot ho sakta hai kisi aise record mein jise "done" mila
  tha: `open()` error deta hai aur log ko haath nahi lagata, taaki backup ya replica se repair ho sake.
- **Poore bytes:** `write()` maange se kam bytes likh sakta hai. Har write tab tak dohrayi jaati hai jab tak saare bytes na
  likh jaayein (zero progress = error); saare bytes ke baad hi fsync aur "done". Naya `wal.log` banne par folder ka bhi fsync hota hai,
  kyunki file ka fsync file ke naam (directory entry) ko pakka nahi karta.
- **Power cut asli nahi ho sakta** — Node process machine ki bijli nahi kaat sakta. Isliye ex0 ek `ModelDisk` par wahi KV code
  chalata hai: bina fsync wale bytes ek "page cache" (RAM) mein rehte hain; `appCrash()` cache rakhta hai, `powerCut()` mitata
  hai. App crash ka asli hissa ex2 mein hai.
- **Disk ka apna cache:** fsync tab hi pakka hai jab drive bhi "stored" ka sach bole — consumer SSDs aur virtual disks ka
  bartav alag hota hai. Lab sirf OS tak ki ginti karta hai. Asli power cut lab mein nahi kiya gaya; ModelDisk mein file
  banana turant pakka hai aur OS ka background writeback nahi (asli OS bina fsync ke bhi kuch bytes pehle likh sakta hai).
- **ex4 B+tree** (`lib/btree.js`): 8 KB pages, leaf mein poori 100-byte rows (81 per page, InnoDB jaisa clustered), inner page
  mein 16-byte entries (512 bachche). LRU buffer pool: pool mein na mile toh ek page read; badla hua (dirty) page pool se
  nikalne par ya checkpoint par ek page write. Leaf beech se toot-ta hai (asli engines sequential insert par aksar kinaare se
  todte hain, toh sequential fill behtar hoti hai).
- **ex5 LSM** (`lib/lsm.js`): memtable 10,000 rows (1 MB), flush par ek sorted, kabhi na badalne wali file (SSTable) aur
  file ka bloom filter; size-tiered compaction (ek tier mein 4 files → agle tier mein ek). Lookup har file ke liye ek 4 KB
  block read ginta hai (block index RAM mein maana). Delete (tombstone) aur leveled compaction model mein nahi.
- **ex6 SSD** (`lib/ftl.js`): 512 blocks × 256 pages × 4 KB. Flash page dobara tabhi likha ja sakta hai jab poora block
  erase ho. Overwrite naye page par jaata hai, purana page "stale"; free blocks kam hone par greedy garbage collection
  sabse kam live pages wala block chunta hai, live pages copy karta hai, block erase karta hai.

## ex0-slowmo — page cache vs disk (model)

Do orders, checkpoint, do orders aur — phir dono tarah ka crash. Same KV code jo asli runs mein chalta hai.

| sync | app crash (kill -9) | power cut |
|---|---|---|
| commit (fsync, phir "done") | kuch nahi gaya | kuch nahi gaya |
| none ("done" seedha write() ke baad) | kuch nahi gaya | **order-43, order-44 gaye — dono ko "done" mila tha** |

`sync=none` ka "done" lagbhag 1,000 guna tez hai (ex1: write() ~1 µs, fsync ~1.2–4.8 ms), aur ~1,000 guna ki tezi page cache se aati
hai — RAM, jo bijli ke saath mitti hai.

## ex1-fsync — "pakka disk par" ki keemat (asli)

107-byte record (12-byte header + order ka JSON). Teen runs:

| ek writer | records/second |
|---|---:|
| sirf write(), fsync nahi | 5.9–16.7 lakh |
| har record ke baad fsync | **207–806** (~1.2–4.8 ms per fsync) |
| har 10 records ke baad fsync | 2,149–7,492 |
| har 100 records ke baad fsync | 21,638–70,857 |

| clients jo "done" ka intezaar karte hain (har client 100 commits) | commits/s | p50 intezaar | records per fsync |
|---|---:|---:|---:|
| 1 client, apna fsync | 211–693 | 1.2–4.1 ms | 1 |
| 1 client, group commit | 208–614 | 1.3–4.1 ms | 1 |
| 8 clients, har commit apna fsync | 210–538 | 12.5–36.6 ms | 1 |
| 8 clients, group commit | 809–2,024 | 3.1–9.4 ms | 4 |
| 64 clients, har commit apna fsync | 227–265 | **279–296 ms** | 1 |
| 64 clients, group commit | **7,101–23,532** | **2.6–8.5 ms** | 32 |

- Is virtual disk par fsync ka samay run-to-run bahut badla: run 2 aur 3 mein ek fsync ~4–5 ms tha, run 1 mein ~1.3 ms.
  Isliye absolute numbers ka range bada hai. Har run mein 64 clients par group commit apne-apne fsync se **27–98× zyada**
  commits/s laaya (run 1: 98×, run 2: 31×, run 3: 27×).
- **Group commit:** jo commits ek fsync ke dauraan aate hain, sab agle ek fsync mein saath likhe jaate hain. Har client ab
  bhi "pakka" ka intezaar karta hai, par 64 clients par 32 commits ek fsync baant-te hain. Postgres jaise databases group
  commit karte hain.
- **Fail-stop:** batch ka write ya fsync fail ho toh log mein adhoora batch ho sakta hai. `lib/commit.js` store ko failed
  maanta hai: failed batch aur line mein khade saare commits reject, naye commits reject, aur chal raha I/O khatam hone ke
  baad hi file band. Test ek write ko 4 bytes par rok ke agla write EIO deta hai, aur jaanchta hai ki error ke baad koi write
  ya fsync nahi hua.
- 1 client par group commit se faayda nahi: baantne ke liye koi saathi hi nahi.

## ex2-crash — SIGKILL (asli)

Child process orders likhta hai aur har put ke baad "ack N" bhejta hai; parent 5,000 ack dekh ke `SIGKILL` bhejta hai.

| sync | parent ko ack | restart par log mein | ack hue par gaye |
|---|---:|---:|---:|
| none | 5,000–5,085 | utne hi | **0** |
| commit | 5,000 | 5,000 | **0** |

- `kill -9` sirf process ko maarta hai, OS ko nahi. `write()` se OS ko diye bytes page cache mein hain aur baad mein disk par
  pahunchte hain. Isliye is crash schedule mein, poore hue writes ke baad, fsync ke bina bhi kuch nahi gaya. Power cut alag
  baat hai (ex0). Tool tabhi nateeja deta hai jab child sach mein SIGKILL se mara aur stdout poora padh liya gaya (`close`).
- Log mein ack se ek zyada record ho sakta hai: child ne put kar diya, ack parent tak pahunchne se pehle maara gaya.
- **Torn tail:** log ke aakhir mein aadha record (bijli likhte-likhte gayi). Reader 3 records par bharosa karke ruk jaata hai.
  Aadha record chhod ke naya order-5 jodo toh reader ko order-5 dikhta hi nahi; `open()` poonchh kaat-ta hai, tab order-5
  wapas aata hai.

## ex3-bitrot — ek bit palta (asli files)

1,000 naam, do tarah: plain text, aur 32-byte slots jinme har naam ka CRC32. Dono files mein naam #500 ("Andrew
Fernandes") ke aakhri akshar ka ek bit palta.

- Plain text: 1,000 naam padhe, koi error nahi. Naam #500 ab **"Andrew Fernander"** — reader ko pata hi nahi.
- Tool byte ko normal file write (`r+` + fsync) se badalta hai, aur application ka stored CRC32 purana rehta hai. Badlaav ek
  legal edit hai, filesystem ke neeche ki asli bit rot nahi; checksum wala filesystem bhi aise write ka naya checksum bana leta.
  Plain reader isliye chup raha kyunki reader ke paas naam ka alag checksum nahi tha.
- Checksummed: 999 slots theek, **#500 fail** — CRC32 nahi milta.
- Replica se slot #500 copy kiya → 1,000/1,000 theek. Checksum **pakadta** hai, doosri copy **theek karti** hai; akela koi
  ek dono kaam nahi karta.
- CRC32 payload ke har single-bit badlaav ko pakadta hai; test payload ka har bit palat ke jaanchta hai.

## ex4-btree — oonchai, page writes, cold lookup (model)

**A. Oonchai** (8 KB pages, 100-byte rows → 81 per leaf; inner 512 bachche):

| rows | levels | inner pages RAM mein | poori table |
|---|---:|---:|---:|
| 1 lakh | 3 | 0.0 MB | 9.6 MB |
| 1 crore | 3 | 1.9 MB | 964.5 MB |
| 100 crore | 4 | 188.8 MB | 94.2 GB |
| 6,250 crore | 5 | 11.5 GB | 5,887 GB |

Sirf key + pointer wala index (16 bytes, 512 per leaf) 6,250 crore keys par 4 levels — video ka 4 levels wala hisaab key + pointer wale index ka hai.

**B. 10 lakh inserts, 100-byte rows:**

| keys | buffer pool | checkpoint har | page reads | page writes | likhe bytes ÷ row bytes |
|---|---|---:|---:|---:|---:|
| random | 1,000 pages (8 MB) | 10,000 | 7,79,289 | 8,11,326 | **66.5×** |
| random | 40,000 pages (320 MB) | 1,000 | 0 | 9,16,711 | **75.1×** |
| random | 40,000 pages | 10,000 | 0 | 5,37,579 | 44.0× |
| random | 40,000 pages | 1,00,000 | 0 | 97,789 | **8.0×** |
| sequential | 1,000 pages | 10,000 | 0 | 24,775 | 2.0× |

- Random keys par har insert alag 8 KB page ko gandha karta hai; 100-byte row ke liye 8 KB likhna = ~82× tak. Checkpoint
  door-door ho toh ek page par kai rows ikatthi hoti hain (8×) — par crash ke baad replay ke liye log lamba. Upar se WAL ka
  ~1× alag.
- Sequential keys par sirf aakhri leaf gandha hota hai: 2×.

**C. Restart ke baad 10,000 random lookups** (pool khaali shuru hota hai, pinned pages chhod ke):

| buffer pool | pehla lookup | 10,000 ka ausat |
|---|---:|---:|
| 1 page, kuch pinned nahi | 3 | 3.00 page reads |
| 65 pages, seedha LRU | 3 | 1.57 |
| 64 inner pages pinned + leaf ke liye 1 page | 1 | **1.00** |
| 1,000 pages, seedha LRU | 3 | 0.95 |

1 page mein root se leaf tak ka raasta tik hi nahi sakta: har lookup 3 reads. Barabar 65 pages mein inner pages pin karna
seedhe LRU se behtar (1.00 vs 1.57). Bada pool leaves bhi rakh leta hai (0.95). "Har lookup 4 disk trips" sirf thande cache par.

## ex5-lsm — append, merge, bloom (model)

Wahi 10 lakh random rows (100 MB):

- Likha: WAL 100 MB + memtable flush 100 MB + compaction 260 MB = **4.6×**. Key random ho ya sequential, LSM sirf append karta
  hai; bill compaction mein hai.
- Ant mein 4 files (tiers T1:1, T2:2, T3:1).

| lookup (10,000) | files dekhi | bloom ne "nahi" kaha | 4 KB block reads | bekaar reads (key file mein nahi) |
|---|---:|---:|---:|---:|
| bloom 10 bits/key, key hai | 3.40 | 2.38 | **1.02** | 0.02 |
| bloom 10 bits/key, key nahi | 4.00 | 3.97 | **0.03** | 0.03 |
| bloom nahi, key hai | 3.40 | 0 | 3.40 | 2.40 |
| bloom nahi, key nahi | 4.00 | 0 | 4.00 | 4.00 |

Bloom filter ke false positives (1 lakh keys, 2 lakh gair-maujood keys par naape): 5 bits/key **9.00%**, 10 bits/key
**0.81%**, 15 bits/key **0.08%**. "Nahi" kabhi galat nahi. Lab ka full-key bloom filter kisi bhi range ke liye files skip
nahi kar sakta; prefix bloom filter ek prefix tak seemit range scan mein madad kar sakta hai.

## ex6-ssd — bhari drive, zyada copying (model)

Drive ko diye gaye level tak bharo, phir stored data ka 4 guna overwrite:

| pattern | drive bhari | GC copies | flash writes ÷ host writes |
|---|---:|---:|---:|
| random | 50% | 53,877 | 1.21× |
| random | 75% | 4,46,459 | 2.14× |
| random | 90% | 19,70,678 | **5.18×** |
| random | 95% | 47,17,548 | **10.47×** |
| sequential | 90% | 0 | 1.00× |

Bhari drive mein har block mein kam stale pages, toh GC ko zyada live pages copy karne padte hain. Sequential overwrite poore
block ko stale kar deta hai: copy zero.

## Source ke daave aur sudhaar

- **"fsync ke saath 100 writes/second se zyada nahi".** Spinning disk ke liye theek andaaza. Is machine par 207–806, aur group
  commit se 64 clients par 7,101–23,532 commits/s — har commit phir bhi fsync ke baad hi "done".
- **"SSD ek byte badalne ke liye 2 MB block padhta, erase karta, wapas likhta hai".** FTL aisa har write par nahi karta: naya
  data kisi saaf (erased) page par jaata hai, purana page stale. Write amplification baad mein garbage collection ki copying se
  aata hai (ex6), aur bhari drive par badhne wali baat sahi hai. Video ka bit wala udaharan bhi ulta hai: simple SLC model mein
  erase bits ko 1 karta hai, aur program chuninda 1 ko 0 karta hai.
- **"B-tree mein 4 levels = har query 4 disk trips".** Inner pages chhote hain aur RAM mein rehte hain: ex4 mein 1 crore rows
  ke inner pages 1.9 MB, aur pinned inner pages ke saath lookup 1.00 read.
- **"B-tree ko random writes chahiye; 10,000 writes/s par B-tree mat lo".** Random keys alag pages gandhe karti hain, par har
  row ka turant ek physical write zaroori nahi: sequential keys, buffer pool aur checkpoint batching page writes ghatate hain
  (ex4: 2× se 75× tak). Sirf ek writes/s ka number sun ke engine mat chuno; row size, indexes, reads, cache, sync policy aur
  compaction ke saath apna workload naapo.
- **"MongoDB ke WiredTiger mein LSM".** WiredTiger ka architecture guide: "WiredTiger represents database tables using a
  B-Tree data structure". LSM ke udaharan RocksDB aur Cassandra hain.
- **"Database crash ke baad main table kharab ho toh bhi log se theek".** Recovery ko valid snapshot/checkpoint aur checkpoint ke baad
  ka zaroori log chahiye; log sirf logged badlaav replay karta hai. Purani, kahin bhi hui corruption ke liye backup/replica ya
  engine ki repair suraksha chahiye (Postgres adhoore page writes ke liye full-page images log karta hai). Lab kharab
  table.snap par error deta hai.
- **"Like ke liye LSM + eventual consistency, bank transfer ke liye B-tree".** B-tree/LSM data rakhne ka tareeka hai. Durability
  WAL ka sync aur commit policy tay karte hain; replicas kitne consistent hain, replication aur read protocol tay karta hai.
  LSM wale databases bhi Raft ke saath strong consistency dete hain (YugabyteDB: RocksDB + Raft), aur commit ke liye data-file
  ka page flush hona zaroori nahi — log ka fsync kaafi hai.
- **"Cosmic rays disk ke bits palat dete hain".** Bit flips DRAM mein zyada jaane-pehchaane hain; disk ke andar ECC kai kachche
  errors theek karta hai. Phir bhi chupi corruption hoti hai — FAST 2008 ka study: 1.53 million disk drives, 41 mahine, "more
  than 400,000 instances of checksum mismatches". Wajah firmware bugs, galat jagah likhe writes, cables, memory bhi ho sakti
  hai. Ilaaj: checksum + doosri copy (ex3).
- **"Bloom filter 100% bata deta hai ki key nahi hai".** Sahi: "nahi" pakka hai, "shayad" kabhi galat (ex5: 10 bits/key par
  0.81%).
- **"RUM: read, update, memory mein se sirf do".** Athanassoulis et al. (EDBT 2016) ka conjecture hai, kudrat ka niyam nahi:
  read cost, update cost aur extra RAM/storage mein se do ko optimize karne par teesre ki seema aati hai. Har chhoti
  optimization par doosra metric bigde, zaroori nahi.
- **"Teen machines value par agree karein, tab user ko success".** Raft ke 3 voting replicas mein nayi entry majority, yani 2
  durable copies par commit ho sakti hai; teesra follower baad mein pakad leta hai. GFS (2003) chunk writes ke liye Raft/Paxos
  nahi chalata — primary lease se kram tay hota hai, aur GFS ki consistency bank transaction ki guarantee nahi. Paper ke
  shabd: "component failures are the norm rather than the exception"; chunk "64 MB"; writes "three replicas" tak.
- **"S3 data kai buildings mein likhta hai".** S3 Standard jaise regional classes kai Availability Zones mein rakhte hain;
  One Zone-IA aur Express One Zone ek hi AZ mein. Storage class dekh ke failure ka daayra samjho.
- **App crash vs OS crash.** Video ka farq sahi hai: ex2 mein poore hue writes ke baad `kill -9` par "done" orders bache,
  kyunki OS zinda tha. fsync ke bina OS crash ya power cut par haal ke writes kho sakte hain. Corruption aur disk ka kharab
  hona alag khatre hain.

## Files

```
lib/crc32.js   CRC-32 (IEEE)                     lib/wal.js     log ka record format, torn/mismatch par rukna
lib/disk.js    RealDisk (fs) aur ModelDisk        lib/kv.js      KV store: WAL, checkpoint, recovery
lib/commit.js  apna fsync vs group commit         lib/btree.js   B+tree + LRU buffer pool (model)
lib/lsm.js     LSM-tree + compaction (model)      lib/bloom.js   bloom filter
lib/ftl.js     SSD flash translation layer        lib/rng.js     seeded random; lib/stats.js percentile
tools/*.js     ex0 … ex6                          test/core.test.js  14 tests
captures/      har tool ke teen runs + test run
```

## Practice

1. `ex1` ko apne laptop par chalao. Har record par fsync kitne records/s? Group commit 64 clients par kitna?
2. `lib/kv.js` mein `open()` ki torn-tail wali line hatao aur `npm test` chalao. Kaunsa test fail hua, aur kyun?
3. `tools/btree.js` mein checkpoint 1,000 se 10 lakh tak badlo. Bytes written kaise badle? Crash ke baad replay ka kya?
4. `tools/lsm.js` mein `bitsPerKey` 10 se 4 karo. Missing key par block reads kitne hue?
5. `tools/ssd.js` mein 97% bhari drive jodo. Write amplification kya hua?
