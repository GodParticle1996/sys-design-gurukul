# Lab 50 — event sourcing: passbook se balance, version ki shart, read model, snapshot, upcast

System Gurukul → Playlist · 2 EDA Core → Event Sourcing (Kyun · Kaise · Code · Kab).
Zero dependency, **Node 24+** (built-in `node:sqlite`). Handler, listener aur projector alag Node processes hain, asli HTTP par;
event store, snapshots aur read model ek hi asli SQLite file mein (alag tables). `ex0-slowmo` wahi code nakli ghadi par chalata hai.

```bash
npm start -- ex0-slowmo --story race --mode any        # do handlers ne ek saath v2 padha, bina version ke likha
npm start -- ex0-slowmo --story race --mode expected   # jo version padha wahi maango
npm start -- ex0-slowmo --story dual --mode dual       # store mein likha, listener ko bhejne se pehle crash
npm start -- ex0-slowmo --story dual --mode catchup    # projector khud store padhta hai
npm start -- ex0-slowmo --story cache --mode cache     # purana cache seedha lauta diya
npm start -- ex0-slowmo --story cache --mode tail      # cache + cache ke baad ke events   (--json bhi)
npm start -- ex1-race         # asli processes: any | expected
npm start -- ex2-projection   # asli crash: dual | together | split | read
npm start -- ex3-replay       # history (as-of) | replay (snapshot) | upcast
npm test                      # 10 tests (teeno asli-process tools samet)
docker compose --profile ex2-projection up --build   # supplied, untested
```

Ports: handlers **5901–5902** (ex1); handler 5911, listener 5912, projector 5913 (ex2). Har tool apne processes khud chalata,
crash par dobara chalata (supervisor) aur aakhir mein band karta hai; DB ek temp folder mein banta aur mit-ta hai.
**Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra

- Event store ek table hai (`lib/events.js`): har account ek stream, events 1, 2, 3… version par, `UNIQUE (stream, version)`.
  Event kabhi badalta ya mitta nahi. Account ki haalat = events ko kram se jodna (`lib/account.js` ka `fold`).
- Asli event stores (Kurrent/EventStoreDB, Marten, Axon…) mein append ke saath expected revision diya jaata hai; yahan wahi
  vichaar ek SQLite transaction mein hai. `pos` ek SQLite autoincrement hai aur SQLite ek waqt ek hi writer chalata hai,
  isliye pos ke kram mein commit hote hain. Postgres sequence ka number commit ka kram nahi hai: pos 10 pending ho aur
  checkpoint 11 ho jaaye toh pos 10 chhoot sakta hai. Sirf kuch ms rukna guarantee nahi — commit-order wala cursor
  (CDC/WAL) lo, ya pending aur rollback wale gaps sambhaalne ka pakka tareeka banao, aur dobara padhne par duplicate roko.
- Padhne aur likhne ke beech 20 ms ka kaam, projector ka 50 ms poll, aur 1,000 events par snapshot lab ki settings hain.
- Amount poore rupaye ka positive integer hai; galat amount (−80, 0, 1.5, text) par `invalid`, koi event nahi judta.
- `ex1` mein ek lab barrier hai: dono handlers ke padhne ke baad hi koi likhta hai (`barrier` table). Isliye 20 / 20 ka nateeja
  har run mein pakka hai. Asli system mein do commands ka aisa overlap kabhi-kabhi hota hai — par hota hai.
- `minPos` wala read 2 s tak rukta hai; read model tab bhi peeche ho toh 503 ("read model abhi taiyaar nahi") — purana
  balance safal jawab ki tarah kabhi nahi.
- `ex0` ke 12 captures teeno runs mein byte-identical rahe. `ex1` aur `ex2` ki ginti teeno runs mein wahi rahi; sirf ms badle.
- Crash asli hain: handler aur projector `process.exit(1)` karte hain (sirf ek baar; temp folder ki flag file se).

## ex1-race — padho, jaancho, likho: do handlers ek saath

20 accounts, har ek mein ₹100. Har account par do withdraw ₹80 ek saath — ek handler A ko, ek B ko; dono pehle padhte hain
(barrier), phir likhte hain. Sahi nateeja: ek withdraw hona chahiye, ek mana, balance ₹20.

| Append ka tareeka | Kamyaab withdraw | Mana | Dobara padha | Minus balance | Aakhri balance |
|---|---:|---:|---:|---:|---:|
| `any` (video jaisa: balance jaancho, phir bina version ke jodo) | **40 / 40** | 0 | 0 | **20 / 20** | **−60** |
| `expected` (jo version padha, likhte waqt wahi maango) | 20 / 40 | 20 | 20 | 0 / 20 | 20 |

Balance ki jaanch handler mein thi, par dono handlers ne v2 (₹100) padha tha. `expected` mein doosre ka append
"expected v2, stream v3 par" se mana hua; handler ne dobara padha (₹20) aur command mana kiya.

## ex2-projection — store aur read model ek jaise rahe?

10 accounts (₹100). Har account se ek withdraw ₹30. Phir har account ka store (fold) vs read model (`balances` table).

| Mode | Client ko error | Crash | Store ≠ read model |
|---|---:|---:|---|
| dual: store mein likho, phir listener ko bhejo; 4th command par beech mein crash | 1 | 1 | **1**: a4 store 70, read model 100 |
| together: projector store padhta hai; apply + checkpoint ek transaction; apply ke baad crash | 0 | 1 | 0 |
| split: wahi crash, par apply aur checkpoint alag transactions | 0 | 1 | **1**: a4 store 70, read model **40** |

- **dual:** client ko error mila, par paisa store mein kat chuka tha (a4 = 70). Listener store nahi padhta, isliye read model
  hamesha 100 dikhata hai. Projector store se padhe toh event chhootta nahi — par client ka error phir bhi rehta hai; client
  ko command id ke saath dobara bhejna aur handler ko us id par duplicate pakadna chahiye.
- **split:** apply commit hua, checkpoint nahi; restart par wahi event dobara laga: ₹30 do baar kata (40).
- **read (koi crash nahi):** har command ke turant baad read model padha: **10 / 10 purana** (projector 50 ms par poll karta
  hai). Command ka `pos` saath bhej ke `minPos` tak ruke: 10 mein se 10 reads poore hue, 0 / 10 purana, intezaar **31–48 ms**
  (teen runs). Koi read fail ho toh tool error deta hai, adhura nateeja nahi.

## ex3-replay — itihaas, snapshot, upcast

| Hissa | Nateeja |
|---|---|
| history | a1: Opened → 0 · Deposited 50 (ravi) → 50 · Deposited 60 (salary) → 110 · Withdrawn 20 → 90. "v3 par balance" = 110 |
| replay | 1,00,350 events: shuru se fold **137–144 ms** (1,00,350 padhe) · snapshot v1,00,000 + 350 padhe: **0.5 ms**; dono 2,50,880 |
| upcast | 5 events, 2 purane schema 1 (`MoneyAdded {amt}`): bina upcaster balance **50**, upcaster ke saath **130**; events table ka hash pehle aur baad wahi |

(Replay ke ms ex3 ke teen captures ki range hain; machine par badlenge. Padhe gaye events ki ginti nahi badalti.)

## Source ke daave aur sudhaar

Video: *Event Sourcing: Genius or Just Over-Engineering?* (`wXg_aON4oj8`), Software Developer Diaries.

- **"Snapshot DB aur event store immediately consistent hain; padho, compare karo, likho."** Video ka code balance jaanch ke
  event jodta hai, par version nahi maangta. Do commands ek saath aayein toh dono purana balance dekhte hain (ex1: 20 / 20
  accounts minus mein). Microsoft: "Event stores address this scenario by using optimistic concurrency control and reject
  an append if the stream changed since it was read." Kurrent client mein expected revision `any` ka matlab "No concurrency
  check"; doosre options par stream us haalat mein na ho toh "an exception will be thrown"
  ([Kurrent: appending events](https://docs.kurrent.io/clients/node/v1.3/appending-events.html)).
- **"Pehle cache (Redis); cache ho toh wahi lauta do."** Cache purana ho sakta hai (doosre instance ne likha). Cache ke
  version ke baad ke events store se padho, aur likhte waqt version maango (ex0 cache story).
- **"Event store mein save karo aur saath hi RabbitMQ ko bhejo."** Do alag writes hain: beech mein crash hua toh event store
  mein hai, read model mein kabhi nahi (ex2 dual). Projector store se apne checkpoint ke baad padhe, aur checkpoint usi
  transaction mein likhe jismein read model badla (ex2 together vs split) — ya outbox.
- **Snapshots.** Microsoft: "create snapshots at specific intervals, such as every *N* events" aur "Snapshots are an
  optimization, not a replacement for the eventstream." Fold ka code badle toh purane snapshots dobara banane padte hain.
- **Versioning: "do if statements".** Microsoft: "you should never update the event data"; tareeke mein "Include a version
  identifier in each event" aur "Upcasting: Register transformation functions that convert older event schemas to the
  current schema during deserialization." Lab ka `upcast()` yahi karta hai (ex3).
- **Eventual consistency.** Microsoft: "The system is only eventually consistent when it creates materialized views or
  generates projections of data by replaying events." Ex2 read: turant padha toh 10 / 10 purana; `minPos` se ruk ke padha
  toh 0 / 10.
- **Video ka Microsoft quote.** Video "permeates through the entire architecture … all future design decisions are
  constrained" padhta hai. Aaj ke page par likha hai: "Event sourcing is a complex pattern that introduces significant
  trade-offs" aur "after you adopt the pattern, it constrains future design decisions in the parts of the system that use
  it" ([Microsoft: Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)).
  Faisla poore system ka nahi, system ke us hisse ka hai jahan pattern laga.
- Event sourcing, CQRS aur Kafka alag cheezein hain. Event sourcing = sach ka source events; CQRS = likhne aur padhne ke
  alag model. Lab mein dono saath hain, par ek doosre ke bina bhi chalte hain.

## Files

| File | Kaam |
|---|---|
| lib/events.js | event store: `append(expected)` (`any` ya version), `readStream`, `readAll` (pos ke kram mein) |
| lib/account.js | `fold` (events → haalat), `upcast` (schema 1 → 2 padhte waqt) |
| lib/handler.js | withdraw: padho → faisla → likho; conflict par dobara padho |
| lib/projector.js | read model: `catchUp` (together / split), `applyToReadModel` |
| lib/store.js · lib/http.js | asli SQLite file (WAL, busy timeout); asli HTTP helper (lab 49 jaisa) |
| services/handler.js · listener.js · projector.js | command API; video jaisa listener; catch-up projector + `/balance?minPos=` |
| tools/stack.js | processes chalao, crash par dobara chalao, band karo; shart poori na ho toh error |
| tools/slowmo.js · race.js · projection.js · replay.js | ex0 · ex1 · ex2 · ex3 |

1. `race.js` mein `GAP_MS` 20 se 0 karo. `any` mode mein minus balance kitne bache — race gayi ya chhupi?
2. `projector.js` (service) mein `POLL_MS` 50 se 5 karo. `read` mode ka "turant padha purana" kitna hua?
3. `account.js` mein `Deposited` ka naya schema 3 socho (amount paise mein). Upcaster mein kya jodoge, aur purane snapshots ka kya?
