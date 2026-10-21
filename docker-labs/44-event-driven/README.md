# Lab 44 — ek order, alag-alag kaam

System Gurukul → Playlist · 2 EDA Core → Event-Driven Architecture (Kyun · Kaise · Code · Kab).
Zero dependency Node 18+. `lib/bus.js` aur `lib/order.js` ko slow motion aur HTTP services dono chalate hain.

```bash
npm start ex0-slowmo
node tools/slowmo.js --mode direct       # ek click = ek ghatna; ghadi tay
node tools/slowmo.js --mode events       # --fast se bina intezaar
node tools/mini.js                      # apne code mein sabse chhota istemaal
node tools/emitter.js                   # asli Node EventEmitter; broker se farak
npm test                               # copy isolation, ack aur publish-failure gap

npm start ex1-compare                   # pehla terminal: chaar services
node tools/compare.js                   # doosra terminal: chaar orders, do flows

npm start ex2-limits
node tools/limits.js                    # koi service nahi: duplicate, cap aur save/publish gap
npm start ex3-crash
node tools/crash.js                     # apna broker child process chalaata aur restart karta hai
```

Ports: broker 5400 · orders 5401 · kitchen 5402 · notify 5403. Restart tool ka apna broker 5404.
`docker compose --profile ex1-compare up --build` ka setup bhi hai. **Is machine par Docker nahi; compose chalaya nahi gaya.**

KhanaKart ki order API pehle order save karti hai. Direct flow kitchen aur notify ke jawab ka intezaar karta hai.
Events flow broker ko `OrderPlaced` deta hai; har subscription ki alag copy hai. API ka `accepted` ka matlab kitchen/SMS poora nahi.
Yahan payment aur stock reservation nahi banaye: payment approved ya stock reserved ka daava API nahi karti.

## Lab ka daayra

- Broker **RAM mein** hai. Publish ka HTTP jawab disk par tikne ka saboot nahi. Asli process restart neeche dikhaya hai.
- Har subscription ka **ek worker**. `read()` entry nahi hataata; `ack()` head ki sahi ID par entry hataata hai.
  Same subscription ke kai workers ke leases/ownership nahi banaye. Is broker ko production message broker mat samjho.
- Default cap **20 pending copies per subscription**, lab ki apni setting. Koi ek line bhari ho toh publish sab copies daalne se pehle reject hota hai.
- `save()` aur `publish()` do alag operations hain. Publish fail ho toh saved order rehta hai. Outbox ka masla yahin se shuru hota hai; is lab ne outbox solve nahi kiya.
- HTTP worker har 10 ms par apni line poochhta hai. **Events ka matlab polling ya HTTP ka gaayab hona nahi.**
- Duplicate demo ek hi entry ko ack se pehle do baar padhkar dikhata hai. `Set` wala bachav isi process ki yaad hai; restart ke paar durable deduplication nahi.

## ex0-slowmo — pehle dikkat, phir badlaav

Nakli ghadi ke scenario knobs: kitchen 100 ms; direct notify ka failed jawab 1000 ms; broker publication 10 ms.
Yeh delays lab mein tay kiye hain, real network ka measurement nahi. Ghadi ke state changes asli `lib/order.js` aur `lib/bus.js` se aate hain.
Events scenario mein notify 1.50 s par wapas aata hai aur 100 ms mein kaam karta hai.

### Seedhe calls

```text
0.00 s  Asha ne order #1 bheja | saved=0 kitchen=0 notify=0 pending=0/0 HTTP=intezaar
0.00 s  Order #1 save hua | saved=1 kitchen=0 notify=0 pending=0/0 HTTP=intezaar
0.10 s  Kitchen ne #1 liya | saved=1 kitchen=1 notify=0 pending=0/0 HTTP=intezaar
1.10 s  Notify ka jawab fail | saved=1 kitchen=1 notify=0 pending=0/0 HTTP=intezaar
1.10 s  Asha ko jawab: order save tha, par HTTP fail | saved=1 kitchen=1 notify=0 pending=0/0 HTTP=503
```

### Har listener ki apni copy

```text
0.00 s  Asha ne order #1 bheja | saved=0 kitchen=0 notify=0 pending=0/0 HTTP=intezaar
0.00 s  Order #1 save hua | saved=1 kitchen=0 notify=0 pending=0/0 HTTP=intezaar
0.01 s  OrderPlaced ki do copies line mein | saved=1 kitchen=0 notify=0 pending=1/1 HTTP=intezaar
0.01 s  Asha ko accepted mila; kitchen/notify abhi baaki | saved=1 kitchen=0 notify=0 pending=1/1 HTTP=202
0.02 s  Kitchen ne apni copy padhi; entry abhi line mein | saved=1 kitchen=0 notify=0 pending=1/1 HTTP=202
0.12 s  Kitchen ka kaam + ack; sirf kitchen ki copy hati | saved=1 kitchen=1 notify=0 pending=0/1 HTTP=202
0.12 s  Notify band hai; notify ki copy line mein ruki | saved=1 kitchen=1 notify=0 pending=0/1 HTTP=202
1.50 s  Notify wapas; purani copy padhi | saved=1 kitchen=1 notify=0 pending=0/1 HTTP=202
1.60 s  Notify ka kaam + ack; notify ki copy bhi hati | saved=1 kitchen=1 notify=1 pending=0/0 HTTP=202
```

Seedhe calls: order save aur kitchen ka kaam ho chuka; phir bhi Asha ko 503 mila. Events: 0.01 s par accepted,
par kitchen 0.12 s aur notify 1.60 s par poora hua. Kaam jaldi poora hone ka daava nahi; intezaar ka raasta badla.

### mini.js — apni app mein wiring

```text
API: accepted
notify pending: 1
kitchen: OrderPlaced 1
kitchen pending: 0
notify pending: 1
```

## ex1-compare — asli HTTP, teen run

Kitchen ka artificial work delay 40 ms; notify offline aur direct call ko fail hone se pehle 200 ms delay.
Har flow mein chaar sequential orders. Worker counts API ke jawab ke baad bhi query hote hain; kitchen ke chaaron kaam ka intezaar kiya jaata hai.

Pehle run ka output:

```text
direct: HTTP 503/503/503/503 · median 250 ms
  saved 4 · kitchen 4 · notify 0 · notify pending 0
events: HTTP 202/202/202/202 · median 7 ms
  saved 4 · kitchen 4 · notify 0 · notify pending 4
  notify wapas: 4 · pending 0
```

| Jo naapa | Direct | Events |
|---|---|---|
| API median, teen runs | 248–250 ms | 4–7 ms |
| API codes, har run | chaar 503 | chaar 202 |
| Orders saved / kitchen poore | 4 / 4 | 4 / 4 |
| Notify offline: poore / pending | 0 / 0 | 0 / 4 |
| Notify wapas: poore / pending | koi automatic delivery nahi | 4 / 0 |

202 aur 503 alag promises hain. Tez 202 ka matlab business ka saara kaam poora hona nahi.
Sinks ka effect sirf order ID ko memory array mein rakhna hai; asli SMS bheja nahi gaya.
`captures/compare-1.txt` se `compare-3.txt` tak teeno raw runs hain (2026-10-20, Node v24.18.0).

## ex2-limits — jo faayda mila, uski keemat

```text
fanout: kitchen pending 0 · notify pending 1
kaam ke baad ack na pahunche: same id do baar padha · SMS 2
id yaad rakhi (isi process mein): SMS 1
broker ki RAM dobara bani: pending copies 8 → 0 · chaar events ki dono copies gayi
cap 2: saved 3 · kitchen pending 2 · notify pending 2 · publish fail 1
save + publish ek transaction nahi: order #3 save hua, event nahi gaya
```

Pehli line: kitchen ka ack notify ki copy nahi mitaata. Doosri: kaam aur ack ke beech failure ho toh dobara kaam ka khatra.
Chauthi line **naya createBus object banane ka model** hai; process sach mein restart karne ka alag experiment neeche hai.
Aakhri do lines: cap 2 par teesra order save ho gaya, par teesra event publish nahi hua. Do writes ko ek transaction kehna galat hoga.

## ex3-crash — broker ka asli process restart

Tool ne apna broker child process chalaaya, chaar publish ke successful HTTP replies liye, pending state padhi,
usi PID ko SIGTERM diya, aur naya broker process chalaaya. Koi event consume nahi hua. Teeno runs ka output ek jaisa:

```text
asli broker process restart: kitchen 4 → 0 · notify 4 → 0
publish ke HTTP jawab mil chuke the; RAM ki 8 pending copies gayi
```

Order API is experiment mein chalti nahi. Yeh experiment sirf broker ki RAM wali pending copies ke baare mein hai.
Broker SIGTERM par disk mein kuch save nahi karta. Chaar event IDs ki do-do copies (8) gayi.

## Asli Node library aur official documentation

`tools/emitter.js` sach mein Node ka built-in EventEmitter chalaata hai. Teeno repeat runs ka exact output:

```text
emit se pehle
listener chala
emit ke baad
async emit se pehle
async listener shuru
async emit ke baad
async listener poora
```

[Node Events documentation](https://nodejs.org/api/events.html#asynchronous-vs-synchronous) ke mutabiq listener functions
registration ke kram mein synchronously call hote hain. Listener async ho toh pehle await ke baad ka kaam baad mein poora ho sakta hai;
`emit()` async listener ke poora hone ka intezaar nahi karta. Lab output isi farak ko dikhata hai.

[RabbitMQ Publish/Subscribe tutorial](https://www.rabbitmq.com/tutorials/tutorial-three-javascript) ke mutabiq fanout exchange
apne se judi queues ko copies bhejta hai. [Work Queues tutorial](https://www.rabbitmq.com/tutorials/tutorial-two-javascript)
mein ek queue ka kaam workers mein banta hai. Kaam poora hone ke baad consumer ka ack broker ko message hataane ki ijazat deta hai.
Worker failure aur broker restart alag problems hain; tutorial message acknowledgements aur durability ko alag samjhata hai.
**Yeh RabbitMQ ki official documentation se hai; is lab mein RabbitMQ chalaya nahi gaya.** Is lab ka broker unka poora implementation nahi.

## Files

| File | Kaam |
|---|---|
| lib/order.js | seedhe calls aur save + event wale do flows |
| lib/bus.js | har subscription ki alag bounded line; publish / read / ack |
| services/orders.js | wahi functions asli HTTP API mein |
| services/broker.js | wahi bus asli HTTP endpoints par |
| services/worker.js | kitchen ya notify; kaam ke baad ack |
| tools/slowmo.js | fixed clock; same order/bus code; JSON state trace bhi |
| tools/mini.js | sabse chhota apna app |
| tools/compare.js | do flows ko actual HTTP se teen baar naapa |
| tools/limits.js | duplicate, RAM, cap aur dual-write ke chhote scenarios |
| tools/crash.js | apne broker PID ka asli restart; cleanup finally mein |
| captures/ | filled lessons ke numbers ka permanent raw record |

## Khud try karo

1. `tools/mini.js` mein kitchen ka ack hatao. Kitchen ki pending ginti kya hogi? Notify ki ginti badlegi?
2. `tools/limits.js` mein cap 2 se 1 karo. Saved aur published ki ginti ek jaisi rahegi?
3. `tools/compare.js` mein notify ko online rakho. API latency ke saath notify completion bhi dekho.
4. `services/worker.js` mein kaam se pehle ack karo. Uske baad work fail ho toh copy kahan milegi?
