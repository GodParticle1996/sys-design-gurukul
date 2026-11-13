/* First Principles — FAANG Senior Engineer.
   Source credit: Sharding (X72epD9Qn3U), numbered video 7/15.
   Evidence: docker-labs/57-sharding/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "a", "icon": "🗄️", "label": "Server A", "x": 430, "y": 60}, {"id": "k", "icon": "🔑", "label": "Key user:1234", "x": 760, "y": 60}, {"id": "d", "icon": "🆕", "label": "Server D (naya)", "x": 760, "y": 200}, {"id": "b", "icon": "🗄️", "label": "Server B", "x": 560, "y": 330}, {"id": "c", "icon": "🗄️", "label": "Server C", "x": 160, "y": 200}];
const EDGES = [{"from": "a", "to": "k"}, {"from": "k", "to": "d"}, {"from": "d", "to": "b"}, {"from": "b", "to": "c"}, {"from": "c", "to": "a"}];
VISUALS["fp-shard-kaise"] = { t: "D 3 baje juda: sirf 12 → 3 wali keys B se D ko gayi. Baaki keys apni jagah.", html: SD.viz.svg(HERO, EDGES, { nodes: { a: {tone:'idle',badge:'12 baje'}, k: {tone:'acc',badge:'2 baje'}, d: {tone:'ok',badge:'3 baje'}, b: {tone:'idle',badge:'4 baje'}, c: {tone:'idle',badge:'8 baje'} } }, {w:900,h:400}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-shard-kaise",
  "icon": "⭕",
  "group": "🔪 Sharding",
  "title": "Sharding 2 · Kaise — ring, vnodes, aur viral key",
  "badge": "Ring Ka Ghadisaaz",
  "objectives": [
    "hash % N mein shard jodne par kitni keys hilti hain, aur kyun?",
    "Ring par key ka server kaise tay hota hai, aur vnodes kya theek karte hain?",
    "Ek viral key ko todna: writes kitne badhe, padhna kitna mehnga?"
  ],
  "lesson": [
    "<h3>🍬 Mithai ki dukaan ke dabbe</h3><p>Dukaandaar ne niyam rakha: order number ko 4 se bhaag do, bacha hua = dabba number. Paanchva dabba aaya, niyam 5 se bhaag ka hua — aur lagbhag har order ka dabba badal gaya. Saari mithai dobara rakhni padi.</p><p>Ab doosra niyam: dabbe ek gol mez par rakho. Order ka number mez par ek jagah girta hai; ghadi ki sui ki disha mein pehla dabba us order ka. Naya dabba rakho toh sirf us dabbe ke theek peeche wale orders badalte hain. Aaj ginte hain: kitni keys hilti hain, aur ek hi order par bheed ho toh kya hota hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "⭕ hash % N se ring tak: kaunsi keys hilti hain?",
      "goal": "Lab 57 ex0: 10 lakh keys (user:0 … user:999999), hash = MD5 ke pehle 4 bytes. Pehle <code>hash % N</code>, phir ring (Karger et al., 1997): hash ki poori range ek gol ghadi, servers ghadi par points, key apne point se <b>clockwise</b> pehle server ki.",
      "nodes": [
        {
          "id": "a",
          "icon": "🗄️",
          "label": "Server A",
          "x": 430,
          "y": 60
        },
        {
          "id": "k",
          "icon": "🔑",
          "label": "Key user:1234",
          "x": 760,
          "y": 60
        },
        {
          "id": "d",
          "icon": "🆕",
          "label": "Server D (naya)",
          "x": 760,
          "y": 200
        },
        {
          "id": "b",
          "icon": "🗄️",
          "label": "Server B",
          "x": 560,
          "y": 330
        },
        {
          "id": "c",
          "icon": "🗄️",
          "label": "Server C",
          "x": 160,
          "y": 200
        }
      ],
      "edges": [
        {
          "from": "a",
          "to": "k"
        },
        {
          "from": "k",
          "to": "d"
        },
        {
          "from": "d",
          "to": "b"
        },
        {
          "from": "b",
          "to": "c"
        },
        {
          "from": "c",
          "to": "a"
        }
      ],
      "viz": {
        "w": 900,
        "h": 400
      },
      "vars": [
        {
          "id": "rule",
          "label": "Niyam"
        },
        {
          "id": "moved",
          "label": "Keys hilin"
        },
        {
          "id": "owner",
          "label": "user:1234 ka server"
        }
      ],
      "steps": [
        {
          "title": "hash % 4",
          "clock": "mod N",
          "say": "4 shards, niyam <code>hash(key) % 4</code>. Alag keys lagbhag barabar bant'ti hain. Ab 5va shard joda: niyam <code>% 5</code>.",
          "nodes": {
            "a": {
              "tone": "idle",
              "badge": ""
            },
            "k": {
              "tone": "acc",
              "badge": "% 4 → % 5"
            },
            "d": {
              "tone": "idle",
              "badge": ""
            },
            "b": {
              "tone": "idle",
              "badge": ""
            },
            "c": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "rule": "hash % N",
            "moved": "?",
            "owner": "—"
          },
          "ask": {
            "q": "4 se 5 shards par kitni keys ka shard badlega?",
            "choices": [
              "80% — key tabhi tikti hai jab hash % 4 == hash % 5; 20 mein se 4 baar",
              "20% — sirf naye shard ka hissa (1/5) hilta hai, baaki keys apni jagah",
              "25% — chaar purane shards mein se har ek apni ek-chauthai keys dega"
            ],
            "answer": 0,
            "hint": "hash 0 se 19 tak likho. Kitne hash ke liye h % 4 == h % 5?",
            "explain": "20 lagaataar hash values mein sirf 4 (0, 1, 2, 3) ka % 4 aur % 5 barabar hai. Baaki 80% ka shard badla. Lab ex0: 4 → 5 par 80.0%, 100 → 101 par 99.0%. Formula: jodne par N/(N+1) (N = pehle ki ginti); hatane par (N−1)/N. Video ka (N−1)/N jodne par tab sahi aata hai jab N naye shards ki ginti ho.",
            "choiceExplanations": [
              "20 lagaataar hash values mein sirf 4 (0, 1, 2, 3) ka % 4 aur % 5 barabar hai. Baaki 80% ka shard badla. Lab ex0: 4 → 5 par 80.0%, 100 → 101 par 99.0%. Formula: jodne par N/(N+1) (N = pehle ki ginti); hatane par (N−1)/N. Video ka (N−1)/N jodne par tab sahi aata hai jab N naye shards ki ginti ho.",
              "1/5 ring ka ideal hai; % N ka niyam har key ka ghar dobara ginta hai.",
              "% 5 purane ghar yaad nahi rakhta; keys chaaron shards ke beech bhi hilti hain."
            ]
          }
        },
        {
          "title": "Ring par chalo",
          "clock": "ring",
          "say": "Kalpanik ring positions: A 12 baje, B 4 baje, C 8 baje. user:1234 ka hash 2 baje par. Clockwise chalo: pehla server B.",
          "nodes": {
            "a": {
              "tone": "idle",
              "badge": "12 baje"
            },
            "k": {
              "tone": "acc",
              "badge": "2 baje"
            },
            "d": {
              "tone": "idle",
              "badge": "abhi nahi"
            },
            "b": {
              "tone": "ok",
              "badge": "4 baje · malik"
            },
            "c": {
              "tone": "idle",
              "badge": "8 baje"
            }
          },
          "vars": {
            "rule": "clockwise pehla",
            "moved": "—",
            "owner": "B"
          },
          "flows": [
            {
              "from": "k",
              "to": "d",
              "label": "",
              "tone": "acc"
            },
            {
              "from": "d",
              "to": "b",
              "label": "",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "D joda, 3 baje",
          "clock": "D joda",
          "say": "Naya server D ka hash 3 baje par giraa. Ab 2 baje se clockwise pehla server D.",
          "nodes": {
            "a": {
              "tone": "idle",
              "badge": "12 baje"
            },
            "k": {
              "tone": "acc",
              "badge": "2 baje"
            },
            "d": {
              "tone": "ok",
              "badge": "3 baje · naya malik"
            },
            "b": {
              "tone": "idle",
              "badge": "4 baje · keys gayi"
            },
            "c": {
              "tone": "idle",
              "badge": "8 baje"
            }
          },
          "vars": {
            "rule": "clockwise pehla",
            "moved": "sirf 12 → 3 wala hissa",
            "owner": "D"
          },
          "flows": [
            {
              "from": "k",
              "to": "d",
              "label": "",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "D jodne par kaunsi keys hilin?",
            "choices": [
              "Sirf 12 aur 3 baje ke beech ki keys — B se D ko; C aur A ki keys apni jagah rahi",
              "Saari keys — naye server ke baad ring ke saare points dobara gine jaate hain",
              "B aur C dono ki aadhi keys — D apne dono padosiyon se barabar hissa leta hai"
            ],
            "answer": 0,
            "hint": "5 baje ki key aur 10 baje ki key ka clockwise pehla server badla?",
            "explain": "Sirf D ka naya hissa hila: A (12) aur D (3) ke beech ki keys, jo pehle B ki thi. 5 baje → C, 10 baje → A, pehle jaisa. Lab ex0: 100 → 101 par sirf 1.0% keys hilin (ideal 1/101).",
            "choiceExplanations": [
              "Sirf D ka naya hissa hila: A (12) aur D (3) ke beech ki keys, jo pehle B ki thi. 5 baje → C, 10 baje → A, pehle jaisa. Lab ex0: 100 → 101 par sirf 1.0% keys hilin (ideal 1/101).",
              "Ring par baaki servers ke points nahi badalte; sirf D ka naya point juda.",
              "D sirf clockwise peeche wale hisse ko leta hai; C ka hissa (4 → 8) nahi badla."
            ]
          }
        },
        {
          "title": "Ek point per server: tedha",
          "clock": "skew",
          "say": "Video ka kalpanik example: A 12, B 1, C 2 baje par gire. Clockwise niyam lagao.",
          "nodes": {
            "a": {
              "tone": "bad",
              "badge": "12 baje · 2 → 12"
            },
            "k": {
              "tone": "idle",
              "badge": ""
            },
            "d": {
              "tone": "idle",
              "badge": "is example mein nahi"
            },
            "b": {
              "tone": "ok",
              "badge": "1 baje · 12 → 1"
            },
            "c": {
              "tone": "ok",
              "badge": "2 baje · 1 → 2"
            }
          },
          "vars": {
            "rule": "clockwise pehla",
            "moved": "—",
            "owner": "—"
          },
          "ask": {
            "q": "A 12, B 1, C 2 baje par. Ring ka sabse bada hissa kiska?",
            "choices": [
              "A ka — 2 baje se aage ki har key clockwise chalke 12 baje A par pahunchti hai",
              "C ka — C aakhri server hai, toh C ke baad ki saari keys C ke paas rehti hain",
              "B ka — B beech mein hai, isliye B dono taraf ki keys sambhaalta hai"
            ],
            "answer": 0,
            "hint": "3 baje ki key clockwise chalke pehle kis server ko milti hai?",
            "explain": "Key apne se clockwise <b>aage</b> wale server ki hoti hai. 2 → 12 (10 ghante ka hissa) A ka; B ke paas 12 → 1, C ke paas 1 → 2. Video ne 2 → 12 wala hissa C ko diya tha — ulta. Lab 34: ek point per node par load 28.6× tedha.",
            "choiceExplanations": [
              "Key apne se clockwise <b>aage</b> wale server ki hoti hai. 2 → 12 (10 ghante ka hissa) A ka; B ke paas 12 → 1, C ke paas 1 → 2. Video ne 2 → 12 wala hissa C ko diya tha — ulta. Lab 34: ek point per node par load 28.6× tedha.",
              "Key peeche wale server ki nahi hoti; C ke baad ki keys aage chalke A tak jaati hain.",
              "B ke paas sirf 12 → 1 ka hissa hai."
            ]
          }
        },
        {
          "title": "Vnodes",
          "clock": "vnodes",
          "say": "Har server ko 150 points do (virtual nodes). Load lagbhag barabar: lab 34 mein 1.2× (ek point par 28.6×). Lab ex0: 4 → 5 par 17.4% hile (ideal 20%) — kareeb, barabar nahi.",
          "nodes": {
            "a": {
              "tone": "ok",
              "badge": "150 points"
            },
            "k": {
              "tone": "idle",
              "badge": ""
            },
            "d": {
              "tone": "ok",
              "badge": "150 points"
            },
            "b": {
              "tone": "ok",
              "badge": "150 points"
            },
            "c": {
              "tone": "ok",
              "badge": "150 points"
            }
          },
          "vars": {
            "rule": "150 points per server",
            "moved": "~1/(N+1)",
            "owner": "kisi ek point ka"
          }
        },
        {
          "title": "Doosra raasta: slots",
          "clock": "slots",
          "say": "Redis Cluster ring nahi chalata: <b>16,384 hash slots</b>, <code>CRC16(key) mod 16384</code>, aur ek table jo batati hai kaunsa slot kis node par. Node joda toh kuch slots us node ko diye. Asar ring jaisa: sirf diye gaye slots ki keys hilti hain.",
          "nodes": {
            "a": {
              "tone": "idle",
              "badge": "slots"
            },
            "k": {
              "tone": "acc",
              "badge": "slot 5649"
            },
            "d": {
              "tone": "ok",
              "badge": "naye slots"
            },
            "b": {
              "tone": "idle",
              "badge": "slots"
            },
            "c": {
              "tone": "idle",
              "badge": "slots"
            }
          },
          "vars": {
            "rule": "slot table",
            "moved": "sirf diye gaye slots",
            "owner": "table batati hai"
          }
        }
      ],
      "lesson": "hash % N: shard jodne par N/(N+1) keys hilti hain. Ring par sirf naye server ka hissa hilta hai, aur key clockwise aage wale server ki hoti hai. Vnodes load ko barabar ke kareeb laate hain. Fixed slots (Redis) doosra raasta hai."
    },
    {
      "type": "cards",
      "title": "🔥 Ek viral key: vote counter",
      "goal": "Lab 57 ex2: 8 shards (worker threads + SQLite), har vote = ek vote row + counter +1. Votes pehle se bane hain aur router 8 batch tak hawa mein rakhta hai, taaki rukawat shard bane, router nahi.",
      "lesson": "Hash aur vnodes alag keys baant'te hain; ek key par bheed ek shard par hi rehti hai. Key todo (k sub-keys) toh writes baante — par sub-keys takraati hain, aur total ke liye k counters padhne padte hain (ek-key-per-call mein k calls; shard-wise batch mein sirf bhare shards jitni). Latency padhne ke tareeke par hai.",
      "steps": [
        {
          "title": "1. Split 1",
          "say": "Saare 3 lakh votes ek key <code>candidate:A</code> par. 8 mein se 1 shard busy (98–99%), baaki 7 bilkul khaali. 11.3–12.4 lakh writes/sec. Router CPU sirf 2–3%: rukawat shard hai.",
          "ask": {
            "q": "8 shards aur 150 vnodes har shard par. Phir bhi ek hi shard kaam kar raha hai. Kyun?",
            "choices": [
              "Ek key ka hash ek hi point par girta hai; vnodes alag keys baant'te hain, ek key nahi",
              "Vnodes sirf shard jodte waqt kaam karte hain; chalte cluster mein ring band ho jaati hai",
              "Router naye votes ko hamesha pehle shard par bhejta hai jab tak shard bhar na jaaye"
            ],
            "answer": 0,
            "hint": "Ring ek key ko kitne shards par rakh sakti hai?",
            "explain": "Ring aur vnodes alag-alag keys ko baant'te hain. <code>candidate:A</code> ek key hai, toh ek hash, ek point, ek shard. Kitne bhi servers ho, ek key ki bheed ek machine par. Ek key par aisi bheed ko hot key (celebrity problem) kehte hain.",
            "choiceExplanations": [
              "Ring aur vnodes alag-alag keys ko baant'te hain. <code>candidate:A</code> ek key hai, toh ek hash, ek point, ek shard. Kitne bhi servers ho, ek key ki bheed ek machine par. Ek key par aisi bheed ko hot key (celebrity problem) kehte hain.",
              "Ring hamesha chalti hai; har request par router ring dekhta hai.",
              "Router ring se shard chunta hai, 'pehla shard' ka koi niyam nahi."
            ]
          }
        },
        {
          "title": "2. Split 10 aur 40",
          "say": "Key ko <code>candidate:A#0 … #9</code> mein toda; har vote random sub-key. Ring ne 10 sub-keys ko 8 mein se sirf <b>5</b> shards par rakha; ek shard ke paas 4 sub-keys (40% votes). Writes ~1.5–2.2×. Split 40: sab 8 shards, sabse bhare par 10 sub-keys (25%); ~2.1–2.8×.",
          "ask": {
            "q": "10 sub-keys ke baad writes 10× kyun nahi hue?",
            "choices": [
              "Sub-keys hash se shards par girti hain aur takraati hain; sabse bhara shard seema tay karta hai",
              "SQLite ek table mein ek waqt mein sirf ek counter badal sakta hai, isliye baaki ruk jaate hain",
              "Har vote ab 10 counters badalta hai, isliye kaam 10× badh gaya aur faayda kat gaya"
            ],
            "answer": 0,
            "hint": "Sabse bhare shard ke paas kitne % votes the?",
            "explain": "10 sub-keys 8 shards par barabar nahi girti: lab mein ek shard ko 4 mili (40% votes), teen shards ko ek bhi nahi. 40% votes uthane wala shard (97–98% busy) hi raftaar ki seema hai — isliye ~1.5–2.2×. Zyada sub-keys (40) load ko aur barabar karti hain.",
            "choiceExplanations": [
              "10 sub-keys 8 shards par barabar nahi girti: lab mein ek shard ko 4 mili (40% votes), teen shards ko ek bhi nahi. 40% votes uthane wala shard (97–98% busy) hi raftaar ki seema hai — isliye ~1.5–2.2×. Zyada sub-keys (40) load ko aur barabar karti hain.",
              "Har shard ka apna SQLite hai; alag shards ek saath likhte hain.",
              "Har vote ek hi sub-key badalta hai (random chuni), 10 nahi."
            ]
          }
        },
        {
          "title": "3. Total padhna",
          "say": "Total = saari sub-keys ka jod. 1 key: 1 call, 0.04–0.07 ms. Split 40: ek ek karke 40 calls 2.1–2.2 ms; ek saath 40 calls 0.35–0.37 ms; har shard ko ek call (<code>key IN (…)</code>, 8 calls) ~0.17 ms. Jod har baar sahi: 3,00,000.",
          "ask": {
            "q": "Video kehta hai \"writes 10× tez, reads 10× dheeme\". Lab ke hisaab se sahi baat?",
            "choices": [
              "k counters padhne padte hain; calls aur latency tareeke par — parallel ya shard-wise kam",
              "Reads hamesha theek 10× dheeme hote hain, chahe calls ek saath bhejo ya ek ek karke",
              "Reads par koi asar nahi, kyunki har sub-key ka counter alag shard par cache hota hai"
            ],
            "answer": 0,
            "hint": "Split 40 par serial aur shard-wise latency mein kitna farq tha?",
            "explain": "Padhne ka kaam sach mein badhta hai: 1 call ki jagah 40 (ya shard-wise 8). Par latency is par hai ki calls kaise bhejte ho: ek ek karke ~2.2 ms, sab ek saath ~0.36 ms, shard-wise ~0.17 ms. Aur raaste: writes ko app mein jodkar har 100 ms ek baar likho, ya total ko cache karo.",
            "choiceExplanations": [
              "Padhne ka kaam sach mein badhta hai: 1 call ki jagah 40 (ya shard-wise 8). Par latency is par hai ki calls kaise bhejte ho: ek ek karke ~2.2 ms, sab ek saath ~0.36 ms, shard-wise ~0.17 ms. Aur raaste: writes ko app mein jodkar har 100 ms ek baar likho, ya total ko cache karo.",
              "Lab mein serial ~2.2 ms aur shard-wise ~0.17 ms: tareeka badla toh latency badli.",
              "Lab mein koi cache nahi; har sub-key padhna ek shard call hai."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Keys ginna, phir viral vote",
      "project": "57-sharding",
      "exercise": "ex2-hot-key",
      "goal": "ex0: 10 lakh keys par hash % N vs ring (asli ginti, har run same). ex2: 8 shards par ek viral key, split 1 / 10 / 40, aur total padhne ke teen tareeke.",
      "why": "Node 24+ chahiye. ex0 ki ginti har run same; ex2 ka samay machine ke saath badlega.",
      "steps": [
        {
          "text": "Lab folder se: keys ginna.",
          "cmd": "cd docker-labs/57-sharding && npm start -- ex0-moves",
          "expect": "10,00,000 keys (user:0 … user:999999), hash = MD5 ke pehle 4 bytes\n\nbadlaav             hash % N      formula               ring+vnodes      ideal (sirf zaroori)\n  4 → 5   joda      80.0%        N/(N+1) =  80.0%       17.4%           1/5 =  20.0%\n  5 → 6   joda      83.3%        N/(N+1) =  83.3%       15.5%           1/6 =  16.7%\n100 → 101 joda      99.0%        N/(N+1) =  99.0%        1.0%           1/101 =   1.0%\n  5 → 4   hataya    80.0%        (N-1)/N =  80.0%       17.4%           1/5 =  20.0%\n100 → 99  hataya    99.0%        (N-1)/N =  99.0%        1.0%           1/100 =   1.0%\n\nN = pehle kitne shards the. Jodne par hash % N mein N/(N+1) keys hilti hain; hatane par (N-1)/N.\nRing par sirf naye shard ka hissa (jodna) ya mare shard ka hissa (hatana) hilta hai — baaki keys apni jagah."
        },
        {
          "text": "Viral vote counter.",
          "cmd": "npm start -- ex2-hot-key",
          "expect": "A. Writes — 3,00,000 votes per round, 3 round, 8 shards, 4000 votes ke batch, 8 batch tak ek saath hawa mein\nsplit   shards jinhe sub-keys mili   sabse bhara shard   writes/sec            router CPU %   shard op-samay % (aakhri round)\n    1    1 / 8                        1 sub-keys (100%)    11,78,284–12,01,651   2–3            [0, 0, 0, 0, 0, 99, 0, 0]\n   10    5 / 8                        4 sub-keys ( 40%)    22,13,719–25,24,318   15–18          [77, 0, 35, 39, 0, 0, 98, 36]\n   40    8 / 8                       10 sub-keys ( 25%)    27,09,896–32,55,640   29–30          [53, 40, 63, 50, 41, 62, 58, 96]\nrouter CPU % = main thread ka CPU / samay. ~100% ho toh rukawat router hai, shard nahi.\nshard op-samay % = worker ke andar op (SQL + loop) ka samay / kul samay; message kholna-bandh karna shaamil nahi.\n\nB. Total padhna — 300 baar, har baar saare sub-keys ka jod (aakhri round ke counters)\nsplit   tareeka                          shard calls   shards ka op-samay   median     p99      total sahi?\n    1   ek key, ek call                      1             5 µs             43 µs    179 µs   haan (3,00,000)\n   10   ek ek karke (serial)                10            69 µs            516 µs   1610 µs   haan (3,00,000)\n   10   sab ek saath (parallel)             10            95 µs            173 µs    393 µs   haan (3,00,000)\n   10   shard-wise ek call (parallel)        5            57 µs            119 µs    222 µs   haan (3,00,000)\n   40   ek ek karke (serial)                40           317 µs           2196 µs   5254 µs   haan (3,00,000)\n   40   sab ek saath (parallel)             40           346 µs            371 µs   1247 µs   haan (3,00,000)\n   40   shard-wise ek call (parallel)        8           124 µs            166 µs    258 µs   haan (3,00,000)"
        }
      ],
      "observe": {
        "q": "ex2 mein split 10 par teen shards (1, 4 aur 5) ka op-samay 0% hai. Kyun?",
        "choices": [
          "Ring ne 10 sub-keys mein se ek bhi shard 1, 4 ya 5 par nahi rakhi",
          "Shard 1, 4 aur 5 crash ho gaye the, isliye router ne un teen shards ko votes bhejna band kiya",
          "Router shard 1, 4 aur 5 ko padhne ke liye bachaata hai, likhne ke liye nahi"
        ],
        "answer": 0,
        "hint": "Table ka \"shards jinhe sub-keys mili\" column kya kehta hai?",
        "explain": "\"5 / 8\": 10 sub-keys hash se sirf 5 shards par giri. Shard 1, 4 aur 5 ke paas koi sub-key nahi, toh koi vote nahi. Sub-keys ki ginti shards se thodi zyada ho toh takraav aam hai; 40 sub-keys par sab 8 shards ko kuch mila.",
        "choiceExplanations": [
          "\"5 / 8\": 10 sub-keys hash se sirf 5 shards par giri. Shard 1, 4 aur 5 ke paas koi sub-key nahi, toh koi vote nahi. Sub-keys ki ginti shards se thodi zyada ho toh takraav aam hai; 40 sub-keys par sab 8 shards ko kuch mila.",
          "Koi crash nahi hua; total har baar 3,00,000 sahi aaya.",
          "Lab ka router padhne-likhne ke liye shards nahi baant'ta; har sub-key ka ek hi ghar hai."
        ]
      },
      "lesson": "Ring sirf zaroori keys hilaati hai. Ek viral key ki bheed ek shard par rehti hai; todne se writes baant'te hain, padhne ka kaam badhta hai."
    }
  ],
  "interview": {
    "title": "Interview Round — ring aur hot key",
    "instructions": "Pehle socho: kaunsi keys hilengi, aur bheed alag keys par hai ya ek key par? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Cache cluster <code>hash % N</code> se chal raha hai, 10 nodes. Ek node aur jodna hai, peak traffic mein. Kya hoga, aur kya karoge?",
        "choices": [
          "~91% keys ka node badlega, cache lagbhag thanda; ring/slots par jao taaki sirf ~1/11 hile",
          "~9% keys hilengi, kyunki naya node sirf apna hissa lega — seedha jod do, koi dikkat nahi",
          "Koi key nahi hilegi — purani keys purane nodes par rahengi, nayi keys naye node par jaayengi",
          "Saari keys ek saath naye node par chali jaayengi — isliye pehle naye node ko bada banao"
        ],
        "answer": 0,
        "explain": "10 → 11: hash % N mein 10/11 ≈ 91% keys ka ghar badalta hai (lab ex0: 100 → 101 par 99%). Cache mein har hili key = miss = DB par query. Ring ya fixed slots par sirf naye node ka hissa (~1/11) hilta hai.",
        "choiceExplanations": [
          "10 → 11: hash % N mein 10/11 ≈ 91% keys ka ghar badalta hai (lab ex0: 100 → 101 par 99%). Cache mein har hili key = miss = DB par query. Ring ya fixed slots par sirf naye node ka hissa (~1/11) hilta hai.",
          "~9% ring ka jawab hai; % N har key ka ghar dobara ginta hai.",
          "% N purani keys ka ghar bhi naye N se ginta hai; purane nodes par tiki nahi rehti.",
          "Har key naye node par nahi jaati; keys sab nodes ke beech hilti hain."
        ]
      },
      {
        "q": "Live cricket score page: ek match ki key par 2 lakh reads/sec, ek Redis node jal raha hai. Cluster mein 30 nodes khaali baithe hain. Kya karoge?",
        "choices": [
          "Hot key pehchaano; app ke andar chhota cache ya key ki copies (score#0…#k) se reads baanto",
          "Vnodes 150 se 1,500 kar do — zyada points se ek key ka load bhi zyada nodes par baantega",
          "Redis cluster mein 30 aur nodes jodo — zyada nodes par ek key ka load apne aap baant jaata hai",
          "Score ki key ka TTL hata do — expire na hone se node par load kam ho jaayega"
        ],
        "answer": 0,
        "explain": "Ek key ek hash, ek slot, ek node: nodes ya vnodes badhaane se ek key ki bheed nahi baant'ti (lab ex2 split 1: 8 mein se 1 shard busy). Reads ke liye key ki k copies ya app/CDN mein chhota cache; writes ke liye sub-keys (ex2: split 10 par ~1.5–2.2×).",
        "choiceExplanations": [
          "Ek key ek hash, ek slot, ek node: nodes ya vnodes badhaane se ek key ki bheed nahi baant'ti (lab ex2 split 1: 8 mein se 1 shard busy). Reads ke liye key ki k copies ya app/CDN mein chhota cache; writes ke liye sub-keys (ex2: split 10 par ~1.5–2.2×).",
          "Vnodes alag keys baant'te hain; ek key ab bhi ek point par girti hai.",
          "Rebalance par score key ka malik badal sakta hai, par ek key phir bhi ek node par rehti hai; reads apne aap nahi bant'ti.",
          "TTL hataane se reads kam nahi hote; bheed reads ki hai."
        ]
      }
    ]
  },
  "success": [
    "hash % N par hili keys ka formula (N/(N+1)) samjha sakte ho",
    "Ring par key ka server clockwise niyam se bata sakte ho",
    "Hot key ko todne ka faayda aur keemat lab ke numbers se bata sakte ho"
  ],
  "cards": [
    {
      "front": "hash % N: N se N+1 shards?",
      "back": "N/(N+1) keys hilti hain (N = pehle ki ginti). Lab 57 ex0: 4 → 5 = 80%, 100 → 101 = 99%. Hatane par (N−1)/N."
    },
    {
      "front": "Ring par key kis server ki?",
      "back": "Key ke point se clockwise aage pehla server. Naya server sirf apne peeche wala hissa leta hai (ex0: 100 → 101 par 1.0%). Vnodes = har server ke kai points."
    },
    {
      "front": "Hot key todne ki keemat?",
      "back": "Lab 57 ex2: 10 sub-keys 8 mein se 5 shards par (ek par 40%), writes ~1.5–2.2×. Total = k counters (calls: k, ya shard-wise sirf bhare shards jitni); latency tareeke par (split 40: serial ~2.2 ms, shard-wise ~0.17 ms)."
    }
  ]
}
]);
})();
