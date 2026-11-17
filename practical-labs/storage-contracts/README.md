# File aur object operations: result predict karo

Run from `sys-design-gurukul`:

```bash
node practical-labs/storage-contracts/run.cjs
```

Node standard library kaafi hai. Program temporary directory banata hai aur cleanup karta hai. Filesystem experiment actual local files aur an open file handle use karta hai. Baaki experiments `model.cjs` ka in-memory object model use karte hain. Cloud account, request ya credentials nahi chahiye. Model mein har operation immediately visible hai; cloud latency, permissions aur durability simulate nahi hote.

## Run karne se pehle predict karo

`draft/` mein `report.txt` aur `budget.txt` hain. Dono ko `published/` par move karna hai.

| Experiment | Pehle prediction | Actual checked result |
|---|---|---|
| Same-filesystem directory rename | Dono children nayi location par milenge? | Haan. Purana directory name absent hai. Pehle khula report handle ab bhi bytes read karta hai. |
| Object copy, then injected failure | Kya poora prefix move ho gaya? | Nahi. `draft/` mein 2 keys hain. `published/` mein sirf report hai. Report ki do copies hain. |
| Report v2 write, budget abhi v1 | Strong immediate reads se matching release milegi? | Nahi. Dono reads current hain, phir bhi report-v2 + budget-v1 milte hain. |
| Complete immutable v2, then manifest switch | Purane aur naye reader ko kya milega? | Ek manifest pin karne wala old reader dono v1 objects padhta hai. Naya reader dono v2 objects padhta hai. |
| Old version se conditional publish | Stale writer new manifest overwrite karega? | Nahi. Precondition fails. Model ka version counter opaque revision token ka stand-in hai. |
| Old generation turant delete | Pinned reader safe hai? | Nahi. Reader ko missing object milta hai. Retention/reclamation policy chahiye. |

Program six PASS lines print karta hai. Assertions observed states check karti hain. Object failure ek deliberately thrown exception hai; process crash, network timeout ya S3 outage ka test nahi.

## Ek change, ek prediction

1. Object copy experiment mein failure se pehle `rename.delete('draft/report.txt')` jodo. Ab source listing mein sirf budget bachega. Do prefixes milkar content rakhte hain, lekin destination complete nahi. Retry ko completed operations pehchaanne honge.
2. `v2/budget.txt` write se pehle `active.json` ko v2 keys par publish karo. Naya reader missing budget dekhega. Sirf manifest atomic hona sufficient nahi: dependencies pehle complete honi chahiye.
3. `readRelease` ke beech active manifest dobara fetch karne ka code likho. First object v1 se aur second v2 se mil sakta hai agar publication beech mein hoti hai. Ek logical read ke liye manifest ek baar pin karo.
4. Stale-publisher experiment mein `reader.version` condition hatao. Purana publisher active pointer ko v1 par lauta sakta hai. Atomic write aur lost-update protection alag promises hain.

Worked repair: unique generation keys par objects upload karo, successful completion verify karo, phir manifest publish karo. Reader ek manifest padhe aur usi listed generation se saare objects padhe. Concurrent publishers conditional update use karein. Old objects readers ke lifetime tak retain karo. Ab bhi authorization, retries, abandoned-upload cleanup aur storage errors handle karne hain.

## Interview mein decision kaise explain karein

Existing editor ko open handles, random writes, file locks aur directory operations chahiye toh compatible file interface evaluate karo. Immutable media bytes ko key se upload/download karna hai toh object interface evaluate karo. File size akela decision nahi. Required operations, correctness, permission model, measured tail latency, request charges aur transfer/restore cost compare karo. Metadata label lagane se searchable catalog automatically nahi banta.

The filesystem run observes local rename behavior. It does not stress concurrent readers, verify all network filesystems, or prove power-loss durability. The object model is a pedagogical counterexample, not an S3-compatible implementation. Real [S3 consistency](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel) gives atomic updates at one key, not multi-key transactions. General-purpose-bucket [copy/delete workflows](https://docs.aws.amazon.com/AmazonS3/latest/userguide/copy-object.html) have separate operations. [Google Cloud hierarchical namespaces](https://docs.cloud.google.com/storage/docs/hns-overview) can support atomic folder rename; check the exact provider and bucket mode. [Linux rename semantics](https://man7.org/linux/man-pages/man2/rename.2.html) describe filesystem and open-handle behavior.

Source evidence: [File vs Object Storage](../../../research/system-design-school/reviews/AV4Ei1qW89o/ANALYSIS.md). App entry: `index.html#level=storage`.
