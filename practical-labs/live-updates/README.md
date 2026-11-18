**KhanaKart live updates — build, break, recover**

Node 24+ chahiye. Koi npm package nahi chahiye. Lab `node:sqlite` use karta hai.
Code ek local teaching server hai. Login, distributed workers aur production deployment included nahi hain.

```bash
cd sys-design-gurukul
node practical-labs/live-updates/test.cjs
node practical-labs/live-updates/server.cjs
```

Server ek free loopback port choose karta hai. Terminal ka printed URL browser mein kholo.
Data ek fresh temporary directory mein rehta hai. Existing app/database use nahi hota.
Ctrl+C server stop karta hai aur sirf lab ki temporary directory remove karta hai.

**Replay decision ko terminal mein badlo**

Ye commands actual SQLite use karti hain. Browser aur HTTP server ki zaroorat nahi. Har command ek fresh memory database banati hai.

```bash
node practical-labs/live-updates/replay.cjs --head 4 --retain 3 --cursor 1
node practical-labs/live-updates/replay.cjs --head 4 --retain 3 --cursor 0
node practical-labs/live-updates/replay.cjs --head 7 --retain 5 --cursor 2
node practical-labs/live-updates/replay.cjs --head 7 --retain 5 --cursor 1
node practical-labs/live-updates/replay.cjs --head 7 --retain 5 --cursor 7
```

`head` last saved sequence hai. `retain` recent history mein kitne changes rakhne hain. `cursor` last applied sequence hai. Output ka `replayFloor` sabse purana cursor hai jiske baad ki poori history available hai.

| Head / retain / cursor | Retained sequences | Expected mode and rows |
|---|---|---|
| 4 / 3 / 1 | 2, 3, 4 | `replay`: 2, 3, 4 |
| 4 / 3 / 0 | 2, 3, 4 | `reset`: current snapshot at 4 |
| 7 / 5 / 2 | 3, 4, 5, 6, 7 | `replay`: 3, 4, 5, 6, 7 |
| 7 / 5 / 1 | 3, 4, 5, 6, 7 | `reset`: current snapshot at 7 |
| 7 / 5 / 7 | 3, 4, 5, 6, 7 | `replay`: empty rows; already at head |

Demo inputs 0–100 tak limited hain; retention at least 1 honi chahiye. Cursor saved head se aage ho toh `Invalid cursor` milega. Application ko invalid input aur valid empty replay alag handle karne chahiye.

| Experiment | Tum kya karo | Expected observation | Meaning |
|---|---|---|---|
| Live update | Printed URL do tabs mein kholo. Ek tab mein next status dabao. | Dono tabs same new sequence dikhayenge. | SSE server se browser tak text event bhejta hai. |
| Automatic reconnect | Server se connection todo button dabao. | Same EventSource reconnect karega. Received event ID request header mein ja sakta hai. | Reconnection transport behavior hai; history query app code mein hai. |
| Fresh connection | Updates pause karo, doosre tab mein 4 changes karo, phir naya EventSource kholo. | Fresh snapshot current sequence dikhayega. | New EventSource previous object's cursor inherit nahi karta. |
| Retention | Store test dekho: head 4, retained events 2–4. | Cursor 1 gets replay; cursor 0 gets reset snapshot. | Cursor ke baad ki poori history available honi chahiye. |
| Duplicate update | `test.cjs` ka duplicate case chalao. | Same version se screen state dobara change nahi hoti. | Current-state replacement idempotent hai; external side effects covered nahi. |
| Failed commit | Test trigger head update reject karta hai. | Event insert aur head update dono rollback hote hain. | One transaction partial saved history ko rokti hai. |

**Practice**

1. Polling interval 5 seconds aur 600 clients ka average request load khud calculate karo. Phir 1-second freshness requirement lagao. Budget fit hota hai?
2. `new EventStore(filename, 3)` ki retention ko 5 karke expired-cursor boundary reason karo. Test expectations ko blind update mat karo; kaunse sequence retained honge, pehle likho.
3. `resume()` se stream filter remove karne par kya leak ho sakta hai? Existing scoped-replay test mein order-99 add karne ka reason samjhao.
4. Snapshot recovery current order screen ke liye useful hai. Billing consumer ke liye kaunsa missing guarantee chahiye?

<details>
<summary>Worked answers — prediction ke baad kholo</summary>

1. **Polling:** 600 ÷ 5 = 120 requests/s. Is lesson ka request budget 150 requests/s hai. Poll-only wait budget 5 seconds ho toh calculation fit hai. 1-second wait chahiye toh interval at most 1 second hoga: 600 ÷ 1 = 600 requests/s. Dono budgets polling ke is model mein saath fit nahi hote. SSE evaluate karo; SSE ka connection aur update-delivery cost bhi measure karna hoga.
2. **Retention 5:** head 7 par last five changes 3, 4, 5, 6, 7 hain. Floor 2 hai. Cursor 2 ka next change 3 available hai, isliye full replay possible hai. Cursor 1 ka next change 2 deleted hai, isliye snapshot reset chahiye. Upar ke commands dono cases khud run karte hain.
3. **Stream scope:** sequence har order ke andar repeat ho sakta hai. Sirf `seq > cursor` filter order-99 ki rows bhi la sakta hai. `WHERE stream_id=? AND seq>?` dono conditions chahiye. Server ko requested order ka authorization bhi alag verify karna hai.
4. **Billing:** latest order snapshot se pata nahi chalta ki kaunsa charge complete hua. Har billable event ka durable work record aur processing result rakho. Provider ke saath same idempotency key use karo, taaki retry same operation ko identify kare. Ambiguous timeout ke baad provider ka result reconcile karo. Required work pending ho toh uska only durable record retention job se delete mat karo.

</details>

`store.cjs` ka sequence per stream hai. Writer event, head aur snapshot same SQLite transaction mein commit karta hai. Ye design ek synchronous writer use karta hai. Multiple nodes/multi-writer commit ordering ke liye contract dobara design karna hoga.

`server.cjs` replay aur subscriber registration same synchronous turn mein karta hai. Is local process mein write beech mein interleave nahi hoti. Multi-server deployment ke liye ye reasoning enough nahi hai.

Slow response par `write()` false ho toh sample connection close karta hai. Client ko recover karna padega. Production policy mein drain handling, bounded buffers, connection limits aur monitoring choose karo.

Actual test run: real SQLite, duplicate/stale state, stream scope, bad cursors, injected transaction failure, retention boundary, database close/reopen aur SSE text frame passed. HTTP server/browser delivery ka result separate `http-test.cjs` check mein record hota hai. Offline store tests network delivery prove nahi karte.

References: [WHATWG EventSource](https://html.spec.whatwg.org/multipage/server-sent-events.html), [Node HTTP response writes](https://nodejs.org/api/http.html#responsewritechunk-encoding-callback).
