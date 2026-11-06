# Lab 47 — event mein kitna data bhejein?

KhanaKart mein order-service order ka owner hai. Delivery ko address, notify ko phone,
aur kitchen ko items chahiye. Zero-dependency Node 18+; services ke beech asli HTTP ka code hai.

Neeche ke numbers **asli HTTP** runs ke hain: paanch alag Node child processes, har experiment teen baar,
teeno runs byte-identical (`captures/http-*-{1,2,3}.txt`, `captures/manifest.json`: 18/18 successful HTTP runs).
Owner-down mein order-service ka process sach mein exit hua (`ownerProcessExited: true`).
Ek opt-in **in-process model** (`--model`) wahi handlers bina sockets ke chalaata hai; uske counters HTTP se
har experiment mein same nikle (`captures/model-*`). **Docker unavailable; compose untested.**

```bash
npm start -- ex0-slowmo --mode thin --fast
node tools/slowmo.js --mode fat           # fixed clock; artificial pacing
node tools/slowmo.js --mode fat --json    # lesson ke liye structured trace

npm start -- ex1-load                    # har tool apni services start/stop karta hai
npm start -- ex2-owner-down
npm start -- ex3-now-then
npm start -- ex4-order-duplicates
npm start -- ex5-delta
npm start -- ex6-size-spread
npm test                                # 12 tests, asli HTTP par (captures/tests-http.txt)

# Bina sockets ka labelled model (HTTP/PID-exit proof nahi):
node tools/load.js --model               # baaki six tools par bhi --model
LAB_TRANSPORT=model node --test --test-isolation=none test/*.test.js
# --test-isolation=none ka command yahan Node 24 par verified hai.
# Node 18+ ke normal runner ke liye: LAB_TRANSPORT=model npm test

docker compose --profile ex1-load up --build   # supplied, untested
```

Ports: broker **5600**, orders **5601**, delivery **5602**, notify **5603**, kitchen **5604**.
HTTP tools ko sequentially chalao. Tool apne child ke IPC-ready message ka intezaar karta hai;
existing service ko reset/kill karke port nahi leta. Bind fail ho toh tool apne children ko band karta hai.
Compose mein har profile ek container mein wahi five Node processes chalaata hai; host ports publish nahi hote.
Ek hi profile ek baar chalao.

## Teen payloads

- **Thin notification:** `{type,id,version}`. Har consumer owner ko GET karke current order leta hai.
  Event ka version batata hai kis change ki notification thi; callback ko us version ka historic read nahi milta.
- **Fat / full-state ECST:** envelope ke `state` mein us version ka poora order.
  Consumer apni local copy rakhta hai, aur kaam ke liye us copy ka ek field padhta hai.
- **Delta:** `changes` mein sirf changed fields aur envelope mein version. Pehla v1 delta poora initial data deta hai.
  Agle deltas top-level replacement patches hain, general JSON Patch ya nested merge nahi.

[Martin Fowler, 7 February 2017](https://martinfowler.com/articles/201701-event-driven.html#Event-CarriedStateTransfer)
ECST ko consumer ke bina source call kiye kaam karne aur apni copy update karne se samjhaate hain.
Old/new-state pairs us pattern ki shart nahi. Yahan full snapshot aur delta ko alag variants rakha hai.
Broker/vendor size limit ka koi claim nahi kiya.

## ex1-load — callback ka load

`tools/load.js`: chaar orders, teen consumers. Har consumer har order ek baar process karta hai.
`captures/http-load-{1,2,3}.txt`: teeno byte-identical.

| Measured counter | Thin | Fat |
|---|---:|---:|
| Order-service reads | 12 = 4 × 3 | 0 |
| Completed consumer work records | 12 | 12 |
| Pending delivery / notify / kitchen | 0 / 0 / 0 | 0 / 0 / 0 |

Consumer work ka matlab memory mein observation record; asli delivery, SMS ya cooking nahi.
Yeh callback count ka scenario hai, throughput ya latency benchmark nahi.

## ex2-owner-down — data ab kahan milega?

`tools/owner-down.js`: pehle 12 copies publish; uske baad owner stop; phir consumption aur do retry rounds.
HTTP mode apne order-service child ko SIGTERM deta hai, exit await karta hai aur health request ka fail hona check karta hai.
HTTP runs mein owner process exit hua aur health check fail hua (`ownerProcessExited: true`).
`--model` sirf owner route unavailable karta hai (`ownerProcessExited: false`); counters phir bhi same.

| Measured counter | Thin | Fat |
|---|---:|---:|
| Queued before owner unavailable | 12 | 12 |
| Completed / stuck after two rounds | 0 / 12 | 12 / 0 |
| Failed callback attempts | 6 | 0 |

Har round mein har consumer first failed entry par rukta hai. Thin ke six attempts teen head entries ke do-do retries hain;
saari 12 entries par attempt hone ka claim nahi. Pending entries ack nahi hoti.
Fat abhi delivered snapshot se kaam kar sakta hai; owner down hone ke baad naya owner update banne ka claim nahi.
Raw runs: `captures/http-owner-down-{1,2,3}.txt`.

## ex3-now-then — “abhi” aur “tab”

`tools/now-then.js` dono owner writes aur publications finish karta hai, uske baad consumers ko step deta hai.
Har cell event-v1 ka observation → event-v2 ka observation hai.

| Consumer | Thin: current callback | Fat: event snapshot |
|---|---|---|
| Delivery | 99 Mango Lane → 99 Mango Lane | 12 Neem Road → 99 Mango Lane |
| Notify | +1-555-0199 → +1-555-0199 | +1-555-0100 → +1-555-0199 |
| Kitchen | [idli] → [idli] | [dal, roti] → [idli] |
| Seen state versions | 2 → 2 | 1 → 2 |
| Reads, all consumers | 6 | 0 |

Event versions dono modes mein 1 → 2 hain. Thin ki do notifications do historic snapshots nahi hain.
Owner ka version-addressable read API hota toh alag experiment hota; yahan aisa API nahi.
Raw: `captures/http-now-then-{1,2,3}.txt`, har consumer ke exact observations included.

## ex4-order-duplicates — local copy ko purana mat karo

`tools/order-duplicates.js`: chaar orders × teen consumers; har order ki delivery sequence v2, v1, duplicate v1.

| Measured counter | Blind overwrite | Ignore version ≤ local version |
|---|---:|---:|
| Wrong final full copies | 12 | 0 |
| Completed records | 36 | 12 |
| Ignored entries | 0 | 24 |
| Final copy version | 1 | 2 |

Version **per order** hai; doosre order ki v1 valid ho sakti hai. Full snapshot v2 pehle aa sakta hai,
kyunki usme v1 ka baseline alag se laana zaroori nahi.
Guard local copy ko stale overwrite se bachaata hai. External side effects ka exactly-once guarantee nahi;
RAM reset ke paar guard/dedup state durable nahi.
Raw: `captures/http-order-duplicates-{1,2,3}.txt`.

## ex5-delta — ek badlaav chhuta toh?

`tools/delta.js`: v1 baseline deliver; v2 address change drop; v3 phone change deliver.
Blind merge ka version 3 hai, phone naya hai, **address abhi 12 Neem Road** hai.
Guard version 1 → 3 ka gap dekhta hai aur owner ka current snapshot fetch karta hai.

| Measured counter | Blind merge | Gap detection + resync |
|---|---:|---:|
| Wrong final full copies | 3 | 0 |
| Reads, all consumers | 0 | 3 |
| Resync per consumer | 0 | 1 |
| Final delivery address | 12 Neem Road | 99 Mango Lane |

Teen consumers ki teen independent copies hain, isliye **one fetch per consumer**, aggregate three.
Kitchen/notify ka used field sahi ho sakta hai, phir bhi stored full order copy galat hai; count full copies ka hai.
Repair owner unavailable ho toh entry pending rehti hai. Newer authoritative snapshot intermediate deltas subsume kar sakta hai.
Last delta lost ho aur agla event kabhi na aaye toh gap check akela loss detect nahi karega.
Version model ko har order ke har change ka contiguous sequence chahiye; filtered streams par isi check ko seedha mat lagao.
Raw: `captures/http-delta-{1,2,3}.txt`.

## ex6-size-spread — chhote event ki bachat, copies ki keemat

`tools/size-spread.js`: chaar orders; har order par initial data, address change, phone change.
Har publication ke baad drain hota hai. 12 published events, 36 consumer deliveries per mode.
`Buffer.byteLength(JSON.stringify(event), 'utf8')` se bytes naape; sirf event JSON.
HTTP headers, broker receipts, acknowledgements, callback bodies, storage aur compression is byte total mein nahi.

| Measured counter | Thin | Fat | Delta |
|---|---:|---:|---:|
| Event bytes v1 / v2 / v3, har order | 43 / 43 / 43 | 143 / 144 / 144 | 133 / 81 / 77 |
| Published JSON bytes, 12 events | 516 | 1724 | 1164 |
| Fanout JSON bytes, 36 copies | 1548 | 5172 | 3492 |
| Owner reads | 36 | 0 | 0 |
| Consumers getting unused event fields | 0 | 3 | 3 |
| Unused business-field deliveries via events | 0 | 72 | 40 |
| Consumers getting phone via event without using phone | 0 | 2 | 2 |
| Such phone deliveries via events | 0 | 24 | 16 |
| Phone via event reaching kitchen | 0 | 12 | 8 |
| Unused business-field deliveries via callbacks | 72 | 0 | 0 |
| Unused phone deliveries via callbacks | 24 | 0 | 0 |
| Phone via callback reaching kitchen | 12 | 0 | 0 |
| Consumers getting unused fields via either path | 3 | 3 | 3 |

“Unused” ka matlab lab ke declared needs: delivery=address, notify=phone, kitchen=items;
metadata id/version/type count nahi hota. Repeat field delivery dobara count hoti hai.
**Thin ka GET bhi full order deta hai**, isliye event mein phone na hone se total privacy exposure zero nahi hua.
Field-filtered callbacks ya consumer-specific projections alag design options hain; yahan measure nahi kiye.
Toy payload sizes kisi production schema ka ratio nahi. Source down, callbacks, schema aur local copy maintenance ko saath dekho.
Raw: `captures/http-size-spread-{1,2,3}.txt`.

## ex0-slowmo — lesson ke liye fixed-clock trace

`tools/slowmo.js` same order/bus/consumer core functions chalaata hai, **HTTP nahi**.
0 ms save v1; 10 ms publish v1; 20 ms save v2; 30 ms publish v2.
100/110/120 ms par delivery/notify/kitchen first event lete hain;
200/210/220 ms par second event. Saare timestamps aur waits artificial hain, observed network latency nahi.
`--fast` sirf wall-clock pacing hataata hai; state trace identical rehta hai.

| After step | Thin reads | Fat reads | Pending delivery / notify / kitchen |
|---|---:|---:|---|
| save v1, 0 ms | 0 | 0 | 0 / 0 / 0 |
| publish v1, 10 ms | 0 | 0 | 1 / 1 / 1 |
| save v2, 20 ms | 0 | 0 | 1 / 1 / 1 |
| publish v2, 30 ms | 0 | 0 | 2 / 2 / 2 |
| delivery v1 + ack, 100 ms | 1 | 0 | 1 / 2 / 2 |
| notify v1 + ack, 110 ms | 2 | 0 | 1 / 1 / 2 |
| kitchen v1 + ack, 120 ms | 3 | 0 | 1 / 1 / 1 |
| delivery v2 + ack, 200 ms | 4 | 0 | 0 / 1 / 1 |
| notify v2 + ack, 210 ms | 5 | 0 | 0 / 0 / 1 |
| kitchen v2 + ack, 220 ms | 6 | 0 | 0 / 0 / 0 |

Exact observations ex3 table ke jaise. `captures/slowmo-{thin,fat}-{1,2,3}.{txt,json}` mein poora trace.

## Proof aur model ki boundary

- `captures/manifest.json` har raw tool run ka command, exit code, SHA256 aur three-run equality record rakhta hai.
  Six HTTP groups, six model groups aur four slowmo output groups byte-identical hain; HTTP success 18/18.
- `test/claims.test.js` selected transport par six scenarios aur trace check karta hai.
  `test/core.test.js` equal-version duplicate, per-order guard, isolation, failed repair, bootstrap,
  retry after recovery, ack scope aur Unicode byte counting check karta hai.
- Bus/order/local copies RAM mein. Save aur publication alag tool calls hain, atomic outbox nahi.
  Worker `/step` se manually advance hota hai; background polling/retry scheduler nahi.
  Ack se pehle crash ka durable side-effect solution nahi banaya.
- Fat ka stored snapshot event ke waqt ka hai; real-world current truth hona guaranteed nahi.
  Monotonic versions, trusted well-formed payloads aur single owner per order is lab ke assumptions hain.

## Files aur khud try karo

| File | Kaam |
|---|---|
| lib/events.js | three event shapes, needs, seed, UTF8 byte count |
| lib/consumer.js | thin fetch, fat copy, stale-version guard, delta gap repair |
| lib/orders.js / lib/bus.js | owner state + read counter / independent queue copies + ack |
| lib/exposure.js | unused fields in event payload and callback response separately |
| lib/http.js | real HTTP transport; lab-only 65536-byte request-body cap |
| services/ | same handlers used by HTTP wrappers and explicit model adapter |
| tools/stack.js / tools/model-stack.js | owned HTTP children / labelled in-process adapter |
| tools/slowmo.js | fixed-clock dry-run material using the shared core |

1. `now-then.js` mein first publication ke baad drain karo. Thin consumer ko kaunsi state milegi?
2. `order-duplicates.js` mein guard off/on karke same v2 dobara bhejo. Copy aur completed count dono dekho.
3. `delta.js` mein v2 drop ki jagah last v3 drop karo. Agla event nahi toh gap kab dikhega?
4. `events.js` mein seed ka phone lamba karo. Event bytes aur unused field-delivery counts mein kya badlega?
