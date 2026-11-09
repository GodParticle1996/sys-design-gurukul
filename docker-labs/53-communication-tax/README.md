# 🧪 Lab 53 — Communication Tax: handshake, connection reuse, serialization aur chhote writes

System Gurukul → 🧪 First Principles → Cost of Communication (Kyun · Kaise · Code · Kab).
Zero dependency, Node 22+. `ex1`–`ex3` asli runs hain (asli TCP, asli HTTP/1.1 aur HTTP/2, asli CPU time); `ex0` aur `ex4`
haath ka hisaab aur model hain. Captures Node v24.18.0 par, 14 logical CPUs wali WSL2 machine par liye gaye.

```bash
npm start -- ex0-slowmo       # ek HTTPS call ka bill, aur chatty vs chunky (bill | chatty)
npm start -- ex1-reuse        # ASLI: naya connection har request vs keep-alive vs HTTP/2; phir 20 ms RTT par 50 requests
npm start -- ex2-serialize    # ASLI: 1,00,000 orders — JSON vs Protobuf wire format: bytes, gzip, samay aur CPU
npm start -- ex3-writes       # ASLI: 8 MB — 100-byte writes vs ek bada write
npm start -- ex4-geo          # MODEL: doori → RTT, aur pehle byte tak kitne RTT (TLS 1.2 / 1.3 / QUIC / CDN edge)
npm test                      # 11 tests (asli processes aur sockets samet)
docker compose --profile ex1-reuse up --build   # supplied, untested
```

Ports (sirf `127.0.0.1`): server **6301** (HTTP/1.1) aur **6302** (HTTP/2 cleartext), delay proxies **6311–6312**,
ex3 receiver **6321**; tests 6391–6396. **Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra

- Asli runs ka samay har run mein badalta hai. README mein teen runs (`captures/*-1,2,3.txt`) ki range hai.
- `ex1` ka server alag process hai; client aur server dono ka CPU (user + kernel) `process.cpuUsage()` se. A mein har
  tareeka pehle 300 bina-gine requests se garam hota hai, phir teen round ghoomte kram mein; har column median hai.
- `ex1` B ka delay proxy **model** hai: har chunk har taraf RTT ÷ 2 rukta hai. Loopback par asli TCP handshake turant
  hota hai, isliye proxy handshake ki jagah ek extra RTT rakhta hai — ghadi connection accept hote hi chalti hai, aur koi
  upstream byte accept + 1.5 RTT se pehle nahi jaata. Turant bheja pehla byte poora extra RTT rukta hai; lambe idle ke baad
  handshake ka intezaar pehle hi poora ho chuka hota hai. Connection ka band hona (FIN) data ke peeche, usi delay se jaata
  hai. TLS model nahi kiya.
- Is machine par kisi naye listener par pehli 50 parallel connects ~30 ms dheemi thi (wajah naapi nahi), isliye `ex1` B
  timing se pehle ek bina-gine 50-connect burst chalata hai. Ek bina-capture run mein "50 naye sockets" phir bhi 177 ms
  laga — ek baar ka atkaav, wajah naapi nahi.
- `ex2` ka protobuf haath ka likha Protobuf wire format hai (varint + length-delimited) — library nahi. Dono formats
  objects se wire bytes tak naape gaye (JSON ka UTF-8 kadam dono taraf shaamil). Samay ka nateeja implementation par tika
  hai: V8 ka `JSON` C++ mein hai, lab ka encoder JavaScript mein. Decoder har string ka UTF-8 jaanchta hai.
- `ex4` ki doori great circle hai; asli fiber raasta lamba hota hai aur routers samay jodte hain — numbers kam se kam hain.

## ex0-slowmo — ek call ka bill

Server 40 ms RTT door, naya connection, DNS cached: TCP handshake 40 → TLS 1.3 handshake 40 → request + response 40 →
server ka kaam 5 = **125 ms**. Wahi call reused connection par: 40 + 5 = **45 ms**.

Home screen ko 5 cheezein chahiye (name, avatar, bio, orders, offers), reused connection: ek ke baad ek 5 calls = **225 ms**;
ek chunky call jo server apne data ke paas jodta hai = 40 + 25 = **65 ms**; 5 calls saath = ~45 ms, par 5 requests ka server
kaam (aur pipelining na karne wale HTTP/1.1 client par 5 connections).

## ex1-reuse — connection dobara use karo

**A) Loopback, 2,000 requests ek ke baad ek** (GET /order/:id, chhota JSON; warm-up ke baad 3 round, median):

| tareeka | wall | connections | client CPU user + kernel | server CPU user + kernel |
|---|---:|---:|---:|---:|
| har request naya connection | 401–448 ms | 2,000 | 231–265 + **113–150 ms** | 139–180 + 78–91 ms |
| keep-alive (1 socket) | **223–242 ms** | 1 | 112–121 + 55–62 ms | 63–80 + 36–47 ms |
| HTTP/2 (1 connection) | 241–267 ms | 1 | 102–120 + 35–64 ms | 68–97 + 47–59 ms |

- Har request par naya connection: wall ~1.8–1.9×, aur kernel CPU ~2× (client 1.9–2.7×, server 1.7–2.5×). Distance
  shunya hai, phir bhi connection banana aur todna kaam hai.
- Ek-ek karke requests bhejne par HTTP/2 keep-alive HTTP/1.1 ke lagbhag barabar ya thoda dheema raha. Lab ne wajah
  profile nahi ki. Multiplexing ka fayda tab dikhta hai jab requests saath hon (B).

**B) Delay proxy, RTT 20 ms, 50 requests ek saath chahiye** (MODEL handshake, upar dekho):

| tareeka | wall | naye connections |
|---|---:|---:|
| HTTP/1.1, 1 warm socket | **1,052–1,055 ms** | 0 |
| HTTP/1.1, 50 naye sockets | 45–50 ms | 50 |
| HTTP/2, 1 cold connection | 42–44 ms | 1 |
| HTTP/2, 1 warm connection | **23 ms** | 0 |

- Lab ka HTTP/1.1 client pipelining nahi karta: ek warm socket par requests ek-ek karke jaati hain, isliye 50 × ~21 ms.
  Socket warm hai (pool ka ek socket), phir bhi line lagti hai. HTTP/1.1 pipelining mein kai requests bheji ja sakti hain,
  par jawab kram se hi aate hain (RFC 9112 §9.3.2); browsers aam taur par pipelining nahi karte.
- 50 naye sockets parallel chalte hain: model ke 2 RTT (40 ms) + 50 connections ka asli kaam.
- HTTP/2 ek connection par 50 streams saath: cold ~2 RTT, warm ~1 RTT.

## ex2-serialize — JSON vs Protobuf wire format

1,00,000 seeded orders. Ek order: JSON **147 bytes**, protobuf **77 bytes**. Har samay 5 rounds ka median, `samay/CPU`
(CPU = poore process ka user + system; GC jaise helper threads bhi gine jaate hain, isliye CPU samay se zyada ho sakta hai).
Dono taraf objects ↔ wire bytes; sabko barabar warm-up, ghoomta kram.

| format | bytes | gzip bytes | encode | decode |
|---|---:|---:|---:|---:|
| JSON | 12.57 MB | 1.57 MB | 31–33 / 31–33 ms | 42–45 / 55–59 ms |
| protobuf | **5.77 MB** (46%) | 1.54 MB (98%) | 35–36 / 42 ms | 70–74 / 121–126 ms |

JSON ko gzip karna: 120–126 ms compress, 13 ms decompress (samay ≈ CPU).

- Protobuf bina compression ke 54% kam bytes: field ke naam ki jagah field number, number text ki jagah varint.
- Gzip ka nateeja is par tika hai ki ek compressed response mein kitna data hai. Poori list (1,00,000 orders) par gzip ke
  baad Protobuf JSON ka 98% — JSON ke dohraate keys gzip kha jaata hai. Par ek order wale response par gzip ke baad bhi
  Protobuf 62% (86 vs 138 bytes); 100 orders par 101%. Compress ka CPU encode ka ~4×. Lab ke orders mein cities aur dishes
  kam hain, toh lab ka data asli data se zyada sikudta hai — apne responses par naapo.

| orders per response | JSON gzip | protobuf gzip | protobuf ÷ JSON |
|---:|---:|---:|---:|
| 1 | 138 | 86 | 62% |
| 10 | 379 | 351 | 93% |
| 100 | 1,925 | 1,941 | 101% |
| 1,000 | 16,270 | 15,992 | 98% |
| 1,00,000 | 15,73,156 | 15,37,532 | 98% |
- Samay aur CPU: V8 ka C++ `JSON` is JavaScript protobuf encoder/decoder se kam laga (decoder har string ka UTF-8 bhi
  jaanchta hai). Binary format ki jeet bytes aur schema mein pakki hai; CPU ki jeet implementation par tiki hai — apne
  stack par naapo.

## ex3-writes — chhote writes ka kharcha

8 MB loopback TCP par, ek hi process mein receiver (CPU dono ka). Teen runs ka median, har run ki range:

| tareeka | JS write() calls | wall |
|---|---:|---:|
| 100-byte writes, har write ka intezaar | 83,887 | 63–65 ms |
| 100-byte writes, bina intezaar | 83,887 | 27–31 ms |
| ek 8 MB write | 1 | **3.2–4.1 ms** |

- Har 100-byte write ka callback aane ke baad agla write bheja gaya. Ek bada write, chhote writes ke callbacks ka intezaar
  karne wale run se ~15–20× tez raha. Is farq mein JavaScript ke calls aur callbacks ka kaam bhi hai, sirf kernel ka nahi.
- Lab JavaScript ke `write()` calls aur poore transfer ka samay ginta hai, syscalls nahi. Bina intezaar wale run mein
  callback ka baar-baar intezaar hata, aur Node queued chunks ko jod sakta hai (`writev`). Kitni kernel calls hui aur farq
  ka kitna hissa kernel ka tha, jaanne ke liye alag tracing (jaise `strace -c`) chahiye.
- User aur kernel CPU ka bantwara runs mein bahut hilta hai; total CPU aur wall time bharose ke hain.

## ex4-geo — doori aur round trips (model)

| raasta | doori (great circle) | ek RTT (fiber) |
|---|---:|---:|
| San Francisco → London | 8,616 km | 86.2 ms |
| Mumbai → Singapore | 3,904 km | 39.0 ms |
| Mumbai → Frankfurt | 6,564 km | 65.6 ms |
| Mumbai → Ashburn (US-East) | 12,854 km | 128.5 ms |
| Delhi → Bengaluru | 1,740 km | 17.4 ms |

San Francisco → London, pehle byte tak: HTTP/1.1 + TLS 1.2 = 4 RTT = **345 ms**; TLS 1.3 = 3 RTT = **258 ms**;
HTTP/3 (QUIC) = 2 RTT = **172 ms**; QUIC 0-RTT resumption ya warm connection = 1 RTT = **86 ms**.
San Francisco mein CDN edge (user ↔ edge 5 ms, edge ka London tak warm connection): cache miss **101 ms**, hit **15 ms**.

## Source ke daave aur sudhaar

Video: *System design from First principal: The Cost of Communication [3/15]* (`YOR9hAFoe2o`).

- **"Network call = 11 din" (L1 = 1 second ke paimane par).** Hisaab sahi: 0.5 ms ÷ 0.5 ns = 10 lakh → 10 lakh second ≈
  11.6 din.
- **TCP 1 RTT, TLS 1.2 do RTT, TLS 1.3 ek RTT.** Sahi. Par SF → London ke hisaab mein video seedha TLS 1.2 (340 ms) se QUIC
  par jaata hai; beech ka aam case — TCP + TLS 1.3 — 3 RTT = ~258 ms hai.
- **QUIC 0-RTT.** 1 RTT tak gir sakta hai, par 0-RTT data dobara bheja (replay) ja sakta hai: TLS 1.3 (RFC 8446) 0-RTT data ko sirf
  un requests ke liye theek maanta hai jo dobara chalne par nuksaan na karein.
- **Syscall = context switch.** Do alag cheezein: syscall mein CPU user mode se kernel mode jaata hai; context switch ek
  thread/process se doosre par jaana hai. Dono ka kharcha hai. ex3 JavaScript `write()` calls aur unke intezaar ka kharcha
  dikhata hai (100-byte writes ~15–20× dheeme), syscalls alag nahi ginta; ex1: naye connections ne kernel CPU ~2× badhaya.
- **"DPDK aur eBPF kernel ko bypass karte hain".** Dono ke tareeke alag hain. DPDK ke NIC poll-mode drivers packet
  processing ko user space mein chala sakte hain. eBPF programs kernel ke andar chalte hain; networking hooks par packet
  processing tez kar sakte hain. eBPF ko seedha kernel bypass kehna sahi nahi.
- **Protobuf: "4 bytes seedhe register mein, parse nahi".** Galat. Protobuf ke `int32`/`uint64` jaise numbers **varint**
  hote hain (wire type 0) — har byte padh ke jodne padte hain (lab ka `readVarint`). Sirf `fixed32`/`fixed64` jaise types
  seedhe copy hote hain. Field key bhi varint hai: `(field_number << 3) | wire_type`. Field numbers 1–15 ke keys ek byte
  lete hain; bade field numbers ke keys zyada bytes. Key field number aur wire type batata hai, "4-byte integer" nahi.
- **"JSON high-performance systems ke liye disaster", "30% CPU parsing mein".** 30% ka koi source video nahi deta. ex2:
  bytes mein protobuf saaf jeeta (46%), par Node mein V8 ka C++ JSON is JavaScript protobuf se samay aur CPU dono mein kam
  laga, aur gzip ke baad bytes barabar. Naapo, maan ke mat chalo.
- **"HTTP/2 multiplexing = connection pooling".** Do alag cheezein. Pooling: kuch connections khule rakho aur dobara
  use karo. Multiplexing: ek connection par kai requests ek saath. ex1 B: pool ka ek warm HTTP/1.1 socket (bina pipelining)
  50 requests par ~1,050 ms; HTTP/2 ek connection par 23 ms.
- **Discord ne gRPC apnaya.** Video koi source nahi deta; is lab ne jaancha nahi, aur levels is daave par tike nahi.
- **Apache Arrow: "OS buffer seedha app ki memory mein map karta hai, koi copy nahi".** Arrow ka asli fayda: disk, wire aur
  memory mein ek hi layout, toh parse/convert ka kadam nahi. Normal socket se bytes app ki memory mein copy phir bhi hote
  hain; "zero-copy" ka matlab hai bytes ko naye objects mein badalna nahi padta.
- **Roshni fiber mein ~2,00,000 km/s, SF → London 85 ms RTT.** Sahi (great circle 8,616 km → 86.2 ms, kam se kam).
- **CDN "connection tax ko cache karta hai".** Model mein sahi: edge par handshakes 5 ms ke, edge ka London tak connection
  warm — 258 ms se 101 ms (miss), 15 ms (hit).
- **Batching 10× deta hai.** Kaam par tika hai; ex3 mein ek bada write ~15–20× tez. Batching ka poora hisaab First
  Principles topic 1 (lab 45) mein hai.
- **"Baar-baar baat karne wali services ek honi chahiye".** Physics ki taraf se sahi disha, par teams, deploy aur failure ki
  seemaayein bhi faisla karti hain — Prime Video story (lab 16) dekho.

## Files

- `lib/proto.js` — Protobuf wire format ka chhota hissa: varint, length-delimited, Order aur OrderList. Har read apne
  message ki seema ke andar; safe integer se bade numbers, lambe varints, galat keys aur kharab UTF-8 mana.
- `lib/orders.js` — seeded KhanaKart orders.
- `lib/delay.js` — TCP delay proxy (har taraf RTT ÷ 2, accept se gina handshake model, kram aur FIN bachata hai).
- `lib/geo.js` — great-circle doori aur fiber RTT.
- `services/server.js` — HTTP/1.1 + HTTP/2 (cleartext) order API; `/stats` connections aur CPU deta hai.
- `tools/*.js` — har exercise; `start.js` naam se chalata hai.
- `test/core.test.js` — 11 tests: Protobuf spec ka udaharan (150 → 08 96 01), varint ki hadd, encoder ka `Infinity`/`NaN`
  mana (time limit ke saath), kharab input mana (nested lengths, lambe varints, galat keys, kharab UTF-8), order round trip,
  anjaana field skip, list round trip, geo model, delay proxy ka kram (har chunk alag pahunchta hai, pehla chhootne se pehle sab line mein) aur delay,
  bhej-ke-band karne wale client ko poora jawab, server ki connection ginti.

## Practice

1. `RTT_MS=80 npm start -- ex1-reuse`: B ki table kaise badli? Pehle socho.
2. `lib/orders.js` mein dishes ki list 10 se 200 naamon tak badhao. Gzip ke baad JSON aur protobuf ka farq kya hua?
3. `tools/writes.js` mein `SMALL` 100 se 4,096 karo. Teeno rows ka samay?
