# 🐳 Lab 30 — DeepSeek: dheemi wire, tez dimaag

System Gurukul → 🤖 AI Companies → **DeepSeek** levels ka lab. Zero dependency Node (18+).

```bash
node tools/router.js               # ex1 — MoE router: free vs aux-loss vs bias (koi server nahi)
npm start ex2-overlap              # peer GPU (5081) — throttled link ~200 MB/s
node tools/trainstep.js            # sequential vs overlapped, BF16 vs FP8
node tools/kvcache.js              # ex3 — KV cache: MHA vs GQA vs MLA
docker compose --profile ex2-overlap up --build
```

## ex1 — 64 experts, par sab ek hi ke paas bhaag rahe hain

```
$ node tools/router.js
routing      sabse busy expert (average ka kitna guna)   lagbhag khaali experts   quality proxy
free             12.4x                                 39 / 64              100.0%
aux (halka)       3.5x                                  0 / 64              91.1%
aux (tez)         1.2x                                  0 / 64              81.9%
bias              1.3x                                  0 / 64              86.8%
```

- **free**: ek expert average se **12×** busy, 39 experts lagbhag khaali → us expert wale GPU ki line mein sab ruke.
- **aux-loss**: halka → bheed abhi bhi (3.5×). Tez → balance aaya (1.2×), par router ki **pasand hi badal di** → quality 81.9%.
- **bias** (DeepSeek-V3, auxiliary-loss-free): har expert ka ek bias sirf **chunne** ke liye; overloaded → neeche, khaali → upar.
  Tez aux jitna balance (1.3×), quality **86.8%**.
- Imaandari: ye toy proxy hai ("chune expert ki asli pasand"). Asli training mein aux-loss ka nuksaan gradients ke through
  hota hai — paper ka claim wahi hai; yahan sirf idea dikh raha hai.

## ex2-overlap — throttled link par ek training step

8 micro-batches, har ek ka compute 60 ms (asli CPU, alag thread). Har micro-batch ke gradients dusre GPU ko: 16 MB (BF16) ya
8 MB (FP8). Link ~200 MB/s (peer service token-bucket se throttle karta hai — H800 jaisa: compute poora, wire patli).

```
$ node tools/trainstep.js
precision  schedule      step time    GPU compute ka hissa
BF16       sequential     1183 ms    41%
BF16       overlapped      775 ms    62%
FP8        sequential      820 ms    59%
FP8        overlapped      532 ms    90%
```

Sequential BF16: GPU **59%** waqt gradients bhejne ka intezaar karta hai. Overlap (micro i bhejte waqt micro i+1 compute):
1183 → 775 ms. FP8 (aadhe bytes): wire par aadha waqt. **Dono milke 2.2× tez — same hardware**, GPU 90% busy.
DeepSeek ne yahi kiya: bottleneck ke liye paisa nahi diya, use chhupa diya.

## ex3 — KV cache: serving ka "forever bill"

DeepSeek-V3 jaisa shape: 61 layers, 128 heads, head dim 128, BF16. GPU ke 80 GB mein se ~40 GB KV cache ke liye (assumption).

```
$ node tools/kvcache.js
tareeka              per token        4k context        32k context        128k context      users per GPU (32k, 40 GB)
MHA (poora)            3904 KB         15.3 GB          122.0 GB          488.0 GB        0 (ek user bhi fit nahi)
GQA (16 groups)         488 KB          1.9 GB           15.3 GB           61.0 GB        2
MLA (latent 576)         69 KB          275 MB            2.1 GB            8.6 GB        18

MLA ka KV cache MHA se 57x chhota.
```

MHA ke saath 32k context par **ek user bhi** ek GPU par fit nahi. GQA: 2. MLA (K/V ko 576-number latent mein compress, zaroorat
par kholo): **18 users**. Training ek baar; serving har request par hamesha — MoE training ka bill kaatta hai, MLA serving ka.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| MoE mein bheed | Bias-based balancing: 12.4× → 1.3×, pasand zyada bachi |
| Patli wire | Overlap + FP8: 1183 ms → 532 ms, same hardware |
| Lambi conversations mehengi | MLA: KV cache 57× chhota, 0 → 18 users per GPU |
