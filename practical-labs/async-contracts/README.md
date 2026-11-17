# Short link kab ready hai?

Node.js 24+ ke built-in SQLite se yeh lab chalta hai. Koi package install, Docker, account ya external service nahi chahiye. Commands `sys-design-gurukul` folder mein run karo. Har `run.cjs` invocation fresh in-memory data use karti hai.

Pehle prediction likho: create response ke turant baad redirect `302` hoga ya `404`? `302` mein saved destination milta hai. `404` mein mapping nahi mili.

```bash
node practical-labs/async-contracts/run.cjs early
node practical-labs/async-contracts/run.cjs sync
node practical-labs/async-contracts/run.cjs pending
node practical-labs/async-contracts/run.cjs retry
node practical-labs/async-contracts/test.cjs
```

| Run | Pehli observation | Kya samajhna hai |
|---|---|---|
| `early` | Create `201`, immediate redirect `404`; worker ke baad `302` | Code jaan-boojhkar created jaldi bolta hai. Job save hui; mapping abhi nahi bani. |
| `sync` | Create `201`, immediate redirect `302` | Mapping aur analytics intent ek transaction mein commit hote hain. Redirect same primary database padhta hai. |
| `pending` | Create `202`, job pending; worker ke baad job done | Client ko status location milti hai. Accepted ka matlab completed nahi hai. |
| `retry` | Consumer count 1, sender intent unsent; retry ke baad count phir bhi 1 | Consumer commit ke baad sender fail ho sakta hai. Same event ID ki duplicate delivery ko consumer pehchaanta hai. |

Ab changes karke dekho:

1. `createLink()` ke `early` branch ko `202` aur `/jobs/abc` response do. Sirf status number badalna enough nahi: client ko pending state aur completion check bhi chahiye.
2. `work()` ka `afterMapping` failure point use karo. Mapping, event intent aur job completion ek transaction mein hone se partial result commit nahi hota.
3. `Analytics.receive()` mein duplicate protection ke role ko padho. Seen ID aur counter ek consumer transaction mein save hote hain. Dono ko alag commits mein rakhne se ek naya crash gap banega.
4. Interview extension: redirect ko lagging replica par bhejo toh synchronous create ke baad bhi `404` aa sakta hai. Primary read, consistency token ya bounded wait ki policy explain karo. Is lab mein replica simulate nahi hui hai.

`test.cjs` sirf apni temporary directory banata aur remove karta hai. Do child processes intentionally transaction ke beech aur consumer commit ke baad exit karte hain. Yeh actual process-exit recovery test hai; power-loss durability, distributed queue behavior, multi-worker leases aur external analytics delivery ka proof nahi.

Lab HTTP-style objects print karti hai; HTTP server nahi chalati. Jobs ek local durable SQLite table mein hain. Analytics alag SQLite database use karti hai. Original example app behavior samjhata hai; production auth, quotas, random IDs, job deadlines, retry scheduling aur request deduplication alag implementation decisions hain.

Source context: [System Design School template video, shortener chapter](https://www.youtube.com/watch?v=OWVaX_cBrh8&t=775s). Video async persistence dikhata hai; video exact success-response timing specify nahi karta. `early` scenario hamara original counterexample hai.
