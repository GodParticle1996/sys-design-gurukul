# Lab 51 — event ka design: field ya kaam, haalat ya ghatna, ek aur field, aur schema badalna

System Gurukul → Playlist · 2 EDA Core → Event Modeling (Kyun · Kaise · Code · Kab).
Zero dependency, Node 22+. `ex1`–`ex3` ek process mein, tay kram par (seeded); `ex4` do consumer processes asli HTTP par.

```bash
npm start -- ex1-granular                 # field | generic | intent   (field --trace / intent --trace: har message ke baad)
npm start -- ex2-facts                    # state (BalanceUpdated) vs facts (jo hua)   (--trace)
npm start -- ex3-bloat                    # loyalty ko customerId: addfield-sab | addfield | metadata | readmodel
npm start -- ex4-evolve                   # strict vs tolerant consumer, schema ke 4 roop
npm test                                  # 7 tests (ex4 asli processes samet)
docker compose --profile ex4-evolve up --build   # supplied, untested
```

Ports: consumers **6001** (strict) aur **6002** (tolerant), sirf ex4. **Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra

- `ex1` mein do orders jaan-boojh ke profile ke messages ke beech rakhe gaye hain (alag service ke events bus par beech mein
  aate hain). Asli bus par ye interleave kabhi-kabhi hota hai — lab interleave har baar dikhata hai.
- `ex2` ka din: salary, do ATM withdrawals, card fee aur card fee ki wapsi, ek ₹2,200 UPI payment, interest. State roop lab
  ka control hai: sirf naya aur pichhla balance, business ka type jaan-boojh ke hataya. Video ka "pragmatic" sujhaav business
  fact ke saath amount aur balances dena hai — wahi lab ka facts roop hai.
- `ex3`: 10,000 orders, 40,000 events, CloudEvents jaisa envelope. OrderPlaced 0–30 ms aur payment 25–35 ms par pahunchta hai
  (seed 51); "badle schemas" aur "badli teams" events ki shakal ko baseline se mila ke gine jaate hain, haath se nahi.
- `ex4` sirf consumer ke HTTP 422 ko schema rejection ginta hai; timeout, network error ya 5xx par experiment fail hota hai,
  aur aakhir mein consumers ki apni ginti tool ki ginti se milayi jaati hai.
- Saare captures teen runs mein byte-identical rahe (`captures/`), ex4 samet.

## ex1-granular — ghar badla: teen field, ek kaam

Ravi Pune se Bengaluru gaya (street, city, pin) aur usi form mein email badla. Phir do aur saves: naam, photo. Do orders
profile ke messages ke beech pack hue; label service har order par label chhaapta hai.

| Tareeka | Profile messages | Mile-jule labels | Verifier kitni baar jaaga (kaam ka) |
|---|---:|---:|---:|
| field: har field ek event (property sourcing) | 6 | **2 / 2** — `o1: Lake View 5, Pune, 411001`, `o2: Lake View 5, Bengaluru, 411001` | 1 (1) |
| generic: ek `ProfileUpdated { changes }` | 3 | 0 / 2 | **3 (1)** |
| intent: `AddressChanged` (teeno saath), `EmailChangeRequested`, `NameChanged`, `PhotoChanged` | 4 | 0 / 2 | 1 (1) |

Field events mein courier ko aadha naya, aadha purana address mila. Generic event address ko saath rakhta hai, par email
verifier ko har profile save par jaag ke `changes` mein email dhoondhna pada (3 mein se 1 kaam ka). Business ke kaam ke hisaab
se events mein dono theek: address ek saath, aur email ka badlaav apna event jo verification shuru karta hai.

## ex2-facts — "balance badla" ya "kya hua"?

Shuru ₹10,000; 7 kaam. Teen consumers ke sawaal:

| Roop | ₹2,000 se bade ATM withdrawals (sahi 2) | Card fee ka net (sahi 0) | Teesre event par ₹500 kyun kata? |
|---|---:|---:|---|
| state: `BalanceUpdated { balance, previous }` | **3** (₹2,200 UPI bhi ATM maan liya) | **pata nahi** | pata nahi (sirf 12,500 → 12,000) |
| facts: `SalaryCredited`, `CashWithdrawn`, `FeeCharged`, `FeeReversed`, `UpiPaid`, `InterestCredited` | 2 | 0 | `FeeCharged` (card annual fee) |

Pichhla balance saath bhejne se badlaav (delta) nikal aata hai, par wajah nahi. Fraud ko false alarm mila, fee report bani hi
nahi, aur audit ka jawab sirf do numbers hain.

## ex3-bloat — loyalty ko customerId chahiye

Baseline 6.18 MB; loyalty ke sahi points 2,55,519.

| Tareeka | Payload schemas badle | Producer teams badli | Bytes | Loyalty ke points |
|---|---:|---:|---:|---|
| addfield-sab (video ka bura example): PaymentCaptured, OrderShipped, OrderDelivered, teeno mein `customerId` | 3 | 2 (payment, shipping) | +617 KB | sahi |
| addfield: sirf PaymentCaptured mein `customerId` (loyalty ko bas yahi chahiye) | 1 | 1 (payment) | +206 KB | sahi |
| metadata: sirf PaymentCaptured ke envelope mein extension attribute `customerid` | 0 | **1** (payment) | +206 KB | sahi |
| readmodel: loyalty OrderPlaced se apni `orderId → customerId` copy banata hai | 0 | 0 | +0 KB | parking ke saath sahi; **bina parking 369 payments ke points gaye** |

Har event mein field (addfield-sab) loyalty ki zaroorat se teen guna kharcha hai: shipping events loyalty padhta hi nahi. Metadata
payload ko saaf rakhta hai, par coupling wahi rehti hai: payment team ko customer ka pata rakhna padta hai, aur bytes wahi. Read model mein producers nahi badalte, par kram ka kaam consumer par aata hai: 369 payments (3.7%) apne OrderPlaced se
pehle pahunche; aise payments ko rok ke (park) rakhna padta hai.

## ex4-evolve — schema badla, consumer toota?

Har roop ke 100 PaymentCaptured events, dono consumers ko, asli HTTP par.

| Producer ka roop | strict (anjaana field = mana) | tolerant (sirf orderId, amount padho) |
|---|---|---|
| v1 `{ orderId, amount }` | theek 100 | theek 100 |
| v2 naya field `method` | **mana 100** | theek 100 |
| v3 `amount` ka naam `total` | mana 100 | **mana 100** (amount nahi) |
| v4 expand: `amount` aur `total` dono | mana 100 | theek 100 |

Naya field jodna tolerant reader ke liye safe hai. Is lab mein amount hataana strict aur tolerant, dono ko todta hai, kyunki
dono amount maangte hain; aisa field hataana jis par koi consumer nirbhar nahi, kisi ko nahi todta. Badlaav ka safe raasta:
pehle strict consumers ko amount aur total dono accept karne layak banao; phir producer dono bheje (expand); consumers total
padhne lagein; amount par nirbhar saare consumers badal jaayein tab producer amount band kare (contract). Purane events dobara
padhne hon toh readers mein amount ka fallback rakho.

## Source ke daave aur sudhaar

Video: *4 Event-Modeling Mistakes in Event-Driven Architectures* (`m3mY3Ra-BcI`), Software Developer Diaries; anti-patterns
Oskar Dudycz ki series se.

- **Property sourcing.** Dudycz: "Publishing events like LastNameChanged is called Property Sourcing. This is an
  anti-pattern." Video ka ilaaj: ek "user profile info updated" event jismein jo badla. Dudycz ka zor business ke kaam par hai:
  "Events should correspond directly to the result of business operations in the system" — aur "sometimes it makes sense to
  create field change events" ([Property Sourcing](https://event-driven.io/en/property-sourcing/)). ex1: generic event ne
  address bacha liya, par email verifier ko har save par jagaya; kaam ke hisaab se events mein dono theek.
- **State obsession.** Dudycz: "it's important not to think about the state change but about what exactly has happened"
  ([State Obsession](https://event-driven.io/en/state-obsession/)). ex2: pichhla balance saath ho tab bhi fee aur ATM alag nahi.
- **Clickbait event.** Dudycz: "Those events are notifying us that something has happened but are not giving any context"
  ([Clickbait event](https://event-driven.io/en/clickbait_event/)). Ye lab 47 (EDA topic 2) mein naapa gaya: patli khabar par
  har consumer owner ko call karta hai. Video "exponential" calls kehta hai; lab 47 mein calls = events × consumers — seedha
  guna, exponential nahi.
- **"Bas ek aur field".** Dudycz: "Decisions about adding a redundant property to the event should always be carefully made"
  ([I'll just add one more field](https://event-driven.io/en/i_will_just_add_one_more_field/)). Video ke do ilaaj, metadata aur
  read model: ex3 dikhata hai ki metadata se producer ki coupling nahi jaati (payment team phir bhi badlti hai), har event mein
  jodna loyalty ki zaroorat se teen guna mehenga hai, aur read model kram ka kaam consumer par daalta hai.
  CloudEvents mein `id` ("Identifies the event."), `source`, `type`, `time` jaise context attributes hain, aur "A CloudEvent MAY
  include any number of additional context attributes with distinct names, known as "extension attributes""
  ([CloudEvents spec](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)) — metadata ka standard jagah.
- **Schema badalna** (video mein nahi, par event ke design ka hissa). Fowler: "be as tolerant as possible when reading data from
  a service" ([Tolerant Reader](https://martinfowler.com/bliki/TolerantReader.html)). Confluent Schema Registry:
  "BACKWARD compatibility means that consumers using the new schema can read data produced with the last schema"
  ([schema evolution](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)).

## Files

| File | Kaam |
|---|---|
| lib/profile.js | profile save → field / generic / intent events; label service; email verifier |
| lib/account.js | din ke 7 kaam → state ya facts events; teen consumers ke jawab |
| lib/reader.js | PaymentCaptured padhna: strict ya tolerant |
| lib/http.js | asli HTTP helper (lab 44 jaisa) |
| services/consumer.js | ex4 ka consumer process (MODE strict / tolerant) |
| tools/granular.js · facts.js · bloat.js · evolve.js · stack.js | ex1 · ex2 · ex3 · ex4 · processes chalana/band karna |

1. `granular.js` mein orders ko pehle save ke saare messages ke baad rakho. Field mode ke mile-jule labels kitne bache — dikkat gayi ya chhupi?
2. `account.js` mein ek `FeeCharged` ₹2,500 ka jodo. State roop ka fraud count kya hua?
3. `reader.js` ke tolerant mode mein `amount ?? total` padho. v3 ka nateeja kya hua, aur ye kaam kis team ka hai?
