# 🐳 Lab 11 — AI agent ko deewar ke andar rakho (containment)

System Gurukul → 🤖 AI Companies → **AI Safety** levels ka lab.
Video ki baat: "safety" do alag cheezein hain — **filter** (model prompt padh ke haan/na kehta hai) aur **containment**
(sandbox, network deewar, monitoring, limits). Yeh lab sirf **containment** banata hai aur naapta hai.

"Agent" yahan koi AI model nahi hai — `tasks/*.json` mein likhe tool calls ka ek script hai, taaki lab har baar same chale.
Har tool call ek containment layer se guzarti hai:

| Deewar | Kya karti hai |
|---|---|
| 🌐 egress allowlist | sirf `docs.internal` tak network; baaki har host block + log |
| 📁 workspace jail | file read/write sirf `workspace/` ke andar |
| ⏱️ budget | max 40 tool calls, max 400 ms CPU |
| 👀 monitor + kill switch | 10 calls mein 3 blocked, ya task "done" ke baad 2 aur calls → alert → agent band |

```bash
npm start ex1-containment                          # web (4801) + runner (4802)  — Node 18+, koi npm install nahi
docker compose --profile ex1-containment up --build   # ya Docker se
```

## ex1-containment — achha agent, bigda agent, teen modes

```bash
node tools/run.js --task research --mode none
node tools/run.js --task research --mode contain
node tools/run.js --task runaway  --mode none
node tools/run.js --task runaway  --mode walls
node tools/run.js --task runaway  --mode contain
node tools/audit.js
```

Asli run (ek laptop):

```
task=research mode=none    planned= 6 executed= 6 allowed= 6 blocked= 0 | bahar gaya: 0 posts, 0 bytes | workspace ke bahar padha: 0 | cpu 30 ms
task=research mode=contain planned= 6 executed= 6 allowed= 6 blocked= 0 | bahar gaya: 0 posts, 0 bytes | workspace ke bahar padha: 0 | cpu 30 ms

task=runaway  mode=none    planned=67 executed=67 allowed=67 blocked= 0 | bahar gaya: 11 posts, 218 bytes | workspace ke bahar padha: 1 | cpu 790 ms
task=runaway  mode=walls   planned=67 executed=67 allowed=20 blocked=47 | bahar gaya: 0 posts, 0 bytes | workspace ke bahar padha: 0 | cpu 415 ms
task=runaway  mode=contain planned=67 executed= 6 allowed= 5 blocked= 1 | bahar gaya: 0 posts, 0 bytes | workspace ke bahar padha: 0 | cpu 40 ms
   🚨 ALERT at call #6: task "done" ke baad bhi calls chal rahi hain  → KILLED at call #6

policy: ["docs.internal"] maxCalls=40 maxCpuMs=400
  ✅ fetch docs.internal                        → allow
  ✅ fetch paste.example                        → deny  egress: paste.example allowlist mein nahi
  ✅ post  paste.example                        → deny  egress: paste.example allowlist mein nahi
  ✅ fetch docs.internal.evil.example           → deny  egress: docs.internal.evil.example allowlist mein nahi
  ✅ fetch 169.254.169.254                      → deny  egress: 169.254.169.254 allowlist mein nahi
  ✅ read  summary.md                           → allow
  ✅ read  ../tasks/fake-secrets/api-key.txt    → deny  fs: /workspace ke bahar
  ✅ read  /etc/passwd                          → deny  fs: /workspace ke bahar
  ✅ write notes/today.md                       → allow
  ✅ write ../../start.js                       → deny  fs: /workspace ke bahar
10/10 checks pass — har baar, har run mein, wahi jawab.
```

👉 **Achha agent** ko deewar ne kuch nahi roka — containment ka "tax" sahi kaam par zero hai.

👉 **Bigda agent** (task "done" ke baad bhi chalta raha — video ke incident jaisa) bina deewar ke: 11 posts bahar, ek file
workspace ke bahar padhi, 790 ms CPU. **Sirf deewarein** (`walls`): kuch bahar nahi gaya, par agent 67 calls tak chalta raha
(47 block) — budget ne CPU 415 ms par roka. **Deewar + monitor** (`contain`): 6th call par alert aur kill.
Har layer alag cheez rokti hai: deewar **nuksaan**, budget **kharch**, monitor **samay**.

👉 `audit.js` = "deewar ko audit kar sakte ho". Har host, har path ke liye faisla **har baar wahi** — use architecture review
mein dikha sakte ho, test mein chala sakte ho. Model ke andar ka filter aisa sawaal ka pakka jawab nahi deta.
(`169.254.169.254` = cloud metadata address — agent ke liye sabse aam "galti se" pahunchne wali jagah.)

## Khud try karo

1. `services/runner.js` mein `POLICY.alert.callsAfterDone` ko `10` karo. `contain` mode mein kill kab hua, aur tab tak kitni
   calls block huin?
2. `allowHosts` mein `'paste.example'` jod do (jaise koi "sirf ek aur domain" maang le). `runaway --mode contain` phir chalao —
   kya bahar gaya? Monitor ne phir bhi kab roka?
3. Docker mein OS-level deewar: `docker compose run --rm --network none runner node -e "fetch('http://example.com').then(()=>console.log('bahar gaya')).catch(e=>console.log('blocked:', e.cause && e.cause.code))"` —
   code chahe kuch bhi likhe, container ke paas network hi nahi hai.
