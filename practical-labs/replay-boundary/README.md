# Replay: balance dobara banao, notification dobara mat bhejo

System Gurukul → EDA Core → Event Sourcing → Code. Node 24+; no installation.

From the app folder:

```bash
node practical-labs/replay-boundary/run.cjs
```

Actual SQLite file temporary directory mein banti hai. Run ke baad sirf wahi directory delete hoti hai.
Wallet business rules ek small model hain. Notification sink sirf memory mein event versions record karta hai.
Koi email, payment provider, HTTP server ya production database use nahi hota.

## Pehle predict karo

1. `TopUpRecorded 100`, phir `FeeCharged 10`: balance kitna?
2. Dono events ki notification pehle bhej di. Same notification handler history rebuild mein dobara chala: total attempts kitni?
3. Galat fee ko correct karna hai. Purana event delete karoge ya correction append karoge?
4. Correction ke baad stream ko v2 tak padho. Balance 90 hoga ya 100?

## Output ka matlab

| Experiment | Checked result | Kya seekhna hai |
|---|---|---|
| Two saved events | Balance 90; equal timestamps, distinct versions | Timestamp alone order nahi batata. |
| Rebuild with notifications | Attempts `[1,2,1,2]` | Same external action dobara execute ho sakta hai. |
| Pure rebuild twice | Balance 90; attempts `[1,2]` | `fold` ko notification capability hi nahi di. |
| Fee reversal appended | Balance 100 at v3; 90 at v2 | Current correction purana history erase nahi karti. |
| Same fee reverse again | Error, balance still 100 | Business correction ko bhi duplicate guard chahiye. |
| Stale writer | Version conflict; no extra event | Read ke baad stream badle toh reload and re-evaluate. |
| Unknown event / missing prefix | Explicit error | Incomplete history ko silent success mat banao. |

`model.cjs` mein `fold` ordered records se state banata hai. `append` expected version ko SQLite transaction mein check karta hai.
`reverseFee` old fee ko reference karta hai. Original two records unchanged hone ka assertion hai.
Amounts positive whole teaching units hain; production currency, accounting and authorization model nahi hai.

## Code badlo, phir explain karo

- Fee amount 10 se 25 karo. Original balance 75, reversal ke baad 100 expect karo. Assertions bhi apni calculation se update karo.
- `rebuildAndNotify` ko teen baar chalao. Six attempts milengi. Sirf state reset karne se notification history kyun reset nahi honi chahiye?
- `fold` ke unknown-type error ko silent `continue` mein badlo. Last check fail hona chahiye. Missing money change ko success kehna kyun dangerous hai?
- Reversal ki `ref` 2 se 1 karne wala malformed event `fold` ko do. Top-up fee nahi hai; correction reject honi chahiye.

Real delivery ke retries aur crashes ke liye durable dispatch records, stable idempotency keys, receiver contract aur reconciliation alag design karo.
Is lab ka array exactly-once delivery prove nahi karta. Old projection rebuild ka purpose current view banana hai; old emails resend karna separate, explicit operation hoga.
Database rollback sirf uncommitted transaction undo karta hai. A sent email ko event append karke unsend nahi kar sakte.

Existing deeper practical:

```bash
node docker-labs/50-event-sourcing/start.js ex3-replay
```

Lab 50 actual SQLite mein as-of version, 100,350-event replay, snapshot plus tail, aur old-schema conversion dikhata hai. Timing machine par badlegi.
This companion adds replay side effects and business correction; Lab 50 source is unchanged.

References: [source video](https://www.youtube.com/watch?v=jjhdQwQBBuA), [Fowler: external updates during replay](https://martinfowler.com/eaaDev/EventSourcing.html#ExternalUpdates), [Microsoft: Event Sourcing tradeoffs](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing).
