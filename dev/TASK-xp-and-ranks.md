# Task: make XP fair across stage types and stretch the rank ladder

You are picking up a small, self-contained task in **System Gurukul**, a Hinglish system-design learning app at
`/home/vibekdutta/VixiApps/sys-design-gurukul`. It is plain HTML/JS with no build step: open `index.html` in a
browser. The XP rules feel uneven to the learner, and the top rank comes far too early. Check every claim below
against the code before you rely on it; the numbers were measured on 2026-10-29 and content keeps changing.

## Why this matters

The learner uses the app for gamified, spaced-repetition study and has ADHD, so visible progress keeps them going.
Two things currently undercut that.

### 1. XP is awarded unevenly

`SD.addXP(SD.XP_PER_ITEM)` (10 XP) fires once for each answer that is correct on the first try. Only some stage
types call it:

| File | Stage types | Per-answer XP today |
| --- | --- | --- |
| `games.js` | quiz, bins, order, match, fill, hotspot, incident | ✅ 10 XP per first-try item |
| `app.js` (`renderInterview`) | interview MCQs | ✅ 10 XP |
| `perfsim.js` | terminal missions | ✅ 30 XP minus 5 per hint |
| `canvas.js` | design canvas | ❌ none |
| `labs.js` | replay, tradeoff, estimate, archdiff | ❌ none |
| `explain.js` | dryrun, cards | ❌ none |
| `dockerlab.js` | docker (observation question) | ❌ none |

Every stage also gets a 20 XP bonus when perfect (`stageDone` in `app.js`).

The playlist courses (`fp-core`, `sdd-eda`, `sdd-resil`) are mostly dry runs, and the company, AI and planet stories
are mostly labs, so those levels earn about 113–174 XP each. Levels in the classic tracks earn about 250.

### 2. The rank ladder tops out early

`RANKS` in `data-core.js` has 20 ranks, from 0 to 17,200 XP ("Architect Mahaguru 👑"). The whole app can award
about 44,100 XP, or about 50,900 with per-answer XP everywhere. So the top rank arrives after 34–39% of the
content, and the rank bar then says "MAX RANK" for the rest. Some icons also repeat: 🔌, 🧩 and 🌐 each appear
twice.

## Ask first

The user has not chosen a direction yet. Before you change any code, ask them one question with these options:

- **A. Even XP and a longer ladder (recommended).** Award 10 XP per first-try answer in every stage type, and add
  new ranks above 17,200 so that the last rank lands near finishing the app. Existing thresholds and names stay,
  so no learner drops a rank.
- **B. Even XP only.** Keep the ladder as it is.
- **C. Ladder only.** Keep the XP rules as they are.

## What to do (for A; drop the parts B or C don't need)

1. **Per-answer XP in the four silent renderers.** Copy the `games.js` pattern: award exactly once per item, only
   when that item was right on the first try, through `SD.addXP`. `SD.addXP` already keeps XP pending until the
   level is finished, and gives nothing on replays; don't commit XP yourself. Each renderer already tracks
   first-try correctness:
   - **design:** each slot whose pick is best-in-class on the *first* review (`firstTryGood`).
   - **replay:** each `ask` frame answered without a wrong pick.
   - **tradeoff:** the goal (1), plus the optional `quiz` when answered first try.
   - **estimate:** each problem whose first guess had the right order of magnitude.
   - **archdiff:** each node classified correctly at the first click (the renderer counts `wrong`).
   - **dryrun/cards:** each `ask` answered first try (the `answered[i]` flag).
   - **docker:** the observation question, answered first try.
2. **Longer ladder.** Recompute the maximum XP (snippet below). Add ranks above 17,200 so that the final rank sits at
   roughly 90–95% of the maximum. Keep the existing 20 thresholds and names. Match the existing naming style:
   alliterative Hinglish titles like "Cache Chatur" or "Napkin Nawab", each with its own icon. Decide what happens
   to the 👑 title: keep "Architect Mahaguru" where it is and give the new top rank a fresh crowning name, or move
   the crown icon up. Thresholds must stay strictly increasing. The certificate and topbar read `RANKS`
   dynamically, so no other change should be needed. Verify that anyway.
3. **Tests.** The Node replay harness stubs XP (`tools/replay-exercises.js` sets `SD.addXP = () => {}`). Add a
   focused check, either a new `dev/xp-test.js` (wired into `validate.js` or `dev/README.md`) or a section of
   `dev/progress-test.js`, that proves for each renderer type:
   - first-try correct answers award XP exactly once;
   - a wrong-then-right answer awards nothing;
   - replaying a completed level awards nothing.
   Add a check that `RANKS` thresholds strictly increase and that icons are unique.

Recompute the economy with this (it counts first-try items per stage type):

```bash
cd /home/vibekdutta/VixiApps/sys-design-gurukul && node -e '
const { loadApp } = require("./dev/load-app.js"); const { levels, context } = loadApp();
const RANKS = require("vm").runInContext("RANKS", context);
const path = st => { let n = 0, id = st.start, seen = new Set(); while (id && st.nodes[id] && !st.nodes[id].end && !seen.has(id)) { seen.add(id); n++; const g = st.nodes[id].choices.find(c => c.good); id = g && g.next; } return n; };
const items = s => ({ quiz: (s.questions||[]).length, bins: (s.items||[]).length, order: (s.steps||[]).length, match: (s.pairs||[]).length,
  fill: (s.blanks||[]).length, hotspot: (s.questions||[]).length, incident: s.type === "incident" ? path(s) : 0, design: (s.slots||[]).length,
  replay: (s.frames||[]).filter(f => f.ask).length, tradeoff: 1 + (s.quiz ? 1 : 0), estimate: (s.problems||[]).length, archdiff: (s.nodes||[]).length,
  dryrun: (s.steps||[]).filter(x => x.ask).length, cards: (s.steps||[]).filter(x => x.ask).length, docker: 1 })[s.type] || 0;
let max = 0; levels.forEach(({ level }) => { level.stages.forEach(s => { max += s.type === "terminal" ? 30 + 20 : items(s) * 10 + (items(s) ? 20 : 0); });
  (level.interview ? level.interview.questions : []).forEach(q => { max += q.terminal ? 30 : 10; }); if (level.interview) max += 20; });
console.log("max XP with per-answer XP everywhere:", max, "| current top rank:", RANKS[RANKS.length - 1].xp);'
```

## Rules

- **Language.** All learner-facing text is Hinglish in Latin script; the validator fails on Devanagari or Cyrillic.
  Write simply. Don't use pronoun stand-ins (woh/yeh/isse/uska…) for something named earlier; repeat the noun.
- **Tests.** Run all of these and keep them green:
  ```bash
  node validate.js
  node tools/replay-missions.js
  node tools/replay-exercises.js
  node tools/quiz-quality.js --check
  node tools/tradeoff-test.js
  node dev/state-test.js
  node dev/progress-test.js
  ```
- **Git.** Make a local commit when done. **Never push without asking the user first**: a push to GitHub deploys
  the live Cloudflare site. Commit messages: a short subject, a body, and the attribution line your harness gives.
- **Concurrent work.** A whole-app review is in progress; see `dev/REVIEW.md`. This task should only touch
  `canvas.js`, `labs.js`, `explain.js`, `dockerlab.js`, `data-core.js` (`RANKS`) and tests. If you need anything
  else, check `git status` and the review checkpoint first, so you don't overwrite someone's work in progress.
- **Wrap-up.** When finished, add one line about it to `dev/REVIEW.md` under the current phase, and tell the user
  in 3–5 lines what changed, the new maximum XP, and where the top rank now lands.
