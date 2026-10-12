# 🐳 Lab 16 — Prime Video: boundary ka tax, aur monolith jo copies se scale hota hai

System Gurukul → 🏢 Company Stories → **Why Amazon Gave Up on Microservices** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-boundary-tax                      # store "S3" (4861) + orchestrator "Step Functions" (4862, 200 transitions/s)
node tools/pipeline.js --mode micro --streams 100
node tools/pipeline.js --mode mono  --streams 100      # store ki zaroorat nahi
node tools/replicas.js --streams 200 --copies 4 --detectors
docker compose --profile ex1-boundary-tax up --build   # ya Docker se
```

Video Quality Analysis ka khilona: ek second video = **12 frames × 40 KB**. Har second: converter decode → 3 detectors (block
corruption, freeze, A/V sync) har frame dekhte hain. Har stream ko **real-time** rehna hai (1 second video per 1 second).

| mode | kaise |
|---|---|
| `micro` | converter frames **store** mein PUT karta hai, har detector GET karta hai; har kadam **orchestrator** par ek transition (4 per second of video). Account limit 200 transitions/s (asli limit badi hoti hai — scale chhota, pattern wahi) |
| `mono` | sab ek process mein — frame ek pointer hai, na network, na store, na orchestrator |

## ex1-boundary-tax

```
mode=micro streams=5:   411 video-seconds in 8.3 s → har stream 9.91× real-time ✅   transitions 1644 (throttled 945)
mode=micro streams=20:  417 video-seconds in 8.1 s → har stream 2.56× real-time ✅   transitions 1668 (throttled 3922)
mode=micro streams=100: 471 video-seconds in 9.2 s → har stream 0.51× real-time ❌   transitions 1884 (throttled 22501)
   network par 221 MB likha + 662 MB padha · PUT 5652 GET 16956
   ek stream ka ek ghanta ≈ 14400 transitions + 43200 PUT + 129600 GET ≈ $0.63 (list prices, sirf yeh do services)

mode=mono  streams=20:  1389 video-seconds in 8.0 s → har stream 8.68× real-time ✅
mode=mono  streams=100: 1409 video-seconds in 8.0 s → har stream 1.76× real-time ✅
```

👉 `micro` mein total kaam **~50 video-seconds/s par atak gaya** (200 transitions/s ÷ 4) — streams 5 ho ya 100. 100 streams par
har stream 0.51× real-time: peeche chhoot rahi hai, aur 22,501 calls throttle hui. Video ki kahaani: "mehenga nahi hua — scale
tak **pahunch hi nahi paaya**" (Prime Video ~5% load par limit se takraya).

👉 Frames ki **zindagi ~1 second**, par har frame network par likha gaya, padha gaya (3 baar), durable store mein rakha gaya.
Tax = **payload size × kitni baar boundary paar**. Order id jaisa chhota, kabhi-kabhi = kuch nahi. Video frames × har stream × har
detector = sabse bada bill.

👉 `mono`: wahi kaam, ek process, frame bas ek pointer — 100 streams par bhi real-time se tez.

## ex2-replicate — monolith ko copies se scale karo

```
200 streams, 1 copies (200 streams har copy): 1414 video-seconds in 8 s → har stream 0.88× real-time ❌
200 streams, 2 copies (100 streams har copy): 2805 video-seconds in 8 s → har stream 1.75× real-time ✅
200 streams, 4 copies (50 streams har copy):  5556 video-seconds in 8 s → har stream 3.47× real-time ✅

6 detectors = 14.5 GB models, instance RAM = 8 GB → sab ek copy mein nahi samaate. Config se baanto:
  copy-type 1: DETECTORS=color-banding (3.5), block-corruption (3)
  copy-type 2: DETECTORS=av-sync (2.5), freeze (2), caption-sync (2), audio-clipping (1.5)
```

👉 Streams **aapas mein baat nahi karte** (koi join, koi shared state nahi) → poori pipeline ki copies chalao, router bas
stream baant de. 2× copies ≈ 2× kaam. "Scale ke liye tukde nahi, **independence** chahiye."

👉 Detector models RAM se bade ho gaye → dobara microservices nahi; **same code, alag config** (kaunsi copy kaunse detectors
load kare). "Replication se scale, configuration se specialize."

## Khud try karo

1. `LIMIT=2000 npm start ex1-boundary-tax` — ab `micro` 100 streams par kahan rukta hai? (Throttle hata, network/serialization
   ka tax bacha.)
2. `tools/pipeline.js` mein `FRAME_KB = 4` karo (chhota payload). `micro` aur `mono` ka farak kitna ghata?
3. `mono` mode mein ek detector ko `burn(5)` karo (bhaari detector). Baaki detectors par asar? (Isolation kamzor hui — monolith ka bill.)
