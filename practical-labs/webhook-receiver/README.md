# Webhook signature ka practical experiment

`sys-design-gurukul` folder mein run karo:

```bash
node practical-labs/webhook-receiver/run.cjs
```

Lab Node.js ka real HMAC-SHA256 use karti hai. Secret randomly memory mein banta hai. Kisi account, `.env`, network endpoint ya saved credential ki zaroorat nahi.

Pehle predict karo: same JSON ko spaces hataakar serialize karne se signature pass hogi? **Nahi.** JSON meaning same ho sakti hai; signed bytes change hui hain. Raw request bytes ko verification se pehle parse-and-reserialize mat karo.

Expected results:

- Original fresh bytes: ACCEPT.
- Same JSON, changed whitespace: REJECT.
- Changed amount: REJECT.
- Old signed delivery, 301 seconds later: REJECT.
- Same event freshly signed for a legitimate retry: ACCEPT.
- Same signed delivery repeated inside tolerance: ACCEPT.

Last result se samjho: signature verification aur duplicate business effect protection alag kaam hain. [SQL Gurukul deduplication lab](../../../sql-gurukul/practical-labs/event-dedup/README.md) mein actual two-worker race aur transaction repair run karo.

`signature.cjs` original teaching protocol hai. Header format aur fixed 300-second tolerance explicitly lab choices hain. Production provider ke official SDK ko exact raw body, signing header aur endpoint secret do. Provider-specific rotation, multiple signatures, clock policy aur payload limits follow karo. Is lab ke simplified parser ko Stripe implementation mat samjho.

Code-change exercises:

1. Original payload mein sirf spaces badlo. Semantic JSON equality aur byte equality ka farq observe karo.
2. `now` ko 300 aur 301 seconds aage karke boundary compare karo. Lab 300 accept aur 301 reject karti hai.
3. Same event ko fresh timestamp se sign karo. Event ID same rehne par consumer deduplication kyun chahiye, explain karo.
4. Business workflow likho: verify → durable intake → provider-compatible receipt → worker commit → queue acknowledgement. Receipt lost hone par duplicate retry ka path mark karo.

Signature bytes ki authenticity/integrity check karti hai; body ko encrypt nahi karti. TLS aur endpoint access policy separate concerns hain. [Stripe verification documentation](https://docs.stripe.com/webhooks#verify-webhook-signatures-with-official-libraries) describes the production provider contract.
