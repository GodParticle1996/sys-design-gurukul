# Autocomplete: trie, decay aur shards — predict, run, explain

System Gurukul mein `#level=iv-typeahead` kholo (🎤 Interview Designs track). Har run se pehle prediction likho. Yeh original, deterministic, in-memory models hain. Koi server, cache, router, broker ya asli query log run nahi hota.

App folder (`sys-design-gurukul`) mein Node se run karo:

```bash
node practical-labs/typeahead-trie/run.cjs            # saare 10
node practical-labs/typeahead-trie/run.cjs compress
node practical-labs/typeahead-trie/run.cjs bound
node practical-labs/typeahead-trie/run.cjs bottomup
node practical-labs/typeahead-trie/run.cjs decay
node practical-labs/typeahead-trie/run.cjs ranges
node practical-labs/typeahead-trie/run.cjs merge
node practical-labs/typeahead-trie/run.cjs memory
node practical-labs/typeahead-trie/run.cjs down
node practical-labs/typeahead-trie/run.cjs replicas
node practical-labs/typeahead-trie/run.cjs debounce
```

| Experiment | Pehle predict karo | Worked result aur reason (2026-11-16 run) |
|---|---|---|
| compress | car, cart, cardigan, cardigans: plain vs compressed nodes? "card" kis node par? "cardboard" ke baad? | Plain 10, compressed 4. "card" edge "digan" ke beech rukta hai → cardigan ki list. Insert cardboard: edge "d" ke baad kata → split node card; nodes 6; "card" → card ki list. |
| bound | 50,000 queries: compressed nodes 2N se zyada ho sakte hain? | Synthetic corpus (426,826 letters): plain 134,049 (2.68/query), compressed 54,284 (1.09/query) ≤ 2N. Source ka dictionary run (234K words: 760K → 315K) yahan reproduce nahi hua — machine par dictionary nahi. |
| bottomup | Node ki list = khud + children ki top-10. Brute force se farak? | 3,000 queries, 4,313 prefixes: har prefix par bilkul brute force jaisa. Chhote subtree ka top-10 bade wale ke top-10 ko cover karta hai. |
| decay | Fad (50k/din, 7–13 din pehle) vs riser (2k/din, pichhle 3 din)? Half-life 7 din par? | Half-life 1 din: fad 775.15, riser 3,500 (source slide jaisa). Half-life 7 din: fad 132,589, riser 5,452 — ranking ulat gayi. |
| ranges | Slide ki table a–h, i–r, sa–sm, sn–sz, w–z: "tesla" kahan? | Kahin nahi: t, u, v uncovered. Fixed table … sn–sz, t–z. Digits/space/doosri scripts ke liye bhi range chahiye. |
| merge | "s" do shards par: dono top-10 merge = global top-10? | Haan (5,000 random-score queries: 7 sa–sm se, 3 sn–sz se). Shart: scores ek scale par. |
| memory | 200M nodes × 10 × 8 B? 4-byte id? scores? | 16 GB (14.9 GiB) lists; text 2 GB; plain worst 160 GB. 4-byte ids: 8 GB; scores +8 GB. Source widget ka 100M × 120 B = 12 GB alag assumption hai. |
| down | a–h ki saari copies down: "c", "ca", "car", "sap"? | c, ca: cache. car, card: khaali. sap: normal. Range sharding mein doosre shards "car" nahi bhar sakte. |
| replicas | 300k/s shards tak, chosen shares, 50k/s per copy, +1 spare: kitni copies? | a–h 3, i–r 3, sa–sm 3, sn–sz 2, t–z 2 = 13, na ki 300k/50k = 6. |
| debounce | 150 ms debounce, "car rental": 80 ms/key aur 250 ms/key typist kitni requests? | Fast: 1 (sirf "car rental"). Slow: 10, jinme 2 (c, ca) short-prefix cache tak. Source ~5 average maanta hai. |

Model ki seemayein:

- Trie code sirf lowercase strings ke liye hai; Unicode normalization, case folding, blocklist aur deletes nahi.
- `bound` ka corpus seeded syllables se bana hai; asli query log ka shape alag hoga. Upper limit (≤ 2N) kisi bhi corpus par sach hai; ratio corpus par depend karta hai.
- `replicas` ke shares chosen numbers hain; asli shares query log aur cache hit rate se naapo.
- `debounce` model mein har key ke beech same gap hai. Asli typing mein gap badalta hai, mobile keyboards suggestions dete hain, aur network latency bhi hai.

Ek input badlo, pehle output explain karo:

1. `compress`: "cardboard" ki jagah "car" dobara insert karo. Nodes kyun nahi badle? (car pehle se end node hai.)
2. `decay`: half-life 1 din rakho par fad ko 1–7 din pehle le aao. Kaun jeetega?
3. `ranges`: fixed table mein `t–z` ko `t–v` aur `w–z` mein todo. Kya sab cover hai?
4. `merge`: ek shard ke scores ko 100 se multiply karo (alag scale). Merged list global se match karegi?
5. `replicas`: spare hatao (`+ 1` hatao). Kis shard par ek copy girne se load capacity se upar jaayega?

Interview line: "Trie mein har node par top-10, offline build bottom-up. Range shards, table poori; 's' jaisa split prefix do lists merge karta hai. Swap ek build id par. Shard down par sirf replicas bachaati hain."

Further reading: [Radix tree (compressed trie)](https://en.wikipedia.org/wiki/Radix_tree), [Exponential decay / half-life](https://en.wikipedia.org/wiki/Half-life). Source diagrams aur arithmetic ne review motivate kiya; learner examples aur code independently likhe gaye hain.
