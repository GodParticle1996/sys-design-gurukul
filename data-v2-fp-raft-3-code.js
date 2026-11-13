/* First Principles — FAANG Senior Engineer.
   Source credit: Distributed Consensus & Raft (xU-7JxwUpLo), numbered video 9/15.
   Evidence: docker-labs/59-consensus/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "q", "icon": "🔢", "label": "majority(n)", "x": 160, "y": 120}, {"id": "o", "icon": "🔗", "label": "overlap", "x": 450, "y": 120}, {"id": "v", "icon": "🗳️", "label": "vote shart", "x": 740, "y": 120}];
const EDGES = [{"from": "q", "to": "o"}, {"from": "o", "to": "v"}];
VISUALS["fp-raft-code"] = { t: "Majority = floor(n/2) + 1 → do majorities milti hain → common voter up-to-date shart se galat candidate rokta hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { q: {tone:'ok',badge:'5 → 3'}, o: {tone:'ok',badge:'hamesha'}, v: {tone:'acc',badge:'log check'} } }, {w:900,h:240}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-raft-code",
  "icon": "🔢",
  "group": "🗳️ Consensus & Raft",
  "title": "Raft 3 · Code — majority aur vote ki shart, line by line",
  "badge": "Quorum Ka Ganitagya",
  "objectives": [
    "Majority aur overlap ka code (bits se subsets)",
    "Up-to-date shart ki ek line kya bachaati hai",
    "Consensus ki keemat asli fsync par"
  ],
  "lesson": [
    "<h3>🧮 Haath ki ginti</h3><p>Paanch dost, kam se kam teen ki haan chahiye. Kya do alag teen-teen ki toliyan bina kisi common dost ke ban sakti hain? Haath par gino: 3 + 3 = 6, dost sirf 5 — ek dost dono toliyon mein hoga.</p><p>Aaj teen-teen ki toliyon wali ginti code mein dekhte hain, aur up-to-date shart bhi, jo galat aadmi ko mukhiya banne se rokti hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🔢 quorum.js: majority ka hisaab, line by line",
      "goal": "lib/quorum.js. Teen sawaal: majority kitni, kitne down sah sakte hain, aur kya do quorums hamesha milte hain? Lab 59 ex0 in teen functions ko chalata hai.",
      "code": {
        "title": "lib/quorum.js",
        "file": "docker-labs/59-consensus/lib/quorum.js",
        "from": 3,
        "text": "const majority = n => Math.floor(n / 2) + 1;\nconst tolerates = n => n - majority(n);    // voters that may be down while a majority still exists\n\nconst size = m => { let c = 0; for (let x = m; x; x &= x - 1) c++; return c; };\n// every subset of {0..n-1} with at least q members, as bit masks\nfunction quorums(n, q) {\n  const out = [];\n  for (let m = 0; m < 1 << n; m++) if (size(m) >= q) out.push(m);\n  return out;\n}\n// do two quorums of size >= q always share a voter?\nfunction alwaysOverlap(n, q) {\n  const qs = quorums(n, q);\n  for (const a of qs) for (const b of qs) if ((a & b) === 0) return false;\n  return true;\n}\n// chance that at least q of n voters are up; each is up on its own with probability 1 - p\nfunction choose(a, b) { let r = 1; for (let i = 1; i <= b; i++) r = r * (a - b + i) / i; return r; }\nfunction chanceUp(n, q, p) {\n  let s = 0;\n  for (let up = q; up <= n; up++) s += choose(n, up) * (1 - p) ** up * p ** (n - up);\n  return s;\n}"
      },
      "vars": [
        {
          "id": "n",
          "label": "n (voters)"
        },
        {
          "id": "q",
          "label": "quorum"
        },
        {
          "id": "ans",
          "label": "Nateeja"
        }
      ],
      "steps": [
        {
          "title": "1. Majority",
          "say": "Line 3: <code>floor(n / 2) + 1</code>. 5 → 3, 4 → 3, 3 → 2.",
          "line": "3",
          "vars": {
            "n": "5",
            "q": "3",
            "ans": "majority 3"
          }
        },
        {
          "title": "2. Kitne down",
          "say": "Line 4: <code>n − majority</code>. 5 → 2, 4 → 1, 3 → 1. 4 nodes ek bhi zyada failure nahi sahte.",
          "line": "4",
          "vars": {
            "n": "4",
            "q": "3",
            "ans": "1 down sah sakta"
          }
        },
        {
          "title": "3. Subsets as bits",
          "say": "Line 6–12: har subset ek number ke bits (5 nodes → 0 se 31). Line 6 bits ginti hai; line 10 sirf kam se kam q voters wale subsets rakhti hai.",
          "line": "6-12",
          "vars": {
            "n": "5",
            "q": "3",
            "ans": "16 subsets ≥ 3"
          },
          "ask": {
            "q": "5 nodes ke kitne subsets mein kam se kam 3 nodes hain?",
            "choices": [
              "16 — 5C3 + 5C4 + 5C5 = 10 + 5 + 1",
              "10 — sirf theek 3 wale subsets ginte hain",
              "32 — har subset quorum hai"
            ],
            "answer": 0,
            "hint": "Line 10 ki shart: size(m) >= q.",
            "explain": "Theek 3: 10 tareeke, theek 4: 5, theek 5: 1 → 16. Line 10 \">= q\" rakhti hai, isliye bade subsets bhi quorum hain (zyada votes milna bhi jeet hai).",
            "choiceExplanations": [
              "Theek 3: 10 tareeke, theek 4: 5, theek 5: 1 → 16. Line 10 \">= q\" rakhti hai, isliye bade subsets bhi quorum hain (zyada votes milna bhi jeet hai).",
              "Shart >= hai; 4 aur 5 wale subsets bhi quorum hain.",
              "Size 0–2 wale subsets majority nahi, isliye quorum nahi."
            ]
          }
        },
        {
          "title": "4. Overlap",
          "say": "Line 14–18: har do quorums <code>a</code>, <code>b</code> ka <code>a &amp; b</code>. 0 = koi common voter nahi → false.",
          "line": "14-18",
          "vars": {
            "n": "4",
            "q": "2",
            "ans": "false: {1,2} & {3,4} = 0"
          },
          "ask": {
            "q": "n = 4, q = 2 (aadha) par line 16 false kyun lautaati hai?",
            "choices": [
              "{1,2} aur {3,4} dono quorum; AND = 0, common voter nahi",
              "4 nodes ke liye quorums gin'ne mein bits kam pad jaate hain",
              "q = 2 par koi bhi quorum banta hi nahi"
            ],
            "answer": 0,
            "hint": "Do 2-2 ke gut jod kar kitne nodes bante hain?",
            "explain": "2 + 2 = 4 = n: do gut poore cluster ko bina overlap ke baant sakte hain. Dono apna leader chunte — split brain. q = 3 (majority) par 3 + 3 = 6 > 4, toh overlap pakka; line 16 kabhi 0 nahi paati.",
            "choiceExplanations": [
              "2 + 2 = 4 = n: do gut poore cluster ko bina overlap ke baant sakte hain. Dono apna leader chunte — split brain. q = 3 (majority) par 3 + 3 = 6 > 4, toh overlap pakka; line 16 kabhi 0 nahi paati.",
              "Bits kaafi hain: 4 nodes = 0–15, sab gine gaye.",
              "q = 2 par {1,2}, {3,4} jaise kai quorums bante hain."
            ]
          }
        },
        {
          "title": "5. Chalne ka chance",
          "say": "Line 20–25: binomial — kam se kam q nodes zinda hon, har node alag-alag p chance se band. p = 5%: 3 nodes 99.275%, 4 nodes 98.598%.",
          "line": "20-25",
          "vars": {
            "n": "3 vs 4",
            "q": "2 vs 3",
            "ans": "99.275% vs 98.598%"
          }
        }
      ],
      "lesson": "Majority = floor(n/2) + 1. Do majorities ka jod n se bada, isliye overlap pakka. 4 nodes 3 jitni failure sahte hain par kam chalte hain."
    },
    {
      "type": "dryrun",
      "title": "🗳️ trial(): ek line jo committed data bachaati hai",
      "goal": "lib/uptodate.js. 5 nodes; committed entry X leader 1 + do followers par; leader 1 mara. Nodes 2–5 mein se 2 ke paas X. Timers random kram mein bajte hain; pehle baje wala candidate, 3 votes chahiye.",
      "code": {
        "title": "lib/uptodate.js",
        "file": "docker-labs/59-consensus/lib/uptodate.js",
        "from": 14,
        "text": "function trial(rule, r) {\n  const nodes = [2, 3, 4, 5], has = new Set();\n  const holders = shuffle(nodes, r);\n  has.add(holders[0]); has.add(holders[1]);         // 2 of nodes 2–5 hold the committed entry X\n  const order = shuffle(nodes, r);                   // whose timer fires first, second, …\n  let rounds = 0;\n  for (const cand of order) {\n    rounds++;\n    let votes = 1;                                   // a candidate votes for itself\n    for (const v of nodes) {\n      if (v === cand) continue;\n      const upToDate = has.has(cand) || !has.has(v); // candidate's log at least as new as mine?\n      if (!rule || upToDate) votes++;\n    }\n    if (votes >= 3) return { lost: !has.has(cand), rounds };\n  }\n  return { lost: false, rounds, none: true };\n}"
      },
      "vars": [
        {
          "id": "cand",
          "label": "Candidate"
        },
        {
          "id": "votes",
          "label": "Votes"
        },
        {
          "id": "x",
          "label": "X bacha?"
        }
      ],
      "steps": [
        {
          "title": "1. Kiske paas X",
          "say": "Line 15–17: nodes 2–5 mein se do random nodes ke paas X (maan lo 2 aur 3). Line 18: timers ka kram (maan lo pehle 4, phir 2).",
          "line": "15-18",
          "vars": {
            "cand": "—",
            "votes": "—",
            "x": "2, 3 ke paas"
          }
        },
        {
          "title": "2. Node 4 khada hua",
          "say": "Line 20–22: pehla candidate node 4 (bina X). Khud ka vote: 1.",
          "line": "20-22",
          "vars": {
            "cand": "4 (X nahi)",
            "votes": "1",
            "x": "?"
          }
        },
        {
          "title": "3. Voters ki shart",
          "say": "Line 25: <code>upToDate = has(cand) || !has(v)</code> — candidate ke paas X hai, ya voter ke paas bhi nahi. Node 5 (X nahi): haan. Nodes 2, 3 (X hai): candidate ke paas nahi → nahi.",
          "line": "23-27",
          "vars": {
            "cand": "4",
            "votes": "2 (4 aur 5)",
            "x": "bacha"
          },
          "ask": {
            "q": "rule = false ho toh line 26 kya karti hai?",
            "choices": [
              "!rule true — har voter haan; node 4 jeet'ta, X mit'ta",
              "Koi vote nahi deta — rule false matlab election band",
              "Sirf X wale vote dete hain — rule false ulta niyam hai"
            ],
            "answer": 0,
            "hint": "<code>if (!rule || upToDate)</code> — rule false par pehla hissa?",
            "explain": "rule = false → !rule = true → shart hamesha sach → har voter haan. Node 4 jeet'ta, line 28: <code>lost: !has(4)</code> = true. Lab 59 ex3: 50.1% baar aisa. rule = true par sirf upToDate wale haan kehte hain.",
            "choiceExplanations": [
              "rule = false → !rule = true → shart hamesha sach → har voter haan. Node 4 jeet'ta, line 28: <code>lost: !has(4)</code> = true. Lab 59 ex3: 50.1% baar aisa. rule = true par sirf upToDate wale haan kehte hain.",
              "Election band nahi hota; shart hamesha sach ho jaati hai.",
              "Ulta niyam nahi; rule false matlab koi shart nahi."
            ]
          }
        },
        {
          "title": "4. Haar aur agla",
          "say": "Line 28: 2 votes < 3 → node 4 haara. Loop agla candidate leta hai: node 2 (X hai). Sab voters ke liye upToDate sach → 4 votes, leader. Line 28: <code>lost: false</code>.",
          "line": "28",
          "vars": {
            "cand": "2 (X hai)",
            "votes": "4",
            "x": "bacha"
          }
        }
      ],
      "lesson": "Ek shart — candidate ka log voter ke log jitna naya — committed entry ko bachaati hai. Keemat: kabhi-kabhi ek haara hua election."
    },
    {
      "type": "docker",
      "title": "🧪 Consensus ki keemat, asli fsync par",
      "project": "59-consensus",
      "exercise": "ex2-price",
      "goal": "Is laptop ki disk par asli fsync (400 baar), phir model RTT ke saath single node vs Raft (same AZ, regions), batch 1 / 16 / 128.",
      "why": "Node 24+ chahiye. fsync asli hai, isliye numbers thode hilenge; RTT model hai.",
      "steps": [
        {
          "text": "Lab folder se chalao.",
          "cmd": "cd docker-labs/59-consensus && npm start -- ex2-price",
          "expect": "Asli fsync, 400 baar (128-byte entry): median 1.10 ms, p99 1.96 ms\n\nsetup                         ek commit: median     p99       commits/sec (B = batch)\nsingle node (sirf fsync)              1.10 ms     2.02 ms   B=1: 909  B=16: 14,536  B=128: 1,16,291\nRaft 3 nodes, same AZ (RTT 0.5 ms)    1.57 ms     2.02 ms   B=1: 635  B=16: 10,159  B=128: 81,275\nRaft 3 nodes, regions (RTT 60 ms)    61.07 ms    61.27 ms   B=1: 16  B=16: 262  B=128: 2,096\n\ncommits/sec = B ÷ ek round ka median (ek leader, ek ke baad ek round; pipelining aur CPU nahi gina).\nConsensus ki keemat: har commit par fsync + kam se kam ek network round trip. Regions mein RTT hi sab kuch.\nBatching ek fsync aur ek round trip ko kai entries mein baant'ti hai; Raft implementations (jaise etcd) bhi entries batch karte hain."
        },
        {
          "text": "Lab ke tests.",
          "cmd": "npm test",
          "expect": "✔ quorum: majorities always overlap; N/2 groups can be disjoint; odd N beats the next even N (5.652821ms)\n✔ elections: identical timeouts never elect; a 150–300 ms range rarely splits (107.191474ms)\n✔ election restriction: without it a committed entry is lost about half the time; with it never (6.906776ms)\n✔ reads: a cut-off leader serving locally returns old data; ReadIndex refuses; a lease is safe only while clocks behave (0.304685ms)\n✔ price: a commit waits for the leader fsync AND the faster follower (RTT + fsync) (0.105664ms)\nℹ tests 5\nℹ suites 0\nℹ pass 5\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 161.489217"
        }
      ],
      "observe": {
        "q": "Same AZ mein Raft commit (~1.6 ms) single node (~1.1 ms) se zyada kyun, par regions mein ~61 ms?",
        "choices": [
          "Commit = leader fsync ya RTT + follower fsync, jo dheema",
          "Raft har commit par do baar fsync karta hai, isliye hamesha dugna",
          "Regions mein followers ki disk hamesha dheemi hoti hai"
        ],
        "answer": 0,
        "hint": "Same AZ mein RTT kitna, regions mein kitna?",
        "explain": "Leader apna fsync aur follower ka (RTT + fsync) saath chalte hain; dheema hissa hi commit ka samay tay karta hai. Same AZ: 0.5 + ~1.1 ms ≈ 1.6 ms. Regions: 60 + ~1.1 ms ≈ 61 ms. Lab: batch 128 par same AZ ~80,000/sec, regions ~2,100/sec (model).",
        "choiceExplanations": [
          "Leader apna fsync aur follower ka (RTT + fsync) saath chalte hain; dheema hissa hi commit ka samay tay karta hai. Same AZ: 0.5 + ~1.1 ms ≈ 1.6 ms. Regions: 60 + ~1.1 ms ≈ 61 ms. Lab: batch 128 par same AZ ~80,000/sec, regions ~2,100/sec (model).",
          "Leader aur follower ka fsync saath chalta hai; jod nahi hota.",
          "Lab mein sab fsync samples ek hi disk ke hain; farq sirf RTT ka."
        ]
      },
      "lesson": "Majority ka code chhota hai, par up-to-date shart ke bina safety tooti. Consensus ki keemat: fsync + round trip; batching se baant'o."
    }
  ],
  "interview": {
    "title": "Interview Round — code",
    "instructions": "Pehle socho: shart ka har hissa kab sach hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Code review: <code>const majority = n => Math.ceil(n / 2)</code>. Kya galat hai?",
        "choices": [
          "Even n par aadha (4 → 2): do 2-2 gut, split brain",
          "Kuch nahi — ceil aur floor + 1 hamesha barabar hote hain",
          "Odd n par galat hai, even par sahi",
          "Sirf performance ka sawaal — ceil dheema hai"
        ],
        "answer": 0,
        "explain": "n = 4: ceil(2) = 2, par floor(2) + 1 = 3. 2 + 2 = 4 = n, toh do alag gut quorum ban jaate hain (lab 59 ex0: \"aadha\" quorum overlap NAHI). Odd n par dono barabar hain (5 → 3), isliye bug sirf even n par dikhta hai.",
        "choiceExplanations": [
          "n = 4: ceil(2) = 2, par floor(2) + 1 = 3. 2 + 2 = 4 = n, toh do alag gut quorum ban jaate hain (lab 59 ex0: \"aadha\" quorum overlap NAHI). Odd n par dono barabar hain (5 → 3), isliye bug sirf even n par dikhta hai.",
          "Even n par farq hai: 4 par 2 vs 3.",
          "Ulta: odd n par dono barabar, even par galat.",
          "Samay ka sawaal nahi; safety ka hai."
        ]
      },
      {
        "q": "Raft voter ki shart: \"candidate ka log mere jitna naya\". Log ka \"naya\" kaise milaate hain?",
        "choices": [
          "Aakhri entry ka term; barabar ho toh log ki lambai",
          "Sirf log ki lambai — lamba log hamesha naya",
          "Node ki wall clock — aage ghadi wale node ka log naya",
          "Node id — bada id wale node ka log naya"
        ],
        "answer": 0,
        "explain": "Raft §5.4.1: aakhri entry ka term bada = log naya; term barabar ho toh lamba log naya. Sirf lambai dekho toh ek purane term ka lamba (uncommitted) log naye term ke chhote log ko hara sakta hai.",
        "choiceExplanations": [
          "Raft §5.4.1: aakhri entry ka term bada = log naya; term barabar ho toh lamba log naya. Sirf lambai dekho toh ek purane term ka lamba (uncommitted) log naye term ke chhote log ko hara sakta hai.",
          "Lambai akele galat: purane term ki lambi uncommitted entries jeet jaayengi.",
          "Raft wall clock par bharosa nahi karta; term logical ghadi hai.",
          "Node id ka log ki taazgi se koi rishta nahi."
        ]
      }
    ]
  },
  "success": [
    "Majority aur overlap ka code samjha sakte ho",
    "Up-to-date shart ki line aur shart ka asar bata sakte ho",
    "Consensus ki keemat fsync + RTT se samjha sakte ho"
  ],
  "cards": [
    {
      "front": "majority(n)?",
      "back": "floor(n/2) + 1. 4 → 3, 5 → 3. ceil(n/2) even n par aadha deta hai (4 → 2): do alag gut, split brain."
    },
    {
      "front": "Raft mein log \"naya\" kaise?",
      "back": "Aakhri entry ka term bada = naya; term barabar toh lamba log naya (§5.4.1)."
    },
    {
      "front": "Raft commit ki keemat?",
      "back": "max(leader fsync, RTT + follower fsync). Lab 59 ex2: single node ~1.1 ms, same AZ ~1.6 ms, regions ~61 ms; batch 128 se throughput kai guna."
    }
  ]
}
]);
})();
