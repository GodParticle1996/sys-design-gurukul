# System Gurukul — kaise badhaayein

Naya level, naya diagram, naya track — sab kuch **data files** se hota hai.
Engine (`core.js`, `app.js`, `games.js`, `perfsim.js`, `canvas.js`, `explain.js`) chhune ki
zaroorat lagbhag kabhi nahi padegi. (Poora load kram: §10.1.)

Har badlaav ke baad:

```bash
node validate.js          # structure + missions + render
node validate.js <levelid>  # sirf ek level ke missions (tez loop)
node tools/replay-exercises.js  # static intended actions, wrong paths, single-action omissions
node tools/quiz-quality.js --check  # har option ka reason, length/position audit
node tools/tradeoff-test.js  # metric feedback aur required workload contracts
```

---

## 1. Naya level

`data-<track>.js` mein ek object jodo:

```js
{
  id: 'my-level',            // unique, kebab-case
  icon: '🔧',
  title: 'Level ka naam',
  badge: 'Badge Naam',
  objectives: ['<b>Yeh</b> seekhoge', ...],
  lesson: [`<h3>📖 ...</h3><p>...</p>`, ...],   // har entry ek page
  stages: [ /* neeche dekho */ ],
  interview: { title, instructions, questions: [...] },
  success: ['Ab tum yeh kar sakte ho...'],
  homework: 'Asli duniya mein try karne ke liye...',
  cards: [{ front: '...', back: '...' }],       // Revision Dojo
}
```

Aur `visuals.js` ke **aakhir** mein:

```js
VISUALS['my-level'] = { t: 'Diagram ka title', html: `...` };
```

> ⚠️ `VISUALS[levelId]` **laazmi** hai — validator iske bina fail karega.

### Level ko beech mein daalna ho?

`SD.registerLevels()` **append** karta hai, isliye naya level boss ke *baad* chala
jaayega. Uske liye:

```js
SD.registerLevelsAfter('data', 'btree', [ { id: 'my-level', ... } ]);
```

Validator ka **boss-last guard** bhi hai — agar `boss*` level aakhir mein nahi hai
toh woh chillayega.

### Topic pehle se hai? Naya level mat banao — purana badhao

```js
SD.extendLevel('scheduling', {
  objectives: ['...'], lesson: ['<h3>…</h3>'], stages: [ { type: 'docker', … } ],
  cards: [{ front, back }], interview: [ { q, choices, answer, explain } ], homework: '<p>…</p>',
});
```
Sab kuch level ke aakhir mein judta hai. Level na mile toh **error** — isliye extend karne wali file
(`data-ext-videos.js`) us level ki file ke **baad** load hoti hai (`data-gaps.js` ke bhi baad).

### Nayi company story (🏢 `stories` track)
Ek file per company: `data-st-NN-company.js`, poori file IIFE mein, `VISUALS[...]` usi file mein.
`index.html` mein `data-feed.js` ke baad, aur `validate.js` ke CONTENT list mein bhi jodo.

---

## 2. Stage types

| Type | Shape |
|---|---|
| `quiz` | `{ questions: [{ q, choices[], answer (index), explain }] }` |
| `bins` | `{ bins: [{id, label}], items: [{ text, bin, explain }] }` |
| `match` | `{ pairs: [{ left, right, explain }] }` |
| `order` | `{ steps: [{ text, explain }] }` — kram hi jawab hai |
| `fill` | `{ template: 'x {0} y {1}', tokens: [...], blanks: [{ answer, explain }] }` |
| `hotspot` | `{ visual: 'id', questions: [{ q, target, explain }] }` |
| `incident` | `{ pager, start, nodes: { id: { text, choices: [{ t, good, next, explain }] } } }` |
| `terminal` | perfsim mission — neeche §3 |
| `design` | design canvas — neeche §4 |
| `replay` | outage timeline — neeche §6.6 |
| `tradeoff` | live-number slider lab — neeche §6.6 |
| `estimate` | napkin math — neeche §6.6 |
| `archdiff` | diagram mein flaws pakdo — neeche §6.6 |
| `dryrun` | ek click = ek badlaav (diagram + "andar ka haal" table + asli code ki line + sawaal) — neeche §10 |
| `cards` | wahi renderer, bina diagram; har step ka `title` ek sawaal — neeche §10 |

### Jo galtiyan validator pakadta hai

- **`fill`** — har `blanks[].answer` `tokens[]` mein hona chahiye, warna mission
  **unsolvable** hai
- **`hotspot`** — har `target` us visual ke `data-hs="..."` mein hona chahiye,
  warna player **softlock** ho jaayega
- **`incident`** — har node par kam se kam ek `good` choice, har `good` par `next`,
  har `next` exist kare, aur koi end node reachable ho
- **`quiz`** — `answer` index `choices` ki range mein
- **`design`** — har slot mein kam se kam ek positive-score option, aur
  `pass` ≤ max possible score
- **`tradeoff`** — 400,000 combinations tak validator **poora knob sweep** chalata hai;
  bada sweep warning ke saath skip hota hai, isliye static fixture replay bhi chalao.
  Agar ek bhi combination numeric check aur required workload ko satisfy nahi karta
  toh lab **unsolvable** hai. Starting values par live goal `false` hona chahiye, warna goal shuru mein hi
  poora hai. Aur **har** combination par `verdict().ok` wahi bole jo `check()` —
  warna player "✅" padhta hai par level aage nahi badhta (5 labs mein yahi bug tha)
- **`replay` / `estimate` / `archdiff`** — validator inhe render karke **poora
  jeet kar dikhata hai**. Jeeta na ja sake toh **SOFTLOCK** report hota hai
- **`archdiff`** — har `flaws[].id` `nodes[]` mein hona chahiye, warna lab
  kabhi poora nahi ho sakta
- **`dryrun` / `cards`** — node/edge/flow ids, declared `vars`/`panels`, `code.text` =
  asli file ki lines, `line` range ke andar, asks, aur sahi jawab dekar poori walk
  (poori list §10.4 mein)

---

## 3. Terminal mission (perfsim)

```js
{
  type: 'terminal',
  title: '...',
  goal: 'HTML — kya karna hai',
  sys: SD.sys.txn({ api: { countTotal: false } }),   // system preset + overrides
  tasks: T_MY_MISSION,
  success: allOf(T_MY_MISSION),
  verify: s => s.sys.api.countTotal === false && SD.mission.current(s, 'http', r => r.status === 200),
  solution: ['GET /api/v1/orders', /* exact commands, final one proves outcome */],
  successText: 'HTML — jeetne par kya seekha',
  hints: ['Diagnosis ka nudge', 'Relevant constraint/measurement', 'Near-answer commands'],
}
```

### ⚠️ `success()` aur `tasks` ko **sync** rakhne ka pattern

Yeh sabse mehenga bug hai (sqlgurukul mein do baar mila): agar `success()` tasks se
**kam** shartein check kare, toh `sim.done` jaldi lag jaata hai aur baaki tasks
**kabhi tick hi nahi hote** — player ko "Mission complete 🎉" ke saath adhoora
checklist dikhta hai.

Isliye tasks ek `const` array mein rakho aur `success` unhi se banao:

```js
const T_MY_MISSION = [
  { text: 'Pehla kaam', check: s => s.records.some(r => ...) },
  { text: 'Doosra kaam', check: s => s.records.some(r => ...) },
];

// stage mein:
tasks: T_MY_MISSION,
success: allOf(T_MY_MISSION),   // allOf har data file ke top par defined hai
```

Renderer har task, success aur verify ko completion se pehle check karta hai. Historical
records learning checkpoints hain; current-state verify stale results ko win nahi banne deta.
Callback bhi guarded hai: task/success/verify error diagnostic deta hai, completion nahi.

### `sim` object — checks kis par likhein

```js
sim.records   // historical structured evidence; current configuration bhi verify karo
sim.last      // aakhri record
sim.history   // raw command strings (fallback)
sim.sys       // live system state
```

Record shapes:

```js
{ kind: 'http',    method, path, status, page, limit, offset, keyset, cursor,
                   rowsExamined, rowsSent, plan, indexUsed, ms, p99, countTotal,
                   cache, idem, guard, rateLimited }
{ kind: 'explain', sql, table, plan, indexUsed, rowsExamined, ms, offset, keyset }
{ kind: 'index',   op: 'create'|'drop', name, table, cols }
{ kind: 'sim',     op: 'set'|'add'|'inject'|'scale'|'precompute'|'reset',
                   what, target, path, value, cfg, ms, n, holds }
{ kind: 'load',    rps, duration, pattern, serviceMs, capacity, saturated,
                   maxP99, errPct, effPool, rho, maxWait, poolStarved }
{ kind: 'trace',   total, poolWait, worst, spans }
{ kind: 'metrics', cpu, poolWaitHigh }
{ kind: 'slo',     avail, budgetMin }
{ kind: 'estimate',users, rps, peak }
{ kind: 'cursor',  op, json, token }
{ kind: 'health' } { kind: 'status' } { kind: 'showTables' } { kind: 'showIndexes', rows }
```

### Solution aur progressive hints — **laazmi**

`solution` exact ordered commands ka data hai; test hints se commands guess nahi karta.
Final step ke pehle `done` false aur final par true hona chahiye. Har single-step omission,
reset/stale evidence aur malformed command ka expected result regression suite mein add karo.
Equivalent valid approaches allow karo: predicate outcome check kare, spelling ritual nahi.

Hint1 diagnosis ka nudge, hint2 relevant mechanism/observation, hint3 near-answer
walkthrough ho. Near-answer exact solution ke saath agree kare; expected HTTP failure bhi
useful result ho sakta hai (for example bounded timeout504), parser crash kabhi win nahi.

Har nonterminal stage/interview ka `exercise-solutions.json` fixture maintain karo.
`tools/replay-exercises.js` static answers se actual renderer drive karta hai; fixture ko
runtime answer fields se generate karke test pass karna regression evidence nahi.
MCQ ke `choiceExplanations` mein choices jitne reasons mandatory hain; right reason
ke saath each wrong alternative ka specific tradeoff/error explain karo.

### System presets

`data-core.js` mein:

```js
SD.sys.txn()        // 2.4 crore transactions — pagination ka akhaada
SD.sys.orders()     // chhota table + ek 'ledger' dependency — pool/resilience
SD.sys.payments()   // idempotency ka akhaada
SD.sys.results()    // flash crowd ka akhaada
SD.sys.reminders()  // 2 crore cards — scheduling ka akhaada
```

Agar preset fit nahi baithta toh `sys` ko **poora inline** likh do (jaise `geo` aur
`boss-shapes` karte hain). Yaad rakho: `SD.sys.*` ke andar `deps` ya `db.tables` dena
**merge** karta hai (preset ka `ledger` chupke se saath aa jaayega), jabki perfsim
stage ke `db.tables` ko **replace** karta hai. Do alag layers, do alag niyam.

> ⚠️ **Gotcha:** agar tum `sys.db.tables` doge toh default tables poori tarah
> **REPLACE** hote hain (merge nahi). Yeh jaan-boojh ke hai — warna har mission mein
> 2.4-crore wali `transactions` table chupke se ghus jaati aur `load` galat table
> pakad leta.

---

## 4. Design canvas

```js
{
  type: 'design',
  title, instructions,
  brief: 'HTML — scenario',
  requirements: ['500 rps peak', 'p99 < 200ms'],
  pass: 13,                      // ≤ max possible score
  slots: [{
    id: 'paging', label: 'Pagination', icon: '📄', note: 'optional',
    options: [
      { id: 'offset', label: '?page=N', score: -3, why: 'gehre page par...' },
      { id: 'cursor', label: '?cursor=', score:  3, why: '...' },
    ],
  }],
  verdicts: { great: 'HTML', ok: 'HTML', bad: 'HTML' },   // optional
}
```

Review par **saare** options ka `why` khulta hai — sirf chune hue ka nahi.
Isliye har option ka `why` likho, galat waalon ka bhi. **Asli seekh wahi hai.**

---

## 5. Naya track

1. `data-core.js` → `SD.tracks` mein entry (`id, icon, name, blurb, certTitle,
   certSub, motto, formula` — sab laazmi)
2. Nayi `data-<id>.js` file, `SD.registerLevels('<id>', [...])` ke saath
3. `index.html` mein `<script src="data-<id>.js">` (baaki data files ke saath)
4. `validate.js` ke `CONTENT` array mein file ka naam

Validator teenon jagah check karta hai.

---

## 6. Naya diagram

`visuals.js` ke **aakhir** mein chipka do:

```js
VISUALS['my-id'] = { t: 'Title', html: `...` };
```

> Yeh file jaan-boojh ke ek flat object literal **nahi** hai — har diagram apni alag
> assignment hai. Isse append hamesha safe rehta hai. (apigurukul mein flat literal
> ke beech append karte waqt ek diagram galti se doosre ke *andar* nest ho gaya tha.)

CSS vocabulary: `dg-flow · dg-ladder/dg-rung · dg-split/dg-box · dg-grid · dg-node ·
dg-pill · dg-arrow · dg-stack · dg-col · dg-legend · dg-rule · dg-cap`,
modifiers `is-good · is-bad · is-accent · is-gold · is-muted`.

Hotspot ke liye elements par `data-hs="targetId"` lagao.

---

## 6.5 Naye labs (cache · migrate · bench)

Teen command-parivaar ek-ek level ke liye bane hain, par kahin bhi use ho sakte hain:

```js
// eviction ka lab — hit rate access pattern se nikalta hai
cache sim --policy lru|lfu|fifo --size 3 --keys 'a b a b a b c d e f a b'
cache hotkey --key <k> --rps 50000 [--replicas 8]     // ek key, ek node
cache coalesce --misses 5000 [--on]                   // single-flight

// migrations ka lab — state sys.migration mein rehta hai
migrate status | dual-write on|off | backfill --batch N | verify | cutover | rollback

// storage engine — sim set db.engine lsm|postgres ke saath
bench write --rows N | bench read --rows N | bench compact
```

```js
// networking
net trace [--protocol h1|h2|h3] [--warm] [--rtt 40]   |   net compare --assets 60   |   net lb l4|l7

// consistent hashing — state sys.ring mein
ring show | ring set vnodes 150 | ring add node-5 | ring remove node-2

// ids
id gen uuid4|ulid|snowflake|autoinc --n 5   |   id bench --type uuid4 --rows 1000000

// probabilistic
bloom --items 1000000 --fp 0.01   (ya --bits N --hashes K)   |   hll --items 100000000

// streams
stream window --size 60 --watermark 10 | stream replay --from 0 | stream partitions --partitions 6 --consumers 8

// contention — state sys.booking mein
sim set booking.mode none|optimistic|pessimistic|reservation
book seat A1 --concurrent 2 | book hold A1 --ttl 600 | book status | book reset
```

Records: `{ kind: 'cache', op, policy, hitRate, hot, replicas, dbQueries, on }` ·
`{ kind: 'migrate', op, dualWrite, backfilled, drift, verified, cutover, safe, lockRisk }` ·
`{ kind: 'bench', op, engine, rows, amp, ms }` ·
`{ kind: 'net', op, protocol, rtt, warm, dns, tcp, tls, total, h1, h2, h3, layer }` ·
`{ kind: 'ring', op, nodes, vnodes, skew, movedPct, modPct }` ·
`{ kind: 'id', op, type, rows, splits, ms, idxMB, sortable }` ·
`{ kind: 'probabilistic', op, items, bits, hashes, fpRate, bytes, exactBytes, registers, errPct }` ·
`{ kind: 'stream', op, size, watermark, late, caught, dropped, partitions, consumers, idle }` ·
`{ kind: 'book', op, seat, mode, sold, rejected, doubleBooked, blockedByHold, ttl }`.

Aur `api.auth` (`null` | `'body'` | `'header'`) `cmdHttp` ke andar identity ka
source badalta hai — HTTP records par `auth`, `actedAs`, `claimed`, `spoofable`,
`denied` fields aate hain.

---

## 6.6 Interactive labs (`labs.js`)

Chaar renderer: `replay` · `tradeoff` · `estimate` · `archdiff`.
Contract wahi hai: `(stage, arena, onDone) → onDone({ firstTry, total })`.

> ⚠️ **`labs.js` poori file ek IIFE ke andar hai — aur rehni chahiye.**
> `games.js`, `app.js` aur helper-heavy files IIFE ke andar local aliases rakhte hain.
> Public helpers `SD` par register karo (`SD.ui`, `SD.makeInteractive`, `SD.choiceFeedback`).
> Naye top-level `const` names data files se collide kar sakte hain; local closure use karo.

```js
/* replay — asli outage ki timeline */
{ type: 'replay', incident: 'Cloudflare — 18 Nov 2025', goal, speedMs: 2000,
  metrics: [{ id: 'err', label: '5xx rate', unit: '%', max: 100, dir: 'lower' }],
  frames: [
    { t: '11:05', event: '<b>...</b>', metrics: { err: 0 }, tone: 'warn', note: '...',
      ask: { q, choices: [...], answer: 0, explain, wrongHints: [...] } },
  ],
  lesson: '...' }

/* tradeoff — knob ghumao, number live compute ho */
{ type: 'tradeoff', goal, scenario,
  knobs: [{ id: 'M', label, min: 4, max: 64, step: 4, value: 8, unit: '', note }],
  workload: { /* demandKnobId: minimumRequiredDemand — optional */ },
  readouts: k => [{ label, value, tone: 'ok'|'warn'|'bad' }],
  bars:     k => [{ label, pct, text, tone }],
  verdict:  k => ({ ok: bool, text }),
  check:    k => bool,                      // jeet ki shart
  lesson, quiz: { q, choices, answer, explain } }

/* estimate — pehle guess, phir calculation */
{ type: 'estimate', goal,
  problems: [{ q, unit, given: [...], answer: 5787, tol: 0.5, steps: [...], lesson }] }
  // tol = log10 mein doori. 0.5 ≈ 3x tak sahi, 0.3 ≈ 2x tak.

/* archdiff — diagram mein flaws pakdo */
{ type: 'archdiff', brief, goal,
  nodes: [{ id, label, sub, row: 0 }],
  flaws: [{ id: 'query', why: '...' }],     // id nodes[] mein HONA chahiye
  fine:  { 'ch': 'yeh box theek kyun hai' }, // har non-flaw node ke liye
  lesson }
```

Tradeoff ke goal mein exact inclusive/exclusive budgets aur required workload likho.
Demand slider explore karne ke liye hai; incident ko traffic ghata kar pass mat karao.
`workload` minimum, valid range/step, numeric `check()` aur `verdict().ok` sab live
state par pass hone chahiye. Toy model assumptions dikhao; resharding mein data copy
ko zero, ya 100% utilization ko spare capacity mat batao. Intended knob actions
`exercise-solutions.json` mein manually author karo; runtime check se solution generate mat karo.

### Do niyam jo yahan seekhe gaye

**1. Renderer ka state level data par mat likho.** Pehle `replay` har frame par
`f._answered = true` set karta tha. Frame object **level data** hai — isliye
level dobara khelne par saare sawaal "pehle se ho chuke" nikalte the. Ab jawab
ka hisaab renderer ke andar ek local array mein rehta hai.

**2. Buttons ko CLASS se pakdo, TEXT se kabhi nahi.** Validator ka walk pehle
button ko uske text se dhoondhta tha (`/Play|Agla frame/`) — aur ek frame ke
event text `"Player count aadha"` ne `Play` match kar liya, jisse walk wahin
atak gaya aur ek jhootha SOFTLOCK report hua. Isiliye ab har button ki apni
class hai: `rp-play` `rp-go` `rp-done` `td-next` `es-go` `es-next` `ad-done`.
Naya button jodo toh **usko bhi ek class do**.

---

## 7. perfsim mein naya command

`perfsim.js` ke `exec()` dispatcher mein ek line, aur ek `cmdX()` function.
Har command ko `rec({ kind: '...', ... })` se ek **structured record** lautana chahiye
— checks usi par likhe jaate hain.

Naye command ke saath:
1. `cmdHelp()` mein ek line jodo
2. Explicit mission `solution` aur expected live-state predicate add karo; parser
   boundary, reordered flags, malformed values aur reset recovery regression bhi jodo.

Ek-off cheezon ke liye poora command banane ki zaroorat nahi — stage mein
`responses: [{ re: /regex/, out: 'text' | fn(sim, m), mutate?: fn }]` de do.

---

## 8. Jo galtiyan pehle ho chuki hain (aur validator ab pakadta hai)

| Galti | Kya hota hai | Guard |
|---|---|---|
| `success()` tasks se kam check kare | `sim.done` jaldi lagta hai, baaki tasks kabhi tick nahi hote | `allOf(TASKS)` pattern + mission runner |
| `fill` ka answer `tokens` mein nahi | mission **unsolvable** | structure check |
| `hotspot` target diagram mein nahi | player **softlock** | structure check |
| Naya level boss ke baad chala gaya | track ka kram toota | boss-last guard |
| Do data files mein ek hi `const T_X` | poori file load hi nahi hoti | file load par crash |
| `end:` node par `end: true` bhool gaye | incident khatam hi nahi hota | dead-end / no-end-node guard |
| Typing mein Cyrillic/Devanagari ghus gaya (`sochо`, `samето`) | aankh se nahi dikhta, JS string mein baith jaata hai | **non-Latin script guard** |
| `const T_X` ko `registerLevels([...])` ke **andar** likh diya | file parse hi nahi hoti | file load par crash |
| `load` ka default pattern index use nahi karta | mission ka bottleneck galat nikalta hai — `--path '/api/v1/...'` do | mission runner |
| Hint se command copy nahi ho sakti | player fansa rehta hai | mission runner |
| `success()` bina kuch kiye true | mission apne aap complete | trivial-success guard |
| Template literal mein galat field | HTML mein `undefined` dikhta hai | render check |
| `VISUALS[levelId]` bhool gaye | intro screen adhoora | structure check |
| `tradeoff` ka `check()` kabhi true nahi hota | player kabhi jeet hi nahi sakta | **knob sweep** (labs section) |
| `tradeoff` ka goal starting values par hi poora | knob chhoone ki zaroorat hi nahi | pre-solved guard |
| `tradeoff` ka `verdict().ok` aur `check()` alag bolte hain | "✅ sahi" dikha par level aage nahi badha (ya ulta) | **knob sweep** — har combination par dono milaye jaate hain |
| `archdiff` ka `flaws[].id` `nodes[]` mein nahi | lab kabhi poora nahi hota | structure + **SOFTLOCK walk** |
| `estimate` ka `tol` bahut sakht | exact jawab bhi galat nikalta hai | walk mein exact answer daal ke check |
| `labs.js` ya naya `data-*.js` bina IIFE ke | `const el`/`const allOf` redeclare → **poori file SyntaxError** | file load par crash |
| Renderer ne apna state level data par likha (`f._answered`) | level **dobara** khelne par toota | — (code review; ab local state) |
| Validator ne button ko **text** se dhoondha | content ka text button ke text se match kar gaya → jhootha SOFTLOCK | class-based selectors |
| `registerLevelsAfter` target track se **pehle** load hua | level chupchaap append ho jaata hai, boss aakhir mein nahi rehta | boss-last guard |

---

## 9. 🐳 `docker` stage + `docker-labs/` project

```js
{
  type: 'docker', title,
  project: '09-raft',               // docker-labs/<project>
  exercise: 'ex1-election',         // project README mein yeh naam hona chahiye
  goal: 'HTML', why?: 'HTML',
  steps: [{ text, cmd?, expect? }], // expect = README ka ASLI output
  observe: { q, choices, answer, explain },
  lesson?: 'HTML',
}
```

**Poora kab hota hai:** `observe` ka sahi jawab stage ko poora karta hai. Laptop ke bina learner "seedha sawaal karo"
dabata hai — tab har step ka `expect` (captured output) khul jaata hai, isliye `expect` mein woh output hona chahiye
jisse sawaal ka jawab nikle. Har step ✔ karne par `SD.markLabDone(stage)` lab ko `state.labsDone` mein likhta hai
(key `project/exercise` — ek hi exercise kai levels mein ho toh ek baar kaafi). Baaki labs level map par 🐳 nishaan
aur level intro par "lab seedha kholo" button ban jaate hain. `exercise-solutions.json` mein step ke ✔ `optional: true` hain.

Project ka dhaancha (validator in files ko check karta hai): `package.json`, `Dockerfile`, `docker-compose.yml`
(har exercise ek **profile**), `start.js` (bina docker: `npm start <exercise>`), `README.md` (exercise ka naam + asli
numbers), `services/*.js`, `tools/*.js`, `lib/util.js` (`serve`, `json`, `get` jo non-2xx par throw karta hai, `getRaw`,
`post`, `sleep`, `pct`, `burn` — hrtime se CPU jalana).

Niyam jo yahan seekhe gaye:
- **Zero dependency** — sirf Node ka `http` aur `fetch`. `npm install` ki zaroorat hi nahi.
- **Pehle chalao, phir likho** — README aur stage ka `expect` asli run se. Model ke andaaze nahi.
- CPU "kaam" ke liye `Date.now()` loop mat lagao (1 ms ki rounding) — `process.hrtime.bigint()`.
- Processes ko naam (`pkill -f`) se mat maaro — PID se.

### 9.1 🧯 Lab review ke notes (2026-11-13) — yeh galtiyan `node validate.js` se nahi pakdi gayi thi

Review mein har lab ka har README command sach mein chalaya gaya. Neeche ki har baat ek asli bug thi jo learner ko
rok deti. Naya lab likhne ya purana badalne se pehle yeh padho.

**(a) `npm start <exercise>` kabhi khatam nahi hota (labs 01–44) — use kisi command ke saath `&&` se mat jodo.**
29 stage commands aur 18 README lines aise the: `npm start ex2-hot-rank && node tools/vote-load.js`. Server chalta rehta
hai, isliye `&&` ke baad wala tool kabhi nahi chalta. Learner ko do terminal chahiye: Terminal 1 = server, Terminal 2 = tool.

- Stage ke `cmd` mein har line ek alag command hai (apna Copy button). `# ` se shuru line label hai, command nahi:
  ```js
  cmd: '# Terminal 1 — pehle Ctrl+C (purana server band), phir:\nMODE=json npm start ex1-json-vs-binary\n# Terminal 2:\nnode tools/load.js --n 2000',
  ```
- README mein: `npm start ex2 …   # Terminal 1 (pehle Ctrl+C)` aur agli line `node tools/x.js   # Terminal 2`.
- Labs 45+ alag hain: `npm start -- exN` chalkar khud khatam hota hai. Wahan do terminal ki zaroorat nahi.
- Step ki ginti mat badlo (ek step ke `cmd` ko do steps mein mat todo): `exercise-solutions.json` har step ka index yaad rakhta hai.

**(b) Env var us process par lagao jo use padhta hai.** `SANDBOX=heavy node tools/tenants.js` kuch nahi karta agar `SANDBOX`
ko server padhta hai (lab 02 ex4, lab 21 ex3 mein yahi tha). Setting server ki hai → server ko us env ke saath **restart** karo,
phir tool chalao. `node tools/lab-lint.js` ise `ENV-TOOL` naam se pakadta hai.

**(c) Jo tool khud server chalata hai, woh `npm start` wale server se port par takrayega.** Lab 06 ka `crash-mid-fanout.js`
port 4603 par apna channel-server chalata tha, jabki `npm start ex2-fanout-ack` usi port par pehle se baitha tha. Ab tool pehle
chalte hue server se `POST /admin/exit` kehta hai, phir apna server chalata hai. Naya "crash/restart" tool likho toh yahi karo,
ya tool ko alag port do. `lib/util.js` ka `serve()` ab busy port par stack trace ki jagah seedha bolta hai: "Port N pehle se busy hai … Ctrl+C dabao".

**(d) Lab sirf `data/` ya `workspace/` mein likhe, aur woh file git mein kabhi na ho.** Do state files (`06-slack/data/pending.json`,
`10-migration/data/cdc-offset.json`) tracked thi; ek mein purane run ka `{"offset":9600}` commit ho chuka tha. Ab dono untracked
hain aur `.gitignore` mein `docker-labs/*/data/*` aur `docker-labs/*/workspace/*` hain (sirf `.gitkeep` bachta hai).
Lab chalane ke baad `git status` saaf rehna chahiye. `git add -A` / `git add .` is repo mein mat chalao — doosre agent ka adhoora kaam
aur runtime files saath chale jaate hain; hamesha naam lekar `git add <path>`.

**(e) Do tools — commit se pehle dono chalao:**

| Tool | Kya karta hai | Kitna waqt |
|---|---|---|
| `node tools/lab-lint.js [lab …]` | Bina kuch chalaye padhta hai: `&&` chain, galat process par env, na-maujood tool/flag/exercise, `...` wala command | ~2 s |
| `node tools/run-labs.js [lab …]` | Lab ko temp folder mein copy karke README ka har command **sach mein** chalata hai; exit code, timeout aur "lab ne kahan likha" batata hai | 20 s – 3 min per lab |

`run-labs.js` ka ✅ sirf itna kehta hai ki commands chalte hain. Numbers sahi kahani sunate hain ya nahi — yeh log
(`<tmp>/sdg-lab-logs/<lab>.log`) ko README ke chhape output se milakar hi pata chalta hai. Absolute numbers machine se badalte hain;
**pattern** (kaun tez, kaun fail, kitna guna) wahi rehna chahiye. `flags=NaN/undefined/stack-trace` dikhe toh log zaroor kholo.
Runner do cheezon ko problem nahi ginta: jo tool apni npm library maangkar ruk jaata hai (`… npm install x` — labs 37, 38, 39, 43), aur
`--kill…` / `--crash…` flag wala command (jaan-boojh kar exit 1). Naya tool likho toh inhi do roop mein rakho.
README likhne ke do niyam jin par runner (aur learner) tike hain: exercise ka heading `## ex2-naam — …` se shuru ho, aur
labs 47+ mein `npm start -- exN` (khud khatam hota hai), labs 01–46 mein `npm start exN` (server chalta rehta hai).

**(f) perfsim ka ek niyam jo galat tha: LIMIT tabhi jaldi rokta hai jab index sorted rows de.**
`WHERE user_id = ? ORDER BY created_at LIMIT 50` par sirf `(user_id)` index ho toh database us user ki **saari** rows padhkar sort
karta hai; simulator pehle sirf 50 rows ginta tha, yaani `(user_id)` aur `(user_id, created_at)` mein koi farak hi nahi dikhta tha.
Ab `queryCost` filter ki saari rows + sort ginta hai (`Index Scan + Sort`), aur `bestIndex` us index ko sorted maanta hai jiska
sort column filter wale prefix mein ya uske turant baad ho. `btree` mission ab yahi dikhata hai (pehle `(user_id)`, phir
`(user_id, created_at)`). Test: `tools/replay-missions.js` ("Filter-only index with ORDER BY …").
Sabak: simulator ka shortcut tab tak theek hai jab tak woh kisi lesson ka **natija ulta** na kar de. Cost model badlo toh
`node validate.js` ke saath har mission ka solution dobara chalta hai — jo mission toote, use model ke saath hi theek karo
(validator maangta hai ki solution ka har step kisi task ke liye zaroori ho).

---

## 10. 🔍 `dryrun` / `cards` stage + `SD.viz.svg` (`explain.js`)

Samjhane ka auzaar: **ek click = ek badlaav**. Stage mein chhota diagram, "andar ka haal" ki table, asli file ka code
(chalti line chamakti hai) aur beech-beech mein sawaal — sahi jawab ke bina "Agla" nahi khulta. `type: 'cards'` wahi
renderer hai (`SD.renderers.cards = SD.renderers.dryrun`), bas diagram ke bina.

### 10.1 Load kram (`index.html` se)

```
core.js → data-core.js → visuals.js → games.js → perfsim.js → canvas.js → labs.js → dockerlab.js → explain.js
→ data-flow · data-api · data-data · data-resil · data-dist · data-shapes · data-builds · data-feed · data-feed-2
→ data-st-01 … 14 → data-ai-01 … 06 → data-pl-01 … 06
→ data-gaps → data-ext-videos → data-ext-episodes → data-ext-sdd1
→ data-v2-00-tracks → data-v2-breaker-1-kyun … -5-kab → data-v2-retries-1-kyun … -5-kab → data-v2-backpressure-1-kyun … -5-kab → data-v2-noisy-1-kyun … -5-kab → data-v2-random-1-kyun … -4-kab → data-v2-health-1-kyun … -5-kab → data-v2-dr-1-kyun … -5-kab → data-v2-chaos-1-kyun … -4-kab
→ data-v2-eda-1-kyun … -4-kab
→ data-v2-fp-physics-1-kyun … -4-kab
→ data-guidance → data-v2-concurrency (self-contained track + its guides) → app.js
```

- `explain.js` data files se **pehle**: `VISUALS[...] = { html: SD.viz.svg(...) }` file load hote hi chal jaata hai.
- `data-v2-00-tracks.js` saari `data-v2-<topic>-*.js` files se pehle: playlist ke tracks wahi register karta hai
  (`SD.tracks.unshift`); topic files sirf `SD.registerLevels('sdd-resil', …)` karti hain.
- Yahi kram `validate.js` ke `ENGINE` aur `CONTENT` arrays mein hai. Nayi file **dono** jagah jodo (index.html + validate.js);
  validator `CONTENT` ki har file ko `index.html` mein dhoondhta hai.

### 10.2 `SD.viz.svg(nodes, edges, state, opts)`

SVG ka **string** lautata hai — `innerHTML` mein ya `VISUALS['id'] = { t, html }` mein daal do.

```js
const NODES = [
  { id: 'phone', icon: '📱', label: 'Asha',    x: 115, y: 105 },
  { id: 'api',   icon: '🧩', label: 'app-api', x: 440, y: 105 },
];
const EDGES = [{ from: 'phone', to: 'api' }];

VISUALS['my-level'] = { t: 'Title', html: SD.viz.svg(NODES, EDGES, {
  nodes: { api: { tone: 'busy', badge: '4/4 workers atke' } },
  flows: [{ from: 'phone', to: 'api', label: '/profile', tone: 'bad' }],
}, { w: 890, h: 215 }) };
```

| Argument | Field | Matlab |
|---|---|---|
| `nodes[]` | `id`, `label`, `x`, `y` | laazmi. `x`, `y` = box ka **centre** (viewBox ki ikai mein) |
| | `icon` | emoji; na do toh 📦 |
| | `kind` | `'db'` / `'queue'` = gol kone. Koi bhi `kind` CSS class `k-<kind>` bhi jodta hai |
| | `tone` | box ka default rang (jab `state` kuch na bole) |
| `edges[]` | `from`, `to`, `dashed?` | hamesha dikhne wali patli line, box ki deewar par khatam hoti hai |
| `state.nodes` | `{ id: { tone, badge } }` | `tone`: `ok · slow · bad · busy · idle · new · acc` (default `idle`). `badge` = box ke neeche chhoti goli; `''` = koi nahi |
| `state.flows[]` | `from`, `to`, `label?`, `tone?` | chalti hui request. `tone`: `ok · bad · slow · acc` (default `acc`) |
| | `back: true` | ulti disha — line 12 px hat ke chalti hai, taaki aane-jaane ki do lines overlap na karein |
| | `offset: n` | apni marzi ka px hatav (`back` ho toh `back` jeetta hai) |
| | `stuck: true` | latki hui request: animation ruk jaati hai, line tooti hui |
| `opts` | `{ w, h }` | viewBox; default 1000 × 520 |

Box ki chaudai = `max(190, 84 + 12.8 × label ke akshar)`, unchai 70; badge box ke neeche lagti hai. Validator (dryrun/cards ke andar)
**warn** karta hai agar node ka centre kinare ke paas ho: `x < 100`, `x > w − 100`, `y < 40` ya `y > h − 70`.

### 10.3 Stage ka shape

```js
{
  type: 'dryrun',                                  // ya 'cards'
  title: '👣 ...',
  goal: 'HTML',                                    // optional — "🎯 GOAL" dabba, steps ke upar
  nodes: [...], edges: [...], viz: { w, h, focus },// optional — diagram (SD.viz.svg ke arguments); focus: neeche dekho
  vars:   [{ id, label }],                         // optional — "andar ka haal" table
  panels: [{ id, title }],                         // optional — lines ki list
  code:   { title, file, from, text },             // optional — asli file ka tukda
  steps: [{ title?, say, clock?, flows?, nodes?, vars?, panels?, line?, ask? }],
  lesson: 'HTML',                                  // aakhri nichod (aakhri step ke baad)
}
```

- Diagram tabhi dikhta hai jab `nodes` khaali na ho; har step par naye `state` ke saath dobara banta hai.
- Phone par diagram padhne layak bada rehta hai (520 px) aur apne dabbe mein khisakta hai; renderer use us jagah le jaata hai jahan is step ke
  nodes / flows hain. Jab do zaroori hisse ek saath na aa sakein (jaise load balancer x=160 aur servers x=690), `viz.focus: ['s1', 's2', 's3']` do:
  tab phone par hamesha yahi nodes dikhte hain. Jo chhup gaya, uski baat `vars` table mein honi chahiye. (Validator: ids `nodes` mein hon.)
- `vars[].label` aur `panels[].title` **raw HTML** hain.
- `code`: `file` = app root se relative path, `from` = pehli line ka **asli** number (default 1), `text` = asli file ki lines (`\n` se jude).
  Line numbers `from` se gine jaate hain. `code` aur `vars`/`panels` dono hon toh side-by-side (≤ 860 px par ek ke neeche ek).
  Code ka dabba apne andar scroll hota hai aur chalti line tak khud pahunchta hai (page nahi hilta).
- `lesson` `lab-win` box mein aata hai. Score `{ firstTry, total }` hai — **sirf `ask` wale steps** ginte hain.

**Step ke fields**

| Field | Matlab |
|---|---|
| `say` | **laazmi.** HTML. Chauda table ho toh `<div class="dr-scroll">…</div>` mein (§10.6) |
| `title` | step ka heading (`h3`). `cards` mein convention: ek sawaal, jaise `'1. MCB kab girta hai?'` |
| `clock` | `'1.3 s'` — upar ⏱ mein. Pichhle step se chalta aata hai |
| `flows` | `SD.viz.svg` ke `flows` jaise. **Sirf isi step ke liye** — aage nahi chalte, har step mein dobara likho |
| `nodes` | `{ id: { tone, badge } }`. Chalte aate hain, par ek node ka **poora** object badalta hai: sirf `tone` doge toh purana `badge` hat jaayega |
| `vars` | `{ id: value }`. Chalte aate hain. Step 0 mein **har** var ki starting value do. Jo value is step mein badli, row chamakti hai aur "badla" tag aata hai |
| `panels` | `{ id: [html lines] }`. Chalte aate hain; list **poori replace** hoti hai (append nahi) |
| `line` | `12` · `[12, 13]` · `'12-15'` · `['12-15', 20]` — **asli file ka** line number, `code.from` ke hisaab se |
| `ask` | `{ q, choices, answer, explain, hint? }` — neeche |

**`vars` ki value**: string = raw HTML (khud escape karo; `''` ya null = "—"). Array = cells, har token:

| Token | Dikhta hai |
|---|---|
| `'ok'` · `'bad'` | ✓ hara · ✗ laal |
| `'free'` | khaali dashed dabba |
| `'busy'` · `'wait'` · `'skip'` | ⏳ peela · … neela · ⛔ |
| `'busy:#5'`, `'wait:Asha'` | `tone:text` — upar wale kisi tone ka rang, andar `text` |
| `'Asha'` (koi aur token) | seedha text, neutral dabba |

Cell ka text escape hota hai. `'x:y'` jaise anjaan tone mein sirf `y` dikhta hai (`x` gaayab). Token ki spelling galat ho (`'bda'`) toh
woh chupchaap text-dabba ban jaata hai — validator isse nahi pakadta.

**`ask`**

- `answer` = `choices` mein sahi jawab ka index, jaise likha waisa. Renderer choices **shuffle** karta hai; convention: sahi jawab index 0 par likho.
- Galat: dabba hilta hai, `❌ Nahi. ` + `hint` (na ho toh "Upar ka haal dobara dekho, phir ek aur try karo."), aur galti Revision Dojo mein
  jaati hai (tag "🔍 Dry run"; level replay par nahi). Isliye `hint` hamesha likho.
- Sahi: `✅ explain` dikhta hai aur "Agla step" khulta hai. "← Pichla" se laut ke aao toh jawab yaad rehta hai, dobara nahi poochha jaata.
- Aakhri step ka button "Poora hua ✔" ho jaata hai; use dabane par `lesson` aur "Aage badho →" aate hain.

**Renderer ke do niyam** (wahi jo §6.6 mein seekhe):

1. **Renderer ka state level data par nahi.** Jawab ka hisaab `explain.js` ke andar ek local object (`answered`) mein hai, `steps[i]` par kuch nahi likha jaata — level dobara khelne par sab naya.
2. **Buttons ko CLASS se pakdo.** `dr-prev` (← Pichla) · `dr-next` (Agla step / Poora hua) · `dr-opt` (har choice; `data-i` = `choices` mein asli index) · `dr-done` (Aage badho). Naya button jodo toh usko bhi class do.

### 10.4 Validator kya check karta hai (`validate.js`)

| Kya | Kab ❌ fail / ⚠️ warn |
|---|---|
| Diagram | `nodes` hain par 2 se kam ❌ · node ka `x`/`y` number nahi ❌ · centre kinare ke paas ⚠️ |
| Ids | edge ya step-`flows` ka `from`/`to` node nahi ❌ · step-`nodes` ka key node nahi ❌ |
| `vars` | `id` ya `label` missing ❌ · step-`vars` ka key `stage.vars` mein nahi ❌ · kisi var ki starting value step 0 mein nahi ⚠️ |
| `panels` | step-`panels` ka key `stage.panels` mein nahi ❌ |
| `code` | `code.text` khaali ❌ · `code.file` disk par nahi ❌ · **`code.text` ≠ asli file ki lines `from … from+n−1`** (byte-byte) ❌ |
| `line` | `line` hai par `code` nahi ❌ · koi line number `from … from+n−1` ke bahar ❌ |
| Steps | 3 se kam ❌ · kisi step mein `say` nahi ❌ |
| `ask` | `q` missing ya 2 se kam `choices` ❌ · `answer` range se bahar ❌ · `explain` missing ⚠️ |
| `lesson` | stage ka `lesson` missing ⚠️ |
| **Walk** | stage ko fake DOM mein render karta hai (crash ❌). Har step par `ask` ho toh sahi option (`dr-opt` jiska `data-i` = `answer`) dabata hai, phir `dr-done` ya `dr-next`. Sahi jawab ke baad bhi `dr-next` disabled ❌ SOFTLOCK · end tak na pahunche ❌ SOFTLOCK · score `firstTry = total = asks ki ginti` na aaye ❌ |

Jo validator **nahi** dekhta: `hint` hai ya nahi · `cards` ke `title` · tone aur cell-token ki spelling · aur — docker stage ka `expect` ya step mein likhe
number asli lab output se milte hain ya nahi (sirf `code.text` asli file se milaya jaata hai). Isliye lab ke output ko dobara type mat karo (§10.7).
`dryrun`/`cards` "interactive labs" ki ginti mein bhi judte hain. Poori file par Devanagari/Cyrillic/Arabic guard (§8) yahan bhi laagu hai.

### 10.5 Chhote engine badlaav (2026-10-09)

- **`core.js` `SD.trackUnlocked`** — `alwaysUnlocked: true` wala track khud hamesha khula hai, **aur ab agle track ko roktaa bhi nahi**: kram wale track ke liye
  "pichhla track" dhoondhte waqt saare `alwaysUnlocked` tracks chhod diye jaate hain (peeche jo pehla non-`alwaysUnlocked` track mile, uska `complete` dekha jaata hai;
  koi na mile toh khula). Matlab side track `SD.tracks` mein sabse upar bhi rakh sakte ho (`SD.tracks.unshift({...})`) — pehla core track lock nahi hoga.
- **`app.js` `showTrack`: `track.freeOrder: true`** — us track ke **saare** levels kisi bhi kram mein khule. (Bina iske level `i` tabhi khulta hai jab level `i−1` complete ho; level 0 hamesha khula.)
- **`app.js` `stageDone`** — jo stage `total: 0` report kare (koi `ask` hi nahi tha, sirf padhna/dekhna) uska summary "0/0 first-try sahi" nahi, **"Dekh liya ✔"** dikhata hai (emoji ✅; PERFECT bonus tab bhi nahi, kyunki `perfect` ke liye `total > 0` chahiye).

### 10.6 CSS helpers (`style.css`)

- **`.asli`** aur **`.lesson-card .tip`** — "Asli baat" ka callout: sone ki patti (gold left border) wala halka peela dabba. Intro screen ke hook card ke andar `<p class="tip">🎯 <b>Asli baat:</b> …</p>`; kahin aur (jaise `say` ke andar) `<p class="asli">🎯 <b>Asli baat:</b> …</p>`. (`.tip` sirf `.lesson-card` ke andar styled hai; stage ka `lesson` apne `lab-win` box mein aata hai, usko class nahi chahiye.)
- **`.dr-scroll`** — `overflow-x: auto` ka wrapper. `say` mein chauda table ho toh `<div class="dr-scroll"><table>…</table></div>` — phone par table card se bahar nahi nikalta, apne andar scroll hota hai. (`say` ke andar `table`/`th`/`td`/`pre` ki styling `.dr-say …` se pehle se aati hai.)

### 10.7 🎬 Playlist course ka shape (2026-10-10 se tay)

Owner ne sample (circuit breaker) ke baad kaha: "jo sahi lage woh karo". Tab se yahi shape tay hai — playlist ka har
topic isi mein banta hai.

- **Ek hi ghar:** poori playlist System Gurukul mein, theme ke hisaab se alag tracks mein. Tracks `data-v2-00-tracks.js`
  mein register hote hain (`alwaysUnlocked` + `freeOrder`, `SD.tracks.unshift` se sabse upar). Pehla: `sdd-resil`
  ("Playlist · 1 Resilience — samasya se code tak").
  Doosra: `sdd-eda` ("Playlist · 2 EDA Core — ek ghatna, alag kaam"). Alag playlist ka `fp-core` ("First Principles — machine se system tak") ab sabse upar hai. Core sequential tracks in always-unlocked tracks ko lock ki shart mein chhodte hain.
- **Files:** `data-v2-<topic>-<n>-<hissa>.js` (ek level ek file, IIFE), `SD.registerLevels('<track id>', [ … ])`.
  Har level par `group: '🔌 Circuit Breaker'` (level map par topic ka heading) aur title `'<Topic> <n> · <Hissa> — …'`.
  Nayi file ko `index.html` aur `validate.js` ke `CONTENT` mein tabhi jodo jab file ban chuki ho.
- **Bane hue topics:** Circuit Breaker (`data-v2-breaker-1…5`, lab 38) · Retries (`data-v2-retries-1…5`, lab 37) · Backpressure (`data-v2-backpressure-1…5`, lab 15) · Noisy Neighbour (`data-v2-noisy-1…5`, lab 39) · Randomness (`data-v2-random-1…4`, lab 41 + lab 09; chaar levels — yahan "Library" alag level nahi, NGINX / Envoy ke `cards` Code level mein hain) · Health Checks (`data-v2-health-1…5`, lab 43; code pane ek YAML file par bhi: `k8s/orders.yaml`) · Disaster Recovery (`data-v2-dr-1…5`, lab 40) · Chaos Engineering (`data-v2-chaos-1…4`, lab 42).
  Randomness ka source video load balancing ko randomness ke ek hisse ki tarah padhata hai; playlist ke alag load-balancer videos baad ke theme mein aate hain — tab lab 41 aur `lib/pick.js` dobara kaam aayenge.
  Purane core levels (`breaker`, `retries` — `resil` track) apni jagah hain.
- **EDA Core ka pehla topic:** Event-Driven Architecture (`data-v2-eda-1…4`, `ed-kyun`, `ed-kaise`, `ed-code`, `ed-kab`; lab 44). Direct wait → per-subscription copies → real order/bus code + Node EventEmitter → measured limits. Poora EDA Core abhi complete nahi; source coverage aur agle topics `dev/eda-plan.md` mein hain.
  Lab 44 ka `captures/` folder raw fixed-clock traces, actual HTTP ke teen runs aur actual broker-restart ke teen runs repo mein rakhta hai. Purane scratch-folder loss ki tarah in records ko sirf `/tmp` mein mat chhodo.
- **Alag First Principles course:** FAANG Senior Engineer ki 15-video playlist, numbered 1→15 (source playlist ulte order mein). User ne alag course aur video 1 se shuru karna chuna. Pehla topic Physics of Software (`data-v2-fp-physics-1…4`, `fp-physics-kyun`, `fp-physics-kaise`, `fp-physics-code`, `fp-physics-kab`; lab 45). Same lookup helpers actual HTTP aur model mein; batching/parallel, latency/bandwidth, FIFO averages, warm file-read limits aur labelled cost arithmetic. Roadmap aur source corrections `dev/first-principles-plan.md` mein. Baaki 14 videos abhi planned hain.

- **Concurrency (separate user request):** `data-v2-concurrency.js` loads after `data-guidance.js` and registers its own always-open track, six levels (`cc-start` through `cc-workers`), diagrams and six guides. Lab 46 uses Java 21+ platform threads; Node is the dependency-free launcher. Docker stages may provide `runtimeNote` HTML to override the legacy Node-only setup note; observation scoring is unchanged. Raw `stage.code.text` is escaped by the dry-run renderer, so Java generics stay literal; the validator still checks the source slice byte-for-byte and validates the remaining lesson HTML. Coverage/evidence is in `dev/concurrency-plan.md` and lab 46's README. Check `node dev/concurrency-test.js` with a JDK installed.

**1. Ek topic = kuch chhote level, har level ek sawaal** (owner ki chaar maangein: samasya pehle · andar ka kaam · asli code aur setup · kab / kab nahi). Default chaar: Kyun · Kaise · Code · Kab. Koi level ~20 dry-run steps se lamba ho toh do bana do (dono topics mein Code aur Library alag hue); chhota topic kam levels le sakta hai (kam se kam do).

| # | id | Sawaal jiska jawab deta hai | Kya hota hai |
|---|---|---|---|
| 1 Kyun | `cb-kyun` | asli samasya kya hai? | samasya **pehle**, slow motion mein (`dryrun` × 2) → ghar ke MCB ka `cards` → naam (`match`) |
| 2 Kaise | `cb-kaise` | andar ka kaam kaise chalta hai? | 16 calls ka `dryrun` (window, hadd, timer, trial) → `order` → `docker` lab |
| 3 Code | `cb-code` | asli code kaisa dikhta hai? | `lib/breaker.js` **line-by-line** (`dryrun` + code pane), phir `tools/mini.js`: apni fetch ke aaspaas breaker |
| 4 Library | `cb-lib` | asli project mein setup kaise? | asli library ka code (`tools/opossum.js`) → asli run mein library kahan alag chali → wahi paanch sawaal doosri jagah (resilience4j, Istio) → default settings ka jaal → bonus `docker` lab |
| 5 Kab | `cb-kab` | kab lagayein, kab nahi? | kab / kab nahi (`bins` → `cards`), do `docker` lab (naapi hui galtiyan: `ex2-counting`, `ex3-half-open`), phir "sach ya galatfehmi" (`bins`) |

**2. Niyam jo files 1–2 mein dikhte hain**

- **Intro screen par sirf ek hook card** (`lesson` mein ek hi entry: scene ya samasya). `objectives` sawaalon ki shakl mein. Saara explanation **stages ke andar** — `dryrun`/`cards` jaisa ek click = ek badlaav.
- Pehle samasya, pehle sawaal (`ask`), phir jawab. **Jargon ka naam sabse aakhir mein**: file 1 mein pehle "time limit" ka sawaal aata hai, `timeout` naam uske jawab ke baad; "circuit breaker" aur `CLOSED/OPEN/HALF-OPEN` ghar ke MCB wale `cards` stage ke aakhri card mein, aur phir `match` mein pakke hote hain.
- Har level mein baaki levels jaisa hi `interview`, `success`, `cards` (Revision Dojo) aur `VISUALS['<level id>']` (hero picture, `SD.viz.svg` se).
- Ek hi kahani har jagah: KhanaKart (food-delivery), `app-api` (lab ki service A, worker pool wali), `recs-service` (lab ki service B, jo latakti hai), user Asha.

**3. Har dry run ek chalne wale lab tool ko mirror karta hai — number lab ke captured output se**

Kuch bhi "andaze se" nahi. Har `dryrun` ke peeche `docker-labs/38-circuit-breaker` ka ek tool hai, aur step ke number us tool ke captured output se:

- Level 1 ka slow motion ↔ `tools/slowmo.js` (4 workers, 18 requests; recs-service 0.8 s se 5.6 s tak latki). "Asli raftaar" wale aakhri step ke number lab ke `ex1-cascade` se.
- Level 2 ka 16-call dry run ↔ `tools/mini.js`. Level 2 ke `docker` stage ka `expect` bhi usi tool ka output hai.
- `lib/breaker.js` ek hi chhoti class hai — lab ki service (`services/a.js`) aur `tools/mini.js` dono yahi chalate hain, aur level 3 (Code) isi class ka asli code line-by-line dikhata hai. Isliye lesson ka code, lab ka code aur chalta hua code kabhi alag nahi ho sakte (`code.text` ko validator asli file se milata hai).
- Story ke ₹ ke figures sirf saaf-saaf "misaal ka hisaab" hain; baaki har number captured run se.

**4. Lab ka output paste hota hai, retype nahi**

Output lesson mein **placeholder substitution** se aata hai: file ko token ke saath likho (jaise `__MINI_OUT__`), phir ek chhoti script captured file (ya README) ka exact slice us token ki jagah daal deti hai. Nateeja file mein seedha text hota hai — runtime par koi placeholder mechanism nahi hai, aur (§10.4) validator `expect` ko asli output se nahi milata. Isliye yeh anushasan khud nibhana padta hai: haath se type kiya number galat ho toh koi pakadta nahi.

**5. Lesson akela khada hota hai**

Lesson mein "video mein…" ya presenter ka zikr nahi. Source video ka credit sirf ek code comment mein hai (file 1 ke sabse upar). Agar koi aam galatfehmi samjhani ho toh "❌ Aam galatfehmi" ke naam se, bina video ka naam liye.

**6. Likhne ka dhang** (files 1–2 se): Hinglish Roman script; chhote vaakya, ek vaakya = ek vichaar; pronoun (`ye/woh/uska`) ki jagah wahi noun dohrao ("recs-service latak gayi", "woh latak gayi" nahi); roz ki misaal → sawaal jaisa heading → mechanism (kaun kya karta hai aur kyun) → number → `🎯 Asli baat:` ek line → jargon ka naam; aakhir mein "ab main kya karoon" (faisla, setting ya command). Feynman-style ("apne shabdon mein samjhao") nahi — uski jagah dry run, scenario aur "kab use karein / kab nahi".

**Lab ka pattern (har topic):** `tools/slowmo.js` (chhota paimaana, tay schedule, ek line ek ghatna; random ho toh `tools/seeded.js` jaisa tay-beej wala), ek chhoti asli code file `lib/<cheez>.js` jise lab ke tools/service sach mein chalate hain, `tools/mini.js` (sabse chhota program), aur jahan ho sake asli library ka demo (`tools/<library>.js`; library scratch folder mein install karke `NODE_PATH` se chalao — project mein `node_modules` nahi). Purane exercises pehle aur baad mein chala ke milao; README fresh output se dobara likho.

---

## 11. 🧠 Soch Akhada — soch-vichaar wale scenario sawal (`soch.js`, `soch.css`, `data-soch-*.js`)

Owner ki maang (2026-11-14): ratta nahi, **critical thinking**. Ek asli jaisi samasya → 3–5 chhote kadam (har jawab par turant
feedback) → saare hal ki tulna → interviewer ka twist → nichod. Home page par "🧠 Soch Akhada" card se khulta hai (hamesha khula),
aur jis level ka topic hai uske complete screen par link aata hai (`levels: [...]` se).

```js
SD.registerScenarios([{
  id: 'stale-balance', icon: '💸', title: '...', topic: 'data', hard: 2,       // topic: soch.js ke TOPICS mein se
  levels: ['replication', 'eventual'],                                        // in levels ke ant mein link dikhega
  story: 'HTML — 75 shabd se kam, naam ke saath', facts: ['HTML', ...],        // 2–5 facts
  steps: [{ t: 'Asli wajah', q: 'HTML', a: [['jawab', 'kyun'], ...] }],        // 3–5 kadam; a[0] HAMESHA sahi jawab
  fixes: [{ n, how, cost, when }],                                             // tulna table, 3–5 rows
  twist: { q: 'HTML', a: [['jawab', 'kyun'], ...] },                           // a[0] sahi
  asli: 'HTML — ek line', say: 'HTML — interview mein aise bolo',
}]);
```

- **Kadam ka kram:** `Asli wajah` → `Hal chuno` → `Keemat`. Twist mein haalaat badalte hain (bojh 10 guna, do server, network toota).
- **Har jawab ka apna "kyun"** — galat jawab par wahi dikhta hai. Galat jawab bhi aisa ho jo ek samajhdaar insaan chun sakta hai.
- **Lambai ka niyam** (validator fail karta hai): sahi jawab sabse lambe galat jawab ke 1.15 guna se chhota aur sabse chhote galat
  jawab ke 0.85 guna se bada ho. Theek karna ho toh galat jawab ko lamba karo, sahi ko kaato mat.
- **Kahani:** ChaiPay (UPI wallet): `wallet-api`, `pay-api`, `api-gateway`, `pg-primary` + `pg-replica-1/2`, users Riya aur Aman. ₹ mein number.
- Progress `SD.state.soch` (id → stars) mein; XP sirf pehli baar. Renderer scenario data par kuch nahi likhta. Buttons: `so-opt` (`data-i`), `so-next`, `so-done`.
- Nayi file: IIFE mein likho, `index.html` + `gallery.html` + `validate.js` ke `CONTENT` mein `data-guidance.js` se pehle jodo.
- Jaanch: `node validate.js` ka "🧠 SOCH AKHADA" hissa har scenario ko sahi jawab se aur pehle-galat jawab se poora chalata hai.
