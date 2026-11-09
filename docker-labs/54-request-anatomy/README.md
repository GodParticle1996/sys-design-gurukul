# 🧪 Lab 54 — Request Anatomy: packet, DNS, loss, TTL, L4 vs L7, WAF aur BGP

System Gurukul → 🧪 First Principles → Anatomy of a Request (Kyun · Kaise · Code · Kab).
Zero dependency, Node 22+. `ex1`, `ex2`, `ex4`, `ex5` asli runs hain (asli UDP DNS packets, asli HTTP processes, asli CPU);
`ex0`, `ex3`, `ex6` haath ka hisaab aur model hain. Captures Node v24.18.0 par, 14 logical CPUs wali WSL2 machine par.

```bash
npm start -- ex0-slowmo    # packet ka hisaab, cold DNS lookup ka bill, edge par TLS (packet | dns | edge)
npm start -- ex1-dns       # ASLI UDP: root → TLD → authoritative, resolver cache, Node ke c-ares se jaanch
npm start -- ex2-loss      # ASLI UDP: 0% / 1% / 5% packet loss par lookup ka p50 … p99.9
npm start -- ex3-ttl       # MODEL: TTL 1 min … 24 h — queries/hour vs IP badalne ke baad purane IP par kitne
npm start -- ex4-lb        # ASLI: do backends, L4 proxy vs L7 proxy — latency, proxy CPU, kis backend par gaya
npm start -- ex5-waf       # ASLI CPU: 20 … 2,000 regex rules × 1 KB … 1 MB body
npm start -- ex6-bgp       # MODEL: policy vs speed, anycast kahan pahunchata hai, /24 leak
npm test                   # 13 tests (asli UDP, asli processes samet)
docker compose --profile ex1-dns up --build   # supplied, untested
```

Ports (sirf loopback): DNS servers **127.0.0.2 / .3 / .4 : 6510** (root, TLD, authoritative — sab ek hi port, jaise asli DNS
53 par), resolver **127.0.0.1:6511** (ex2: 6512), ex4 backends **6521–6522**, L4 proxy **6523**, L7 proxy **6524**;
tests 6587–6598 aur 127.0.0.5 / .6. Linux mein poora 127.0.0.0/8 loopback hai, isliye alag-alag loopback address bind
ho jaate hain. **Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra

- DNS ka wire format asli hai (RFC 1035 ka chhota hissa): header, ek question, A aur NS records, sirf class IN, aur naam
  ka ek tang hostname subset — har label mein letters, digits, `-` ya `_`, 1–63 bytes, poora naam wire par 255 bytes tak.
  Is subset ke bahar ka naam mana hota hai, chupke se badla nahi jaata. Compression pointer padhe jaate hain (sirf peeche ki
  taraf, ginti ke saath). Node ka apna resolver (c-ares) is lab ke resolver se poochh ke sahi jawab paata hai.
- Har server ko pata hai ki server ka apna zone kya hai, kaunse child zones delegate hain (NS) aur child zones ka glue. Pehle zone cut dekha jaata
  hai (referral, AA nahi), phir apna data: jawab (AA), NODATA (naam hai, type nahi: NOERROR, khaali) ya NXDOMAIN (naam hi
  nahi).
- Resolver sirf poochhe gaye naam aur type ke jawab par bharosa karta hai. Referral ke NS tabhi maane jaate hain jab NS ka
  zone naam ko contain kare aur poochhe gaye server se gehra ho; glue sirf unhi NS naamon ka. Baaki additional records cache
  nahi hote. `ask()` jawab tabhi maanta hai jab jawab usi server ke address aur port se aaye, response (QR) ho, aur ID, naam
  aur type mile; socket ka port aur ID random hain.
- Loopback par packet turant pahunchta hai, isliye har DNS server apna round trip **model** karta hai: you ↔ resolver 5 ms,
  root 20 ms, TLD 30 ms, authoritative 40 ms. Packet loss bhi **model** hai: resolver aane wale sawaalon ka ek hissa seeded
  random se chhod deta hai.
- Resolver ka daayra: sirf A aur NS, glue wale referrals, TTL cache. NXDOMAIN cache nahi hota (asli resolvers RFC 2308 se
  karte hain), SOA, CNAME, DNSSEC, TCP fallback, EDNS aur IPv6 nahi.
- `ex4` mein backends aur proxies alag processes hain; proxy ka CPU (user + system) proxy process se IPC par aata hai. Har
  tareeka pehle 300 bina-gine requests se garam hota hai, phir teen round ghoomte kram mein; har column median hai. Path ek
  seeded sikka chunta hai, taaki L4 ka round robin path ke saath taal na mila le. Lab HTTP use karta hai: HTTPS ka path padhne
  ke liye TLS L7 proxy par ya proxy se pehle khatam hona chahiye, aur TLS ka CPU is naap mein nahi.
- `ex5` ke saare rules linear-time hain (koi nested quantifier nahi): lab "rules × bytes" ka seedha kharcha naapta hai,
  catastrophic backtracking nahi. Catastrophic backtracking alag bug hai — Feed track ka regex postmortem dekho. JSON bodies
  poore orders se bani valid JSON hain, theek 1 KB aur 100 KB.
- `ex6` BGP protocol nahi chalata. Har prefix ke alternative routes mein LOCAL_PREF, phir AS-path length se route chunta hai;
  packet bhejte waqt installed routes mein longest-prefix match. Baaki BGP checks aur tie-breakers (origin, MED, eBGP/iBGP,
  IGP cost, router id) model mein nahi.

## ex0-slowmo — packet aur cold lookup ka bill

- MTU 1,500 bytes; IPv4 20 + TCP 20 bytes header (bina options) → har segment mein 1,460 bytes data. 10,000 bytes → **7
  segments**. Ethernet header 14 bytes jodo toh har segment par 54 bytes headers: 200-byte request par 21.3%, 1 MB par 3.6%.
  TCP timestamps option (+12) aam hai: tab 1,448 bytes; Ethernet 4-byte checksum bhi jodta hai.
- Cold lookup (model): 5 + 20 + 30 + 40 = **95 ms**, aur lookup ke baad hi TCP handshake shuru hota hai. Warm: 5 ms. Same
  domain ka doosra naam (referrals cached): 45 ms.
- Edge: Sydney ka user, origin Ashburn (great circle fiber RTT 156.7 ms, kam se kam). Arithmetic model, server processing
  ke bina: seedha TCP 1 + TLS 1.3 1 + request 1 = 3 × 156.7 = **470 ms** pehle byte tak (setup ~313 ms + request).
  Sydney edge par TCP+TLS setup 6 ms; edge ka origin tak garam connection: cache miss par pehla byte **166 ms**, hit 9 ms.

## ex1-dns — asli UDP lookup chain

| lookup | samay | resolver ne kitne servers se poocha |
|---|---:|---:|
| api.khanakart.com, cold | **100–101 ms** | 3 (root → TLD → authoritative) |
| api.khanakart.com, warm | 6–7 ms | 0 |
| img.khanakart.com (sibling) | 46–47 ms | 1 |
| nope.khanakart.com (NXDOMAIN) | 46–47 ms | 1 |

TTL ke andar 1,000 aur lookups: upstream servers par **0** sawaal. Node ka c-ares resolver `khanakart.com → 10.0.0.10, TTL 300`.

## ex2-loss — chhota packet loss, bada p99

2,000 lookups (naam pehle se cache mein), 20 ek saath; stub ka timeout 1,000 ms, 2 koshish.

| loss | gire | retry hue | retry ke baad jawab | fail | ausat (mean) | p50 | p95 | p99 | p99.9 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0% | 0 | 0 | 0 | 0 | 5.9–6.1 ms | 6 ms | 7 ms | 8–10 ms | 11–13 ms |
| 1% | 16 | 16 | 16 | 0 | **13.6–13.7 ms** | 6 ms | 6–7 ms | 7–8 ms | **1,006–1,007 ms** |
| 5% | 107 | 100–104 | 93–101 | 3–7 | 58.9 ms | 5 ms | 7–1,004 ms | **1,006 ms** | 2,000–2,001 ms |

- Har gira hua sawaal poora timeout rukta hai. 1% par sirf 0.8% lookups retry hue, toh p99 abhi bacha; par 1,000 mein
  sabse dheema 1 second ka. Median nahi hila, par ausat dugne se zyada (6 → 13.6 ms). 5% par p99 1 second; p95
  theek kinaare par (lagbhag 5% hi retry hue): 3 mein se 2 runs mein 1,004 ms, ek mein 7 ms.
- Percentiles mein successful aur failed dono lookups ka poora intezaar hai; lagbhag 2,000 ms wale samples do timeouts ke
  baad fail hue.
- glibc ke default knobs `timeout:5` aur `attempts:2` hain, par har gire sawaal ka wait fixed 5 s nahi: glibc nameserver
  list ke hisaab se timeout ginta hai, aur ek application lookup mein kai queries ho sakti hain.

## ex3-ttl — TTL ka sauda (model)

10,000 busy resolvers; IP t = 0 par badla; har resolver ki copy ki umar uniform random.

| TTL | queries/hour aap tak | 1 min baad purane IP par | 5 min baad | 1 h baad | sabse bura |
|---|---:|---:|---:|---:|---:|
| 1 min | 6,00,000 | 0.0% | 0.0% | 0.0% | 1 min |
| 5 min | 1,20,000 | 80.1% | 0.0% | 0.0% | 5 min |
| 1 h | 10,000 | 98.4% | 91.8% | 0.0% | 1 h |
| 24 h | 417 | 100.0% | 99.7% | 95.9% | 24 h |

TTL ko clamp ya ignore karne wale resolvers model nahi kiye. Planned move se pehle TTL chhota kar dena aam tareeka hai.

## ex4-lb — L4 vs L7

**A) Client ek connection khula rakhta hai (keep-alive):**

| tareeka | p50 | p99 | proxy CPU / 1,000 req | /api kahan | /img kahan |
|---|---:|---:|---:|---|---|
| seedha backend A | 0.07–0.08 ms | 0.32–0.36 ms | — | A | A |
| L4 proxy | 0.13–0.15 ms | 0.44–0.47 ms | **59–62 ms** | A 100% | **A 100%** |
| L7 proxy | 0.18 ms | 0.59–0.72 ms | **134–157 ms** | A 100% | B 100% |

**B) Har request naya connection:** L4 proxy 0.26–0.28 ms, CPU 162–181 ms / 1,000; L7 proxy 0.32–0.34 ms, CPU 239–254 ms;
L4 par /api aur /img dono A 50% · B 50% — round robin connection ginta hai, path nahi.

- L4 bytes copy karta hai: sasta (A mein L7 ke CPU ka ~40%), par path nahi dekhta, aur ek khule connection ki saari
  requests ek hi backend par. L7 har request padhta hai: path se route karta hai, par A mein ~2.2–2.6× CPU.

## ex5-waf — rules × bytes

Saaf body (koi rule match nahi), har cell **CPU ms per request, 5 runs ka median** (captures mein samay/CPU dono):

| body | 20 rules | 100 | 500 | 2,000 |
|---|---:|---:|---:|---:|
| 1 KB JSON order | 0.0 | 0.0 | 0.1–0.2 | 0.6 |
| 100 KB JSON | 0.2 | 0.9–1.1 | 4.5–5.3 | **18.0–18.9** |
| 1 MiB base64 text (image upload jaisa) | 5.5–5.6 | 27.9–32.8 | 133.6–138.5 | **539–545** |

- In linear rules aur saaf text bodies par kharcha rules aur bytes ke saath lagbhag seedha badhta hai; backtracking wale regex
  ka kharcha alag ho sakta hai. Attack wali body pehle match par ruk jaati hai (UNION SELECT rule
  #1 par pakda). Image upload ki body ko regex se na padhna (sirf URL aur headers) ~0 ms. Kai managed WAF body ka sirf pehla
  hissa padhte hain aur badi body ke liye alag setting dete hain — regex jaanch ka CPU kharcha seemit rakhne ke liye.

## ex6-bgp — policy, anycast, leak (model)

- **A:** DelhiNet ke paas ek hi prefix ke do raaste: peer (LOCAL_PREF 100, AS path 2, naapa RTT 50 ms) aur sasta contract
  (150, AS path 3, 200 ms). BGP 200 ms wala chunta hai — speed BGP ka input hi nahi.
- **B:** KhanaKart ek hi prefix Mumbai, Singapore, Frankfurt se announce karta hai. Chennai ka user Singapore pahunchta hai
  (2,902 km; Mumbai 1,033 km paas tha), Dubai ka Frankfurt (4,836 km; Mumbai 1,935 km). Anycast aksar paas le jaata hai,
  hamesha sabse paas nahi.
- **C:** KhanaKart `203.0.112.0/22` announce karta hai; LeakyNet galti se `203.0.113.0/24` (203.0.112.0/22 ke andar)
  announce karta hai — LeakyNet authorized origin nahi. Dono routes install hote hain; packet bhejte waqt /24 lamba match hai,
  isliye 3 ISPs ka 203.0.113.x traffic LeakyNet jaata hai; /22 ka baaki hissa bacha. Model maanta hai ki KhanaKart ke prefix
  ka valid covering ROA hai aur SafeNet RPKI-Invalid routes reject karta hai — isliye SafeNet bacha. Covering ROA na ho toh
  result NotFound ho sakta hai; authorized origin wala export leak origin validation se bach sakta hai. (YouTube 2008: /22
  ke andar /24.) Zyada tar networks IPv4 mein /24 se lambe routes waise bhi nahi lete.

## Source ke daave aur sudhaar

Video: *System Design [4/15]: The Anatomy of a Request (DNS, BGP, and the Edge)* (`kt1tW0El6Gg`).

- **"connect() par CPU context switch karta hai; kernel URL lekar packet banata hai".** connect() ek syscall hai: CPU user
  mode se kernel mode jaata hai. Context switch ek thread/process se doosre par jaana hai — alag cheez (lab 53 mein bhi
  syscall aur context switch ka farq samjhaya gaya hai). connect() ko peer ka IP aur port milta hai, URL nahi: URL se HTTP
  request banana browser/library ka kaam hai. HTTP/TLS ke bytes send()/write() se socket mein jaate hain; kernel TCP/IP ke
  segments aur delivery sambhalta hai.
- **"Wi-Fi card hawa ko 2.4/5 GHz par vibrate karta hai".** Radio electromagnetic lehar hai; hawa ko hilaana awaaz ka kaam hai.
- **MTU 1,500, 10,000 bytes = 7 packets, 54 bytes headers.** Sahi (bina TCP options). Par TCP sequence number packet ka
  serial number ("5 mein se 1") nahi: segment ke pehle data byte ka stream mein number hai. Lagataar 1,460-byte segments
  ke sequence numbers 1,460 se badhte hain; SYN aur FIN bhi sequence space lete hain. TCP header mein ports, ack, flags,
  window aur checksum bhi hain.
- **"13 root servers A–M".** 13 logical root-server identities A–M hain. Har identity ka ek IPv4 aur ek IPv6 service address
  hai; anycast se har identity ke bahut saare instances duniya bhar mein chalte hain.
- **"DNS lagbhag hamesha UDP 53".** Zyada tar UDP; bada jawab ya zone transfer TCP par jaata hai, aur DNS-over-TLS/HTTPS
  bhi aam ho raha hai.
- **"DNS latency p99 ka silent killer".** ex2 is daave ko naap ke dikhata hai: 5% loss par p99 = 1 s, 1% par p99.9 = 1 s aur ausat dugna.
- **"24 h TTL = 24 ghante redirect nahi kar sakte".** Sabse bura 24 h, par bahut se resolvers pehle hi chhod dete hain
  (ex3: 1 h baad 95.9% abhi bhi purane IP par). Kuch resolvers TTL clamp/ignore karte hain; planned move se pehle TTL ghatao.
- **"Geo DNS user ka IP dekhta hai".** Authoritative server ko aam taur par **resolver** ka IP dikhta hai, user ka nahi.
  EDNS Client Subnet (RFC 7871) se resolver user ke subnet ka hissa bhej sakta hai; public resolver door ho toh geo DNS galat
  jagah bhej sakta hai.
- **"~70,000 autonomous systems".** Video ka number; is lab ne jaancha nahi.
- **"BGP performance nahi, policy dekhta hai".** Sahi (ex6 A).
- **"Anycast BGP ko physically sabse paas wala version dhoondhne par majboor karta hai".** BGP policy aur AS path dekhta hai,
  doori nahi; ex6 B mein Chennai aur Dubai sabse paas wale PoP par nahi pahunche.
- **"Sydney → Virginia handshake teen baar: 450 ms".** Great-circle fiber par bhi 3 RTT kam se kam **470 ms** (ex0);
  asli raasta lamba, toh zyada.
- **"WAF deep packet inspection karta hai".** WAF HTTP request padhta hai, TLS khulne ke baad (edge ya load balancer par).
  DPI network packets ki jaanch ka alag shabd hai.
- **"WAF ne image upload par 40 ms jode".** Order sahi: ex5 mein 1 MiB text par 100 rules ~28–33 ms, 500 rules ~134–139 ms CPU.
- **"L4 almost zero latency, L7 milliseconds".** Is lab mein dono sub-millisecond (A: L4 +~0.07 ms, L7 +~0.1 ms); bada farq
  CPU mein (~2.2–2.6×) aur kaabiliyat mein: L4 path nahi dekh sakta.
- **"Har function mein `is_authenticated` check karna security risk hai; gateway par le jao".** Ulta: gateway par
  authentication aur rate limit achha pehla parda hai, par har service ko apna authorization (kis cheez ki ijazat) phir bhi
  jaanchna chahiye — defense in depth. "Kharab JWT se Python app crash" bhi zaroori nahi; input validation app mein bhi chahiye.
- **"Envoy ya Kong, C++/Rust mein".** Envoy C++ mein hai; Kong OpenResty (Nginx + Lua) par bana hai.

## Files

- `lib/dnswire.js` — DNS wire format ka chhota hissa (encode/decode, A/NS, class IN, hostname subset, 255-byte naam,
  compression pointer, har record ka data length jaancha, IPv4 text jaancha).
- `lib/dns.js` — authoritative logic (`answer()`: zone cut → jawab / NODATA / NXDOMAIN), servers (root, TLD, khanakart.com),
  recursive resolver (sirf kaam ke records, TTL cache, timeout + retry), stub `ask()` (source, QR, ID, naam, type milaata hai).
- `lib/stats.js` — nearest-rank percentile. `lib/geo.js` — great-circle doori aur fiber RTT.
- `lib/waf.js` — 2,000 tak linear-time signature rules aur `scan()`. `lib/bgp.js` — route chunna aur forwarding (model).
- `services/lb.js` — backend, L4 proxy (per-connection round robin), L7 proxy (per-request path routing); CPU IPC par.
- `tools/*.js` — har exercise; `start.js` naam se chalata hai.
- `test/core.test.js` — 13 tests: wire round trip; naam (pointer, 255 bytes — compression se bhi, galat label, aliasing);
  records (A/NS lengths, class, IPv4); authoritative logic (referral, NODATA, NXDOMAIN, REFUSED); kharab query par server
  zinda; `ask()` paanch galat jawab chhod ke sahi leta hai; resolver cache poisoning nahi leta; asli UDP chain + c-ares +
  NODATA; TTL ulti ginti aur expiry (nakli ghadi); loss par retry ka intezaar aur poora fail; L4 path-blind vs L7; WAF; BGP.
  Naam ki hadd, source check, glue filter, zone-cut ka kram aur retry ka samay todne par sahi test fail hota hai (jaancha gaya).

## Practice

1. `TIMEOUT_MS=5000 npm start -- ex2-loss`: 1% loss par p99.9 kya hua? Pehle socho.
2. TTL ki ulti ginti dekhni ho toh `test/core.test.js` ka TTL test padho: nakli ghadi 120 s aage karke remaining TTL 180 s,
   aur 301 s par naya sawaal sirf authoritative tak (NS referrals ki copy 2 din ki). Ghadi ke numbers badal ke chalao.
3. Ek rule `/(a+)+$/` lo aur `"aaa…ab"` par chalao: 20 a, phir 22, phir 24. Har 2 a par samay kitna badha, aur kyun?
   (Feed track ka regex postmortem.) 30 a mat chalana — minute lag sakte hain.
